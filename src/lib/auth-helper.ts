import { verifyToken } from './jwt'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Safe User fields to expose in API responses.
 * NEVER include password, email, mobile, address, updatedAt.
 */
export const safeUserSelect = {
  id: true,
  name: true,
  role: true,
  status: true,
  profileImage: true,
  createdAt: true,
}

/**
 * Safe ShopOwner fields to expose alongside products / orders.
 */
export const safeShopOwnerSelect = {
  id: true,
  userId: true,
  shopName: true,
  shopAddress: true,
  shopImage: true,
  status: true,
}

/**
 * Safe DeliveryBoy fields to expose (no PII from related User).
 */
export const safeDeliveryBoySelect = {
  id: true,
  userId: true,
  vehicleType: true,
  vehicleNumber: true,
  status: true,
  totalDeliveries: true,
  rating: true,
  walletBalance: true,
}

export type AuthPayload = {
  id: number
  email: string
  role: string
  name: string
  mobile?: string
  address?: string
  profileImage?: string
  status?: string
} | null

/**
 * Extract and verify the JWT from the `Authorization: Bearer <token>` header.
 * Returns the decoded payload, or null if missing / invalid.
 */
export async function getAuthUser(req: NextRequest): Promise<AuthPayload> {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.slice(7).trim()
  if (!token) return null
  try {
    const payload = await verifyToken(token)
    return payload as AuthPayload
  } catch {
    return null
  }
}

type AuthResult =
  | { user: NonNullable<AuthPayload>; error: null }
  | { user: null; error: NextResponse }

/**
 * Require a valid authenticated user.
 * Usage:
 *   const { user, error } = requireAuth(req)
 *   if (error) return error
 */
export async function requireAuth(req: NextRequest): Promise<AuthResult> {
  const user = await getAuthUser(req)
  if (!user) {
    return {
      user: null,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }
  return { user, error: null }
}

/**
 * Require an authenticated admin (role === 'admin').
 * Returns 401 if no/invalid token, 403 if not admin.
 */
export async function requireAdmin(req: NextRequest): Promise<AuthResult> {
  const { user, error } = await requireAuth(req)
  if (error) return { user: null, error }
  if (user.role !== 'admin') {
    return {
      user: null,
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    }
  }
  return { user, error: null }
}

/**
 * Require an authenticated user with one of the given roles.
 * Returns 401 if no/invalid token, 403 if role not allowed.
 */
export async function requireRole(
  req: NextRequest,
  roles: string[],
): Promise<AuthResult> {
  const { user, error } = await requireAuth(req)
  if (error) return { user: null, error }
  if (!roles.includes(user.role)) {
    return {
      user: null,
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    }
  }
  return { user, error: null }
}
