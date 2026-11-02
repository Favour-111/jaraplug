import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useInfiniteQuery, useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query'
import { ArrowLeft, Heart, Images, MessageCircle, Volume2, VolumeX } from 'lucide-react'
import { api, ApiError, errMsg } from '../lib/api'
import { useToast } from '../lib/toast'
import type { ContentItem, UserSummary } from '../lib/types'
import { Avatar, Button, EmptyState, Spinner } from '../components/ui'
import { useSeo } from '../lib/seo'

type Post = ContentItem & { provider: UserSummary; likeCount: number; liked: boolean }
type Page = { items: Post[]; nextCursor: string | null }
const KEY = ['gallery']

/** Gallery: swipe through providers' photos and videos one full screen at a time, love them and message the poster. */
export function GalleryPage() {
  useSeo({ title: 'Gallery | JaraPlug', noindex: true })
  const [muted, setMuted] = useState(true) // browsers only autoplay muted video; one tap unmutes the whole feed
  const query = useInfiniteQuery({
    queryKey: KEY,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => api.get<Page>('/gallery', { cursor: pageParam, limit: 8 }),
    getNextPageParam: (l) => l.nextCursor ?? undefined,
  })
  const posts = useMemo(() => query.data?.pages.flatMap((p) => p.items) ?? [], [query.data])

  return (
    <div className="fixed inset-0 z-40 bg-black">
      <header className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center gap-3 bg-gradient-to-b from-black/70 to-transparent px-4 pb-8 pt-[max(env(safe-area-inset-top),12px)]">
        <Link to="/app/discover" aria-label="Back" className="pointer-events-auto grid h-10 w-10 place-items-center rounded-full bg-black/40 text-white backdrop-blur"><ArrowLeft size={20} /></Link>
        <h1 className="text-lg font-bold text-white">Gallery</h1>
      </header>
      {query.isLoading ? <div className="grid h-full place-items-center"><Spinner /></div>
        : query.isError ? <div className="grid h-full place-items-center px-6"><EmptyState title="Couldn't load the gallery" text={errMsg(query.error)} action={<Button variant="secondary" onClick={() => query.refetch()}>Try again</Button>} /></div>
        : !posts.length ? <div className="grid h-full place-items-center px-6"><EmptyState icon={<Images />} title="Nothing here yet" text="Public photos and videos from providers will show up here." /></div>
        : (
          <div className="hide-scrollbar mx-auto h-full max-w-md snap-y snap-mandatory overflow-y-scroll overscroll-contain">
            {posts.map((p, i) => (
              <Slide key={p.id} post={p} muted={muted} onToggleMute={() => setMuted((m) => !m)}
                onNear={i >= posts.length - 3 && query.hasNextPage && !query.isFetchingNextPage ? () => query.fetchNextPage() : undefined} />
            ))}
            {query.isFetchingNextPage && <div className="grid h-24 place-items-center"><Spinner /></div>}
          </div>
        )}
    </div>
  )
}

