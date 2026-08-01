import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const userId = parseInt(req.headers.get('x-user-id') || '0')
    const section = new URL(req.url).searchParams.get('section') || 'assignments'

    const deliveryBoy = await db.deliveryBoy.findUnique({ where: { userId } })
    if (!deliveryBoy) return NextResponse.json({ error: 'Not a delivery boy' }, { status: 403 })

    if (section === 'assignments') {
      const assignments = await db.deliveryAssignment.findMany({
        where: { deliveryBoyId: deliveryBoy.id },
        include: { order: { include: { user: true, items: true, payments: true } }, admin: { select: { name: true } } },
        orderBy: { assignedAt: 'desc' }
      })
      return NextResponse.json({ assignments })
    }

    if (section === 'offers') {
      const offers = await db.offer.findMany({
        where: { deliveryBoyId: deliveryBoy.id },
        include: { need: { include: { user: true } } },
        orderBy: { createdAt: 'desc' }
      })
      return NextResponse.json({ offers })
    }

    return NextResponse.json({ error: 'Invalid section' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = parseInt(req.headers.get('x-user-id') || '0')
    const data = await req.json()
    const { action } = data

    const deliveryBoy = await db.deliveryBoy.findUnique({ where: { userId } })
    if (!deliveryBoy) return NextResponse.json({ error: 'Not a delivery boy' }, { status: 403 })

    if (action === 'update_assignment') {
      await db.deliveryAssignment.update({
        where: { id: data.assignmentId },
        data: { status: data.status, deliveredAt: data.status === 'delivered' ? new Date() : undefined }
      })
      if (data.status === 'delivered') {
        await db.order.update({ where: { id: data.orderId }, data: { orderStatus: 'delivered' } })
        await db.orderStatusLog.create({ data: { orderId: data.orderId, status: 'delivered', notes: 'Order delivered', changedBy: userId } })
        await db.deliveryBoy.update({ where: { id: deliveryBoy.id }, data: { totalDeliveries: { increment: 1 } } })
        await db.deliveryHistory.create({ data: { deliveryBoyId: deliveryBoy.id, orderId: data.orderId, deliveryStatus: 'delivered' } })
      }
      if (data.status === 'accepted') {
        await db.orderStatusLog.create({ data: { orderId: data.orderId, status: 'accepted', notes: 'Delivery accepted', changedBy: userId } })
      }
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
