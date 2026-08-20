'use client'

// TODO: This file is large (~1065 lines). Consider extracting into:
//   - views/AssignmentsView, EarningsView, NeedsView, etc.
//   - shared/DeliveryOrderCard, OfferForm, etc.

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuthStore } from '@/store/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Truck, Package, MessageCircle, IndianRupee, LogOut, Clock, CheckCircle,
  MapPin, Send, ChevronLeft, User, Phone, Mail, Calendar, Star, Eye, EyeOff,
  Pencil, Car, Route, TrendingUp, X, AlertCircle, Wallet, ArrowDownCircle, ArrowUpCircle, RefreshCw, MessageSquare, ShoppingBag
} from 'lucide-react'
import { ChatPanel } from '@/components/chat/chat-panel'
import { toast } from 'sonner'

const headers = { 'Content-Type': 'application/json' }
function authH(token: string | null) { return { ...headers, 'Authorization': `Bearer ${token}` } }

export function DeliveryDashboard() {
  const { user, token, view, setView, logout } = useAuthStore()

  // Fix stale 'home' view from old storage
  useEffect(() => {
    if (view !== 'available' && view !== 'assignments' && view !== 'needs_browse' && view !== 'offers' && view !== 'wallet' && view !== 'profile' && !selectedNeed) {
      setView('available')
    }
  }, [])

  // Data
  const [availableOrders, setAvailableOrders] = useState<any[]>([])
  const [claimingOrder, setClaimingOrder] = useState<number | null>(null)
  const [assignments, setAssignments] = useState<any[]>([])
  const [offers, setOffers] = useState<any[]>([])
  const [needs, setNeeds] = useState<any[]>([])

  // Need detail
  const [selectedNeed, setSelectedNeed] = useState<any>(null)
  const [needComments, setNeedComments] = useState<any[]>([])
  const [commentText, setCommentText] = useState('')
  const [offerAmount, setOfferAmount] = useState('')
  const [offerMsg, setOfferMsg] = useState('')
  const [showOfferForm, setShowOfferForm] = useState(false)
  const commentsEndRef = useRef<HTMLDivElement>(null)

  // Profile
  const [profile, setProfile] = useState<any>(null)
  const [editProfile, setEditProfile] = useState(false)
  const [editName, setEditName] = useState('')
  const [editMobile, setEditMobile] = useState('')
  const [editAddress, setEditAddress] = useState('')
  const [editVehicle, setEditVehicle] = useState('')
  const [editVehicleNo, setEditVehicleNo] = useState('')
  const [showChangePw, setShowChangePw] = useState(false)
  const [curPw, setCurPw] = useState('')
  const [newPw, setNewPw] = useState('')

  // Wallet
  const [walletData, setWalletData] = useState<any>({ balance: 0, transactions: [], withdrawals: [] })
  const [withdrawForm, setWithdrawForm] = useState({ amount: '', upiId: '' })
  const [withdrawLoading, setWithdrawLoading] = useState(false)
  const [showWithdrawForm, setShowWithdrawForm] = useState(false)
  const walletLoaded = useRef(false)

  // Chat state
  const [chatOrder, setChatOrder] = useState<{ orderId: number; orderNumber: string; peerName: string } | null>(null)

  // === LOADERS ===
  const loadAvailable = useCallback(async () => {
    const res = await fetch('/api/delivery?section=available', { headers: authH(token) })
    const d = await res.json(); setAvailableOrders(d.orders || [])
  }, [user, token])

  const claimOrder = async (orderId: number) => {
    if (claimingOrder) return
    setClaimingOrder(orderId)
    try {
      const res = await fetch('/api/delivery', {
        method: 'POST', headers: authH(token),
        body: JSON.stringify({ action: 'claim_order', orderId })
      })
      if (res.ok) {
        toast.success('Order claimed! Check My Deliveries.')
        loadAvailable()
        loadAssignments()
      } else {
        const d = await res.json()
        toast.error(d.error || 'Failed to claim order')
      }
    } catch { toast.error('Network error') }
    setClaimingOrder(null)
  }

  const loadAssignments = useCallback(async () => {
    const res = await fetch('/api/delivery?section=assignments', { headers: authH(token) })
    const d = await res.json(); setAssignments(d.assignments || [])
  }, [user, token])

  const loadOffers = useCallback(async () => {
    const res = await fetch('/api/delivery?section=offers', { headers: authH(token) })
    const d = await res.json(); setOffers(d.offers || [])
  }, [user, token])

  const loadNeeds = useCallback(async () => {
    const res = await fetch('/api/needs', { headers: { ...headers, 'Authorization': `Bearer ${token}` } })
    const d = await res.json(); setNeeds(d.needs || [])
  }, [])

  const loadProfile = useCallback(async () => {
    const res = await fetch('/api/delivery?section=profile', { headers: authH(token) })
    const d = await res.json()
    setProfile(d)
    if (d.user) {
      setEditName(d.user.name || '')
      setEditMobile(d.user.mobile || '')
      setEditAddress(d.user.address || '')
    }
    if (d.deliveryBoy) {
      setEditVehicle(d.deliveryBoy.vehicleType || '')
      setEditVehicleNo(d.deliveryBoy.vehicleNumber || '')
    }
  }, [user, token])

  useEffect(() => { if (view === 'available') loadAvailable() }, [view, loadAvailable])
  useEffect(() => { if (view === 'assignments') loadAssignments() }, [view, loadAssignments])
  useEffect(() => { if (view === 'offers') loadOffers() }, [view, loadOffers])
  useEffect(() => { if (view === 'needs_browse') loadNeeds() }, [view, loadNeeds])
  useEffect(() => { if (view === 'profile') loadProfile() }, [view, loadProfile])

  const loadWallet = useCallback(async () => {
    const res = await fetch('/api/wallet', { headers: authH(token) })
    const d = await res.json()
    setWalletData(d)
  }, [user, token])

  useEffect(() => { if (view === 'wallet' && !walletLoaded.current) { loadWallet(); walletLoaded.current = true } }, [view, loadWallet])

  // Need detail
  const openNeed = (need: any) => {
    setSelectedNeed(need)
    setNeedComments(need.comments || [])
    setCommentText('')
    setShowOfferForm(false)
    setOfferAmount('')
    setOfferMsg('')
  }

  useEffect(() => {
    if (selectedNeed && commentsEndRef.current) {
      commentsEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [needComments, selectedNeed])

  const sendComment = async () => {
    if (!commentText.trim() || !selectedNeed) return
    const res = await fetch(`/api/needs/${selectedNeed.id}`, {
      method: 'POST', headers: authH(token),
      body: JSON.stringify({ action: 'comment', comment: commentText.trim() })
    })
    if (res.ok) {
      const d = await res.json()
      setNeedComments(prev => [...prev, { ...d.comment, user: { name: user?.name || 'Unknown' } }])
      setCommentText('')
    } else toast.error('Failed to send')
  }

  const makeOffer = async () => {
    if (!offerAmount || !selectedNeed) { toast.error('Enter amount'); return }
    const res = await fetch(`/api/needs/${selectedNeed.id}`, {
      method: 'POST', headers: authH(token),
      body: JSON.stringify({ action: 'offer', offerAmount: parseFloat(offerAmount), message: offerMsg })
    })
    if (res.ok) {
      toast.success('Offer sent!')
      setShowOfferForm(false)
      setOfferAmount('')
      setOfferMsg('')
      loadNeeds()
      loadOffers()
    } else toast.error('Failed to send offer')
  }

  // Assignment actions
  const updateAssignment = async (assignmentId: number, orderId: number, status: string) => {
    await fetch('/api/delivery', {
      method: 'POST', headers: authH(token),
      body: JSON.stringify({ action: 'update_assignment', assignmentId, orderId, status })
    })
    toast.success(`Delivery ${status}!`)
    loadAssignments()
  }

  // Profile actions
  const saveProfile = async () => {
    if (!editName.trim()) { toast.error('Name is required'); return }
    const res = await fetch('/api/delivery', {
      method: 'POST', headers: authH(token),
      body: JSON.stringify({ action: 'update_profile', name: editName, mobile: editMobile, address: editAddress, vehicleType: editVehicle, vehicleNumber: editVehicleNo })
    })
    if (res.ok) {
      toast.success('Profile updated!')
      setEditProfile(false)
      loadProfile()
    } else toast.error('Failed')
  }

  const changePassword = async () => {
    if (newPw.length < 6) { toast.error('Min 6 characters'); return }
    const res = await fetch('/api/profile', {
      method: 'PUT', headers: authH(token),
      body: JSON.stringify({ action: 'change_password', currentPassword: curPw, newPassword: newPw })
    })
    if (res.ok) {
      toast.success('Password changed!')
      setShowChangePw(false); setCurPw(''); setNewPw('')
    } else {
      const d = await res.json(); toast.error(d.error || 'Failed')
    }
  }

  // Helpers
  const statusColor = (s: string) => ({
    assigned: 'bg-amber-100 text-amber-700', accepted: 'bg-blue-100 text-blue-700',
    confirmed: 'bg-emerald-100 text-emerald-700', preparing: 'bg-amber-100 text-amber-700',
    picked: 'bg-purple-100 text-purple-700', picked_up: 'bg-purple-100 text-purple-700',
    out_for_delivery: 'bg-blue-100 text-blue-700',
    delivered: 'bg-emerald-100 text-emerald-700',
    cancelled: 'bg-red-100 text-red-700', sent: 'bg-amber-100 text-amber-700',
    rejected: 'bg-red-100 text-red-700', failed: 'bg-red-100 text-red-700',
    pending: 'bg-gray-100 text-gray-700', active: 'bg-emerald-100 text-emerald-700',
  })[s] || 'bg-gray-100 text-gray-700'
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  const fmtTime = (d: string) => new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  const fmtDateTime = (d: string) => new Date(d).toLocaleString('en-IN')

  const navItems = [
    { id: 'available', label: 'Available', icon: ShoppingBag },
    { id: 'assignments', label: 'My Delivery', icon: Truck },
    { id: 'needs_browse', label: 'Needs', icon: MessageCircle },
    { id: 'offers', label: 'My Offers', icon: IndianRupee },
    { id: 'wallet', label: 'Wallet', icon: Wallet },
    { id: 'profile', label: 'Profile', icon: User },
  ]

  // Withdraw handler
  const submitWithdraw = async () => {
    const amt = parseFloat(withdrawForm.amount)
    if (!amt || amt < 50) { toast.error('Minimum withdrawal is ₹50'); return }
    if (!withdrawForm.upiId.trim()) { toast.error('UPI ID is required'); return }
    if (amt > walletData.balance) { toast.error('Insufficient balance'); return }
    setWithdrawLoading(true)
    try {
      const res = await fetch('/api/wallet', {
        method: 'POST', headers: authH(token),
        body: JSON.stringify({ action: 'withdraw', amount: amt, upiId: withdrawForm.upiId.trim() })
      })
      if (res.ok) {
        toast.success('Withdrawal request submitted!')
        setWithdrawForm({ amount: '', upiId: '' })
        setShowWithdrawForm(false)
        loadWallet()
      } else {
        const d = await res.json()
        toast.error(d.error || 'Failed to submit request')
      }
    } catch { toast.error('Network error') }
    setWithdrawLoading(false)
  }

  const txIcon = (type: string) => {
    if (type === 'credit') return <ArrowDownCircle className="w-5 h-5 text-emerald-500" />
    if (type === 'withdrawal_request') return <ArrowUpCircle className="w-5 h-5 text-red-500" />
    if (type === 'withdrawal_refund') return <RefreshCw className="w-5 h-5 text-blue-500" />
    return <Wallet className="w-5 h-5 text-gray-400" />
  }

  const isCredit = (type: string) => type === 'credit' || type === 'withdrawal_refund'

  const withdrawBadgeColor = (s: string) => ({
    pending: 'bg-amber-100 text-amber-700',
    completed: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-red-100 text-red-700'
  })[s] || 'bg-gray-100 text-gray-700'

  const renderWallet = () => (
    <div className="space-y-4">
      {/* Balance Card */}
      <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
            <Wallet className="w-7 h-7" />
          </div>
          <span className="text-emerald-100 text-sm font-medium">Wallet Balance</span>
        </div>
        <p className="text-4xl font-bold tracking-tight">₹{walletData.balance || 0}</p>
      </div>

      {/* Quick Withdraw Button */}
      <Button
        className="w-full h-11 bg-emerald-600 hover:bg-emerald-700"
        onClick={() => setShowWithdrawForm(f => !f)}
      >
        <Wallet className="w-4 h-4 mr-2" />Withdraw Funds
      </Button>

      {/* Withdrawal Form */}
      {showWithdrawForm && (
        <Card className="border-emerald-200">
          <CardContent className="p-4 space-y-3">
            <h3 className="font-semibold text-sm">Request Withdrawal</h3>
            <div>
              <Label className="text-xs">Amount (₹)</Label>
              <Input
                type="number"
                min={50}
                placeholder="Enter amount"
                value={withdrawForm.amount}
                onChange={e => setWithdrawForm(f => ({ ...f, amount: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">UPI ID *</Label>
              <Input
                placeholder="yourname@upi"
                value={withdrawForm.upiId}
                onChange={e => setWithdrawForm(f => ({ ...f, upiId: e.target.value }))}
                className="mt-1"
              />
            </div>
            <p className="text-xs text-gray-500">Minimum withdrawal: ₹50</p>
            <p className="text-xs text-gray-500">Current balance: ₹{walletData.balance || 0}</p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowWithdrawForm(false)}>Cancel</Button>
              <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={submitWithdraw} disabled={withdrawLoading}>
                {withdrawLoading ? 'Submitting...' : 'Submit Withdrawal Request'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transaction History */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          {(!walletData.transactions || walletData.transactions.length === 0) ? (
            <p className="text-sm text-gray-400 text-center py-8">No transactions yet</p>
          ) : (
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {walletData.transactions.map((t: any) => (
                <div key={t.id} className="flex items-center gap-3 py-3 border-b last:border-0">
                  {txIcon(t.type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{t.description}</p>
                    <p className="text-xs text-gray-400">{fmtDateTime(t.createdAt)}</p>
                  </div>
                  <span className={`text-sm font-bold ${isCredit(t.type) ? 'text-emerald-600' : 'text-red-500'}`}>
                    {isCredit(t.type) ? '+' : '-'}₹{t.amount}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Withdrawal History */}
      {walletData.withdrawals && walletData.withdrawals.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Withdrawal History</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {walletData.withdrawals.map((w: any) => (
                <div key={w.id} className="py-3 border-b last:border-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold">₹{w.amount}</span>
                    <Badge className={withdrawBadgeColor(w.status)}>{w.status}</Badge>
                  </div>
                  <p className="text-xs text-gray-500">UPI: {w.upiId} · {fmtDateTime(w.createdAt)}</p>
                  {w.status === 'rejected' && w.adminNotes && (
                    <p className="text-xs text-red-500 mt-1">Reason: {w.adminNotes}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )

  // ===================== RENDER =====================
  return (
    <>
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b shadow-sm">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          {selectedNeed ? (
            <div className="flex items-center gap-3">
              <button onClick={() => setSelectedNeed(null)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="font-bold text-sm truncate max-w-[200px]">Need Details</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
                <Truck className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="font-bold text-sm">Delivery Panel</span>
                <p className="text-[10px] text-gray-500 -mt-0.5">{user?.name}</p>
              </div>
            </div>
          )}
          {!selectedNeed && (
            <button onClick={logout} className="p-2 hover:bg-red-50 rounded-full text-red-500 transition-colors">
              <LogOut className="w-5 h-5" />
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 pb-20 pt-4">
        {/* ===== NEED DETAIL VIEW ===== */}
        {selectedNeed && (
          <div className="space-y-4">
            {/* Need Info */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex-1">
                    <h2 className="font-bold text-lg">{selectedNeed.title}</h2>
                    <p className="text-sm text-gray-500 mt-0.5">By {selectedNeed.user?.name} · {fmtDate(selectedNeed.createdAt)}</p>
                  </div>
                  <Badge className={statusColor(selectedNeed.status)}>{selectedNeed.status}</Badge>
                </div>
                {selectedNeed.description && (
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg mb-3">{selectedNeed.description}</p>
                )}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-gray-50 p-2.5 rounded-lg">
                    <p className="text-[10px] text-gray-500">Price</p>
                    <p className="font-bold text-sm mt-0.5">
                      {selectedNeed.priceType === 'exact' ? `₹${selectedNeed.exactPrice}`
                        : selectedNeed.priceType === 'minmax' ? `₹${selectedNeed.minPrice}-${selectedNeed.maxPrice}`
                        : 'Negotiable'}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-2.5 rounded-lg">
                    <p className="text-[10px] text-gray-500">Urgency</p>
                    <p className="font-bold text-sm mt-0.5">{selectedNeed.urgency}</p>
                  </div>
                  <div className="bg-gray-50 p-2.5 rounded-lg">
                    <p className="text-[10px] text-gray-500">Offers</p>
                    <p className="font-bold text-sm mt-0.5">{selectedNeed.offers?.length || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Comments / Messages */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <MessageCircle className="w-4 h-4" />
                  Messages ({needComments.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="space-y-3 max-h-64 overflow-y-auto mb-3">
                  {needComments.length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-4">No messages yet. Say hello!</p>
                  )}
                  {needComments.map((c: any) => (
                    <div key={c.id} className={`flex gap-2 ${c.user?.name === user?.name ? 'flex-row-reverse' : ''}`}>
                      <Avatar className="w-7 h-7 flex-shrink-0">
                        <AvatarFallback className={`text-[10px] font-bold ${c.user?.name === user?.name ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                          {c.user?.name?.[0] || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className={`max-w-[75%] ${c.user?.name === user?.name ? 'items-end' : ''}`}>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-medium">{c.user?.name}</span>
                          <span className="text-[10px] text-gray-400">{fmtTime(c.createdAt)}</span>
                        </div>
                        <div className={`text-sm p-2.5 rounded-xl ${c.user?.name === user?.name
                          ? 'bg-emerald-600 text-white rounded-tr-sm'
                          : 'bg-gray-100 text-gray-800 rounded-tl-sm'}`}>
                          {c.comment}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={commentsEndRef} />
                </div>

                {/* Message Input */}
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Textarea
                      placeholder="Type a message..."
                      value={commentText}
                      onChange={e => setCommentText(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendComment() } }}
                      className="resize-none min-h-[40px] max-h-24 text-sm"
                      rows={1}
                      autoFocus
                    />
                  </div>
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 h-10 w-10 p-0 flex-shrink-0"
                    onClick={sendComment}
                    disabled={!commentText.trim()}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Existing Offers */}
            {selectedNeed.offers && selectedNeed.offers.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <IndianRupee className="w-4 h-4" />
                    Existing Offers ({selectedNeed.offers.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-2">
                  {selectedNeed.offers.map((o: any) => (
                    <div key={o.id} className="flex items-center justify-between bg-amber-50 p-3 rounded-lg border border-amber-100">
                      <div>
                        <p className="font-medium text-sm">{o.deliveryBoy?.user?.name}</p>
                        {o.message && <p className="text-xs text-gray-500 mt-0.5">{o.message}</p>}
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-emerald-700">₹{o.offerAmount}</p>
                        <Badge className={`${statusColor(o.status)} text-[10px] mt-0.5`}>{o.status}</Badge>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Make Offer Button */}
            {selectedNeed.status === 'active' && !showOfferForm && (
              <Button
                className="w-full bg-emerald-600 hover:bg-emerald-700 h-11"
                onClick={() => setShowOfferForm(true)}
              >
                <IndianRupee className="w-4 h-4 mr-2" />Make an Offer
              </Button>
            )}

            {/* Offer Form */}
            {showOfferForm && (
              <Card className="border-emerald-200">
                <CardContent className="p-4 space-y-3">
                  <h3 className="font-semibold text-sm">Send Your Offer</h3>
                  <div>
                    <Label className="text-xs">Amount (₹) *</Label>
                    <Input
                      type="number"
                      placeholder="Enter your price"
                      value={offerAmount}
                      onChange={e => setOfferAmount(e.target.value)}
                      className="mt-1"
                      autoFocus
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Message (optional)</Label>
                    <Textarea
                      placeholder="Any message for the customer..."
                      value={offerMsg}
                      onChange={e => setOfferMsg(e.target.value)}
                      className="mt-1 resize-none"
                      rows={2}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => { setShowOfferForm(false); setOfferAmount(''); setOfferMsg('') }}>Cancel</Button>
                    <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={makeOffer} disabled={!offerAmount}>Send Offer</Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* ===== AVAILABLE ORDERS VIEW ===== */}
        {!selectedNeed && view === 'available' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold">Available Orders</h2>
                <p className="text-xs text-gray-500 mt-0.5">Tap Accept to claim a delivery</p>
              </div>
              <button onClick={loadAvailable} className="p-2 hover:bg-gray-100 rounded-lg">
                <RefreshCw className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            {!availableOrders.length ? (
              <div className="text-center py-16 text-gray-400">
                <ShoppingBag className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="font-medium">No available orders</p>
                <p className="text-sm mt-1">New orders will appear here when ready for delivery</p>
              </div>
            ) : (
              <div className="space-y-3">
                {availableOrders.map((o: any) => (
                  <Card key={o.id} className="overflow-hidden">
                    <div className="p-4 pb-3 flex items-center justify-between border-b">
                      <div>
                        <p className="font-bold text-sm">#{o.orderNumber}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{o.user?.name} · {fmtDate(o.createdAt)}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Badge className={`text-[10px] ${o.paymentMethod === 'cod' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {o.paymentMethod === 'cod' ? 'COD' : 'Online'}
                        </Badge>
                        <Badge className={statusColor(o.orderStatus)}>{o.orderStatus}</Badge>
                      </div>
                    </div>
                    <CardContent className="p-4 pt-3">
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                        <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="line-clamp-2">{o.shippingAddress}</span>
                      </div>
                      <div className="space-y-1 mb-3">
                        {o.items?.map((i: any) => (
                          <div key={i.id} className="text-sm flex justify-between">
                            <span className="text-gray-600">{i.productName} × {i.quantity}</span>
                            <span className="font-medium">₹{i.totalPrice}</span>
                          </div>
                        ))}
                      </div>
                      <Separator className="my-2" />
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-sm">
                          Total: <span className="text-emerald-700">₹{o.totalAmount}</span>
                          {o.deliveryFee > 0 && <span className="text-xs text-gray-400 font-normal ml-2">(+₹{o.deliveryFee} delivery)</span>}
                        </div>
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700"
                          disabled={claimingOrder === o.id}
                          onClick={() => claimOrder(o.id)}
                        >
                          {claimingOrder === o.id ? (
                            <><RefreshCw className="w-3.5 h-3.5 mr-1 animate-spin" />Claiming...</>
                          ) : (
                            <><CheckCircle className="w-3.5 h-3.5 mr-1" />Accept Delivery</>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===== ASSIGNMENTS VIEW ===== */}
        {!selectedNeed && view === 'assignments' && (
          <div>
            <h2 className="text-xl font-bold mb-4">My Deliveries</h2>
            <p className="text-xs text-gray-500 mb-4">Orders you've accepted for delivery</p>
            {!assignments.length ? (
              <div className="text-center py-16 text-gray-400">
                <Truck className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="font-medium">No deliveries yet</p>
                <p className="text-sm mt-1">Go to Available tab to accept orders</p>
              </div>
            ) : (
              <div className="space-y-3">
                {assignments.map((a: any) => (
                  <Card key={a.id}>
                    <div className="p-4 pb-3 flex items-center justify-between border-b">
                      <div>
                        <p className="font-bold text-sm">#{a.order?.orderNumber}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{a.order?.user?.name} · {fmtDate(a.assignedAt)}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Badge className={`text-[10px] ${a.order?.paymentMethod === 'cod' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{a.order?.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Paid'}</Badge>
                        <Badge className={statusColor(a.status)}>{a.status}</Badge>
                      </div>
                    </div>
                    <CardContent className="p-4 pt-3">
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                        <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="line-clamp-2">{a.order?.shippingAddress}</span>
                      </div>
                      {/* Items for product orders, need info for need orders */}
                      {a.order?.orderType === 'need' ? (
                        <div className="bg-emerald-50 rounded-lg p-3 mb-3">
                          <p className="text-xs text-emerald-600 font-medium">Custom Need Delivery</p>
                          <p className="text-sm text-gray-700">₹{a.order?.totalAmount} (collected from customer)</p>
                        </div>
                      ) : (
                        <div className="space-y-1 mb-3">
                          {a.order?.items?.map((i: any) => (
                            <div key={i.id} className="text-sm flex justify-between">
                              <span className="text-gray-600">{i.productName} × {i.quantity}</span>
                              <span className="font-medium">₹{i.totalPrice}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <Separator className="my-2" />
                      <div className="flex justify-between font-bold text-sm mb-3">
                        <span>Total</span>
                        <span className="text-emerald-700">₹{a.order?.totalAmount}</span>
                      </div>
                      <div className="flex gap-2">
                        {/* Chat button — only on active need deliveries */}
                        {a.order?.orderType === 'need' && !['delivered', 'failed', 'cancelled'].includes(a.status) && (
                          <Button size="sm" variant="outline" className="text-emerald-600 border-emerald-300 hover:bg-emerald-50" onClick={() => setChatOrder({ orderId: a.orderId, orderNumber: a.order?.orderNumber, peerName: a.order?.user?.name || 'Customer' })}>
                            <MessageSquare className="w-3.5 h-3.5 mr-1" />Chat
                          </Button>
                        )}
                        {a.status === 'assigned' && (
                          <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => updateAssignment(a.id, a.orderId, 'accepted')}>
                            <CheckCircle className="w-3.5 h-3.5 mr-1" />Accept
                          </Button>
                        )}
                        {a.status === 'accepted' && (
                          <Button size="sm" className="bg-purple-600 hover:bg-purple-700" onClick={() => updateAssignment(a.id, a.orderId, 'picked')}>
                            <Package className="w-3.5 h-3.5 mr-1" />Mark Picked
                          </Button>
                        )}
                        {a.status === 'picked' && a.order?.paymentMethod === 'cod' && (
                          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => updateAssignment(a.id, a.orderId, 'delivered')}>
                            <CheckCircle className="w-3.5 h-3.5 mr-1" />Mark Delivered
                          </Button>
                        )}
                        {a.status === 'picked' && a.order?.paymentMethod === 'online' && (
                          <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Waiting for customer to confirm</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===== NEEDS BROWSE VIEW ===== */}
        {!selectedNeed && view === 'needs_browse' && (
          <div>
            <h2 className="text-xl font-bold mb-4">Open Needs</h2>
            {needs.filter((n: any) => n.status === 'active').length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="font-medium">No open needs</p>
                <p className="text-sm mt-1">Check back later for new requirements</p>
              </div>
            ) : (
              <div className="space-y-3">
                {needs.filter((n: any) => n.status === 'active').map((n: any) => (
                  <Card key={n.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openNeed(n)}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <h3 className="font-bold text-sm">{n.title}</h3>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{n.description || 'No description'}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-bold text-emerald-700 text-sm">
                            {n.priceType === 'exact' ? `₹${n.exactPrice}`
                              : n.priceType === 'minmax' ? `₹${n.minPrice}-${n.maxPrice}`
                              : 'Negotiable'}
                          </p>
                          <Badge className={`${statusColor(n.status)} text-[10px] mt-1`}>{n.status}</Badge>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3 mt-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><User className="w-3 h-3" />{n.user?.name}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{n.urgency}</span>
                        <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" />{n.comments?.length || 0}</span>
                        <span className="flex items-center gap-1"><IndianRupee className="w-3 h-3" />{n.offers?.length || 0} offers</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===== MY OFFERS VIEW ===== */}
        {!selectedNeed && view === 'offers' && (
          <div>
            <h2 className="text-xl font-bold mb-4">My Offers</h2>
            {!offers.length ? (
              <div className="text-center py-16 text-gray-400">
                <IndianRupee className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="font-medium">No offers yet</p>
                <p className="text-sm mt-1">Browse needs and make your first offer</p>
              </div>
            ) : (
              <div className="space-y-3">
                {offers.map((o: any) => (
                  <Card key={o.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => {
                    if (o.need) openNeed({ ...o.need, comments: o.need.comments || [] })
                  }}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-sm truncate flex-1">{o.need?.title}</h3>
                        <Badge className={statusColor(o.status)}>{o.status}</Badge>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="text-xs text-gray-500">
                          <span>{o.need?.user?.name}</span>
                          <span className="mx-2">·</span>
                          <span>{fmtDate(o.createdAt)}</span>
                        </div>
                        <p className="font-bold text-emerald-700">₹{o.offerAmount}</p>
                      </div>
                      {o.message && (
                        <p className="text-xs text-gray-500 mt-2 bg-gray-50 p-2 rounded-lg">"{o.message}"</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===== WALLET VIEW ===== */}
        {!selectedNeed && view === 'wallet' && renderWallet()}

        {/* ===== PROFILE VIEW ===== */}
        {!selectedNeed && view === 'profile' && profile && (profile.user || profile.deliveryBoy) && (
          <div className="space-y-4">
            {/* Avatar Header */}
            <Card>
              <CardContent className="p-6 text-center">
                <Avatar className="w-20 h-20 mx-auto mb-3">
                  <AvatarFallback className="bg-emerald-100 text-emerald-700 text-2xl font-bold">
                    {profile.user?.name?.[0] || 'D'}
                  </AvatarFallback>
                </Avatar>
                <h2 className="text-xl font-bold">{profile.user?.name}</h2>
                <p className="text-sm text-gray-500">{profile.user?.email}</p>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <Badge className="bg-blue-100 text-blue-700">Delivery Boy</Badge>
                  <Badge className={statusColor(profile.deliveryBoy?.status || 'active')}>
                    {profile.deliveryBoy?.status || 'active'}
                  </Badge>
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
                <Route className="w-5 h-5 mx-auto text-emerald-600 mb-1" />
                <p className="text-2xl font-bold">{profile.stats?.totalDeliveries || 0}</p>
                <p className="text-xs text-gray-500">Delivered</p>
              </Card>
              <Card className="p-4 text-center">
                <Star className="w-5 h-5 mx-auto text-amber-500 mb-1" />
                <p className="text-2xl font-bold">{profile.stats?.rating || 'N/A'}</p>
                <p className="text-xs text-gray-500">Rating</p>
              </Card>
              <Card className="p-4 text-center">
                <Truck className="w-5 h-5 mx-auto text-blue-600 mb-1" />
                <p className="text-2xl font-bold">{profile.stats?.pending || 0}</p>
                <p className="text-xs text-gray-500">Pending</p>
              </Card>
              <Card className="p-4 text-center">
                <IndianRupee className="w-5 h-5 mx-auto text-purple-600 mb-1" />
                <p className="text-2xl font-bold">{profile.stats?.acceptedOffers || 0}</p>
                <p className="text-xs text-gray-500">Accepted Offers</p>
              </Card>
            </div>

            {/* Info Card */}
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold text-sm mb-3">Information</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">{profile.user?.mobile || 'Not set'}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">{profile.user?.address || profile.deliveryBoy?.address || 'Not set'}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Car className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">{profile.deliveryBoy?.vehicleType || 'Not set'} {profile.deliveryBoy?.vehicleNumber ? `· ${profile.deliveryBoy.vehicleNumber}` : ''}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">Joined {fmtDate(profile.user?.createdAt)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Edit Profile Form */}
            {editProfile && (
              <Card className="border-emerald-200">
                <CardContent className="p-4 space-y-4">
                  <h3 className="font-semibold text-sm">Edit Profile</h3>
                  <div>
                    <Label className="text-xs">Name *</Label>
                    <Input value={editName} onChange={e => setEditName(e.target.value)} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Mobile</Label>
                    <Input value={editMobile} onChange={e => setEditMobile(e.target.value)} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Address</Label>
                    <Textarea value={editAddress} onChange={e => setEditAddress(e.target.value)} className="mt-1 resize-none" rows={2} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Vehicle Type</Label>
                      <Input value={editVehicle} onChange={e => setEditVehicle(e.target.value)} className="mt-1" placeholder="Bike, Scooter, etc." />
                    </div>
                    <div>
                      <Label className="text-xs">Vehicle Number</Label>
                      <Input value={editVehicleNo} onChange={e => setEditVehicleNo(e.target.value)} className="mt-1" placeholder="MH-12-AB-1234" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => setEditProfile(false)}>Cancel</Button>
                    <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={saveProfile}>Save</Button>
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
                  <ChevronLeft className="w-4 h-4 text-gray-400 rotate-180" />
                </CardContent>
              </Card>
            ) : (
              <Card className="border-red-200">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm">Change Password</h3>
                    <button onClick={() => { setShowChangePw(false); setCurPw(''); setNewPw('') }}><X className="w-4 h-4 text-gray-400" /></button>
                  </div>
                  <div>
                    <Label className="text-xs">Current Password</Label>
                    <Input type="password" value={curPw} onChange={e => setCurPw(e.target.value)} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">New Password (min 6 chars)</Label>
                    <Input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} className="mt-1" />
                  </div>
                  <Button className="w-full bg-red-600 hover:bg-red-700" onClick={changePassword}>Update Password</Button>
                </CardContent>
              </Card>
            )}

            {/* Recent Delivery History */}
            {profile.recentHistory?.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Recent Delivery History</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {profile.recentHistory.map((h: any) => (
                      <div key={h.id} className="flex items-center justify-between text-sm py-2 border-b last:border-0">
                        <div>
                          <p className="font-medium">Order #{h.orderId}</p>
                          <p className="text-xs text-gray-400">{fmtDate(h.createdAt)}</p>
                        </div>
                        <Badge className={statusColor(h.deliveryStatus)}>{h.deliveryStatus}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {!selectedNeed && view === 'profile' && (!profile || (!profile.user && !profile.deliveryBoy)) && (
          <div className="text-center py-16 text-gray-400">
            <User className="w-16 h-16 mx-auto mb-4 opacity-50" />
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
              onClick={() => { setSelectedNeed(null); setView(item.id) }}
              className={`flex-1 flex flex-col items-center py-2.5 gap-0.5 transition-colors ${view === item.id && !selectedNeed ? 'text-emerald-600' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <item.icon className="w-5 h-5" />
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
      userRole='delivery'
      peerName={chatOrder?.peerName || 'Customer'}
      peerRole='customer'
      token={token}
    />
    </>
  )
}
