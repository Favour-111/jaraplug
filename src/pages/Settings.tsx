import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Download, LifeBuoy, LogOut, ShieldOff, Trash2 } from 'lucide-react'
import { api, currentToken, API_BASE, errMsg } from '../lib/api'
import { useAuthState, useMe } from '../lib/auth'
import { useToast } from '../lib/toast'
import type { UserSummary } from '../lib/types'
import { Avatar, Button, ConfirmDialog, Input, PageHeader, StatusPill } from '../components/ui'
import { SupportModal } from './ClientPages'
import { dateOnly } from '../lib/format'

export function SettingsPage() {
  const { me } = useMe()
  const { signOut } = useAuthState()
  const nav = useNavigate()
  const qc = useQueryClient()
  const { toast } = useToast()
  const [del, setDel] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [support, setSupport] = useState(false)

  const blocks = useQuery({ queryKey: ['blocks'], queryFn: () => api.get<{ items: UserSummary[] }>('/blocks') })
  const tickets = useQuery({ queryKey: ['support'], queryFn: () => api.get<{ items: { id: string; subject: string; status: string; createdAt: string; adminResponse: string | null }[] }>('/support') })
  const unblock = useMutation({ mutationFn: (id: string) => api.delete(`/blocks/${id}`), onSuccess: () => { qc.invalidateQueries({ queryKey: ['blocks'] }); qc.invalidateQueries({ queryKey: ['providers'] }); toast('Unblocked', 'success') } })
  const remove = useMutation({
    mutationFn: () => api.delete('/me', { confirm: 'DELETE' }),
    onSuccess: async () => { await signOut(); qc.clear(); toast('Your account has been deleted', 'success'); nav('/') },
    onError: (e) => toast(errMsg(e), 'error'),
  })

  const exportData = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/me/export`, { headers: { Authorization: `Bearer ${await currentToken()}` } })
      if (!res.ok) throw new Error('Export failed')
      const url = URL.createObjectURL(await res.blob())
      const a = document.createElement('a'); a.href = url; a.download = 'jaraplug-data-export.json'; a.click(); URL.revokeObjectURL(url)
    } catch (e) { toast(errMsg(e), 'error') }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Settings" />
      <section className="card p-5">
        <h2 className="font-semibold">Account</h2>
        <dl className="mt-3 divide-y divide-line text-sm">
          {[['Username', `@${me?.username}`], ['Account type', me?.role?.toLowerCase()], ['Email', me?.email ?? '—'], ['Age verification', me?.ageVerificationStatus?.replaceAll('_', ' ').toLowerCase()]].map(([k, v]) => <div key={k as string} className="flex justify-between py-2.5"><dt className="text-muted">{k}</dt><dd className="font-medium capitalize">{v}</dd></div>)}
        </dl>
      </section>

      <section className="card p-5">
        <h2 className="flex items-center gap-2 font-semibold"><ShieldOff size={16} className="text-red" /> Blocked users</h2>
        {blocks.data?.items.length ? <ul className="mt-3 divide-y divide-line">{blocks.data.items.map((u) => <li key={u.id} className="flex items-center gap-3 py-3"><Avatar src={u.avatarUrl} name={u.displayName} size={36} /><span className="flex-1 text-sm font-medium">{u.displayName}</span><button className="btn-secondary btn-sm" onClick={() => unblock.mutate(u.id)}>Unblock</button></li>)}</ul> : <p className="mt-2 text-sm text-muted">You haven't blocked anyone.</p>}
      </section>

      <section className="card p-5">
        <div className="flex items-center justify-between"><h2 className="flex items-center gap-2 font-semibold"><LifeBuoy size={16} className="text-red" /> Support</h2><button className="btn-secondary btn-sm" onClick={() => setSupport(true)}>New request</button></div>
        {tickets.data?.items.length ? <ul className="mt-3 divide-y divide-line">{tickets.data.items.map((t) => <li key={t.id} className="py-3 text-sm"><div className="flex items-center justify-between gap-3"><span className="font-medium">{t.subject}</span><StatusPill status={t.status} /></div><p className="mt-0.5 text-xs text-muted">{dateOnly(t.createdAt)}</p>{t.adminResponse && <p className="mt-2 rounded-lg bg-surface px-3 py-2 text-xs"><span className="text-red">Support:</span> {t.adminResponse}</p>}</li>)}</ul> : <p className="mt-2 text-sm text-muted">No support requests. Use this for payment disputes, privacy or consent complaints.</p>}
      </section>

      <section className="card p-5">
        <h2 className="font-semibold">Privacy & data</h2>
        <p className="mt-1 text-sm text-muted">Download everything we hold about you, or permanently delete your account and media.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button variant="secondary" onClick={exportData}><Download size={15} /> Export my data</Button>
          <Button variant="secondary" onClick={async () => { await signOut(); qc.clear(); nav('/') }}><LogOut size={15} /> Sign out</Button>
          <Button variant="danger" onClick={() => setDel(true)}><Trash2 size={15} /> Delete account</Button>
        </div>
      </section>

      <ConfirmDialog open={del} onClose={() => setDel(false)} danger title="Delete your account?" confirmLabel="Delete permanently" busy={remove.isPending} onConfirm={() => confirmText === 'DELETE' && remove.mutate()} text="This removes your profile, media, favourites and messages' contents, and signs you out everywhere. Financial records are kept in anonymised form. This cannot be undone.">
        <Input className="mt-4" placeholder='Type "DELETE" to confirm' value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
        {confirmText && confirmText !== 'DELETE' && <p className="mt-1 text-xs text-muted">Type DELETE exactly.</p>}
      </ConfirmDialog>
      <SupportModal open={support} onClose={() => setSupport(false)} />
    </div>
  )
}
