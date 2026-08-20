import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helper'
import { rateLimit } from '@/lib/rate-limit'
import { sanitize, VALIDATION, logError } from '@/lib/sanitize'

// GET: List products (only approved for public, all for shop owner)
export async function GET(req: NextRequest) {
  try {
    const { limited } = rateLimit('products_get', req, { maxRequests: 60, windowMs: 60_000 })
    if (limited) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const shopId = searchParams.get('shopId')
    const statusParam = searchParams.get('status')
    const allParam = searchParams.get('all')
    const page = Number(searchParams.get('page')) || 1
    const limit = Math.min(Number(searchParams.get('limit')) || VALIDATION.DEFAULT_PAGE_SIZE, VALIDATION.MAX_PAGE_SIZE)

    const whereClause: any = {}

    // Try to authenticate (optional — public can browse approved products)
    let authUser: any = null
    try {
      const auth = await requireAuth(req)
      if (!auth.error) authUser = auth.user
    } catch {}

    const isShopOwner = authUser?.role === 'shop' || authUser?.role === 'admin'
    const isAdmin = authUser?.role === 'admin'

    // If shop owner is requesting their own products, use their actual shopOwnerId
    let actualShopOwnerId: number | null = null
    if (authUser?.role === 'shop') {
      // Shop owner always sees only their own products
      const shopOwner = await db.shopOwner.findUnique({ where: { userId: authUser.id } })
      if (shopOwner) actualShopOwnerId = shopOwner.id
    } else if (shopId) {
      actualShopOwnerId = Number(shopId)
    }

    if (actualShopOwnerId) {
      whereClause.shopOwnerId = actualShopOwnerId
    }

    // === STATUS FILTERING ===
    if (allParam === 'true' || (statusParam === 'all' && isShopOwner)) {
      // Shop owner / admin requesting all statuses — no status filter
    } else if (statusParam === 'pending' || statusParam === 'rejected') {
      if (!isShopOwner) {
        whereClause.status = 'approved'
      }
      // For shop owners, allow seeing pending/rejected of their own products
    } else {
      whereClause.status = 'approved'
    }

    if (category && category !== 'all') {
      whereClause.category = category
    }
    if (search) {
      // Cap search length to prevent DoS via extremely long search strings
      const cappedSearch = search.substring(0, 100)
      whereClause.OR = [
        { title: { contains: cappedSearch } },
        { description: { contains: cappedSearch } }
      ]
    }

    const skip = (page - 1) * limit

    const products = await db.product.findMany({
      where: whereClause,
      include: { shopOwner: { select: { id: true, shopName: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip
    })

    // Extract categories from already-fetched products
    const categories = [...new Set(products.map(p => p.category).filter(Boolean))].sort()

    return NextResponse.json({
      products,
      categories,
      pagination: { page, limit }
    })
  } catch (e) {
    logError('products', e)
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
  }
}

// POST: Create product (shop owners only)
export async function POST(req: NextRequest) {
  try {
    const { limited } = rateLimit('products_post', req, { maxRequests: 15, windowMs: 60_000 })
    if (limited) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

    const auth = await requireAuth(req)
    if (auth.error) return auth.error
    const user = auth.user

    if (user.role !== 'shop' && user.role !== 'admin') {
      return NextResponse.json({ error: 'Only shop owners can add products' }, { status: 403 })
    }

    const body = await req.json()
    const { title, description, price, stock, category, image } = body

    if (!title || !price || !stock) {
      return NextResponse.json({ error: 'Title, price, and stock are required' }, { status: 400 })
    }

    if (typeof price !== 'number' || price <= 0) {
      return NextResponse.json({ error: 'Price must be a positive number' }, { status: 400 })
    }

    if (typeof stock !== 'number' || stock < 0) {
      return NextResponse.json({ error: 'Stock must be a non-negative number' }, { status: 400 })
    }

    let shopOwnerId: number
    if (user.role === 'admin') {
      const adminShopId = Number(body.shopOwnerId)
      if (!adminShopId || !Number.isFinite(adminShopId) || adminShopId <= 0) {
        return NextResponse.json({ error: 'shopOwnerId is required for admin product creation' }, { status: 400 })
      }
      // Verify shop owner exists
      const shopOwner = await db.shopOwner.findUnique({ where: { id: adminShopId } })
      if (!shopOwner) {
        return NextResponse.json({ error: 'Shop owner not found' }, { status: 404 })
      }
      shopOwnerId = adminShopId
    } else {
      const shopOwner = await db.shopOwner.findUnique({ where: { userId: user.id } })
      if (!shopOwner) return NextResponse.json({ error: 'Shop owner profile not found' }, { status: 404 })
      shopOwnerId = shopOwner.id
    }

    const product = await db.product.create({
      data: {
        title: sanitize(title),
        description: sanitize(description || ''),
        price: Number(price),
        stock: Number(stock),
        category: sanitize(category || 'General'),
        image: sanitize(image || ''),
        shopOwnerId,
        status: user.role === 'admin' ? 'approved' : 'pending'
      }
    })

    return NextResponse.json({ product, message: 'Product created' }, { status: 201 })
  } catch (e) {
    logError('products', e)
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 })
  }
}

// PUT: Update product (owner only)
export async function PUT(req: NextRequest) {
  try {
    const { limited } = rateLimit('products_put', req, { maxRequests: 30, windowMs: 60_000 })
    if (limited) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

    const auth = await requireAuth(req)
    if (auth.error) return auth.error
    const user = auth.user

    const body = await req.json()
    const { id, ...updateData } = body

    if (!id) return NextResponse.json({ error: 'Product ID is required' }, { status: 400 })

    const product = await db.product.findUnique({ where: { id: Number(id) } })
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

    // === OWNERSHIP CHECK ===
    if (user.role === 'shop') {
      const shopOwner = await db.shopOwner.findUnique({ where: { userId: user.id } })
      if (!shopOwner || product.shopOwnerId !== shopOwner.id) {
        return NextResponse.json({ error: 'You can only update your own products' }, { status: 403 })
      }
    }

    const sanitized: any = {}
    if (updateData.title) sanitized.title = sanitize(updateData.title)
    if (updateData.description !== undefined) sanitized.description = sanitize(updateData.description)
    if (updateData.price !== undefined) {
      const price = Number(updateData.price)
      if (!Number.isFinite(price) || price <= 0 || price > VALIDATION.MAX_PRICE) {
        return NextResponse.json({ error: `Price must be a positive number (max ₹${VALIDATION.MAX_PRICE.toLocaleString()})` }, { status: 400 })
      }
      sanitized.price = price
    }
    if (updateData.stock !== undefined) {
      const stock = Number(updateData.stock)
      if (!Number.isFinite(stock) || stock < 0 || stock > VALIDATION.MAX_STOCK) {
        return NextResponse.json({ error: `Stock must be a non-negative number (max ${VALIDATION.MAX_STOCK.toLocaleString()})` }, { status: 400 })
      }
      sanitized.stock = stock
    }
    if (updateData.category) sanitized.category = sanitize(updateData.category)
    if (updateData.image !== undefined) sanitized.image = sanitize(updateData.image)

    const updated = await db.product.update({ where: { id: Number(id) }, data: sanitized })

    return NextResponse.json({ product: updated })
  } catch (e) {
    logError('products', e)
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 })
  }
}

