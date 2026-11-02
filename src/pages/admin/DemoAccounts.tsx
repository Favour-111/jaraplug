import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarDays, FileVideo, FlaskConical, MessageCircle, Plus, Trash2, UserRound } from 'lucide-react'
import { api, errMsg, getActAs, switchActAs, type ActAs } from '../../lib/api'
import { useConfig } from '../../lib/auth'
import { useToast } from '../../lib/toast'
import { Avatar, Button, CityInput, ConfirmDialog, EmptyState, Field, Input, Modal, PageHeader, Skeleton, Textarea } from '../../components/ui'

/**
 * TESTING ONLY (server DEMO_ACCOUNTS=true, refused in production): create fictional provider accounts and
 * act as any of them. While acting, the whole provider area runs as that account.
 */
interface DemoAccount { id: string; username: string | null; displayName: string | null; city: string | null; area: string | null; avatarUrl: string | null; contentCount: number; unread: number; pendingBookings: number; createdAt: string }

/** Starts acting as a demo provider (audit-logged on the server), then reloads into their area. */
export async function actAs(id: string, to = '/provider/dashboard') {
  const a = await api.post<ActAs>(`/admin/demo-accounts/${id}/act`)
  switchActAs(a, to)
}

function CreateDemo({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient(); const { toast } = useToast(); const { data: cfg } = useConfig()
  const blank = { displayName: '', username: '', city: '', area: '', displayAge: '', biography: '' }
  const [f, setF] = useState(blank)
  const set = (p: Partial<typeof blank>) => setF((x) => ({ ...x, ...p }))
  const create = useMutation({
    mutationFn: () => api.post<{ id: string }>('/admin/demo-accounts', {
      displayName: f.displayName.trim(), username: f.username.trim(), city: f.city.trim(),
      area: f.area.trim() || undefined, displayAge: f.displayAge ? Number(f.displayAge) : undefined, biography: f.biography.trim() || undefined,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'demo-accounts'] }); toast('Demo account created', 'success'); setF(blank); onClose() },
    onError: (e) => toast(errMsg(e), 'error'),
  })
  const ok = f.displayName.trim().length >= 2 && /^[a-z0-9_]{3,24}$/.test(f.username) && f.city.trim().length >= 2 && (!f.displayAge || (Number(f.displayAge) >= 18 && Number(f.displayAge) <= 99))
  return (
    <Modal open={open} onClose={onClose} title="New demo provider">
      <div className="space-y-4">
        <Field label="Display name"><Input value={f.displayName} onChange={(e) => set({ displayName: e.target.value })} maxLength={40} /></Field>
        <Field label="Username" hint="3–24 characters: lowercase letters, numbers and underscores"><Input value={f.username} onChange={(e) => set({ username: e.target.value.toLowerCase().replace(/\s/g, '') })} maxLength={24} autoCapitalize="none" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="City"><CityInput value={f.city} suggestions={cfg?.cities} onChange={(e) => set({ city: e.target.value })} /></Field>
          <Field label="General area (optional)"><Input value={f.area} onChange={(e) => set({ area: e.target.value })} maxLength={60} /></Field>
        </div>
        <Field label="Age (optional, 18+)"><Input type="number" min={18} max={99} value={f.displayAge} onChange={(e) => set({ displayAge: e.target.value })} /></Field>
        <Field label="Biography (optional)"><Textarea value={f.biography} onChange={(e) => set({ biography: e.target.value })} maxLength={1000} /></Field>
        <Button className="w-full" disabled={!ok} loading={create.isPending} onClick={() => create.mutate()}>Create demo account</Button>
      </div>
    </Modal>
  )
}

