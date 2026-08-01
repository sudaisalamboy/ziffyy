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
  view: string // 'home', 'orders', 'cart', 'needs', 'create_need', 'profile', 'products' (shop), 'add_product' (shop), 'assignments' (delivery), 'offers' (delivery), 'needs_browse' (delivery), 'admin_users', 'admin_products', 'admin_orders', 'admin_payments', 'admin_delivery', 'admin_needs'
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signup: (data: any) => Promise<{ success: boolean; error?: string; message?: string }>
  logout: () => void
  setView: (view: string) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  view: 'home',

  login: async (email: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      const data = await res.json()
      if (res.ok) {
        set({ user: data.user, isAuthenticated: true, view: 'home' })
        return { success: true }
      }
      return { success: false, error: data.error }
    } catch {
      return { success: false, error: 'Network error' }
    }
  },

  signup: async (data: any) => {
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      const result = await res.json()
      if (res.ok) {
        if (result.user) {
          set({ user: result.user, isAuthenticated: true, view: 'home' })
          return { success: true }
        }
        return { success: true, message: result.message }
      }
      return { success: false, error: result.error }
    } catch {
      return { success: false, error: 'Network error' }
    }
  },

  logout: () => set({ user: null, isAuthenticated: false, view: 'home' }),
  setView: (view) => set({ view })
}))
