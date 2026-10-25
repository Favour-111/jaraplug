import { useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { AlertTriangle, Check, Coins, Flag, ShieldAlert, Users as UsersIcon } from 'lucide-react'
import { api, errMsg } from '../../lib/api'
import { useToast } from '../../lib/toast'
import { Avatar, Button, ConfirmDialog, EmptyState, Field, Input, Modal, PageHeader, Select, Skeleton, Stat, StatusPill, Tabs, Textarea } from '../../components/ui'
import { dateOnly, dateTime, naira } from '../../lib/format'
import { REPORT_CATEGORIES } from '../../components/Dialogs'

function useAction<V>(fn: (v: V) => Promise<unknown>, invalidate: string[], done = 'Done') {
  const qc = useQueryClient(); const { toast } = useToast()
  return useMutation({ mutationFn: fn, onSuccess: () => { invalidate.forEach((k) => qc.invalidateQueries({ queryKey: [k] })); toast(done, 'success') }, onError: (e) => toast(errMsg(e), 'error') })
}

/** Dialog that insists on a recorded reason — every sensitive admin action is audit-logged with it. */
function ReasonDialog({ open, title, confirmLabel, danger, onClose, onConfirm, busy, optional }: { open: boolean; title: string; confirmLabel: string; danger?: boolean; onClose: () => void; onConfirm: (reason: string) => void; busy?: boolean; optional?: boolean }) {
  const [reason, setReason] = useState('')
  const ok = optional || reason.trim().length >= 5
  return (
    <ConfirmDialog open={open} onClose={() => { setReason(''); onClose() }} title={title} confirmLabel={confirmLabel} danger={danger} busy={busy} onConfirm={() => ok && onConfirm(reason.trim())}>
      <Textarea className="mt-3" placeholder={optional ? 'Note (optional)' : 'Reason (required, recorded in the audit log)'} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} />
      {!ok && <p className="mt-1 text-xs text-muted">At least 5 characters.</p>}
    </ConfirmDialog>
  )
}

export function AdminOverview() {
  const { data, isLoading } = useQuery({ queryKey: ['admin', 'overview'], queryFn: () => api.get<any>('/admin/overview'), refetchInterval: 30_000 })
  if (isLoading || !data) return <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
  const q: [string, number, string][] = [['Pending verifications', data.pendingVerifications, '/admin/verifications'], ['Content awaiting review', data.pendingContent, '/admin/content'], ['Open reports', data.openReports, '/admin/reports'], ['Open support', data.openSupport, '/admin/support'], ['Pending payouts', data.pendingPayouts, '/admin/transactions']]
  return (
    <div>
      <PageHeader title="Admin overview" />
      {data.priorityReports > 0 && <Link to="/admin/reports" className="mb-4 flex items-center gap-3 rounded-2xl border border-red/40 bg-red-soft p-4"><ShieldAlert className="text-red" /><span className="flex-1 text-sm"><strong>{data.priorityReports} priority safety report{data.priorityReports > 1 ? 's' : ''}</strong> need prompt review.</span></Link>}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4"><Stat label="Active users" value={data.users} /><Stat label="Providers" value={data.providers} /><Stat label="Successful payments" value={data.transactions.count} /><Stat label="Platform revenue" value={naira(data.transactions.platformRevenue)} accent hint={`Gross ${naira(data.transactions.gross)}`} /></div>
      <h2 className="mb-3 mt-8 text-lg font-bold">Queues</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{q.map(([l, n, to]) => <Link key={l} to={to} className="card flex items-center justify-between p-4 transition hover:border-red/50"><span className="text-sm">{l}</span><span className={`grid h-8 min-w-8 place-items-center rounded-full px-2 text-sm font-bold ${n ? 'bg-red text-white' : 'bg-surface text-muted'}`}>{n}</span></Link>)}</div>
    </div>
  )
}

