import { db } from '@/lib/db'
import { compareSync } from 'bcryptjs'
import { NextRequest, NextResponse } from 'next/server'
import { signToken } from '@/lib/jwt'
import { rateLimit } from '@/lib/rate-limit'

// Valid bcrypt hash for a dummy password — always runs compareSync to prevent timing attacks
const DUMMY_HASH = '$2b$10$YYIGiTDW737/O8vRaFYyTuvFyYMvutnteeTqJ4Hs7GalCFv9HLDkG'

export async function POST(req: NextRequest) {
  try {
    const { limited, retryAfter } = rateLimit('login', req, { maxRequests: 10, windowMs: 60_000 })
    if (limited) {
      return NextResponse.json({ error: 'Too many login attempts. Please try again later.' }, { status: 429, headers: { 'Retry-After': String(retryAfter) } })
    }

    const { email, password } = await req.json()

    const user = await db.user.findUnique({
      where: { email },
      include: { shopOwner: true, deliveryBoy: true }
    })

    // Always run bcrypt (dummy hash for nonexistent users) to prevent timing attacks
    const valid = user ? compareSync(password, user.password) : compareSync(password, DUMMY_HASH)
    if (!user || !valid) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    if (user.status === 'pending') {
      return NextResponse.json({ error: 'Your account is under review. Please wait for admin approval.' }, { status: 403 })
    }
    if (user.status === 'rejected') {
      return NextResponse.json({ error: 'Your account has been rejected. Please contact admin.' }, { status: 403 })
    }
    if (user.status === 'suspended') {
      return NextResponse.json({ error: 'Your account has been suspended.' }, { status: 403 })
    }

    const userData = { id: user.id, name: user.name, email: user.email, role: user.role, mobile: user.mobile, address: user.address, status: user.status, profileImage: user.profileImage }
    const token = await signToken(userData)

    return NextResponse.json({ user: userData, token })
  } catch {
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}
