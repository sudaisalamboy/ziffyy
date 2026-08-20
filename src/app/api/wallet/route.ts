import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth-helper'
import { rateLimit } from '@/lib/rate-limit'
import { VALIDATION, logError, parseAmount } from '@/lib/sanitize'

export async function GET(req: NextRequest) {
  try {
    const { limited } = rateLimit('wallet_get', req, { maxRequests: 60, windowMs: 60_000 })
    if (limited) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

    const { user, error } = await requireRole(req, ['delivery'])
    if (error) return error
    const userId = user.id

    const deliveryBoy = await db.deliveryBoy.findUnique({ where: { userId } })
    if (!deliveryBoy) return NextResponse.json({ error: 'Delivery boy not found' }, { status: 404 })

    const transactions = await db.walletTransaction.findMany({
      where: { deliveryBoyId: deliveryBoy.id },
      orderBy: { createdAt: 'desc' },
      take: 50
    })

    const withdrawals = await db.withdrawal.findMany({
      where: { deliveryBoyId: deliveryBoy.id },
      orderBy: { createdAt: 'desc' },
      take: 20
    })

    return NextResponse.json({
      balance: deliveryBoy.walletBalance,
      transactions,
      withdrawals
    })
  } catch (e) {
    logError('wallet', e)
    return NextResponse.json({ error: 'Failed to fetch wallet' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { limited } = rateLimit('wallet_post', req, { maxRequests: 15, windowMs: 60_000 })
    if (limited) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

    const { user, error } = await requireRole(req, ['delivery'])
    if (error) return error
    const userId = user.id

    const { action, amount, upiId, idempotencyKey } = await req.json()

    if (action !== 'withdraw') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // === IDEMPOTENCY CHECK: prevent duplicate withdrawals from retry ===
    if (idempotencyKey && typeof idempotencyKey === 'string' && idempotencyKey.length <= 128) {
      const existing = await db.withdrawal.findFirst({ where: { idempotencyKey } })
      if (existing) {
        return NextResponse.json({ success: true, message: 'Withdrawal already submitted', withdrawalId: existing.id, status: 'duplicate' })
      }
    }

    const deliveryBoy = await db.deliveryBoy.findUnique({ where: { userId } })
    if (!deliveryBoy) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // === AMOUNT VALIDATION ===
    const withdrawAmount = parseAmount(amount, VALIDATION.MAX_WITHDRAWAL)
    if (withdrawAmount === null) {
      return NextResponse.json({ error: 'Invalid withdrawal amount' }, { status: 400 })
    }
    if (withdrawAmount < VALIDATION.MIN_WITHDRAWAL) {
      return NextResponse.json({ error: `Minimum withdrawal is ₹${VALIDATION.MIN_WITHDRAWAL}` }, { status: 400 })
    }

    // === UPI VALIDATION ===
    if (!upiId || typeof upiId !== 'string' || upiId.trim().length < 3 || upiId.trim().length > 100) {
      return NextResponse.json({ error: 'A valid UPI ID is required' }, { status: 400 })
    }

    const cleanUpi = upiId.trim().replace(/<[^>]*>/g, '')

    // === ATOMIC WALLET DEBIT (prevents TOCTOU double-withdraw) ===
    const debitResult = await db.deliveryBoy.updateMany({
      where: { id: deliveryBoy.id, walletBalance: { gte: withdrawAmount } },
      data: { walletBalance: { decrement: withdrawAmount } }
    })
    if (debitResult.count === 0) {
      return NextResponse.json({ error: 'Insufficient balance. Please try again.' }, { status: 400 })
    }

    await db.withdrawal.create({
      data: {
        deliveryBoyId: deliveryBoy.id,
        amount: withdrawAmount,
        upiId: cleanUpi,
        status: 'pending',
        ...(idempotencyKey ? { idempotencyKey: idempotencyKey.substring(0, 128) } : {}),
      }
    })

    await db.walletTransaction.create({
      data: {
        deliveryBoyId: deliveryBoy.id,
        type: 'withdrawal_request',
        amount: withdrawAmount,
        description: `Withdrawal request to ${cleanUpi}`
      }
    })

    return NextResponse.json({ success: true, message: 'Withdrawal request submitted' })
  } catch (e) {
    logError('wallet', e)
    return NextResponse.json({ error: 'Failed to process withdrawal request' }, { status: 500 })
  }
}
