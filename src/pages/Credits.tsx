import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { ArrowDownLeft, ArrowUpRight, Coins, Info, RotateCcw } from 'lucide-react'
import { api, ApiError, errMsg } from '../lib/api'
import { useMe } from '../lib/auth'
import { useToast } from '../lib/toast'
import { Button, EmptyState, PageHeader, Skeleton } from '../components/ui'
import { ReferralCard } from '../components/Referral'
import { creditsLabel, dateTime, naira } from '../lib/format'

interface Wallet {
  balance: number; creditPriceKobo: number; packages: number[]; minTopup: number; maxTopup: number
  entries: { id: string; type: 'TOPUP' | 'PURCHASE' | 'REFUND' | 'REFERRAL'; delta: number; balanceAfter: number; title: string | null; createdAt: string }[]
}
export const RETURN_KEY = 'jp_after_topup'

export function CreditsPage() {
  const nav = useNavigate()
  const { toast } = useToast()
  const { me } = useMe()
  const [params] = useSearchParams()
  const need = Number(params.get('need')) || 0
  const returnTo = params.get('returnTo')
  const { data, isLoading } = useQuery({ queryKey: ['credits'], queryFn: () => api.get<Wallet>('/credits') })
  const [custom, setCustom] = useState('')
  const [selected, setSelected] = useState<number | null>(null)

  const unit = data?.creditPriceKobo ?? 10_000
  const customN = Number(custom)
  const qty = custom ? customN : selected ?? (need || 0)
  const valid = Number.isInteger(qty) && qty >= (data?.minTopup ?? 1) && qty <= (data?.maxTopup ?? 2000)

  const buy = useMutation({
    mutationFn: () => api.post<{ checkoutUrl: string }>('/credits/topup', { credits: qty }),
    onSuccess: (r) => {
      // Only same-site relative paths are accepted as the place to return to after paying.
      try { if (returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//')) sessionStorage.setItem(RETURN_KEY, returnTo); else sessionStorage.removeItem(RETURN_KEY) } catch { /* */ }
      const u = new URL(r.checkoutUrl)
      if (u.origin === window.location.origin) nav(u.pathname); else window.location.href = r.checkoutUrl
    },
    onError: (e) => { if (e instanceof ApiError && e.code === 'AGE_VERIFICATION_REQUIRED') nav('/verify'); else toast(errMsg(e), 'error') },
  })

  const balance = data?.balance ?? me?.creditBalance ?? 0
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Credits" subtitle={`Buy credits once, then unlock content in a tap. 1 credit = ${naira(unit)}.`} />

      <div className="card relative overflow-hidden p-6">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-red/15 blur-3xl" />
        <p className="text-xs uppercase tracking-widest text-muted">Your balance</p>
        <p className="mt-2 flex items-center gap-3 text-5xl font-extrabold tracking-tight"><Coins className="text-amber-400" size={36} />{balance.toLocaleString('en-NG')}</p>
        <p className="mt-1 text-sm text-muted">{creditsLabel(balance)} · worth {naira(balance * unit)}</p>
      </div>

      {need > 0 && <p className="mt-4 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">You need {creditsLabel(need)} more to unlock this. We've picked that amount for you.</p>}

      <h2 className="mb-3 mt-8 text-lg font-bold">Buy credits</h2>
      {isLoading ? <Skeleton className="h-32" /> : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {data?.packages.map((n) => (
              <button key={n} type="button" onClick={() => { setSelected(n); setCustom('') }} className={`card p-4 text-left transition hover:border-red/60 ${!custom && (selected ?? (need || null)) === n ? 'border-red ring-1 ring-red' : ''}`}>
                <span className="flex items-center gap-1.5 text-xl font-extrabold"><Coins size={18} className="text-amber-400" />{n}</span>
                <span className="mt-1 block text-sm text-muted">{naira(n * unit)}</span>
              </button>
            ))}
          </div>
          <label className="mt-4 block">
            <span className="label">Or enter an amount of credits</span>
            <input className="input" type="number" inputMode="numeric" min={data?.minTopup} max={data?.maxTopup} step={1} placeholder={`1 – ${data?.maxTopup ?? 200}`} value={custom} onChange={(e) => { setCustom(e.target.value); setSelected(null) }} />
          </label>
          {custom && !valid && <p className="mt-2 text-xs text-red">Enter a whole number between {data?.minTopup} and {data?.maxTopup}.</p>}
          <Button className="mt-5 w-full py-3" disabled={!valid} loading={buy.isPending} onClick={() => buy.mutate()}>
            {valid ? `Pay ${naira(qty * unit)} for ${creditsLabel(qty)}` : 'Choose how many credits'}
          </Button>
          <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-muted"><Info size={14} className="mt-0.5 shrink-0" />Credits are added once your payment is confirmed, usually within seconds. They can only be spent on JaraPlug content and cannot be withdrawn or converted back to cash.</p>
        </>
      )}

      <ReferralCard />

      <h2 className="mb-3 mt-10 text-lg font-bold">Activity</h2>
      {isLoading ? <Skeleton className="h-24" /> : data?.entries.length ? (
        <div className="card divide-y divide-line">
          {data.entries.map((e) => (
            <div key={e.id} className="flex items-center gap-3 px-4 py-3.5">
              <span className={`grid h-10 w-10 place-items-center rounded-xl ${e.delta > 0 ? 'bg-ok/15 text-ok' : 'bg-red-soft text-red'}`}>{e.type === 'REFUND' ? <RotateCcw size={17} /> : e.delta > 0 ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}</span>
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{e.type === 'TOPUP' ? 'Credits added' : e.type === 'REFERRAL' ? 'Referral reward 🎁' : e.type === 'REFUND' ? `Refund${e.title ? ` · ${e.title}` : ''}` : e.title ?? 'Unlocked content'}</p><p className="text-xs text-muted">{dateTime(e.createdAt)}</p></div>
              <div className="text-right"><p className={`text-sm font-bold ${e.delta > 0 ? 'text-ok' : ''}`}>{e.delta > 0 ? '+' : ''}{e.delta}</p><p className="text-[11px] text-muted">Balance {e.balanceAfter}</p></div>
            </div>
          ))}
        </div>
      ) : <EmptyState icon={<Coins />} title="No activity yet" text="Buy your first credits above." />}
    </div>
  )
}