// DELETE: Delete product (owner or admin only, with ownership check)
export async function DELETE(req: NextRequest) {
  try {
    const { limited } = rateLimit('products_delete', req, { maxRequests: 15, windowMs: 60_000 })
    if (limited) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

    const auth = await requireAuth(req)
    if (auth.error) return auth.error
    const user = auth.user

    const body = await req.json()
    const { id } = body

    if (!id) return NextResponse.json({ error: 'Product ID is required' }, { status: 400 })

    const product = await db.product.findUnique({ where: { id: Number(id) } })
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

    // === OWNERSHIP CHECK: Shop owner can only delete THEIR products ===
    if (user.role === 'shop') {
      const shopOwner = await db.shopOwner.findUnique({ where: { userId: user.id } })
      if (!shopOwner || product.shopOwnerId !== shopOwner.id) {
        return NextResponse.json({ error: 'You can only delete your own products' }, { status: 403 })
      }
    }

    // Check for related order items (FK constraint)
    const orderItemCount = await db.orderItem.count({ where: { productId: Number(id) } })
    if (orderItemCount > 0) {
      return NextResponse.json({ error: 'Cannot delete product that has been ordered' }, { status: 400 })
    }

    // Check for items in users' carts (FK constraint)
    const cartItemCount = await db.cartItem.count({ where: { productId: Number(id) } })
    if (cartItemCount > 0) {
      return NextResponse.json({ error: 'Cannot delete product that is in users\' carts. Remove from carts first.' }, { status: 400 })
    }

    await db.product.delete({ where: { id: Number(id) } })

    return NextResponse.json({ message: 'Product deleted' })
  } catch (e) {
    logError('products', e)
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 })
  }
}
