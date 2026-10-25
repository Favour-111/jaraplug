import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Ban, Camera, Check, CheckCheck, Flag, ImagePlus, MessageCircle, Mic, MoreVertical, Pause, Play, Send, Trash2, X } from 'lucide-react'
import { api, ApiError, errMsg, upload } from '../lib/api'
import { useMe } from '../lib/auth'
import { useRealtime } from '../lib/realtime'
import { useToast } from '../lib/toast'
import type { Conversation, Message, UserSummary } from '../lib/types'
import { Avatar, EmptyState, Modal, OnlineDot, Skeleton, Spinner } from '../components/ui'
import { BlockDialog, ReportDialog } from '../components/Dialogs'
import { chatTime, timeOnly } from '../lib/format'

export function MessagesPage({ base }: { base: string }) {
  const { conversationId } = useParams()
  const { data, isLoading } = useQuery({ queryKey: ['conversations'], queryFn: () => api.get<{ items: Conversation[] }>('/conversations'), refetchInterval: 30_000, refetchOnMount: 'always' })
  const items = data?.items ?? []

  return (
    <div className="md:grid md:h-[calc(100vh-8.5rem)] md:grid-cols-[340px_1fr] md:overflow-hidden md:rounded-2xl md:border md:border-line md:bg-surface/40">
      <div className={`${conversationId ? 'hidden md:block' : ''} md:overflow-y-auto md:border-r md:border-line`}>
        <div className="flex items-center justify-between pb-3 md:p-4"><h1 className="text-2xl font-bold tracking-tight">Messages</h1></div>
        {isLoading ? (
          <div className="space-y-2 md:px-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
        ) : items.length === 0 ? (
          <div className="md:p-4"><EmptyState icon={<MessageCircle />} title="No conversations yet" text={base.includes('provider') ? 'When a client messages you, the conversation shows up here.' : 'Open a profile and tap Message to start chatting.'} action={!base.includes('provider') && <Link to="/app/discover" className="btn-primary btn-sm">Discover profiles</Link>} /></div>
        ) : (
          <ul className="md:pb-2">
            {items.map((c) => (
              <li key={c.id}>
                <Link to={`${base}/${c.id}`} className={`flex items-center gap-3 rounded-2xl px-2 py-3 transition hover:bg-card md:mx-2 md:px-3 ${c.id === conversationId ? 'bg-card' : ''}`}>
                  <Avatar src={c.other.avatarUrl} name={c.other.displayName} size={50} online={c.other.online} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2"><span className="truncate text-[15px] font-semibold">{c.other.displayName}</span><span className="shrink-0 text-[11px] text-muted">{c.lastMessage ? chatTime(c.lastMessage.createdAt) : ''}</span></span>
                    <span className="mt-0.5 flex items-center justify-between gap-2"><span className={`truncate text-sm ${c.unread ? 'font-medium text-white' : 'text-muted'}`}>{c.lastMessage ? `${c.lastMessage.fromMe ? 'You: ' : ''}${c.lastMessage.body}` : 'Say hello 👋'}</span>{c.unread > 0 && <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-red px-1.5 text-[11px] font-bold">{c.unread}</span>}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className={`${conversationId ? '' : 'hidden md:grid'} min-h-0 md:place-items-center`}>
        {conversationId ? <Thread key={conversationId} id={conversationId} base={base} /> : <div className="text-center text-muted"><MessageCircle className="mx-auto mb-3 text-red" size={36} /><p>Select a conversation</p></div>}
      </div>
    </div>
  )
}

const MAX_VOICE_SECONDS = 300
const MAX_CHAT_IMAGE_BYTES = 5 * 1024 * 1024
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

function VoicePlayer({ src, seconds }: { src: string; seconds: number | null }) {
  const ref = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [pos, setPos] = useState(0)
  const [dur, setDur] = useState(seconds ?? 0)
  const toggle = () => { const a = ref.current; if (!a) return; if (a.paused) void a.play().catch(() => {}); else a.pause() }
  return (
    <div className="flex w-56 max-w-full items-center gap-3 py-0.5">
      <audio
        ref={ref} src={src} preload="metadata"
        onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); setPos(0) }}
        onTimeUpdate={(e) => setPos(e.currentTarget.currentTime)}
        // Browser-recorded WebM often reports Infinity; keep the duration we recorded in that case.
        onLoadedMetadata={(e) => { const d = e.currentTarget.duration; if (Number.isFinite(d) && d > 0) setDur(d) }}
      />
      <button type="button" onClick={toggle} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/20 hover:bg-white/30" aria-label={playing ? 'Pause voice message' : 'Play voice message'}>
        {playing ? <Pause size={16} className="fill-white" /> : <Play size={16} className="ml-0.5 fill-white" />}
      </button>
      <div className="min-w-0 flex-1">
        <div className="h-1.5 overflow-hidden rounded-full bg-white/25"><div className="h-full rounded-full bg-white" style={{ width: `${dur ? Math.min(100, (pos / dur) * 100) : 0}%` }} /></div>
        <p className="mt-1 text-[11px] tabular-nums text-white/80">{mmss(playing || pos > 0 ? pos : dur)}</p>
      </div>
    </div>
  )
}

/** Downscales a photo (and converts e.g. HEIC to JPEG) so phone-camera shots stay well under the 5MB chat limit. */
async function shrinkPhoto(file: File, maxSide = 1600): Promise<File> {
  try {
    const bmp = await createImageBitmap(file)
    const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bmp.width * scale); canvas.height = Math.round(bmp.height * scale)
    canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height)
    bmp.close()
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.85))
    return blob ? new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' }) : file
  } catch { return file }
}