/** TEMPORARY: lets an admin add free credits to a client's wallet. Audit-logged; remove with the matching server route. */
function GiveCredits({ user, onClose }: { user: any; onClose: () => void }) {
  const [credits, setCredits] = useState('10'); const [why, setWhy] = useState('')
  const give = useAction(() => api.post(`/admin/users/${user.id}/credits`, { credits: Number(credits), reason: why }), ['admin'], 'Credits added')
  const ok = Number.isInteger(Number(credits)) && Number(credits) >= 1 && Number(credits) <= 1000 && why.trim().length >= 5
  return (
    <Modal open={!!user} onClose={onClose} title={`Give credits to @${user?.username ?? ''}`}>
      <div className="space-y-4">
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">Temporary tool. These credits are free (no payment) and are recorded in the audit log.</p>
        <Field label="Credits (1 – 1000)"><Input type="number" inputMode="numeric" min={1} max={1000} value={credits} onChange={(e) => setCredits(e.target.value)} /></Field>
        <Field label="Reason" hint="Recorded in the audit log"><Input value={why} onChange={(e) => setWhy(e.target.value)} maxLength={300} placeholder="e.g. Launch gift / support compensation" /></Field>
        <Button className="w-full" loading={give.isPending} disabled={!ok} onClick={() => give.mutate(undefined as never, { onSuccess: onClose })}>Add {Number(credits) || 0} credits</Button>
      </div>
    </Modal>
  )
}

export function AdminUsers() {
  const [q, setQ] = useState(''); const [role, setRole] = useState(''); const [target, setTarget] = useState<{ u: any; action: 'suspend' | 'reactivate' } | null>(null)
  const { data, isLoading } = useQuery({ queryKey: ['admin', 'users', q, role], queryFn: () => api.get<{ items: any[] }>('/admin/users', { q, role }) })
  const act = useAction(({ id, action, reason }: { id: string; action: string; reason: string }) => api.post(`/admin/users/${id}/${action}`, { reason }), ['admin'], 'User updated')
  // TEMPORARY: give a client free credits (delete this block, the button below and <GiveCredits /> when no longer needed)
  const [gift, setGift] = useState<any>(null)
  return (
    <div>
      <PageHeader title="Users" />
      <div className="mb-4 flex gap-3"><Input placeholder="Search username, name or email" value={q} onChange={(e) => setQ(e.target.value)} /><Select className="!w-40" value={role} onChange={(e) => setRole(e.target.value)}><option value="">All roles</option>{['CLIENT', 'PROVIDER', 'ADMIN', 'UNASSIGNED'].map((r) => <option key={r}>{r}</option>)}</Select></div>
      {isLoading ? <Skeleton className="h-60" /> : !data?.items.length ? <EmptyState icon={<UsersIcon />} title="No users match" /> : (
        <div className="card overflow-x-auto"><table className="w-full min-w-[640px] text-sm"><thead className="text-left text-xs text-muted"><tr>{['User', 'Role', 'Status', 'Age check', 'Joined', ''].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr></thead><tbody className="divide-y divide-line">
          {data.items.map((u) => <tr key={u.id}><td className="px-4 py-3"><p className="font-semibold">{u.displayName ?? '—'} {u.isDemo && <span className="text-[10px] text-muted">(demo)</span>}</p><p className="text-xs text-muted">@{u.username ?? 'not onboarded'}</p></td><td className="px-4 py-3 capitalize">{u.role.toLowerCase()}</td><td className="px-4 py-3"><StatusPill status={u.accountStatus} /></td><td className="px-4 py-3"><StatusPill status={u.ageVerificationStatus} /></td><td className="px-4 py-3 text-muted">{dateOnly(u.createdAt)}</td>
            <td className="px-4 py-3 text-right">{u.role === 'CLIENT' && u.accountStatus === 'ACTIVE' && <button className="btn-secondary btn-sm mr-2" onClick={() => setGift(u)}><Coins size={13} /> Give credits</button>}{u.role !== 'ADMIN' && u.accountStatus === 'ACTIVE' && <button className="btn-danger btn-sm" onClick={() => setTarget({ u, action: 'suspend' })}>Suspend</button>}{u.accountStatus === 'SUSPENDED' && <button className="btn-secondary btn-sm" onClick={() => setTarget({ u, action: 'reactivate' })}>Reactivate</button>}</td></tr>)}
        </tbody></table></div>)}
      <GiveCredits user={gift} onClose={() => setGift(null)} />
      <ReasonDialog open={!!target} danger={target?.action === 'suspend'} title={`${target?.action === 'suspend' ? 'Suspend' : 'Reactivate'} @${target?.u.username}`} confirmLabel={target?.action === 'suspend' ? 'Suspend' : 'Reactivate'} busy={act.isPending} onClose={() => setTarget(null)} onConfirm={(reason) => target && act.mutate({ id: target.u.id, action: target.action, reason }, { onSuccess: () => setTarget(null) })} />
    </div>
  )
}

export function AdminVerifications() {
  const [tab, setTab] = useState<'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING'); const [rej, setRej] = useState<any>(null)
  const { data, isLoading } = useQuery({ queryKey: ['admin', 'verifications', tab], queryFn: () => api.get<{ items: any[] }>('/admin/verifications', { status: tab }) })
  const approve = useAction((id: string) => api.post(`/admin/verifications/${id}/approve`, {}), ['admin'], 'Approved')
  const reject = useAction(({ id, reason }: { id: string; reason: string }) => api.post(`/admin/verifications/${id}/reject`, { reason }), ['admin'], 'Rejected')
  return (
    <div>
      <PageHeader title="Verifications" subtitle="Age checks and provider profile reviews." />
      <Tabs className="mb-4" value={tab} onChange={setTab} tabs={[{ key: 'PENDING', label: 'Pending' }, { key: 'APPROVED', label: 'Approved' }, { key: 'REJECTED', label: 'Rejected' }]} />
      {isLoading ? <Skeleton className="h-40" /> : !data?.items.length ? <EmptyState icon={<Check />} title="Queue is clear" /> : <div className="space-y-3">{data.items.map((r) => (
        <div key={r.id} className="card p-4"><div className="flex items-start gap-3"><Avatar src={r.user.avatarUrl} name={r.user.displayName} size={48} />
          <div className="min-w-0 flex-1"><p className="font-semibold">{r.user.displayName} <span className="text-xs font-normal text-muted">@{r.user.username}</span></p><p className="text-xs text-muted">{r.type === 'AGE' ? 'Age verification' : 'Provider identity & profile'} · {dateTime(r.createdAt)}</p>
            {r.providerRef && <p className="mt-1 text-xs text-muted">Provider ref: <span className="font-mono">{r.providerRef}</span></p>}
            {r.profile && <div className="mt-2 rounded-lg bg-surface p-3 text-xs text-muted"><p>{r.profile.city} · age {r.profile.displayAge ?? '—'}</p><p className="mt-1 text-white/80">{r.profile.biography}</p></div>}
            {r.rejectionReason && <p className="mt-2 text-xs text-red">Rejected: {r.rejectionReason}</p>}</div><StatusPill status={r.status} /></div>
          {r.status === 'PENDING' && <div className="mt-3 flex gap-2 border-t border-line pt-3"><Button className="btn-sm flex-1" loading={approve.isPending} onClick={() => approve.mutate(r.id)}>Approve</Button><Button variant="danger" className="btn-sm flex-1" onClick={() => setRej(r)}>Reject</Button></div>}
        </div>))}</div>}
      <ReasonDialog open={!!rej} danger title="Reject verification" confirmLabel="Reject" busy={reject.isPending} onClose={() => setRej(null)} onConfirm={(reason) => reject.mutate({ id: rej.id, reason }, { onSuccess: () => setRej(null) })} />
    </div>
  )
}

