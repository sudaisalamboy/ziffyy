import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const userId = parseInt(req.headers.get('x-user-id') || '0')
    const data = await req.json()
    const action = data.action

    if (action === 'comment') {
      const comment = await db.needComment.create({
        data: { needId: parseInt(id), userId, comment: data.comment }
      })
      return NextResponse.json({ comment })
    }

    if (action === 'offer') {
      const need = await db.need.findUnique({ where: { id: parseInt(id) } })
      if (!need) return NextResponse.json({ error: 'Need not found' }, { status: 404 })
      const offer = await db.offer.create({
        data: {
          needId: parseInt(id),
          customerId: need.userId,
          deliveryBoyId: userId,
          offerAmount: parseFloat(data.offerAmount),
          message: data.message || ''
        }
      })
      return NextResponse.json({ offer })
    }

    if (action === 'respond_offer') {
      await db.offer.update({
        where: { id: data.offerId },
        data: { status: data.status, respondedAt: new Date() }
      })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}