export function AdminDemoAccounts() {
  const { data: cfg } = useConfig(); const { toast } = useToast(); const qc = useQueryClient()
  const [creating, setCreating] = useState(false); const [del, setDel] = useState<DemoAccount | null>(null); const [busy, setBusy] = useState<string | null>(null)
  const { data, isLoading } = useQuery({ queryKey: ['admin', 'demo-accounts'], queryFn: () => api.get<{ items: DemoAccount[] }>('/admin/demo-accounts'), enabled: !!cfg?.demoAccounts, refetchInterval: 20_000 })
  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/demo-accounts/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'demo-accounts'] }); toast('Demo account deleted', 'success'); setDel(null) },
    onError: (e) => toast(errMsg(e), 'error'),
  })
  const go = async (id: string, to?: string) => { setBusy(id); try { await actAs(id, to) } catch (e) { toast(errMsg(e), 'error'); setBusy(null) } }

  if (cfg && !cfg.demoAccounts) return <div><PageHeader title="Demo accounts" /><EmptyState icon={<FlaskConical />} title="Demo accounts are switched off" text="Set DEMO_ACCOUNTS=true in the server's .env (development or staging only) and restart the API." /></div>
  return (
    <div>
      <PageHeader title="Demo accounts" subtitle="Fictional providers for testing and demos. Open one to post content, reply to messages and handle bookings as that account." action={<Button className="btn-sm" onClick={() => setCreating(true)}><Plus size={15} /> New demo provider</Button>} />
      <p className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">Testing only. These profiles are marked as demo, are never listed in search engines, and the server refuses to start in production with this feature on.</p>
      {isLoading || !data ? <Skeleton className="h-48" /> : !data.items.length ? <EmptyState icon={<UserRound />} title="No demo accounts yet" action={<Button onClick={() => setCreating(true)}><Plus size={15} /> New demo provider</Button>} /> : (
        <div className="grid gap-3 md:grid-cols-2">{data.items.map((a) => (
          <div key={a.id} className="card p-4">
            <div className="flex items-start gap-3">
              <Avatar src={a.avatarUrl} name={a.displayName ?? a.username ?? '?'} size={48} />
              <div className="min-w-0 flex-1"><p className="truncate font-semibold">{a.displayName}</p><p className="truncate text-xs text-muted">@{a.username} · {[a.area, a.city].filter(Boolean).join(', ')}</p></div>
              <button aria-label={`Delete @${a.username}`} className="rounded-lg p-2 text-muted hover:bg-bg hover:text-red" onClick={() => setDel(a)}><Trash2 size={16} /></button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <button className="chip" onClick={() => go(a.id, '/provider/content')}><FileVideo size={13} /> {a.contentCount} posts</button>
              <button className={`chip ${a.unread ? 'chip-active' : ''}`} onClick={() => go(a.id, '/provider/messages')}><MessageCircle size={13} /> {a.unread} unread</button>
              <button className={`chip ${a.pendingBookings ? 'chip-active' : ''}`} onClick={() => go(a.id, '/provider/bookings')}><CalendarDays size={13} /> {a.pendingBookings} pending</button>
            </div>
            <Button className="mt-3 w-full btn-sm" loading={busy === a.id} disabled={getActAs()?.id === a.id} onClick={() => go(a.id)}>Open as @{a.username}</Button>
          </div>))}</div>)}
      <CreateDemo open={creating} onClose={() => setCreating(false)} />
      <ConfirmDialog open={!!del} danger title={`Delete @${del?.username}?`} text="The profile is hidden and the account can no longer be opened. Its content and chats stay in the database." confirmLabel="Delete" busy={remove.isPending} onClose={() => setDel(null)} onConfirm={() => del && remove.mutate(del.id)} />
    </div>
  )
}

/** Shown on every screen while an admin is acting as a demo provider. */
export function ActAsBanner() {
  const a = getActAs()
  if (!a) return null
  return (
    <div className="fixed bottom-20 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 whitespace-nowrap rounded-full border border-amber-500/40 bg-[#1a1408] py-1.5 pl-4 pr-1.5 text-xs text-amber-200 shadow-lg md:bottom-4">
      <FlaskConical size={14} /> Acting as <strong>@{a.username}</strong> (demo)
      <button className="rounded-full bg-amber-500/20 px-3 py-1.5 font-semibold text-amber-100 hover:bg-amber-500/30" onClick={() => switchActAs(null, '/admin/demo-accounts')}>Back to admin</button>
    </div>
  )
}
