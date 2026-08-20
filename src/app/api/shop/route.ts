import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { safeUserSelect, requireRole } from '@/lib/auth-helper'
import { rateLimit } from '@/lib/rate-limit'
import { sanitize, logError, VALIDATION } from '@/lib/sanitize'
import { getFinancialSetting } from '@/lib/settings'

const VALID_SECTIONS = ['profile', 'orders']

export async function GET(req: NextRequest) {
  try {
    const { limited } = rateLimit('shop_get', req, { maxRequests: 60, windowMs: 60_000 })
    if (limited) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

    const { user, error } = await requireRole(req, ['shop'])
    if (error) return error
    const userId = user.id
    const section = new URL(req.url).searchParams.get('section') || 'profile'

    if (!VALID_SECTIONS.includes(section)) {
      return NextResponse.json({ error: 'Invalid section' }, { status: 400 })
    }

    const shopOwner = await db.shopOwner.findUnique({ where: { userId } })
    if (!shopOwner) return NextResponse.json({ error: 'Not a shop owner' }, { status: 403 })

    if (section === 'profile') {
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, mobile: true, address: true, profileImage: true, role: true, status: true, createdAt: true }
      })
      const totalProducts = await db.product.count({ where: { shopOwnerId: shopOwner.id } })
      const approvedProducts = await db.product.count({ where: { shopOwnerId: shopOwner.id, status: 'approved' } })
      const pendingProducts = await db.product.count({ where: { shopOwnerId: shopOwner.id, status: 'pending' } })
      const rejectedProducts = await db.product.count({ where: { shopOwnerId: shopOwner.id, status: 'rejected' } })

      const myProductIds = (await db.product.findMany({ where: { shopOwnerId: shopOwner.id }, select: { id: true } })).map((p: any) => p.id)
      const orderItems = await db.orderItem.findMany({
        where: { productId: { in: myProductIds } },
        include: { order: { include: { user: { select: safeUserSelect } } } },
        orderBy: { createdAt: 'desc' },
        take: 50
      })
      const orderMap = new Map<number, any>()
      for (const oi of orderItems) {
        if (!orderMap.has(oi.orderId)) {
          orderMap.set(oi.orderId, { ...oi.order, _myItems: [oi] })
        } else {
          orderMap.get(oi.orderId)._myItems.push(oi)
        }
      }
      const shopOrders = Array.from(orderMap.values())
      const totalRevenue = orderItems.reduce((sum: number, oi: any) => sum + oi.totalPrice, 0)
      const totalOrderCount = shopOrders.length

      // Calculate platform fees deducted from this shop's orders
      const platformFee = await getFinancialSetting('platform_fee_per_order', VALIDATION.PLATFORM_FEE_PER_ORDER)
      let totalPlatformFees = 0
      for (const order of shopOrders) {
        const orderItemTotal = order.items.reduce((s: number, item: any) => s + item.totalPrice, 0)
        const myItemTotal = order._myItems.reduce((s: number, item: any) => s + item.totalPrice, 0)
        // Proportional platform fee based on this shop's share
        if (orderItemTotal > 0) {
          totalPlatformFees += (myItemTotal / orderItemTotal) * (order.commissionAmount || platformFee)
        }
      }
      const netEarnings = Math.max(0, totalRevenue - totalPlatformFees)

      return NextResponse.json({
        user, shopOwner,
        platformFee,
        stats: { totalProducts, approvedProducts, pendingProducts, rejectedProducts, totalOrderCount, totalRevenue: Math.round(totalRevenue * 100) / 100, totalPlatformFees: Math.round(totalPlatformFees * 100) / 100, netEarnings: Math.round(netEarnings * 100) / 100 }
      })
    }

    if (section === 'orders') {
      const myProductIds = (await db.product.findMany({ where: { shopOwnerId: shopOwner.id }, select: { id: true } })).map((p: any) => p.id)
      const orderItems = await db.orderItem.findMany({
        where: { productId: { in: myProductIds } },
        include: {
          order: {
            include: {
              user: { select: safeUserSelect },
              payments: true,
              statusLogs: true,
              deliveryAssignments: {
                include: {
                  deliveryBoy: {
                    include: { user: { select: safeUserSelect } }
                  }
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 100
      })
      const orderMap = new Map<number, any>()
      for (const oi of orderItems) {
        if (!orderMap.has(oi.orderId)) {
          orderMap.set(oi.orderId, { ...oi.order, _myItems: [oi] })
        } else {
          orderMap.get(oi.orderId)._myItems.push(oi)
        }
      }
      return NextResponse.json({ orders: Array.from(orderMap.values()) })
    }

    return NextResponse.json({ error: 'Invalid section' }, { status: 400 })
  } catch (e) {
    logError('shop', e)
    return NextResponse.json({ error: 'Failed to fetch shop profile' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { limited } = rateLimit('shop_post', req, { maxRequests: 15, windowMs: 60_000 })
    if (limited) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

    const { user, error } = await requireRole(req, ['shop'])
    if (error) return error
    const userId = user.id
    const data = await req.json()
    const { action } = data

    const shopOwner = await db.shopOwner.findUnique({ where: { userId } })
    if (!shopOwner) return NextResponse.json({ error: 'Not a shop owner' }, { status: 403 })

    if (action === 'update_profile') {
      // === INPUT VALIDATION + SANITIZATION ===
      const updateData: any = {}
      if (data.name !== undefined) {
        if (typeof data.name !== 'string' || data.name.trim().length < 2) {
          return NextResponse.json({ error: 'Name must be at least 2 characters' }, { status: 400 })
        }
        updateData.name = sanitize(data.name)
      }
      if (data.mobile !== undefined) {
        if (typeof data.mobile !== 'string' || !/^\d{10,15}$/.test(data.mobile)) {
          return NextResponse.json({ error: 'Invalid mobile number' }, { status: 400 })
        }
        updateData.mobile = data.mobile
      }
      if (Object.keys(updateData).length > 0) {
        await db.user.update({ where: { id: userId }, data: updateData })
      }

      const shopUpdate: any = {}
      if (data.shopName !== undefined) {
        if (typeof data.shopName !== 'string' || data.shopName.trim().length < 2) {
          return NextResponse.json({ error: 'Shop name must be at least 2 characters' }, { status: 400 })
        }
        shopUpdate.shopName = sanitize(data.shopName)
      }
      if (data.shopAddress !== undefined) {
        shopUpdate.shopAddress = sanitize(String(data.shopAddress))
      }
      if (Object.keys(shopUpdate).length > 0) {
        await db.shopOwner.update({ where: { id: shopOwner.id }, data: shopUpdate })
      }

      return NextResponse.json({ message: 'Profile updated' })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (e) {
    logError('shop', e)
    return NextResponse.json({ error: 'Failed to update shop profile' }, { status: 500 })
  }
}