export function AdminContent() {
  const [tab, setTab] = useState<'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'REMOVED'>('PENDING'); const [t, setT] = useState<{ c: any; action: 'reject' | 'remove' } | null>(null)
  const { data, isLoading } = useQuery({ queryKey: ['admin', 'content', tab], queryFn: () => api.get<{ items: any[] }>('/admin/content', { status: tab }) })
  const mod = useAction(({ id, action, reason }: { id: string; action: string; reason?: string }) => api.post(`/admin/content/${id}/moderate`, { action, reason }), ['admin'], 'Decision recorded')
  return (
    <div>
      <PageHeader title="Content moderation" subtitle="Review before anything goes live. Items reported as serious are hidden automatically and appear under “Under review”." />
      <Tabs className="mb-4" value={tab} onChange={setTab} tabs={[{ key: 'PENDING', label: 'Pending' }, { key: 'UNDER_REVIEW', label: 'Under review' }, { key: 'APPROVED', label: 'Approved' }, { key: 'REJECTED', label: 'Rejected' }, { key: 'REMOVED', label: 'Removed' }]} />
      {isLoading ? <Skeleton className="h-40" /> : !data?.items.length ? <EmptyState icon={<Check />} title="Nothing here" /> : <div className="grid gap-4 md:grid-cols-2">{data.items.map((c) => (
        <div key={c.id} className="card overflow-hidden">
          <div className="bg-black">{c.url ? (c.mediaType === 'VIDEO' ? <video src={c.url} controls controlsList="nodownload" className="max-h-72 w-full" /> : <img src={c.url} alt="" className="max-h-72 w-full object-contain" />) : <div className="grid h-40 place-items-center text-sm text-muted">No preview</div>}</div>
          <div className="space-y-2 p-4"><div className="flex items-start justify-between gap-2"><div><p className="font-semibold">{c.title}</p><p className="text-xs text-muted">@{c.provider.username} · {c.visibility === 'PAID' ? naira(c.price) : c.visibility.toLowerCase().replace('_', ' ')}</p></div><StatusPill status={c.moderationStatus} /></div>
            {c.reportCount > 0 && <p className="flex items-center gap-1.5 text-xs text-red"><AlertTriangle size={13} /> {c.reportCount} report{c.reportCount > 1 ? 's' : ''}</p>}{c.moderationNote && <p className="text-xs text-muted">Note: {c.moderationNote}</p>}
            <div className="flex gap-2 pt-1">{c.moderationStatus !== 'APPROVED' && <Button className="btn-sm flex-1" disabled={mod.isPending} onClick={() => mod.mutate({ id: c.id, action: 'approve' })}>Approve</Button>}{c.moderationStatus !== 'REJECTED' && c.moderationStatus !== 'REMOVED' && <Button variant="secondary" className="btn-sm flex-1" onClick={() => setT({ c, action: 'reject' })}>Reject</Button>}{c.moderationStatus !== 'REMOVED' && <Button variant="danger" className="btn-sm flex-1" onClick={() => setT({ c, action: 'remove' })}>Remove</Button>}</div></div></div>))}</div>}
      <ReasonDialog open={!!t} danger title={`${t?.action === 'remove' ? 'Remove' : 'Reject'} “${t?.c.title}”`} confirmLabel={t?.action === 'remove' ? 'Remove' : 'Reject'} busy={mod.isPending} onClose={() => setT(null)} onConfirm={(reason) => t && mod.mutate({ id: t.c.id, action: t.action, reason }, { onSuccess: () => setT(null) })} />
    </div>
  )
}

