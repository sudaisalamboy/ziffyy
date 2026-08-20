import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, safeUserSelect } from '@/lib/auth-helper'
import { rateLimit } from '@/lib/rate-limit'
import { sanitize, logError, VALIDATION, ROLES, PAYMENT_STATUSES, DELIVERY_STATUSES, ORDER_STATUSES } from '@/lib/sanitize'
import { parseId, parseAmount } from '@/lib/sanitize'

const VALID_ADMIN_ACTIONS = [
  'approve_user', 'reject_user', 'suspend_user', 'activate_user',
  'approve_product', 'reject_product',
  'approve_payment', 'reject_payment',
  'approve_withdrawal', 'reject_withdrawal',
  'assign_delivery'
]

const VALID_SECTIONS = ['dashboard', 'users', 'products', 'orders', 'payments', 'withdrawals', 'delivery_boys', 'needs', 'settings']

export async function GET(req: NextRequest) {
  try {
    const { limited } = rateLimit('admin_get', req, { maxRequests: 60, windowMs: 60_000 })
    if (limited) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

    const { user, error } = await requireAdmin(req)
    if (error) return error
    const adminId = user!.id

    const section = new URL(req.url).searchParams.get('section') || 'dashboard'

    if (!VALID_SECTIONS.includes(section)) {
      return NextResponse.json({ error: 'Invalid section' }, { status: 400 })
    }

    if (section === 'dashboard') {
      const [totalUsers, totalOrders, totalProducts, totalDeliveryBoys, pendingProducts, pendingUsers, pendingPayments, pendingWithdrawals, totalPlatformEarnings] = await Promise.all([
        db.user.count({ where: { role: { in: ['customer', 'shop', 'delivery'] } } }),
        db.order.count(),
        db.product.count({ where: { status: 'approved' } }),
        db.deliveryBoy.count({ where: { status: 'approved' } }),
        db.product.count({ where: { status: 'pending' } }),
        db.user.count({ where: { status: 'pending', role: { in: ['shop', 'delivery'] } } }),
        db.payment.count({ where: { paymentStatus: 'pending_verification' } }),
        db.withdrawal.count({ where: { status: 'pending' } }),
        db.order.aggregate({ _sum: { commissionAmount: true }, where: { orderStatus: 'delivered', paymentStatus: 'paid' } }).then(r => r._sum.commissionAmount || 0),
      ])

      const recentOrders = await db.order.findMany({
        take: 5, orderBy: { createdAt: 'desc' },
        include: {
          items: true,
          user: { select: safeUserSelect },
        }
      })

      const recentActivity = await db.adminActivityLog.findMany({
        take: 10, orderBy: { createdAt: 'desc' },
        include: { admin: { select: { name: true } } }
      })

      return NextResponse.json({ stats: { totalUsers, totalOrders, totalProducts, totalDeliveryBoys, pendingProducts, pendingUsers, pendingPayments, pendingWithdrawals, totalPlatformEarnings: Math.round((totalPlatformEarnings as number) * 100) / 100 }, recentOrders, recentActivity })
    }

    if (section === 'users') {
      const users = await db.user.findMany({
        where: { role: { in: ['customer', 'shop', 'delivery'] } },
        select: { ...safeUserSelect, email: true, mobile: true, address: true },
        orderBy: { createdAt: 'desc' },
        take: VALIDATION.DEFAULT_PAGE_SIZE
      })
      return NextResponse.json({ users })
    }

    if (section === 'products') {
      const status = new URL(req.url).searchParams.get('status') || 'pending'
      const products = await db.product.findMany({
        where: status === 'all' ? {} : { status },
        include: {
          shopOwner: {
            select: { id: true, userId: true, shopName: true, shopAddress: true, status: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: VALIDATION.DEFAULT_PAGE_SIZE
      })
      return NextResponse.json({ products })
    }

    if (section === 'orders') {
      const orders = await db.order.findMany({
        include: {
          user: { select: safeUserSelect },
          items: true,
          payments: true,
          deliveryAssignments: {
            include: {
              deliveryBoy: {
                include: {
                  user: { select: safeUserSelect }
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: VALIDATION.DEFAULT_PAGE_SIZE
      })
      return NextResponse.json({ orders })
    }

    if (section === 'payments') {
      const payments = await db.payment.findMany({
        include: {
          order: true,
          user: { select: safeUserSelect }
        },
        orderBy: { createdAt: 'desc' },
        take: VALIDATION.DEFAULT_PAGE_SIZE
      })
      return NextResponse.json({ payments })
    }

    if (section === 'withdrawals') {
      const withdrawals = await db.withdrawal.findMany({
        include: {
          deliveryBoy: {
            include: {
              user: { select: safeUserSelect }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: VALIDATION.DEFAULT_PAGE_SIZE
      })
      return NextResponse.json({ withdrawals })
    }

    if (section === 'delivery_boys') {
      const deliveryBoys = await db.deliveryBoy.findMany({
        include: {
          user: { select: safeUserSelect }
        },
        orderBy: { createdAt: 'desc' },
        take: VALIDATION.DEFAULT_PAGE_SIZE
      })
      return NextResponse.json({ deliveryBoys })
    }

    if (section === 'needs') {
      const needs = await db.need.findMany({
        include: {
          user: { select: safeUserSelect },
          comments: { include: { user: { select: safeUserSelect } } },
          offers: {
            include: {
              deliveryBoy: {
                include: {
                  user: { select: safeUserSelect }
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: VALIDATION.DEFAULT_PAGE_SIZE
      })
      return NextResponse.json({ needs })
    }

    if (section === 'settings') {
      const settings = await db.settings.findMany()
      const map: any = {}
      settings.forEach((s: any) => { map[s.settingKey] = s.settingValue })
      return NextResponse.json({ settings: map })
    }

    return NextResponse.json({ error: 'Invalid section' }, { status: 400 })
  } catch (e) {
    logError('admin', e)
    return NextResponse.json({ error: 'Failed to fetch admin data' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { limited } = rateLimit('admin_post', req, { maxRequests: 30, windowMs: 60_000 })
    if (limited) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

    const { user, error } = await requireAdmin(req)
    if (error) return error
    const adminId = user!.id

    const data = await req.json()
    const { action } = data

    // === ACTION WHITELIST ===
    if (!VALID_ADMIN_ACTIONS.includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    if (action === 'approve_user') {
      const userId = Number(data.userId)
      if (!userId || !Number.isFinite(userId) || userId <= 0) {
        return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 })
      }
      // Cannot modify admin users
      const targetUser = await db.user.findUnique({ where: { id: userId }, select: { role: true } })
      if (!targetUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })
      if (targetUser.role === 'admin') return NextResponse.json({ error: 'Cannot modify admin users' }, { status: 400 })
      await db.user.update({ where: { id: userId }, data: { status: 'active' } })
      const userRow = await db.user.findUnique({ where: { id: userId }, select: { name: true, role: true } })
      if (userRow?.role === 'delivery') await db.deliveryBoy.update({ where: { userId }, data: { status: 'approved', approvedBy: adminId, approvedAt: new Date() } })
      if (userRow?.role === 'shop') await db.shopOwner.update({ where: { userId }, data: { status: 'approved', approvedBy: adminId, approvedAt: new Date() } })
      await db.adminActivityLog.create({ data: { adminId, action: 'approve_user', tableName: 'users', recordId: userId, message: `User ${userRow?.name} approved` } })
      await db.notification.create({ data: { userId, title: 'Account Approved!', message: 'Your account has been approved. You can now log in.', type: 'account_approved' } })
      return NextResponse.json({ success: true })
    }

    if (action === 'reject_user') {
      const userId = Number(data.userId)
      if (!userId || !Number.isFinite(userId) || userId <= 0) {
        return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 })
      }
      // Cannot modify admin users
      const targetUser = await db.user.findUnique({ where: { id: userId }, select: { role: true } })
      if (!targetUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })
      if (targetUser.role === 'admin') return NextResponse.json({ error: 'Cannot modify admin users' }, { status: 400 })
      await db.user.update({ where: { id: userId }, data: { status: 'rejected' } })
      const userRow = await db.user.findUnique({ where: { id: userId }, select: { name: true, role: true } })
      if (userRow?.role === 'delivery') await db.deliveryBoy.update({ where: { userId }, data: { status: 'rejected' } })
      if (userRow?.role === 'shop') await db.shopOwner.update({ where: { userId }, data: { status: 'rejected' } })
      await db.adminActivityLog.create({ data: { adminId, action: 'reject_user', tableName: 'users', recordId: userId, message: `User ${userRow?.name} rejected` } })
      return NextResponse.json({ success: true })
    }

    if (action === 'suspend_user') {
      const userId = Number(data.userId)
      if (!userId || !Number.isFinite(userId) || userId <= 0) {
        return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 })
      }
      // Cannot modify admin users
      const targetUser = await db.user.findUnique({ where: { id: userId }, select: { role: true } })
      if (!targetUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })
      if (targetUser.role === 'admin') return NextResponse.json({ error: 'Cannot modify admin users' }, { status: 400 })
      if (userId === adminId) return NextResponse.json({ error: 'Cannot modify your own account' }, { status: 400 })
      await db.user.update({ where: { id: userId }, data: { status: 'suspended' } })
      await db.adminActivityLog.create({ data: { adminId, action: 'suspend_user', tableName: 'users', recordId: userId, message: 'User suspended' } })
      return NextResponse.json({ success: true })
    }

    if (action === 'activate_user') {
      const userId = Number(data.userId)
      if (!userId || !Number.isFinite(userId) || userId <= 0) {
        return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 })
      }
      // Cannot modify admin users
      const targetUser = await db.user.findUnique({ where: { id: userId }, select: { role: true } })
      if (!targetUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })
      if (targetUser.role === 'admin') return NextResponse.json({ error: 'Cannot modify admin users' }, { status: 400 })
      if (userId === adminId) return NextResponse.json({ error: 'Cannot modify your own account' }, { status: 400 })
      await db.user.update({ where: { id: userId }, data: { status: 'active' } })
      await db.adminActivityLog.create({ data: { adminId, action: 'activate_user', tableName: 'users', recordId: userId, message: 'User activated' } })
      return NextResponse.json({ success: true })
    }

    if (action === 'approve_product') {
      const productId = Number(data.productId)
      if (!productId || !Number.isFinite(productId) || productId <= 0) {
        return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 })
      }
      await db.product.update({ where: { id: productId }, data: { status: 'approved', approvedBy: adminId, approvedAt: new Date() } })
      await db.adminActivityLog.create({ data: { adminId, action: 'approve_product', tableName: 'products', recordId: productId, message: 'Product approved' } })
      return NextResponse.json({ success: true })
    }

    if (action === 'reject_product') {
      const productId = Number(data.productId)
      if (!productId || !Number.isFinite(productId) || productId <= 0) {
        return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 })
      }
      const reason = sanitize(data.reason || '')
      await db.product.update({ where: { id: productId }, data: { status: 'rejected', rejectionReason: reason } })
      await db.adminActivityLog.create({ data: { adminId, action: 'reject_product', tableName: 'products', recordId: productId, message: 'Product rejected' } })
      return NextResponse.json({ success: true })
    }

    if (action === 'approve_payment') {
      const paymentId = Number(data.paymentId)
      if (!paymentId || !Number.isFinite(paymentId) || paymentId <= 0) {
        return NextResponse.json({ error: 'Invalid payment ID' }, { status: 400 })
      }
      const payment = await db.payment.findUnique({ where: { id: paymentId } })
      if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
      if (payment.paymentStatus !== 'pending_verification') {
        return NextResponse.json({ error: 'Payment already processed' }, { status: 400 })
      }

      await db.payment.update({ where: { id: paymentId }, data: { paymentStatus: 'completed' } })
      const order = await db.order.findUnique({ where: { id: payment.orderId } })
      if (order) {
        await db.order.update({ where: { id: payment.orderId }, data: { paymentStatus: 'paid', orderStatus: 'confirmed' } })
        await db.orderStatusLog.create({ data: { orderId: payment.orderId, status: 'confirmed', notes: 'Online payment verified & approved', changedBy: adminId } })
        await db.notification.create({ data: { userId: payment.userId, title: 'Payment Verified!', message: `Your payment of ₹${payment.amount} for order ${order.orderNumber} has been verified.`, type: 'payment_approved' } })
      }
      await db.adminActivityLog.create({ data: { adminId, action: 'approve_payment', tableName: 'payments', recordId: paymentId, message: `Payment ₹${payment.amount} approved for order ${order?.orderNumber}` } })
      return NextResponse.json({ success: true })
    }

    if (action === 'reject_payment') {
      const paymentId = Number(data.paymentId)
      if (!paymentId || !Number.isFinite(paymentId) || paymentId <= 0) {
        return NextResponse.json({ error: 'Invalid payment ID' }, { status: 400 })
      }
      const payment = await db.payment.findUnique({ where: { id: paymentId } })
      if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
      if (payment.paymentStatus !== 'pending_verification') {
        return NextResponse.json({ error: 'Payment already processed' }, { status: 400 })
      }

      const reason = sanitize(data.reason || 'Payment rejected')
      await db.payment.update({ where: { id: paymentId }, data: { paymentStatus: 'rejected', adminNotes: reason } })
      if (payment.orderId) {
        await db.order.update({ where: { id: payment.orderId }, data: { orderStatus: 'cancelled' } })
        await db.orderStatusLog.create({ data: { orderId: payment.orderId, status: 'cancelled', notes: 'Payment rejected by admin', changedBy: adminId } })
      }
      await db.notification.create({ data: { userId: payment.userId, title: 'Payment Rejected', message: `Your payment for order was rejected. Reason: ${reason}`, type: 'payment_rejected' } })

      if (payment.orderId) {
        const order = await db.order.findUnique({ where: { id: payment.orderId }, include: { items: true } })
        if (order?.orderType === 'product' && order.paymentStatus !== PAYMENT_STATUSES.PAID && order.orderStatus !== ORDER_STATUSES.DELIVERED && order.orderStatus !== ORDER_STATUSES.FAILED) {
          for (const item of order.items) {
            if (item.productId) {
              await db.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } })
            }
          }
        }
      }
      await db.adminActivityLog.create({ data: { adminId, action: 'reject_payment', tableName: 'payments', recordId: paymentId, message: `Payment ₹${payment.amount} rejected` } })
      return NextResponse.json({ success: true })
    }

    if (action === 'approve_withdrawal') {
      const withdrawalId = Number(data.withdrawalId)
      if (!withdrawalId || !Number.isFinite(withdrawalId) || withdrawalId <= 0) {
        return NextResponse.json({ error: 'Invalid withdrawal ID' }, { status: 400 })
      }
      const withdrawal = await db.withdrawal.findUnique({ where: { id: withdrawalId } })
      if (!withdrawal) return NextResponse.json({ error: 'Not found' }, { status: 404 })

      // === DOUBLE-ACTION PREVENTION ===
      if (withdrawal.status !== 'pending') {
        return NextResponse.json({ error: `Withdrawal already ${withdrawal.status}` }, { status: 400 })
      }

      await db.withdrawal.update({
        where: { id: withdrawalId },
        data: { status: 'completed', processedBy: adminId, processedAt: new Date() }
      })
      await db.notification.create({
        data: {
          userId: withdrawal.deliveryBoyId,
          title: 'Withdrawal Approved!',
          message: `Your withdrawal of ₹${withdrawal.amount} has been approved and will be sent to ${withdrawal.upiId}.`,
          type: 'withdrawal_approved'
        }
      })
      await db.adminActivityLog.create({ data: { adminId, action: 'approve_withdrawal', tableName: 'withdrawals', recordId: withdrawalId, message: `Withdrawal ₹${withdrawal.amount} approved` } })
      return NextResponse.json({ success: true })
    }

    if (action === 'reject_withdrawal') {
      const withdrawalId = Number(data.withdrawalId)
      if (!withdrawalId || !Number.isFinite(withdrawalId) || withdrawalId <= 0) {
        return NextResponse.json({ error: 'Invalid withdrawal ID' }, { status: 400 })
      }
      const withdrawal = await db.withdrawal.findUnique({ where: { id: withdrawalId } })
      if (!withdrawal) return NextResponse.json({ error: 'Not found' }, { status: 404 })

      // === DOUBLE-ACTION PREVENTION ===
      if (withdrawal.status !== 'pending') {
        return NextResponse.json({ error: `Withdrawal already ${withdrawal.status}` }, { status: 400 })
      }

      const reason = sanitize(data.reason || '')

      // Refund to wallet
      await db.deliveryBoy.update({
        where: { id: withdrawal.deliveryBoyId },
        data: { walletBalance: { increment: withdrawal.amount } }
      })
      await db.walletTransaction.create({
        data: {
          deliveryBoyId: withdrawal.deliveryBoyId,
          type: 'withdrawal_refund',
          amount: withdrawal.amount,
          description: `Withdrawal rejected - ₹${withdrawal.amount} refunded`
        }
      })
      await db.withdrawal.update({
        where: { id: withdrawalId },
        data: { status: 'rejected', processedBy: adminId, processedAt: new Date(), adminNotes: reason }
      })
      await db.notification.create({
        data: {
          userId: withdrawal.deliveryBoyId,
          title: 'Withdrawal Rejected',
          message: `Your withdrawal of ₹${withdrawal.amount} was rejected. ${reason ? 'Reason: ' + reason : ''} Amount refunded to wallet.`,
          type: 'withdrawal_rejected'
        }
      })
      await db.adminActivityLog.create({ data: { adminId, action: 'reject_withdrawal', tableName: 'withdrawals', recordId: withdrawalId, message: `Withdrawal ₹${withdrawal.amount} rejected, refunded` } })
      return NextResponse.json({ success: true })
    }

    if (action === 'assign_delivery') {
      const orderId = Number(data.orderId)
      const deliveryBoyId = Number(data.deliveryBoyId)
      if (!orderId || !Number.isFinite(orderId) || orderId <= 0 ||
          !deliveryBoyId || !Number.isFinite(deliveryBoyId) || deliveryBoyId <= 0) {
        return NextResponse.json({ error: 'Invalid order or delivery boy ID' }, { status: 400 })
      }

      // Verify delivery boy is approved
      const dBoy = await db.deliveryBoy.findUnique({ where: { id: deliveryBoyId } })
      if (!dBoy || dBoy.status !== 'approved') {
        return NextResponse.json({ error: 'Delivery boy not found or not approved' }, { status: 400 })
      }

      const existing = await db.deliveryAssignment.findFirst({
        where: { orderId, status: { in: ['assigned', 'accepted', 'picked'] } }
      })
      if (existing) return NextResponse.json({ error: 'Order already has an active delivery assignment' }, { status: 400 })

      const assignment = await db.deliveryAssignment.create({
        data: { orderId, deliveryBoyId, assignedBy: adminId, status: 'assigned' }
      })
      await db.order.update({ where: { id: orderId }, data: { orderStatus: 'processing' } })
      await db.orderStatusLog.create({ data: { orderId, status: 'processing', notes: 'Delivery assigned', changedBy: adminId } })
      await db.notification.create({ data: { userId: dBoy.userId, title: 'New Delivery Assigned', message: 'You have been assigned a new delivery.', type: 'new_delivery' } })
      return NextResponse.json({ assignment })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (e) {
    logError('admin', e)
    return NextResponse.json({ error: 'Failed to process admin action' }, { status: 500 })
  }
}
