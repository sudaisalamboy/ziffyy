import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helper'
import { extractToken, invalidateToken } from '@/lib/jwt'

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    if (auth.error) return auth.error

    const token = extractToken(req)
    if (token) {
      invalidateToken(token)
    }

    return NextResponse.json({ message: 'Logged out' })
  } catch {
    return NextResponse.json({ error: 'Logout failed' }, { status: 500 })
  }
}
