import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, safeUserSelect } from '@/lib/auth-helper'
import { rateLimit } from '@/lib/rate-limit'
import { parseId, logError } from '@/lib/sanitize'

const VALID_TYPES = ['user', 'order', 'need']

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { limited } = rateLimit('admin_id_get', req, { maxRequests: 30, windowMs: 60_000 })
    if (limited) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

    const { error } = await requireAdmin(req)
    if (error) return error

    const { id } = await params

    // === NUMERIC ID VALIDATION ===
    const recordId = parseId(id)
    if (!recordId) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
    }

    const type = new URL(req.url).searchParams.get('type') || 'user'

    // === TYPE WHITELIST ===
    if (!VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }

    if (type === 'user') {
      const user = await db.user.findUnique({
        where: { id: recordId },
        select: {
          ...safeUserSelect,
          email: true,
          mobile: true,
          address: true,
          updatedAt: true,
          shopOwner: {
            select: { id: true, userId: true, shopName: true, shopAddress: true, shopImage: true, status: true, rejectionReason: true, approvedAt: true, createdAt: true }
          },
          deliveryBoy: {
            select: { id: true, userId: true, address: true, vehicleType: true, vehicleNumber: true, status: true, totalDeliveries: true, rating: true, walletBalance: true, approvedAt: true, createdAt: true }
          },
          orders: {
            select: {
              id: true, orderNumber: true, totalAmount: true, paymentStatus: true,
              orderStatus: true, paymentMethod: true, orderType: true, shippingAddress: true,
              createdAt: true, updatedAt: true,
              items: true,
              payments: true,
              deliveryAssignments: {
                select: {
                  id: true, status: true, assignedAt: true, deliveredAt: true, deliveryNotes: true,
                  deliveryBoy: { select: { id: true, user: { select: safeUserSelect } } }
                }
              },
              statusLogs: true
            },
            orderBy: { createdAt: 'desc' }
          },
          needs: {
            select: {
              id: true, title: true, description: true, priceType: true, exactPrice: true,
              minPrice: true, maxPrice: true, urgency: true, status: true, createdAt: true,
              comments: { select: { id: true, comment: true, createdAt: true, user: { select: safeUserSelect } } },
              offers: {
                select: {
                  id: true, offerAmount: true, message: true, status: true, createdAt: true, respondedAt: true,
                  deliveryBoy: { select: { id: true, user: { select: safeUserSelect } } }
                }
              }
            },
            orderBy: { createdAt: 'desc' }
          },
          userAddresses: true,
          payments: {
            select: {
              id: true, amount: true, paymentMethod: true, transactionId: true,
              paymentStatus: true, screenshot: true, adminNotes: true, createdAt: true,
              order: { select: { id: true, orderNumber: true } }
            },
            orderBy: { createdAt: 'desc' }
          },
        }
      })
      if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
      return NextResponse.json({ user })
    }

    if (type === 'order') {
      const order = await db.order.findUnique({
        where: { id: recordId },
        include: {
          user: { select: safeUserSelect },
          items: true,
          payments: true,
          deliveryAssignments: {
            include: { deliveryBoy: { include: { user: { select: safeUserSelect } } } }
          },
          statusLogs: { orderBy: { createdAt: 'asc' } }
        }
      })
      if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
      return NextResponse.json({ order })
    }

    if (type === 'need') {
      const need = await db.need.findUnique({
        where: { id: recordId },
        include: {
          user: { select: safeUserSelect },
          comments: { include: { user: { select: safeUserSelect } }, orderBy: { createdAt: 'asc' } },
          offers: {
            include: { deliveryBoy: { include: { user: { select: safeUserSelect } } } },
            orderBy: { createdAt: 'desc' }
          }
        }
      })
      if (!need) return NextResponse.json({ error: 'Need not found' }, { status: 404 })
      return NextResponse.json({ need })
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  } catch (e) {
    logError('admin_id', e)
    return NextResponse.json({ error: 'Failed to fetch admin resource' }, { status: 500 })
  }
}
