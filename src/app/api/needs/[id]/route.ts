import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helper'
import { rateLimit } from '@/lib/rate-limit'
import { sanitize, logError } from '@/lib/sanitize'

// GET: Single need with comments
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { limited } = rateLimit('need_get', req, { maxRequests: 60, windowMs: 60_000 })
    if (limited) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

    const auth = await requireAuth(req)
    if (auth.error) return auth.error

    const { id } = await params
    const need = await db.need.findUnique({
      where: { id: Number(id) },
      include: {
        user: { select: { id: true, name: true, mobile: true, address: true } },
        offers: {
          include: { deliveryBoy: { include: { user: { select: { name: true, mobile: true } } } } },
          orderBy: { createdAt: 'desc' }
        },
        comments: {
          include: { user: { select: { name: true } } },
          orderBy: { createdAt: 'asc' }
        }
      }
    })

    if (!need) return NextResponse.json({ error: 'Need not found' }, { status: 404 })

    return NextResponse.json({ need })
  } catch (e) {
    logError('need', e)
    return NextResponse.json({ error: 'Failed to fetch need' }, { status: 500 })
  }
}

// POST: Actions on a need (comment, offer, accept offer, close)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { limited } = rateLimit('need_post', req, { maxRequests: 30, windowMs: 60_000 })
    if (limited) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

    const auth = await requireAuth(req)
    if (auth.error) return auth.error
    const user = auth.user

    const { id } = await params
    const need = await db.need.findUnique({
      where: { id: Number(id) },
      include: { user: { select: { id: true, name: true, mobile: true, address: true } } }
    })
    if (!need) return NextResponse.json({ error: 'Need not found' }, { status: 404 })

    const body = await req.json()
    const { action } = body

    // === COMMENT ===
    if (action === 'comment') {
      if (!body.comment || typeof body.comment !== 'string' || body.comment.trim().length === 0) {
        return NextResponse.json({ error: 'Comment is required' }, { status: 400 })
      }

      // Sanitize comment
      const cleanComment = sanitize(body.comment, 1000)

      const comment = await db.needComment.create({
        data: {
          needId: need.id,
          userId: user.id,
          comment: cleanComment
        },
        include: { user: { select: { name: true } } }
      })

      return NextResponse.json({ comment })
    }

    // === MAKE OFFER (delivery boys only) ===
    if (action === 'offer') {
      if (user.role !== 'delivery') {
        return NextResponse.json({ error: 'Only delivery boys can make offers' }, { status: 403 })
      }

      const offerAmount = Number(body.offerAmount)
      // === R4-FIX: Offer amount validation (prevent absurd/negative values) ===
      if (!offerAmount || !isFinite(offerAmount) || offerAmount <= 0 || offerAmount > 999999) {
        return NextResponse.json({ error: 'Offer amount must be between ₹1 and ₹9,99,999' }, { status: 400 })
      }

      // Fix: Use DeliveryBoy.id (not User.id) as deliveryBoyId
      const deliveryBoy = await db.deliveryBoy.findUnique({ where: { userId: user.id } })
      if (!deliveryBoy) {
        return NextResponse.json({ error: 'Delivery boy profile not found' }, { status: 404 })
      }

      const offer = await db.offer.create({
        data: {
          needId: need.id,
          customerId: need.userId,
          deliveryBoyId: deliveryBoy.id, // Correct: DeliveryBoy.id, not User.id
          offerAmount: offerAmount,
          message: sanitize(body.message || '', 500)
        },
        include: { deliveryBoy: { include: { user: { select: { name: true, mobile: true } } } } }
      })

      // Notify need owner
      await db.notification.create({
        data: {
          userId: need.userId,
          title: 'New Offer',
          message: `${user.name} offered ₹${offerAmount} for your need "${need.title}"`
        }
      })

      return NextResponse.json({ offer, message: 'Offer submitted' }, { status: 201 })
    }

    // === RESPOND TO OFFER (need owner: accept or reject) ===
    if (action === 'respond_offer' || action === 'accept_offer') {
      if (need.userId !== user.id) {
        return NextResponse.json({ error: 'Only the need owner can respond to offers' }, { status: 403 })
      }

      if (!body.offerId) return NextResponse.json({ error: 'Offer ID is required' }, { status: 400 })

      const respondStatus = body.status || 'accepted'
      if (!['accepted', 'rejected'].includes(respondStatus)) {
        return NextResponse.json({ error: 'Status must be accepted or rejected' }, { status: 400 })
      }

      const offer = await db.offer.findUnique({ where: { id: Number(body.offerId) } })
      if (!offer || offer.needId !== need.id) {
        return NextResponse.json({ error: 'Offer not found' }, { status: 404 })
      }

      if (offer.status !== 'sent') {
        return NextResponse.json({ error: 'Offer already responded to' }, { status: 400 })
      }

      await db.offer.update({ where: { id: offer.id }, data: { status: respondStatus, respondedAt: new Date() } })

      if (respondStatus === 'accepted') {
        // Reject other offers
        await db.offer.updateMany({
          where: { needId: need.id, id: { not: offer.id } },
          data: { status: 'rejected', respondedAt: new Date() }
        })
        await db.need.update({ where: { id: need.id }, data: { status: 'assigned' } })

        // === Create Order + DeliveryAssignment + Notification atomically ===
        const dbBoy = await db.deliveryBoy.findUnique({ where: { id: offer.deliveryBoyId } })
        if (dbBoy) {
          const orderNumber = `NEED${crypto.randomUUID().replace(/-/g, '').substring(0, 12).toUpperCase()}`
          // Interactive transaction: all-or-nothing, prevents orphan records
          await db.$transaction(async (tx) => {
            const newOrder = await tx.order.create({
              data: {
                userId: need.userId,
                offerId: offer.id,
                orderNumber,
                totalAmount: offer.offerAmount,
                deliveryFee: 0,
                commissionAmount: 0,
                shopEarning: 0,
                paymentMethod: 'cod',
                paymentStatus: 'pending',
                orderStatus: 'confirmed',
                orderType: 'need',
                shippingAddress: need.user?.address || 'Address not provided',
              },
            })
            await tx.deliveryAssignment.create({
              data: {
                orderId: newOrder.id,
                deliveryBoyId: dbBoy.id,
                assignedBy: need.userId,
                status: 'assigned',
              },
            })
            await tx.notification.create({
              data: {
                userId: dbBoy.userId,
                title: 'Offer Accepted - New Delivery!',
                message: `Your offer for "${need.title}" was accepted! Please accept the delivery.`,
              }
            })
          })
        }
      }

      // Also notify for rejection (accept notification already sent above)
      if (respondStatus === 'rejected') {
        const dbBoy = await db.deliveryBoy.findUnique({ where: { id: offer.deliveryBoyId } })
        if (dbBoy) {
          await db.notification.create({
            data: {
              userId: dbBoy.userId,
              title: 'Offer Rejected',
              message: `Your offer for "${need.title}" was rejected.`,
            }
          })
        }
      }

      return NextResponse.json({ message: `Offer ${respondStatus}` })
    }

    // === CLOSE NEED (owner only) ===
    if (action === 'close') {
      if (need.userId !== user.id && user.role !== 'admin') {
        return NextResponse.json({ error: 'Only the need owner can close it' }, { status: 403 })
      }

      await db.need.update({ where: { id: need.id }, data: { status: 'closed' } })
      return NextResponse.json({ message: 'Need closed' })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (e) {
    logError('need_action', e)
    return NextResponse.json({ error: 'Failed to process need action' }, { status: 500 })
  }
}
