import { db } from '@/lib/db'
import { hashSync } from 'bcryptjs'
import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rate-limit'
import { sanitize, logError } from '@/lib/sanitize'
import { signToken } from '@/lib/jwt'

const ALLOWED_ROLES = ['customer', 'shop', 'delivery']

export async function POST(req: NextRequest) {
  try {
    const { limited, retryAfter } = rateLimit('signup', req, { maxRequests: 5, windowMs: 300_000 })
    if (limited) {
      return NextResponse.json({ error: 'Too many signup attempts. Please try again later.' }, { status: 429, headers: { 'Retry-After': String(retryAfter) } })
    }

    const body = await req.json()
    const { name, email, mobile, password, role, address } = body

    // === INPUT VALIDATION ===
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json({ error: 'Name is required (min 2 characters)' }, { status: 400 })
    }
    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'A valid email is required' }, { status: 400 })
    }
    if (!mobile || typeof mobile !== 'string' || !/^\d{10,15}$/.test(mobile)) {
      return NextResponse.json({ error: 'A valid mobile number (10-15 digits) is required' }, { status: 400 })
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    // === ROLE VALIDATION (prevent privilege escalation) ===
    if (!role || !ALLOWED_ROLES.includes(role.toLowerCase())) {
      return NextResponse.json({ error: 'Invalid role specified' }, { status: 400 })
    }
    const safeRole = role.toLowerCase()

    const cleanName = sanitize(name)
    const cleanAddress = address ? sanitize(String(address)) : ''

    const existing = await db.user.findFirst({ where: { OR: [{ email: email.toLowerCase().trim() }, { mobile }] } })
    if (existing) {
      return NextResponse.json({ error: 'User already exists with this email or mobile' }, { status: 400 })
    }

    const hashed = hashSync(password, 10)

    // Server controls status — never from client
    const status = safeRole === 'customer' ? 'active' : 'pending'

    const user = await db.user.create({
      data: { name: cleanName, email: email.toLowerCase().trim(), mobile, password: hashed, role: safeRole, address: cleanAddress, status }
    })

    // Non-customer roles: NO token issued, must wait for admin approval
    if (safeRole === 'delivery') {
      await db.deliveryBoy.create({
        data: { userId: user.id, address: cleanAddress || '', status: 'pending' }
      })
      return NextResponse.json({ message: 'Delivery boy registration successful! Please wait for admin approval.', role: 'delivery' })
    }

    if (safeRole === 'shop') {
      await db.shopOwner.create({
        data: { userId: user.id, shopName: `${cleanName}'s Grocery`, shopAddress: cleanAddress || '', status: 'pending' }
      })
      return NextResponse.json({ message: 'Shop owner registration successful! Please wait for admin approval.', role: 'shop' })
    }

    // Customer only: auto-login with token
    const userData = { id: user.id, name: user.name, email: user.email, role: user.role, mobile: user.mobile, address: user.address, status: user.status, profileImage: user.profileImage }
    const token = await signToken(userData)

    return NextResponse.json({ user: userData, token })
  } catch (e) {
    logError('signup', e)
    return NextResponse.json({ error: 'Signup failed' }, { status: 500 })
  }
}
