import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const userId = parseInt(req.headers.get('x-user-id') || '0')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    let cart = await db.cart.findUnique({
      where: { userId },
      include: { items: { include: { product: { include: { shopOwner: { include: { user: true } } } } } } }
    })

    if (!cart) {
      cart = await db.cart.create({
        data: { userId },
        include: { items: { include: { product: true } } }
      })
    }

    return NextResponse.json({ cart })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch cart' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = parseInt(req.headers.get('x-user-id') || '0')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { productId, quantity } = await req.json()

    let cart = await db.cart.findUnique({ where: { userId } })
    if (!cart) {
      cart = await db.cart.create({ data: { userId } })
    }

    const existing = await db.cartItem.findFirst({ where: { cartId: cart.id, productId } })
    if (existing) {
      await db.cartItem.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + (quantity || 1) }
      })
    } else {
      await db.cartItem.create({
        data: { cartId: cart.id, productId, quantity: quantity || 1 }
      })
    }

    const updated = await db.cart.findUnique({
      where: { userId },
      include: { items: { include: { product: true } } }
    })

    return NextResponse.json({ cart: updated })
  } catch {
    return NextResponse.json({ error: 'Failed to add to cart' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userId = parseInt(req.headers.get('x-user-id') || '0')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { itemId } = await req.json()
    await db.cartItem.delete({ where: { id: itemId } })

    const cart = await db.cart.findUnique({
      where: { userId },
      include: { items: { include: { product: true } } }
    })

    return NextResponse.json({ cart })
  } catch {
    return NextResponse.json({ error: 'Failed to remove from cart' }, { status: 500 })
  }
}
