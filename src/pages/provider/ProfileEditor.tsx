import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Camera, CheckCircle2, Eye, Send } from 'lucide-react'
import { api, errMsg, upload } from '../../lib/api'
import { useConfig, useMe } from '../../lib/auth'
import { useToast } from '../../lib/toast'
import { Avatar, Button, Field, Input, PageHeader, Segmented, Select, Skeleton, StatusPill, Textarea } from '../../components/ui'

interface Prof {
  username: string; displayName: string; biography: string; city: string; area: string | null; displayAge: number | null
  visibility: 'PUBLIC' | 'MEMBERS_ONLY' | 'HIDDEN'; availabilityStatus: 'AVAILABLE_NOW' | 'BY_APPOINTMENT' | 'OFFLINE'
  publicFields: { age: boolean; area: boolean }; verificationStatus: string; consentConfirmed: boolean; profileImageUrl: string | null
}

export function ProviderProfileEditor() {
  const { data: cfg } = useConfig()
  const { me } = useMe()
  const qc = useQueryClient()
  const { toast } = useToast()
  const { data, isLoading } = useQuery({ queryKey: ['provider-profile'], queryFn: () => api.get<Prof>('/provider/profile') })
  const [f, setF] = useState<Prof | null>(null)
  const file = useRef<HTMLInputElement>(null)
  useEffect(() => { if (data && !f) setF(data) }, [data, f])
  const set = (patch: Partial<Prof>) => setF((x) => (x ? { ...x, ...patch } : x))
  const refresh = () => { qc.invalidateQueries({ queryKey: ['provider-profile'] }); qc.invalidateQueries({ queryKey: ['me'] }); qc.invalidateQueries({ queryKey: ['provider-overview'] }) }

  const save = useMutation({
    mutationFn: () => api.put('/provider/profile', { displayName: f!.displayName, biography: f!.biography, city: f!.city, area: f!.area || null, displayAge: f!.displayAge, visibility: f!.visibility, availabilityStatus: f!.availabilityStatus, publicFields: f!.publicFields, consentConfirmed: f!.consentConfirmed }),
    onSuccess: () => { refresh(); toast('Profile saved', 'success') }, onError: (e) => toast(errMsg(e), 'error'),
  })
  const photo = useMutation({
    mutationFn: (x: File) => { const fd = new FormData(); fd.append('file', x); return upload<{ profileImageUrl: string }>('/provider/profile/photo', fd) },
    onSuccess: (r) => { set({ profileImageUrl: r.profileImageUrl }); refresh(); toast('Photo updated', 'success') }, onError: (e) => toast(errMsg(e), 'error'),
  })
  const submit = useMutation({
    mutationFn: async () => { await api.put('/provider/profile', { biography: f!.biography, displayAge: f!.displayAge, consentConfirmed: f!.consentConfirmed, city: f!.city, area: f!.area || null, displayName: f!.displayName }); return api.post('/provider/profile/submit') },
    onSuccess: () => { refresh(); toast('Submitted for review', 'success') }, onError: (e) => toast(errMsg(e), 'error'),
  })

  if (isLoading || !f) return <div className="space-y-3"><Skeleton className="h-24" /><Skeleton className="h-64" /></div>
  const status = data!.verificationStatus
  const locked = status === 'PENDING'

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader title="My Profile" action={<Link to={`/profile/${f.username}`} className="btn-secondary btn-sm"><Eye size={14} /> Preview</Link>} />

      <section className="card p-5">
        <div className="flex items-center justify-between"><h2 className="font-semibold">Verification</h2><StatusPill status={status} /></div>
        <p className="mt-2 text-sm text-muted">
          {status === 'VERIFIED' ? 'Your identity and age are verified. Your profile is discoverable according to your visibility setting.' : status === 'PENDING' ? 'A moderator is reviewing your submission. Editing is still allowed.' : status === 'REJECTED' ? 'Your last submission wasn’t approved. Update your profile and submit again.' : 'Complete your profile, then submit it for identity & age verification. Your legal identity is never shown publicly and ID documents are not stored by JaraPlug.'}
        </p>
        {status !== 'VERIFIED' && status !== 'PENDING' && <Button className="mt-4" loading={submit.isPending} onClick={() => submit.mutate()}><Send size={15} /> Submit for review</Button>}
      </section>

      <section className="card p-5">
        <div className="flex items-center gap-4">
          <div className="relative"><Avatar src={f.profileImageUrl} name={f.displayName} size={84} />
            <button onClick={() => file.current?.click()} className="absolute -bottom-1 -right-1 grid h-9 w-9 place-items-center rounded-full border-2 border-card bg-red" aria-label="Change profile photo">{photo.isPending ? '…' : <Camera size={15} />}</button>
            <input ref={file} type="file" hidden accept="image/jpeg,image/png,image/webp" onChange={(e) => { const x = e.target.files?.[0]; if (x) photo.mutate(x); e.target.value = '' }} /></div>
          <div className="text-sm text-muted"><p className="font-medium text-white">Profile photo</p><p>JPG, PNG or WebP up to {cfg?.maxImageMb}MB. Location data is stripped. Only use photos you own.</p></div>
        </div>
      </section>

      <section className="card space-y-4 p-5">
        <h2 className="font-semibold">Basics</h2>
        <Field label="Display name"><Input value={f.displayName} onChange={(e) => set({ displayName: e.target.value })} maxLength={40} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="City"><Select value={f.city} onChange={(e) => set({ city: e.target.value })}>{cfg?.cities.map((c) => <option key={c}>{c}</option>)}</Select></Field>
          <Field label="General area" hint="e.g. Lekki (not an address)"><Input value={f.area ?? ''} onChange={(e) => set({ area: e.target.value })} maxLength={60} /></Field>
        </div>
        <Field label="Age (must be 18+)"><Input type="number" min={18} max={99} value={f.displayAge ?? ''} onChange={(e) => set({ displayAge: e.target.value ? Number(e.target.value) : null })} /></Field>
        <Field label="Biography" hint={`${f.biography.length}/1000 · at least 20 characters. Don't include phone numbers or addresses.`}><Textarea value={f.biography} onChange={(e) => set({ biography: e.target.value })} maxLength={1000} /></Field>
      </section>

      <section className="card space-y-4 p-5">
        <h2 className="font-semibold">Visibility & privacy</h2>
        <div><p className="label">Who can find your profile</p><Segmented value={f.visibility} onChange={(v) => set({ visibility: v })} options={[{ key: 'PUBLIC', label: 'Public' }, { key: 'MEMBERS_ONLY', label: 'Members' }, { key: 'HIDDEN', label: 'Hidden' }]} /></div>
        <div><p className="label">Availability</p><Segmented value={f.availabilityStatus} onChange={(v) => set({ availabilityStatus: v })} options={[{ key: 'AVAILABLE_NOW', label: 'Available now' }, { key: 'BY_APPOINTMENT', label: 'By appt.' }, { key: 'OFFLINE', label: 'Offline' }]} /></div>
        <div><p className="label">Show on my public profile</p>
          {(['age', 'area'] as const).map((k) => <label key={k} className="flex items-center justify-between border-b border-line py-2.5 text-sm last:border-0"><span className="capitalize">{k}</span><input type="checkbox" className="h-5 w-5 accent-[#FF1744]" checked={f.publicFields[k]} onChange={(e) => set({ publicFields: { ...f.publicFields, [k]: e.target.checked } })} /></label>)}
          <p className="mt-2 text-xs text-muted">Your legal name, phone number and email are never displayed.</p></div>
      </section>

      <section className="card p-5">
        <label className="flex items-start gap-3 text-sm"><input type="checkbox" className="mt-1 h-4 w-4 accent-[#FF1744]" checked={f.consentConfirmed} onChange={(e) => set({ consentConfirmed: e.target.checked })} />
          <span className="text-muted"><strong className="text-white">Rights & consent.</strong> I own or am licensed to use every photo and video I upload, and everyone shown is an adult who has consented to its publication on JaraPlug.</span></label>
      </section>

      <Button className="w-full py-3" loading={save.isPending} disabled={locked && false} onClick={() => save.mutate()}><CheckCircle2 size={16} /> Save profile</Button>
      {me?.isDemo && <p className="text-center text-xs text-muted">Demo account — data may be reset by <code>npm run db:reset</code>.</p>}
    </div>
  )
}
