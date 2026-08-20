'use client'

// TODO: This file is large (~1200 lines). Consider extracting into:
//   - views/HomeView, CartView, OrdersView, NeedsView, etc.
//   - shared/OrderCard, ProductCard, etc.

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useAuthStore } from '@/store/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Home, ShoppingCart, Package, PlusCircle, Clock, Search, Trash2, MapPin, X,
  MessageCircle, IndianRupee, Bell, LogOut, User, ChevronRight, ChevronLeft,
  Pencil, Camera, Eye, EyeOff, Shield, Star, ShoppingBag, Hash, Calendar,
  CheckCircle, AlertCircle, Truck, Phone, Mail, MapPinned, Plus, Minus, HelpCircle,
  Wallet, CreditCard, QrCode, MessageSquare
} from 'lucide-react'
import { ChatPanel } from '@/components/chat/chat-panel'
import { toast } from 'sonner'

const headers = { 'Content-Type': 'application/json' }
function authH(token: string | null) { return { ...headers, 'Authorization': `Bearer ${token}` } }

export function CustomerDashboard() {
  const { user, token, view, setView, logout } = useAuthStore()

  // Data states
  const [products, setProducts] = useState<any[]>([])
  const [allCategories, setAllCategories] = useState<string[]>([])
  const [cart, setCart] = useState<any>(null)
  const [orders, setOrders] = useState<any[]>([])
  const [needs, setNeeds] = useState<any[]>([])
  const [notifications, setNotifications] = useState<any[]>([])
  const [unread, setUnread] = useState(0)

  // UI states
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [loading, setLoading] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const [showCheckout, setShowCheckout] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const searchTimerRef = useRef<NodeJS.Timeout | null>(null)
  const searchLoadingRef = useRef(false)

  // Profile states
  const [profileData, setProfileData] = useState<any>(null)
  const [addresses, setAddresses] = useState<any[]>([])
  const [editProfile, setEditProfile] = useState(false)
  const [showChangePw, setShowChangePw] = useState(false)
  const [showAddrDialog, setShowAddrDialog] = useState(false)
  const [editingAddr, setEditingAddr] = useState<any>(null)

  // Need creation states
  const [needForm, setNeedForm] = useState({ title: '', description: '', priceType: 'unknown', exactPrice: '', minPrice: '', maxPrice: '', urgency: '1-2 days' })
  const [needLoading, setNeedLoading] = useState(false)

  // Payment states
  const [selectedPayment, setSelectedPayment] = useState<'cod' | 'online'>('cod')
  const [paymentSettings, setPaymentSettings] = useState<any>(null)

  // Profile edit form
  const [profileForm, setProfileForm] = useState({ name: '', mobile: '' })
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' })
  const [addrForm, setAddrForm] = useState({ fullAddress: '', landmark: '', pincode: '', city: '', state: '', isDefault: false })
  const [pwLoading, setPwLoading] = useState(false)
  const [profileLoading, setProfileLoading] = useState(false)
  const [addrLoading, setAddrLoading] = useState(false)

  // Chat state
  const [chatOrder, setChatOrder] = useState<{ orderId: number; orderNumber: string; peerName: string } | null>(null)

  // Product detail
  const [selectedProduct, setSelectedProduct] = useState<any>(null)

  const productsLoaded = useRef(false)

  // === DATA LOADERS ===
  const loadProducts = useCallback(async (searchTerm?: string, category?: string) => {
    try {
      const params = new URLSearchParams()
      const hasFilters = (searchTerm && searchTerm.trim()) || (category && category !== 'all')
      if (searchTerm && searchTerm.trim()) params.set('search', searchTerm.trim())
      if (category && category !== 'all') params.set('category', category)
      const query = params.toString() ? `?${params.toString()}` : ''
      const res = await fetch(`/api/products${query}`)
      const d = await res.json()
      const prods = d.products || []
      setProducts(prods)
      productsLoaded.current = true
      // Update categories from full (unfiltered) load only
      if (!hasFilters) {
        const cats = new Set(prods.map((p: any) => p.category).filter(Boolean))
        setAllCategories(['all', ...(Array.from(cats) as string[]).sort()])
      }
    } catch {
      toast.error('Failed to load products')
    }
  }, [])

  // Debounced server-side search
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    searchLoadingRef.current = true
    setSearchLoading(true)
    searchTimerRef.current = setTimeout(() => {
      searchLoadingRef.current = false
      loadProducts(search, selectedCategory).finally(() => setSearchLoading(false))
    }, 300)
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current) }
  }, [search, selectedCategory, loadProducts])

  // Category filter (client-side, for when server already returned search results)
  const filteredProducts = useMemo(() => {
    let result = products
    if (selectedCategory !== 'all') {
      result = result.filter((p: any) => p.category === selectedCategory)
    }
    return result
  }, [products, selectedCategory])

  const loadCart = useCallback(async () => {
    if (!user) return
    const res = await fetch('/api/cart', { headers: authH(token) })
    const d = await res.json()
    setCart(d.cart)
  }, [user, token])

  const loadOrders = useCallback(async () => {
    if (!user) return
    const res = await fetch('/api/orders', { headers: authH(token) })
    const d = await res.json()
    setOrders(d.orders || [])
  }, [user, token])

  const [confirmingDelivery, setConfirmingDelivery] = useState<number | null>(null)
  const confirmDelivery = async (orderId: number) => {
    setConfirmingDelivery(orderId)
    try {
      const res = await fetch('/api/orders', {
        method: 'PUT', headers: authH(token),
        body: JSON.stringify({ orderId })
      })
      if (res.ok) {
        toast.success('Delivery confirmed! Thank you for your order 🎉')
        loadOrders()
      } else {
        const d = await res.json()
        toast.error(d.error || 'Failed to confirm')
      }
    } catch { toast.error('Network error') }
    setConfirmingDelivery(null)
  }

  const loadNeeds = useCallback(async () => {
    if (!user) return
    const res = await fetch('/api/needs', { headers: authH(token) })
    const d = await res.json()
    setNeeds(d.needs || [])
  }, [user, token])

  const loadNotifications = useCallback(async () => {
    if (!user) return
    const res = await fetch('/api/notifications', { headers: authH(token) })
    const d = await res.json()
    setNotifications(d.notifications || [])
    setUnread(d.unread || 0)
  }, [user, token])

  const loadProfile = useCallback(async () => {
    if (!user) return
    try {
      const res = await fetch('/api/profile', { headers: authH(token) })
      if (res.ok) {
        const d = await res.json()
        setProfileData(d)
        setAddresses(d.addresses || [])
        setProfileForm({ name: d.user.name, mobile: d.user.mobile || '' })
      }
    } catch { /* ignore */ }
  }, [user, token])

  // Load payment settings
  const loadPaymentSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/settings', { headers: authH(token) })
      if (res.ok) {
        const d = await res.json()
        setPaymentSettings(d.settings || {})
      }
    } catch { /* ignore */ }
  }, [user, token])

  useEffect(() => { if (view === 'home' && !productsLoaded.current) loadProducts() }, [view, loadProducts])
  useEffect(() => { if (view === 'cart' && user) loadCart() }, [view, user, loadCart])
  useEffect(() => { if (view === 'orders' && user) loadOrders() }, [view, user, loadOrders])
  useEffect(() => { if (view === 'needs' && user) loadNeeds() }, [view, user, loadNeeds])
  useEffect(() => { if (view === 'profile' && user) loadProfile() }, [view, user, loadProfile])
  useEffect(() => { if (user) { loadNotifications(); loadCart(); loadPaymentSettings() } }, [user, loadNotifications, loadCart, loadPaymentSettings])

  // === ACTIONS ===
  const addToCart = async (productId: number) => {
    const res = await fetch('/api/cart', { method: 'POST', headers: authH(token), body: JSON.stringify({ productId, quantity: 1 }) })
    const d = await res.json()
    setCart(d.cart)
    toast.success('Added to cart!')
  }

  const updateCartItem = async (itemId: number, quantity: number) => {
    if (quantity <= 0) { removeFromCart(itemId); return }
    const res = await fetch('/api/cart', { method: 'PUT', headers: authH(token), body: JSON.stringify({ itemId, quantity }) })
    const d = await res.json()
    setCart(d.cart)
  }

  const removeFromCart = async (itemId: number) => {
    const res = await fetch('/api/cart', { method: 'DELETE', headers: authH(token), body: JSON.stringify({ itemId }) })
    const d = await res.json()
    setCart(d.cart)
    toast.success('Removed from cart')
  }

  const cartTotal = cart?.items?.reduce((s: number, i: any) => s + i.product.price * i.quantity, 0) || 0
  const cartCount = cart?.items?.reduce((s: number, i: any) => s + i.quantity, 0) || 0

  const placeOrder = async (addr: string) => {
    if (!cart?.items?.length) return
    setLoading(true)
    const items = cart.items.map((i: any) => ({
      productId: i.product.id, productName: i.product.title,
      quantity: i.quantity, unitPrice: i.product.price, totalPrice: i.product.price * i.quantity
    }))
    const shippingAddr = addr || user?.address || 'Address not provided'
    const res = await fetch('/api/orders', { method: 'POST', headers: authH(token), body: JSON.stringify({ items, shippingAddress: shippingAddr, paymentMethod: selectedPayment, totalAmount: cartTotal }) })
    if (res.ok) {
      toast.success('Order placed successfully!')
      setCart(null)
      setShowCheckout(false)
      setSelectedProduct(null)
      setView('orders')
      loadOrders()
    } else toast.error('Failed to place order')
    setLoading(false)
  }

  const createNeed = async () => {
    if (!needForm.title.trim()) { toast.error('Title is required'); return }
    setNeedLoading(true)
    const body: any = {
      title: needForm.title,
      description: needForm.description,
      priceType: needForm.priceType,
      urgency: needForm.urgency
    }
    if (needForm.priceType === 'exact') {
      body.exactPrice = parseFloat(needForm.exactPrice) || null
      if (!body.exactPrice) { toast.error('Please enter exact price'); setNeedLoading(false); return }
    } else if (needForm.priceType === 'minmax') {
      body.minPrice = parseFloat(needForm.minPrice) || null
      body.maxPrice = parseFloat(needForm.maxPrice) || null
      if (!body.minPrice || !body.maxPrice) { toast.error('Please enter both min and max price'); setNeedLoading(false); return }
      if (body.minPrice >= body.maxPrice) { toast.error('Min price must be less than max price'); setNeedLoading(false); return }
    }
    const res = await fetch('/api/needs', { method: 'POST', headers: authH(token), body: JSON.stringify(body) })
    if (res.ok) {
      toast.success('Need created successfully!')
      setNeedForm({ title: '', description: '', priceType: 'unknown', exactPrice: '', minPrice: '', maxPrice: '', urgency: '1-2 days' })
      setView('needs')
    } else toast.error('Failed to create need')
    setNeedLoading(false)
  }

  const updateProfile = async () => {
    if (!profileForm.name.trim()) { toast.error('Name is required'); return }
    setProfileLoading(true)
    const res = await fetch('/api/profile', { method: 'PUT', headers: authH(token), body: JSON.stringify({ name: profileForm.name, mobile: profileForm.mobile }) })
    if (res.ok) {
      const d = await res.json()
      toast.success('Profile updated!')
      setEditProfile(false)
      loadProfile()
    } else toast.error('Failed to update profile')
    setProfileLoading(false)
  }

  const changePassword = async () => {
    if (pwForm.newPw.length < 6) { toast.error('Password must be at least 6 characters'); return }
    if (pwForm.newPw !== pwForm.confirm) { toast.error('Passwords do not match'); return }
    setPwLoading(true)
    const res = await fetch('/api/profile', { method: 'PUT', headers: authH(token), body: JSON.stringify({ action: 'change_password', currentPassword: pwForm.current, newPassword: pwForm.newPw }) })
    if (res.ok) {
      toast.success('Password changed!')
      setShowChangePw(false)
      setPwForm({ current: '', newPw: '', confirm: '' })
    } else {
      const d = await res.json()
      toast.error(d.error || 'Failed to change password')
    }
    setPwLoading(false)
  }

  const saveAddress = async () => {
    if (!addrForm.fullAddress.trim()) { toast.error('Address is required'); return }
    setAddrLoading(true)
    if (editingAddr) {
      const res = await fetch('/api/addresses', { method: 'PUT', headers: authH(token), body: JSON.stringify({ id: editingAddr.id, ...addrForm }) })
      if (res.ok) { toast.success('Address updated!') } else toast.error('Failed to update')
    } else {
      const res = await fetch('/api/addresses', { method: 'POST', headers: authH(token), body: JSON.stringify(addrForm) })
      if (res.ok) { toast.success('Address added!') } else toast.error('Failed to add address')
    }
    setAddrLoading(false)
    setShowAddrDialog(false)
    setEditingAddr(null)
    setAddrForm({ fullAddress: '', landmark: '', pincode: '', city: '', state: '', isDefault: false })
    loadProfile()
  }

  const deleteAddress = async (id: number) => {
    const res = await fetch(`/api/addresses?id=${id}`, { method: 'DELETE', headers: authH(token) })
    if (res.ok) toast.success('Address deleted')
    else toast.error('Failed to delete')
    loadProfile()
  }

  const [respondingOffer, setRespondingOffer] = useState<{needId: number, offerId: number} | null>(null)

  const respondOffer = async (needId: number, offerId: number, status: string) => {
    if (respondingOffer) return
    setRespondingOffer({ needId, offerId })
    try {
      const res = await fetch(`/api/needs/${needId}`, { method: 'POST', headers: authH(token), body: JSON.stringify({ action: 'respond_offer', offerId, status }) })
      if (res.ok) {
        toast.success(`Offer ${status === 'accepted' ? 'Accepted' : 'Rejected'}!`)
        loadNeeds()
      } else {
        const d = await res.json()
        toast.error(d.error || 'Failed to respond')
      }
    } catch { toast.error('Network error') }
    setRespondingOffer(null)
  }

  const statusColor = (s: string) => {
    const m: any = {
      pending: 'bg-amber-100 text-amber-700 border-amber-200',
      confirmed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      processing: 'bg-blue-100 text-blue-700 border-blue-200',
      shipped: 'bg-indigo-100 text-indigo-700 border-indigo-200',
      delivered: 'bg-green-100 text-green-700 border-green-200',
      cancelled: 'bg-red-100 text-red-700 border-red-200',
      active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      sent: 'bg-amber-100 text-amber-700 border-amber-200',
      accepted: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      rejected: 'bg-red-100 text-red-700 border-red-200'
    }
    return m[s] || 'bg-gray-100 text-gray-700 border-gray-200'
  }

  const statusIcon = (s: string) => {
    if (s === 'delivered') return <CheckCircle className="w-4 h-4 text-green-600" />
    if (s === 'cancelled') return <AlertCircle className="w-4 h-4 text-red-500" />
    if (s === 'processing' || s === 'shipped') return <Truck className="w-4 h-4 text-blue-500" />
    if (s === 'confirmed') return <CheckCircle className="w-4 h-4 text-emerald-600" />
    return <Clock className="w-4 h-4 text-amber-500" />
  }

  const categoryEmoji = (c: string) => {
    const m: any = { 'Fruits': '🥭', 'Dairy': '🥛', 'Dairy & Eggs': '🥛', 'Grains & Rice': '🌾', 'Spices': '🌶️', 'Cooking Oil': '🫒', 'Pulses': '🫘', 'Beverages': '🍵', 'Sweeteners': '🍯', 'Dry Fruits': '🥜', 'Organic': '🌿', 'Spreads': '🧈' }
    return m[c] || '🛒'
  }

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

  const navItems = [
    { id: 'home', label: 'Shop', icon: Home },
    { id: 'cart', label: 'Cart', icon: ShoppingCart, badge: cartCount },
    { id: 'orders', label: 'Orders', icon: Package },
    { id: 'needs', label: 'Needs', icon: MessageCircle },
    { id: 'profile', label: 'Profile', icon: User },
  ]

  // ===================== RENDER VIEWS =====================

  const renderShop = () => (
    <div>
      <div className="relative mb-4">
        <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${searchLoading ? 'text-emerald-500 animate-pulse' : 'text-gray-400'}`} />
        <Input placeholder="Search by product name..." value={search} onChange={e => { setSearch(e.target.value); if (selectedCategory !== 'all') setSelectedCategory('all') }} className={`pl-11 pr-10 h-12 text-base rounded-xl bg-white border-gray-200 transition-colors ${searchLoading ? 'border-emerald-300 ring-2 ring-emerald-100' : 'focus-visible:ring-emerald-200'}`} />
        {searchLoading && <div className="absolute right-10 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />}
        {search && !searchLoading && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"><X className="w-3.5 h-3.5 text-gray-500" /></button>}
      </div>

      {/* Category Chips */}
      {allCategories.length > 2 && (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide">
          {allCategories.map(cat => (
            <button
              key={cat}
              onClick={() => { setSelectedCategory(cat); if (search) setSearch('') }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${selectedCategory === cat ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white text-gray-600 border hover:bg-gray-50'}`}
            >
              {cat === 'all' ? '🛒 All' : `${categoryEmoji(cat)} ${cat}`}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Products</h2>
        <span className="text-sm text-gray-500">{filteredProducts.length} item{filteredProducts.length !== 1 ? 's' : ''}{search || selectedCategory !== 'all' ? ` found` : ''}</span>
      </div>
      {filteredProducts.length === 0 && !searchLoading ? (
        <div className="text-center py-16 text-gray-400">
          <Search className="w-16 h-16 mx-auto mb-4" />
          <p className="font-medium">No products found</p>
          <p className="text-sm mt-1">{search ? `No results for "${search}" — try a different term` : 'No products in this category'}</p>
        </div>
      ) : filteredProducts.length === 0 && searchLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-gray-100 overflow-hidden animate-pulse">
              <div className="aspect-square bg-gray-100" />
              <div className="p-3 space-y-2">
                <div className="h-3 bg-gray-100 rounded w-2/3" />
                <div className="h-4 bg-gray-100 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredProducts.map((p: any) => (
            <Card key={p.id} className="group overflow-hidden hover:shadow-lg transition-all cursor-pointer border-gray-100" onClick={() => setSelectedProduct(p)}>
              <div className="aspect-square bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center text-4xl relative">
                {p.image ? (
                  <img src={p.image} alt={p.title} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl">{categoryEmoji(p.category)}</span>
                )}
                {p.stock <= 5 && p.stock > 0 && <span className="absolute top-2 left-2 text-[10px] px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium">Low Stock</span>}
                {p.stock === 0 && <span className="absolute top-2 left-2 text-[10px] px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-medium">Out of Stock</span>}
              </div>
              <CardContent className="p-3">
                <p className="text-xs text-gray-400 truncate">{p.shopOwner?.shopName}</p>
                <h3 className="font-semibold text-sm mt-0.5 line-clamp-2 min-h-[2.5rem] leading-tight">{p.title}</h3>
                <div className="flex items-end justify-between mt-2">
                  <div>
                    <span className="font-bold text-emerald-700 text-lg">₹{p.price}</span>
                  </div>
                  <Button size="sm" onClick={(e) => { e.stopPropagation(); addToCart(p.id) }} className="h-8 bg-emerald-600 hover:bg-emerald-700 text-xs" disabled={p.stock === 0}>
                    <Plus className="w-3 h-3 mr-1" /> Add
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Product Detail Dialog */}
      <Dialog open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
        <DialogContent className="max-w-md">
          {selectedProduct && (
            <>
              <div className="aspect-square bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl flex items-center justify-center text-7xl mb-4">
                {selectedProduct.image ? (
                  <img src={selectedProduct.image} alt={selectedProduct.title} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-7xl">{categoryEmoji(selectedProduct.category)}</span>
                )}
              </div>
              <p className="text-xs text-gray-400">{selectedProduct.shopOwner?.shopName} • {selectedProduct.category}</p>
              <DialogHeader><DialogTitle className="text-xl">{selectedProduct.title}</DialogTitle></DialogHeader>
              {selectedProduct.description && <p className="text-sm text-gray-600 mt-1">{selectedProduct.description}</p>}
              <div className="flex items-center gap-2 mt-2">
                <span className="text-2xl font-bold text-emerald-700">₹{selectedProduct.price}</span>
                <Badge variant="outline" className="text-xs">Stock: {selectedProduct.stock}</Badge>
              </div>
              <Button className="w-full bg-emerald-600 hover:bg-emerald-700 mt-2" size="lg" onClick={() => { addToCart(selectedProduct.id); setSelectedProduct(null) }} disabled={selectedProduct.stock === 0}>
                <ShoppingCart className="w-4 h-4 mr-2" /> Add to Cart
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )

  const renderCart = () => (
    <div>
      <h2 className="text-xl font-bold mb-4">Shopping Cart</h2>
      {!cart?.items?.length ? (
        <div className="text-center py-16 text-gray-400">
          <ShoppingCart className="w-16 h-16 mx-auto mb-4" />
          <p className="font-medium">Your cart is empty</p>
          <p className="text-sm mt-1">Browse products and add items to your cart</p>
          <Button onClick={() => setView('home')} className="mt-4 bg-emerald-600 hover:bg-emerald-700">Browse Products</Button>
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3">
            {cart.items.map((item: any) => (
              <Card key={item.id} className="flex items-center p-4 gap-4">
                <div className="w-16 h-16 bg-emerald-50 rounded-lg flex items-center justify-center text-2xl flex-shrink-0">{item.product.image ? (
                  <img src={item.product.image} alt={item.product.title} className="w-full h-full object-cover rounded-lg" />
                ) : (
                  <span className="text-2xl">{categoryEmoji(item.product.category)}</span>
                )}</div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm truncate">{item.product.title}</h3>
                  <p className="text-xs text-gray-400">{item.product.shopOwner?.shopName}</p>
                  <p className="text-emerald-700 font-bold mt-1">₹{item.product.price}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center border rounded-lg">
                    <button onClick={() => updateCartItem(item.id, item.quantity - 1)} className="p-2 hover:bg-gray-50 rounded-l-lg"><Minus className="w-3 h-3" /></button>
                    <span className="px-3 py-1 text-sm font-medium min-w-[2rem] text-center">{item.quantity}</span>
                    <button onClick={() => updateCartItem(item.id, item.quantity + 1)} className="p-2 hover:bg-gray-50 rounded-r-lg"><Plus className="w-3 h-3" /></button>
                  </div>
                  <span className="text-sm font-bold w-16 text-right">₹{item.product.price * item.quantity}</span>
                  <button onClick={() => removeFromCart(item.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                </div>
              </Card>
            ))}
          </div>
          <Card className="h-fit sticky top-20">
            <CardHeader><CardTitle className="text-lg">Order Summary</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm"><span>Subtotal ({cartCount} items)</span><span>₹{cartTotal}</span></div>
              <div className="flex justify-between text-sm"><span>Delivery</span><span className="text-emerald-600 font-medium">Free</span></div>
              <Separator />
              <div className="flex justify-between font-bold text-lg"><span>Total</span><span className="text-emerald-700">₹{cartTotal}</span></div>
              <Button className="w-full bg-emerald-600 hover:bg-emerald-700" size="lg" onClick={() => setShowCheckout(true)}>Proceed to Checkout</Button>
            </CardContent>
          </Card>
        </div>
      )}
      <Dialog open={showCheckout} onOpenChange={(open) => { if (!open) { setShowCheckout(false); setSelectedPayment('cod') } }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Checkout</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {/* Payment Method Selector */}
            <div>
              <p className="text-sm text-gray-500 mb-2 font-medium">Payment Method</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedPayment('cod')}
                  className={`p-4 rounded-xl border-2 text-center transition-all ${selectedPayment === 'cod' ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'}`}
                >
                  <Wallet className={`w-6 h-6 mx-auto mb-2 ${selectedPayment === 'cod' ? 'text-emerald-600' : 'text-gray-400'}`} />
                  <p className={`text-sm font-semibold ${selectedPayment === 'cod' ? 'text-emerald-700' : 'text-gray-600'}`}>Cash on Delivery</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">Pay when delivered</p>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPayment('online')}
                  className={`p-4 rounded-xl border-2 text-center transition-all ${selectedPayment === 'online' ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'}`}
                >
                  <CreditCard className={`w-6 h-6 mx-auto mb-2 ${selectedPayment === 'online' ? 'text-emerald-600' : 'text-gray-400'}`} />
                  <p className={`text-sm font-semibold ${selectedPayment === 'online' ? 'text-emerald-700' : 'text-gray-600'}`}>Online UPI</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">Pay via UPI now</p>
                </button>
              </div>
            </div>

            {/* Address Selection */}
            <div className="bg-gray-50 p-4 rounded-xl">
              <p className="text-sm text-gray-500 mb-2 font-medium">Delivery Address</p>
              {addresses.length > 0 ? (
                <div className="space-y-2">
                  {addresses.map((a: any) => (
                    <label key={a.id} className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${a.isDefault ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'}`}>
                      <input type="radio" name="checkout-addr" defaultChecked={a.isDefault} className="mt-1" value={a.fullAddress} />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{a.fullAddress}</p>
                        {a.landmark && <p className="text-xs text-gray-500">{a.landmark}</p>}
                        {(a.city || a.pincode) && <p className="text-xs text-gray-400">{a.city}{a.pincode ? ` - ${a.pincode}` : ''}</p>}
                      </div>
                      {a.isDefault && <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">Default</Badge>}
                    </label>
                  ))}
                </div>
              ) : (
                <div>
                  <p className="text-sm text-gray-500">{user?.address || 'No address set. Add an address in Profile.'}</p>
                </div>
              )}
            </div>

            {/* Total Breakdown */}
            {selectedPayment === 'online' && paymentSettings?.delivery_fee ? (
              <div className="bg-gray-50 p-4 rounded-xl space-y-2">
                <p className="text-sm text-gray-500 font-medium">Order Summary</p>
                <div className="flex justify-between text-sm"><span className="text-gray-600">Item Total</span><span>₹{cartTotal}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-600">Delivery Fee</span><span>₹{paymentSettings.delivery_fee}</span></div>
                <Separator />
                <div className="flex justify-between font-bold text-lg"><span>Grand Total</span><span className="text-emerald-700">₹{cartTotal + Number(paymentSettings.delivery_fee)}</span></div>
              </div>
            ) : (
              <div className="bg-gray-50 p-4 rounded-xl flex justify-between items-center">
                <div><p className="text-sm text-gray-500">Total Amount</p><p className="font-bold text-xl text-emerald-700">₹{cartTotal}</p></div>
                <Badge className="bg-gray-200 text-gray-700 px-3 py-1">COD</Badge>
              </div>
            )}

            {/* UPI QR Section for Online Payment */}
            {selectedPayment === 'online' && paymentSettings?.payment_qr_data && (
              <div className="bg-emerald-50 p-4 rounded-xl space-y-3">
                <p className="text-sm font-medium text-emerald-800 flex items-center gap-2"><QrCode className="w-4 h-4" /> Pay via UPI</p>
                {paymentSettings.payment_qr_data.startsWith('http') ? (
                  <a
                    href={paymentSettings.payment_qr_data}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full text-center bg-white border-2 border-dashed border-emerald-300 rounded-xl p-4 hover:bg-emerald-100 transition-colors"
                  >
                    <QrCode className="w-12 h-12 mx-auto text-emerald-600 mb-2" />
                    <p className="text-sm font-semibold text-emerald-700">Tap to open UPI payment</p>
                    <p className="text-xs text-gray-500 mt-1">Opens your UPI app</p>
                  </a>
                ) : (
                  <div className="bg-white border-2 border-dashed border-emerald-300 rounded-xl p-4 text-center">
                    <QrCode className="w-12 h-12 mx-auto text-emerald-600 mb-2" />
                    <p className="text-sm font-semibold text-emerald-700">UPI Payment</p>
                  </div>
                )}
                {paymentSettings.upi_id && (
                  <div className="text-center">
                    <p className="text-xs text-gray-500">UPI ID</p>
                    <p className="font-bold text-emerald-700 text-base select-all">{paymentSettings.upi_id}</p>
                  </div>
                )}
                <p className="text-xs text-center text-emerald-700/70">Pay <span className="font-bold">₹{cartTotal + Number(paymentSettings.delivery_fee || 0)}</span> via UPI, then click the button below</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => { setShowCheckout(false); setSelectedPayment('cod') }}>Cancel</Button>
              <Button
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                onClick={() => {
                  const checked = document.querySelector('input[name="checkout-addr"]:checked') as HTMLInputElement
                  placeOrder(checked?.value || '')
                }}
                disabled={loading}
              >
                {loading ? 'Placing...' : selectedPayment === 'online' ? `I've Paid ₹${cartTotal + Number(paymentSettings?.delivery_fee || 0)}` : 'Place Order'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )

  const renderOrders = () => (
    <div>
      <h2 className="text-xl font-bold mb-4">My Orders</h2>
      {!orders.length ? (
        <div className="text-center py-16 text-gray-400">
          <Package className="w-16 h-16 mx-auto mb-4" />
          <p className="font-medium">No orders yet</p>
          <p className="text-sm mt-1">Start shopping to see your orders here</p>
          <Button onClick={() => setView('home')} className="mt-4 bg-emerald-600 hover:bg-emerald-700">Shop Now</Button>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((o: any) => (
            <Card key={o.id} className="overflow-hidden border-gray-100">
              <div className="p-4 flex flex-wrap items-center justify-between gap-2 border-b bg-gray-50/50">
                <div className="flex items-center gap-3">
                  {statusIcon(o.orderStatus)}
                  <div>
                    <p className="font-bold text-sm">{o.orderNumber}</p>
                    <p className="text-xs text-gray-500">{formatDate(o.createdAt)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={statusColor(o.orderStatus)}>{o.orderStatus}</Badge>
                  <Badge className={`text-xs ${o.paymentStatus === 'pending_verification' ? 'bg-amber-100 text-amber-700 border-amber-200' : o.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : o.paymentStatus === 'rejected' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>{o.paymentStatus === 'pending_verification' ? 'Awaiting Verification' : o.paymentStatus === 'paid' ? 'Paid' : o.paymentStatus === 'rejected' ? 'Rejected' : 'COD - Pending'}</Badge>
                </div>
              </div>
              <CardContent className="p-4">
                <div className="space-y-2">
                  {o.items?.map((i: any) => (
                    <div key={i.id} className="flex justify-between text-sm">
                      <span className="text-gray-600">{i.productName} × {i.quantity}</span>
                      <span className="font-medium">₹{i.totalPrice}</span>
                    </div>
                  ))}
                </div>
                <Separator className="my-3" />
                {o.deliveryFee > 0 && <div className="flex justify-between text-sm text-gray-500"><span>Delivery Fee</span><span>₹{o.deliveryFee}</span></div>}
                <div className="flex justify-between font-bold"><span>Total</span><span className="text-emerald-700">₹{o.totalAmount}</span></div>
                {o.shippingAddress && <p className="text-xs text-gray-400 mt-2 flex items-center gap-1"><MapPin className="w-3 h-3" />{o.shippingAddress}</p>}
                {/* Confirm Delivery — online orders that are out_for_delivery */}
                {o.paymentMethod === 'online' && o.orderStatus === 'out_for_delivery' && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <Button
                      className="w-full bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => confirmDelivery(o.id)}
                      disabled={confirmingDelivery === o.id}
                    >
                      {confirmingDelivery === o.id ? 'Confirming...' : 'Confirm Delivery'}
                    </Button>
                    <p className="text-[11px] text-gray-400 mt-1.5 text-center">Click to confirm you received your order</p>
                  </div>
                )}
                {/* COD orders out for delivery — delivery boy will confirm */}
                {o.paymentMethod === 'cod' && o.orderStatus === 'out_for_delivery' && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="flex items-center justify-center gap-1.5 text-xs text-amber-600 bg-amber-50 px-3 py-2.5 rounded-lg border border-amber-200">
                      <Truck className="w-3.5 h-3.5" />
                      <span>Delivery partner will confirm & collect payment</span>
                    </div>
                  </div>
                )}
                {/* Chat with delivery boy — only on active need deliveries */}
                {o.orderType === 'need' && o.deliveryAssignments?.length > 0 && !['delivered', 'failed', 'cancelled'].includes(o.orderStatus) && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => setChatOrder({ orderId: o.id, orderNumber: o.orderNumber, peerName: o.deliveryAssignments[0]?.deliveryBoy?.user?.name || 'Delivery Partner' })}
                      className="flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-800 font-medium transition-colors"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Chat with {o.deliveryAssignments[0]?.deliveryBoy?.user?.name || 'Delivery Partner'}
                    </button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )

  const renderNeeds = () => (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">My Needs</h2>
        <Button onClick={() => setView('create_need')} className="bg-emerald-600 hover:bg-emerald-700"><PlusCircle className="w-4 h-4 mr-2" />Create Need</Button>
      </div>
      {!needs.length ? (
        <div className="text-center py-16 text-gray-400">
          <MessageCircle className="w-16 h-16 mx-auto mb-4" />
          <p className="font-medium">No needs posted yet</p>
          <p className="text-sm mt-1">Create a need and get offers from delivery partners</p>
          <Button onClick={() => setView('create_need')} className="mt-4 bg-emerald-600 hover:bg-emerald-700">Create Your First Need</Button>
        </div>
      ) : (
        <div className="space-y-4">
          {needs.map((n: any) => (
            <Card key={n.id} className="border-gray-100">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-bold">{n.title}</h3>
                      <Badge className={`${statusColor(n.status)} text-xs`}>{n.status}</Badge>
                    </div>
                    {n.description && <p className="text-sm text-gray-600 mb-2">{n.description}</p>}
                    <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{n.urgency}</span>
                      <span className="flex items-center gap-1"><IndianRupee className="w-3 h-3" />{n.priceType === 'exact' ? `₹${n.exactPrice}` : n.priceType === 'minmax' ? `₹${n.minPrice} - ₹${n.maxPrice}` : 'Price not set'}</span>
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(n.createdAt)}</span>
                    </div>

                    {/* Comments */}
                    {n.comments?.length > 0 && (
                      <div className="mt-3 bg-gray-50 rounded-lg p-3">
                        <p className="text-xs font-semibold text-gray-500 mb-2">Comments ({n.comments.length})</p>
                        {n.comments.map((c: any) => (
                          <div key={c.id} className="mb-2 last:mb-0">
                            <p className="text-xs font-medium text-emerald-700">{c.user?.name}</p>
                            <p className="text-sm text-gray-600">{c.comment}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Offers */}
                    {n.offers?.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs font-semibold text-gray-500 mb-2">Offers ({n.offers.length})</p>
                        {n.offers.map((of: any) => (
                          <div key={of.id} className="bg-amber-50 border border-amber-100 rounded-lg p-3 mb-2 last:mb-0">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-sm">{of.deliveryBoy?.user?.name}</p>
                                {of.message && <p className="text-xs text-gray-500 mt-0.5">{of.message}</p>}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-emerald-700">₹{of.offerAmount}</span>
                                {of.status === 'sent' && (
                                  <>
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); respondOffer(n.id, of.id, 'accepted') }} 
                                      disabled={respondingOffer?.offerId === of.id}
                                      className="text-xs px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      {respondingOffer?.offerId === of.id ? '...' : 'Accept'}
                                    </button>
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); respondOffer(n.id, of.id, 'rejected') }} 
                                      disabled={respondingOffer?.offerId === of.id}
                                      className="text-xs px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      {respondingOffer?.offerId === of.id ? '...' : 'Reject'}
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                            {of.status !== 'sent' && <Badge className={`${statusColor(of.status)} text-[10px] mt-2`}>{of.status}</Badge>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )

  const renderCreateNeed = () => (
    <div className="max-w-lg mx-auto">
      <button onClick={() => setView('needs')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ChevronLeft className="w-4 h-4" /> Back to My Needs
      </button>
      <h2 className="text-xl font-bold mb-1">Create a Need</h2>
      <p className="text-sm text-gray-500 mb-6">Describe what you need and delivery partners will send you offers</p>

      <Card>
        <CardContent className="p-6 space-y-5">
          <div>
            <Label className="text-sm font-medium">Title *</Label>
            <Input placeholder="What do you need? e.g. Fresh vegetables for the week" value={needForm.title} onChange={e => setNeedForm({ ...needForm, title: e.target.value })} className="mt-1.5" />
          </div>

          <div>
            <Label className="text-sm font-medium">Description</Label>
            <Textarea placeholder="Describe your requirement in detail... e.g. Need 2kg tomatoes, 1kg onions, 500g capsicum, fresh and organic preferred" value={needForm.description} onChange={e => setNeedForm({ ...needForm, description: e.target.value })} className="mt-1.5" rows={3} />
          </div>

          {/* Price Type - Dynamic Fields */}
          <div>
            <Label className="text-sm font-medium">Price Type</Label>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {[{ v: 'unknown', l: 'Not Sure', icon: HelpCircle, d: "I don't know the price" },
                { v: 'exact', l: 'Exact Price', icon: IndianRupee, d: 'I know the exact amount' },
                { v: 'minmax', l: 'Price Range', icon: Hash, d: 'I have a budget range' }
              ].map(pt => (
                <button key={pt.v} type="button" onClick={() => setNeedForm({ ...needForm, priceType: pt.v })}
                  className={`p-3 rounded-xl border-2 text-center transition-all ${needForm.priceType === pt.v ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <pt.icon className={`w-5 h-5 mx-auto mb-1 ${needForm.priceType === pt.v ? 'text-emerald-600' : 'text-gray-400'}`} />
                  <p className={`text-xs font-semibold ${needForm.priceType === pt.v ? 'text-emerald-700' : 'text-gray-600'}`}>{pt.l}</p>
                </button>
              ))}
            </div>

            {/* Dynamic Price Fields */}
            {needForm.priceType === 'exact' && (
              <div className="mt-3">
                <Label className="text-sm font-medium">Exact Price (₹) *</Label>
                <div className="relative mt-1.5">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">₹</span>
                  <Input type="number" placeholder="0" value={needForm.exactPrice} onChange={e => setNeedForm({ ...needForm, exactPrice: e.target.value })} className="pl-8" />
                </div>
              </div>
            )}

            {needForm.priceType === 'minmax' && (
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div>
                  <Label className="text-sm font-medium">Min Price (₹) *</Label>
                  <div className="relative mt-1.5">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">₹</span>
                    <Input type="number" placeholder="0" value={needForm.minPrice} onChange={e => setNeedForm({ ...needForm, minPrice: e.target.value })} className="pl-8" />
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Max Price (₹) *</Label>
                  <div className="relative mt-1.5">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">₹</span>
                    <Input type="number" placeholder="0" value={needForm.maxPrice} onChange={e => setNeedForm({ ...needForm, maxPrice: e.target.value })} className="pl-8" />
                  </div>
                </div>
              </div>
            )}

            {needForm.priceType === 'unknown' && (
              <p className="mt-3 text-sm text-gray-400 bg-gray-50 p-3 rounded-lg">Delivery partners will suggest a price based on your requirement.</p>
            )}
          </div>

          {/* Urgency */}
          <div>
            <Label className="text-sm font-medium">Urgency</Label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-2">
              {['1 hour', '2 hours', '6 hours', '1 day', '1-2 days'].map(u => (
                <button key={u} type="button" onClick={() => setNeedForm({ ...needForm, urgency: u })}
                  className={`px-3 py-2 rounded-lg border-2 text-xs font-medium transition-all ${needForm.urgency === u ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 hover:border-gray-300 text-gray-600'}`}>
                  {u}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setView('needs')}>Cancel</Button>
            <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={createNeed} disabled={needLoading}>
              {needLoading ? 'Creating...' : 'Post Need'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderProfile = () => {
    if (!profileData) return <div className="text-center py-16"><p className="text-gray-400">Loading profile...</p></div>
    const u = profileData.user
    const stats = profileData.stats

    return (
      <div className="max-w-2xl mx-auto">
        <h2 className="text-xl font-bold mb-4">My Profile</h2>

        {/* Profile Card */}
        <Card className="mb-6 overflow-hidden">
          <div className="h-24 bg-gradient-to-r from-emerald-500 to-teal-600 relative">
            <div className="absolute -bottom-10 left-6">
              <Avatar className="w-20 h-20 border-4 border-white shadow-lg">
                <AvatarFallback className="bg-emerald-100 text-emerald-700 text-2xl font-bold">{u.name?.charAt(0)?.toUpperCase()}</AvatarFallback>
              </Avatar>
            </div>
          </div>
          <CardContent className="pt-14 pb-6 px-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-lg">{u.name}</h3>
                <p className="text-sm text-gray-500">Customer</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setEditProfile(!editProfile)}>
                <Pencil className="w-3 h-3 mr-1" /> {editProfile ? 'Cancel' : 'Edit'}
              </Button>
            </div>

            {editProfile ? (
              <div className="mt-4 space-y-3 p-4 bg-gray-50 rounded-xl">
                <div>
                  <Label className="text-sm">Full Name</Label>
                  <Input value={profileForm.name} onChange={e => setProfileForm({ ...profileForm, name: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label className="text-sm">Mobile Number</Label>
                  <Input value={profileForm.mobile} onChange={e => setProfileForm({ ...profileForm, mobile: e.target.value })} className="mt-1" placeholder="Enter mobile number" />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={updateProfile} disabled={profileLoading} className="bg-emerald-600 hover:bg-emerald-700">{profileLoading ? 'Saving...' : 'Save Changes'}</Button>
                  <Button size="sm" variant="outline" onClick={() => { setEditProfile(false); setProfileForm({ name: u.name, mobile: u.mobile || '' }) }}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600"><Mail className="w-4 h-4 text-gray-400" /> {u.email}</div>
                <div className="flex items-center gap-2 text-sm text-gray-600"><Phone className="w-4 h-4 text-gray-400" /> {u.mobile || 'Not set'}</div>
                <div className="flex items-center gap-2 text-sm text-gray-600"><MapPinned className="w-4 h-4 text-gray-400" /> {u.address || 'Not set'}</div>
                <div className="flex items-center gap-2 text-sm text-gray-600"><Calendar className="w-4 h-4 text-gray-400" /> Member since {formatDate(u.createdAt)}</div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Card className="text-center p-4"><Package className="w-5 h-5 mx-auto text-emerald-600 mb-1" /><p className="font-bold text-lg">{stats.totalOrders}</p><p className="text-xs text-gray-500">Orders</p></Card>
          <Card className="text-center p-4"><IndianRupee className="w-5 h-5 mx-auto text-emerald-600 mb-1" /><p className="font-bold text-lg">₹{stats.totalSpent?.toLocaleString()}</p><p className="text-xs text-gray-500">Total Spent</p></Card>
          <Card className="text-center p-4"><MessageCircle className="w-5 h-5 mx-auto text-emerald-600 mb-1" /><p className="font-bold text-lg">{stats.totalNeeds}</p><p className="text-xs text-gray-500">Needs</p></Card>
        </div>

        {/* Change Password */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center"><Shield className="w-5 h-5 text-amber-600" /></div>
                <div><p className="font-medium text-sm">Change Password</p><p className="text-xs text-gray-500">Update your account password</p></div>
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowChangePw(!showChangePw)}>{showChangePw ? 'Cancel' : 'Change'}</Button>
            </div>
            {showChangePw && (
              <div className="mt-4 space-y-3 p-4 bg-gray-50 rounded-xl">
                <div>
                  <Label className="text-sm">Current Password</Label>
                  <Input type="password" value={pwForm.current} onChange={e => setPwForm({ ...pwForm, current: e.target.value })} className="mt-1" placeholder="Enter current password" />
                </div>
                <div>
                  <Label className="text-sm">New Password</Label>
                  <Input type="password" value={pwForm.newPw} onChange={e => setPwForm({ ...pwForm, newPw: e.target.value })} className="mt-1" placeholder="Min 6 characters" />
                </div>
                <div>
                  <Label className="text-sm">Confirm New Password</Label>
                  <Input type="password" value={pwForm.confirm} onChange={e => setPwForm({ ...pwForm, confirm: e.target.value })} className="mt-1" placeholder="Re-enter new password" />
                </div>
                <Button size="sm" onClick={changePassword} disabled={pwLoading} className="bg-emerald-600 hover:bg-emerald-700">{pwLoading ? 'Changing...' : 'Update Password'}</Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Saved Addresses */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2"><MapPinned className="w-4 h-4" /> Saved Addresses</CardTitle>
              <Button size="sm" onClick={() => { setEditingAddr(null); setAddrForm({ fullAddress: '', landmark: '', pincode: '', city: '', state: '', isDefault: false }); setShowAddrDialog(true) }} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="w-3 h-3 mr-1" /> Add</Button>
            </div>
          </CardHeader>
          <CardContent>
            {addresses.length === 0 ? (
              <div className="text-center py-6 text-gray-400">
                <MapPin className="w-10 h-10 mx-auto mb-2" />
                <p className="text-sm">No saved addresses yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {addresses.map((a: any) => (
                  <div key={a.id} className={`p-4 rounded-xl border-2 ${a.isDefault ? 'border-emerald-200 bg-emerald-50/50' : 'border-gray-100'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <MapPin className="w-4 h-4 text-emerald-600" />
                          <p className="font-medium text-sm">{a.fullAddress}</p>
                          {a.isDefault && <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">Default</Badge>}
                        </div>
                        {a.landmark && <p className="text-xs text-gray-500 ml-6">Landmark: {a.landmark}</p>}
                        <p className="text-xs text-gray-400 ml-6">{a.city}{a.state ? `, ${a.state}` : ''}{a.pincode ? ` - ${a.pincode}` : ''}</p>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => { setEditingAddr(a); setAddrForm({ fullAddress: a.fullAddress, landmark: a.landmark || '', pincode: a.pincode || '', city: a.city || '', state: a.state || '', isDefault: a.isDefault }); setShowAddrDialog(true) }} className="p-2 hover:bg-gray-100 rounded-lg"><Pencil className="w-3 h-3 text-gray-500" /></button>
                        <button onClick={() => deleteAddress(a.id)} className="p-2 hover:bg-red-50 rounded-lg"><Trash2 className="w-3 h-3 text-red-400" /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Address Dialog */}
        <Dialog open={showAddrDialog} onOpenChange={setShowAddrDialog}>
          <DialogContent>
            <DialogHeader><DialogTitle>{editingAddr ? 'Edit' : 'Add'} Address</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-sm">Full Address *</Label>
                <Textarea value={addrForm.fullAddress} onChange={e => setAddrForm({ ...addrForm, fullAddress: e.target.value })} className="mt-1" rows={2} placeholder="House/flat no, street, area" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm">Landmark</Label>
                  <Input value={addrForm.landmark} onChange={e => setAddrForm({ ...addrForm, landmark: e.target.value })} className="mt-1" placeholder="Near..." />
                </div>
                <div>
                  <Label className="text-sm">Pincode</Label>
                  <Input value={addrForm.pincode} onChange={e => setAddrForm({ ...addrForm, pincode: e.target.value })} className="mt-1" placeholder="6 digit" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm">City</Label>
                  <Input value={addrForm.city} onChange={e => setAddrForm({ ...addrForm, city: e.target.value })} className="mt-1" placeholder="City" />
                </div>
                <div>
                  <Label className="text-sm">State</Label>
                  <Input value={addrForm.state} onChange={e => setAddrForm({ ...addrForm, state: e.target.value })} className="mt-1" placeholder="State" />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={addrForm.isDefault} onChange={e => setAddrForm({ ...addrForm, isDefault: e.target.checked })} className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
                <span className="text-sm">Set as default address</span>
              </label>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowAddrDialog(false)}>Cancel</Button>
                <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={saveAddress} disabled={addrLoading}>{addrLoading ? 'Saving...' : (editingAddr ? 'Update' : 'Add Address')}</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  return (
    <>
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <button onClick={() => { if (view !== 'home') setView('home') }} className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg">FreshKart</span>
          </button>
          <div className="flex items-center gap-2">
            <button onClick={() => setNotifOpen(!notifOpen)} className="relative p-2 hover:bg-gray-100 rounded-full transition-colors">
              <Bell className="w-5 h-5" />
              {unread > 0 && <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">{unread}</span>}
            </button>
            <button onClick={() => setView('profile')} className="flex items-center gap-2 p-1.5 hover:bg-gray-100 rounded-full transition-colors">
              <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-emerald-700" />
              </div>
              <span className="text-sm font-medium hidden sm:block max-w-[100px] truncate">{user?.name}</span>
            </button>
            <button onClick={logout} className="p-2 hover:bg-red-50 rounded-full text-red-500 transition-colors" title="Logout"><LogOut className="w-4 h-4" /></button>
          </div>
        </div>
      </header>

      {/* Notifications dropdown */}
      {notifOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
          <div className="fixed top-14 right-4 z-50 w-80 bg-white rounded-xl shadow-2xl border max-h-96 overflow-y-auto">
            <div className="p-3 border-b font-semibold text-sm flex items-center justify-between">
              Notifications
              {unread > 0 && <Badge className="bg-red-100 text-red-700 text-[10px]">{unread} new</Badge>}
            </div>
            {notifications.length === 0 && <p className="p-4 text-sm text-gray-500 text-center">No notifications</p>}
            {notifications.map((n: any) => (
              <div key={n.id} className={`p-3 border-b last:border-0 text-sm transition-colors ${!n.isRead ? 'bg-emerald-50/50' : ''} hover:bg-gray-50`}>
                <p className="font-medium text-gray-800">{n.title}</p>
                <p className="text-gray-500 text-xs mt-0.5">{n.message}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Main content */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 pb-24 pt-4">
        {view === 'home' && renderShop()}
        {view === 'cart' && renderCart()}
        {view === 'orders' && renderOrders()}
        {view === 'needs' && renderNeeds()}
        {view === 'create_need' && renderCreateNeed()}
        {view === 'profile' && renderProfile()}
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-[0_-2px_10px_rgba(0,0,0,0.05)] z-40">
        <div className="max-w-6xl mx-auto flex">
          {navItems.map(item => (
            <button key={item.id} onClick={() => setView(item.id)}
              className={`flex-1 flex flex-col items-center py-2.5 gap-0.5 transition-colors ${view === item.id || (item.id === 'needs' && view === 'create_need') ? 'text-emerald-600' : 'text-gray-400 hover:text-gray-600'}`}>
              <div className="relative">
                <item.icon className="w-5 h-5" />
                {item.badge > 0 && <span className="absolute -top-2 -right-3 min-w-[16px] h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold px-1">{item.badge}</span>}
              </div>
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>

    {/* Chat Panel */}
    <ChatPanel
      open={!!chatOrder}
      onClose={() => setChatOrder(null)}
      orderId={chatOrder?.orderId || 0}
      orderNumber={chatOrder?.orderNumber || ''}
      userId={user?.id || 0}
      userName={user?.name || ''}
      userRole='customer'
      peerName={chatOrder?.peerName || 'Delivery Partner'}
      peerRole='delivery'
      token={token}
    />
    </>
  )
}
