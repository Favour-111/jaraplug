import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams, Navigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { ArrowLeft, CheckCircle2, Coins, Flag, Lock, Play, ShieldCheck, Video, XCircle } from 'lucide-react'
import { api, ApiError, errMsg } from '../lib/api'
import { queryClient, useAuthState, useCreditUnit, useMe } from '../lib/auth'
import { useToast } from '../lib/toast'
import type { ContentItem } from '../lib/types'
import { Button, EmptyState, LoadImage, Skeleton, Spinner } from '../components/ui'
import { ReportDialog } from '../components/Dialogs'
import { creditsLabel, koboToCredits, naira } from '../lib/format'
import { RETURN_KEY } from './Credits'

type Detail = ContentItem & { provider: { username: string; displayName: string } }

export function UnlockPage() {
  const { id = '' } = useParams()
  const nav = useNavigate()
  const { toast } = useToast()
  const { status } = useAuthState()
  const { me } = useMe()
  const { data: c, isLoading, error } = useQuery({ queryKey: ['content', id, status], queryFn: () => api.get<Detail>(`/content/${id}`), retry: false })

  const unit = useCreditUnit()
  const cost = c ? koboToCredits(c.price, unit) : 0
  const balance = me?.creditBalance ?? 0
  const buyCredits = () => nav(`/app/credits?need=${Math.max(1, cost - balance)}&returnTo=${encodeURIComponent(`/unlock/${id}`)}`)

  const pay = useMutation({
    mutationFn: () => api.post<{ balance: number }>('/purchases/unlock', { contentId: id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] }); queryClient.invalidateQueries({ queryKey: ['credits'] }); queryClient.invalidateQueries({ queryKey: ['content'] })
      toast('Unlocked!', 'success'); nav(`/watch/${id}`, { replace: true })
    },
    onError: (e) => {
      if (e instanceof ApiError && e.code === 'AGE_VERIFICATION_REQUIRED') nav('/verify')
      else if (e instanceof ApiError && e.code === 'ALREADY_OWNED') nav(`/watch/${id}`)
      else if (e instanceof ApiError && e.code === 'INSUFFICIENT_CREDITS') { queryClient.invalidateQueries({ queryKey: ['me'] }); buyCredits() }
      else toast(errMsg(e), 'error')
    },
  })

  if (isLoading) return <div className="mx-auto max-w-md p-4"><Skeleton className="aspect-video" /></div>
  if (error || !c) return <div className="mx-auto max-w-md px-4 py-20"><EmptyState title="Content not available" action={<button className="btn-secondary" onClick={() => nav(-1)}>Go back</button>} /></div>
  if (!c.locked) return <Navigate to={`/watch/${id}`} replace />

  const paid = c.visibility === 'PAID'
  const goPay = () => (status !== 'signedIn' ? nav('/login', { state: { from: `/unlock/${id}` } }) : me?.role !== 'CLIENT' ? toast('Only client accounts can purchase', 'info') : me.ageVerificationStatus !== 'VERIFIED' ? nav('/verify') : balance < cost ? buyCredits() : pay.mutate())

  return (
    <div className="mx-auto max-w-md px-4 pb-12 pt-3">
      <div className="mb-4 flex items-center gap-3"><button onClick={() => nav(-1)} className="grid h-10 w-10 place-items-center rounded-full hover:bg-card" aria-label="Back"><ArrowLeft size={20} /></button><h1 className="text-lg font-bold">Unlock {c.mediaType === 'VIDEO' ? 'Video' : 'Photo'}</h1></div>
      <div className="relative aspect-video overflow-hidden rounded-2xl border border-line bg-[#1c1c1c]">
        {c.thumbnailUrl && <LoadImage src={c.thumbnailUrl} className="h-full w-full object-cover" draggable={false} />}
        <div className="absolute inset-0 bg-black/30" />
        <div className="absolute inset-0 grid place-items-center"><Lock size={34} className="text-amber-400" /></div>
        {c.mediaType === 'VIDEO' && <span className="absolute bottom-3 right-3 grid h-10 w-10 place-items-center rounded-full bg-white/90 text-black"><Play size={16} className="ml-0.5 fill-black" /></span>}
      </div>
      <h2 className="mt-5 text-2xl font-extrabold tracking-tight">{c.title}</h2>
      <Link to={`/profile/${c.provider.username}`} className="text-sm text-muted hover:text-white">by {c.provider.displayName}</Link>
      {paid && <div className="mt-3"><p className="flex items-center gap-2.5 text-4xl font-extrabold tracking-tight"><Coins className="text-amber-400" size={32} />{creditsLabel(cost)}</p><p className="mt-1 text-sm text-muted">Worth {naira(c.price)}{status === 'signedIn' && me?.role === 'CLIENT' ? ` · Your balance: ${creditsLabel(balance)}` : ''}</p></div>}
      {c.description && <p className="mt-3 text-sm text-muted">{c.description}</p>}
      <ul className="mt-5 space-y-3.5 text-[15px]">
        {[[Video, 'High quality ' + (c.mediaType === 'VIDEO' ? 'video' : 'photo')], [ShieldCheck, 'Secure and private'], [CheckCircle2, 'Yours to watch anytime']].map(([I, t]) => { const Icon = I as typeof Video; return <li key={t as string} className="flex items-center gap-3 text-white/90"><span className="grid h-8 w-8 place-items-center rounded-lg bg-card text-muted"><Icon size={16} /></span>{t as string}</li> })}
      </ul>
      {paid ? (
        <>
          <Button className="mt-7 w-full py-3" loading={pay.isPending} onClick={goPay}>{status === 'signedIn' && me?.role === 'CLIENT' && balance < cost ? `Buy credits to unlock (${creditsLabel(cost - balance)} short)` : `Unlock for ${creditsLabel(cost)}`}</Button>
          <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted"><Lock size={12} /> Credits are deducted instantly and discreetly</p>
          <details className="mt-5 rounded-xl border border-line bg-card px-4 py-3 text-xs text-muted"><summary className="cursor-pointer font-medium text-white">Purchase terms</summary><p className="mt-2 leading-relaxed">One-time purchase of personal, non-transferable access to this item, paid for with your in-app credits. Access is granted only after the credits are deducted on our server. You may not copy, share or redistribute it. If something goes wrong, raise a dispute from Purchases.</p></details>
        </>
      ) : (
        <Button className="mt-7 w-full py-3" onClick={() => (status !== 'signedIn' ? nav('/login', { state: { from: `/unlock/${id}` } }) : nav('/verify'))}>Verify your age to view</Button>
      )}
    </div>
  )
}

