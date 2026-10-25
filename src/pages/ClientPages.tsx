import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BadgeCheck, Camera, Heart, LifeBuoy, LockKeyhole, ReceiptText } from 'lucide-react'
import { api, errMsg, upload } from '../lib/api'
import { useConfig, useCreditUnit, useMe } from '../lib/auth'
import { useToast } from '../lib/toast'
import type { ContentItem, ProviderCardData } from '../lib/types'
import { ProfileCard, ProfileCardSkeleton } from '../components/ProfileCard'
import { ContentCard } from '../components/ContentCard'
import { Avatar, Button, EmptyState, Field, Input, Modal, PageHeader, Select, Skeleton, StatusPill, Textarea } from '../components/ui'
import { creditsLabel, dateOnly, koboToCredits, naira, SUPPORT_EMAIL } from '../lib/format'

export function SavedPage() {
  const { data, isLoading } = useQuery({ queryKey: ['favorites'], queryFn: () => api.get<{ items: ProviderCardData[] }>('/favorites') })
  return (
    <div>
      <PageHeader title="Saved" subtitle="Profiles you've favourited." />
      {isLoading ? <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <ProfileCardSkeleton key={i} />)}</div> : data?.items.length ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">{data.items.map((p) => <ProfileCard key={p.id} p={p} />)}</div>
      ) : <EmptyState icon={<Heart />} title="Nothing saved yet" text="Tap the heart on any profile to keep it here." action={<Link to="/app/discover" className="btn-primary btn-sm">Discover profiles</Link>} />}
    </div>
  )
}

interface PurchaseRow { id: string; purchasedAt: string; amount: number; status: string; reference: string; provider: { username: string; displayName: string }; content: ContentItem }

export function LibraryPage() {
  const { data, isLoading } = useQuery({ queryKey: ['purchases'], queryFn: () => api.get<{ items: PurchaseRow[] }>('/me/purchases') })
  const items = (data?.items ?? []).filter((i) => i.status === 'COMPLETED')
  return (
    <div>
      <PageHeader title="Unlocked content" subtitle="Everything you've purchased. Yours to watch anytime." />
      {isLoading ? <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="aspect-[3/4]" />)}</div> : items.length ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          {items.map((p) => (
            <div key={p.id}>
              <ContentCard c={{ ...p.content, locked: false }} />
              <Link to={`/profile/${p.provider.username}`} className="mt-1.5 block truncate text-xs text-muted hover:text-white">by {p.provider.displayName}</Link>
            </div>
          ))}
        </div>
      ) : <EmptyState icon={<LockKeyhole />} title="No unlocked content yet" text="Exclusive photos and videos you buy will live here." action={<Link to="/app/discover" className="btn-primary btn-sm">Browse profiles</Link>} />}
    </div>
  )
}

interface Tx { id: string; reference: string; amount: number; currency: string; status: string; title: string | null; type?: string; createdAt: string }
export function PurchasesPage() {
  const { data, isLoading } = useQuery({ queryKey: ['transactions'], queryFn: () => api.get<{ items: Tx[] }>('/me/transactions') })
  const [dispute, setDispute] = useState<Tx | null>(null)
  const unit = useCreditUnit()
  return (
    <div>
      <PageHeader title="Purchases" subtitle="Transaction history and payment help." action={<SupportButton />} />
      {isLoading ? <Skeleton className="h-40" /> : data?.items.length ? (
        <div className="card divide-y divide-line">
          {data.items.map((t) => (
            <div key={t.id} className="flex flex-wrap items-center gap-3 px-4 py-3.5">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-red-soft text-red"><ReceiptText size={18} /></span>
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{t.type === 'CREDIT_TOPUP' ? 'Credit top-up' : t.title ?? 'Content purchase'}</p><p className="text-xs text-muted">{dateOnly(t.createdAt)} · <span className="font-mono">{t.reference.slice(0, 14)}…</span></p></div>
              <div className="text-right"><p className="text-sm font-bold">{t.type === 'CREDIT_TOPUP' ? '+' : ''}{creditsLabel(koboToCredits(t.amount, unit))}</p><p className="text-[11px] text-muted">{naira(t.amount)}</p><StatusPill status={t.status} /></div>
              <button className="btn-ghost btn-sm" onClick={() => setDispute(t)}>Problem?</button>
            </div>
          ))}
        </div>
      ) : <EmptyState icon={<ReceiptText />} title="No purchases yet" text="Your payments will be listed here." />}
      <SupportModal open={!!dispute} onClose={() => setDispute(null)} tx={dispute} />
    </div>
  )
}

