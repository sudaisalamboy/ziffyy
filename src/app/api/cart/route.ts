import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helper'
import { rateLimit } from '@/lib/rate-limit'
import { VALIDATION, logError, parseId } from '@/lib/sanitize'

const cartItemInclude = {
  product: {
    include: {
      shopOwner: {
        select: { id: true, userId: true, shopName: true, shopAddress: true, status: true }
      }
    }
  }
}

export async function GET(req: NextRequest) {
  try {
    const { limited } = rateLimit('cart_get', req, { maxRequests: 60, windowMs: 60_000 })
    if (limited) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

    const { user, error } = await requireAuth(req)
    if (error) return error
    const userId = user.id

    const cart = await db.cart.findUnique({
      where: { userId },
      include: { items: { include: cartItemInclude } }
    })

    // Return empty structure instead of auto-creating wasteful rows
    if (!cart) {
      return NextResponse.json({ cart: { id: 0, userId, items: [] } })
    }

    return NextResponse.json({ cart })
  } catch (e) {
    logError('cart', e)
    return NextResponse.json({ error: 'Failed to fetch cart' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { limited } = rateLimit('cart_post', req, { maxRequests: 30, windowMs: 60_000 })
    if (limited) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

    const { user, error } = await requireAuth(req)
    if (error) return error
    const userId = user.id

    const { productId, quantity } = await req.json()

    // === INPUT VALIDATION ===
    const pid = parseId(productId)
    if (!pid) {
      return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 })
    }

    let qty = Number(quantity)
    if (!qty || !Number.isFinite(qty) || qty <= 0) qty = 1
    if (qty > VALIDATION.MAX_CART_QUANTITY) {
      return NextResponse.json({ error: `Maximum ${VALIDATION.MAX_CART_QUANTITY} quantity per item` }, { status: 400 })
    }

    // Verify product exists and is approved
    const product = await db.product.findUnique({ where: { id: pid } })
    if (!product || product.status !== 'approved') {
      return NextResponse.json({ error: 'Product not found or unavailable' }, { status: 400 })
    }

    let cart = await db.cart.findUnique({ where: { userId } })
    if (!cart) {
      cart = await db.cart.create({ data: { userId } })
    }

    const existing = await db.cartItem.findFirst({ where: { cartId: cart.id, productId: pid } })
    if (existing) {
      const newQty = Math.min(existing.quantity + qty, VALIDATION.MAX_CART_QUANTITY)
      await db.cartItem.update({
        where: { id: existing.id },
        data: { quantity: newQty }
      })
    } else {
      await db.cartItem.create({
        data: { cartId: cart.id, productId: pid, quantity: qty }
      })
    }

    const updated = await db.cart.findUnique({
      where: { userId },
      include: { items: { include: cartItemInclude } }
    })

    return NextResponse.json({ cart: updated })
  } catch (e) {
    logError('cart', e)
    return NextResponse.json({ error: 'Failed to add to cart' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { limited } = rateLimit('cart_put', req, { maxRequests: 30, windowMs: 60_000 })
    if (limited) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

    const { user, error } = await requireAuth(req)
    if (error) return error
    const userId = user.id

    const { itemId, quantity } = await req.json()

    const itemIdNum = parseId(itemId)
    if (!itemIdNum) {
      return NextResponse.json({ error: 'Invalid item ID' }, { status: 400 })
    }

    // === IDOR CHECK: Verify this cart item belongs to the user's cart ===
    const cart = await db.cart.findUnique({ where: { userId } })
    if (!cart) return NextResponse.json({ error: 'Cart not found' }, { status: 404 })

    const cartItem = await db.cartItem.findFirst({ where: { id: itemIdNum, cartId: cart.id } })
    if (!cartItem) return NextResponse.json({ error: 'Cart item not found' }, { status: 404 })

    if (quantity <= 0) {
      await db.cartItem.delete({ where: { id: itemIdNum } })
    } else {
      const qty = Number(quantity)
      if (!qty || !Number.isFinite(qty) || qty > VALIDATION.MAX_CART_QUANTITY) {
        return NextResponse.json({ error: `Quantity must be between 1 and ${VALIDATION.MAX_CART_QUANTITY}` }, { status: 400 })
      }
      await db.cartItem.update({ where: { id: itemIdNum }, data: { quantity: qty } })
    }

    const updatedCart = await db.cart.findUnique({
      where: { userId },
      include: { items: { include: cartItemInclude } }
    })

    return NextResponse.json({ cart: updatedCart })
  } catch (e) {
    logError('cart', e)
    return NextResponse.json({ error: 'Failed to update cart' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { limited } = rateLimit('cart_delete', req, { maxRequests: 30, windowMs: 60_000 })
    if (limited) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

    const { user, error } = await requireAuth(req)
    if (error) return error
    const userId = user.id

    const { itemId } = await req.json()

    const itemIdNum = parseId(itemId)
    if (!itemIdNum) {
      return NextResponse.json({ error: 'Invalid item ID' }, { status: 400 })
    }

    // === IDOR CHECK: Verify this cart item belongs to the user's cart ===
    const cart = await db.cart.findUnique({ where: { userId } })
    if (!cart) return NextResponse.json({ error: 'Cart not found' }, { status: 404 })

    const cartItem = await db.cartItem.findFirst({ where: { id: itemIdNum, cartId: cart.id } })
    if (!cartItem) return NextResponse.json({ error: 'Cart item not found' }, { status: 404 })

    await db.cartItem.delete({ where: { id: itemIdNum } })

    const updatedCart = await db.cart.findUnique({
      where: { userId },
      include: { items: { include: cartItemInclude } }
    })

    return NextResponse.json({ cart: updatedCart })
  } catch (e) {
    logError('cart', e)
    return NextResponse.json({ error: 'Failed to remove from cart' }, { status: 500 })
  }
}
