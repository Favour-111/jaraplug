import { Heart, MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useAuthState } from '../lib/auth'
import { useToast } from '../lib/toast'
import type { ProviderCardData } from '../lib/types'
import { DemoChip, LoadImage, VerifiedBadge } from './ui'

export function ProfileCard({ p, onRequireLogin }: { p: ProviderCardData; onRequireLogin?: () => void }) {
  const { status } = useAuthState()
  const qc = useQueryClient()
  const { toast } = useToast()
  const fav = useMutation({
    mutationFn: () => (p.isFavorite ? api.delete(`/favorites/${p.id}`) : api.put(`/favorites/${p.id}`)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['providers'] })
      qc.invalidateQueries({ queryKey: ['favorites'] })
      toast(p.isFavorite ? 'Removed from saved' : 'Saved to your list', 'success')
    },
  })

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-line bg-card shadow-card transition duration-300 hover:-translate-y-0.5 hover:border-red/50">
      <Link to={`/profile/${p.username}`} className="block" aria-label={`Open ${p.displayName}'s profile`}>
        <div className="relative aspect-[3/4] overflow-hidden bg-[#1c1c1c]">
          {p.avatarUrl && <LoadImage src={p.avatarUrl} alt={p.displayName} loading="lazy" draggable={false} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
          {p.isDemo && <span className="absolute left-2 top-2"><DemoChip /></span>}
          <div className="absolute inset-x-0 bottom-0 p-3 pr-12">
            <p className="flex items-center gap-1.5 text-[15px] font-bold leading-tight">
              <span className="truncate">{p.displayName}</span>
              {p.age && <span className="font-medium text-white/80">{p.age}</span>}
              {p.verified && <VerifiedBadge size={14} />}
            </p>
            <p className="mt-1 flex items-center gap-1 text-[11px] text-white/70"><MapPin size={11} />{p.area ?? p.city}</p>
            <p className="mt-1 flex items-center gap-1.5 text-[11px] font-medium">
              <span className={`h-1.5 w-1.5 rounded-full ${p.online || p.availabilityStatus === 'AVAILABLE_NOW' ? 'bg-ok' : 'bg-[#52525b]'}`} />
              <span className={p.online || p.availabilityStatus === 'AVAILABLE_NOW' ? 'text-ok' : 'text-white/50'}>
                {p.online ? 'Online' : p.availabilityStatus === 'AVAILABLE_NOW' ? 'Available' : 'By appointment'}
              </span>
            </p>
          </div>
        </div>
      </Link>
      <button
        aria-label={p.isFavorite ? 'Remove from saved' : 'Save profile'}
        onClick={() => (status === 'signedIn' ? fav.mutate() : onRequireLogin?.())}
        className="absolute bottom-3 right-3 grid h-8 w-8 place-items-center rounded-full bg-black/40 backdrop-blur transition hover:bg-black/70"
      >
        <Heart size={16} className={p.isFavorite ? 'fill-red text-red' : 'text-white'} />
      </button>
    </div>
  )
}

export function ProfileCardSkeleton() {
  return <div className="skeleton aspect-[3/4] rounded-2xl" />
}