function Slide({ post: p, muted, onToggleMute, onNear }: { post: Post; muted: boolean; onToggleMute: () => void; onNear?: () => void }) {
  const ref = useRef<HTMLElement>(null)
  const video = useRef<HTMLVideoElement>(null)
  const [active, setActive] = useState(false)
  const [burst, setBurst] = useState(0)
  const nav = useNavigate()
  const qc = useQueryClient()
  const { toast } = useToast()

  // The slide that fills most of the screen plays; the rest pause. Getting close to the end loads more.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setActive(e.intersectionRatio > 0.6), { threshold: [0, 0.6, 1] })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  useEffect(() => { if (active) onNear?.() }, [active, onNear])
  useEffect(() => {
    const v = video.current
    if (!v) return
    if (active) v.play().catch(() => {})
    else { v.pause(); v.currentTime = 0 }
  }, [active])

  const like = useMutation({
    mutationFn: (on: boolean) => (on ? api.put<{ liked: boolean; likeCount: number }>(`/gallery/${p.id}/like`) : api.delete<{ liked: boolean; likeCount: number }>(`/gallery/${p.id}/like`)),
    onMutate: (on) => patch(qc, p.id, { liked: on, likeCount: p.likeCount + (on ? 1 : -1) }),
    onSuccess: (r) => patch(qc, p.id, r),
    onError: (e) => { patch(qc, p.id, { liked: p.liked, likeCount: p.likeCount }); toast(errMsg(e), 'error') },
  })
  const message = useMutation({
    mutationFn: () => api.post<{ id: string }>('/conversations', { username: p.provider.username }),
    onSuccess: (r) => { qc.invalidateQueries({ queryKey: ['conversations'] }); nav(`/app/messages/${r.id}`) },
    onError: (e) => { if (e instanceof ApiError && e.code === 'AGE_VERIFICATION_REQUIRED') nav('/verify'); else toast(errMsg(e), 'error') },
  })
  const love = () => { if (!p.liked) like.mutate(true); setBurst((b) => b + 1) }

  const profile = `/profile/${p.provider.username}`
  return (
    <section ref={ref} className="relative h-[100dvh] w-full snap-start snap-always overflow-hidden bg-black" onDoubleClick={love}>
      {/* The gallery only lists public posts, so a missing URL just means the file couldn't be signed. */}
      {!p.url ? (
        p.thumbnailUrl ? <img src={p.thumbnailUrl} alt="" className="absolute inset-0 h-full w-full object-contain" draggable={false} /> : null
      ) : p.mediaType === 'VIDEO' ? (
        <video ref={video} src={p.url} poster={p.thumbnailUrl ?? undefined} muted={muted} loop playsInline preload="metadata" disablePictureInPicture controlsList="nodownload noremoteplayback"
          onClick={() => { const v = video.current; if (v) (v.paused ? v.play().catch(() => {}) : v.pause()) }} className="absolute inset-0 h-full w-full object-contain" />
      ) : (
        <img src={p.url} alt={p.title} className="absolute inset-0 h-full w-full object-contain" draggable={false} />
      )}

      {burst > 0 && <div className="pointer-events-none absolute inset-0 grid place-items-center"><Heart key={burst} size={110} className="animate-ping fill-red text-red [animation-iteration-count:1]" /></div>}

      {/* Side actions */}
      <div className="absolute bottom-28 right-3 z-10 flex flex-col items-center gap-5 text-white">
        <Link to={profile} aria-label={`View @${p.provider.username}'s profile`} className="rounded-full ring-2 ring-white"><Avatar src={p.provider.avatarUrl} name={p.provider.displayName} size={46} /></Link>
        <button aria-label={p.liked ? 'Remove love' : 'Love'} aria-pressed={p.liked} onClick={() => like.mutate(!p.liked)} className="flex flex-col items-center gap-1">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-black/35 backdrop-blur"><Heart size={26} className={p.liked ? 'fill-red text-red' : ''} /></span>
          <span className="text-xs font-semibold">{p.likeCount}</span>
        </button>
        <button aria-label={`Message @${p.provider.username}`} onClick={() => message.mutate()} disabled={message.isPending} className="flex flex-col items-center gap-1">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-black/35 backdrop-blur">{message.isPending ? <Spinner /> : <MessageCircle size={26} />}</span>
          <span className="text-xs font-semibold">Message</span>
        </button>
        {p.mediaType === 'VIDEO' && p.url && (
          <button aria-label={muted ? 'Unmute' : 'Mute'} onClick={onToggleMute} className="grid h-12 w-12 place-items-center rounded-full bg-black/35 backdrop-blur">{muted ? <VolumeX size={22} /> : <Volume2 size={22} />}</button>
        )}
      </div>

      {/* Caption */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-4 pb-[max(env(safe-area-inset-bottom),20px)] pr-20 pt-16 text-white">
        <Link to={profile} className="font-semibold">@{p.provider.username}</Link>
        <p className="mt-1 text-sm font-medium">{p.title}</p>
        {p.description && <p className="mt-0.5 line-clamp-2 text-sm text-white/80">{p.description}</p>}
      </div>
    </section>
  )
}

/** Updates one post's love state in the cached feed (used for instant feedback). */
function patch(qc: ReturnType<typeof useQueryClient>, id: string, v: { liked: boolean; likeCount: number }) {
  qc.setQueryData<InfiniteData<Page>>(KEY, (d) => d && { ...d, pages: d.pages.map((pg) => ({ ...pg, items: pg.items.map((it) => (it.id === id ? { ...it, ...v } : it)) })) })
}
