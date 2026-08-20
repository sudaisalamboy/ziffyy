export function sanitize(str: unknown, maxLen = 500): string {
  if (typeof str !== 'string') return ''
  return str.replace(/<[^>]*>/g, '').trim().substring(0, maxLen)
}

/**
 * Parse a value as a positive integer ID.
 * Returns 0 (invalid) which callers should reject.
 */
export function parseId(val: unknown): number {
  const n = Number(val)
  return Number.isFinite(n) && n > 0 ? n : 0
}

/**
 * Validate a monetary amount (positive, finite, within max).
 * Returns the number or null if invalid.
 */
export function parseAmount(val: unknown, max = 999999): number | null {
  const n = Number(val)
  if (!Number.isFinite(n) || n <= 0 || n > max) return null
  return roundMoney(n)
}

/**
 * Round a number to 2 decimal places for money.
 * Prevents floating-point accumulation errors (e.g. 0.1 + 0.2 = 0.30000000004).
 * Apply at every money boundary: storage, calculation, display.
 */
export function roundMoney(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

// ==================== CONSTANTS ====================

export const ROLES = {
  CUSTOMER: 'customer',
  SHOP: 'shop',
  DELIVERY: 'delivery',
  ADMIN: 'admin',
} as const

export const USER_STATUSES = {
  ACTIVE: 'active',
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  SUSPENDED: 'suspended',
} as const

export const ORDER_STATUSES = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PROCESSING: 'processing',
  OUT_FOR_DELIVERY: 'out_for_delivery',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  FAILED: 'failed',
} as const

export const DELIVERY_STATUSES = {
  ASSIGNED: 'assigned',
  PICKED_UP: 'picked_up',
  IN_TRANSIT: 'in_transit',
  DELIVERED: 'delivered',
  FAILED: 'failed',
} as const

export const PAYMENT_METHODS = ['cod', 'online'] as const

export const PAYMENT_STATUSES = {
  PENDING: 'pending',
  PENDING_VERIFICATION: 'pending_verification',
  COMPLETED: 'completed',
  REJECTED: 'rejected',
  PAID: 'paid',
} as const

export const VALIDATION = {
  MAX_ITEMS_PER_ORDER: 50,
  MAX_CART_QUANTITY: 100,
  MAX_NOTIFICATION_IDS: 100,
  MAX_PRICE: 99_999_999,
  MAX_STOCK: 999_999,
  MAX_WITHDRAWAL: 999_999,
  MIN_WITHDRAWAL: 50,
  FREE_DELIVERY_THRESHOLD: 500,
  DELIVERY_FEE: 30,
  DELIVERY_EARNING_PER_ORDER: 30,
  PLATFORM_FEE_PER_ORDER: 10,
  DEFAULT_PAGE_SIZE: 50,
  MAX_PAGE_SIZE: 200,
} as const

/**
 * Structured logger — only logs details in development.
 * In production, logs minimal safe info.
 */
export function logError(context: string, error: unknown): void {
  if (process.env.NODE_ENV === 'development') {
    console.error(`[${context}]`, error)
  } else {
    console.error(`[${context}] Request failed`)
  }
}
