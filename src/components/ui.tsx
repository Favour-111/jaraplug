import { useEffect, useRef, useState, type ReactNode, type ButtonHTMLAttributes, type ImgHTMLAttributes, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes, forwardRef } from 'react'
import { BadgeCheck, ImageOff, Loader2, X } from 'lucide-react'
import { Link } from 'react-router-dom'

/** Wordmark: “Jara” white + “Plug” red, with the supplied app-icon mark. Never regenerated per render. */
export function Logo({ size = 'md', mark = true, to = '/' }: { size?: 'sm' | 'md' | 'lg' | 'xl'; mark?: boolean; to?: string | null }) {
  const text = { sm: 'text-lg', md: 'text-2xl', lg: 'text-4xl', xl: 'text-6xl' }[size]
  const img = { sm: 'h-7 w-7', md: 'h-9 w-9', lg: 'h-12 w-12', xl: 'h-20 w-20' }[size]
  const inner = (
    <span className="inline-flex items-center gap-2.5">
      {mark && <img src="/logo-mark.png" alt="" className={`${img} rounded-[22%] shadow-glow`} />}
      <span className={`${text} font-extrabold leading-none tracking-tight`}>
        <span className="text-white">Jara</span>
        <span className="text-red">Plug</span>
      </span>
    </span>
  )
  return to ? <Link to={to} aria-label="JaraPlug home">{inner}</Link> : inner
}

export function Spinner({ className = '' }: { className?: string }) {
  return <Loader2 className={`animate-spin ${className}`} size={18} aria-label="Loading" />
}

