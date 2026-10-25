import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Check, Copy, Gift, Share2 } from 'lucide-react'
import { api } from '../lib/api'
import { useMe } from '../lib/auth'
import { creditsLabel } from '../lib/format'
import { Button, Modal } from './ui'

export interface ReferralInfo {
  enabled: boolean; code: string | null; rewardCredits: number; rewardKobo: number; maxRewards: number
  referrals: number; creditsEarned: number; canStillEarn: boolean
}
export const referralLink = (code: string) => `${window.location.origin}/?ref=${code}`

export function useReferral() {
  const { me } = useMe()
  return useQuery({ queryKey: ['referral'], queryFn: () => api.get<ReferralInfo>('/referrals/me'), enabled: me?.role === 'CLIENT', staleTime: 60_000 })
}

function ShareBox({ info }: { info: ReferralInfo }) {
  const [copied, setCopied] = useState(false)
  if (!info.code) return null
  const link = referralLink(info.code)
  const text = `Join me on JaraPlug 🔥 Sign up with my link: ${link}`
  const copy = async () => { try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch { /* */ } }
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-xl border border-line bg-surface p-1.5 pl-3">
        <span className="min-w-0 flex-1 truncate text-sm text-white/90" aria-label="Your referral link">{link}</span>
        <button type="button" onClick={copy} className="btn-secondary btn-sm shrink-0">{copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}</button>
      </div>
      <a className="btn-primary w-full" href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer"><Share2 size={16} /> Share on WhatsApp</a>
    </div>
  )
}

const pitch = (i: ReferralInfo) => creditsLabel(i.rewardCredits)

/** Always-visible card (Credits page). Hidden entirely while the admin has paused referrals. */
export function ReferralCard() {
  const { data } = useReferral()
  if (!data?.enabled) return null
  return (
    <div className="card mt-8 p-5">
      <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-red-soft text-red"><Gift size={18} /></span><div><h2 className="font-bold">Invite a friend, earn {pitch(data)}</h2><p className="text-xs text-muted">When a friend joins as a client with your link, the credits land in your wallet.</p></div></div>
      <div className="mt-4">{data.canStillEarn ? <ShareBox info={data} /> : <p className="rounded-xl bg-surface p-3 text-sm text-muted">You’ve already earned your referral reward ({creditsLabel(data.creditsEarned)}). Thank you for spreading the word! 💜</p>}</div>
      {data.referrals > 0 && <p className="mt-3 text-xs text-muted">{data.referrals} friend{data.referrals === 1 ? '' : 's'} joined with your link.</p>}
    </div>
  )
}

const SEEN = 'jp_referral_popup_seen'
/** Shown once per login session to clients, as long as referrals are running and they can still earn. */
export function ReferralPopup() {
  const { data } = useReferral()
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (!data?.enabled || !data.canStillEarn) return
    let seen = false
    try { seen = sessionStorage.getItem(SEEN) === '1' } catch { /* */ }
    if (seen) return
    const t = setTimeout(() => { setOpen(true); try { sessionStorage.setItem(SEEN, '1') } catch { /* */ } }, 900)
    return () => clearTimeout(t)
  }, [data?.enabled, data?.canStillEarn])
  if (!data?.enabled || !data.canStillEarn) return null
  return (
    <Modal open={open} onClose={() => setOpen(false)}>
      <div className="space-y-4 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-red-soft text-red"><Gift size={26} /></span>
        <h2 className="text-xl font-extrabold">Invite a friend, get {creditsLabel(data.rewardCredits)} 🎁</h2>
        <p className="text-sm text-muted">Share your link. When a friend joins JaraPlug as a client, <span className="font-semibold text-white">{creditsLabel(data.rewardCredits)}</span> are added to your wallet automatically.</p>
        <ShareBox info={data} />
        <button className="btn-ghost w-full" onClick={() => setOpen(false)}>Maybe later</button>
      </div>
    </Modal>
  )
}
