import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helper'
import { rateLimit } from '@/lib/rate-limit'
import { VALIDATION, logError, parseId } from '@/lib/sanitize'

export async function GET(req: NextRequest) {
  try {
    const { limited } = rateLimit('notifications_get', req, { maxRequests: 60, windowMs: 60_000 })
    if (limited) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

    const { user, error } = await requireAuth(req)
    if (error) return error
    const userId = user.id

    // Pagination support: ?page=2&limit=20 or ?cursor=123 (id-based cursor)
    const { searchParams } = new URL(req.url)
    const cursorParam = searchParams.get('cursor')
    const page = Math.max(1, Number(searchParams.get('page')) || 1)
    const limit = Math.min(Math.max(1, Number(searchParams.get('limit')) || 20), VALIDATION.MAX_PAGE_SIZE)

    const whereClause: Record<string, unknown> = { userId }

    // Cursor-based pagination: fetch records with id < cursor
    if (cursorParam) {
      const cursorId = parseId(cursorParam)
      if (cursorId) {
        // @ts-expect-error Prisma typed where clause
        whereClause.id = { lt: cursorId }
      }
    }

    const notifications = await db.notification.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    const unread = await db.notification.count({ where: { userId, isRead: false } })

    // Return cursor for next page
    const nextCursor = notifications.length === limit ? String(notifications[notifications.length - 1].id) : null

    return NextResponse.json({ notifications, unread, nextCursor, page, limit })
  } catch (e) {
    logError('notifications', e)
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { limited } = rateLimit('notifications_post', req, { maxRequests: 30, windowMs: 60_000 })
    if (limited) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

    const { user, error } = await requireAuth(req)
    if (error) return error
    const userId = user.id

    const { notificationIds } = await req.json()

    // === INPUT VALIDATION ===
    if (!Array.isArray(notificationIds)) {
      return NextResponse.json({ error: 'notificationIds must be an array' }, { status: 400 })
    }
    if (notificationIds.length === 0) {
      return NextResponse.json({ success: true })
    }
    if (notificationIds.length > VALIDATION.MAX_NOTIFICATION_IDS) {
      return NextResponse.json({ error: `Maximum ${VALIDATION.MAX_NOTIFICATION_IDS} IDs per request` }, { status: 400 })
    }

    // Filter to valid positive integers only
    const validIds = notificationIds
      .map((id: number) => Number(id))
      .filter((id: number) => Number.isFinite(id) && id > 0)

    if (validIds.length === 0) {
      return NextResponse.json({ success: true })
    }

    await db.notification.updateMany({
      where: { id: { in: validIds }, userId },
      data: { isRead: true }
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    logError('notifications', e)
    return NextResponse.json({ error: 'Failed to mark notifications as read' }, { status: 500 })
  }
}
