import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FileVideo, ImageIcon, Info, Pencil, Trash2, UploadCloud, X } from 'lucide-react'
import { api, errMsg, upload } from '../../lib/api'
import { useConfig, useCreditUnit, useMe } from '../../lib/auth'
import { useToast } from '../../lib/toast'
import type { ContentItem } from '../../lib/types'
import { ContentCard } from '../../components/ContentCard'
import { Button, ConfirmDialog, EmptyState, Field, Input, Modal, PageHeader, Segmented, Skeleton, Textarea } from '../../components/ui'
import { creditsLabel, koboToCredits, naira } from '../../lib/format'

export function ProviderContentPage() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [del, setDel] = useState<ContentItem | null>(null)
  const [edit, setEdit] = useState<ContentItem | null>(null)
  const { data, isLoading } = useQuery({ queryKey: ['my-content'], queryFn: () => api.get<{ items: ContentItem[] }>('/content/mine') })
  const refresh = () => { qc.invalidateQueries({ queryKey: ['my-content'] }); qc.invalidateQueries({ queryKey: ['provider-overview'] }) }
  const toggle = useMutation({ mutationFn: (c: ContentItem) => api.patch(`/content/${c.id}`, { publish: c.status !== 'PUBLISHED', ...(c.status !== 'PUBLISHED' ? { consentConfirmed: true } : {}) }), onSuccess: () => { refresh(); toast('Updated', 'success') }, onError: (e) => toast(errMsg(e), 'error') })
  const remove = useMutation({ mutationFn: (c: ContentItem) => api.delete(`/content/${c.id}`), onSuccess: () => { refresh(); setDel(null); toast('Deleted', 'success') }, onError: (e) => toast(errMsg(e), 'error') })

  return (
    <div>
      <PageHeader title="My Content" subtitle="Everything you've uploaded." action={<Link to="/provider/content/upload" className="btn-primary btn-sm"><UploadCloud size={15} /> Upload</Link>} />
      {isLoading ? <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="aspect-[3/4]" />)}</div> : data?.items.length ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          {data.items.map((c) => (
            <div key={c.id}>
              <ContentCard c={{ ...c, locked: false }} owner />
              <div className="mt-2 flex gap-1.5">
                <button className="btn-secondary btn-sm flex-1" disabled={toggle.isPending || c.moderationStatus === 'REMOVED'} onClick={() => toggle.mutate(c)}>{c.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}</button>
                <button className="btn-secondary btn-sm !px-3" aria-label="Edit" onClick={() => setEdit(c)}><Pencil size={14} /></button>
                <button className="btn-danger btn-sm !px-3" aria-label="Delete" onClick={() => setDel(c)}><Trash2 size={14} /></button>
              </div>
              {(c.purchaseCount ?? 0) > 0 && <p className="mt-1.5 text-[11px] text-muted">{c.purchaseCount} purchase{c.purchaseCount === 1 ? '' : 's'}</p>}
            </div>
          ))}
        </div>
      ) : <EmptyState icon={<FileVideo />} title="No content yet" text="Upload your first photo or video. New items are reviewed by a moderator before they go live." action={<Link to="/provider/content/upload" className="btn-primary">Upload content</Link>} />}

      <ConfirmDialog open={!!del} danger title="Delete this item?" text={del && (del.purchaseCount ?? 0) > 0 ? 'This item has been purchased and cannot be deleted. Unpublish it instead.' : 'The file is permanently erased from storage.'} confirmLabel="Delete" busy={remove.isPending} onClose={() => setDel(null)} onConfirm={() => del && remove.mutate(del)} />
      {edit && <EditModal item={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); refresh() }} />}
    </div>
  )
}

function EditModal({ item, onClose, onSaved }: { item: ContentItem; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast()
  const [title, setTitle] = useState(item.title)
  const [description, setDescription] = useState(item.description)
  const unit = useCreditUnit()
  const [price, setPrice] = useState(String(koboToCredits(item.price, unit)))
  const m = useMutation({
    // The API takes the price in naira; credits × the credit value.
    mutationFn: () => api.patch(`/content/${item.id}`, { title, description, ...(item.visibility === 'PAID' ? { price: Number(price) * (unit / 100) } : {}) }),
    onSuccess: () => { toast('Saved', 'success'); onSaved() }, onError: (e) => toast(errMsg(e), 'error'),
  })
  return (
    <Modal open onClose={onClose} title="Edit item">
      <div className="space-y-4">
        <Field label="Title"><Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} /></Field>
        <Field label="Description"><Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} /></Field>
        {item.visibility === 'PAID' && <Field label="Price (credits)" hint={(item.purchaseCount ?? 0) > 0 ? 'Price is locked after the first purchase.' : `1 credit = ${naira(unit)}`}><Input type="number" min={1} step={1} value={price} disabled={(item.purchaseCount ?? 0) > 0} onChange={(e) => setPrice(e.target.value)} /></Field>}
        <Button className="w-full" loading={m.isPending} onClick={() => m.mutate()}>Save</Button>
      </div>
    </Modal>
  )
}

