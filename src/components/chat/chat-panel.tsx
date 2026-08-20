'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { X, Send, MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ChatPanelProps {
  open: boolean
  onClose: () => void
  orderId: number
  orderNumber: string
  userId: number
  userName: string
  userRole: string
  peerName: string
  peerRole: string
  token: string | null
}

interface ChatMsg {
  id: number
  orderId: number
  senderId: number
  senderRole: string
  senderName?: string
  message: string
  read: boolean
  createdAt: string
}

export function ChatPanel({ open, onClose, orderId, orderNumber, userId, userName, userRole, peerName, peerRole, token }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [peerOnline, setPeerOnline] = useState(false)
  const [peerTyping, setPeerTyping] = useState(false)
  const [loading, setLoading] = useState(true)
  const [minimized, setMinimized] = useState(false)

  const socketRef = useRef<Socket | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const typingTimeout = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    if (!open) return
    // XTransformPort routes through the Caddy reverse proxy to the chat microservice.
    // In a standard deployment, replace this with the chat service's direct URL or
    // use an environment variable (e.g. NEXT_PUBLIC_CHAT_URL).
    const sock = io('/?XTransformPort=3001', {
      transports: ['websocket', 'polling'],
      reconnection: true, reconnectionAttempts: 10, reconnectionDelay: 1000,
    })
    socketRef.current = sock
    sock.on('connect', () => {
      sock.emit('join', { token, orderId })
    })
    sock.on('message', (msg: ChatMsg) => {
      setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg])
      setTimeout(() => {
        fetch('/api/chat', { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ orderId }) }).catch(() => {})
      }, 500)
    })
    sock.on('user_online', (data: { userId: number; role: string }) => {
      if (data.role !== userRole) setPeerOnline(true)
    })
    sock.on('user_offline', (data: { userId: number; role: string }) => {
      if (data.role !== userRole) setPeerOnline(false)
    })
    sock.on('typing', (data: { userId: number }) => {
      if (data.userId !== userId) setPeerTyping(true)
    })
    sock.on('stop_typing', (data: { userId: number }) => {
      if (data.userId !== userId) setPeerTyping(false)
    })
    return () => { sock.disconnect(); socketRef.current = null }
  }, [open, orderId, userId, userRole, userName, token])

  useEffect(() => {
    if (!open || !token) return
    setLoading(true)
    fetch(`/api/chat?orderId=${orderId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => { setMessages(d.messages || []); setLoading(false) }).catch(() => setLoading(false))
  }, [open, orderId, token])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, peerTyping])

  const sendMessage = useCallback(async () => {
    const text = input.trim()
    if (!text || sending || !token) return
    setInput(''); setSending(true)
    socketRef.current?.emit('stop_typing', { orderId })
    try {
      const res = await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ orderId, message: text }),
      })
      const data = await res.json()
      if (data.success && data.message) {
        setMessages(prev => [...prev, { ...data.message, senderName: userName }])
      }
    } catch {}
    socketRef.current?.emit('message', { orderId, message: text })
    setSending(false); inputRef.current?.focus()
  }, [input, sending, token, orderId, userName])

  const handleTyping = (val: string) => {
    setInput(val)
    if (val.trim()) socketRef.current?.emit('typing', { orderId })
    clearTimeout(typingTimeout.current)
    typingTimeout.current = setTimeout(() => socketRef.current?.emit('stop_typing', { orderId }), 2000)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })

  if (!open) return null

  return (
    <div className={cn('fixed inset-0 z-50 bg-black/40 flex items-end justify-center sm:items-center', minimized && 'pointer-events-none')}>
      <div className={cn(
        'bg-white w-full sm:w-[420px] sm:max-h-[600px] flex flex-col shadow-2xl transition-all duration-300',
        minimized ? 'fixed bottom-4 right-4 w-72 h-14 rounded-2xl overflow-hidden' : 'fixed bottom-0 sm:bottom-auto sm:rounded-2xl h-full sm:h-[500px] rounded-t-2xl sm:rounded-b-2xl'
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-emerald-600 text-white shrink-0 cursor-pointer" onClick={() => setMinimized(!minimized)}>
          <div className="flex items-center gap-3">
            <Avatar className="w-9 h-9 border-2 border-white/30">
              <AvatarFallback className="bg-white/20 text-white text-sm font-semibold">{peerName?.charAt(0)?.toUpperCase() || '?'}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-sm leading-tight">{peerName || 'Delivery Partner'}</p>
              <p className="text-[11px] text-emerald-100">{peerOnline ? '🟢 Online' : '⚪ Offline'}{peerRole && ` · ${peerRole}`}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Badge className="bg-white/20 text-white text-[10px] border-0">{orderNumber}</Badge>
            <button onClick={(e) => { e.stopPropagation(); onClose() }} className="p-1.5 hover:bg-white/20 rounded-full transition-colors"><X className="w-4 h-4" /></button>
          </div>
        </div>

        {!minimized && (<>
          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 min-h-0" style={{ scrollbarWidth: 'thin' }}>
            {loading ? (
              <div className="flex items-center justify-center h-full text-gray-400"><div className="text-center"><MessageCircle className="w-8 h-8 mx-auto mb-2 animate-pulse" /><p className="text-sm">Loading...</p></div></div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-400"><div className="text-center"><MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" /><p className="font-medium text-sm">No messages yet</p><p className="text-xs mt-1">Say hi to start chatting!</p></div></div>
            ) : messages.map((msg, i) => {
              const isMine = msg.senderId === userId
              const showAvatar = !isMine && (i === 0 || messages[i - 1]?.senderId !== msg.senderId)
              const isConsec = i > 0 && messages[i - 1]?.senderId === msg.senderId
              return (
                <div key={msg.id} className={cn('flex gap-2', isMine ? 'justify-end' : 'justify-start')}>
                  {!isMine && (
                    <Avatar className={cn('w-7 h-7 shrink-0 mt-auto', !showAvatar && 'invisible')}>
                      <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs font-semibold">{(msg.senderName || peerName)?.charAt(0)?.toUpperCase() || '?'}</AvatarFallback>
                    </Avatar>
                  )}
                  <div className={cn('max-w-[75%]', isConsec && 'mt-0.5')}>
                    {showAvatar && !isMine && <p className="text-[10px] text-gray-500 mb-0.5 font-medium">{msg.senderName || peerName}</p>}
                    <div className={cn('px-3.5 py-2 text-sm leading-relaxed rounded-2xl', isMine ? 'bg-emerald-600 text-white rounded-br-md' : 'bg-white text-gray-800 border border-gray-200 rounded-bl-md shadow-sm')}>
                      {msg.message}
                    </div>
                    <p className={cn('text-[10px] text-gray-400 mt-0.5', isMine ? 'text-right' : 'text-left')}>{fmtTime(msg.createdAt)}</p>
                  </div>
                </div>
              )
            })}
            {peerTyping && (
              <div className="flex gap-2 items-end">
                <Avatar className="w-7 h-7 shrink-0"><AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs font-semibold">{peerName?.charAt(0)?.toUpperCase() || '?'}</AvatarFallback></Avatar>
                <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-2.5 shadow-sm">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
          </div>
          {/* Input */}
          <div className="border-t bg-white p-3 shrink-0">
            <div className="flex gap-2 items-center">
              <input ref={inputRef} type="text" value={input} onChange={(e) => handleTyping(e.target.value)} onKeyDown={handleKeyDown} placeholder="Type a message..." className="flex-1 bg-gray-100 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all" autoFocus maxLength={2000} />
              <Button onClick={sendMessage} disabled={!input.trim() || sending} className="bg-emerald-600 hover:bg-emerald-700 rounded-full w-10 h-10 p-0 shrink-0"><Send className="w-4 h-4" /></Button>
            </div>
          </div>
        </>)}
      </div>
    </div>
  )
}