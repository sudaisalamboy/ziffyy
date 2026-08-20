'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/store/auth'
import { AuthPage } from '@/components/auth-page'
import { CustomerDashboard } from '@/components/dashboards/customer-dashboard'
import { ShopDashboard } from '@/components/dashboards/shop-dashboard'
import { DeliveryDashboard } from '@/components/dashboards/delivery-dashboard'
import { AdminDashboard } from '@/components/dashboards/admin-dashboard'

export default function Home() {
  const { user, isAuthenticated, hydrate } = useAuthStore()

  useEffect(() => { hydrate() }, [hydrate])

  if (!isAuthenticated || !user) return <AuthPage />

  return (
    <>
      {user.role === 'customer' && <CustomerDashboard />}
      {user.role === 'shop' && <ShopDashboard />}
      {user.role === 'delivery' && <DeliveryDashboard />}
      {user.role === 'admin' && <AdminDashboard />}
      {!['customer', 'shop', 'delivery', 'admin'].includes(user.role) && <AuthPage />}
    </>
  )
}
