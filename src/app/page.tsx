'use client'

import { useAuthStore } from '@/store/auth'
import { AuthPage } from '@/components/auth-page'
import { CustomerDashboard } from '@/components/dashboards/customer-dashboard'
import { ShopDashboard } from '@/components/dashboards/shop-dashboard'
import { DeliveryDashboard } from '@/components/dashboards/delivery-dashboard'
import { AdminDashboard } from '@/components/dashboards/admin-dashboard'

export default function Home() {
  const { user, isAuthenticated } = useAuthStore()

  if (!isAuthenticated || !user) return <AuthPage />

  if (user.role === 'customer') return <CustomerDashboard />
  if (user.role === 'shop') return <ShopDashboard />
  if (user.role === 'delivery') return <DeliveryDashboard />
  if (user.role === 'admin') return <AdminDashboard />

  return <AuthPage />
}