export function AdminReports() {
  const [tab, setTab] = useState<'open' | 'RESOLVED' | 'DISMISSED'>('open'); const [t, setT] = useState<any>(null); const [suspend, setSuspend] = useState<any>(null)
  const { data, isLoading } = useQuery({ queryKey: ['admin', 'reports', tab], queryFn: () => api.get<{ items: any[] }>('/admin/reports', { status: tab === 'open' ? undefined : tab }) })
  const resolve = useAction(({ id, status, note }: { id: string; status: string; note: string }) => api.post(`/admin/reports/${id}/resolve`, { status, note }), ['admin'], 'Report updated')
  const sus = useAction(({ id, reason }: { id: string; reason: string }) => api.post(`/admin/users/${id}/suspend`, { reason }), ['admin'], 'User suspended')
  const mod = useAction(({ id, action, reason }: { id: string; action: string; reason?: string }) => api.post(`/admin/content/${id}/moderate`, { action, reason }), ['admin'], 'Content removed')
  const label = (k: string) => REPORT_CATEGORIES.find(([c]) => c === k)?.[1] ?? k
  return (
    <div>
      <PageHeader title="Reports" subtitle="Priority safety reports are listed first." />
      <Tabs className="mb-4" value={tab} onChange={setTab} tabs={[{ key: 'open', label: 'Open' }, { key: 'RESOLVED', label: 'Resolved' }, { key: 'DISMISSED', label: 'Dismissed' }]} />
      {isLoading ? <Skeleton className="h-40" /> : !data?.items.length ? <EmptyState icon={<Flag />} title="No reports" /> : <div className="space-y-3">{data.items.map((r) => (
        <div key={r.id} className={`card p-4 ${r.priority ? '!border-red/50' : ''}`}>
          <div className="flex items-start justify-between gap-3"><div>{r.priority && <p className="mb-1 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-red"><ShieldAlert size={12} /> Priority</p>}<p className="font-semibold">{label(r.category)}</p><p className="text-xs text-muted">{dateTime(r.createdAt)} · by @{r.reporter.username}</p></div><StatusPill status={r.status} /></div>
          {r.description && <p className="mt-2 rounded-lg bg-surface p-3 text-sm text-muted">{r.description}</p>}
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted">{r.reportedUser && <span>User: <strong className="text-white">@{r.reportedUser.username}</strong> <StatusPill status={r.reportedUser.accountStatus} /></span>}{r.reportedContent && <span>Content: <strong className="text-white">{r.reportedContent.title}</strong> <StatusPill status={r.reportedContent.moderationStatus} /></span>}</div>
          {r.resolutionNote && <p className="mt-2 text-xs text-muted">Resolution: {r.resolutionNote}</p>}
          {['OPEN', 'INVESTIGATING'].includes(r.status) && <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
            <Button variant="secondary" className="btn-sm" onClick={() => setT({ r, status: 'INVESTIGATING' })}>Investigating</Button><Button className="btn-sm" onClick={() => setT({ r, status: 'RESOLVED' })}>Resolve</Button><Button variant="secondary" className="btn-sm" onClick={() => setT({ r, status: 'DISMISSED' })}>Dismiss</Button>
            {r.reportedContent && r.reportedContent.moderationStatus !== 'REMOVED' && <Button variant="danger" className="btn-sm" onClick={() => mod.mutate({ id: r.reportedContent.id, action: 'remove', reason: `Removed following report: ${label(r.category)}` })}>Remove content</Button>}
            {r.reportedUser && r.reportedUser.accountStatus === 'ACTIVE' && <Button variant="danger" className="btn-sm" onClick={() => setSuspend(r.reportedUser)}>Suspend user</Button>}</div>}
        </div>))}</div>}
      <ReasonDialog open={!!t} title={`Mark as ${t?.status.toLowerCase()}`} confirmLabel="Save" busy={resolve.isPending} onClose={() => setT(null)} onConfirm={(note) => resolve.mutate({ id: t.r.id, status: t.status, note }, { onSuccess: () => setT(null) })} />
      <ReasonDialog open={!!suspend} danger title={`Suspend @${suspend?.username}`} confirmLabel="Suspend" busy={sus.isPending} onClose={() => setSuspend(null)} onConfirm={(reason) => sus.mutate({ id: suspend.id, reason }, { onSuccess: () => setSuspend(null) })} />
    </div>
  )
}

