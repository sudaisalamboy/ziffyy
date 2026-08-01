import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const role = req.headers.get('x-user-role')
    const userId = parseInt(req.headers.get('x-user-id') || '0')
    const status = new URL(req.url).searchParams.get('status') || ''

    const where: any = {}
    if (role === 'customer') where.userId = userId
    if (status) where.status = status

    const needs = await db.need.findMany({
      where,
      include: {
        user: true,
        comments: { include: { user: true }, orderBy: { createdAt: 'asc' } },
        offers: { include: { deliveryBoy: { include: { user: true } } }, orderBy: { createdAt: 'desc' } }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ needs })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch needs' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = parseInt(req.headers.get('x-user-id') || '0')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const data = await req.json()
    const need = await db.need.create({
      data: {
        userId,
        title: data.title,
        description: data.description || '',
        priceType: data.priceType || 'unknown',
        exactPrice: data.exactPrice ? parseFloat(data.exactPrice) : null,
        minPrice: data.minPrice ? parseFloat(data.minPrice) : null,
        maxPrice: data.maxPrice ? parseFloat(data.maxPrice) : null,
        urgency: data.urgency || '1-2 days',
        status: 'active'
      }
    })

    return NextResponse.json({ need })
  } catch {
    return NextResponse.json({ error: 'Failed to create need' }, { status: 500 })
  }
}
