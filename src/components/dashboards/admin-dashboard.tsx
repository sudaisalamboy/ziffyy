'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '@/store/auth'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Shield, Users, Package, ShoppingCart, DollarSign, Truck, MessageCircle, LogOut, CheckCircle, XCircle, Ban, RotateCcw, TrendingUp } from 'lucide-react'
import { toast } from 'sonner'

const headers = { 'Content-Type': 'application/json' }
function authHeaders(user: any) { return { ...headers, 'x-user-id': String(user.id), 'x-user-role': user.role } }

export function AdminDashboard() {
  const { user, view, setView, logout } = useAuthStore()
  const [stats, setStats] = useState<any>({})
  const [users, setUsers] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [deliveryBoys, setDeliveryBoys] = useState<any[]>([])
  const [needs, setNeeds] = useState<any[]>([])
  const [activity, setActivity] = useState<any[]>([])
  const [assignDialog, setAssignDialog] = useState<any>(null)
  const [selectedDeliveryBoy, setSelectedDeliveryBoy] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [rejectTarget, setRejectTarget] = useState<any>(null)

  const loadDashboard = useCallback(async () => {
    const res = await fetch('/api/admin?section=dashboard', { headers: authHeaders(user) })
    const d = await res.json()
    setStats(d.stats || {})
    setActivity(d.recentActivity || [])
  }, [user])

  const loadUsers = useCallback(async () => {
    const res = await fetch('/api/admin?section=users', { headers: authHeaders(user) })
    const d = await res.json()
    setUsers(d.users || [])
  }, [user])

  const loadProducts = useCallback(async () => {
    const res = await fetch('/api/admin?section=products&status=all', { headers: authHeaders(user) })
    const d = await res.json()
    setProducts(d.products || [])
  }, [user])

  const loadOrders = useCallback(async () => {
    const res = await fetch('/api/admin?section=orders', { headers: authHeaders(user) })
    const d = await res.json()
    setOrders(d.orders || [])
  }, [user])

  const loadPayments = useCallback(async () => {
    const res = await fetch('/api/admin?section=payments', { headers: authHeaders(user) })
    const d = await res.json()
    setPayments(d.payments || [])
  }, [user])

  const loadDeliveryBoys = useCallback(async () => {
    const res = await fetch('/api/admin?section=delivery_boys', { headers: authHeaders(user) })
    const d = await res.json()
    setDeliveryBoys(d.deliveryBoys || [])
  }, [user])

  const loadNeeds = useCallback(async () => {
    const res = await fetch('/api/admin?section=needs', { headers: authHeaders(user) })
    const d = await res.json()
    setNeeds(d.needs || [])
  }, [user])

  const adminAction = async (action: string, data: any) => {
    const res = await fetch('/api/admin', { method: 'POST', headers: authHeaders(user), body: JSON.stringify({ action, ...data }) })
    if (res.ok) { toast.success('Action completed!'); return true }
    toast.error('Action failed')
    return false
  }

  useEffect(() => { if (view === 'home') loadDashboard() }, [view, loadDashboard])
  useEffect(() => { if (view === 'admin_users') loadUsers() }, [view, loadUsers])
  useEffect(() => { if (view === 'admin_products') loadProducts() }, [view, loadProducts])
  useEffect(() => { if (view === 'admin_orders') loadOrders() }, [view, loadOrders])
  useEffect(() => { if (view === 'admin_payments') loadPayments() }, [view, loadPayments])
  useEffect(() => { if (view === 'admin_delivery') { loadDeliveryBoys(); loadOrders() } }, [view, loadDeliveryBoys, loadOrders])
  useEffect(() => { if (view === 'admin_needs') loadNeeds() }, [view, loadNeeds])

  const handleApproveUser = async (userId: number) => { if (await adminAction('approve_user', { userId })) loadUsers() }
  const handleRejectUser = async (userId: number) => { if (await adminAction('reject_user', { userId })) loadUsers() }
  const handleSuspendUser = async (userId: number) => { if (await adminAction('suspend_user', { userId })) loadUsers() }
  const handleActivateUser = async (userId: number) => { if (await adminAction('activate_user', { userId })) loadUsers() }
  const handleApproveProduct = async (productId: number) => { if (await adminAction('approve_product', { productId })) loadProducts() }
  const handleRejectProduct = async (productId: number) => { if (await adminAction('reject_product', { productId, reason: rejectReason })) { setRejectTarget(null); setRejectReason(''); loadProducts() } }
  const handleApprovePayment = async (paymentId: number) => { if (await adminAction('approve_payment', { paymentId })) loadPayments() }
  const handleAssignDelivery = async () => {
    if (!assignDialog || !selectedDeliveryBoy) { toast.error('Select a delivery boy'); return }
    if (await adminAction('assign_delivery', { orderId: assignDialog.id, deliveryBoyId: parseInt(selectedDeliveryBoy) })) {
      setAssignDialog(null); setSelectedDeliveryBoy(''); loadOrders(); loadDeliveryBoys()
    }
  }

  const userRoleColor = (r: string) => r === 'customer' ? 'bg-emerald-100 text-emerald-700' : r === 'shop' ? 'bg-amber-100 text-amber-700' : r === 'delivery' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
  const statusColor = (s: string) => {
    const m: any = { pending: 'bg-amber-100 text-amber-700', active: 'bg-emerald-100 text-emerald-700', approved: 'bg-emerald-100 text-emerald-700', rejected: 'bg-red-100 text-red-700', suspended: 'bg-gray-200 text-gray-700' }
    return m[s] || 'bg-gray-100 text-gray-700'
  }

  const navItems = [
    { id: 'home', label: 'Dashboard', icon: TrendingUp },
    { id: 'admin_users', label: 'Users', icon: Users },
    { id: 'admin_products', label: 'Products', icon: Package },
    { id: 'admin_orders', label: 'Orders', icon: ShoppingCart },
    { id: 'admin_payments', label: 'Payments', icon: DollarSign },
    { id: 'admin_delivery', label: 'Delivery', icon: Truck },
    { id: 'admin_needs', label: 'Needs', icon: MessageCircle },
  ]

  return (
    <>
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Sidebar */}
        <aside className="hidden md:flex flex-col w-64 bg-white border-r min-h-screen sticky top-0">
          <div className="p-4 border-b flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center"><Shield className="w-5 h-5 text-white" /></div>
            <div><p className="font-bold text-sm">GrocerApp</p><p className="text-xs text-gray-500">Admin Panel</p></div>
          </div>
          <nav className="flex-1 p-3 space-y-1">
            {navItems.map(item => (
              <button key={item.id} onClick={() => setView(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${view === item.id ? 'bg-emerald-50 text-emerald-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                <item.icon className="w-4 h-4" />{item.label}
              </button>
            ))}
          </nav>
          <div className="p-3 border-t">
            <button onClick={logout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50">
              <LogOut className="w-4 h-4" />Logout
            </button>
          </div>
        </aside>

        {/* Mobile header */}
        <div className="flex-1 flex flex-col min-h-screen">
          <header className="md:hidden sticky top-0 z-50 bg-white border-b shadow-sm h-14 flex items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-emerald-600 rounded-lg flex items-center justify-center"><Shield className="w-4 h-4 text-white" /></div>
              <span className="font-bold">Admin Panel</span>
            </div>
            <button onClick={logout} className="p-2 text-red-500"><LogOut className="w-4 h-4" /></button>
          </header>

          <main className="flex-1 p-4 md:p-6 max-w-5xl w-full mx-auto pb-20 md:pb-6">
            {/* DASHBOARD */}
            {view === 'home' && (
              <div>
                <h2 className="text-2xl font-bold mb-6">Dashboard Overview</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  <Card className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center"><Users className="w-5 h-5 text-emerald-600" /></div><div><p className="text-2xl font-bold">{stats.totalUsers || 0}</p><p className="text-xs text-gray-500">Users</p></div></div></Card>
                  <Card className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center"><ShoppingCart className="w-5 h-5 text-blue-600" /></div><div><p className="text-2xl font-bold">{stats.totalOrders || 0}</p><p className="text-xs text-gray-500">Orders</p></div></div></Card>
                  <Card className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center"><Package className="w-5 h-5 text-amber-600" /></div><div><p className="text-2xl font-bold">{stats.totalProducts || 0}</p><p className="text-xs text-gray-500">Products</p></div></div></Card>
                  <Card className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center"><Truck className="w-5 h-5 text-purple-600" /></div><div><p className="text-2xl font-bold">{stats.totalDeliveryBoys || 0}</p><p className="text-xs text-gray-500">Delivery</p></div></div></Card>
                </div>
                {/* Pending alerts */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  {stats.pendingUsers > 0 && <Card className="p-4 border-amber-200 bg-amber-50 cursor-pointer hover:shadow-md" onClick={() => setView('admin_users')}><p className="text-sm font-semibold text-amber-700">{stats.pendingUsers} Pending Users</p><p className="text-xs text-amber-600 mt-1">Click to review</p></Card>}
                  {stats.pendingProducts > 0 && <Card className="p-4 border-amber-200 bg-amber-50 cursor-pointer hover:shadow-md" onClick={() => setView('admin_products')}><p className="text-sm font-semibold text-amber-700">{stats.pendingProducts} Pending Products</p><p className="text-xs text-amber-600 mt-1">Click to review</p></Card>}
                  {stats.pendingPayments > 0 && <Card className="p-4 border-amber-200 bg-amber-50 cursor-pointer hover:shadow-md" onClick={() => setView('admin_payments')}><p className="text-sm font-semibold text-amber-700">{stats.pendingPayments} Pending Payments</p><p className="text-xs text-amber-600 mt-1">Click to review</p></Card>}
                </div>
                {/* Activity */}
                <h3 className="font-bold mb-3">Recent Activity</h3>
                <div className="space-y-2">
                  {(!activity || activity.length === 0) && <p className="text-sm text-gray-500">No recent activity</p>}
                  {activity.map((a: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 text-sm bg-white p-3 rounded-lg border">
                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-xs font-bold text-gray-500">A</div>
                      <div className="flex-1"><p className="text-gray-700">{a.message}</p><p className="text-xs text-gray-400">by {a.admin?.name || 'Admin'} · {new Date(a.createdAt).toLocaleString('en-IN')}</p></div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* USERS */}
            {view === 'admin_users' && (
              <div>
                <h2 className="text-2xl font-bold mb-4">User Management</h2>
                <div className="bg-white rounded-xl border overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b"><tr>
                        <th className="text-left p-3 font-medium">Name</th>
                        <th className="text-left p-3 font-medium hidden sm:table-cell">Email</th>
                        <th className="text-left p-3 font-medium">Role</th>
                        <th className="text-left p-3 font-medium">Status</th>
                        <th className="text-right p-3 font-medium">Actions</th>
                      </tr></thead>
                      <tbody>
                        {users.map((u: any) => (
                          <tr key={u.id} className="border-b last:border-0 hover:bg-gray-50">
                            <td className="p-3 font-medium">{u.name}</td>
                            <td className="p-3 text-gray-500 hidden sm:table-cell">{u.email}</td>
                            <td className="p-3"><Badge className={userRoleColor(u.role)}>{u.role}</Badge></td>
                            <td className="p-3"><Badge className={statusColor(u.status)}>{u.status}</Badge></td>
                            <td className="p-3 text-right">
                              {u.status === 'pending' && u.role !== 'customer' && (
                                <div className="flex gap-1 justify-end">
                                  <Button size="sm" variant="ghost" className="h-7 text-emerald-600 hover:bg-emerald-50" onClick={() => handleApproveUser(u.id)}><CheckCircle className="w-3.5 h-3.5" /></Button>
                                  <Button size="sm" variant="ghost" className="h-7 text-red-500 hover:bg-red-50" onClick={() => handleRejectUser(u.id)}><XCircle className="w-3.5 h-3.5" /></Button>
                                </div>
                              )}
                              {u.status === 'active' && u.role !== 'customer' && (
                                <Button size="sm" variant="ghost" className="h-7 text-amber-600 hover:bg-amber-50" onClick={() => handleSuspendUser(u.id)}><Ban className="w-3.5 h-3.5" /></Button>
                              )}
                              {u.status === 'suspended' && (
                                <Button size="sm" variant="ghost" className="h-7 text-emerald-600 hover:bg-emerald-50" onClick={() => handleActivateUser(u.id)}><RotateCcw className="w-3.5 h-3.5" /></Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* PRODUCTS */}
            {view === 'admin_products' && (
              <div>
                <h2 className="text-2xl font-bold mb-4">Product Management</h2>
                <div className="space-y-3">
                  {products.map((p: any) => (
                    <Card key={p.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 bg-amber-50 rounded-lg flex items-center justify-center text-xl flex-shrink-0">📦</div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-sm truncate">{p.title}</h3>
                          <p className="text-xs text-gray-500">{p.shopOwner?.user?.name} · {p.category} · ₹{p.price} · Stock: {p.stock}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge className={statusColor(p.status)}>{p.status}</Badge>
                        {p.status === 'pending' && (
                          <>
                            <Button size="sm" className="h-7 bg-emerald-600 hover:bg-emerald-700" onClick={() => handleApproveProduct(p.id)}>Approve</Button>
                            <Button size="sm" variant="outline" className="h-7 text-red-500" onClick={() => setRejectTarget(p)}>Reject</Button>
                          </>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* ORDERS */}
            {view === 'admin_orders' && (
              <div>
                <h2 className="text-2xl font-bold mb-4">Order Management</h2>
                <div className="space-y-3">
                  {orders.map((o: any) => (
                    <Card key={o.id}>
                      <div className="p-4 flex flex-wrap items-center justify-between gap-2 border-b">
                        <div>
                          <p className="font-bold text-sm">{o.orderNumber}</p>
                          <p className="text-xs text-gray-500">{o.user?.name} · {new Date(o.createdAt).toLocaleDateString('en-IN')}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={statusColor(o.orderStatus)}>{o.orderStatus}</Badge>
                          <Badge variant="outline">{o.paymentMethod}</Badge>
                          {!o.deliveryAssignments?.length && (o.orderStatus === 'confirmed' || o.orderStatus === 'pending') && (
                            <Button size="sm" className="h-7 bg-blue-600 hover:bg-blue-700" onClick={() => { setAssignDialog(o); setSelectedDeliveryBoy('') }}>Assign Delivery</Button>
                          )}
                          {o.deliveryAssignments?.[0] && (
                            <Badge className="bg-blue-100 text-blue-700">{o.deliveryAssignments[0].deliveryBoy?.user?.name}</Badge>
                          )}
                        </div>
                      </div>
                      <CardContent className="p-4">
                        {o.items?.map((i: any) => (
                          <div key={i.id} className="text-sm flex justify-between py-0.5"><span>{i.productName} × {i.quantity}</span><span>₹{i.totalPrice}</span></div>
                        ))}
                        <Separator className="my-2" />
                        <div className="flex justify-between font-bold text-sm"><span>Total</span><span>₹{o.totalAmount}</span></div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* PAYMENTS */}
            {view === 'admin_payments' && (
              <div>
                <h2 className="text-2xl font-bold mb-4">Payment Management</h2>
                <div className="space-y-3">
                  {payments.map((p: any) => (
                    <Card key={p.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-sm">₹{p.amount} · {p.paymentMethod?.toUpperCase()}</p>
                        <p className="text-xs text-gray-500">{p.user?.name} · Order #{p.order?.orderNumber}</p>
                        <p className="text-xs text-gray-400">{new Date(p.createdAt).toLocaleString('en-IN')}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={p.paymentStatus === 'completed' ? 'bg-emerald-100 text-emerald-700' : p.paymentStatus === 'failed' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}>{p.paymentStatus}</Badge>
                        {p.paymentStatus === 'pending' && (
                          <Button size="sm" className="h-7 bg-emerald-600 hover:bg-emerald-700" onClick={() => handleApprovePayment(p.id)}>Approve</Button>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* DELIVERY */}
            {view === 'admin_delivery' && (
              <div>
                <h2 className="text-2xl font-bold mb-6">Delivery Management</h2>
                <h3 className="font-bold mb-3">Delivery Boys</h3>
                <div className="grid sm:grid-cols-2 gap-3 mb-8">
                  {deliveryBoys.map((d: any) => (
                    <Card key={d.id} className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-sm font-bold text-blue-700">{d.user?.name?.[0]}</div>
                          <div><p className="font-semibold text-sm">{d.user?.name}</p><p className="text-xs text-gray-500">{d.vehicleType || 'N/A'} · {d.vehicleNumber || 'N/A'}</p></div>
                        </div>
                        <Badge className={statusColor(d.status)}>{d.status}</Badge>
                      </div>
                      <div className="flex gap-4 text-xs text-gray-500">
                        <span>Deliveries: {d.totalDeliveries || 0}</span>
                        <span>Rating: {d.rating || 'N/A'}</span>
                      </div>
                      {d.status === 'pending' && (
                        <div className="flex gap-2 mt-3">
                          <Button size="sm" className="h-7 bg-emerald-600 hover:bg-emerald-700" onClick={async () => { if (await adminAction('approve_user', { userId: d.userId })) loadDeliveryBoys() }}>Approve</Button>
                          <Button size="sm" variant="outline" className="h-7 text-red-500" onClick={async () => { if (await adminAction('reject_user', { userId: d.userId })) loadDeliveryBoys() }}>Reject</Button>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* NEEDS */}
            {view === 'admin_needs' && (
              <div>
                <h2 className="text-2xl font-bold mb-4">All Needs</h2>
                <div className="space-y-3">
                  {needs.map((n: any) => (
                    <Card key={n.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-bold text-sm">{n.title}</h3>
                          <Badge className={statusColor(n.status)}>{n.status}</Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{n.description}</p>
                        <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                          <span>By {n.user?.name}</span>
                          <span>{n.urgency}</span>
                          <span>{n.offers?.length || 0} offers</span>
                          <span>{n.comments?.length || 0} comments</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </main>

          {/* Mobile bottom nav */}
          <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t shadow-[0_-2px_10px_rgba(0,0,0,0.05)] z-40">
            <ScrollArea className="w-full">
              <div className="flex min-w-max">
                {navItems.map(item => (
                  <button key={item.id} onClick={() => setView(item.id)}
                    className={`flex flex-col items-center py-2.5 px-3 gap-0.5 transition-colors min-w-[4rem] ${view === item.id ? 'text-emerald-600' : 'text-gray-400'}`}>
                    <item.icon className="w-4 h-4" />
                    <span className="text-[10px] font-medium">{item.label}</span>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </nav>
        </div>
      </div>
    </div>

    {/* Assign Delivery Dialog */}
    <Dialog open={!!assignDialog} onOpenChange={() => setAssignDialog(null)}>
      <DialogContent>
        <DialogHeader><DialogTitle>Assign Delivery Boy</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Order: {assignDialog?.orderNumber} · ₹{assignDialog?.totalAmount}</p>
          <Select value={selectedDeliveryBoy} onValueChange={setSelectedDeliveryBoy}>
            <SelectTrigger><SelectValue placeholder="Select delivery boy" /></SelectTrigger>
            <SelectContent>
              {deliveryBoys.filter((d: any) => d.status === 'approved').map((d: any) => (
                <SelectItem key={d.id} value={String(d.id)}>{d.user?.name} ({d.vehicleType || 'Vehicle'})</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setAssignDialog(null)}>Cancel</Button>
            <Button className="flex-1 bg-blue-600 hover:bg-blue-700" onClick={handleAssignDelivery}>Assign</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Reject Product Dialog */}
    <Dialog open={!!rejectTarget} onOpenChange={() => setRejectTarget(null)}>
      <DialogContent>
        <DialogHeader><DialogTitle>Reject Product</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <p className="text-sm">Product: {rejectTarget?.title}</p>
          <div><Label>Rejection Reason</Label><Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} className="mt-1" rows={3} /></div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setRejectTarget(null)}>Cancel</Button>
            <Button className="flex-1 bg-red-600 hover:bg-red-700" onClick={() => handleRejectProduct(rejectTarget?.id)}>Reject</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  )
}
