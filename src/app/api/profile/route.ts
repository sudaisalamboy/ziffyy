import { db } from '@/lib/db'
import { hashSync } from 'bcryptjs'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helper'
import { invalidateToken, extractToken } from '@/lib/jwt'
import { rateLimit } from '@/lib/rate-limit'
import { sanitize, logError } from '@/lib/sanitize'

export async function GET(req: NextRequest) {
  try {
    const { limited } = rateLimit('profile_get', req, { maxRequests: 60, windowMs: 60_000 })
    if (limited) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

    const { user, error } = await requireAuth(req)
    if (error) return error
    const userId = user.id

    const user_record = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, mobile: true, address: true, profileImage: true, role: true, status: true, createdAt: true, updatedAt: true }
    })

    if (!user_record) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const addresses = await db.userAddress.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }]
    })

    const orderStats = await db.order.aggregate({
      where: { userId },
      _count: true,
      _sum: { totalAmount: true }
    })

    const needCount = await db.need.count({ where: { userId } })

    return NextResponse.json({ user: user_record, addresses, stats: { totalOrders: orderStats._count, totalSpent: orderStats._sum.totalAmount || 0, totalNeeds: needCount } })
  } catch (e) {
    logError('profile', e)
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { limited } = rateLimit('profile_put', req, { maxRequests: 15, windowMs: 60_000 })
    if (limited) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

    const { user, error } = await requireAuth(req)
    if (error) return error
    const userId = user.id

    const data = await req.json()

    if (data.action === 'change_password') {
      const user_record = await db.user.findUnique({ where: { id: userId }, select: { password: true } })
      if (!user_record) return NextResponse.json({ error: 'User not found' }, { status: 404 })

      const { compareSync } = await import('bcryptjs')
      if (!compareSync(data.currentPassword, user_record.password)) {
        return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
      }
      if (!data.newPassword || typeof data.newPassword !== 'string' || data.newPassword.length < 6) {
        return NextResponse.json({ error: 'New password must be at least 6 characters' }, { status: 400 })
      }
      if (data.newPassword.length > 128) {
        return NextResponse.json({ error: 'Password is too long' }, { status: 400 })
      }

      await db.user.update({
        where: { id: userId },
        data: { password: hashSync(data.newPassword, 10) }
      })

      // === JWT INVALIDATION: Force re-login after password change ===
      const token = extractToken(req)
      if (token) {
        invalidateToken(token)
      }

      return NextResponse.json({ message: 'Password updated successfully. Please login again.' })
    }

    // === PROFILE UPDATE WITH SANITIZATION ===
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
    if (data.address !== undefined) {
      updateData.address = sanitize(String(data.address))
    }
    if (data.profileImage !== undefined) {
      updateData.profileImage = sanitize(data.profileImage, 500)
    }

    const updated = await db.user.update({
      where: { id: userId },
      data: updateData,
      select: { id: true, name: true, email: true, mobile: true, address: true, profileImage: true, role: true, status: true }
    })

    return NextResponse.json({ user: updated, message: 'Profile updated successfully' })
  } catch (e) {
    logError('profile', e)
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }
}
