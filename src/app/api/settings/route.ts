import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helper'
import { rateLimit } from '@/lib/rate-limit'
import { logError, sanitize, parseAmount } from '@/lib/sanitize'

export async function GET(req: NextRequest) {
  try {
    const { limited } = rateLimit('settings_get', req, { maxRequests: 60, windowMs: 60_000 })
    if (limited) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

    const { user, error } = await requireAdmin(req)
    if (error) return error

    const settings = await db.settings.findMany()
    const map: Record<string, string> = {}
    settings.forEach((s: any) => { map[s.settingKey] = s.settingValue })
    return NextResponse.json({ settings: map })
  } catch (e) {
    logError('settings', e)
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { limited } = rateLimit('settings_put', req, { maxRequests: 20, windowMs: 60_000 })
    if (limited) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

    const { user, error } = await requireAdmin(req)
    if (error) return error

    const { key, value } = await req.json()

    const ALLOWED_KEYS = ['payment_qr_data', 'delivery_fee', 'delivery_earning_per_order', 'platform_fee_per_order', 'upi_id', 'free_delivery_threshold']
    if (!key || !ALLOWED_KEYS.includes(key)) {
      return NextResponse.json({ error: 'Invalid setting key' }, { status: 400 })
    }

    const cleanValue = sanitize(String(value || ''), 500)

    await db.settings.upsert({
      where: { settingKey: key },
      update: { settingValue: cleanValue },
      create: { settingKey: key, settingValue: cleanValue },
    })

    return NextResponse.json({ success: true, message: 'Setting saved' })
  } catch (e) {
    logError('settings_put', e)
    return NextResponse.json({ error: 'Failed to save setting' }, { status: 500 })
  }
}
