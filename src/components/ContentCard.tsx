import { Coins, Lock, Play, Image as ImageIcon, Clock, ShieldAlert } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { ContentItem } from '../lib/types'
import { creditsLabel, duration, koboToCredits } from '../lib/format'
import { useCreditUnit } from '../lib/auth'
import { LoadImage, StatusPill } from './ui'

/** Locked thumbnails are blurred ON THE SERVER; the real file is never sent until entitlement is verified. */
export function ContentCard({ c, onOpen, owner }: { c: ContentItem; onOpen?: (c: ContentItem) => void; owner?: boolean }) {
  const nav = useNavigate()
  const unit = useCreditUnit()
  const paid = c.visibility === 'PAID'
  const click = () => {
    if (c.locked) nav(paid ? `/unlock/${c.id}` : `/unlock/${c.id}`)
    else onOpen ? onOpen(c) : nav(`/watch/${c.id}`)
  }
  return (
    <div className="card overflow-hidden">
      <button onClick={click} className="group relative block aspect-[3/4] w-full overflow-hidden bg-[#1c1c1c] text-left" aria-label={c.locked ? `Unlock ${c.title}` : `Open ${c.title}`}>
        {c.thumbnailUrl && <LoadImage src={c.thumbnailUrl} loading="lazy" draggable={false} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-black/10" />
        {c.locked ? (
          <div className="absolute inset-0 grid place-items-center"><span className="grid h-12 w-12 place-items-center rounded-full bg-black/55 text-amber-400 backdrop-blur"><Lock size={20} /></span></div>
        ) : c.mediaType === 'VIDEO' ? (
          <div className="absolute inset-0 grid place-items-center"><span className="grid h-12 w-12 place-items-center rounded-full bg-black/55 backdrop-blur"><Play size={20} className="ml-0.5 fill-white" /></span></div>
        ) : null}
        <div className="absolute left-2 top-2 flex gap-1.5">
          {c.mediaType === 'VIDEO' ? <span className="rounded-md bg-black/60 px-1.5 py-1 text-[10px] font-semibold backdrop-blur">{duration(c.durationSeconds) || 'Video'}</span> : <span className="rounded-md bg-black/60 p-1 backdrop-blur"><ImageIcon size={11} /></span>}
        </div>
      </button>
      <div className="space-y-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate text-sm font-semibold">{c.title}</p>
          {paid && <p className="flex shrink-0 items-center gap-1 text-sm font-bold text-white"><Coins size={13} className="text-amber-400" />{creditsLabel(koboToCredits(c.price, unit))}</p>}
        </div>
        {c.locked ? (
          <button className="btn-primary btn-sm w-full" onClick={click}><Lock size={13} /> {paid ? 'Unlock' : 'Members only'}</button>
        ) : (
          <p className="text-[11px] text-muted">{c.visibility === 'PUBLIC' ? 'Public' : c.visibility === 'FREE_MEMBERS' ? 'Free for members' : 'Unlocked'}</p>
        )}
        {owner && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <StatusPill status={c.status} />
            {c.moderationStatus && c.moderationStatus !== 'APPROVED' && <StatusPill status={c.moderationStatus} />}
          </div>
        )}
        {owner && c.moderationStatus === 'PENDING' && c.status === 'PUBLISHED' && <p className="flex items-center gap-1 text-[11px] text-amber-400"><Clock size={11} /> Awaiting moderator review</p>}
        {owner && c.moderationNote && c.moderationStatus !== 'APPROVED' && <p className="flex items-start gap-1 text-[11px] text-red"><ShieldAlert size={11} className="mt-0.5 shrink-0" /> {c.moderationNote}</p>}
      </div>
    </div>
  )
}
