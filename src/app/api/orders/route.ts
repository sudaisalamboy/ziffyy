import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id')
    const role = req.headers.get('x-user-role')
    const status = new URL(req.url).searchParams.get('status') || ''

    const where: any = {}
    if (role === 'customer') where.userId = parseInt(userId || '0')
    if (status) where.orderStatus = status

    const orders = await db.order.findMany({
      where,
      include: {
        items: true,
        user: true,
        payments: true,
        deliveryAssignments: { include: { deliveryBoy: { include: { user: true } } } }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ orders })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = parseInt(req.headers.get('x-user-id') || '0')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { items, shippingAddress, paymentMethod, totalAmount } = await req.json()

    const orderNumber = 'ORD' + Date.now() + Math.random().toString(36).slice(2, 6).toUpperCase()

    const order = await db.order.create({
      data: {
        userId,
        orderNumber,
        totalAmount: parseFloat(totalAmount),
        paymentStatus: paymentMethod === 'cod' ? 'pending' : 'paid',
        orderStatus: 'pending',
        paymentMethod,
        shippingAddress
      }
    })

    for (const item of items) {
      await db.orderItem.create({
        data: {
          orderId: order.id,
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice
        }
      })
      await db.product.update({ where: { id: item.productId }, data: { stock: { decrement: item.quantity } } })
    }

    await db.orderStatusLog.create({
      data: { orderId: order.id, status: 'pending', notes: 'Order placed successfully', changedBy: userId }
    })

    await db.payment.create({
      data: { orderId: order.id, userId, amount: parseFloat(totalAmount), paymentMethod, paymentStatus: paymentMethod === 'cod' ? 'pending' : 'completed' }
    })

    // Clear cart
    const cart = await db.cart.findUnique({ where: { userId } })
    if (cart) await db.cartItem.deleteMany({ where: { cartId: cart.id } })

    return NextResponse.json({ order })
  } catch {
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
  }
}
