import { db } from '@/lib/db'
import { hashSync } from 'bcryptjs'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { name, email, mobile, password, role, address } = await req.json()

    const existing = await db.user.findFirst({ where: { OR: [{ email }, { mobile }] } })
    if (existing) {
      return NextResponse.json({ error: 'User already exists with this email or mobile' }, { status: 400 })
    }

    const hashed = hashSync(password, 10)
    const status = role === 'customer' ? 'active' : 'pending'

    const user = await db.user.create({
      data: { name, email, mobile, password: hashed, role, address, status }
    })

    if (role === 'delivery') {
      await db.deliveryBoy.create({
        data: { userId: user.id, address: address || '', status: 'pending' }
      })
      return NextResponse.json({ message: 'Delivery boy registration successful! Please wait for admin approval.', role: 'delivery' })
    }

    if (role === 'shop') {
      await db.shopOwner.create({
        data: { userId: user.id, shopName: name + "'s Shop", shopAddress: address || '', status: 'pending' }
      })
      return NextResponse.json({ message: 'Shop owner registration successful! Please wait for admin approval.', role: 'shop' })
    }

    return NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role, mobile: user.mobile, address: user.address, status: user.status }
    })
  } catch (e) {
    return NextResponse.json({ error: 'Signup failed' }, { status: 500 })
  }
}