export function WatchPage() {
  const { id = '' } = useParams()
  const nav = useNavigate()
  const [report, setReport] = useState(false)
  const { status } = useAuthState()
  const { data: meta } = useQuery({ queryKey: ['content', id, status], queryFn: () => api.get<Detail>(`/content/${id}`), retry: false })
  const { data, error, isLoading } = useQuery({
    queryKey: ['access', id, status], queryFn: () => api.post<{ url: string; mediaType: 'IMAGE' | 'VIDEO'; expiresAt: string }>(`/content/${id}/access`), retry: false,
    // refresh the short-lived signed URL before it expires
    refetchInterval: 10 * 60 * 1000, staleTime: 5 * 60 * 1000,
  })
  const apiErr = error as ApiError | null
  if (apiErr && ['PURCHASE_REQUIRED', 'AGE_VERIFICATION_REQUIRED', 'LOGIN_REQUIRED'].includes(apiErr.code ?? '')) return <Navigate to={`/unlock/${id}`} replace />

  return (
    <div className="mx-auto max-w-3xl px-4 pb-12 pt-3">
      <div className="mb-4 flex items-center justify-between"><button onClick={() => nav(-1)} className="grid h-10 w-10 place-items-center rounded-full hover:bg-card" aria-label="Back"><ArrowLeft size={20} /></button>{meta && <button onClick={() => (status === 'signedIn' ? setReport(true) : nav('/login'))} className="btn-ghost btn-sm"><Flag size={14} /> Report</button>}</div>
      {isLoading && <div className="grid aspect-video place-items-center rounded-2xl bg-card text-red"><Spinner /></div>}
      {apiErr && !['PURCHASE_REQUIRED', 'AGE_VERIFICATION_REQUIRED', 'LOGIN_REQUIRED'].includes(apiErr.code ?? '') && <EmptyState icon={<XCircle />} title="Can't open this" text={apiErr.message} />}
      {data && (
        <div onContextMenu={(e) => e.preventDefault()} className="overflow-hidden rounded-2xl border border-line bg-black">
          {data.mediaType === 'VIDEO' ? <video src={data.url} controls controlsList="nodownload noremoteplayback" disablePictureInPicture playsInline className="max-h-[75vh] w-full" /> : <LoadImage src={data.url} alt={meta?.title ?? ''} draggable={false} className="max-h-[80vh] w-full object-contain" box="h-72 w-full" />}
        </div>
      )}
      {meta && <div className="mt-4"><h1 className="text-xl font-bold">{meta.title}</h1><Link to={`/profile/${meta.provider.username}`} className="text-sm text-muted hover:text-white">by {meta.provider.displayName}</Link></div>}
      <p className="mt-6 text-[11px] leading-relaxed text-muted">This link is private and expires shortly. Downloads and sharing are not permitted. No web platform can fully prevent screen recording — please respect the creator.</p>
      {meta && <ReportDialog open={report} onClose={() => setReport(false)} reportedContentId={id} label="Report this content" />}
    </div>
  )
}