/** Circular ring that spins until whatever it covers has finished loading. */
export function RingSpinner({ size = 32 }: { size?: number }) {
  return (
    <svg className="animate-spin text-red drop-shadow" width={size} height={size} viewBox="0 0 24 24" fill="none" role="status" aria-label="Loading image">
      <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2.5" />
      <path d="M12 2.5a9.5 9.5 0 0 1 9.5 9.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

/**
 * <img> with a spinning ring over it until it has loaded (or a broken-image icon if it fails).
 * By default the ring is positioned against the nearest `relative` parent, so the img keeps its normal layout.
 * Pass `box` when the image has no sized parent: it wraps the img and `box` is applied only while loading (give it a size).
 */
export function LoadImage({ src, className = '', box, ringSize = 32, alt = '', ...rest }: Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & { src?: string | null; box?: string; ringSize?: number }) {
  const [state, setState] = useState<{ src?: string | null; status: 'ok' | 'error' } | null>(null)
  const ref = useRef<HTMLImageElement>(null)
  const status = state && state.src === src ? state.status : null
  // Cached images can finish before React attaches onLoad.
  useEffect(() => {
    const el = ref.current
    if (el?.complete && el.naturalWidth > 0) setState({ src, status: 'ok' })
  }, [src])
  const loading = !status
  const overlay = loading
    ? <span className="pointer-events-none absolute inset-0 z-[1] grid place-items-center"><RingSpinner size={ringSize} /></span>
    : status === 'error'
      ? <span className="pointer-events-none absolute inset-0 z-[1] grid place-items-center text-muted"><ImageOff size={ringSize * 0.7} aria-label="Image failed to load" /></span>
      : null
  const img = src ? (
    <img ref={ref} src={src} alt={alt} className={className} onLoad={() => setState({ src, status: 'ok' })} onError={() => setState({ src, status: 'error' })} {...rest} />
  ) : null
  if (box === undefined) return <>{img}{overlay}</>
  return <span className={`relative block ${loading ? box : ''}`}>{img}{overlay}</span>
}

export const Skeleton = ({ className = '' }: { className?: string }) => <div className={`skeleton rounded-xl ${className}`} />

const initials = (n: string) => n.split(/\s+/).map((s) => s[0]).join('').slice(0, 2).toUpperCase()

export function Avatar({ src, name, size = 44, online }: { src?: string | null; name: string; size?: number; online?: boolean }) {
  return (
    <span className="relative inline-block shrink-0" style={{ width: size, height: size }}>
      {src ? (
        <LoadImage src={src} className="h-full w-full rounded-full border border-line object-cover" draggable={false} ringSize={Math.max(14, Math.round(size * 0.5))} />
      ) : (
        <span className="grid h-full w-full place-items-center rounded-full border border-line bg-gradient-to-br from-[#3a0a14] to-[#140508] text-xs font-bold text-white/80" style={{ fontSize: size * 0.34 }}>
          {initials(name || '?')}
        </span>
      )}
      {online && <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-bg bg-ok" />}
    </span>
  )
}

export const VerifiedBadge = ({ size = 16 }: { size?: number }) => (
  <BadgeCheck size={size} className="shrink-0 fill-red text-white" aria-label="Verified" />
)

export function OnlineDot({ online, label }: { online: boolean; label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium">
      <span className={`h-1.5 w-1.5 rounded-full ${online ? 'bg-ok' : 'bg-[#52525b]'}`} />
      <span className={online ? 'text-ok' : 'text-muted'}>{label ?? (online ? 'Online' : 'Offline')}</span>
    </span>
  )
}

export function EmptyState({ icon, title, text, action }: { icon?: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-surface/50 px-6 py-14 text-center">
      {icon && <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-red-soft text-red">{icon}</div>}
      <h3 className="text-base font-semibold">{title}</h3>
      {text && <p className="mt-1.5 max-w-sm text-sm text-muted">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <EmptyState title="Something went wrong" text={message} action={onRetry && <button className="btn-secondary btn-sm" onClick={onRetry}>Try again</button>} />
  )
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title?: string; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border border-line bg-surface p-5 animate-slideUp sm:animate-pop sm:rounded-3xl ${wide ? 'sm:max-w-2xl' : 'sm:max-w-md'}`}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="rounded-full p-1.5 text-muted hover:bg-card hover:text-white" aria-label="Close"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function ConfirmDialog({ open, title, text, confirmLabel = 'Confirm', danger, busy, onConfirm, onClose, children }: {
  open: boolean; title: string; text?: string; confirmLabel?: string; danger?: boolean; busy?: boolean
  onConfirm: () => void; onClose: () => void; children?: ReactNode
}) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      {text && <p className="text-sm text-muted">{text}</p>}
      {children}
      <div className="mt-5 flex gap-3">
        <button className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
        <button className={`${danger ? 'btn-danger' : 'btn-primary'} flex-1`} onClick={onConfirm} disabled={busy}>
          {busy && <Spinner />} {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}

export function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-muted">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red" role="alert">{error}</p>}
    </div>
  )
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ className = '', ...p }, ref) => <input ref={ref} className={`input ${className}`} {...p} />)
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className = '', ...p }, ref) => <textarea ref={ref} className={`input min-h-[96px] resize-y ${className}`} {...p} />)
export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(({ className = '', children, ...p }, ref) => <select ref={ref} className={`input appearance-none ${className}`} {...p}>{children}</select>)
Input.displayName = 'Input'; Textarea.displayName = 'Textarea'; Select.displayName = 'Select'

export function Button({ variant = 'primary', loading, children, className = '', ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; loading?: boolean }) {
  return (
    <button className={`btn-${variant} ${className}`} disabled={p.disabled || loading} {...p}>
      {loading && <Spinner />} {children}
    </button>
  )
}

const pill: Record<string, string> = {
  PENDING: 'bg-amber-500/15 text-amber-400', ACCEPTED: 'bg-ok/15 text-ok', COMPLETED: 'bg-sky-500/15 text-sky-400',
  DECLINED: 'bg-red/15 text-red', CANCELLED: 'bg-white/10 text-muted', SUCCESS: 'bg-ok/15 text-ok', FAILED: 'bg-red/15 text-red',
  REFUNDED: 'bg-white/10 text-muted', APPROVED: 'bg-ok/15 text-ok', REJECTED: 'bg-red/15 text-red', UNDER_REVIEW: 'bg-amber-500/15 text-amber-400',
  REMOVED: 'bg-red/15 text-red', DRAFT: 'bg-white/10 text-muted', PUBLISHED: 'bg-ok/15 text-ok', VERIFIED: 'bg-ok/15 text-ok',
  OPEN: 'bg-amber-500/15 text-amber-400', INVESTIGATING: 'bg-sky-500/15 text-sky-400', RESOLVED: 'bg-ok/15 text-ok', DISMISSED: 'bg-white/10 text-muted',
  ACTIVE: 'bg-ok/15 text-ok', SUSPENDED: 'bg-red/15 text-red', DELETED: 'bg-white/10 text-muted', REQUESTED: 'bg-amber-500/15 text-amber-400',
  PAID: 'bg-ok/15 text-ok', IN_PROGRESS: 'bg-sky-500/15 text-sky-400', CLOSED: 'bg-white/10 text-muted', UNSUBMITTED: 'bg-white/10 text-muted',
}
export const StatusPill = ({ status }: { status: string }) => (
  <span className={`inline-block rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${pill[status] ?? 'bg-white/10 text-muted'}`}>{status.replaceAll('_', ' ')}</span>
)

export function Tabs<T extends string>({ tabs, value, onChange, className = '' }: { tabs: { key: T; label: string; badge?: number }[]; value: T; onChange: (k: T) => void; className?: string }) {
  return (
    <div className={`flex gap-1 overflow-x-auto border-b border-line hide-scrollbar ${className}`} role="tablist">
      {tabs.map((t) => (
        <button key={t.key} role="tab" aria-selected={value === t.key} onClick={() => onChange(t.key)}
          className={`relative whitespace-nowrap px-4 py-3 text-sm font-medium transition ${value === t.key ? 'text-red' : 'text-muted hover:text-white'}`}>
          {t.label}{!!t.badge && <span className="ml-1.5 rounded-full bg-red px-1.5 py-0.5 text-[10px] font-bold text-white">{t.badge}</span>}
          {value === t.key && <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-red" />}
        </button>
      ))}
    </div>
  )
}

export function Segmented<T extends string>({ options, value, onChange }: { options: { key: T; label: string }[]; value: T; onChange: (k: T) => void }) {
  return (
    <div className="grid rounded-xl border border-line bg-surface p-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0,1fr))` }}>
      {options.map((o) => (
        <button key={o.key} type="button" onClick={() => onChange(o.key)}
          className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition ${value === o.key ? 'bg-gradient-to-b from-red to-red-dark text-white shadow-glow' : 'text-muted hover:text-white'}`}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Stat({ label, value, hint, accent }: { label: string; value: ReactNode; hint?: string; accent?: boolean }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className={`mt-1.5 text-2xl font-bold tracking-tight ${accent ? 'text-red' : ''}`}>{value}</p>
      {hint && <p className="mt-1 text-[11px] text-muted">{hint}</p>}
    </div>
  )
}

export const DemoChip = () => <span className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white/60">Demo</span>
