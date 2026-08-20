import { SignJWT, jwtVerify } from 'jose'
import { createHash } from 'crypto'
import { NextRequest } from 'next/server'

// JWT_SECRET is required — throw immediately on module load if missing/too short
const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error('[FATAL] JWT_SECRET env var is required and must be at least 32 characters. Set it in .env')
}
const SECRET = new TextEncoder().encode(JWT_SECRET)

// In-memory token blacklist — for production with multiple instances, migrate to Redis.
// LIMITATIONS: Resets on server restart; each instance has its own blacklist.
const tokenBlacklist = new Map<string, number>()

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

if (typeof globalThis !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    const keysToDelete: string[] = []
    for (const [key, expiry] of tokenBlacklist) {
      if (expiry <= now) keysToDelete.push(key)
    }
    for (const key of keysToDelete) tokenBlacklist.delete(key)
  }, 300_000)
}

export function invalidateToken(token: string): void {
  tokenBlacklist.set(hashToken(token), Date.now() + 7 * 24 * 60 * 60 * 1000)
}

export function extractToken(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null
  return authHeader.slice(7).trim() || null
}

export async function signToken(payload: { id: number; email: string; role: string; name: string; mobile?: string | null; address?: string | null; profileImage?: string | null; status?: string | null }) {
  return new SignJWT(payload as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(SECRET)
}

export async function verifyToken(token: string) {
  try {
    const hash = hashToken(token)
    if (tokenBlacklist.has(hash)) return null
    const { payload } = await jwtVerify(token, SECRET)
    return payload
  } catch {
    return null
  }
}