export function CheckoutResult() {
  const { reference = '' } = useParams()
  const [tries, setTries] = useState(0)
  const stop = useRef(false)
  const { data } = useQuery({
    queryKey: ['verify', reference, tries], queryFn: () => api.get<{ status: string; type: string; contentId: string | null; credits: number | null; entitled: boolean }>(`/purchases/verify/${reference}`),
    refetchInterval: (q) => (q.state.data?.status === 'PENDING' && tries < 10 && !stop.current ? 1500 : false),
  })
  useEffect(() => { if (data?.status === 'PENDING') setTries((t) => t + 1) }, [data])
  // Refresh the header balance as soon as the credits land.
  useEffect(() => { if (data?.status === 'SUCCESS') { queryClient.invalidateQueries({ queryKey: ['me'] }); queryClient.invalidateQueries({ queryKey: ['credits'] }) } }, [data?.status])
  const returnTo = (() => { try { return sessionStorage.getItem(RETURN_KEY) } catch { return null } })()
  const ok = data?.status === 'SUCCESS' && (data.type === 'CREDIT_TOPUP' || data.entitled)
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      {!data || (data.status === 'PENDING') ? (
        <><Spinner className="mx-auto !h-8 !w-8 text-red" /><h1 className="mt-5 text-xl font-bold">Confirming your payment…</h1><p className="mt-2 text-sm text-muted">We're waiting for the payment provider's confirmation. This usually takes a few seconds.</p>{tries >= 10 && <p className="mt-4 text-sm text-amber-300">Still pending. If you were charged, your credits will be added automatically — or contact support from Purchases.</p>}</>
      ) : ok && data.type === 'CREDIT_TOPUP' ? (
        <><CheckCircle2 size={56} className="mx-auto text-ok" /><h1 className="mt-5 text-2xl font-extrabold">{creditsLabel(data.credits ?? 0)} added!</h1><p className="mt-2 text-sm text-muted">Your payment was verified and your credits are ready to use.</p>
          {returnTo ? <Link to={returnTo} onClick={() => { try { sessionStorage.removeItem(RETURN_KEY) } catch { /* */ } }} className="btn-primary mt-6 w-full">Continue to unlock</Link> : <Link to="/app/discover" className="btn-primary mt-6 w-full">Browse profiles</Link>}
          <Link to="/app/credits" className="btn-secondary mt-3 w-full">View my credits</Link></>
      ) : ok ? (
        <><CheckCircle2 size={56} className="mx-auto text-ok" /><h1 className="mt-5 text-2xl font-extrabold">Unlocked!</h1><p className="mt-2 text-sm text-muted">It's now in your library.</p><Link to={`/watch/${data.contentId}`} className="btn-primary mt-6 w-full">Watch now</Link><Link to="/app/content" className="btn-secondary mt-3 w-full">Go to my library</Link></>
      ) : (
        <><XCircle size={56} className="mx-auto text-red" /><h1 className="mt-5 text-2xl font-extrabold">Payment not completed</h1><p className="mt-2 text-sm text-muted">No credits were added and you were not charged.</p><Link to="/app/credits" className="btn-primary mt-6 w-full">Try again</Link></>
      )}
    </div>
  )
}
