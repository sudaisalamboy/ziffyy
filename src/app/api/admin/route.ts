import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const section = new URL(req.url).searchParams.get('section') || 'dashboard'

    if (section === 'dashboard') {
      const [totalUsers, totalOrders, totalProducts, totalDeliveryBoys, pendingProducts, pendingUsers, pendingPayments] = await Promise.all([
        db.user.count({ where: { role: { in: ['customer', 'shop', 'delivery'] } } }),
        db.order.count(),
        db.product.count({ where: { status: 'approved' } }),
        db.deliveryBoy.count({ where: { status: 'approved' } }),
        db.product.count({ where: { status: 'pending' } }),
        db.user.count({ where: { status: 'pending', role: { in: ['shop', 'delivery'] } } }),
        db.payment.count({ where: { paymentStatus: 'pending' } }),
      ])

      const recentOrders = await db.order.findMany({
        take: 5, orderBy: { createdAt: 'desc' },
        include: { user: true, items: true }
      })

      const recentActivity = await db.adminActivityLog.findMany({
        take: 10, orderBy: { createdAt: 'desc' },
        include: { admin: { select: { name: true } } }
      })

      return NextResponse.json({ stats: { totalUsers, totalOrders, totalProducts, totalDeliveryBoys, pendingProducts, pendingUsers, pendingPayments }, recentOrders, recentActivity })
    }

    if (section === 'users') {
      const users = await db.user.findMany({
        where: { role: { in: ['customer', 'shop', 'delivery'] } },
        include: { shopOwner: true, deliveryBoy: true },
        orderBy: { createdAt: 'desc' }
      })
      return NextResponse.json({ users })
    }

    if (section === 'products') {
      const status = new URL(req.url).searchParams.get('status') || 'pending'
      const products = await db.product.findMany({
        where: status === 'all' ? {} : { status },
        include: { shopOwner: { include: { user: true } } },
        orderBy: { createdAt: 'desc' }
      })
      return NextResponse.json({ products })
    }

    if (section === 'orders') {
      const orders = await db.order.findMany({
        include: {
          user: true, items: true, payments: true,
          deliveryAssignments: { include: { deliveryBoy: { include: { user: true } } } }
        },
        orderBy: { createdAt: 'desc' }
      })
      return NextResponse.json({ orders })
    }

    if (section === 'payments') {
      const payments = await db.payment.findMany({
        include: { order: true, user: true },
        orderBy: { createdAt: 'desc' }
      })
      return NextResponse.json({ payments })
    }

    if (section === 'delivery_boys') {
      const deliveryBoys = await db.deliveryBoy.findMany({
        include: { user: true },
        orderBy: { createdAt: 'desc' }
      })
      return NextResponse.json({ deliveryBoys })
    }

    if (section === 'needs') {
      const needs = await db.need.findMany({
        include: { user: true, comments: { include: { user: true } }, offers: { include: { deliveryBoy: { include: { user: true } } } } },
        orderBy: { createdAt: 'desc' }
      })
      return NextResponse.json({ needs })
    }

    return NextResponse.json({ error: 'Invalid section' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const adminId = parseInt(req.headers.get('x-user-id') || '0')
    const data = await req.json()
    const { action } = data

    if (action === 'approve_user') {
      await db.user.update({ where: { id: data.userId }, data: { status: 'active' } })
      const user = await db.user.findUnique({ where: { id: data.userId } })
      if (user?.role === 'delivery') await db.deliveryBoy.update({ where: { userId: data.userId }, data: { status: 'approved', approvedBy: adminId, approvedAt: new Date() } })
      if (user?.role === 'shop') await db.shopOwner.update({ where: { userId: data.userId }, data: { status: 'approved', approvedBy: adminId, approvedAt: new Date() } })
      await db.adminActivityLog.create({ data: { adminId, action: 'approve_user', tableName: 'users', recordId: data.userId, message: `User ${user?.name} approved` } })
      await db.notification.create({ data: { userId: data.userId, title: 'Account Approved!', message: 'Your account has been approved. You can now log in.', type: 'account_approved' } })
      return NextResponse.json({ success: true })
    }

    if (action === 'reject_user') {
      await db.user.update({ where: { id: data.userId }, data: { status: 'rejected' } })
      const user = await db.user.findUnique({ where: { id: data.userId } })
      if (user?.role === 'delivery') await db.deliveryBoy.update({ where: { userId: data.userId }, data: { status: 'rejected' } })
      if (user?.role === 'shop') await db.shopOwner.update({ where: { userId: data.userId }, data: { status: 'rejected' } })
      await db.adminActivityLog.create({ data: { adminId, action: 'reject_user', tableName: 'users', recordId: data.userId, message: `User ${user?.name} rejected` } })
      return NextResponse.json({ success: true })
    }

    if (action === 'suspend_user') {
      await db.user.update({ where: { id: data.userId }, data: { status: 'suspended' } })
      await db.adminActivityLog.create({ data: { adminId, action: 'suspend_user', tableName: 'users', recordId: data.userId, message: 'User suspended' } })
      return NextResponse.json({ success: true })
    }

    if (action === 'activate_user') {
      await db.user.update({ where: { id: data.userId }, data: { status: 'active' } })
      await db.adminActivityLog.create({ data: { adminId, action: 'activate_user', tableName: 'users', recordId: data.userId, message: 'User activated' } })
      return NextResponse.json({ success: true })
    }

    if (action === 'approve_product') {
      await db.product.update({ where: { id: data.productId }, data: { status: 'approved', approvedBy: adminId, approvedAt: new Date() } })
      await db.adminActivityLog.create({ data: { adminId, action: 'approve_product', tableName: 'products', recordId: data.productId, message: 'Product approved' } })
      return NextResponse.json({ success: true })
    }

    if (action === 'reject_product') {
      await db.product.update({ where: { id: data.productId }, data: { status: 'rejected', rejectionReason: data.reason || '' } })
      await db.adminActivityLog.create({ data: { adminId, action: 'reject_product', tableName: 'products', recordId: data.productId, message: 'Product rejected' } })
      return NextResponse.json({ success: true })
    }

    if (action === 'approve_payment') {
      await db.payment.update({ where: { id: data.paymentId }, data: { paymentStatus: 'completed' } })
      const payment = await db.payment.findUnique({ where: { id: data.paymentId } })
      if (payment) {
        await db.order.update({ where: { id: payment.orderId }, data: { paymentStatus: 'paid', orderStatus: 'confirmed' } })
        await db.orderStatusLog.create({ data: { orderId: payment.orderId, status: 'confirmed', notes: 'Payment approved', changedBy: adminId } })
        await db.notification.create({ data: { userId: payment.userId, title: 'Payment Approved!', message: `Your payment of ₹${payment.amount} has been approved.`, type: 'payment_approved' } })
      }
      return NextResponse.json({ success: true })
    }

    if (action === 'assign_delivery') {
      const assignment = await db.deliveryAssignment.create({
        data: { orderId: data.orderId, deliveryBoyId: data.deliveryBoyId, assignedBy: adminId, status: 'assigned' }
      })
      await db.order.update({ where: { id: data.orderId }, data: { orderStatus: 'processing' } })
      await db.orderStatusLog.create({ data: { orderId: data.orderId, status: 'processing', notes: 'Delivery assigned', changedBy: adminId } })
      await db.notification.create({ data: { userId: data.deliveryBoyId, title: 'New Delivery Assigned', message: 'You have been assigned a new delivery.', type: 'new_delivery' } })
      return NextResponse.json({ assignment })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
