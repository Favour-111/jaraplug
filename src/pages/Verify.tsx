import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { BadgeCheck, ShieldCheck } from 'lucide-react'
import { api, errMsg } from '../lib/api'
import { useMe } from '../lib/auth'
import { Logo, Spinner } from '../components/ui'
import { useToast } from '../lib/toast'

/** Age check by self-declaration: ticking the box verifies the account straight away. */
export function VerifyPage() {
  const { me } = useMe()
  const qc = useQueryClient()
  const nav = useNavigate()
  const { toast } = useToast()
  const home = me?.role === 'PROVIDER' ? '/provider/dashboard' : me?.role === 'ADMIN' ? '/admin' : '/app/discover'
  const confirm = useMutation({
    mutationFn: () => api.post('/verification/age/confirm', { confirmed: true }),
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: ['me'] }); toast('Age confirmed', 'success') },
    onError: (e) => toast(errMsg(e), 'error'),
  })
  const verified = me?.ageVerificationStatus === 'VERIFIED' || confirm.isSuccess

  return (
    <div className="glow-top min-h-screen px-4 py-8">
      <div className="mx-auto max-w-lg">
        <Logo size="md" />
        <div className="card mt-8 p-6">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-red-soft text-red">{verified ? <BadgeCheck size={28} /> : <ShieldCheck size={28} />}</span>
          <h1 className="mt-5 text-2xl font-extrabold tracking-tight">{verified ? 'You’re verified' : 'Confirm you’re an adult'}</h1>
          <p className="mt-2 text-sm text-muted">{verified ? 'Messaging, bookings, purchases and members-only media are unlocked.' : 'JaraPlug is for adults only. Confirm your age to message, book and buy.'}</p>
          {!verified && (
            <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-surface p-4 text-sm">
              <input type="checkbox" className="mt-0.5 h-5 w-5 accent-[#FF1744]" checked={confirm.isPending} disabled={confirm.isPending} onChange={(e) => e.target.checked && confirm.mutate()} />
              <span className="flex-1">I confirm that I am 18 years of age or older.</span>
              {confirm.isPending && <Spinner />}
            </label>
          )}
          <button className="btn-primary mt-6 w-full" onClick={() => nav(home)} disabled={!verified}>Continue</button>
          {!verified && <button className="btn-ghost mt-2 w-full" onClick={() => nav(home)}>Skip for now</button>}
        </div>
      </div>
    </div>
  )
}
