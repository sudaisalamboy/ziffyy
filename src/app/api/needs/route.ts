import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helper'
import { rateLimit } from '@/lib/rate-limit'
import { sanitize, VALIDATION, logError } from '@/lib/sanitize'

// GET: List custom needs (auth required)
export async function GET(req: NextRequest) {
  try {
    const { limited } = rateLimit('needs_get', req, { maxRequests: 60, windowMs: 60_000 })
    if (limited) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

    const auth = await requireAuth(req)
    if (auth.error) return auth.error
    const user = auth.user

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')

    const whereClause: any = {}
    if (status) whereClause.status = status

    // Role-based filtering
    if (user.role === 'customer') {
      whereClause.userId = user.id
    } else if (user.role === 'delivery') {
      // Delivery boys see all active needs to browse and offer
      if (!status) whereClause.status = 'active'
    }
    // admin sees all

    const needs = await db.need.findMany({
      where: whereClause,
      include: {
        user: { select: { id: true, name: true, mobile: true, address: true } },
        offers: {
          include: { deliveryBoy: { include: { user: { select: { name: true, mobile: true } } } } },
          orderBy: { createdAt: 'desc' }
        },
        comments: {
          include: { user: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: VALIDATION.DEFAULT_PAGE_SIZE
    })

    return NextResponse.json({ needs })
  } catch (e) {
    logError('needs', e)
    return NextResponse.json({ error: 'Failed to fetch needs' }, { status: 500 })
  }
}

// POST: Create a new need
export async function POST(req: NextRequest) {
  try {
    const { limited } = rateLimit('needs_post', req, { maxRequests: 15, windowMs: 60_000 })
    if (limited) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

    const auth = await requireAuth(req)
    if (auth.error) return auth.error
    const user = auth.user

    const body = await req.json()
    const { title, description, budget, minPrice, maxPrice, priceType, image } = body

    if (!title || !description) {
      return NextResponse.json({ error: 'Title and description are required' }, { status: 400 })
    }

    const cleanTitle = sanitize(title)
    const cleanDesc = sanitize(description)
    const cleanPriceType = ['fixed', 'range', 'unknown'].includes(priceType) ? priceType : 'unknown'

    // === BUDGET VALIDATION ===
    let cleanExactPrice: number | null = null
    let cleanMinPrice: number | null = null
    let cleanMaxPrice: number | null = null

    if (cleanPriceType === 'fixed' || (budget !== undefined && budget !== null)) {
      const budgetNum = Number(budget || 0)
      if (!Number.isFinite(budgetNum) || budgetNum <= 0 || budgetNum > 999999) {
        return NextResponse.json({ error: 'Budget must be between ₹1 and ₹9,99,999' }, { status: 400 })
      }
      cleanExactPrice = budgetNum
    }

    if (cleanPriceType === 'range') {
      if (minPrice !== undefined && maxPrice !== undefined) {
        const min = Number(minPrice)
        const max = Number(maxPrice)
        if (!Number.isFinite(min) || !Number.isFinite(max) || min <= 0 || max <= 0 || min > 999999 || max > 999999) {
          return NextResponse.json({ error: 'Price range must be between ₹1 and ₹9,99,999' }, { status: 400 })
        }
        if (min > max) {
          return NextResponse.json({ error: 'Minimum price cannot exceed maximum price' }, { status: 400 })
        }
        cleanMinPrice = min
        cleanMaxPrice = max
      }
    }

    const need = await db.need.create({
      data: {
        userId: user.id,
        title: cleanTitle,
        description: cleanDesc,
        exactPrice: cleanExactPrice,
        minPrice: cleanMinPrice,
        maxPrice: cleanMaxPrice,
        priceType: cleanPriceType,
        image: sanitize(image || ''),
        status: 'active'
      }
    })

    return NextResponse.json({ need, message: 'Need created successfully' }, { status: 201 })
  } catch (e) {
    logError('needs', e)
    return NextResponse.json({ error: 'Failed to create need' }, { status: 500 })
  }
}
