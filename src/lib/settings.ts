import { db } from '@/lib/db'
import { VALIDATION } from '@/lib/sanitize'

/**
 * Get a numeric setting from the Settings table.
 * Returns the fallback value if the setting is missing, invalid, or the DB call fails.
 * Centralized to avoid duplication across orders/shop/delivery routes.
 */
export async function getFinancialSetting(key: string, fallback: number): Promise<number> {
  try {
    const s = await db.settings.findUnique({ where: { settingKey: key } })
    const val = Number(s?.settingValue)
    return Number.isFinite(val) && val > 0 ? val : fallback
  } catch {
    return fallback
  }
}

/** Pre-defined setting keys with their fallback values */
export const SETTING_DEFAULTS = {
  delivery_fee: VALIDATION.DELIVERY_FEE,
  delivery_earning_per_order: VALIDATION.DELIVERY_EARNING_PER_ORDER,
  platform_fee_per_order: VALIDATION.PLATFORM_FEE_PER_ORDER,
  free_delivery_threshold: VALIDATION.FREE_DELIVERY_THRESHOLD,
} as const

/**
 * Batch-fetch multiple financial settings in one query.
 * Returns a record of key → value, using SETTING_DEFAULTS as fallbacks.
 */
export async function getFinancialSettings(): Promise<Record<string, number>> {
  const keys = Object.keys(SETTING_DEFAULTS)
  try {
    const rows = await db.settings.findMany({ where: { settingKey: { in: keys } } })
    const map: Record<string, number> = { ...SETTING_DEFAULTS }
    for (const row of rows) {
      const val = Number(row.settingValue)
      if (Number.isFinite(val) && val > 0 && row.settingKey in map) {
        map[row.settingKey] = val
      }
    }
    return map
  } catch {
    return { ...SETTING_DEFAULTS }
  }
}
