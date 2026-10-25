import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { io, type Socket } from 'socket.io-client'
import { useQueryClient } from '@tanstack/react-query'
import { API_BASE, currentToken } from './api'
import { useAuthState } from './auth'
import { useToast } from './toast'
import type { Message } from './types'

const Ctx = createContext<{ socket: Socket | null; typing: Record<string, boolean> }>({ socket: null, typing: {} })
export const useRealtime = () => useContext(Ctx)

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { status } = useAuthState()
  const qc = useQueryClient()
  const { toast } = useToast()
  const [socket, setSocket] = useState<Socket | null>(null)
  const [typing, setTyping] = useState<Record<string, boolean>>({})
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  useEffect(() => {
    if (status !== 'signedIn') return
    const s = io(API_BASE, {
      // A function so every (re)connect gets a fresh token — Clerk session tokens are short-lived.
      auth: (cb) => { currentToken().then((token) => cb({ token })) },
      transports: ['websocket', 'polling'],
    })
    setSocket(s)
    s.on('message:new', (m: Message) => {
      qc.invalidateQueries({ queryKey: ['conversations'] })
      qc.invalidateQueries({ queryKey: ['messages', m.conversationId] })
      qc.invalidateQueries({ queryKey: ['me'] })
    })
    s.on('message:status', (p: { conversationId: string }) => qc.invalidateQueries({ queryKey: ['messages', p.conversationId] }))
    s.on('notification:new', (n: { title: string }) => {
      toast(n.title, 'info')
      qc.invalidateQueries({ queryKey: ['notifications'] })
      qc.invalidateQueries({ queryKey: ['me'] })
      qc.invalidateQueries({ queryKey: ['bookings'] })
    })
    s.on('presence', () => { qc.invalidateQueries({ queryKey: ['conversations'] }) })
    s.on('typing', (p: { conversationId: string; isTyping: boolean }) => {
      setTyping((t) => ({ ...t, [p.conversationId]: p.isTyping }))
      clearTimeout(timers.current[p.conversationId])
      if (p.isTyping) timers.current[p.conversationId] = setTimeout(() => setTyping((t) => ({ ...t, [p.conversationId]: false })), 4000)
    })
    return () => { s.close(); setSocket(null) }
  }, [status, qc, toast])

  return <Ctx.Provider value={{ socket, typing }}>{children}</Ctx.Provider>
}
