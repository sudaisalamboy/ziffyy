import { db } from '@/lib/db'
import { compareSync } from 'bcryptjs'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    const user = await db.user.findUnique({
      where: { email },
      include: { shopOwner: true, deliveryBoy: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'No account found with this email' }, { status: 401 })
    }

    const valid = compareSync(password, user.password)
    if (!valid) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
    }

    if (user.role === 'customer' && user.status === 'active') {
      return NextResponse.json({
        user: { id: user.id, name: user.name, email: user.email, role: user.role, mobile: user.mobile, address: user.address, status: user.status, profileImage: user.profileImage }
      })
    }

    if (user.role === 'admin' && user.status === 'active') {
      return NextResponse.json({
        user: { id: user.id, name: user.name, email: user.email, role: user.role, status: user.status }
      })
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

    return NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role, mobile: user.mobile, address: user.address, status: user.status, profileImage: user.profileImage }
    })
  } catch {
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}
