import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt'
import { rateLimit } from '@/lib/rate-limit'
import { logError } from '@/lib/sanitize'

export async function POST(req: NextRequest) {
  try {
    const { limited } = rateLimit('auth_verify', req, { maxRequests: 30, windowMs: 60_000 })
    if (limited) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

    const { token } = await req.json()
    if (!token) return NextResponse.json({ error: 'No token' }, { status: 401 })

    // === TOKEN LENGTH VALIDATION (prevent oversized token DoS) ===
    if (typeof token !== 'string' || token.length > 2000) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload) return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })

    return NextResponse.json({
      user: {
        id: payload.id,
        name: payload.name,
        email: payload.email,
        role: payload.role,
        mobile: payload.mobile || '',
        address: payload.address || '',
        profileImage: payload.profileImage || '',
        status: payload.status || 'active'
      }
    })
  } catch (e) {
    logError('auth_verify', e)
    return NextResponse.json({ error: 'Token verification failed' }, { status: 401 })
  }
}
