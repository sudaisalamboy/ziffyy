import { db } from '@/lib/db'
import { roundMoney, VALIDATION, logError, sanitize } from '@/lib/sanitize'
import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth-helper'
import { rateLimit } from '@/lib/rate-limit'
import { getFinancialSetting } from '@/lib/settings'

/** Get the fixed earning per order from settings, fallback to default */
async function getDeliveryEarning(): Promise<number> {
  return getFinancialSetting('delivery_earning_per_order', VALIDATION.DELIVERY_EARNING_PER_ORDER)
}

// Allowed statuses for assignment updates (matches frontend flow)
const VALID_STATUSES = ['assigned', 'accepted', 'picked', 'delivered', 'failed']
const FINAL_STATUSES = ['delivered', 'failed', 'cancelled']

// Status → order status mapping
const STATUS_TO_ORDER: Record<string, string> = {
  accepted: 'confirmed',
  picked: 'out_for_delivery',
  delivered: 'delivered',
  failed: 'failed',
}

// GET: Delivery boy sections
export async function GET(req: NextRequest) {
  try {
    const { limited } = rateLimit('delivery_get', req, { maxRequests: 60, windowMs: 60_000 })
    if (limited) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

    const auth = await requireRole(req, ['delivery', 'admin'])
    if (auth.error) return auth.error
    const user = auth.user

    const { searchParams } = new URL(req.url)
    const section = searchParams.get('section')

    const deliveryBoy = await db.deliveryBoy.findUnique({ where: { userId: user.id } })
    if (!deliveryBoy) return NextResponse.json({ error: 'Delivery profile not found' }, { status: 404 })

    // === AVAILABLE ORDERS (for delivery boys to claim) ===
    if (section === 'available') {
      // Find orders that are confirmed/preparing and don't have an active delivery assignment
      // Also exclude need-type orders (those go through the offer flow)
      const assignedOrderIds = await db.deliveryAssignment.findMany({
        where: { status: { notIn: ['delivered', 'failed', 'cancelled'] } },
        select: { orderId: true }
      })
      const assignedIds = new Set(assignedOrderIds.map(a => a.orderId))

      const availableOrders = await db.order.findMany({
        where: {
          orderType: 'product',
          orderStatus: { in: ['confirmed', 'preparing'] },
          id: { notIn: Array.from(assignedIds) },
        },
        include: {
          items: true,
          user: { select: { id: true, name: true, mobile: true, address: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      })

      return NextResponse.json({ orders: availableOrders })
    }

    // === ASSIGNMENTS ===
    if (section === 'assignments') {
      const assignments = await db.deliveryAssignment.findMany({
        where: { deliveryBoyId: deliveryBoy.id },
        include: {
          order: {
            include: {
              items: true,
              user: { select: { id: true, name: true, mobile: true, address: true } }
            }
          }
        },
        orderBy: { assignedAt: 'desc' },
      })
      return NextResponse.json({ assignments })
    }

    // === PROFILE ===
    if (section === 'profile') {
      const profileData = await db.deliveryBoy.findUnique({
        where: { id: deliveryBoy.id },
        include: { user: { select: { name: true, email: true, mobile: true, address: true, profileImage: true, createdAt: true } } }
      })
      if (!profileData) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

      // Compute stats
      const pending = await db.deliveryAssignment.count({
        where: { deliveryBoyId: deliveryBoy.id, status: { notIn: ['delivered', 'failed', 'cancelled'] } }
      })
      const acceptedOffers = await db.offer.count({
        where: { deliveryBoyId: deliveryBoy.id, status: 'accepted' }
      })
      const recentHistory = await db.deliveryAssignment.findMany({
        where: { deliveryBoyId: deliveryBoy.id },
        select: { id: true, orderId: true, status: true, assignedAt: true, deliveredAt: true },
        orderBy: { assignedAt: 'desc' },
        take: 10
      })

      const historyMapped = recentHistory.map(h => ({ ...h, createdAt: h.assignedAt }))

      return NextResponse.json({
        user: profileData.user,
        deliveryBoy: {
          id: profileData.id,
          userId: profileData.userId,
          vehicleType: profileData.vehicleType,
          vehicleNumber: profileData.vehicleNumber,
          status: profileData.status,
          address: profileData.address,
        },
        stats: {
          totalDeliveries: profileData.totalDeliveries,
          rating: profileData.rating || 'N/A',
          pending,
          acceptedOffers,
        },
        recentHistory: historyMapped,
      })
    }

    // === OFFERS ===
    if (section === 'offers') {
      const offers = await db.offer.findMany({
        where: { deliveryBoyId: deliveryBoy.id },
        include: {
          need: {
            include: {
              user: { select: { id: true, name: true, mobile: true, address: true } },
              comments: {
                include: { user: { select: { id: true, name: true } } },
                orderBy: { createdAt: 'asc' }
              }
            }
          },
          deliveryBoy: { include: { user: { select: { name: true, mobile: true } } } }
        },
        orderBy: { createdAt: 'desc' },
      })
      return NextResponse.json({ offers })
    }

    return NextResponse.json({ error: 'Invalid section' }, { status: 400 })
  } catch (e) {
    logError('delivery_get', e)
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }
}

// POST: Delivery boy actions
export async function POST(req: NextRequest) {
  try {
    const { limited } = rateLimit('delivery_post', req, { maxRequests: 30, windowMs: 60_000 })
    if (limited) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

    const auth = await requireRole(req, ['delivery', 'admin'])
    if (auth.error) return auth.error
    const user = auth.user

    const body = await req.json()

    // === CLAIM AVAILABLE ORDER ===
    if (body.action === 'claim_order') {
      const orderId = Number(body.orderId)
      if (isNaN(orderId) || orderId <= 0) return NextResponse.json({ error: 'Invalid order ID' }, { status: 400 })

      const deliveryBoy = await db.deliveryBoy.findUnique({ where: { userId: user.id } })
      if (!deliveryBoy) return NextResponse.json({ error: 'Delivery profile not found' }, { status: 404 })

      // Find the order
      const order = await db.order.findUnique({
        where: { id: orderId },
        include: { items: true }
      })
      if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

      // Only product orders with confirmed/preparing status can be claimed
      if (order.orderType !== 'product') {
        return NextResponse.json({ error: 'Only product orders can be claimed' }, { status: 400 })
      }
      if (!['confirmed', 'preparing'].includes(order.orderStatus)) {
        return NextResponse.json({ error: 'Order is not available for delivery' }, { status: 400 })
      }

      // Check if order already has an active assignment
      const existingAssignment = await db.deliveryAssignment.findFirst({
        where: {
          orderId,
          status: { notIn: ['delivered', 'failed', 'cancelled'] }
        }
      })
      if (existingAssignment) {
        return NextResponse.json({ error: 'This order has already been claimed by another delivery partner' }, { status: 409 })
      }

      // Create delivery assignment with status 'accepted' (skip 'assigned' since they self-claimed)
      const assignment = await db.deliveryAssignment.create({
        data: {
          orderId: order.id,
          deliveryBoyId: deliveryBoy.id,
          assignedBy: user.id, // self-assigned
          status: 'accepted',
        },
        include: {
          order: { include: { items: true, user: { select: { name: true, mobile: true, address: true } } } }
        }
      })

      // Notify the customer
      await db.notification.create({
        data: {
          userId: order.userId,
          title: 'Delivery Partner Assigned',
          message: `A delivery partner has accepted your order #${order.orderNumber} and will deliver it to you soon!`,
        }
      })

      return NextResponse.json({ assignment, message: 'Order claimed successfully!' })
    }

    // === UPDATE PROFILE ===
    if (body.action === 'update_profile') {
      const deliveryBoy = await db.deliveryBoy.findUnique({ where: { userId: user.id } })
      if (!deliveryBoy) return NextResponse.json({ error: 'Delivery boy profile not found' }, { status: 404 })

      const name = sanitize(body.name || '')
      if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

      await db.user.update({
        where: { id: user.id },
        data: {
          name,
          mobile: sanitize(body.mobile || ''),
          address: sanitize(body.address || ''),
        }
      })
      await db.deliveryBoy.update({
        where: { id: deliveryBoy.id },
        data: {
          vehicleType: sanitize(body.vehicleType || ''),
          vehicleNumber: sanitize(body.vehicleNumber || ''),
        }
      })

      return NextResponse.json({ success: true, message: 'Profile updated' })
    }

    // === UPDATE ASSIGNMENT STATUS ===
    if (body.assignmentId && body.status) {
      const assignmentId = Number(body.assignmentId)
      if (isNaN(assignmentId) || assignmentId <= 0) return NextResponse.json({ error: 'Invalid assignment ID' }, { status: 400 })

      if (!VALID_STATUSES.includes(body.status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
      }

      // 'assigned' is the initial status, don't allow setting back to it
      if (body.status === 'assigned') {
        return NextResponse.json({ error: 'Cannot set status back to assigned' }, { status: 400 })
      }

      const deliveryBoy = await db.deliveryBoy.findUnique({ where: { userId: user.id } })
      if (!deliveryBoy) return NextResponse.json({ error: 'Delivery boy profile not found' }, { status: 404 })

      // IDOR CHECK
      const assignment = await db.deliveryAssignment.findUnique({
        where: { id: assignmentId },
        include: { order: true }
      })
      if (!assignment) return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
      if (assignment.deliveryBoyId !== deliveryBoy.id && user.role !== 'admin') {
        return NextResponse.json({ error: 'You can only update your own assignments' }, { status: 403 })
      }

      // TERMINAL STATE CHECK
      if (FINAL_STATUSES.includes(assignment.status)) {
        return NextResponse.json({ error: 'This delivery has already been finalized' }, { status: 400 })
      }

      // ONLINE PAYMENT: Delivery boy CANNOT mark as delivered — only customer can confirm
      if (body.status === 'delivered' && assignment.order.paymentMethod === 'online') {
        return NextResponse.json({ error: 'Online payment orders must be confirmed by the customer' }, { status: 400 })
      }

      // ATOMIC UPDATE
      const statusResult = await db.deliveryAssignment.updateMany({
        where: { id: assignmentId, status: { notIn: FINAL_STATUSES } },
        data: { status: body.status }
      })
      if (statusResult.count === 0) {
        return NextResponse.json({ error: 'Status already updated. Please refresh.' }, { status: 409 })
      }

      // Set deliveredAt
      if (body.status === 'delivered') {
        await db.deliveryAssignment.update({
          where: { id: assignmentId },
          data: { deliveredAt: new Date() }
        })
      }

      // Update order status
      const orderStatus = STATUS_TO_ORDER[body.status]
      if (orderStatus) {
        const orderUpdate: any = { orderStatus }
        if (body.status === 'delivered' && assignment.order.paymentMethod === 'cod') orderUpdate.paymentStatus = 'paid'
        await db.order.update({ where: { id: assignment.orderId }, data: orderUpdate })
      }

      // Credit wallet on delivery (fixed earning per order)
      if (body.status === 'delivered') {
        const earning = roundMoney(await getDeliveryEarning())
        await db.deliveryBoy.update({
          where: { id: deliveryBoy.id },
          data: { walletBalance: { increment: earning }, totalDeliveries: { increment: 1 } }
        })
        await db.walletTransaction.create({
          data: {
            deliveryBoyId: deliveryBoy.id,
            type: 'credit',
            amount: earning,
            description: `Delivery earning for order #${assignment.order.orderNumber} (₹${earning}/order)`,
            orderId: assignment.orderId
          }
        })
        await db.notification.create({
          data: { userId: assignment.order.userId, title: 'Order Delivered', message: `Your order #${assignment.order.orderNumber} has been delivered!` }
        })
      }

      // Re-fetch and return
      const updated = await db.deliveryAssignment.findUnique({
        where: { id: assignmentId },
        include: {
          order: { include: { items: true, user: { select: { name: true, mobile: true, address: true } } } },
          deliveryBoy: { include: { user: { select: { name: true, mobile: true } } } }
        }
      })
      return NextResponse.json({ assignment: updated })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (e) {
    logError('delivery', e)
    return NextResponse.json({ error: 'Failed to process delivery action' }, { status: 500 })
  }
}
