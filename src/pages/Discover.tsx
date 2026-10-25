import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useInfiniteQuery } from '@tanstack/react-query'
import { Compass, Search, SlidersHorizontal, X } from 'lucide-react'
import { api } from '../lib/api'
import { useAuthState, useConfig } from '../lib/auth'
import type { ProviderCardData } from '../lib/types'
import { ProfileCard, ProfileCardSkeleton } from '../components/ProfileCard'
import { Button, EmptyState, ErrorState, Modal, Select, Field } from '../components/ui'

interface Filters { city: string; availability: string; newOnly: boolean; online: boolean }
const none: Filters = { city: '', availability: '', newOnly: false, online: false }

export function DiscoverView({ publicMode }: { publicMode?: boolean }) {
  const [q, setQ] = useState('')
  const [dq, setDq] = useState('')
  const [f, setF] = useState<Filters>(none)
  const [sheet, setSheet] = useState(false)
  const { data: cfg } = useConfig()
  const { status } = useAuthState()
  const nav = useNavigate()

  useEffect(() => { const t = setTimeout(() => setDq(q.trim()), 300); return () => clearTimeout(t) }, [q])

  const query = useInfiniteQuery({
    queryKey: ['providers', dq, f, status],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      api.get<{ items: ProviderCardData[]; nextCursor: string | null }>('/providers', {
        q: dq, city: f.city, availability: f.availability, newOnly: f.newOnly || undefined, online: f.online || undefined, cursor: pageParam, limit: 24,
      }),
    getNextPageParam: (l) => l.nextCursor ?? undefined,
  })
  const items = useMemo(() => query.data?.pages.flatMap((p) => p.items) ?? [], [query.data])
  const activeCount = [f.city, f.availability, f.newOnly, f.online].filter(Boolean).length
  const set = (patch: Partial<Filters>) => setF((x) => ({ ...x, ...patch }))
  const login = () => nav('/login')

  const chips: { label: string; active: boolean; on: () => void }[] = [
    { label: 'All', active: activeCount === 0, on: () => setF(none) },
    { label: 'Lagos', active: f.city === 'Lagos', on: () => set({ city: f.city === 'Lagos' ? '' : 'Lagos' }) },
    { label: 'New', active: f.newOnly, on: () => set({ newOnly: !f.newOnly }) },
    { label: 'Available Now', active: f.availability === 'AVAILABLE_NOW', on: () => set({ availability: f.availability === 'AVAILABLE_NOW' ? '' : 'AVAILABLE_NOW' }) },
    { label: 'Online', active: f.online, on: () => set({ online: !f.online }) },
  ]

  return (
    <div>
      {publicMode && (
        <div className="mb-6"><h1 className="text-3xl font-extrabold tracking-tight">Discover</h1>
          <div className="mt-3 flex w-full flex-col gap-3 rounded-2xl border border-line bg-card p-4 text-sm sm:flex-row sm:items-center">
            <p className="text-muted sm:min-w-0 sm:flex-1">You’re browsing as a guest. Create a free JaraPlug account to message, book, unlock exclusive content and see more profiles.</p>
            <div className="flex shrink-0 gap-2">
              <Link to="/register" className="btn-primary btn-sm flex-1 sm:flex-none">Create account</Link>
              <Link to="/login" className="btn-secondary btn-sm flex-1 sm:flex-none">Log in</Link>
            </div>
          </div></div>
      )}
      <div className="relative">
        <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, location, or keyword…" aria-label="Search profiles" className="input !rounded-2xl !py-3.5 pl-11 pr-10" />
        {q && <button aria-label="Clear search" onClick={() => setQ('')} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted hover:text-white"><X size={16} /></button>}
      </div>

      <div className="-mx-4 mt-4 flex items-center gap-2 overflow-x-auto px-4 hide-scrollbar">
        {chips.map((c) => <button key={c.label} onClick={c.on} className={`chip ${c.active ? 'chip-active' : 'hover:border-red/50'}`}>{c.label}</button>)}
        <button onClick={() => setSheet(true)} aria-label="More filters" className={`chip relative !px-3 ${activeCount > 0 && !chips.slice(1).some((c) => c.active) ? 'chip-active' : ''}`}><SlidersHorizontal size={15} />{(f.city && f.city !== 'Lagos') && <span className="h-1.5 w-1.5 rounded-full bg-red" />}</button>
      </div>

      <div className="mt-5">
        {query.isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <ProfileCardSkeleton key={i} />)}</div>
        ) : query.isError ? (
          <ErrorState message={(query.error as Error).message} onRetry={() => query.refetch()} />
        ) : items.length === 0 ? (
          <EmptyState icon={<Compass />} title="No profiles match" text={dq || activeCount ? 'Try a different search or clear your filters.' : 'No verified profiles are listed yet. Check back soon.'} action={(dq || activeCount > 0) && <Button variant="secondary" onClick={() => { setQ(''); setF(none) }}>Clear search & filters</Button>} />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">{items.map((p) => <ProfileCard key={p.id} p={p} onRequireLogin={login} />)}</div>
            {query.hasNextPage && <div className="mt-6 text-center"><Button variant="secondary" loading={query.isFetchingNextPage} onClick={() => query.fetchNextPage()}>Load more</Button></div>}
          </>
        )}
      </div>

      <Modal open={sheet} onClose={() => setSheet(false)} title="Filters">
        <div className="space-y-4">
          <Field label="City"><Select value={f.city} onChange={(e) => set({ city: e.target.value })}><option value="">Any city</option>{cfg?.cities.map((c) => <option key={c}>{c}</option>)}</Select></Field>
          <Field label="Availability"><Select value={f.availability} onChange={(e) => set({ availability: e.target.value })}><option value="">Any</option><option value="AVAILABLE_NOW">Available now</option><option value="BY_APPOINTMENT">By appointment</option></Select></Field>
          <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={f.newOnly} onChange={(e) => set({ newOnly: e.target.checked })} className="h-4 w-4 accent-[#FF1744]" /> New profiles (last 30 days)</label>
          <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={f.online} onChange={(e) => set({ online: e.target.checked })} className="h-4 w-4 accent-[#FF1744]" /> Online right now</label>
          <div className="flex gap-3 pt-2"><Button variant="secondary" className="flex-1" onClick={() => setF(none)}>Reset</Button><Button className="flex-1" onClick={() => setSheet(false)}>Show results</Button></div>
        </div>
      </Modal>
    </div>
  )
}

export const PublicDiscover = () => <div className="mx-auto max-w-6xl px-4 py-8"><DiscoverView publicMode /></div>
export const ClientDiscover = () => <DiscoverView />
