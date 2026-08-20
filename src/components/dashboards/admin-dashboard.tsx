'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '@/store/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Shield, Users, Package, ShoppingCart, IndianRupee, Truck, MessageCircle,
  LogOut, CheckCircle, XCircle, Ban, RotateCcw, TrendingUp, Settings,
  ChevronLeft, Mail, Phone, MapPin, Clock, Calendar, Eye, QrCode,
  Wallet, ArrowDownToLine, Banknote
} from 'lucide-react'
import { toast } from 'sonner'

const H = { 'Content-Type': 'application/json' }
// SECURITY (V1-S): /api/admin now requires a verified JWT in the
// `Authorization: Bearer <token>` header. We attach it from the auth store.
function ah(token: string | null) {
  return { ...H, 'Authorization': `Bearer ${token}` }
}

export function AdminDashboard() {
  const { user, token, view, setView, logout } = useAuthStore()
  const [stats, setStats] = useState<any>({})
  const [users, setUsers] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [deliveryBoys, setDeliveryBoys] = useState<any[]>([])
  const [needs, setNeeds] = useState<any[]>([])
  const [activity, setActivity] = useState<any[]>([])
  const [withdrawals, setWithdrawals] = useState<any[]>([])

  // Detail dialogs
  const [detailData, setDetailData] = useState<any>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailType, setDetailType] = useState('')

  // Settings
  const [appSettings, setAppSettings] = useState<any>({})
  const [settingsLoading, setSettingsLoading] = useState(false)

  // Dialogs
  const [assignDialog, setAssignDialog] = useState<any>(null)
  const [selectedDeliveryBoy, setSelectedDeliveryBoy] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [rejectTarget, setRejectTarget] = useState<any>(null)

  // === LOADERS ===
  const loadDashboard = useCallback(async () => {
    const res = await fetch('/api/admin?section=dashboard', { headers: ah(token) })
    const d = await res.json(); setStats(d.stats || {}); setActivity(d.recentActivity || [])
  }, [user, token])
  const loadUsers = useCallback(async () => { const r = await fetch('/api/admin?section=users', { headers: ah(token) }); const d = await r.json(); setUsers(d.users || []) }, [user, token])
  const loadProducts = useCallback(async () => { const r = await fetch('/api/admin?section=products&status=all', { headers: ah(token) }); const d = await r.json(); setProducts(d.products || []) }, [user, token])
  const loadOrders = useCallback(async () => { const r = await fetch('/api/admin?section=orders', { headers: ah(token) }); const d = await r.json(); setOrders(d.orders || []) }, [user, token])
  const loadPayments = useCallback(async () => { const r = await fetch('/api/admin?section=payments', { headers: ah(token) }); const d = await r.json(); setPayments(d.payments || []) }, [user, token])
  const loadDeliveryBoys = useCallback(async () => { const r = await fetch('/api/admin?section=delivery_boys', { headers: ah(token) }); const d = await r.json(); setDeliveryBoys(d.deliveryBoys || []) }, [user, token])
  const loadNeeds = useCallback(async () => { const r = await fetch('/api/admin?section=needs', { headers: ah(token) }); const d = await r.json(); setNeeds(d.needs || []) }, [user, token])
  const loadWithdrawals = useCallback(async () => { const r = await fetch('/api/admin?section=withdrawals', { headers: ah(token) }); const d = await r.json(); setWithdrawals(d.withdrawals || []) }, [user, token])

  useEffect(() => { if (view === 'home') loadDashboard() }, [view, loadDashboard])
  useEffect(() => { if (view === 'admin_users') loadUsers() }, [view, loadUsers])
  useEffect(() => { if (view === 'admin_products') loadProducts() }, [view, loadProducts])
  useEffect(() => { if (view === 'admin_orders') loadOrders() }, [view, loadOrders])
  useEffect(() => { if (view === 'admin_payments') loadPayments() }, [view, loadPayments])
  useEffect(() => { if (view === 'admin_delivery') { loadDeliveryBoys(); loadOrders() } }, [view, loadDeliveryBoys, loadOrders])
  useEffect(() => { if (view === 'admin_needs') loadNeeds() }, [view, loadNeeds])
  useEffect(() => { if (view === 'admin_withdrawals') loadWithdrawals() }, [view, loadWithdrawals])

  // === DETAIL LOADER ===
  const openDetail = async (type: string, id: number) => {
    setDetailType(type); setDetailLoading(true); setDetailData(null)
    try {
      const res = await fetch(`/api/admin/${id}?type=${type}`, { headers: ah(token) })
      if (res.ok) { const d = await res.json(); setDetailData(type === 'user' ? d.user : type === 'order' ? d.order : d.need) }
      else toast.error('Failed to load details')
    } catch { toast.error('Network error') }
    setDetailLoading(false)
  }

  // === SETTINGS ===
  const loadSettings = async () => {
    try {
      const r1 = await fetch('/api/admin?section=dashboard', { headers: ah(token) })
      const d1 = await r1.json(); setStats(d1.stats || {})
      // Load settings from DB
      const res = await fetch('/api/admin?section=settings', { headers: ah(token) })
      if (res.ok) { const d = await res.json(); setAppSettings(d.settings || {}) }
    } catch {}
  }
  const saveSetting = async (key: string, value: string) => {
 setSettingsLoading(true)
    const res = await fetch('/api/admin', { method: 'POST', headers: ah(token), body: JSON.stringify({ action: 'save_setting', key, value }) })
    if (res.ok) { toast.success('Setting saved!'); loadSettings() } else toast.error('Failed')
    setSettingsLoading(false)
  }

  useEffect(() => { if (view === 'admin_settings') loadSettings() }, [view])

  // === ACTIONS ===
  const act = async (action: string, data: any) => {
    const res = await fetch('/api/admin', { method: 'POST', headers: ah(token), body: JSON.stringify({ action, ...data }) })
    if (res.ok) { toast.success('Done!'); return true } toast.error('Failed'); return false
  }
  const handleApproveUser = async (id: number) => { if (await act('approve_user', { userId: id })) loadUsers() }
  const handleRejectUser = async (id: number) => { if (await act('reject_user', { userId: id })) loadUsers() }
  const handleSuspendUser = async (id: number) => { if (await act('suspend_user', { userId: id })) loadUsers() }
  const handleActivateUser = async (id: number) => { if (await act('activate_user', { userId: id })) loadUsers() }
  const handleApproveProduct = async (id: number) => { if (await act('approve_product', { productId: id })) loadProducts() }
  const handleRejectProduct = async (id: number) => { if (await act('reject_product', { productId: id, reason: rejectReason })) { setRejectTarget(null); setRejectReason(''); loadProducts() } }
  const handleApprovePayment = async (id: number) => { if (await act('approve_payment', { paymentId: id })) loadPayments() }
  const handleRejectPayment = async (id: number) => {
    const reason = window.prompt('Enter rejection reason:')
    if (!reason) return
    if (await act('reject_payment', { paymentId: id, reason })) loadPayments()
  }
  const handleApproveWithdrawal = async (id: number) => { if (await act('approve_withdrawal', { withdrawalId: id })) loadWithdrawals() }
  const handleRejectWithdrawal = async (id: number) => {
    const reason = window.prompt('Enter rejection reason:')
    if (!reason) return
    if (await act('reject_withdrawal', { withdrawalId: id, reason })) loadWithdrawals()
  }
  const handleAssignDelivery = async () => {
    if (!assignDialog || !selectedDeliveryBoy) { toast.error('Select delivery boy'); return }
    if (await act('assign_delivery', { orderId: assignDialog.id, deliveryBoyId: parseInt(selectedDeliveryBoy) })) { setAssignDialog(null); setSelectedDeliveryBoy(''); loadOrders(); loadDeliveryBoys() }
  }

  const sc = (s: string) => ({ pending: 'bg-amber-100 text-amber-700', active: 'bg-emerald-100 text-emerald-700', approved: 'bg-emerald-100 text-emerald-700', rejected: 'bg-red-100 text-red-700', suspended: 'bg-gray-200 text-gray-700', delivered: 'bg-green-100 text-green-700', confirmed: 'bg-blue-100 text-blue-700', processing: 'bg-indigo-100 text-indigo-700', cancelled: 'bg-red-100 text-red-700', completed: 'bg-emerald-100 text-emerald-700', failed: 'bg-red-100 text-red-700', assigned: 'bg-blue-100 text-blue-700', sent: 'bg-amber-100 text-amber-700', accepted: 'bg-emerald-100 text-emerald-700', shipped: 'bg-indigo-100 text-indigo-700', pending_verification: 'bg-amber-100 text-amber-700' }[s] || 'bg-gray-100 text-gray-700')
  const rc = (r: string) => r === 'customer' ? 'bg-emerald-100 text-emerald-700' : r === 'shop' ? 'bg-amber-100 text-amber-700' : r === 'delivery' ? 'bg-blue-100 text-blue-700' : r === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  const fmtDateTime = (d: string) => new Date(d).toLocaleString('en-IN')

  const navItems = [
    { id: 'home', label: 'Dashboard', icon: TrendingUp },
    { id: 'admin_users', label: 'Users', icon: Users },
    { id: 'admin_products', label: 'Products', icon: Package },
    { id: 'admin_orders', label: 'Orders', icon: ShoppingCart },
    { id: 'admin_payments', label: 'Payments', icon: IndianRupee },
    { id: 'admin_delivery', label: 'Delivery', icon: Truck },
    { id: 'admin_needs', label: 'Needs', icon: MessageCircle },
    { id: 'admin_withdrawals', label: 'Withdrawals', icon: Wallet },
    { id: 'admin_settings', label: 'Settings', icon: Settings },
  ]

  // ===================== DETAIL DIALOG =====================
  const DetailDialog = () => (
    <Dialog open={!!detailData || detailLoading} onOpenChange={() => { setDetailData(null); setDetailType('') }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <button onClick={() => { setDetailData(null); setDetailType('') }} className="p-1 hover:bg-gray-100 rounded-lg"><ChevronLeft className="w-4 h-4" /></button>
            {detailType === 'user' && 'User Details'}
            {detailType === 'need' && 'Need Details'}
            {detailType === 'order' && 'Order Details'}
          </DialogTitle>
        </DialogHeader>
        {detailLoading && <div className="py-8 text-center text-gray-400">Loading...</div>}
        {detailData && detailType === 'user' && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="w-14 h-14"><AvatarFallback className="bg-emerald-100 text-emerald-700 text-xl font-bold">{detailData.name?.[0]}</AvatarFallback></Avatar>
              <div className="flex-1">
                <h3 className="font-bold text-lg">{detailData.name}</h3>
                <div className="flex items-center gap-2 mt-1"><Badge className={rc(detailData.role)}>{detailData.role}</Badge><Badge className={sc(detailData.status)}>{detailData.status}</Badge></div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 text-gray-600"><Mail className="w-4 h-4 text-gray-400" />{detailData.email}</div>
              <div className="flex items-center gap-2 text-gray-600"><Phone className="w-4 h-4 text-gray-400" />{detailData.mobile || 'N/A'}</div>
              <div className="flex items-center gap-2 text-gray-600"><MapPin className="w-4 h-4 text-gray-400" />{detailData.address || 'No address'}</div>
              <div className="flex items-center gap-2 text-gray-600"><Calendar className="w-4 h-4 text-gray-400" />Joined {fmtDate(detailData.createdAt)}</div>
            </div>
            {detailData.shopOwner && <Card className="p-3"><p className="text-xs text-gray-500">Shop Details</p><p className="font-semibold text-sm mt-1">{detailData.shopOwner.shopName}</p><p className="text-xs text-gray-500">{detailData.shopOwner.shopAddress}</p><Badge className={`${sc(detailData.shopOwner.status)} mt-2 text-xs`}>{detailData.shopOwner.status}</Badge></Card>}
            {detailData.deliveryBoy && <Card className="p-3"><p className="text-xs text-gray-500">Delivery Details</p><p className="font-semibold text-sm mt-1">{detailData.deliveryBoy.vehicleType} · {detailData.deliveryBoy.vehicleNumber}</p><p className="text-xs text-gray-500 mt-1">Deliveries: {detailData.deliveryBoy.totalDeliveries} · Rating: {detailData.deliveryBoy.rating || 'N/A'}</p><Badge className={`${sc(detailData.deliveryBoy.status)} mt-2 text-xs`}>{detailData.deliveryBoy.status}</Badge></Card>}
            {detailData.userAddresses?.length > 0 && <div><p className="text-sm font-semibold mb-2">Saved Addresses</p>{detailData.userAddresses.map((a: any) => (<div key={a.id} className="text-sm bg-gray-50 p-2 rounded-lg mb-1"><p>{a.fullAddress}{a.isDefault ? ' <Badge className="text-[9px] bg-emerald-100 text-emerald-700">Default</Badge>' : ''}</p>{(a.city || a.pincode) && <p className="text-xs text-gray-400">{a.city}{a.pincode ? ` - ${a.pincode}` : ''}</p>}</div>))}</div>}
            <div><p className="text-sm font-semibold mb-2">Orders ({detailData.orders?.length || 0})</p>{!detailData.orders?.length && <p className="text-xs text-gray-400">No orders</p>}{detailData.orders?.map((o: any) => (<div key={o.id} className="text-sm bg-gray-50 p-2 rounded-lg mb-1 flex justify-between cursor-pointer hover:bg-gray-100" onClick={() => { setDetailData(null); setTimeout(() => openDetail('order', o.id), 100) }}><div><span className="font-medium">{o.orderNumber}</span><span className="text-xs text-gray-400 ml-2">{fmtDate(o.createdAt)}</span></div><div className="flex items-center gap-2"><span className="font-medium">₹{o.totalAmount}</span><Badge className={`${sc(o.orderStatus)} text-[10px]`}>{o.orderStatus}</Badge></div></div>))}</div>
            <div><p className="text-sm font-semibold mb-2">Needs ({detailData.needs?.length || 0})</p>{!detailData.needs?.length && <p className="text-xs text-gray-400">No needs</p>}{detailData.needs?.map((n: any) => (<div key={n.id} className="text-sm bg-gray-50 p-2 rounded-lg mb-1 flex justify-between cursor-pointer hover:bg-gray-100" onClick={() => { setDetailData(null); setTimeout(() => openDetail('need', n.id), 100) }}><div><span className="font-medium">{n.title}</span><span className="text-xs text-gray-400 ml-2">{fmtDate(n.createdAt)}</span></div><Badge className={`${sc(n.status)} text-[10px]`}>{n.status}</Badge></div>))}</div>
          </div>
        )}
        {detailData && detailType === 'need' && (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-2"><div><h3 className="font-bold text-lg">{detailData.title}</h3><p className="text-sm text-gray-500 mt-0.5">By {detailData.user?.name} · {fmtDate(detailData.createdAt)}</p></div><Badge className={sc(detailData.status)}>{detailData.status}</Badge></div>
            {detailData.description && <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">{detailData.description}</p>}
            <div className="grid grid-cols-3 gap-3 text-sm"><div className="bg-gray-50 p-3 rounded-lg text-center"><p className="text-xs text-gray-500">Price Type</p><p className="font-semibold mt-1">{detailData.priceType === 'exact' ? `₹${detailData.exactPrice}` : detailData.priceType === 'minmax' ? `₹${detailData.minPrice}-${detailData.maxPrice}` : 'Not set'}</p></div><div className="bg-gray-50 p-3 rounded-lg text-center"><p className="text-xs text-gray-500">Urgency</p><p className="font-semibold mt-1">{detailData.urgency}</p></div><div className="bg-gray-50 p-3 rounded-lg text-center"><p className="text-xs text-gray-500">Offers</p><p className="font-semibold mt-1">{detailData.offers?.length || 0}</p></div></div>
            {detailData.comments?.length > 0 && <div><p className="text-sm font-semibold mb-2">Comments ({detailData.comments.length})</p><div className="space-y-2 max-h-48 overflow-y-auto">{detailData.comments.map((c: any) => (<div key={c.id} className="bg-gray-50 p-3 rounded-lg"><div className="flex items-center gap-2 mb-1"><span className="font-medium text-xs text-emerald-700">{c.user?.name}</span><span className="text-[10px] text-gray-400">{fmtDateTime(c.createdAt)}</span></div><p className="text-sm text-gray-600">{c.comment}</p></div>))}</div></div>}
            {detailData.offers?.length > 0 && <div><p className="text-sm font-semibold mb-2">Offers ({detailData.offers.length})</p><div className="space-y-2 max-h-48 overflow-y-auto">{detailData.offers.map((o: any) => (<div key={o.id} className="bg-amber-50 border border-amber-100 p-3 rounded-lg"><div className="flex items-center justify-between"><div><p className="font-medium text-sm">{o.deliveryBoy?.user?.name}</p>{o.message && <p className="text-xs text-gray-500 mt-0.5">{o.message}</p>}</div><div className="text-right"><p className="font-bold text-emerald-700">₹{o.offerAmount}</p><Badge className={`${sc(o.status)} text-[10px] mt-1`}>{o.status}</Badge></div></div></div>))}</div></div>}
          </div>
        )}
        {detailData && detailType === 'order' && (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-2"><div><h3 className="font-bold text-lg">{detailData.orderNumber}</h3><p className="text-sm text-gray-500 mt-0.5">{detailData.user?.name} · {fmtDateTime(detailData.createdAt)}</p></div><Badge className={sc(detailData.orderStatus)}>{detailData.orderStatus}</Badge></div>
            <div className="grid grid-cols-2 gap-3 text-sm"><div className="bg-gray-50 p-3 rounded-lg"><p className="text-xs text-gray-500">Payment</p><p className="font-semibold mt-1">{detailData.paymentMethod?.toUpperCase()} · <span className={detailData.paymentStatus === 'paid' ? 'text-emerald-600' : 'text-amber-600'}>{detailData.paymentStatus}</span></p></div><div className="bg-gray-50 p-3 rounded-lg"><p className="text-xs text-gray-500">Customer Paid</p><p className="font-bold text-lg text-emerald-700 mt-1">₹{detailData.totalAmount}</p></div></div>
            {/* Financial Breakdown */}
            <div className="bg-emerald-50 rounded-lg p-3 space-y-1.5 text-sm">
              <p className="text-xs font-semibold text-emerald-800 mb-2">Financial Breakdown</p>
              <div className="flex justify-between"><span className="text-gray-600">Items Total</span><span>₹{detailData.items?.reduce((s: number, i: any) => s + i.totalPrice, 0) || (detailData.totalAmount - (detailData.deliveryFee || 0))}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Delivery Fee</span><span>₹{detailData.deliveryFee || 0}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Platform Fee (Your Earning)</span><span className="font-semibold text-emerald-700">₹{detailData.commissionAmount || 0}</span></div>
              <Separator className="my-1" />
              <div className="flex justify-between font-medium"><span className="text-gray-700">Shop Owner Gets</span><span>₹{detailData.shopEarning || 0}</span></div>
            </div>
            {detailData.shippingAddress && <div className="flex items-start gap-2 text-sm bg-gray-50 p-3 rounded-lg"><MapPin className="w-4 h-4 text-gray-400 mt-0.5" /><div><p className="text-xs text-gray-500">Shipping Address</p><p>{detailData.shippingAddress}</p></div></div>}
            <div><p className="text-sm font-semibold mb-2">Items</p><div className="bg-gray-50 rounded-lg overflow-hidden"><table className="w-full text-sm"><thead className="bg-gray-100"><tr><th className="text-left p-2 text-xs">Product</th><th className="text-center p-2 text-xs">Qty</th><th className="text-right p-2 text-xs">Price</th><th className="text-right p-2 text-xs">Total</th></tr></thead><tbody>{detailData.items?.map((i: any) => (<tr key={i.id} className="border-t"><td className="p-2">{i.productName}</td><td className="p-2 text-center">{i.quantity}</td><td className="p-2 text-right">₹{i.unitPrice}</td><td className="p-2 text-right font-medium">₹{i.totalPrice}</td></tr>))}</tbody></table></div></div>
            {detailData.statusLogs?.length > 0 && <div><p className="text-sm font-semibold mb-2">Status Timeline</p><div className="space-y-2">{detailData.statusLogs.map((l: any, i: number) => (<div key={i} className="flex gap-3 text-sm"><div className="flex flex-col items-center"><div className="w-3 h-3 rounded-full bg-emerald-500" /><i className="w-px h-6 bg-gray-200" /></div><div><p className="font-medium">{l.status}</p><p className="text-xs text-gray-400">{l.notes} · {fmtDateTime(l.createdAt)}</p></div></div>))}</div></div>}
            {detailData.payments?.length > 0 && <div><p className="text-sm font-semibold mb-2">Payments</p>{detailData.payments.map((p: any) => (<div key={p.id} className="text-sm bg-gray-50 p-2 rounded-lg mb-1 flex justify-between"><div><span>₹{p.amount}</span><span className="text-xs text-gray-400">{p.paymentMethod?.toUpperCase()}</span></div><Badge className={`${sc(p.paymentStatus)} text-[10px]`}>{p.paymentStatus}</Badge></div>))}</div>}
            {detailData.deliveryAssignments?.[0] && <div className="bg-blue-50 p-3 rounded-lg"><p className="text-sm font-semibold">Delivery: {detailData.deliveryAssignments[0].deliveryBoy?.user?.name}</p><p className="text-xs text-gray-500">Status: {detailData.deliveryAssignments[0].status} · Assigned: {fmtDateTime(detailData.deliveryAssignments[0].assignedAt)}</p></div>}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )

  return (
    <>
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="hidden md:flex flex-col w-60 bg-white border-r min-h-screen sticky top-0">
          <div className="p-4 border-b flex items-center gap-2"><div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center"><Shield className="w-5 h-5 text-white" /></div><div><p className="font-bold text-sm">FreshKart</p><p className="text-xs text-gray-500">Admin Panel</p></div></div>
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">{navItems.map(item => (<button key={item.id} onClick={() => setView(item.id)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${view === item.id ? 'bg-emerald-50 text-emerald-700' : 'text-gray-600 hover:bg-gray-50'}`}><item.icon className="w-4 h-4" />{item.label}</button>))}</nav>
          <div className="p-3 border-t"><button onClick={logout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50"><LogOut className="w-4 h-4" />Logout</button></div>
        </aside>

        {/* Main */}
        <div className="flex-1 flex flex-col min-w-0">
          <header className="md:hidden sticky top-0 z-50 bg-white border-b shadow-sm h-14 flex items-center justify-between px-4"><div className="flex items-center gap-2"><div className="w-7 h-7 bg-emerald-600 rounded-lg flex items-center justify-center"><Shield className="w-4 h-4 text-white" /></div><span className="font-bold">Admin</span></div><button onClick={logout} className="p-2 text-red-500"><LogOut className="w-4 h-4" /></button></header>

          <main className="flex-1 p-4 md:p-6 max-w-5xl w-full mx-auto pb-20 md:pb-6">
            {/* DASHBOARD */}
            {view === 'home' && (
              <div>
                <h2 className="text-2xl font-bold mb-6">Dashboard</h2>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                  <Card className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center"><Users className="w-5 h-5 text-emerald-600" /></div><div><p className="text-2xl font-bold">{stats.totalUsers || 0}</p><p className="text-xs text-gray-500">Users</p></div></div></Card>
                  <Card className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center"><ShoppingCart className="w-5 h-5 text-blue-600" /></div><div><p className="text-2xl font-bold">{stats.totalOrders || 0}</p><p className="text-xs text-gray-500">Orders</p></div></div></Card>
                  <Card className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center"><Package className="w-5 h-5 text-amber-600" /></div><div><p className="text-2xl font-bold">{stats.totalProducts || 0}</p><p className="text-xs text-gray-500">Products</p></div></div></Card>
                  <Card className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center"><Truck className="w-5 h-5 text-purple-600" /></div><div><p className="text-2xl font-bold">{stats.totalDeliveryBoys || 0}</p><p className="text-xs text-gray-500">Delivery</p></div></div></Card>
                  <Card className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center"><IndianRupee className="w-5 h-5 text-green-600" /></div><div><p className="text-2xl font-bold">₹{(stats.totalPlatformEarnings || 0).toLocaleString()}</p><p className="text-xs text-gray-500">Platform Earnings</p></div></div></Card>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  {stats.pendingUsers > 0 && <Card className="p-4 border-amber-200 bg-amber-50 cursor-pointer hover:shadow-md" onClick={() => setView('admin_users')}><p className="text-sm font-semibold text-amber-700">{stats.pendingUsers} Pending Users</p></Card>}
                  {stats.pendingProducts > 0 && <Card className="p-4 border-amber-200 bg-amber-50 cursor-pointer hover:shadow-md" onClick={() => setView('admin_products')}><p className="text-sm font-semibold text-amber-700">{stats.pendingProducts} Pending Products</p></Card>}
                  {stats.pendingPayments > 0 && <Card className="p-4 border-amber-200 bg-amber-50 cursor-pointer hover:shadow-md" onClick={() => setView('admin_payments')}><p className="text-sm font-semibold text-amber-700">{stats.pendingPayments} Pending Payments</p></Card>}
                  {stats.pendingWithdrawals > 0 && <Card className="p-4 border-amber-200 bg-amber-50 cursor-pointer hover:shadow-md" onClick={() => setView('admin_withdrawals')}><p className="text-sm font-semibold text-amber-700">{stats.pendingWithdrawals} Pending Withdrawals</p></Card>}
                </div>
                <h3 className="font-bold mb-3">Recent Activity</h3>
                <div className="space-y-2">{(!activity || !activity.length) && <p className="text-sm text-gray-500">No activity</p>}{activity.map((a: any, i: number) => (<div key={i} className="flex items-center gap-3 text-sm bg-white p-3 rounded-lg border"><div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-xs font-bold text-gray-500">A</div><div className="flex-1"><p className="text-gray-700">{a.message}</p><p className="text-xs text-gray-400">{a.admin?.name || 'Admin'} · {fmtDateTime(a.createdAt)}</p></div></div>))}</div>
              </div>
            )}

            {/* USERS — clickable rows */}
            {view === 'admin_users' && (
              <div>
                <h2 className="text-2xl font-bold mb-4">Users</h2>
                <div className="bg-white rounded-xl border overflow-hidden">
                  <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-gray-50 border-b"><tr><th className="text-left p-3 font-medium">Name</th><th className="text-left p-3 font-medium hidden sm:table-cell">Email</th><th className="text-left p-3 font-medium">Role</th><th className="text-left p-3 font-medium">Status</th><th className="text-right p-3 font-medium">Actions</th></tr></thead>
                  <tbody>{users.map((u: any) => (<tr key={u.id} className="border-b last:border-0 hover:bg-gray-50 cursor-pointer" onClick={() => openDetail('user', u.id)}>
                    <td className="p-3 font-medium flex items-center gap-2"><div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-xs font-bold text-gray-600">{u.name?.[0]}</div>{u.name}</td>
                    <td className="p-3 text-gray-500 hidden sm:table-cell">{u.email}</td>
                    <td className="p-3"><Badge className={rc(u.role)}>{u.role}</Badge></td>
                    <td className="p-3"><Badge className={sc(u.status)}>{u.status}</Badge></td>
                    <td className="p-3 text-right" onClick={e => e.stopPropagation()}>
                      {u.status === 'pending' && u.role !== 'customer' && (<div className="flex gap-1 justify-end"><Button size="sm" variant="ghost" className="h-7 text-emerald-600 hover:bg-emerald-50" onClick={() => handleApproveUser(u.id)}><CheckCircle className="w-3.5 h-3.5" /></Button><Button size="sm" variant="ghost" className="h-7 text-red-500 hover:bg-red-50" onClick={() => handleRejectUser(u.id)}><XCircle className="w-3.5 h-3.5" /></Button></div>)}
                      {u.status === 'active' && u.role !== 'customer' && (<Button size="sm" variant="ghost" className="h-7 text-amber-600 hover:bg-amber-50" onClick={() => handleSuspendUser(u.id)}><Ban className="w-3.5 h-3.5" /></Button>)}
                      {u.status === 'suspended' && (<Button size="sm" variant="ghost" className="h-7 text-emerald-600 hover:bg-emerald-50" onClick={() => handleActivateUser(u.id)}><RotateCcw className="w-3.5 h-3.5" /></Button>)}
                    </td>
                  </tr>))}</tbody></table></div>
                </div>
              </div>
            )}

            {/* PRODUCTS */}
            {view === 'admin_products' && (
              <div>
                <h2 className="text-2xl font-bold mb-4">Products</h2>
                <div className="space-y-3">{products.map((p: any) => (<Card key={p.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div className="flex items-center gap-3 min-w-0"><div className="w-12 h-12 bg-amber-50 rounded-lg flex items-center justify-center text-xl flex-shrink-0 overflow-hidden">{p.image ? <img src={p.image} alt={p.title} className="w-full h-full object-cover" /> : <span>📦</span>}</div><div className="min-w-0"><h3 className="font-semibold text-sm truncate">{p.title}</h3><p className="text-xs text-gray-500">{p.shopOwner?.user?.name} · {p.category} · ₹{p.price} · Stock: {p.stock}</p></div></div><div className="flex items-center gap-2 flex-shrink-0"><Badge className={sc(p.status)}>{p.status}</Badge>{p.status === 'pending' && (<><Button size="sm" className="h-7 bg-emerald-600 hover:bg-emerald-700" onClick={() => handleApproveProduct(p.id)}>Approve</Button><Button size="sm" variant="outline" className="h-7 text-red-500" onClick={() => setRejectTarget(p)}>Reject</Button></>)}</div></Card>))}</div>
              </div>
            )}

            {/* ORDERS — clickable */}
            {view === 'admin_orders' && (
              <div>
                <h2 className="text-2xl font-bold mb-4">Orders</h2>
                <div className="space-y-3">{orders.map((o: any) => (<Card key={o.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openDetail('order', o.id)}><div className="p-4 flex flex-wrap items-center justify-between gap-2 border-b"><div><p className="font-bold text-sm">{o.orderNumber}</p><p className="text-xs text-gray-500">{o.user?.name} · {fmtDate(o.createdAt)}</p></div><div className="flex items-center gap-2 flex-wrap"><Badge className={sc(o.orderStatus)}>{o.orderStatus}</Badge><Badge variant="outline">{o.paymentMethod}</Badge>{!o.deliveryAssignments?.length && (o.orderStatus === 'confirmed' || o.orderStatus === 'pending') && (<Button size="sm" className="h-7 bg-blue-600 hover:bg-blue-700" onClick={e => { e.stopPropagation(); setAssignDialog(o); setSelectedDeliveryBoy('') }}>Assign</Button>)}{o.deliveryAssignments?.[0] && (<Badge className="bg-blue-100 text-blue-700">{o.deliveryAssignments[0].deliveryBoy?.user?.name}</Badge>)}</div></div><CardContent className="p-4">{o.items?.map((i: any) => (<div key={i.id} className="text-sm flex justify-between py-0.5"><span>{i.productName} × {i.quantity}</span><span>₹{i.totalPrice}</span></div>))}<Separator className="my-2" /><div className="flex justify-between font-bold text-sm"><span>Total</span><span>₹{o.totalAmount}</span></div></CardContent></Card>))}</div>
              </div>
            )}

            {/* PAYMENTS */}
            {view === 'admin_payments' && (
              <div>
                <h2 className="text-2xl font-bold mb-4">Payments</h2>
                <div className="space-y-3">{payments.map((p: any) => (<Card key={p.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div><p className="font-semibold text-sm">₹{p.amount} · {p.paymentMethod?.toUpperCase()}</p><p className="text-xs text-gray-500">{p.user?.name} · Order #{p.order?.orderNumber}</p><p className="text-xs text-gray-400">{fmtDateTime(p.createdAt)}</p></div><div className="flex items-center gap-2"><Badge className={sc(p.paymentStatus)}>{p.paymentStatus === 'pending_verification' ? 'Awaiting Verification' : p.paymentStatus === 'completed' ? 'Verified' : p.paymentStatus === 'rejected' ? 'Rejected' : p.paymentStatus === 'pending' ? 'COD' : p.paymentStatus}</Badge>{p.paymentStatus === 'pending_verification' && (<><Button size="sm" className="h-7 bg-emerald-600 hover:bg-emerald-700" onClick={() => handleApprovePayment(p.id)}>Approve</Button><Button size="sm" variant="outline" className="h-7 text-red-500 border-red-200 hover:bg-red-50" onClick={() => handleRejectPayment(p.id)}>Reject</Button></>)}{p.paymentStatus === 'pending' && (<Badge variant="outline" className="text-gray-400">COD</Badge>)}</div></Card>))}</div>
              </div>
            )}

            {/* DELIVERY */}
            {view === 'admin_delivery' && (
              <div>
                <h2 className="text-2xl font-bold mb-6">Delivery</h2>
                <h3 className="font-bold mb-3">Delivery Boys</h3>
                <div className="grid sm:grid-cols-2 gap-3 mb-8">{deliveryBoys.map((d: any) => (
                  <Card key={d.id} className="p-4">
                    <div className="flex items-center justify-between mb-2"><div className="flex items-center gap-2"><div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-sm font-bold text-blue-700">{d.user?.name?.[0]}</div><div><p className="font-semibold text-sm">{d.user?.name}</p><p className="text-xs text-gray-500">{d.vehicleType || 'N/A'} · {d.vehicleNumber || 'N/A'}</p></div></div><Badge className={sc(d.status)}>{d.status}</Badge></div>
                    <div className="flex gap-4 text-xs text-gray-500"><span>Deliveries: {d.totalDeliveries || 0}</span><span>Rating: {d.rating || 'N/A'}</span></div>
                    {d.status === 'pending' && (<div className="flex gap-2 mt-3"><Button size="sm" className="h-7 bg-emerald-600 hover:bg-emerald-700" onClick={async () => { if (await act('approve_user', { userId: d.userId })) loadDeliveryBoys() }}>Approve</Button><Button size="sm" variant="outline" className="h-7 text-red-500" onClick={async () => { if (await act('reject_user', { userId: d.userId })) loadDeliveryBoys() }}>Reject</Button></div>)}
                  </Card>
                ))}</div>
              </div>
            )}

            {/* NEEDS — clickable */}
            {view === 'admin_needs' && (
              <div>
                <h2 className="text-2xl font-bold mb-4">All Needs</h2>
                <div className="space-y-3">{needs.map((n: any) => (
                  <Card key={n.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openDetail('need', n.id)}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2"><h3 className="font-bold text-sm">{n.title}</h3><Badge className={sc(n.status)}>{n.status}</Badge></div>
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">{n.description}</p>
                      <div className="flex flex-wrap gap-3 text-xs text-gray-500"><span className="flex items-center gap-1"><Users className="w-3 h-3" />{n.user?.name}</span><span className="flex items-center gap-1"><Clock className="w-3 h-3" />{n.urgency}</span><span className="flex items-center gap-1"><IndianRupee className="w-3 h-3" />{n.priceType === 'exact' ? `₹${n.exactPrice}` : n.priceType === 'minmax' ? `₹${n.minPrice}-${n.maxPrice}` : 'N/A'}</span><span>{n.offers?.length || 0} offers</span><span>{n.comments?.length || 0} comments</span></div>
                    </CardContent>
                  </Card>
                ))}</div>
              </div>
            )}

            {/* WITHDRAWALS */}
            {view === 'admin_withdrawals' && (
              <div>
                <h2 className="text-2xl font-bold mb-4">Withdrawal Requests</h2>
                <div className="space-y-3">{withdrawals.length === 0 && <p className="text-sm text-gray-500">No withdrawal requests</p>}{withdrawals.map((w: any) => (
                  <Card key={w.id} className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center text-xs font-bold text-emerald-700">{w.deliveryBoy?.user?.name?.[0]}</div>
                          <p className="font-semibold text-sm">{w.deliveryBoy?.user?.name}</p>
                          <Badge className={sc(w.status)}>{w.status}</Badge>
                        </div>
                        <div className="flex flex-wrap gap-3 text-xs text-gray-500 ml-10">
                          <span className="flex items-center gap-1"><IndianRupee className="w-3 h-3" />₹{w.amount}</span>
                          <span className="flex items-center gap-1"><ArrowDownToLine className="w-3 h-3" />{w.upiId || 'N/A'}</span>
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{fmtDateTime(w.createdAt)}</span>
                        </div>
                        {w.reason && <p className="text-xs text-red-500 ml-10">Rejected: {w.reason}</p>}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {w.status === 'pending' && (
                          <>
                            <Button size="sm" className="h-7 bg-emerald-600 hover:bg-emerald-700" onClick={() => handleApproveWithdrawal(w.id)}><CheckCircle className="w-3.5 h-3.5 mr-1" />Approve</Button>
                            <Button size="sm" variant="outline" className="h-7 text-red-500 border-red-200 hover:bg-red-50" onClick={() => handleRejectWithdrawal(w.id)}><XCircle className="w-3.5 h-3.5 mr-1" />Reject</Button>
                          </>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}</div>
              </div>
            )}

            {/* SETTINGS */}
            {view === 'admin_settings' && (
              <div>
                <h2 className="text-2xl font-bold mb-6">Settings</h2>
                <div className="space-y-6 max-w-lg">
                  <Card className="p-5">
                    <CardHeader className="p-0 mb-4"><CardTitle className="text-base flex items-center gap-2"><IndianRupee className="w-4 h-4" />UPI ID</CardTitle></CardHeader>
                    <div><Label className="text-sm">UPI ID</Label><Input value={appSettings.upi_id || ''} onChange={e => setAppSettings({ ...appSettings, upi_id: e.target.value })} className="mt-1" placeholder="admin@ybl" /><p className="text-xs text-gray-400 mt-1">Your UPI ID shown to customers and delivery boys</p></div>
                    <Button className="mt-3 bg-emerald-600 hover:bg-emerald-700" size="sm" onClick={() => saveSetting('upi_id', appSettings.upi_id || '')} disabled={settingsLoading}>{settingsLoading ? 'Saving...' : 'Save UPI ID'}</Button>
                  </Card>
                  <Card className="p-5">
                    <CardHeader className="p-0 mb-4"><CardTitle className="text-base flex items-center gap-2"><QrCode className="w-4 h-4" />Payment QR / UPI Link</CardTitle></CardHeader>
                    <div><Label className="text-sm">UPI Payment Link</Label><Input value={appSettings.payment_qr_data || ''} onChange={e => setAppSettings({ ...appSettings, payment_qr_data: e.target.value })} className="mt-1" placeholder="upi://pay?pa=..." /><p className="text-xs text-gray-400 mt-1">This UPI link will be shown to customers for online payment</p></div>
                    <Button className="mt-3 bg-emerald-600 hover:bg-emerald-700" size="sm" onClick={() => saveSetting('payment_qr_data', appSettings.payment_qr_data || '')} disabled={settingsLoading}>{settingsLoading ? 'Saving...' : 'Save QR Setting'}</Button>
                  </Card>
                  <Card className="p-5">
                    <CardHeader className="p-0 mb-4"><CardTitle className="text-base flex items-center gap-2"><Banknote className="w-4 h-4" />Platform Fee Per Order</CardTitle></CardHeader>
                    <div><Label className="text-sm">Fixed Platform Fee (₹)</Label><Input type="number" value={appSettings.platform_fee_per_order || ''} onChange={e => setAppSettings({ ...appSettings, platform_fee_per_order: e.target.value })} className="mt-1" placeholder="10" /><p className="text-xs text-gray-400 mt-1">Fixed amount you take from every order as platform fee, regardless of order value</p></div>
                    <Button className="mt-3 bg-emerald-600 hover:bg-emerald-700" size="sm" onClick={() => saveSetting('platform_fee_per_order', appSettings.platform_fee_per_order || '')} disabled={settingsLoading}>{settingsLoading ? 'Saving...' : 'Save Platform Fee'}</Button>
                  </Card>
                  <Card className="p-5">
                    <CardHeader className="p-0 mb-4"><CardTitle className="text-base flex items-center gap-2"><Banknote className="w-4 h-4" />Delivery Earning Per Order</CardTitle></CardHeader>
                    <div><Label className="text-sm">Fixed Amount per Delivery (₹)</Label><Input type="number" value={appSettings.delivery_earning_per_order || ''} onChange={e => setAppSettings({ ...appSettings, delivery_earning_per_order: e.target.value })} className="mt-1" placeholder="30" /><p className="text-xs text-gray-400 mt-1">Fixed amount paid to delivery boy per completed delivery, regardless of order value</p></div>
                    <Button className="mt-3 bg-emerald-600 hover:bg-emerald-700" size="sm" onClick={() => saveSetting('delivery_earning_per_order', appSettings.delivery_earning_per_order || '')} disabled={settingsLoading}>{settingsLoading ? 'Saving...' : 'Save Earning'}</Button>
                  </Card>
                  <Card className="p-5">
                    <CardHeader className="p-0 mb-4"><CardTitle className="text-base flex items-center gap-2"><Banknote className="w-4 h-4" />Delivery Fee</CardTitle></CardHeader>
                    <div><Label className="text-sm">Delivery Fee (₹)</Label><Input type="number" value={appSettings.delivery_fee || ''} onChange={e => setAppSettings({ ...appSettings, delivery_fee: e.target.value })} className="mt-1" placeholder="30" /><p className="text-xs text-gray-400 mt-1">Delivery fee charged to customers on orders below ₹500</p></div>
                    <Button className="mt-3 bg-emerald-600 hover:bg-emerald-700" size="sm" onClick={() => saveSetting('delivery_fee', appSettings.delivery_fee || '')} disabled={settingsLoading}>{settingsLoading ? 'Saving...' : 'Save Delivery Fee'}</Button>
                  </Card>
                  <Card className="p-5">
                    <CardHeader className="p-0 mb-4"><CardTitle className="text-base flex items-center gap-2"><Shield className="w-4 h-4" />App Info</CardTitle></CardHeader>
                    <div className="space-y-2 text-sm"><div className="flex justify-between"><span className="text-gray-500">Total Users</span><span className="font-medium">{stats.totalUsers || 0}</span></div><div className="flex justify-between"><span className="text-gray-500">Total Orders</span><span className="font-medium">{stats.totalOrders || 0}</span></div><div className="flex justify-between"><span className="text-gray-500">Approved Products</span><span className="font-medium">{stats.totalProducts || 0}</span></div><div className="flex justify-between"><span className="text-gray-500">Delivery Boys</span><span className="font-medium">{stats.totalDeliveryBoys || 0}</span></div><Separator className="my-1" /><div className="flex justify-between font-medium text-emerald-700"><span>Platform Earnings</span><span>₹{(stats.totalPlatformEarnings || 0).toLocaleString()}</span></div></div>
                  </Card>
                </div>
              </div>
            )}
          </main>

          {/* Mobile nav */}
          <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t shadow-[0_-2px_10px_rgba(0,0,0,0.05)] z-40">
            <ScrollArea className="w-full"><div className="flex min-w-max">{navItems.map(item => (<button key={item.id} onClick={() => setView(item.id)} className={`flex flex-col items-center py-2.5 px-3 gap-0.5 transition-colors min-w-[4rem] ${view === item.id ? 'text-emerald-600' : 'text-gray-400'}`}><item.icon className="w-4 h-4" /><span className="text-[10px] font-medium">{item.label}</span></button>))}</div></ScrollArea>
          </nav>
        </div>
      </div>
    </div>

    <DetailDialog />

    <Dialog open={!!assignDialog} onOpenChange={() => setAssignDialog(null)}>
      <DialogContent><DialogHeader><DialogTitle>Assign Delivery Boy</DialogTitle></DialogHeader><div className="space-y-4"><p className="text-sm text-gray-600">Order: {assignDialog?.orderNumber} · ₹{assignDialog?.totalAmount}</p><Select value={selectedDeliveryBoy} onValueChange={setSelectedDeliveryBoy}><SelectTrigger><SelectValue placeholder="Select delivery boy" /></SelectTrigger><SelectContent>{deliveryBoys.filter((d: any) => d.status === 'approved').map((d: any) => (<SelectItem key={d.id} value={String(d.id)}>{d.user?.name} ({d.vehicleType || 'Vehicle'})</SelectItem>))}</SelectContent></Select><div className="flex gap-3"><Button variant="outline" className="flex-1" onClick={() => setAssignDialog(null)}>Cancel</Button><Button className="flex-1 bg-blue-600 hover:bg-blue-700" onClick={handleAssignDelivery}>Assign</Button></div></div></DialogContent>
    </Dialog>

    <Dialog open={!!rejectTarget} onOpenChange={() => setRejectTarget(null)}>
      <DialogContent><DialogHeader><DialogTitle>Reject Product</DialogTitle></DialogHeader><div className="space-y-4"><p className="text-sm">Product: {rejectTarget?.title}</p><div><Label>Reason</Label><Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} className="mt-1" rows={3} /></div><div className="flex gap-3"><Button variant="outline" className="flex-1" onClick={() => setRejectTarget(null)}>Cancel</Button><Button className="flex-1 bg-red-600 hover:bg-red-700" onClick={() => handleRejectProduct(rejectTarget?.id)}>Reject</Button></div></div></DialogContent>
    </Dialog>
    </>
  )
}
