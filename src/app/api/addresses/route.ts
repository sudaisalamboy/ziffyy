import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helper'
import { rateLimit } from '@/lib/rate-limit'
import { sanitize, logError } from '@/lib/sanitize'

export async function GET(req: NextRequest) {
  try {
    const { limited } = rateLimit('addresses_get', req, { maxRequests: 60, windowMs: 60_000 })
    if (limited) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

    const { user, error } = await requireAuth(req)
    if (error) return error
    const userId = user.id

    const addresses = await db.userAddress.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }]
    })
    return NextResponse.json({ addresses })
  } catch (e) {
    logError('addresses', e)
    return NextResponse.json({ error: 'Failed to fetch addresses' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { limited } = rateLimit('addresses_post', req, { maxRequests: 15, windowMs: 60_000 })
    if (limited) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

    const { user, error } = await requireAuth(req)
    if (error) return error
    const userId = user.id

    const data = await req.json()
    if (!data.fullAddress || typeof data.fullAddress !== 'string' || data.fullAddress.trim().length < 5) {
      return NextResponse.json({ error: 'Address must be at least 5 characters' }, { status: 400 })
    }

    const cleanFullAddress = sanitize(data.fullAddress, 500)
    const cleanLandmark = sanitize(data.landmark || '', 200)
    const cleanPincode = typeof data.pincode === 'string' ? data.pincode.replace(/<[^>]*>/g, '').trim().substring(0, 10) : ''
    const cleanCity = sanitize(data.city || '', 100)
    const cleanState = sanitize(data.state || '', 100)

    if (cleanPincode && !/^[\d\-\s]{4,10}$/.test(cleanPincode)) {
      return NextResponse.json({ error: 'Invalid pincode format' }, { status: 400 })
    }

    if (data.isDefault) {
      await db.userAddress.updateMany({ where: { userId, isDefault: true }, data: { isDefault: false } })
    }

    const address = await db.userAddress.create({
      data: {
        userId,
        fullAddress: cleanFullAddress,
        landmark: cleanLandmark,
        pincode: cleanPincode,
        city: cleanCity,
        state: cleanState,
        isDefault: !!data.isDefault
      }
    })

    return NextResponse.json({ address, message: 'Address added' })
  } catch (e) {
    logError('addresses', e)
    return NextResponse.json({ error: 'Failed to add address' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { limited } = rateLimit('addresses_put', req, { maxRequests: 15, windowMs: 60_000 })
    if (limited) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

    const { user, error } = await requireAuth(req)
    if (error) return error
    const userId = user.id

    const data = await req.json()
    if (!data.id) return NextResponse.json({ error: 'Address ID required' }, { status: 400 })

    const addressId = Number(data.id)
    if (!addressId || !Number.isFinite(addressId) || addressId <= 0) {
      return NextResponse.json({ error: 'Invalid address ID' }, { status: 400 })
    }

    // Verify ownership
    const existing = await db.userAddress.findFirst({ where: { id: addressId, userId } })
    if (!existing) return NextResponse.json({ error: 'Address not found' }, { status: 404 })

    if (data.isDefault) {
      await db.userAddress.updateMany({ where: { userId, isDefault: true }, data: { isDefault: false } })
    }

    const address = await db.userAddress.update({
      where: { id: addressId },
      data: {
        fullAddress: data.fullAddress ? sanitize(data.fullAddress, 500) : existing.fullAddress,
        landmark: data.landmark !== undefined ? sanitize(data.landmark, 200) : existing.landmark,
        pincode: data.pincode !== undefined ? (typeof data.pincode === 'string' ? data.pincode.replace(/<[^>]*>/g, '').trim().substring(0, 10) : existing.pincode) : existing.pincode,
        city: data.city !== undefined ? sanitize(data.city, 100) : existing.city,
        state: data.state !== undefined ? sanitize(data.state, 100) : existing.state,
        isDefault: data.isDefault !== undefined ? data.isDefault : existing.isDefault
      }
    })

    return NextResponse.json({ address, message: 'Address updated' })
  } catch (e) {
    logError('addresses', e)
    return NextResponse.json({ error: 'Failed to update address' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { limited } = rateLimit('addresses_delete', req, { maxRequests: 15, windowMs: 60_000 })
    if (limited) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

    const { user, error } = await requireAuth(req)
    if (error) return error
    const userId = user.id

    const { searchParams } = new URL(req.url)
    const addressId = parseInt(searchParams.get('id') || '0')
    if (!addressId || isNaN(addressId) || addressId <= 0) return NextResponse.json({ error: 'Address ID required' }, { status: 400 })

    const existing = await db.userAddress.findFirst({ where: { id: addressId, userId } })
    if (!existing) return NextResponse.json({ error: 'Address not found' }, { status: 404 })

    await db.userAddress.delete({ where: { id: addressId } })

    if (existing.isDefault) {
      const first = await db.userAddress.findFirst({ where: { userId } })
      if (first) await db.userAddress.update({ where: { id: first.id }, data: { isDefault: true } })
    }

    return NextResponse.json({ message: 'Address deleted' })
  } catch (e) {
    logError('addresses', e)
    return NextResponse.json({ error: 'Failed to delete address' }, { status: 500 })
  }
}