export function UploadContentPage() {
  const nav = useNavigate()
  const qc = useQueryClient()
  const { toast } = useToast()
  const { data: cfg } = useConfig()
  const { me } = useMe()
  const input = useRef<HTMLInputElement>(null)
  const [kind, setKind] = useState<'photo' | 'video'>('video')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [exclusive, setExclusive] = useState(true)
  const [visibility, setVisibility] = useState<'PUBLIC' | 'FREE_MEMBERS'>('PUBLIC')
  const [price, setPrice] = useState('')
  const [consent, setConsent] = useState(false)
  const [progress, setProgress] = useState<number | null>(null)
  const [drag, setDrag] = useState(false)
  const verified = me?.providerProfile?.verificationStatus === 'VERIFIED'

  useEffect(() => { if (!file) return setPreview(null); const u = URL.createObjectURL(file); setPreview(u); return () => URL.revokeObjectURL(u) }, [file])

  const maxMb = kind === 'video' ? cfg?.maxVideoMb ?? 500 : cfg?.maxImageMb ?? 10
  const pick = (f?: File) => {
    if (!f) return
    const ok = kind === 'video' ? ['video/mp4', 'video/quicktime', 'video/webm'] : ['image/jpeg', 'image/png', 'image/webp']
    if (!ok.includes(f.type)) return toast(kind === 'video' ? 'Choose an MP4, MOV or WebM video' : 'Choose a JPG, PNG or WebP image', 'error')
    if (f.size > maxMb * 1024 * 1024) return toast(`That file is over ${maxMb}MB`, 'error')
    setFile(f)
  }

  // Providers price in credits (whole numbers); the API takes the equivalent naira.
  const unit = useCreditUnit()
  const priceNum = Number(price)
  const minCredits = Math.max(1, Math.ceil((cfg?.minPaidPriceKobo ?? 50000) / unit))
  const maxCredits = Math.floor((cfg?.maxPaidPriceKobo ?? 1e8) / unit)
  const priceOk = !exclusive || (Number.isInteger(priceNum) && priceNum >= minCredits && priceNum <= maxCredits)

  const send = useMutation({
    mutationFn: ({ publish }: { publish: boolean }) => {
      const fd = new FormData()
      fd.append('file', file!); fd.append('title', title); fd.append('description', description)
      fd.append('visibility', exclusive ? 'PAID' : visibility); fd.append('price', exclusive ? String(priceNum * (unit / 100)) : '0')
      fd.append('publish', String(publish)); fd.append('consentConfirmed', String(consent))
      return upload('/content', fd, setProgress)
    },
    onSuccess: (_r, v) => { qc.invalidateQueries({ queryKey: ['my-content'] }); qc.invalidateQueries({ queryKey: ['provider-overview'] }); toast(v.publish ? 'Uploaded — awaiting moderator review' : 'Draft saved', 'success'); nav('/provider/content') },
    onError: (e) => { setProgress(null); toast(errMsg(e), 'error') },
  })
  const can = !!file && title.trim().length >= 2 && priceOk && progress === null

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Upload Content" />
      {!verified && <p className="mb-4 flex gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-300"><Info size={16} className="mt-0.5 shrink-0" />Your profile isn't verified yet. You can save drafts, but publishing unlocks after verification.</p>}
      <Segmented value={kind} onChange={(k) => { setKind(k); setFile(null) }} options={[{ key: 'photo', label: 'Photos' }, { key: 'video', label: 'Videos' }]} />

      <button type="button" onClick={() => input.current?.click()} onDragOver={(e) => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files[0]) }}
        className={`mt-4 flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-8 text-center transition ${drag ? 'border-red bg-red-soft' : 'border-line bg-surface hover:border-red/50'}`}>
        {preview && file ? (
          <div className="relative w-full">{kind === 'video' ? <video src={preview} className="mx-auto max-h-64 rounded-xl" controls onClick={(e) => e.stopPropagation()} /> : <img src={preview} alt="Preview" className="mx-auto max-h-64 rounded-xl object-contain" />}
            <p className="mt-3 truncate text-xs text-muted">{file.name} · {(file.size / 1048576).toFixed(1)}MB</p>
            <span role="button" aria-label="Remove file" onClick={(e) => { e.stopPropagation(); setFile(null) }} className="absolute right-0 top-0 grid h-8 w-8 place-items-center rounded-full bg-black/70"><X size={15} /></span></div>
        ) : (<><span className="grid h-14 w-14 place-items-center rounded-2xl bg-red-soft text-red">{kind === 'video' ? <UploadCloud size={26} /> : <ImageIcon size={26} />}</span><p className="mt-3 font-semibold">Upload {kind === 'video' ? 'Video' : 'Photo'}</p><p className="mt-1 text-xs text-muted">{kind === 'video' ? `MP4, MOV or WebM up to ${maxMb}MB` : `JPG, PNG or WebP up to ${maxMb}MB`}</p></>)}
      </button>
      <input ref={input} type="file" hidden accept={kind === 'video' ? 'video/mp4,video/quicktime,video/webm' : 'image/jpeg,image/png,image/webp'} onChange={(e) => { pick(e.target.files?.[0]); e.target.value = '' }} />

      <div className="mt-6 space-y-5">
        <Field label="Title"><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Private Video 01" maxLength={80} /></Field>
        <Field label="Description (optional)"><Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} className="!min-h-[72px]" /></Field>
        <label className="card flex cursor-pointer items-center justify-between px-4 py-3.5">
          <span><span className="block text-sm font-semibold">Set as Exclusive (Locked)</span><span className="text-xs text-muted">Buyers pay to unlock</span></span>
          <button type="button" role="switch" aria-checked={exclusive} onClick={() => setExclusive((x) => !x)} className={`relative h-7 w-12 rounded-full transition ${exclusive ? 'bg-red' : 'bg-[#2a2a2a]'}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${exclusive ? 'left-6' : 'left-1'}`} /></button>
        </label>
        {exclusive ? (
          <Field label="Price (credits)" error={price && !priceOk ? `Enter a whole number of credits between ${minCredits} and ${maxCredits.toLocaleString()}` : undefined} hint={priceOk && priceNum ? `${creditsLabel(priceNum)} = ${naira(priceNum * unit)} to the buyer. You receive about ${naira(Math.round(priceNum * unit * (1 - (cfg?.commissionBps ?? 2000) / 10000)))} after the ${(cfg?.commissionBps ?? 2000) / 100}% platform commission.` : `1 credit = ${naira(unit)}`}>
            <Input inputMode="numeric" type="number" min={minCredits} step={1} placeholder="e.g. 10" value={price} onChange={(e) => setPrice(e.target.value)} />
          </Field>
        ) : (
          <div><p className="label">Visibility</p><Segmented value={visibility} onChange={setVisibility} options={[{ key: 'PUBLIC', label: 'Public' }, { key: 'FREE_MEMBERS', label: 'Free for members' }]} /><p className="mt-1.5 text-xs text-muted">Public content must be non-explicit. Members-only content is visible to age-verified users.</p></div>
        )}
        <label className="flex items-start gap-3 text-sm"><input type="checkbox" className="mt-1 h-4 w-4 accent-[#FF1744]" checked={consent} onChange={(e) => setConsent(e.target.checked)} /><span className="text-muted">I own the rights to this media and everyone in it is an adult who consented to its publication. <span className="text-white">Required to publish.</span></span></label>

        {progress !== null && <div><div className="h-2 overflow-hidden rounded-full bg-surface"><div className="h-full bg-gradient-to-r from-red-dark to-red transition-all" style={{ width: `${progress}%` }} /></div><p className="mt-1.5 text-xs text-muted">{progress < 100 ? `Uploading… ${progress}%` : 'Processing…'}</p></div>}
        <div className="grid grid-cols-2 gap-3">
          <Button variant="secondary" disabled={!can} onClick={() => send.mutate({ publish: false })}>Save draft</Button>
          <Button disabled={!can || !consent || !verified} loading={send.isPending} onClick={() => send.mutate({ publish: true })}>Upload & publish</Button>
        </div>
        {!consent && file && <p className="text-center text-xs text-muted">Confirm consent to enable publishing.</p>}
      </div>
    </div>
  )
}
