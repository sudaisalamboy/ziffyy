/**
 * Simple in-memory rate limiter for API routes.
 * Uses a sliding window counter per IP (or identifier).
 *
 * LIMITATIONS (in-memory):
 *   - Resets on server restart.
 *   - Each server instance maintains its own counter — actual limit = N × maxRequests.
 *   - For production with multiple instances, migrate to Redis (e.g., ioredis + sliding window).
 *
 * Usage in a route:
 *   import { rateLimit } from '@/lib/rate-limit'
 *   const { limited, retryAfter } = rateLimit('login', req, { maxRequests: 5, windowMs: 60_000 })
 *   if (limited) return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': String(retryAfter) } })
 */

interface Entry {
  count: number
  resetAt: number
}

const store = new Map<string, Entry>()

// Periodically clean expired entries (every 5 min)
if (typeof globalThis !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of store) {
      if (now > entry.resetAt) store.delete(key)
    }
  }, 300_000)
}

export interface RateLimitResult {
  limited: boolean
  retryAfter: number // seconds until the window resets
}

export function rateLimit(
  key: string,
  req: Request,
  opts: { maxRequests: number; windowMs: number } = { maxRequests: 10, windowMs: 60_000 },
): RateLimitResult {
  // Use IP from x-forwarded-for (set by gateway) or fallback to a generic key
  const forwarded = req.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown'
  const bucketKey = `${key}:${ip}`

  const now = Date.now()
  let entry = store.get(bucketKey)

  if (!entry || now > entry.resetAt) {
    // New window
    entry = { count: 1, resetAt: now + opts.windowMs }
    store.set(bucketKey, entry)
    return { limited: false, retryAfter: Math.ceil(opts.windowMs / 1000) }
  }

  entry.count++
  if (entry.count > opts.maxRequests) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000)
    return { limited: true, retryAfter }
  }

  return { limited: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) }
}
