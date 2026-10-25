import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Ban, CalendarPlus, Flag, Heart, MapPin, MessageCircle, MoreVertical, Pencil, Lock } from 'lucide-react'
import { api, ApiError, errMsg } from '../lib/api'
import { useAuthState, useConfig, useMe } from '../lib/auth'
import type { ProviderProfileData } from '../lib/types'
import { ContentCard } from '../components/ContentCard'
import { BlockDialog, ReportDialog } from '../components/Dialogs'
import { Button, DemoChip, EmptyState, OnlineDot, Skeleton, Tabs, VerifiedBadge } from '../components/ui'
import { useToast } from '../lib/toast'

type Tab = 'about' | 'photos' | 'videos'

export function ProviderProfilePage() {
  const { username = '' } = useParams()
  const nav = useNavigate()
  const qc = useQueryClient()
  const { toast } = useToast()
  const { status } = useAuthState()
  const { me } = useMe()
  const { data: cfg } = useConfig()
  const [tab, setTab] = useState<Tab>('about')
  const [menu, setMenu] = useState(false)
  const [report, setReport] = useState(false)
  const [block, setBlock] = useState(false)

  const { data: p, isLoading, error } = useQuery({
    queryKey: ['provider', username, status],
    queryFn: () => api.get<ProviderProfileData>(`/providers/${username}`),
    retry: (n, e) => !(e instanceof ApiError && e.status === 404) && n < 2,
  })

  const fav = useMutation({
    mutationFn: () => (p!.isFavorite ? api.delete(`/favorites/${p!.id}`) : api.put(`/favorites/${p!.id}`)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['provider', username] }); qc.invalidateQueries({ queryKey: ['favorites'] }); qc.invalidateQueries({ queryKey: ['providers'] }) },
  })
  const message = useMutation({
    mutationFn: () => api.post<{ id: string }>('/conversations', { username }),
    onSuccess: (r) => { qc.invalidateQueries({ queryKey: ['conversations'] }); nav(`/app/messages/${r.id}`) },
    onError: (e) => { if (e instanceof ApiError && e.code === 'AGE_VERIFICATION_REQUIRED') nav('/verify'); else toast(errMsg(e), 'error') },
  })

  const needLogin = () => nav('/login', { state: { from: `/profile/${username}` } })
  const isClient = me?.role === 'CLIENT'
  const onMessage = () => (status !== 'signedIn' ? needLogin() : !isClient ? toast('Only client accounts can start conversations', 'info') : message.mutate())
  const onBook = () => (status !== 'signedIn' ? needLogin() : !isClient ? toast('Only client accounts can request bookings', 'info') : nav(`/book/${username}`))
  const back = () => (window.history.length > 1 ? nav(-1) : nav('/discover'))

  if (isLoading) return <div className="mx-auto max-w-5xl p-4"><Skeleton className="aspect-[4/5] w-full max-w-md" /><Skeleton className="mt-4 h-8 w-48" /></div>
  if (error || !p)
    return (
      <div className="mx-auto max-w-md px-4 py-20"><EmptyState title="Profile not found" text="It may have been removed, hidden, or you may not have access." action={<Link to="/discover" className="btn-primary">Back to discover</Link>} /></div>
    )

  const photos = p.content.filter((c) => c.mediaType === 'IMAGE')
  const videos = p.content.filter((c) => c.mediaType === 'VIDEO')
  const pubVideos = videos.filter((c) => c.visibility !== 'PAID')
  const exclVideos = videos.filter((c) => c.visibility === 'PAID')
  const gallery = p.content.filter((c) => c.visibility === 'PUBLIC' && c.mediaType === 'IMAGE')

  const Grid = ({ items }: { items: typeof p.content }) => (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{items.map((c) => <ContentCard key={c.id} c={c} owner={p.isSelf} />)}</div>
  )

  return (
    <div className="mx-auto max-w-5xl pb-16 md:grid md:grid-cols-[minmax(0,420px)_1fr] md:gap-8 md:px-4 md:py-6">
      {/* Hero image */}
      <div className="relative md:sticky md:top-6 md:self-start">
        <div className="relative aspect-[4/5] overflow-hidden bg-[#1c1c1c] md:rounded-3xl">
          {p.avatarUrl && <img src={p.avatarUrl} alt={p.displayName} className="h-full w-full object-cover" draggable={false} />}
          <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/10 to-black/40" />
          <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
            <button onClick={back} aria-label="Back" className="grid h-10 w-10 place-items-center rounded-full bg-black/40 backdrop-blur hover:bg-black/60"><ArrowLeft size={18} /></button>
            <div className="flex gap-2">
              {!p.isSelf && <button onClick={() => (status === 'signedIn' ? fav.mutate() : needLogin())} aria-label="Save" className="grid h-10 w-10 place-items-center rounded-full bg-black/40 backdrop-blur hover:bg-black/60"><Heart size={18} className={p.isFavorite ? 'fill-red text-red' : ''} /></button>}
              {!p.isSelf && (
                <div className="relative">
                  <button onClick={() => setMenu((m) => !m)} aria-label="More" className="grid h-10 w-10 place-items-center rounded-full bg-black/40 backdrop-blur hover:bg-black/60"><MoreVertical size={18} /></button>
                  {menu && (
                    <div className="absolute right-0 top-12 z-20 w-44 animate-pop overflow-hidden rounded-xl border border-line bg-surface py-1 text-sm shadow-card">
                      <button className="flex w-full items-center gap-2 px-4 py-2.5 hover:bg-card" onClick={() => { setMenu(false); status === 'signedIn' ? setReport(true) : needLogin() }}><Flag size={14} /> Report</button>
                      <button className="flex w-full items-center gap-2 px-4 py-2.5 text-red hover:bg-card" onClick={() => { setMenu(false); status === 'signedIn' ? setBlock(true) : needLogin() }}><Ban size={14} /> Block</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="absolute inset-x-0 bottom-0 p-5">
            <h1 className="flex items-center gap-2 text-3xl font-extrabold tracking-tight">{p.displayName}{p.age && <span className="font-light text-white/90">{p.age}</span>}{p.verified && <VerifiedBadge size={22} />}{p.isDemo && <DemoChip />}</h1>
            <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/80"><span className="flex items-center gap-1"><MapPin size={14} />{p.area ? `${p.area}, ` : ''}{p.city}</span><OnlineDot online={p.online || p.availabilityStatus === 'AVAILABLE_NOW'} label={p.online ? 'Online' : p.availabilityStatus === 'AVAILABLE_NOW' ? 'Available now' : 'By appointment'} /></p>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="px-4 md:px-0">
        <p className="mt-4 text-sm leading-relaxed text-white/85">{p.biography || 'No biography yet.'}</p>

        {gallery.length > 0 && (
          <div className="mt-5 grid grid-cols-4 gap-2">
            {gallery.slice(0, 3).map((c) => <button key={c.id} onClick={() => setTab('photos')} className="aspect-square overflow-hidden rounded-xl border border-line"><img src={c.url ?? c.thumbnailUrl ?? ''} alt="" className="h-full w-full object-cover" draggable={false} /></button>)}
            {gallery.length > 3 && <button onClick={() => setTab('photos')} className="grid aspect-square place-items-center rounded-xl border border-line bg-card text-sm font-semibold">+{gallery.length - 3}</button>}
          </div>
        )}

        <div className="mt-6 grid grid-cols-2 gap-3">
          {p.isSelf ? (
            <Link to="/provider/profile" className="btn-primary col-span-2"><Pencil size={16} /> Edit my profile</Link>
          ) : (
            <>
              <Button variant="secondary" className="!py-3.5" loading={message.isPending} onClick={onMessage}><MessageCircle size={17} /> Message</Button>
              <Button className="!py-3.5" onClick={onBook}><CalendarPlus size={17} /> Request Booking</Button>
            </>
          )}
        </div>
        {p.isSelf && <p className="mt-3 text-center text-xs text-muted">This is how clients see your profile.</p>}

        <Tabs className="mt-6" value={tab} onChange={setTab} tabs={[{ key: 'about', label: 'About' }, { key: 'photos', label: 'Photos' }, { key: 'videos', label: 'Videos' }]} />
        <div className="pt-5">
          {tab === 'about' && (
            <dl className="card divide-y divide-line text-sm">
              {[['Location', `${p.area ? p.area + ', ' : ''}${p.city}`], ['Availability', p.availabilityStatus === 'AVAILABLE_NOW' ? 'Available now' : p.availabilityStatus === 'BY_APPOINTMENT' ? 'By appointment' : 'Offline'], ['Verification', p.verified ? 'Identity & age verified' : 'Not verified'], ['Member since', new Date(p.memberSince ?? Date.now()).toLocaleDateString('en-NG', { month: 'long', year: 'numeric' })]].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 px-4 py-3"><dt className="text-muted">{k}</dt><dd className="text-right font-medium">{v}</dd></div>
              ))}
            </dl>
          )}
          {tab === 'photos' && (photos.length ? <Grid items={photos} /> : <EmptyState title="No photos yet" text="This provider hasn't published any photos." />)}
          {tab === 'videos' && (
            videos.length ? (
              <div className="space-y-6">
                {pubVideos.length > 0 && <section><h3 className="mb-3 text-base font-bold">Public Videos</h3><Grid items={pubVideos} /></section>}
                {exclVideos.length > 0 && <section><h3 className="mb-3 flex items-center gap-2 text-base font-bold"><Lock size={15} className="text-red" /> Exclusive Videos</h3><Grid items={exclVideos} /></section>}
              </div>
            ) : <EmptyState title="No videos yet" />
          )}
        </div>
      </div>

      {!p.isSelf && <ReportDialog open={report} onClose={() => setReport(false)} reportedUserId={p.id} label={`Report ${p.displayName}`} />}
      {!p.isSelf && <BlockDialog open={block} onClose={() => setBlock(false)} userId={p.id} name={p.displayName} onDone={() => nav('/discover')} />}
    </div>
  )
}
