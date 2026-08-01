'client'

import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '@/store/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Package, PlusCircle, ShoppingCart, TrendingUp, LogOut, User, Bell, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'

const headers = { 'Content-Type': 'application/json' }
function authHeaders(user: any) { return { ...headers, 'x-user-id': String(user.id), 'x-user-role': user.role } }

export function ShopDashboard() {
  const { user, view, setView, logout } = useAuthStore()
  const [products, setProducts] = useState<any[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [notifications, setNotifications] = useState<any[]>([])
  const [showAddProduct, setShowAddProduct] = useState(false)

  const loadProducts = useCallback(async () => {
    const res = await fetch(`/api/products?shopId=${user?.id}&status=all`, { headers: authHeaders(user) })
    const d = await res.json()
    setProducts(d.products || [])
  }, [user])

  const loadOrders = useCallback(async () => {
    const res = await fetch('/api/orders', { headers: authHeaders(user) })
    const d = await res.json()
    setOrders(d.orders || [])
  }, [user])

  const loadNotifs = useCallback(async () => {
    const res = await fetch('/api/notifications', { headers: authHeaders(user) })
    const d = await res.json()
    setNotifications(d.notifications || [])
  }, [user])

  useEffect(() => { if (view === 'products') loadProducts() }, [view, loadProducts])
  useEffect(() => { if (view === 'orders') loadOrders() }, [view, loadOrders])
  useEffect(() => { if (user) loadNotifs() }, [user, loadNotifs])

  const addProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const res = await fetch('/api/products', {
      method: 'POST', headers: authHeaders(user),
      body: JSON.stringify({
        title: fd.get('title'), description: fd.get('description'),
        price: fd.get('price'), stock: fd.get('stock'), category: fd.get('category')
      })
    })
    if (res.ok) { toast.success('Product added! Pending admin approval.'); setShowAddProduct(false); loadProducts() }
    else toast.error('Failed to add product')
  }

  const statusColor = (s: string) => {
    const m: any = { pending: 'bg-amber-100 text-amber-700', approved: 'bg-emerald-100 text-emerald-700', rejected: 'bg-red-100 text-red-700' }
    return m[s] || 'bg-gray-100 text-gray-700'
  }

  const pendingProducts = products.filter((p: any) => p.status === 'pending').length
  const approvedProducts = products.filter((p: any) => p.status === 'approved').length

  const navItems = [
    { id: 'products', label: 'Products', icon: Package },
    { id: 'orders', label: 'Orders', icon: ShoppingCart },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center"><Package className="w-5 h-5 text-white" /></div>
            <div><span className="font-bold text-lg">Shop Panel</span><p className="text-xs text-gray-500">{user?.name}</p></div>
          </div>
          <button onClick={logout} className="p-2 hover:bg-red-50 rounded-full text-red-500"><LogOut className="w-5 h-5" /></button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 pb-24 pt-4">
        {/* Products View */}
        {view === 'products' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">My Products</h2>
              <Button onClick={() => setShowAddProduct(true)} className="bg-amber-500 hover:bg-amber-600"><PlusCircle className="w-4 h-4 mr-2" />Add Product</Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <Card className="p-4"><p className="text-xs text-gray-500">Total</p><p className="text-2xl font-bold">{products.length}</p></Card>
              <Card className="p-4"><p className="text-xs text-gray-500">Approved</p><p className="text-2xl font-bold text-emerald-600">{approvedProducts}</p></Card>
              <Card className="p-4"><p className="text-xs text-gray-500">Pending</p><p className="text-2xl font-bold text-amber-600">{pendingProducts}</p></Card>
            </div>

            {showAddProduct && (
              <Card className="mb-6">
                <CardHeader><CardTitle className="text-lg">Add New Product</CardTitle></CardHeader>
                <CardContent>
                  <form onSubmit={addProduct} className="grid sm:grid-cols-2 gap-4">
                    <div><Label>Title</Label><Input name="title" placeholder="Product name" required className="mt-1" /></div>
                    <div><Label>Category</Label><Input name="category" placeholder="e.g. Fruits, Dairy" className="mt-1" /></div>
                    <div><Label>Price (₹)</Label><Input name="price" type="number" step="0.01" required className="mt-1" /></div>
                    <div><Label>Stock</Label><Input name="stock" type="number" required className="mt-1" /></div>
                    <div className="sm:col-span-2"><Label>Description</Label><Textarea name="description" placeholder="Product description" className="mt-1" rows={2} /></div>
                    <div className="flex gap-2 sm:col-span-2">
                      <Button type="submit" className="bg-amber-500 hover:bg-amber-600">Add Product</Button>
                      <Button type="button" variant="outline" onClick={() => setShowAddProduct(false)}>Cancel</Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            <div className="space-y-3">
              {products.map((p: any) => (
                <Card key={p.id} className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 bg-amber-50 rounded-lg flex items-center justify-center text-xl flex-shrink-0">📦</div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm truncate">{p.title}</h3>
                      <p className="text-xs text-gray-500">{p.category} · Stock: {p.stock}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold">₹{p.price}</p>
                    <Badge className={statusColor(p.status)}>{p.status}</Badge>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Orders View */}
        {view === 'orders' && (
          <div>
            <h2 className="text-xl font-bold mb-4">All Orders</h2>
            <div className="space-y-3">
              {orders.map((o: any) => (
                <Card key={o.id}>
                  <div className="p-4 flex flex-wrap items-center justify-between gap-2 border-b">
                    <div>
                      <p className="font-bold text-sm">{o.orderNumber}</p>
                      <p className="text-xs text-gray-500">{o.user?.name} · {new Date(o.createdAt).toLocaleDateString('en-IN')}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{o.paymentMethod}</Badge>
                      <Badge className={o.orderStatus === 'delivered' ? 'bg-emerald-100 text-emerald-700' : o.orderStatus === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}>{o.orderStatus}</Badge>
                    </div>
                  </div>
                  <CardContent className="p-4">
                    {o.items?.map((i: any) => (
                      <div key={i.id} className="flex justify-between text-sm py-1"><span>{i.productName} × {i.quantity}</span><span>₹{i.totalPrice}</span></div>
                    ))}
                    <Separator className="my-2" />
                    <div className="flex justify-between font-bold"><span>Total</span><span>₹{o.totalAmount}</span></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-[0_-2px_10px_rgba(0,0,0,0.05)] z-40">
        <div className="max-w-6xl mx-auto flex">
          {navItems.map(item => (
            <button key={item.id} onClick={() => setView(item.id)}
              className={`flex-1 flex flex-col items-center py-3 gap-1 transition-colors ${view === item.id ? 'text-amber-600' : 'text-gray-400 hover:text-gray-600'}`}>
              <item.icon className="w-5 h-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
