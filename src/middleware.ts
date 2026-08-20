import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * CORS / preflight middleware.
 *
 * SECURITY: This app sits behind the Caddy gateway which proxies /api/* to the
 * Next.js server. From the browser's perspective all requests are same-origin,
 * so the browser does NOT enforce CORS preflight for them. We therefore MUST NOT
 * reflect the incoming `Origin` header back in `Access-Control-Allow-Origin`,
 * and we do NOT set `Access-Control-Allow-Origin` to `*` either (which would
 * allow any cross-origin site to call our APIs with credentials).
 *
 * We only handle OPTIONS preflight with the allowed methods/headers, and let
 * same-origin browser policy do the rest.
 */
export function middleware(request: NextRequest) {
  // Handle OPTIONS preflight short-circuit
  if (request.method === 'OPTIONS') {
    const preflightHeaders = new Headers({
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers':
        'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
      // Intentionally NO Access-Control-Allow-Origin set.
      // Intentionally NO Access-Control-Allow-Credentials set.
    })
    return new NextResponse(null, { status: 204, headers: preflightHeaders })
  }

  // For non-preflight requests, just continue. We do not add any CORS headers
  // because they are unnecessary behind the same-origin gateway proxy and
  // only add attack surface.
  return NextResponse.next()
}

export const config = {
  // Only run on API routes (where preflight could happen).
  matcher: '/api/:path*',
}
