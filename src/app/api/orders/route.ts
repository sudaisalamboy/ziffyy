import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helper'
import { rateLimit } from '@/lib/rate-limit'
import { sanitize, VALIDATION, PAYMENT_METHODS, logError, parseId, roundMoney } from '@/lib/sanitize'
import { getFinancialSetting } from '@/lib/settings'

/** Get the fixed earning per order from settings, fallback to default */
async function getDeliveryEarning(): Promise<number> {
  return getFinancialSetting('delivery_earning_per_order', VALIDATION.DELIVERY_EARNING_PER_ORDER)
}

/** Get the platform fee per order from settings, fallback to default */
async function getPlatformFee(): Promise<number> {
  return getFinancialSetting('platform_fee_per_order', VALIDATION.PLATFORM_FEE_PER_ORDER)
}

// GET: List orders (role-filtered to prevent IDOR)
export async function GET(req: NextRequest) {
  try {
    const { limited } = rateLimit('orders_get', req, { maxRequests: 60, windowMs: 60_000 })
    if (limited) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

    const auth = await requireAuth(req)
    if (auth.error) return auth.error

    const user = auth.user
    const { searchParams } = new URL(req.url)
    const statusFilter = searchParams.get('status')

    const whereClause: any = {}
    if (statusFilter) whereClause.orderStatus = statusFilter

    // === ROLE-BASED FILTERING (IDOR prevention) ===
    if (user.role === 'customer') {
      whereClause.userId = user.id
    } else if (user.role === 'shop') {
      const shopOwner = await db.shopOwner.findUnique({ where: { userId: user.id } })
      if (!shopOwner) return NextResponse.json({ orders: [] })

      const myProductIds = await db.product.findMany({
        where: { shopOwnerId: shopOwner.id },
        select: { id: true }
      }).then(ps => ps.map(p => p.id))

      if (myProductIds.length > 0) {
        whereClause.items = { some: { productId: { in: myProductIds } } }
      } else {
        return NextResponse.json({ orders: [] })
      }
    } else if (user.role === 'delivery') {
      const deliveryBoy = await db.deliveryBoy.findUnique({ where: { userId: user.id } })
      if (!deliveryBoy) return NextResponse.json({ orders: [] })

      const myAssignmentOrderIds = await db.deliveryAssignment.findMany({
        where: { deliveryBoyId: deliveryBoy.id },
        select: { orderId: true }
      }).then(a => a.map(a => a.orderId))

      if (myAssignmentOrderIds.length > 0) {
        whereClause.id = { in: myAssignmentOrderIds }
      } else {
        return NextResponse.json({ orders: [] })
      }
    }

    const orders = await db.order.findMany({
      where: whereClause,
      include: {
        items: true,
        deliveryAssignments: {
          include: {
            deliveryBoy: {
              include: { user: { select: { id: true, name: true } } }
            }
          }
        },
        user: { select: { id: true, name: true, role: true, status: true, profileImage: true, createdAt: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: VALIDATION.DEFAULT_PAGE_SIZE
    })

    return NextResponse.json({ orders })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
  }
}

// POST: Create order (with server-side price recalculation + atomic stock)
export async function POST(req: NextRequest) {
  try {
    const { limited } = rateLimit('orders_post', req, { maxRequests: 15, windowMs: 60_000 })
    if (limited) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

    const auth = await requireAuth(req)
    if (auth.error) return auth.error
    const user = auth.user

    if (user.role !== 'customer') {
      return NextResponse.json({ error: 'Only customers can place orders' }, { status: 403 })
    }

    const { items, shippingAddress, paymentMethod } = await req.json()

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Order must have at least one item' }, { status: 400 })
    }

    if (items.length > VALIDATION.MAX_ITEMS_PER_ORDER) {
      return NextResponse.json({ error: `Maximum ${VALIDATION.MAX_ITEMS_PER_ORDER} items per order` }, { status: 400 })
    }

    // === PAYMENT METHOD WHITELIST ===
    if (paymentMethod && !PAYMENT_METHODS.includes(paymentMethod)) {
      return NextResponse.json({ error: 'Invalid payment method' }, { status: 400 })
    }

    // === SERVER-SIDE PRICE RECALCULATION + ATOMIC STOCK DECREMENT (in transaction) ===
    const result = await db.$transaction(async (tx) => {
      const orderItems: Array<{ productId: number; productName: string; quantity: number; unitPrice: number; totalPrice: number }> = []
      let totalAmount = 0

      for (const item of items) {
        const qty = Number(item.quantity)
        if (!qty || qty <= 0 || !Number.isFinite(qty)) {
          return { error: { message: 'Invalid quantity for an item', status: 400 } }
        }

        const productId = Number(item.productId)
        if (!productId || !Number.isFinite(productId)) {
          return { error: { message: 'Invalid product ID', status: 400 } }
        }

        const product = await tx.product.findUnique({ where: { id: productId } })

        if (!product || product.status !== 'approved') {
          return { error: { message: `Product #${productId} not found or unavailable`, status: 400 } }
        }

        // === ATOMIC STOCK DECREMENT (prevents TOCTOU race condition) ===
        const stockResult = await tx.product.updateMany({
          where: { id: product.id, stock: { gte: qty } },
          data: { stock: { decrement: qty } }
        })
        if (stockResult.count === 0) {
          return { error: { message: `Insufficient stock for "${product.title}". Please try again.`, status: 400 } }
        }

        const unitPrice = roundMoney(product.price)
        const totalPrice = roundMoney(unitPrice * qty)
        totalAmount = roundMoney(totalAmount + totalPrice)

        orderItems.push({
          productId: product.id,
          productName: product.title,
          quantity: qty,
          unitPrice,
          totalPrice
        })
      }

      const freeThreshold = await getFinancialSetting('free_delivery_threshold', VALIDATION.FREE_DELIVERY_THRESHOLD)
      const deliveryFee = totalAmount >= freeThreshold ? 0 : await getFinancialSetting('delivery_fee', VALIDATION.DELIVERY_FEE)
      const platformFee = await getPlatformFee()
      const finalTotal = roundMoney(totalAmount + deliveryFee)
      const shopEarning = roundMoney(totalAmount - platformFee)

      // === SHIPPING ADDRESS XSS SANITIZATION ===
      const cleanAddress = sanitize(shippingAddress || user.address || 'Address not provided')

      const order = await tx.order.create({
        data: {
          userId: user.id,
          orderNumber: `ORD${crypto.randomUUID().replace(/-/g, '').substring(0, 12).toUpperCase()}`,
          totalAmount: finalTotal,
          deliveryFee,
          commissionAmount: platformFee,
          shopEarning,
          paymentMethod: paymentMethod || 'cod',
          paymentStatus: 'pending',
          orderStatus: 'pending',
          shippingAddress: cleanAddress,
          items: { create: orderItems }
        },
        include: { items: true }
      })

      // Clear cart
      const cart = await tx.cart.findUnique({ where: { userId: user.id } })
      if (cart) {
        await tx.cartItem.deleteMany({ where: { cartId: cart.id } })
      }

      // Create notification
      await tx.notification.create({
        data: { userId: user.id, title: 'Order Placed', message: `Your order #${order.orderNumber} has been placed successfully! Total: ₹${finalTotal}` }
      })

      return { order }
    })

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: result.error.status })
    }

    return NextResponse.json({ order: result.order, message: 'Order placed successfully' }, { status: 201 })
  } catch (e) {
    logError('orders', e)
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
  }
}