export function AdminTransactions() {
  const [refund, setRefund] = useState<any>(null); const [payout, setPayout] = useState<{ p: any; decision: 'paid' | 'rejected' } | null>(null)
  const tx = useQuery({ queryKey: ['admin', 'tx'], queryFn: () => api.get<{ items: any[] }>('/admin/transactions') })
  const po = useQuery({ queryKey: ['admin', 'payouts'], queryFn: () => api.get<{ items: any[] }>('/admin/payouts') })
  const doRefund = useAction(({ id, reason }: { id: string; reason: string }) => api.post(`/admin/transactions/${id}/refund`, { reason }), ['admin'], 'Refund recorded (ledger updated, access revoked)')
  const decide = useAction(({ id, decision, reason }: { id: string; decision: string; reason: string }) => api.post(`/admin/payouts/${id}/decide`, { decision, reason }), ['admin'], 'Payout updated')
  return (
    <div>
      <PageHeader title="Transactions" />
      {tx.isLoading ? <Skeleton className="h-40" /> : !tx.data?.items.length ? <EmptyState title="No transactions yet" /> : <div className="card overflow-x-auto"><table className="w-full min-w-[720px] text-sm"><thead className="text-left text-xs text-muted"><tr>{['Date', 'Reference', 'Buyer → Provider', 'Amount', 'Fee', 'Status', ''].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr></thead><tbody className="divide-y divide-line">
        {tx.data.items.map((t) => <tr key={t.id}><td className="px-4 py-3 text-muted">{dateOnly(t.createdAt)}</td><td className="px-4 py-3 font-mono text-xs">{t.reference.slice(0, 16)}…</td><td className="px-4 py-3">@{t.buyer} → @{t.provider}</td><td className="px-4 py-3 font-semibold">{naira(t.amount)}</td><td className="px-4 py-3 text-muted">{naira(t.platformFee)}</td><td className="px-4 py-3"><StatusPill status={t.status} /></td><td className="px-4 py-3 text-right">{t.status === 'SUCCESS' && <button className="btn-danger btn-sm" onClick={() => setRefund(t)}>Refund</button>}</td></tr>)}</tbody></table></div>}
      <h2 className="mb-3 mt-8 text-lg font-bold">Payout requests</h2>
      {!po.data?.items.length ? <p className="text-sm text-muted">No payout requests.</p> : <div className="card divide-y divide-line">{po.data.items.map((p) => <div key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm"><div className="flex-1"><p className="font-semibold">@{p.provider} · {naira(p.amount)}</p><p className="text-xs text-muted">{dateOnly(p.requestedAt)} · {p.reference}</p>{p.accountNumber && <div className="mt-2 rounded-lg bg-surface p-2.5 text-xs"><p className="text-muted">Send to</p><p className="mt-0.5 font-semibold text-white">{p.bankName} · <span className="font-mono tracking-wider">{p.accountNumber}</span></p><p className="text-white/80">{p.accountName}</p><button type="button" className="mt-1.5 text-red underline" onClick={() => navigator.clipboard?.writeText(p.accountNumber)}>Copy account number</button></div>}</div><StatusPill status={p.status} />{p.status === 'REQUESTED' && <><button className="btn-primary btn-sm" onClick={() => setPayout({ p, decision: 'paid' })}>Mark paid</button><button className="btn-secondary btn-sm" onClick={() => setPayout({ p, decision: 'rejected' })}>Reject</button></>}</div>)}</div>}
      <ReasonDialog open={!!refund} danger title="Refund transaction" confirmLabel="Refund" busy={doRefund.isPending} onClose={() => setRefund(null)} onConfirm={(reason) => doRefund.mutate({ id: refund.id, reason }, { onSuccess: () => setRefund(null) })} />
      <ReasonDialog open={!!payout} title={payout?.decision === 'paid' ? 'Mark payout as paid' : 'Reject payout'} confirmLabel="Confirm" busy={decide.isPending} onClose={() => setPayout(null)} onConfirm={(reason) => payout && decide.mutate({ id: payout.p.id, decision: payout.decision, reason }, { onSuccess: () => setPayout(null) })} />
    </div>
  )
}

export function AdminSupport() {
  const [t, setT] = useState<any>(null)
  const { data, isLoading } = useQuery({ queryKey: ['admin', 'support'], queryFn: () => api.get<{ items: any[] }>('/admin/support') })
  const respond = useAction(({ id, response, status }: { id: string; response: string; status: string }) => api.post(`/admin/support/${id}/respond`, { response, status }), ['admin'], 'Response sent')
  const [text, setText] = useState('')
  return (
    <div>
      <PageHeader title="Support requests" subtitle="Payment disputes, privacy and consent complaints." />
      {isLoading ? <Skeleton className="h-40" /> : !data?.items.length ? <EmptyState title="No requests" /> : <div className="space-y-3">{data.items.map((s) => (
        <div key={s.id} className="card p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{s.subject}</p><p className="text-xs text-muted">@{s.user.username} · {dateTime(s.createdAt)}</p></div><StatusPill status={s.status} /></div>
          <p className="mt-2 whitespace-pre-wrap text-sm text-muted">{s.body}</p>{s.adminResponse && <p className="mt-2 rounded-lg bg-surface p-3 text-xs"><span className="text-red">Response:</span> {s.adminResponse}</p>}
          {s.status !== 'CLOSED' && <Button variant="secondary" className="btn-sm mt-3" onClick={() => { setT(s); setText('') }}>Respond</Button>}</div>))}</div>}
      {t && <ConfirmDialog open title={`Respond: ${t.subject}`} confirmLabel="Send & close" onClose={() => setT(null)} busy={respond.isPending} onConfirm={() => text.trim().length > 1 && respond.mutate({ id: t.id, response: text, status: 'CLOSED' }, { onSuccess: () => setT(null) })}><Textarea className="mt-3" value={text} onChange={(e) => setText(e.target.value)} placeholder="Your reply to the user" /></ConfirmDialog>}
    </div>
  )
}

export function AdminAudit() {
  const { data, isLoading } = useQuery({ queryKey: ['admin', 'audit'], queryFn: () => api.get<{ items: any[] }>('/admin/audit-logs') })
  return (
    <div><PageHeader title="Audit log" subtitle="Every sensitive administrator action, with the reason given." />
      {isLoading ? <Skeleton className="h-40" /> : !data?.items.length ? <EmptyState title="No admin actions recorded yet" /> : <div className="card overflow-x-auto"><table className="w-full min-w-[640px] text-sm"><thead className="text-left text-xs text-muted"><tr>{['When', 'Admin', 'Action', 'Target', 'Reason'].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr></thead><tbody className="divide-y divide-line">{data.items.map((l) => <tr key={l.id}><td className="whitespace-nowrap px-4 py-3 text-muted">{dateTime(l.createdAt)}</td><td className="px-4 py-3">@{l.admin}</td><td className="px-4 py-3 font-mono text-xs">{l.action}</td><td className="px-4 py-3 text-xs text-muted">{l.targetType} · {l.targetId.slice(0, 8)}</td><td className="px-4 py-3 text-muted">{l.reason ?? '—'}</td></tr>)}</tbody></table></div>}</div>
  )
}
export type { ReactNode }


/** Pause/resume the referral programme and tune the reward. Changes are audit-logged. */
export function AdminReferrals() {
  const { data, isLoading } = useQuery({ queryKey: ['admin', 'referrals'], queryFn: () => api.get<{ settings: { enabled: boolean; rewardCredits: number; maxRewardsPerClient: number }; creditKobo: number; stats: { referrals: number; creditsGiven: number }; recent: { id: string; referrer: string | null; referred: string | null; credits: number; createdAt: string }[] }>('/admin/referrals') })
  const [reward, setReward] = useState<string>(); const [max, setMax] = useState<string>()
  const save = useAction((v: { enabled: boolean; rewardCredits: number; maxRewardsPerClient: number }) => api.put('/admin/referrals/settings', v), ['admin', 'referral'], 'Referral settings saved')
  if (isLoading || !data) return <Skeleton className="h-60" />
  const st = data.settings
  const rewardN = Number(reward ?? st.rewardCredits); const maxN = Number(max ?? st.maxRewardsPerClient)
  const valid = Number.isInteger(rewardN) && rewardN >= 1 && rewardN <= 1000 && Number.isInteger(maxN) && maxN >= 0 && maxN <= 1000
  const dirty = rewardN !== st.rewardCredits || maxN !== st.maxRewardsPerClient
  return (
    <div className="max-w-3xl">
      <PageHeader title="Referrals" subtitle="Clients earn credits when a friend joins through their link." />
      <div className="card flex flex-wrap items-center gap-4 p-5">
        <span className={`h-3 w-3 rounded-full ${st.enabled ? 'bg-ok' : 'bg-amber-400'}`} />
        <div className="min-w-0 flex-1"><p className="font-semibold">{st.enabled ? 'Referrals are running' : 'Referrals are paused'}</p><p className="text-xs text-muted">{st.enabled ? 'Clients see the invite popup and earn rewards.' : 'No popup is shown and no rewards are paid. Links keep working but earn nothing.'}</p></div>
        <Button variant={st.enabled ? 'secondary' : 'primary'} loading={save.isPending} onClick={() => save.mutate({ ...st, enabled: !st.enabled })}>{st.enabled ? 'Pause referrals' : 'Resume referrals'}</Button>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3"><Stat label="Friends referred" value={data.stats.referrals} /><Stat label="Credits given away" value={data.stats.creditsGiven} hint={naira(data.stats.creditsGiven * data.creditKobo)} /></div>
      <div className="card mt-4 space-y-4 p-5">
        <h2 className="font-semibold">Reward settings</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Reward per referral (credits)" hint="Whole number, 1–1000. Default is 20 credits."><Input type="number" min={1} max={1000} value={reward ?? String(st.rewardCredits)} onChange={(e) => setReward(e.target.value)} /></Field>
          <Field label="Most rewards one client can earn" hint="0 = no limit. Default 1: each client earns it once."><Input type="number" min={0} max={1000} value={max ?? String(st.maxRewardsPerClient)} onChange={(e) => setMax(e.target.value)} /></Field>
        </div>
        <Button disabled={!valid || !dirty} loading={save.isPending} onClick={() => save.mutate({ enabled: st.enabled, rewardCredits: rewardN, maxRewardsPerClient: maxN })}>Save changes</Button>
      </div>
      <h2 className="mb-3 mt-8 text-lg font-bold">Recent referrals</h2>
      {!data.recent.length ? <p className="text-sm text-muted">No referrals yet.</p> : (
        <div className="card divide-y divide-line">{data.recent.map((r) => <div key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm"><div className="min-w-0 flex-1"><p className="font-semibold">@{r.referrer ?? 'deleted'} <span className="font-normal text-muted">referred</span> @{r.referred ?? 'deleted'}</p><p className="text-xs text-muted">{dateOnly(r.createdAt)}</p></div><span className="font-bold text-ok">+{r.credits} credits</span></div>)}</div>
      )}
    </div>
  )
}