function SupportButton() {
  const [open, setOpen] = useState(false)
  return <><button className="btn-secondary btn-sm" onClick={() => setOpen(true)}><LifeBuoy size={14} /> Get help</button><SupportModal open={open} onClose={() => setOpen(false)} /></>
}

export function SupportModal({ open, onClose, tx }: { open: boolean; onClose: () => void; tx?: Tx | null }) {
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const { toast } = useToast()
  const qc = useQueryClient()
  const m = useMutation({
    mutationFn: () => api.post('/support', { subject: subject || (tx ? `Problem with ${tx.title ?? 'a purchase'}` : ''), body, relatedTransactionId: tx?.id }),
    onSuccess: () => { toast('Support request sent', 'success'); setBody(''); setSubject(''); qc.invalidateQueries({ queryKey: ['support'] }); onClose() },
    onError: (e) => toast(errMsg(e), 'error'),
  })
  return (
    <Modal open={open} onClose={onClose} title={tx ? 'Report a payment problem' : 'Contact support'}>
      <div className="space-y-4">
        {tx && <p className="rounded-xl bg-surface p-3 text-xs text-muted">Reference <span className="font-mono text-white">{tx.reference}</span> · {naira(tx.amount)} · {tx.status}</p>}
        <Field label="Subject"><Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={tx ? `Problem with ${tx.title ?? 'a purchase'}` : 'What do you need help with?'} maxLength={120} /></Field>
        <Field label="Describe the issue" hint="For privacy or consent complaints, include the profile or item involved."><Textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={2000} /></Field>
        <Button className="w-full" loading={m.isPending} disabled={body.trim().length < 10} onClick={() => m.mutate()}>Send</Button>
        <p className="text-center text-xs text-muted">Or email us at <a className="text-white underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a></p>
      </div>
    </Modal>
  )
}

export function ClientProfilePage() {
  const { me } = useMe()
  const { data: cfg } = useConfig()
  const qc = useQueryClient()
  const { toast } = useToast()
  const file = useRef<HTMLInputElement>(null)
  const [name, setName] = useState<string>()
  const [city, setCity] = useState<string>()
  const save = useMutation({
    mutationFn: () => api.patch('/me', { displayName: name ?? me?.displayName ?? undefined, city: city ?? me?.city ?? undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['me'] }); toast('Profile saved', 'success') }, onError: (e) => toast(errMsg(e), 'error'),
  })
  const photo = useMutation({
    mutationFn: (f: File) => { const fd = new FormData(); fd.append('file', f); return upload('/me/avatar', fd) },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['me'] }); toast('Photo updated', 'success') }, onError: (e) => toast(errMsg(e), 'error'),
  })
  if (!me) return null
  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Profile" />
      <div className="card p-5">
        <div className="flex items-center gap-4">
          <div className="relative"><Avatar src={me.avatarUrl} name={me.displayName ?? me.username ?? ''} size={72} />
            <button onClick={() => file.current?.click()} className="absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-full border border-bg bg-red" aria-label="Change photo"><Camera size={14} /></button>
            <input ref={file} type="file" hidden accept="image/jpeg,image/png,image/webp" onChange={(e) => { const f = e.target.files?.[0]; if (f) photo.mutate(f) }} /></div>
          <div><p className="text-lg font-bold">{me.displayName}</p><p className="text-sm text-muted">@{me.username}</p>
            <p className="mt-1 flex items-center gap-1 text-xs">{me.ageVerificationStatus === 'VERIFIED' ? <><BadgeCheck size={14} className="text-ok" /> Age verified</> : <Link to="/verify" className="text-red underline">Verify your age</Link>}</p></div>
        </div>
        <div className="mt-6 space-y-4">
          <Field label="Display name"><Input defaultValue={me.displayName ?? ''} onChange={(e) => setName(e.target.value)} maxLength={40} /></Field>
          <Field label="City"><Select defaultValue={me.city ?? 'Lagos'} onChange={(e) => setCity(e.target.value)}>{cfg?.cities.map((c) => <option key={c}>{c}</option>)}</Select></Field>
          <Button className="w-full" loading={save.isPending} onClick={() => save.mutate()}>Save changes</Button>
        </div>
      </div>
    </div>
  )
}
