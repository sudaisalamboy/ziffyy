import { createServer } from 'http'
import { Server } from 'socket.io'
import { jwtVerify, type JWTPayload } from 'jose'

const PORT = 3001

// JWT_SECRET is required — share the same secret as the main app
const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET env var is required (min 32 chars)')
}
const SECRET_KEY = new TextEncoder().encode(JWT_SECRET)

// Allowed origins — restrict in production via CHAT_ALLOWED_ORIGINS env var (comma-separated)
const ALLOWED_ORIGINS = process.env.CHAT_ALLOWED_ORIGINS
  ? process.env.CHAT_ALLOWED_ORIGINS.split(',').map(s => s.trim())
  : ['http://localhost:3000', 'http://127.0.0.1:3000']

const httpServer = createServer()
const io = new Server(httpServer, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ['GET', 'POST']
  },
  pingInterval: 25000,
  pingTimeout: 10000,
})

const rooms = new Map<string, Set<string>>()
const socketUsers = new Map<string, { userId: number; role: string; orderId: number; name: string }>()

function roomKey(orderId: number) { return `order:${orderId}` }

async function verifyJwt(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY)
    return payload
  } catch {
    return null
  }
}

io.on('connection', (socket) => {
  console.log(`[Chat] Connected: ${socket.id}`)

  socket.on('join', async (data: { token: string; orderId: number }) => {
    const { token, orderId } = data

    const payload = await verifyJwt(token)
    if (!payload) {
      console.log(`[Chat] Rejected join from ${socket.id} — invalid token`)
      socket.emit('error', { message: 'Authentication failed' })
      return
    }

    const userId = payload.id as number
    const role = payload.role as string
    const name = payload.name as string
    const room = roomKey(orderId)

    for (const [key, members] of rooms) {
      members.delete(socket.id)
      if (members.size === 0) rooms.delete(key)
      socket.leave(key)
    }

    socket.join(room)
    socketUsers.set(socket.id, { userId, role, orderId, name })

    if (!rooms.has(room)) rooms.set(room, new Set())
    rooms.get(room)!.add(socket.id)

    socket.to(room).emit('user_online', { userId, role, name })
    // PII-safe log: no names or identifiable info
    console.log(`[Chat] User joined room ${room}`)
  })

  socket.on('message', (data: { orderId: number; message: string }) => {
    const user = socketUsers.get(socket.id)
    if (!user) return

    const msg = {
      id: Date.now(),
      orderId: data.orderId,
      senderId: user.userId,
      senderRole: user.role,
      senderName: user.name,
      message: data.message,
      read: false,
      createdAt: new Date().toISOString(),
    }

    io.to(roomKey(data.orderId)).emit('message', msg)
    // PII-safe log: no message content or names
    console.log(`[Chat] Message sent in order#${data.orderId}`)
  })

  socket.on('typing', (data: { orderId: number }) => {
    const user = socketUsers.get(socket.id)
    if (!user) return
    socket.to(roomKey(data.orderId)).emit('typing', { userId: user.userId, name: user.name, role: user.role })
  })

  socket.on('stop_typing', (data: { orderId: number }) => {
    const user = socketUsers.get(socket.id)
    if (!user) return
    socket.to(roomKey(data.orderId)).emit('stop_typing', { userId: user.userId })
  })

  socket.on('mark_read', (data: { orderId: number }) => {
    const user = socketUsers.get(socket.id)
    if (!user) return
    socket.to(roomKey(data.orderId)).emit('messages_read', { byUserId: user.userId, orderId: data.orderId })
  })

  socket.on('disconnect', () => {
    const user = socketUsers.get(socket.id)
    if (user) {
      const room = roomKey(user.orderId)
      socket.to(room).emit('user_offline', { userId: user.userId, name: user.name, role: user.role })
      rooms.get(room)?.delete(socket.id)
      if (rooms.get(room)?.size === 0) rooms.delete(room)
      socketUsers.delete(socket.id)
      // PII-safe log
      console.log(`[Chat] Disconnected: ${socket.id}`)
    }
  })
})

httpServer.listen(PORT, () => {
  console.log(`[Chat] Socket.io server running on port ${PORT}`)
})
