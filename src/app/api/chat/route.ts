import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helper'
import { sanitize, logError, parseId } from '@/lib/sanitize'
import { rateLimit } from '@/lib/rate-limit'

// GET /api/chat?orderId=123 - fetch message history
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    if (auth.error) return auth.error
    const { id: userId, role } = auth.user

    const { limited } = rateLimit('chat_read', req, { maxRequests: 60, windowMs: 60_000 })
    if (limited) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

    const orderId = parseId(req.nextUrl.searchParams.get('orderId'))
    if (!orderId) return NextResponse.json({ error: 'Invalid order ID' }, { status: 400 })

    // Verify the user belongs to this order (customer or assigned delivery boy)
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: { deliveryAssignments: { where: { deliveryBoy: { userId } } } }
    })
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    if (order.userId !== userId && order.deliveryAssignments.length === 0 && role !== 'admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const messages = await db.chatMessage.findMany({
      where: { orderId },
      orderBy: { createdAt: 'asc' },
    })

    // Mark unread messages from the other person as read
    await db.chatMessage.updateMany({
      where: { orderId, senderId: { not: userId }, read: false },
      data: { read: true },
    })

    return NextResponse.json({ messages, unreadCount: 0 })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
  }
}

// POST /api/chat - save a message
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    if (auth.error) return auth.error
    const { id: userId, role } = auth.user

    const { limited } = rateLimit('chat_send', req, { maxRequests: 30, windowMs: 60_000 })
    if (limited) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

    const { orderId, message } = await req.json()
    const msgOrderId = parseId(orderId)
    if (!msgOrderId) return NextResponse.json({ error: 'Invalid order' }, { status: 400 })
    if (!message || !message.trim()) return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    if (message.length > 2000) return NextResponse.json({ error: 'Message too long (max 2000 chars)' }, { status: 400 })

    // Verify access
    const order = await db.order.findUnique({
      where: { id: msgOrderId },
      include: { deliveryAssignments: { where: { deliveryBoy: { userId } } } }
    })
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    if (order.userId !== userId && order.deliveryAssignments.length === 0 && role !== 'admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const msg = await db.chatMessage.create({
      data: {
        orderId: msgOrderId,
        senderId: userId,
        senderRole: role,
        message: sanitize(message.trim()),
      },
    })

    return NextResponse.json({ success: true, message: msg })
  } catch (e) {
    logError('chat_post', e)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}

// PUT /api/chat - mark messages as read
export async function PUT(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    if (auth.error) return auth.error
    const { id: userId, role } = auth.user

    const { limited } = rateLimit('chat_mark_read', req, { maxRequests: 30, windowMs: 60_000 })
    if (limited) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

    const { orderId } = await req.json()
    const putOrderId = parseId(orderId)
    if (!putOrderId) return NextResponse.json({ error: 'Invalid order ID' }, { status: 400 })

    // === ACCESS CHECK: Verify the user belongs to this order ===
    const order = await db.order.findUnique({
      where: { id: putOrderId },
      include: { deliveryAssignments: { where: { deliveryBoy: { userId } } } }
    })
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    if (order.userId !== userId && order.deliveryAssignments.length === 0 && role !== 'admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    await db.chatMessage.updateMany({
      where: { orderId: putOrderId, senderId: { not: userId }, read: false },
      data: { read: true },
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    logError('chat_mark_read', e)
    return NextResponse.json({ error: 'Failed to mark read' }, { status: 500 })
  }
}
