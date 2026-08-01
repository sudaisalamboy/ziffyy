'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '@/store/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Truck, Package, MessageCircle, DollarSign, LogOut, Clock, CheckCircle, MapPin, Send } from 'lucide-react'
import { toast } from 'sonner'

const headers = { 'Content-Type': 'application/json' }
function authHeaders(user: any) { return { ...headers, 'x-user-id': String(user.id), 'x-user-role': user.role } }

export function DeliveryDashboard() {
  const { user, view, setView, logout } = useAuthStore()
  const [assignments, setAssignments] = useState<any[]>([])
  const [offers, setOffers] = useState<any[]>([])
  const [needs, setNeeds] = useState<any[]>([])
  const [offerAmount, setOfferAmount] = useState('')
  const [offerNeedId, setOfferNeedId] = useState<number | null>(null)

  const loadAssignments = useCallback(async () => {
    const res = await fetch('/api/delivery?section=assignments', { headers: authHeaders(user) })
    const d = await res.json()
    setAssignments(d.assignments || [])
  }, [user])

  const loadOffers = useCallback(async () => {
    const res = await fetch('/api/delivery?section=offers', { headers: authHeaders(user) })
    const d = await res.json()
    setOffers(d.offers || [])
  }, [user])

  const loadNeeds = useCallback(async () => {
    const res = await fetch('/api/needs', { headers: { ...headers, 'x-user-id': '0', 'x-user-role': 'delivery' } })
    const d = await res.json()
    setNeeds(d.needs || [])
  }, [])

  useEffect(() => { if (view === 'assignments') loadAssignments() }, [view, loadAssignments])
  useEffect(() => { if (view === 'offers') loadOffers() }, [view, loadOffers])
  useEffect(() => { if (view === 'needs_browse') loadNeeds() }, [view, loadNeeds])

  const updateAssignment = async (assignmentId: number, orderId: number, status: string) => {
    await fetch('/api/delivery', {
      method: 'POST', headers: authHeaders(user),
      body: JSON.stringify({ action: 'update_assignment', assignmentId, orderId, status })
    })
    toast.success(`Delivery ${status}!`)
    loadAssignments()
  }

  const makeOffer = async (needId: number) => {
    if (!offerAmount) { toast.error('Enter an amount'); return }
    await fetch(`/api/needs/${needId}`, {
      method: 'POST', headers: authHeaders(user),
      body: JSON.stringify({ action: 'offer', offerAmount: parseFloat(offerAmount) })
    })
    toast.success('Offer sent!')
    setOfferAmount('')
    setOfferNeedId(null)
    loadNeeds()
  }

  const statusColor = (s: string) => {
    const m: any = { assigned: 'bg-amber-100 text-amber-700', accepted: 'bg-blue-100 text-blue-700', picked: 'bg-purple-100 text-purple-700', delivered: 'bg-emerald-100 text-emerald-700', cancelled: 'bg-red-100 text-red-700' }
    return m[s] || 'bg-gray-100 text-gray-700'
  }

  const navItems = [
    { id: 'assignments', label: 'Deliveries', icon: Truck },
    { id: 'needs_browse', label: 'Needs', icon: MessageCircle },
    { id: 'offers', label: 'My Offers', icon: DollarSign },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-50 bg-white border-b shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center"><Truck className="w-5 h-5 text-white" /></div>
            <div><span className="font-bold text-lg">Delivery Panel</span><p className="text-xs text-gray-500">{user?.name}</p></div>
          </div>
          <button onClick={logout} className="p-2 hover:bg-red-50 rounded-full text-red-500"><LogOut className="w-5 h-5" /></button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 pb-24 pt-4">
        {/* Deliveries View */}
        {view === 'assignments' && (
          <div>
            <h2 className="text-xl font-bold mb-4">Delivery Assignments</h2>
            {!assignments.length ? (
              <div className="text-center py-16 text-gray-400"><Truck className="w-16 h-16 mx-auto mb-4" /><p>No assignments yet</p></div>
            ) : (
              <div className="space-y-4">
                {assignments.map((a: any) => (
                  <Card key={a.id}>
                    <div className="p-4 flex flex-wrap items-center justify-between gap-2 border-b">
                      <div>
                        <p className="font-bold text-sm">#{a.order?.orderNumber}</p>
                        <p className="text-xs text-gray-500">{a.order?.user?.name} · {new Date(a.assignedAt).toLocaleDateString('en-IN')}</p>
                      </div>
                      <Badge className={statusColor(a.status)}>{a.status}</Badge>
                    </div>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                        <MapPin className="w-4 h-4" /><span>{a.order?.shippingAddress}</span>
                      </div>
                      <div className="space-y-1 mb-3">
                        {a.order?.items?.map((i: any) => (
                          <div key={i.id} className="text-sm flex justify-between"><span>{i.productName} × {i.quantity}</span><span>₹{i.totalPrice}</span></div>
                        ))}
                      </div>
                      <div className="flex justify-between font-bold text-sm mb-3"><span>Total</span><span className="text-emerald-700">₹{a.order?.totalAmount}</span></div>
                      <div className="flex gap-2">
                        {a.status === 'assigned' && (
                          <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => updateAssignment(a.id, a.orderId, 'accepted')}><CheckCircle className="w-3 h-3 mr-1" />Accept</Button>
                        )}
                        {a.status === 'accepted' && (
                          <Button size="sm" className="bg-purple-600 hover:bg-purple-700" onClick={() => updateAssignment(a.id, a.orderId, 'picked')}>Mark Picked</Button>
                        )}
                        {a.status === 'picked' && (
                          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => updateAssignment(a.id, a.orderId, 'delivered')}>Mark Delivered</Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Browse Needs View */}
        {view === 'needs_browse' && (
          <div>
            <h2 className="text-xl font-bold mb-4">Open Needs</h2>
            <div className="space-y-4">
              {needs.filter((n: any) => n.status === 'active').map((n: any) => (
                <Card key={n.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h3 className="font-bold">{n.title}</h3>
                        <p className="text-sm text-gray-600 mt-1">{n.description}</p>
                        <div className="flex flex-wrap gap-3 text-xs text-gray-500 mt-2">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{n.urgency}</span>
                          <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />{n.priceType === 'exact' ? `₹${n.exactPrice}` : n.priceType === 'minmax' ? `₹${n.minPrice}-${n.maxPrice}` : 'Negotiable'}</span>
                          <span>By {n.user?.name}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      {offerNeedId === n.id ? (
                        <div className="flex items-center gap-2 flex-1">
                          <Input type="number" placeholder="Amount" value={offerAmount} onChange={e => setOfferAmount(e.target.value)} className="h-9" />
                          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 h-9" onClick={() => makeOffer(n.id)}><Send className="w-3 h-3" /></Button>
                          <Button size="sm" variant="outline" className="h-9" onClick={() => { setOfferNeedId(null); setOfferAmount('') }}>Cancel</Button>
                        </div>
                      ) : (
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => setOfferNeedId(n.id)}><DollarSign className="w-3 h-3 mr-1" />Make Offer</Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* My Offers View */}
        {view === 'offers' && (
          <div>
            <h2 className="text-xl font-bold mb-4">My Offers</h2>
            {!offers.length ? (
              <div className="text-center py-16 text-gray-400"><DollarSign className="w-16 h-16 mx-auto mb-4" /><p>No offers made yet</p></div>
            ) : (
              <div className="space-y-3">
                {offers.map((o: any) => (
                  <Card key={o.id} className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-sm">{o.need?.title}</p>
                      <p className="text-xs text-gray-500">₹{o.offerAmount} · {new Date(o.createdAt).toLocaleDateString('en-IN')}</p>
                    </div>
                    <Badge className={o.status === 'accepted' ? 'bg-emerald-100 text-emerald-700' : o.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}>{o.status}</Badge>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-[0_-2px_10px_rgba(0,0,0,0.05)] z-40">
        <div className="max-w-6xl mx-auto flex">
          {navItems.map(item => (
            <button key={item.id} onClick={() => setView(item.id)}
              className={`flex-1 flex flex-col items-center py-3 gap-1 transition-colors ${view === item.id ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}>
              <item.icon className="w-5 h-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}