/** In-browser camera for computers (phones use the native camera app instead). */
function CameraModal({ open, onClose, onCapture }: { open: boolean; onClose: () => void; onCapture: (f: File) => void }) {
  const video = useRef<HTMLVideoElement>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    if (!open) return
    let stream: MediaStream | undefined
    let stopped = false
    setReady(false); setError('')
    navigator.mediaDevices?.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 } }, audio: false })
      .then((s) => { if (stopped) return s.getTracks().forEach((t) => t.stop()); stream = s; if (video.current) { video.current.srcObject = s; void video.current.play().then(() => setReady(true)).catch(() => {}) } })
      .catch(() => setError('We couldn’t open your camera. Allow camera access in your browser, or choose a photo instead.'))
    if (!navigator.mediaDevices?.getUserMedia) setError('Your browser can’t open the camera. Choose a photo instead.')
    return () => { stopped = true; stream?.getTracks().forEach((t) => t.stop()) }
  }, [open])
  const snap = () => {
    const v = video.current
    if (!v || !v.videoWidth) return
    const canvas = document.createElement('canvas')
    canvas.width = v.videoWidth; canvas.height = v.videoHeight
    canvas.getContext('2d')!.drawImage(v, 0, 0)
    canvas.toBlob((b) => { if (b) { onCapture(new File([b], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' })); onClose() } }, 'image/jpeg', 0.9)
  }
  return (
    <Modal open={open} onClose={onClose} title="Take a photo" wide>
      {error ? <p className="py-8 text-center text-sm text-muted">{error}</p> : (
        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-xl bg-black"><video ref={video} playsInline muted className="max-h-[60vh] w-full -scale-x-100 object-contain" />{!ready && <div className="absolute inset-0 grid place-items-center"><Spinner /></div>}</div>
          <div className="flex gap-3"><button className="btn-secondary flex-1" onClick={onClose}>Cancel</button><button className="btn-primary flex-1" disabled={!ready} onClick={snap}><Camera size={16} /> Snap</button></div>
        </div>
      )}
    </Modal>
  )
}

function Ticks({ m }: { m: Message }) {
  if (m.readAt) return <CheckCheck size={14} className="text-white" aria-label="Read" />
  if (m.deliveredAt) return <CheckCheck size={14} className="text-white/60" aria-label="Delivered" />
  return <Check size={14} className="text-white/60" aria-label="Sent" />
}

function Thread({ id, base }: { id: string; base: string }) {
  const { me } = useMe()
  const { socket, typing } = useRealtime()
  const qc = useQueryClient()
  const nav = useNavigate()
  const { toast } = useToast()
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [menu, setMenu] = useState(false)
  const [report, setReport] = useState(false)
  const [block, setBlock] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [pendingImage, setPendingImage] = useState<{ file: File; url: string } | null>(null)
  const [recording, setRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const rec = useRef<{ mr: MediaRecorder; startedAt: number; cancelled: boolean } | null>(null)
  const tick = useRef<ReturnType<typeof setInterval>>(undefined)
  const bottom = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const camRef = useRef<HTMLInputElement>(null)
  const [attachMenu, setAttachMenu] = useState(false)
  const [cameraOpen, setCameraOpen] = useState(false)
  const lastTyping = useRef(0)

  const q = useInfiniteQuery({
    queryKey: ['messages', id],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => api.get<{ other: UserSummary; messages: Message[]; nextCursor: string | null }>(`/conversations/${id}/messages`, { cursor: pageParam, limit: 30 }),
    getNextPageParam: (l) => l.nextCursor ?? undefined,
    retry: (n, e) => !(e instanceof ApiError && e.status === 404) && n < 2,
  })
  const messages = useMemo(() => [...(q.data?.pages ?? [])].reverse().flatMap((p) => p.messages), [q.data])
  const other = q.data?.pages[0]?.other
  const conv = (qc.getQueryData(['conversations']) as { items: Conversation[] } | undefined)?.items.find((c) => c.id === id)

  // mark as read whenever new incoming messages are present
  const unreadIncoming = messages.some((m) => m.senderId !== me?.id && !m.readAt)
  useEffect(() => {
    if (!unreadIncoming) return
    const done = () => { qc.invalidateQueries({ queryKey: ['conversations'] }); qc.invalidateQueries({ queryKey: ['me'] }) }
    if (socket?.connected) socket.emit('conversation:read', { conversationId: id }, done)
    else api.post(`/conversations/${id}/read`).then(done).catch(() => {})
  }, [unreadIncoming, id, socket, qc, messages.length])

  const newest = messages[messages.length - 1]?.id
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }) }, [newest, typing[id]])

  /** Puts this conversation at the top of the left-hand list right away, before the server round-trip finishes. */
  const bumpConversation = (body: string) => qc.setQueryData<{ items: Conversation[] }>(['conversations'], (old) => {
    const items = old?.items ?? []
    const now = new Date().toISOString()
    const base = items.find((c) => c.id === id) ?? (other ? { id, other, blocked: false, unread: 0, lastMessage: null, lastMessageAt: now } : null)
    if (!base) return old
    return { items: [{ ...base, lastMessage: { body, createdAt: now, fromMe: true }, lastMessageAt: now }, ...items.filter((c) => c.id !== id)] }
  })

  const afterSent = () => { qc.invalidateQueries({ queryKey: ['messages', id] }); qc.invalidateQueries({ queryKey: ['conversations'] }) }
  const failed = (e: unknown) => { toast(errMsg(e), 'error'); qc.invalidateQueries({ queryKey: ['conversations'] }) }

  const clearPendingImage = () => setPendingImage((p) => { if (p) URL.revokeObjectURL(p.url); return null })
  const pickImage = (f: File) => {
    if (!/^image\/(jpeg|png|webp)$/.test(f.type)) return toast('Choose a JPG, PNG or WebP image', 'error')
    if (f.size > MAX_CHAT_IMAGE_BYTES) return toast('Chat images must be under 5MB', 'error')
    clearPendingImage()
    setPendingImage({ file: f, url: URL.createObjectURL(f) })
  }
  useEffect(() => () => { if (pendingImage) URL.revokeObjectURL(pendingImage.url) }, [pendingImage])
  // Phones open the native camera app; computers use the in-browser camera.
  const takePhoto = () => { setAttachMenu(false); if (window.matchMedia('(pointer: coarse)').matches) camRef.current?.click(); else setCameraOpen(true) }

  const send = async () => {
    const body = text.trim()
    if ((!body && !pendingImage) || sending) return
    setSending(true)
    try {
      if (pendingImage) {
        // The picked photo only goes out now, with whatever is typed as its caption.
        bumpConversation('📷 Photo')
        const fd = new FormData(); fd.append('file', pendingImage.file); if (body) fd.append('caption', body)
        await upload(`/conversations/${id}/attachments`, fd)
        clearPendingImage()
      } else {
        bumpConversation(body)
        if (socket?.connected) {
          await new Promise<void>((resolve, reject) => {
            socket.timeout(8000).emit('message:send', { conversationId: id, body }, (err: Error | null, ack: { ok: boolean; error?: string }) => (err ? reject(new Error('Message timed out')) : ack?.ok ? resolve() : reject(new Error(ack?.error ?? 'Could not send'))))
          })
        } else await api.post(`/conversations/${id}/messages`, { body })
      }
      setText('')
      afterSent()
    } catch (e) { failed(e) } finally { setSending(false) }
  }

  // ── Voice notes: record in the browser (MediaRecorder), upload on send ──
  const sendVoice = async (blob: Blob, seconds: number) => {
    setSending(true)
    bumpConversation('🎤 Voice message')
    try {
      const ext = blob.type.includes('mp4') ? 'm4a' : blob.type.includes('ogg') ? 'ogg' : 'webm'
      const fd = new FormData(); fd.append('file', blob, `voice.${ext}`); fd.append('duration', String(seconds))
      await upload(`/conversations/${id}/voice`, fd)
      afterSent()
    } catch (e) { failed(e) } finally { setSending(false) }
  }

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') return toast('Voice notes are not supported in this browser', 'error')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mime = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus', 'audio/webm'].find((t) => MediaRecorder.isTypeSupported(t))
      const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
      const chunks: Blob[] = []
      const state = { mr, startedAt: Date.now(), cancelled: false }
      mr.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data) }
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        clearInterval(tick.current)
        setRecording(false)
        rec.current = null
        const ms = Date.now() - state.startedAt
        if (state.cancelled) return
        if (ms < 800) return toast('Hold on a little longer to record', 'info')
        void sendVoice(new Blob(chunks, { type: mr.mimeType || mime || 'audio/webm' }), Math.round(ms / 1000))
      }
      mr.start()
      rec.current = state
      setElapsed(0)
      setRecording(true)
      tick.current = setInterval(() => {
        const s = Math.floor((Date.now() - state.startedAt) / 1000)
        setElapsed(s)
        if (s >= MAX_VOICE_SECONDS && mr.state !== 'inactive') mr.stop()
      }, 250)
    } catch {
      toast('Allow microphone access to send a voice note', 'error')
    }
  }
  const finishRecording = () => { if (rec.current && rec.current.mr.state !== 'inactive') rec.current.mr.stop() }
  const cancelRecording = () => { if (rec.current) { rec.current.cancelled = true; if (rec.current.mr.state !== 'inactive') rec.current.mr.stop() } }
  useEffect(() => () => { if (rec.current) { rec.current.cancelled = true; if (rec.current.mr.state !== 'inactive') rec.current.mr.stop() } clearInterval(tick.current) }, [])

  const onType = (v: string) => {
    setText(v)
    if (socket?.connected && Date.now() - lastTyping.current > 2500) { lastTyping.current = Date.now(); socket.emit('typing', { conversationId: id, isTyping: true }) }
  }

  if (q.isError) return <div className="grid h-full place-items-center p-6"><EmptyState title="Conversation not found" action={<Link to={base} className="btn-secondary btn-sm">Back to messages</Link>} /></div>

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-bg md:static md:z-auto md:h-full md:w-full md:bg-transparent">
      <div className="flex items-center gap-3 border-b border-line px-3 py-3 md:px-4">
        <button onClick={() => nav(base)} className="grid h-9 w-9 place-items-center rounded-full hover:bg-card md:hidden" aria-label="Back"><ArrowLeft size={20} /></button>
        {other ? (
          <Link to={other.role === 'PROVIDER' && other.username ? `/profile/${other.username}` : '#'} className="flex min-w-0 flex-1 items-center gap-3">
            <Avatar src={other.avatarUrl} name={other.displayName} size={42} online={other.online} />
            <span className="min-w-0"><span className="block truncate font-semibold">{other.displayName}</span><OnlineDot online={other.online} /></span>
          </Link>
        ) : <Skeleton className="h-10 flex-1" />}
        <div className="relative">
          <button onClick={() => setMenu((m) => !m)} className="grid h-9 w-9 place-items-center rounded-full hover:bg-card" aria-label="Conversation options"><MoreVertical size={18} /></button>
          {menu && other && (
            <div className="absolute right-0 top-11 z-20 w-44 animate-pop overflow-hidden rounded-xl border border-line bg-surface py-1 text-sm shadow-card">
              <button className="flex w-full items-center gap-2 px-4 py-2.5 hover:bg-card" onClick={() => { setMenu(false); setReport(true) }}><Flag size={14} /> Report</button>
              <button className="flex w-full items-center gap-2 px-4 py-2.5 text-red hover:bg-card" onClick={() => { setMenu(false); setBlock(true) }}><Ban size={14} /> Block</button>
            </div>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-4 md:px-5">
        {q.hasNextPage && <div className="text-center"><button className="btn-ghost btn-sm" onClick={() => q.fetchNextPage()} disabled={q.isFetchingNextPage}>{q.isFetchingNextPage ? <Spinner /> : 'Load earlier messages'}</button></div>}
        {q.isLoading && <div className="space-y-3"><Skeleton className="h-10 w-2/3" /><Skeleton className="ml-auto h-10 w-1/2" /><Skeleton className="h-10 w-3/5" /></div>}
        {!q.isLoading && messages.length === 0 && <p className="py-10 text-center text-sm text-muted">No messages yet. Say hello 👋</p>}
        {messages.map((m, i) => {
          const mine = m.senderId === me?.id
          const prev = messages[i - 1]
          const showDay = !prev || new Date(prev.createdAt).toDateString() !== new Date(m.createdAt).toDateString()
          return (
            <div key={m.id}>
              {showDay && <p className="my-3 text-center text-[11px] text-muted">{new Date(m.createdAt).toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'short' })}</p>}
              <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-[15px] leading-snug ${mine ? 'rounded-br-md bg-gradient-to-b from-red to-red-dark' : 'rounded-bl-md bg-[#232323]'}`}>
                  {m.messageType === 'IMAGE' && m.attachmentUrl && <button onClick={() => setPreview(m.attachmentUrl)} className="mb-1 block overflow-hidden rounded-xl"><img src={m.attachmentUrl} alt="Shared" className="max-h-60 w-full object-cover" draggable={false} /></button>}
                  {m.messageType === 'AUDIO' && m.attachmentUrl && <VoicePlayer src={m.attachmentUrl} seconds={m.durationSeconds} />}
                  {m.body && <p className="whitespace-pre-wrap break-words">{m.body}</p>}
                  <p className={`mt-1 flex items-center gap-1 text-[10px] ${mine ? 'justify-end text-white/70' : 'text-muted'}`}>{timeOnly(m.createdAt)}{mine && <Ticks m={m} />}</p>
                </div>
              </div>
            </div>
          )
        })}
        {typing[id] && <p className="text-xs text-muted">typing…</p>}
        <div ref={bottom} />
      </div>

      {conv?.blocked ? (
        <p className="border-t border-line px-4 py-4 text-center text-sm text-muted">You've blocked this user. Unblock them in Settings to chat again.</p>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); send() }} className="pb-safe border-t border-line bg-bg px-3 py-3 md:px-4">
          {recording ? (
            <div className="flex items-center gap-3">
              <button type="button" onClick={cancelRecording} className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line bg-card text-muted hover:text-red" aria-label="Discard recording"><Trash2 size={19} /></button>
              <div className="flex min-w-0 flex-1 items-center gap-3 rounded-full border border-line bg-card px-4 py-3">
                <span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-red" />
                <span className="text-sm tabular-nums">{mmss(elapsed)}</span>
                <span className="truncate text-sm text-muted">Recording… tap send when done</span>
              </div>
              <button type="button" onClick={finishRecording} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-b from-red to-red-dark shadow-glow transition active:scale-95" aria-label="Send voice note"><Send size={18} /></button>
            </div>
          ) : (
            <>
              {pendingImage && (
                <div className="mb-3 flex items-center gap-3 rounded-xl border border-line bg-card p-2">
                  <img src={pendingImage.url} alt="Selected" className="h-16 w-16 rounded-lg object-cover" />
                  <p className="min-w-0 flex-1 truncate text-sm text-muted">{pendingImage.file.name}<span className="block text-xs">Add a caption if you like, then press send</span></p>
                  <button type="button" onClick={clearPendingImage} className="grid h-8 w-8 place-items-center rounded-full hover:bg-surface" aria-label="Remove photo"><X size={16} /></button>
                </div>
              )}
              <div className="flex items-end gap-2">
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) pickImage(f.size > 4 * 1024 * 1024 ? await shrinkPhoto(f) : f) }} />
                <input ref={camRef} type="file" accept="image/*" capture="environment" hidden onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) pickImage(await shrinkPhoto(f)) }} />
                <div className="relative shrink-0">
                  <button type="button" onClick={() => setAttachMenu((m) => !m)} disabled={sending} className="grid h-10 w-10 place-items-center rounded-full border border-line bg-card text-muted hover:text-white" aria-label="Attach a photo" aria-expanded={attachMenu}><ImagePlus size={19} /></button>
                  {attachMenu && (
                    <>
                      <div className="fixed inset-0 z-30" onClick={() => setAttachMenu(false)} />
                      <div className="absolute bottom-12 left-0 z-40 w-48 animate-pop overflow-hidden rounded-xl border border-line bg-surface py-1 text-sm shadow-card">
                        <button type="button" className="flex w-full items-center gap-2.5 px-4 py-2.5 hover:bg-card" onClick={takePhoto}><Camera size={16} className="text-red" /> Take a photo</button>
                        <button type="button" className="flex w-full items-center gap-2.5 px-4 py-2.5 hover:bg-card" onClick={() => { setAttachMenu(false); fileRef.current?.click() }}><ImagePlus size={16} className="text-red" /> Choose from gallery</button>
                      </div>
                    </>
                  )}
                </div>
                <input value={text} onChange={(e) => onType(e.target.value)} maxLength={2000} placeholder={pendingImage ? 'Add a caption…' : 'Type a message…'} aria-label="Message" className="input !rounded-full !py-3" />
                {text.trim() || pendingImage ? (
                  <button type="submit" disabled={sending} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-b from-red to-red-dark shadow-glow transition active:scale-95 disabled:opacity-40" aria-label="Send">{sending ? <Spinner /> : <Send size={18} />}</button>
                ) : (
                  <button type="button" onClick={startRecording} disabled={sending} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-b from-red to-red-dark shadow-glow transition active:scale-95 disabled:opacity-40" aria-label="Record voice note">{sending ? <Spinner /> : <Mic size={19} />}</button>
                )}
              </div>
            </>
          )}
        </form>
      )}

      <CameraModal open={cameraOpen} onClose={() => setCameraOpen(false)} onCapture={(f) => pickImage(f)} />
      <Modal open={!!preview} onClose={() => setPreview(null)} wide>{preview && <img src={preview} alt="" className="max-h-[70vh] w-full rounded-xl object-contain" />}</Modal>
      {other && <ReportDialog open={report} onClose={() => setReport(false)} reportedUserId={other.id} label={`Report ${other.displayName}`} />}
      {other && <BlockDialog open={block} onClose={() => setBlock(false)} userId={other.id} name={other.displayName} onDone={() => { qc.invalidateQueries({ queryKey: ['conversations'] }); nav(base) }} />}
    </div>
  )
}
