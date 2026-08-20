export function authHeaders(token: string): Record<string, string> {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
}

/**
 * Typed fetch wrapper for API calls from dashboards.
 * Returns parsed JSON or throws.
 */
export async function apiFetch<T = any>(url: string, token: string, init?: RequestInit): Promise<T> {
  const resp = await fetch(url, {
    ...init,
    headers: { ...authHeaders(token), ...(init?.headers || {}) },
  })
  const data = await resp.json()
  return data as T
}
