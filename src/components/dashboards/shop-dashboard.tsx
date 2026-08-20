'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuthStore } from '@/store/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Package, PlusCircle, ShoppingCart, LogOut, X, Pencil, Store,
  Phone, Mail, MapPin, Calendar, AlertCircle, ChevronRight,
  Clock, Camera, Upload, IndianRupee,
  CheckCircle, Search, RefreshCw
} from 'lucide-react'
import { toast } from 'sonner'
import { StockManager } from './stock-manager'

const headers = { 'Content-Type': 'application/json' }
function authH(token: string | null) { return { ...headers, 'Authorization': `Bearer ${token}` } }

const categoryEmoji = (c: string) => {
  const m: any = { 'Fruits': '🥭', 'Dairy': '🥛', 'Dairy & Eggs': '🥛', 'Grains & Rice': '🌾', 'Spices': '🌶️', 'Cooking Oil': '🫒', 'Pulses': '🫘', 'Beverages': '🍵', 'Sweeteners': '🍯', 'Dry Fruits': '🥜', 'Organic': '🌿', 'Spreads': '🧈' }
  return m[c] || '🛒'
}

export function ShopDashboard() {
  const { user, token, view, setView, logout } = useAuthStore()

  // Products
  const [products, setProducts] = useState<any[]>([])
  const [productsLoading, setProductsLoading] = useState(false)
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [editProduct, setEditProduct] = useState<any>(null)
  const [productSearch, setProductSearch] = useState('')
  const [productFilter, setProductFilter] = useState('all') // all, approved, pending, rejected
  const [productImage, setProductImage] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Orders
  const [orders, setOrders] = useState<any[]>([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [orderFilter, setOrderFilter] = useState('all')

  // Profile
  const [profile, setProfile] = useState<any>(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [editProfile, setEditProfile] = useState(false)
  const [editName, setEditName] = useState('')
  const [editMobile, setEditMobile] = useState('')
  const [editShopName, setEditShopName] = useState('')
  const [editShopAddr, setEditShopAddr] = useState('')
  const [showChangePw, setShowChangePw] = useState(false)
  const [curPw, setCurPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [saving, setSaving] = useState(false)

  // Analytics
  const [analytics, setAnalytics] = useState<any>(null)

  // === LOADERS ===
  const loadProducts = async () => {
    setProductsLoading(true)
    try {
      const res = await fetch('/api/products?status=all', { headers: authH(token) })
      const d = await res.json()
      setProducts(d.products || [])
    } catch { toast.error('Failed to load products') }
    setProductsLoading(false)
  }

  const loadOrders = async () => {
    setOrdersLoading(true)
    try {
      const res = await fetch('/api/shop?section=orders', { headers: authH(token) })
      const d = await res.json()
      setOrders(d.orders || [])
    } catch { toast.error('Failed to load orders') }
    setOrdersLoading(false)
  }

  const loadProfile = async () => {
    setProfileLoading(true)
    try {
      const res = await fetch('/api/shop?section=profile', { headers: authH(token) })
      const d = await res.json()
      setProfile(d)
      setAnalytics(d.stats)
      if (d.user) { setEditName(d.user.name || ''); setEditMobile(d.user.mobile || '') }
      if (d.shopOwner) { setEditShopName(d.shopOwner.shopName || ''); setEditShopAddr(d.shopOwner.shopAddress || '') }
    } catch { toast.error('Failed to load profile') }
    setProfileLoading(false)
  }

  // Load on mount based on current view
  useEffect(() => {
    const validViews = ['products', 'orders', 'stock', 'profile']
    const v = validViews.includes(view) ? view : 'products'
    if (v === 'products') loadProducts()
    else if (v === 'orders') loadOrders()
    else if (v === 'profile') loadProfile()
    if (!validViews.includes(view)) setView('products')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // === ACTIONS ===
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { toast.error('Image must be under 2MB'); return }
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return }
    const reader = new FileReader()
    reader.onload = () => {
      setProductImage(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const resetProductForm = () => {
    setProductImage('')
    setEditProduct(null)
    setShowAddProduct(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const addProduct = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const body: any = {
      title: fd.get('title'),
      description: fd.get('description'),
      price: fd.get('price'),
      stock: fd.get('stock'),
      category: fd.get('category'),
      image: productImage
    }
    if (!body.title || !body.price || !body.stock) { toast.error('Title, Price and Stock are required'); return }

    const res = await fetch('/api/products', {
      method: 'POST', headers: authH(token), body: JSON.stringify(body)
    })
    if (res.ok) {
      toast.success('Product added! Pending admin approval.')
      resetProductForm()
      loadProducts()
    } else {
      const d = await res.json()
      toast.error(d.error || 'Failed to add product')
    }
  }

  const saveProfile = async () => {
    if (!editName.trim()) { toast.error('Name is required'); return }
    if (!editShopName.trim()) { toast.error('Shop name is required'); return }
    setSaving(true)
    const res = await fetch('/api/shop', {
      method: 'POST', headers: authH(token),
      body: JSON.stringify({ action: 'update_profile', name: editName, mobile: editMobile, shopName: editShopName, shopAddress: editShopAddr })
    })
    if (res.ok) { toast.success('Profile updated!'); setEditProfile(false); loadProfile() }
    else toast.error('Failed to update profile')
    setSaving(false)
  }

  const changePassword = async () => {
    if (newPw.length < 6) { toast.error('Min 6 characters'); return }
    setSaving(true)
    const res = await fetch('/api/profile', {
      method: 'PUT', headers: authH(token),
      body: JSON.stringify({ action: 'change_password', currentPassword: curPw, newPassword: newPw })
    })
    if (res.ok) { toast.success('Password changed!'); setShowChangePw(false); setCurPw(''); setNewPw('') }
    else { const d = await res.json(); toast.error(d.error || 'Failed') }
    setSaving(false)
  }

  // === HELPERS ===
  const statusColor = (s: string) => ({
    pending: 'bg-amber-100 text-amber-700', approved: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-red-100 text-red-700', delivered: 'bg-emerald-100 text-emerald-700',
    confirmed: 'bg-sky-100 text-sky-700', processing: 'bg-purple-100 text-purple-700',
    shipped: 'bg-violet-100 text-violet-700', cancelled: 'bg-red-100 text-red-700',
    active: 'bg-emerald-100 text-emerald-700', assigned: 'bg-amber-100 text-amber-700',
    paid: 'bg-emerald-100 text-emerald-700', completed: 'bg-emerald-100 text-emerald-700'
  })[s] || 'bg-gray-100 text-gray-700'
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  const fmtDateTime = (d: string) => new Date(d).toLocaleString('en-IN')

  // Filtered products
  const filteredProducts = products.filter((p: any) => {
    if (productFilter !== 'all' && p.status !== productFilter) return false
    if (productSearch && !p.title.toLowerCase().includes(productSearch.toLowerCase()) && !p.category?.toLowerCase().includes(productSearch.toLowerCase())) return false
    return true
  })

  const filteredOrders = orders.filter((o: any) => orderFilter === 'all' || o.orderStatus === orderFilter)

  // Stats
  const pendingProducts = products.filter((p: any) => p.status === 'pending').length
  const approvedCount = products.filter((p: any) => p.status === 'approved').length
  const rejectedProducts = products.filter((p: any) => p.status === 'rejected').length

  const handleNav = (id: string) => {
    setSelectedOrder(null)
    setShowAddProduct(false)
    setView(id)
    if (id === 'products') loadProducts()
    else if (id === 'orders') loadOrders()
    else if (id === 'profile') loadProfile()
  }

  const navItems = [
    { id: 'products', label: 'Products', icon: Package },
    { id: 'orders', label: 'Orders', icon: ShoppingCart },
    { id: 'stock', label: 'Stock', icon: RefreshCw },
    { id: 'profile', label: 'Profile', icon: Store },
  ]

  // ===================== RENDER =====================
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b shadow-sm">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          {selectedOrder ? (
            <div className="flex items-center gap-3">
              <button onClick={() => setSelectedOrder(null)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
              <span className="font-bold text-sm truncate max-w-[200px]">Order Details</span>
            </div>
          ) : showAddProduct ? (
            <div className="flex items-center gap-3">
              <button onClick={resetProductForm} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
              <span className="font-bold text-sm">{editProduct ? 'Edit Product' : 'Add New Product'}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="font-bold text-sm">Shop Panel</span>
                <p className="text-[10px] text-gray-500 -mt-0.5">{profile?.shopOwner?.shopName || user?.name}</p>
              </div>
            </div>
          )}
          {!selectedOrder && !showAddProduct && (
            <button onClick={logout} className="p-2 hover:bg-red-50 rounded-full text-red-500 transition-colors">
              <LogOut className="w-5 h-5" />
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 pb-20 pt-4">

        {/* ===== ADD/EDIT PRODUCT VIEW ===== */}
        {showAddProduct && (
          <div className="space-y-4">
            {/* Image Upload Area */}
            <Card className="border-2 border-dashed border-amber-200 bg-amber-50/30 cursor-pointer hover:border-amber-400 hover:bg-amber-50/50 transition-all" onClick={() => fileInputRef.current?.click()}>
              <CardContent className="p-6 text-center">
                {productImage ? (
                  <div className="relative">
                    <img src={productImage} alt="Product" className="w-full max-h-64 object-contain rounded-xl mx-auto" />
                    <button onClick={(e) => { e.stopPropagation(); setProductImage(''); if (fileInputRef.current) fileInputRef.current.value = '' }} className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 shadow-lg">
                      <X className="w-4 h-4" />
                    </button>
                    <p className="text-xs text-gray-500 mt-2">Click to change image</p>
                  </div>
                ) : (
                  <div className="py-6">
                    <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                      <Upload className="w-8 h-8 text-amber-500" />
                    </div>
                    <p className="font-semibold text-gray-700">Upload Product Image</p>
                    <p className="text-sm text-gray-500 mt-1">Click to browse or drag & drop</p>
                    <p className="text-xs text-gray-400 mt-2">JPG, PNG, WebP — Max 2MB</p>
                  </div>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </CardContent>
            </Card>

            {/* Product Form */}
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Product Details</CardTitle></CardHeader>
              <CardContent>
                <form onSubmit={addProduct} className="space-y-4">
                  <div><Label className="text-xs font-medium">Product Name *</Label><Input name="title" placeholder="e.g. Organic Basmati Rice 5kg" required className="mt-1 h-11" /></div>
                  <div><Label className="text-xs font-medium">Category</Label>
                    <Input name="category" placeholder="e.g. Fruits, Dairy, Grains & Rice" className="mt-1 h-11" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label className="text-xs font-medium">Price (₹) *</Label><Input name="price" type="number" step="0.01" min="0" required className="mt-1 h-11" placeholder="0.00" /></div>
                    <div><Label className="text-xs font-medium">Stock Quantity *</Label><Input name="stock" type="number" min="0" required className="mt-1 h-11" placeholder="0" /></div>
                  </div>
                  <div><Label className="text-xs font-medium">Description</Label><Textarea name="description" placeholder="Describe the product - quality, origin, weight, etc." className="mt-1 resize-none" rows={3} /></div>
                  <div className="flex gap-3 pt-2">
                    <Button type="button" variant="outline" className="flex-1" onClick={resetProductForm}>Cancel</Button>
                    <Button type="submit" className="flex-1 bg-amber-500 hover:bg-amber-600" disabled={saving}>{saving ? 'Adding...' : 'Add Product'}</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ===== ORDER DETAIL VIEW ===== */}
        {selectedOrder && !showAddProduct && (
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <h2 className="font-bold text-lg">#{selectedOrder.orderNumber}</h2>
                    <p className="text-sm text-gray-500">{selectedOrder.user?.name} · {fmtDateTime(selectedOrder.createdAt)}</p>
                  </div>
                  <Badge className={statusColor(selectedOrder.orderStatus)}>{selectedOrder.orderStatus}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-[10px] text-gray-500">Payment</p>
                    <p className="font-semibold text-sm mt-0.5">{selectedOrder.paymentMethod?.toUpperCase()}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-[10px] text-gray-500">Payment Status</p>
                    <p className={`font-semibold text-sm mt-0.5 ${selectedOrder.paymentStatus === 'paid' ? 'text-emerald-600' : 'text-amber-600'}`}>{selectedOrder.paymentStatus}</p>
                  </div>
                </div>
                {selectedOrder.shippingAddress && (
                  <div className="flex items-start gap-2 text-sm bg-gray-50 p-3 rounded-lg mb-3">
                    <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                    <span className="text-gray-600">{selectedOrder.shippingAddress}</span>
                  </div>
                )}
                {selectedOrder.deliveryAssignments?.[0] && (
                  <div className="bg-sky-50 p-3 rounded-lg mb-3 text-sm">
                    <p className="font-medium">Delivery: {selectedOrder.deliveryAssignments[0].deliveryBoy?.user?.name}</p>
                    <p className="text-xs text-gray-500">Status: {selectedOrder.deliveryAssignments[0].status}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Your Items in This Order</CardTitle></CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="space-y-2">
                  {selectedOrder._myItems?.map((i: any) => (
                    <div key={i.id} className="flex justify-between text-sm bg-amber-50 p-3 rounded-lg border border-amber-100">
                      <div>
                        <p className="font-medium">{i.productName}</p>
                        <p className="text-xs text-gray-500">Qty: {i.quantity} × ₹{i.unitPrice}</p>
                      </div>
                      <p className="font-bold text-emerald-700">₹{i.totalPrice}</p>
                    </div>
                  ))}
                  <Separator className="my-2" />
                  {(() => {
                    const myTotal = selectedOrder._myItems?.reduce((s: number, i: any) => s + i.totalPrice, 0) || 0
                    const orderItemTotal = selectedOrder.items?.reduce((s: number, i: any) => s + i.totalPrice, 0) || myTotal
                    const pfDeduction = orderItemTotal > 0 ? Math.round((myTotal / orderItemTotal) * (selectedOrder.commissionAmount || 10)) : 0
                    return (
                      <div className="bg-amber-50/50 rounded-lg p-3 space-y-1.5 text-sm">
                        <div className="flex justify-between"><span className="text-gray-600">Items Total</span><span>₹{myTotal}</span></div>
                        <div className="flex justify-between"><span className="text-gray-600">Platform Fee</span><span className="text-red-500">-₹{pfDeduction}</span></div>
                        <Separator className="my-1" />
                        <div className="flex justify-between font-bold"><span>Your Earning</span><span className="text-emerald-700">₹{myTotal - pfDeduction}</span></div>
                      </div>
                    )
                  })()}
                </div>
              </CardContent>
            </Card>

            {selectedOrder.statusLogs?.length > 0 && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Status Timeline</CardTitle></CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="space-y-3">
                    {selectedOrder.statusLogs.map((l: any, i: number) => (
                      <div key={i} className="flex gap-3 text-sm">
                        <div className="flex flex-col items-center">
                          <div className="w-3 h-3 rounded-full bg-amber-500" />
                          {i < selectedOrder.statusLogs.length - 1 && <div className="w-px h-6 bg-gray-200" />}
                        </div>
                        <div>
                          <p className="font-medium capitalize">{l.status}</p>
                          <p className="text-xs text-gray-400">{l.notes} · {fmtDateTime(l.createdAt)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* ===== PRODUCTS VIEW ===== */}
        {!selectedOrder && !showAddProduct && view === 'products' && (
          <div>
            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-2 mb-5">
              <Card className="p-3 text-center">
                <Package className="w-4 h-4 mx-auto text-gray-400 mb-1" />
                <p className="text-xl font-bold">{products.length}</p>
                <p className="text-[10px] text-gray-500">Total</p>
              </Card>
              <Card className="p-3 text-center">
                <CheckCircle className="w-4 h-4 mx-auto text-emerald-500 mb-1" />
                <p className="text-xl font-bold text-emerald-600">{approvedCount}</p>
                <p className="text-[10px] text-gray-500">Approved</p>
              </Card>
              <Card className="p-3 text-center">
                <Clock className="w-4 h-4 mx-auto text-amber-500 mb-1" />
                <p className="text-xl font-bold text-amber-600">{pendingProducts}</p>
                <p className="text-[10px] text-gray-500">Pending</p>
              </Card>
              <Card className="p-3 text-center">
                <AlertCircle className="w-4 h-4 mx-auto text-red-500 mb-1" />
                <p className="text-xl font-bold text-red-600">{rejectedProducts}</p>
                <p className="text-[10px] text-gray-500">Rejected</p>
              </Card>
            </div>

            {/* Search + Filter + Add */}
            <div className="flex items-center gap-2 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input placeholder="Search products..." value={productSearch} onChange={e => setProductSearch(e.target.value)} className="pl-9 h-10" />
              </div>
              <Button size="sm" variant="outline" className="h-10" onClick={loadProducts} disabled={productsLoading}><RefreshCw className={`w-4 h-4 ${productsLoading ? 'animate-spin' : ''}`} /></Button>
              <Button onClick={() => { resetProductForm(); setShowAddProduct(true) }} className="bg-amber-500 hover:bg-amber-600 h-10 px-3">
                <PlusCircle className="w-4 h-4 mr-1" />Add
              </Button>
            </div>

            {/* Filter Chips */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
              {['all', 'approved', 'pending', 'rejected'].map(f => (
                <button key={f} onClick={() => setProductFilter(f)} className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${productFilter === f ? 'bg-amber-500 text-white' : 'bg-white text-gray-600 border hover:bg-gray-50'}`}>{f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}</button>
              ))}
            </div>

            {/* Product List */}
            {productsLoading ? (
              <div className="text-center py-16 text-gray-400"><RefreshCw className="w-8 h-8 mx-auto animate-spin" /><p className="mt-3">Loading products...</p></div>
            ) : !filteredProducts.length ? (
              <div className="text-center py-16 text-gray-400">
                <Package className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="font-medium">{productSearch || productFilter !== 'all' ? 'No products match your filter' : 'No products yet'}</p>
                <p className="text-sm mt-1">{productSearch || productFilter !== 'all' ? 'Try a different search or filter' : 'Add your first product to get started'}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredProducts.map((p: any) => (
                  <Card key={p.id} className="overflow-hidden">
                    <div className="flex">
                      {/* Product Image */}
                      <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center flex-shrink-0">
                        {p.image ? (
                          <img src={p.image} alt={p.title} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-3xl">{categoryEmoji(p.category)}</span>
                        )}
                      </div>
                      {/* Product Info */}
                      <div className="flex-1 p-3 min-w-0 flex flex-col justify-between">
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-semibold text-sm truncate">{p.title}</h3>
                            <Badge className={`${statusColor(p.status)} text-[10px] flex-shrink-0`}>{p.status}</Badge>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">{p.category || 'Uncategorized'} · Stock: {p.stock}</p>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <p className="font-bold text-emerald-700">₹{p.price}</p>
                          {p.status === 'rejected' && p.rejectionReason && (
                            <p className="text-xs text-red-500 truncate max-w-[150px]">{p.rejectionReason}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===== ORDERS VIEW ===== */}
        {!selectedOrder && !showAddProduct && view === 'orders' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Shop Orders</h2>
              <button onClick={loadOrders} disabled={ordersLoading}><RefreshCw className={`w-4 h-4 text-gray-500 ${ordersLoading ? 'animate-spin' : ''}`} /></button>
            </div>

            {/* Order Filter Chips */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
              {['all', 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'].map(f => (
                <button key={f} onClick={() => setOrderFilter(f)} className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${orderFilter === f ? 'bg-amber-500 text-white' : 'bg-white text-gray-600 border hover:bg-gray-50'}`}>{f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}</button>
              ))}
            </div>

            {ordersLoading ? (
              <div className="text-center py-16 text-gray-400"><RefreshCw className="w-8 h-8 mx-auto animate-spin" /><p className="mt-3">Loading orders...</p></div>
            ) : !filteredOrders.length ? (
              <div className="text-center py-16 text-gray-400">
                <ShoppingCart className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="font-medium">No orders yet</p>
                <p className="text-sm mt-1">Orders containing your products will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredOrders.map((o: any) => {
                  const myTotal = o._myItems?.reduce((s: number, i: any) => s + i.totalPrice, 0) || 0
                  const orderItemTotal = o.items?.reduce((s: number, i: any) => s + i.totalPrice, 0) || myTotal
                  const platformFeeDeduction = orderItemTotal > 0 ? Math.round((myTotal / orderItemTotal) * (o.commissionAmount || 10)) : 0
                  const myEarning = myTotal - platformFeeDeduction
                  return (
                    <Card key={o.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedOrder(o)}>
                      <div className="p-4 flex items-center justify-between border-b">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-sm">#{o.orderNumber}</p>
                            <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">{o.user?.name} · {fmtDate(o.createdAt)}</p>
                        </div>
                        <Badge className={statusColor(o.orderStatus)}>{o.orderStatus}</Badge>
                      </div>
                      <CardContent className="p-4 pt-3">
                        {o._myItems?.map((i: any) => (
                          <div key={i.id} className="text-sm flex justify-between py-0.5">
                            <span className="text-gray-600">{i.productName} × {i.quantity}</span>
                            <span>₹{i.totalPrice}</span>
                          </div>
                        ))}
                        <Separator className="my-2" />
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between text-gray-500">
                            <span>Items Total</span><span>₹{myTotal}</span>
                          </div>
                          <div className="flex justify-between text-gray-500">
                            <span>Platform Fee</span><span className="text-red-500">-₹{platformFeeDeduction}</span>
                          </div>
                          <div className="flex justify-between font-bold text-sm pt-1">
                            <span>Your Earning</span>
                            <span className="text-emerald-700">₹{myEarning}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ===== STOCK MANAGEMENT VIEW ===== */}
        {!selectedOrder && !showAddProduct && view === 'stock' && (
          <StockManager />
        )}
        {/* ===== PROFILE VIEW ===== */}
        {!selectedOrder && !showAddProduct && view === 'profile' && profile && (
          <div className="space-y-4">
            {/* Avatar Header */}
            <Card>
              <CardContent className="p-6 text-center">
                <Avatar className="w-20 h-20 mx-auto mb-3">
                  <AvatarFallback className="bg-amber-100 text-amber-700 text-2xl font-bold">
                    {profile.shopOwner?.shopName?.[0] || profile.user?.name?.[0] || 'S'}
                  </AvatarFallback>
                </Avatar>
                <h2 className="text-xl font-bold">{profile.shopOwner?.shopName}</h2>
                <p className="text-sm text-gray-500">{profile.user?.name} · {profile.user?.email}</p>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <Badge className="bg-amber-100 text-amber-700">Shop Owner</Badge>
                  <Badge className={statusColor(profile.shopOwner?.status || 'active')}>{profile.shopOwner?.status || 'active'}</Badge>
                </div>
                {!editProfile && (
                  <Button size="sm" variant="outline" className="mt-3" onClick={() => setEditProfile(true)}>
                    <Pencil className="w-3.5 h-3.5 mr-1" />Edit Profile
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="p-4 text-center">
                <Package className="w-5 h-5 mx-auto text-amber-500 mb-1" />
                <p className="text-2xl font-bold">{analytics?.totalProducts || 0}</p>
                <p className="text-xs text-gray-500">Products</p>
              </Card>
              <Card className="p-4 text-center">
                <ShoppingCart className="w-5 h-5 mx-auto text-emerald-600 mb-1" />
                <p className="text-2xl font-bold">{analytics?.totalOrderCount || 0}</p>
                <p className="text-xs text-gray-500">Orders</p>
              </Card>
              <Card className="p-4 text-center">
                <IndianRupee className="w-5 h-5 mx-auto text-emerald-600 mb-1" />
                <p className="text-2xl font-bold">₹{analytics?.netEarnings?.toLocaleString() || 0}</p>
                <p className="text-xs text-gray-500">Net Earnings</p>
              </Card>
              <Card className="p-4 text-center">
                <CheckCircle className="w-5 h-5 mx-auto text-emerald-600 mb-1" />
                <p className="text-2xl font-bold">{analytics?.approvedProducts || 0}</p>
                <p className="text-xs text-gray-500">Approved</p>
              </Card>
            </div>

            {/* Financial Summary */}
            <Card className="bg-amber-50/50 border-amber-100">
              <CardContent className="p-4">
                <h3 className="font-semibold text-sm mb-3">Financial Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-600">Total Sales (Items)</span><span className="font-medium">₹{analytics?.totalRevenue?.toLocaleString() || 0}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Platform Fees (₹{profile?.platformFee || 10}/order)</span><span className="font-medium text-red-600">-₹{analytics?.totalPlatformFees?.toLocaleString() || 0}</span></div>
                  <Separator />
                  <div className="flex justify-between font-bold text-emerald-700"><span>Your Net Earnings</span><span>₹{analytics?.netEarnings?.toLocaleString() || 0}</span></div>
                </div>
              </CardContent>
            </Card>

            {/* Pending/Rejected Breakdown */}
            {(analytics?.pendingProducts > 0 || analytics?.rejectedProducts > 0) && (
              <div className="grid grid-cols-2 gap-3">
                {analytics.pendingProducts > 0 && (
                  <Card className="p-3 flex items-center gap-3 border-amber-200 bg-amber-50/50">
                    <Clock className="w-5 h-5 text-amber-500" />
                    <div><p className="font-bold text-lg">{analytics.pendingProducts}</p><p className="text-xs text-gray-500">Pending Review</p></div>
                  </Card>
                )}
                {analytics.rejectedProducts > 0 && (
                  <Card className="p-3 flex items-center gap-3 border-red-200 bg-red-50/50">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    <div><p className="font-bold text-lg">{analytics.rejectedProducts}</p><p className="text-xs text-gray-500">Rejected</p></div>
                  </Card>
                )}
              </div>
            )}

            {/* Info Card */}
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold text-sm mb-3">Shop Information</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-3"><Store className="w-4 h-4 text-gray-400" /><span className="text-gray-600">{profile.shopOwner?.shopName}</span></div>
                  <div className="flex items-center gap-3"><MapPin className="w-4 h-4 text-gray-400" /><span className="text-gray-600">{profile.shopOwner?.shopAddress || 'Not set'}</span></div>
                  <div className="flex items-center gap-3"><Phone className="w-4 h-4 text-gray-400" /><span className="text-gray-600">{profile.user?.mobile || 'Not set'}</span></div>
                  <div className="flex items-center gap-3"><Mail className="w-4 h-4 text-gray-400" /><span className="text-gray-600">{profile.user?.email}</span></div>
                  <div className="flex items-center gap-3"><Calendar className="w-4 h-4 text-gray-400" /><span className="text-gray-600">Joined {fmtDate(profile.user?.createdAt)}</span></div>
                </div>
              </CardContent>
            </Card>

            {/* Edit Profile */}
            {editProfile && (
              <Card className="border-amber-200">
                <CardContent className="p-4 space-y-4">
                  <h3 className="font-semibold text-sm">Edit Profile</h3>
                  <div><Label className="text-xs">Shop Name *</Label><Input value={editShopName} onChange={e => setEditShopName(e.target.value)} className="mt-1" /></div>
                  <div><Label className="text-xs">Your Name *</Label><Input value={editName} onChange={e => setEditName(e.target.value)} className="mt-1" /></div>
                  <div><Label className="text-xs">Mobile</Label><Input value={editMobile} onChange={e => setEditMobile(e.target.value)} className="mt-1" /></div>
                  <div><Label className="text-xs">Shop Address</Label><Textarea value={editShopAddr} onChange={e => setEditShopAddr(e.target.value)} className="mt-1 resize-none" rows={2} /></div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => setEditProfile(false)}>Cancel</Button>
                    <Button className="flex-1 bg-amber-500 hover:bg-amber-600" onClick={saveProfile} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Change Password */}
            {!showChangePw ? (
              <Card className="cursor-pointer hover:shadow-sm transition-shadow" onClick={() => setShowChangePw(true)}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-red-50 rounded-lg flex items-center justify-center">
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Change Password</p>
                      <p className="text-xs text-gray-500">Update your account password</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </CardContent>
              </Card>
            ) : (
              <Card className="border-red-200">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm">Change Password</h3>
                    <button onClick={() => { setShowChangePw(false); setCurPw(''); setNewPw('') }}><X className="w-4 h-4 text-gray-400" /></button>
                  </div>
                  <div><Label className="text-xs">Current Password</Label><Input type="password" value={curPw} onChange={e => setCurPw(e.target.value)} className="mt-1" /></div>
                  <div><Label className="text-xs">New Password (min 6 chars)</Label><Input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} className="mt-1" /></div>
                  <Button className="w-full bg-red-600 hover:bg-red-700" onClick={changePassword} disabled={saving}>{saving ? 'Updating...' : 'Update Password'}</Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {!selectedOrder && !showAddProduct && view === 'profile' && !profile && (
          <div className="text-center py-16 text-gray-400">
            <Store className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>Loading profile...</p>
          </div>
        )}
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-[0_-2px_10px_rgba(0,0,0,0.05)] z-40">
        <div className="max-w-2xl mx-auto flex">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => handleNav(item.id)}
              className={`flex-1 flex flex-col items-center py-2.5 gap-0.5 transition-colors ${view === item.id && !selectedOrder && !showAddProduct ? 'text-amber-600' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
