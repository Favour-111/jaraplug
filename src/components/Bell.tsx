import { useEffect, useRef, useState } from 'react'
import { Bell } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { Notification } from '../lib/types'
import { chatTime } from '../lib/format'

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const nav = useNavigate()
  const qc = useQueryClient()
  const { data } = useQuery({ queryKey: ['notifications'], queryFn: () => api.get<{ items: Notification[]; unread: number }>('/notifications'), refetchInterval: 60_000 })
  const read = useMutation({ mutationFn: () => api.post('/notifications/read', {}), onSuccess: () => { qc.invalidateQueries({ queryKey: ['notifications'] }); qc.invalidateQueries({ queryKey: ['me'] }) } })
  useEffect(() => {
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  const unread = data?.unread ?? 0
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} className="relative grid h-10 w-10 place-items-center rounded-full border border-line bg-card transition hover:border-red/50" aria-label="Notifications">
        <Bell size={18} />
        {unread > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-red px-1 text-[10px] font-bold">{unread}</span>}
      </button>
      {open && (
        <div className="fixed inset-x-3 top-[4.25rem] z-40 animate-pop overflow-hidden rounded-2xl border border-line bg-surface shadow-card sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-[360px]">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-sm font-semibold">Notifications</p>
            {unread > 0 && <button className="text-xs text-red" onClick={() => read.mutate()}>Mark all read</button>}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {!data?.items.length && <p className="px-4 py-10 text-center text-sm text-muted">You're all caught up.</p>}
            {data?.items.map((n) => (
              <button key={n.id} onClick={() => { setOpen(false); if (n.link) nav(n.link) }} className="flex w-full gap-3 border-b border-line/60 px-4 py-3 text-left hover:bg-card">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.readAt ? 'bg-transparent' : 'bg-red'}`} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{n.title}</span>
                  {n.body && <span className="block truncate text-xs text-muted">{n.body}</span>}
                </span>
                <span className="shrink-0 text-[10px] text-muted">{chatTime(n.createdAt)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
