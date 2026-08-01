'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '@/store/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Home, ShoppingCart, Package, PlusCircle, Clock, Search, Minus, Plus, Trash2, MapPin, X, MessageCircle, DollarSign, ChevronRight, Bell, LogOut, User } from 'lucide-react'
import { toast } from 'sonner'

const headers = { 'Content-Type': 'application/json' }
function authHeaders(user: any) { return { ...headers, 'x-user-id': String(user.id), 'x-user-role': user.role } }

export function CustomerDashboard() {
  const { user, view, setView, logout } = useAuthStore()
  const [products, setProducts] = useState<any[]>([])
  const [cart, setCart] = useState<any>(null)
  const [orders, setOrders] = useState<any[]>([])
  const [needs, setNeeds] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [showCheckout, setShowCheckout] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const [unread, setUnread] = useState(0)

  const loadProducts = useCallback(async () => {
    const res = await fetch(`/api/products?search=${search}`)
    const d = await res.json()
    setProducts(d.products || [])
  }, [search])

  const loadCart = useCallback(async () => {
    const res = await fetch('/api/cart', { headers: authHeaders(user) })
    const d = await res.json()
    setCart(d.cart)
  }, [user])

  const loadOrders = useCallback(async () => {
    const res = await fetch('/api/orders', { headers: authHeaders(user) })
    const d = await res.json()
    setOrders(d.orders || [])
  }, [user])

  const loadNeeds = useCallback(async () => {
    const res = await fetch('/api/needs', { headers: authHeaders(user) })
    const d = await res.json()
    setNeeds(d.needs || [])
  }, [user])

  const loadNotifications = useCallback(async () => {
    const res = await fetch('/api/notifications', { headers: authHeaders(user) })
    const d = await res.json()
    setNotifications(d.notifications || [])
    setUnread(d.unread || 0)
  }, [user])

  useEffect(() => { if (view === 'home') loadProducts() }, [view, loadProducts])
  useEffect(() => { if (view === 'cart' && user) loadCart() }, [view, user, loadCart])
  useEffect(() => { if (view === 'orders' && user) loadOrders() }, [view, user, loadOrders])
  useEffect(() => { if ((view === 'needs' || view === 'create_need') && user) loadNeeds() }, [view, user, loadNeeds])
  useEffect(() => { if (user) loadNotifications() }, [user, loadNotifications])

  const addToCart = async (productId: number) => {
    const res = await fetch('/api/cart', { method: 'POST', headers: authHeaders(user), body: JSON.stringify({ productId, quantity: 1 }) })
    const d = await res.json()
    setCart(d.cart)
    toast.success('Added to cart!')
  }

  const removeFromCart = async (itemId: number) => {
    const res = await fetch('/api/cart', { method: 'DELETE', headers: authHeaders(user), body: JSON.stringify({ itemId }) })
    const d = await res.json()
    setCart(d.cart)
  }

  const cartTotal = cart?.items?.reduce((s: number, i: any) => s + i.product.price * i.quantity, 0) || 0
  const cartCount = cart?.items?.reduce((s: number, i: any) => s + i.quantity, 0) || 0

  const placeOrder = async () => {
    if (!cart?.items?.length) return
    setLoading(true)
    const items = cart.items.map((i: any) => ({
      productId: i.product.id, productName: i.product.title,
      quantity: i.quantity, unitPrice: i.product.price, totalPrice: i.product.price * i.quantity
    }))
    const addr = user.address || 'Address not provided'
    const res = await fetch('/api/orders', { method: 'POST', headers: authHeaders(user), body: JSON.stringify({ items, shippingAddress: addr, paymentMethod: 'cod', totalAmount: cartTotal }) })
    if (res.ok) {
      toast.success('Order placed successfully!')
      setCart(null)
      setShowCheckout(false)
      setView('orders')
      loadOrders()
    } else toast.error('Failed to place order')
    setLoading(false)
  }

  const statusColor = (s: string) => {
    const m: any = { pending: 'bg-amber-100 text-amber-700', confirmed: 'bg-emerald-100 text-emerald-700', processing: 'bg-blue-100 text-blue-700', delivered: 'bg-green-100 text-green-700', cancelled: 'bg-red-100 text-red-700' }
    return m[s] || 'bg-gray-100 text-gray-700'
  }

  const navItems = [
    { id: 'home', label: 'Shop', icon: Home },
    { id: 'cart', label: 'Cart', icon: ShoppingCart, badge: cartCount },
    { id: 'orders', label: 'Orders', icon: Package },
    { id: 'needs', label: 'My Needs', icon: MessageCircle },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg">GrocerApp</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setNotifOpen(!notifOpen)} className="relative p-2 hover:bg-gray-100 rounded-full">
              <Bell className="w-5 h-5" />
              {unread > 0 && <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">{unread}</span>}
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center"><User className="w-4 h-4 text-emerald-700" /></div>
              <span className="text-sm font-medium hidden sm:block">{user?.name}</span>
            </div>
            <button onClick={logout} className="p-2 hover:bg-red-50 rounded-full text-red-500"><LogOut className="w-4 h-4" /></button>
          </div>
        </div>
      </header>

      {/* Notifications dropdown */}
      {notifOpen && (
        <div className="fixed top-16 right-4 z-50 w-80 bg-white rounded-xl shadow-2xl border max-h-96 overflow-y-auto">
          <div className="p-3 border-b font-semibold text-sm">Notifications</div>
          {notifications.length === 0 && <p className="p-4 text-sm text-gray-500">No notifications</p>}
          {notifications.map((n: any) => (
            <div key={n.id} className={`p-3 border-b last:border-0 text-sm ${!n.isRead ? 'bg-emerald-50/50' : ''}`}>
              <p className="font-medium">{n.title}</p>
              <p className="text-gray-500 text-xs mt-0.5">{n.message}</p>
            </div>
          ))}
        </div>
      )}

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-4 pb-24 pt-4">
        {/* SHOP VIEW */}
        {view === 'home' && (
          <div>
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input placeholder="Search groceries..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 h-12 text-base rounded-xl bg-white border-gray-200" />
            </div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Products</h2>
              <span className="text-sm text-gray-500">{products.length} items</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map((p: any) => (
                <Card key={p.id} className="group overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="aspect-square bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center text-4xl">
                    {p.category === 'Fruits' ? '🥭' : p.category === 'Dairy' || p.category === 'Dairy & Eggs' ? '🥛' : p.category === 'Grains & Rice' ? '🌾' : p.category === 'Spices' ? '🌶️' : p.category === 'Cooking Oil' ? '🫒' : p.category === 'Pulses' ? '🫘' : p.category === 'Beverages' ? '🍵' : p.category === 'Sweeteners' ? '🍯' : p.category === 'Dry Fruits' ? '🥜' : p.category === 'Organic' ? '🌿' : '🛒'}
                  </div>
                  <CardContent className="p-3">
                    <p className="text-xs text-gray-500 truncate">{p.shopOwner?.user?.name}</p>
                    <h3 className="font-semibold text-sm mt-0.5 line-clamp-2 min-h-[2.5rem]">{p.title}</h3>
                    <div className="flex items-center justify-between mt-2">
                      <span className="font-bold text-emerald-700">₹{p.price}</span>
                      <Button size="sm" onClick={() => addToCart(p.id)} className="h-8 bg-emerald-600 hover:bg-emerald-700 text-xs">
                        <Plus className="w-3 h-3 mr-1" /> Add
                      </Button>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Stock: {p.stock}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* CART VIEW */}
        {view === 'cart' && (
          <div>
            <h2 className="text-xl font-bold mb-4">Shopping Cart</h2>
            {!cart?.items?.length ? (
              <div className="text-center py-16 text-gray-400">
                <ShoppingCart className="w-16 h-16 mx-auto mb-4" />
                <p>Your cart is empty</p>
                <Button variant="outline" onClick={() => setView('home')} className="mt-4">Browse Products</Button>
              </div>
            ) : (
              <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-3">
                  {cart.items.map((item: any) => (
                    <Card key={item.id} className="flex items-center p-4 gap-4">
                      <div className="w-16 h-16 bg-emerald-50 rounded-lg flex items-center justify-center text-2xl flex-shrink-0">🛒</div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm truncate">{item.product.title}</h3>
                        <p className="text-emerald-700 font-bold">₹{item.product.price}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="bg-gray-100 px-3 py-1 rounded-lg text-sm font-medium">×{item.quantity}</span>
                        <button onClick={() => removeFromCart(item.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </Card>
                  ))}
                </div>
                <Card className="h-fit sticky top-20">
                  <CardHeader><CardTitle className="text-lg">Order Summary</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between text-sm"><span>Subtotal</span><span>₹{cartTotal}</span></div>
                    <div className="flex justify-between text-sm"><span>Delivery</span><span className="text-emerald-600">Free</span></div>
                    <Separator />
                    <div className="flex justify-between font-bold text-lg"><span>Total</span><span>₹{cartTotal}</span></div>
                    <Button className="w-full bg-emerald-600 hover:bg-emerald-700" size="lg" onClick={() => setShowCheckout(true)}>Place Order (COD)</Button>
                    <p className="text-xs text-center text-gray-400">Cash on Delivery</p>
                  </CardContent>
                </Card>
              </div>
            )}
            <Dialog open={showCheckout} onOpenChange={setShowCheckout}>
              <DialogContent>
                <DialogHeader><DialogTitle>Confirm Order</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500">Delivery Address</p>
                    <p className="font-medium">{user?.address || 'No address set'}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500">Total Amount</p>
                    <p className="font-bold text-xl text-emerald-700">₹{cartTotal}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500">Payment Method</p>
                    <p className="font-medium">Cash on Delivery</p>
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" className="flex-1" onClick={() => setShowCheckout(false)}>Cancel</Button>
                    <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={placeOrder} disabled={loading}>{loading ? 'Placing...' : 'Confirm Order'}</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {/* ORDERS VIEW */}
        {view === 'orders' && (
          <div>
            <h2 className="text-xl font-bold mb-4">My Orders</h2>
            {!orders.length ? (
              <div className="text-center py-16 text-gray-400"><Package className="w-16 h-16 mx-auto mb-4" /><p>No orders yet</p></div>
            ) : (
              <div className="space-y-4">
                {orders.map((o: any) => (
                  <Card key={o.id} className="overflow-hidden">
                    <div className="p-4 flex flex-wrap items-center justify-between gap-2 border-b">
                      <div>
                        <p className="font-bold text-sm">{o.orderNumber}</p>
                        <p className="text-xs text-gray-500">{new Date(o.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={statusColor(o.orderStatus)}>{o.orderStatus}</Badge>
                        <Badge variant="outline">{o.paymentMethod === 'cod' ? 'COD' : 'Online'}</Badge>
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
                      <div className="flex justify-between font-bold"><span>Total</span><span className="text-emerald-700">₹{o.totalAmount}</span></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* NEEDS VIEW */}
        {view === 'needs' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">My Needs</h2>
              <Button onClick={() => setView('create_need')} className="bg-emerald-600 hover:bg-emerald-700"><PlusCircle className="w-4 h-4 mr-2" />Create Need</Button>
            </div>
            {!needs.length ? (
              <div className="text-center py-16 text-gray-400"><MessageCircle className="w-16 h-16 mx-auto mb-4" /><p>No needs posted yet</p></div>
            ) : (
              <div className="space-y-4">
                {needs.map((n: any) => (
                  <Card key={n.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold">{n.title}</h3>
                            <Badge className={statusColor(n.status)}>{n.status}</Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{n.description}</p>
                          <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{n.urgency}</span>
                            <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />{n.priceType === 'exact' ? `₹${n.exactPrice}` : n.priceType === 'minmax' ? `₹${n.minPrice}-${n.maxPrice}` : 'Price not set'}</span>
                          </div>
                          {n.offers?.length > 0 && (
                            <div className="mt-3">
                              <p className="text-xs font-semibold text-gray-500 mb-1">Offers ({n.offers.length})</p>
                              {n.offers.map((of: any) => (
                                <div key={of.id} className="bg-gray-50 rounded-lg p-2 mb-1 text-sm flex items-center justify-between">
                                  <span>{of.deliveryBoy?.user?.name}: ₹{of.offerAmount}</span>
                                  <div className="flex gap-1">
                                    {of.status === 'sent' && (
                                      <>
                                        <button onClick={async () => { await fetch(`/api/needs/${n.id}`, { method: 'POST', headers: authHeaders(user), body: JSON.stringify({ action: 'respond_offer', offerId: of.id, status: 'accepted' }) }); loadNeeds(); toast.success('Offer accepted!') }} className="text-xs px-2 py-1 bg-emerald-100 text-emerald-700 rounded">Accept</button>
                                        <button onClick={async () => { await fetch(`/api/needs/${n.id}`, { method: 'POST', headers: authHeaders(user), body: JSON.stringify({ action: 'respond_offer', offerId: of.id, status: 'rejected' }) }); loadNeeds(); }} className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded">Reject</button>
                                      </>
                                    )}
                                    <Badge variant="outline" className="text-xs">{of.status}</Badge>
                                  </div>
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
        )}

        {/* CREATE NEED VIEW */}
        {view === 'create_need' && (
          <div className="max-w-lg mx-auto">
            <h2 className="text-xl font-bold mb-4">Create a Need</h2>
            <Card>
              <CardContent className="p-6 space-y-4">
                <div><Label>Title</Label><Input id="need-title" placeholder="What do you need?" className="mt-1" /></div>
                <div><Label>Description</Label><Textarea id="need-desc" placeholder="Describe your requirement in detail..." className="mt-1" rows={3} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Price Type</Label>
                    <Select id="need-price-type" defaultValue="unknown">
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unknown">Not Sure</SelectItem>
                        <SelectItem value="exact">Exact Price</SelectItem>
                        <SelectItem value="minmax">Price Range</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Urgency</Label>
                    <Select id="need-urgency" defaultValue="1-2 days">
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1 hour">1 Hour</SelectItem>
                        <SelectItem value="2 hours">2 Hours</SelectItem>
                        <SelectItem value="6 hours">6 Hours</SelectItem>
                        <SelectItem value="1 day">1 Day</SelectItem>
                        <SelectItem value="1-2 days">1-2 Days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div><Label>Price (₹)</Label><Input id="need-price" type="number" placeholder="Enter price if known" className="mt-1" /></div>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => setView('needs')}>Cancel</Button>
                  <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={async () => {
                    const title = (document.getElementById('need-title') as HTMLInputElement).value
                    const desc = (document.getElementById('need-desc') as HTMLTextAreaElement).value
                    const priceType = (document.getElementById('need-price-type') as HTMLSelectElement).value
                    const urgency = (document.getElementById('need-urgency') as HTMLSelectElement).value
                    const price = (document.getElementById('need-price') as HTMLInputElement).value
                    if (!title) { toast.error('Title is required'); return }
                    await fetch('/api/needs', { method: 'POST', headers: authHeaders(user), body: JSON.stringify({ title, description: desc, priceType, urgency, exactPrice: priceType === 'exact' ? price : undefined }) })
                    toast.success('Need created!')
                    setView('needs')
                  }}>Post Need</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-[0_-2px_10px_rgba(0,0,0,0.05)] z-40">
        <div className="max-w-6xl mx-auto flex">
          {navItems.map(item => (
            <button key={item.id} onClick={() => setView(item.id)}
              className={`flex-1 flex flex-col items-center py-3 gap-1 transition-colors ${view === item.id ? 'text-emerald-600' : 'text-gray-400 hover:text-gray-600'}`}>
              <div className="relative">
                <item.icon className="w-5 h-5" />
                {item.badge > 0 && <span className="absolute -top-2 -right-3 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">{item.badge}</span>}
              </div>
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}