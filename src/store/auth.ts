import { create } from 'zustand'

interface User {
  id: number
  name: string
  email: string
  role: string
  mobile?: string
  address?: string
  status?: string
  profileImage?: string
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  token: string | null
  view: string
  _hydrated: boolean
  login: (email: string, password: string, remember: boolean) => Promise<{ success: boolean; error?: string }>
  signup: (data: Record<string, unknown>) => Promise<{ success: boolean; error?: string; message?: string }>
  logout: () => void
  setView: (view: string) => void
  hydrate: () => Promise<void>
}

function lsGet(k: string) { return typeof window !== 'undefined' ? localStorage.getItem(k) : null }
function lsSet(k: string, v: string) { if (typeof window !== 'undefined') localStorage.setItem(k, v) }
function lsRm(...keys: string[]) { if (typeof window === 'undefined') return; keys.forEach(k => localStorage.removeItem(k)) }

function defaultView(role: string) {
  if (role === 'customer') return 'home'
  if (role === 'shop') return 'products'
  if (role === 'delivery') return 'assignments'
  return 'home'
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  token: null,
  view: 'home',
  _hydrated: false,

  hydrate: async () => {
    const token = lsGet('freshkart_token')
    if (!token) { set({ _hydrated: true }); return }

    let savedView = lsGet('freshkart_view')

    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      })
      if (res.ok) {
        const data = await res.json()
        lsSet('freshkart_user', JSON.stringify(data.user))
        if (!savedView && data.user) savedView = defaultView(data.user.role)
        if (savedView) lsSet('freshkart_view', savedView)
        set({ user: data.user, isAuthenticated: true, token, view: savedView || defaultView(data.user.role) })
      } else {
        // Token invalid — clear stale data, don't flash wrong dashboard
        lsRm('freshkart_token', 'freshkart_user', 'freshkart_view')
        set({ user: null, isAuthenticated: false, token: null, view: 'home' })
      }
    } catch {
      // Network error — try loading from cache as fallback
      try {
        const cachedUser = lsGet('freshkart_user')
        if (cachedUser) {
          const parsed = JSON.parse(cachedUser) as User
          set({ user: parsed, isAuthenticated: true, token, view: savedView || defaultView(parsed.role) })
        }
      } catch {}
    } finally {
      set({ _hydrated: true })
    }
  },

  login: async (email: string, password: string, remember: boolean = false) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      const data = await res.json()
      if (res.ok) {
        if (remember) {
          lsSet('freshkart_token', data.token)
          lsSet('freshkart_user', JSON.stringify(data.user))
          lsSet('freshkart_view', defaultView(data.user.role))
        } else {
          lsRm('freshkart_token', 'freshkart_user', 'freshkart_view')
        }
        set({ user: data.user, isAuthenticated: true, token: data.token, view: defaultView(data.user.role) })
        return { success: true }
      }
      return { success: false, error: data.error }
    } catch {
      return { success: false, error: 'Network error' }
    }
  },

  signup: async (data: Record<string, unknown>) => {
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      const result = await res.json()
      if (res.ok) {
        if (result.user && result.token) {
          if (data.remember) {
            lsSet('freshkart_token', result.token)
            lsSet('freshkart_user', JSON.stringify(result.user))
            lsSet('freshkart_view', defaultView(result.user.role))
          }
          set({ user: result.user, isAuthenticated: true, token: result.token, view: defaultView(result.user.role) })
          return { success: true }
        }
        return { success: true, message: result.message }
      }
      return { success: false, error: result.error }
    } catch {
      return { success: false, error: 'Network error' }
    }
  },

  logout: () => {
    // Invalidate token server-side so it can't be reused
    const token = get().token
    if (token) {
      fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      }).catch(() => {})
    }
    lsRm('freshkart_token', 'freshkart_user', 'freshkart_view')
    set({ user: null, isAuthenticated: false, token: null, view: 'home' })
  },

  setView: (view) => {
    if (lsGet('freshkart_token')) lsSet('freshkart_view', view)
    set({ view })
  },

}))
