import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') || ''
    const category = searchParams.get('category') || ''
    const shopId = searchParams.get('shopId') || ''
    const status = searchParams.get('status') || 'approved'
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const where: any = {}
    if (status === 'pending') {
      where.status = 'pending'
    } else if (status === 'all') {
      // no filter
    } else {
      where.status = 'approved'
      where.stock = { gt: 0 }
    }
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } }
      ]
    }
    if (category) where.category = category
    if (shopId) {
      const so = await db.shopOwner.findUnique({ where: { userId: parseInt(shopId) } })
      if (so) where.shopOwnerId = so.id
    }

    const products = await db.product.findMany({
      where,
      include: { shopOwner: { include: { user: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    })

    const total = await db.product.count({ where })

    return NextResponse.json({ products, total })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = parseInt(req.headers.get('x-user-id') || '0')
    const data = await req.json()
    const { title, description, price, stock, category } = data

    const so = await db.shopOwner.findUnique({ where: { userId } })
    if (!so) return NextResponse.json({ error: 'Shop not found' }, { status: 403 })

    const product = await db.product.create({
      data: { shopOwnerId: so.id, title, description, price: parseFloat(price), stock: parseInt(stock), category, status: 'pending' }
    })

    return NextResponse.json({ product })
  } catch {
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 })
  }
}