// PUT: Customer confirms delivery (online payment orders only)
export async function PUT(req: NextRequest) {
  try {
    const { limited } = rateLimit('orders_put', req, { maxRequests: 15, windowMs: 60_000 })
    if (limited) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

    const auth = await requireAuth(req)
    if (auth.error) return auth.error
    const user = auth.user

    const { orderId } = await req.json()
    const oid = parseId(orderId)
    if (!oid) return NextResponse.json({ error: 'Invalid order ID' }, { status: 400 })

    const order = await db.order.findUnique({
      where: { id: oid },
      include: { deliveryAssignments: { take: 1, include: { deliveryBoy: true }, orderBy: { assignedAt: 'desc' } } }
    })
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    if (order.userId !== user.id) return NextResponse.json({ error: 'Not your order' }, { status: 403 })
    if (order.paymentMethod !== 'online') return NextResponse.json({ error: 'Only online payment orders can be confirmed this way' }, { status: 400 })
    if (order.orderStatus !== 'out_for_delivery') return NextResponse.json({ error: 'Order is not out for delivery' }, { status: 400 })

    // Update order
    await db.order.update({
      where: { id: oid },
      data: { orderStatus: 'delivered', paymentStatus: 'paid' }
    })

    // Update delivery assignment
    const assignment = order.deliveryAssignments?.[0]
    if (assignment) {
      await db.deliveryAssignment.updateMany({
        where: { id: assignment.id, status: { notIn: ['delivered', 'failed', 'cancelled'] } },
        data: { status: 'delivered', deliveredAt: new Date() }
      })

      // Credit delivery boy wallet (fixed earning per order)
      if (assignment.deliveryBoyId) {
        const earning = await getDeliveryEarning()
        await db.deliveryBoy.update({
          where: { id: assignment.deliveryBoyId },
          data: { walletBalance: { increment: earning }, totalDeliveries: { increment: 1 } }
        })
        await db.walletTransaction.create({
          data: {
            deliveryBoyId: assignment.deliveryBoyId,
            type: 'credit',
            amount: earning,
            description: `Delivery earning for order #${order.orderNumber} (₹${earning}/order)`,
            orderId: oid
          }
        })
      }
    }

    // Notify delivery boy
    if (assignment?.deliveryBoyId) {
      const dbUser = await db.deliveryBoy.findUnique({ where: { id: assignment.deliveryBoyId }, select: { userId: true } })
      if (dbUser) {
        await db.notification.create({
          data: {
            userId: dbUser.userId,
            title: 'Delivery Confirmed by Customer',
            message: `Customer has confirmed delivery for order #${order.orderNumber}`
          }
        })
      }
    }

    return NextResponse.json({ success: true, message: 'Delivery confirmed!' })
  } catch (e) {
    logError('orders_put', e)
    return NextResponse.json({ error: 'Failed to confirm delivery' }, { status: 500 })
  }
}
