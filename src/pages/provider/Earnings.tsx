import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Banknote, CheckCircle2, Info, Landmark, Mail, Pencil } from 'lucide-react'
import { api, ApiError, errMsg } from '../../lib/api'
import { useConfig } from '../../lib/auth'
import { useToast } from '../../lib/toast'
import { Button, EmptyState, Field, Input, Modal, PageHeader, Select, Skeleton, Stat, StatusPill } from '../../components/ui'
import { dateOnly, naira, pct } from '../../lib/format'

interface Earnings {
  summary: { grossAmount: number; platformFees: number; processingFees: number; netEarnings: number; salesCount: number; refundedAmount: number; refundCount: number; pendingBalance: number; payableBalance: number; paidOut: number; payoutRequested: number; holdDays: number; commissionBps: number }
  transactions: { id: string; reference: string; title: string | null; amount: number; platformFee: number; processingFee: number; netAmount: number; status: string; createdAt: string }[]
  payouts: { id: string; reference: string; amount: number; status: string; bankName: string | null; accountNumberMasked: string | null; requestedAt: string; paidAt: string | null }[]
}
interface PayoutAccount { banks: string[]; account: { bankName: string; accountName: string; accountNumberMasked: string } | null }
type Step = { kind: 'amount' } | { kind: 'code'; otpId: string; sentTo: string } | { kind: 'done'; reference: string; amount: number }

export function EarningsPage() {
  const { data, isLoading } = useQuery({ queryKey: ['earnings'], queryFn: () => api.get<Earnings>('/provider/earnings') })
  const { data: cfg } = useConfig()
  const qc = useQueryClient()
  const { toast } = useToast()
  const acct = useQuery({ queryKey: ['payout-account'], queryFn: () => api.get<PayoutAccount>('/provider/payout-account') })
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [step, setStep] = useState<Step>({ kind: 'amount' })
  const [code, setCode] = useState('')
  const [editAcct, setEditAcct] = useState(false)
  const [bank, setBank] = useState('')
  const [number, setNumber] = useState('')
  const [holder, setHolder] = useState('')

  const closeWithdraw = () => { setOpen(false); setStep({ kind: 'amount' }); setAmount(''); setCode('') }
  const saveAcct = useMutation({
    mutationFn: () => api.put('/provider/payout-account', { bankName: bank, accountNumber: number, accountName: holder }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['payout-account'] }); setEditAcct(false); toast('Bank account saved', 'success') }, onError: (e) => toast(errMsg(e), 'error'),
  })
  const sendCode = useMutation({
    mutationFn: () => api.post<{ otpId: string; sentTo: string }>('/provider/payouts/request', { amount: Math.round(Number(amount) * 100) }),
    onSuccess: (r) => { setCode(''); setStep({ kind: 'code', otpId: r.otpId, sentTo: r.sentTo }) },
    onError: (e) => { if (e instanceof ApiError && e.code === 'NO_PAYOUT_ACCOUNT') { closeWithdraw(); openAcct() } else toast(errMsg(e), 'error') },
  })
  const confirm = useMutation({
    mutationFn: () => api.post<{ reference: string; amount: number }>('/provider/payouts/confirm', { otpId: (step as { otpId: string }).otpId, code }),
    onSuccess: (r) => { qc.invalidateQueries({ queryKey: ['earnings'] }); setStep({ kind: 'done', reference: r.reference, amount: r.amount }) },
    onError: (e) => toast(errMsg(e), 'error'),
  })
  const openAcct = () => { setBank(acct.data?.account?.bankName ?? ''); setNumber(''); setHolder(acct.data?.account?.accountName ?? ''); setEditAcct(true) }
  const startWithdraw = () => {
    const min = cfg?.minPayoutKobo ?? 0
    if (!acct.data?.account) { toast('Add your bank account first', 'info'); return openAcct() }
    if (data && data.summary.payableBalance < min) return toast(data.summary.payableBalance <= 0 ? 'You have no money available to withdraw yet' : `The minimum withdrawal is ${naira(min)}`, 'info')
    setOpen(true)
  }
  if (isLoading || !data) return <div className="grid grid-cols-2 gap-3 md:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
  const s = data.summary
  return (
    <div>
      <PageHeader title="Earnings" subtitle={`Platform commission ${pct(s.commissionBps)}${s.holdDays > 0 ? ` · funds are held ${s.holdDays} days before they're payable` : ' · you can withdraw your earnings any time'}.`} action={<Button className="btn-sm" onClick={startWithdraw}><Banknote size={14} /> Withdraw</Button>} />
      <div className="card mb-4 flex flex-wrap items-center gap-3 p-4">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-red-soft text-red"><Landmark size={18} /></span>
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-widest text-muted">Payout account</p>
          {acct.data?.account ? <p className="truncate text-sm font-semibold">{acct.data.account.bankName} · {acct.data.account.accountNumberMasked} <span className="font-normal text-muted">· {acct.data.account.accountName}</span></p> : <p className="text-sm text-muted">Add the bank account you want your money sent to.</p>}
        </div>
        <button className="btn-secondary btn-sm" onClick={openAcct}>{acct.data?.account ? <><Pencil size={13} /> Change</> : 'Add account'}</button>
      </div>
      <p className="mb-4 flex gap-2 rounded-xl border border-line bg-card p-3 text-xs text-muted"><Info size={15} className="mt-0.5 shrink-0" />To withdraw, we email you a 6-digit code to confirm. Once confirmed, your money reaches your bank account within 24 hours.</p>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Payable balance" value={naira(s.payableBalance)} accent hint="Available to withdraw" />
        {s.holdDays > 0 && <Stat label="Pending balance" value={naira(s.pendingBalance)} hint={`In ${s.holdDays}-day hold`} />}
        <Stat label="Net earnings" value={naira(s.netEarnings)} hint={`${s.salesCount} sales`} />
        <Stat label="Paid out" value={naira(s.paidOut)} hint={s.payoutRequested ? `${naira(s.payoutRequested)} requested` : undefined} />
        <Stat label="Gross sales" value={naira(s.grossAmount)} />
        <Stat label="Platform commission" value={naira(s.platformFees)} />
        <Stat label="Processing fees" value={naira(s.processingFees)} />
        <Stat label="Refunds" value={naira(s.refundedAmount)} hint={`${s.refundCount} refunded`} />
      </div>

      <h2 className="mb-3 mt-8 text-lg font-bold">Transactions</h2>
      {data.transactions.length ? (
        <div className="card overflow-x-auto"><table className="w-full min-w-[560px] text-sm"><thead className="text-left text-xs text-muted"><tr>{['Date', 'Item', 'Gross', 'Fee', 'Net', 'Status'].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-line">{data.transactions.map((t) => <tr key={t.id}><td className="px-4 py-3 text-muted">{dateOnly(t.createdAt)}</td><td className="px-4 py-3">{t.title ?? '—'}</td><td className="px-4 py-3">{naira(t.amount)}</td><td className="px-4 py-3 text-muted">{t.status === 'SUCCESS' || t.status === 'REFUNDED' ? naira(t.platformFee + t.processingFee) : '—'}</td><td className="px-4 py-3 font-semibold">{t.status === 'SUCCESS' ? naira(t.netAmount) : '—'}</td><td className="px-4 py-3"><StatusPill status={t.status} /></td></tr>)}</tbody></table></div>
      ) : <EmptyState icon={<Banknote />} title="No transactions yet" text="When someone unlocks your content, the verified transaction appears here." />}

      <h2 className="mb-3 mt-8 text-lg font-bold">Payout history</h2>
      {data.payouts.length ? <div className="card divide-y divide-line">{data.payouts.map((p) => <div key={p.id} className="flex items-center justify-between px-4 py-3 text-sm"><div><p className="font-semibold">{naira(p.amount)}</p><p className="text-xs text-muted">{dateOnly(p.requestedAt)} · {p.bankName ? `${p.bankName} ${p.accountNumberMasked}` : p.reference}</p>{p.status === 'REQUESTED' && <p className="mt-0.5 text-xs text-amber-300">Processing — arrives within 24 hours</p>}</div><StatusPill status={p.status} /></div>)}</div> : <p className="text-sm text-muted">No payouts yet.</p>}

      <Modal open={open} onClose={closeWithdraw} title="Withdraw earnings">
        {step.kind === 'amount' && (
          <div className="space-y-4">
            <p className="text-sm text-muted">Payable balance: <span className="font-semibold text-white">{naira(s.payableBalance)}</span>. Minimum {naira(cfg?.minPayoutKobo ?? 0)}.</p>
            <p className="rounded-xl bg-surface p-3 text-xs text-muted">Sending to <span className="text-white">{acct.data?.account?.bankName} {acct.data?.account?.accountNumberMasked}</span> · {acct.data?.account?.accountName}</p>
            <Field label="Amount (₦)"><Input type="number" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" /></Field>
            <Button className="w-full" loading={sendCode.isPending} disabled={!Number(amount)} onClick={() => sendCode.mutate()}>Send me a confirmation code</Button>
          </div>
        )}
        {step.kind === 'code' && (
          <div className="space-y-4">
            <p className="flex items-start gap-2 text-sm text-muted"><Mail size={16} className="mt-0.5 shrink-0 text-red" />We sent a 6-digit code to <span className="font-semibold text-white">{step.sentTo}</span>. It expires in 10 minutes.</p>
            <Field label="Confirmation code"><Input inputMode="numeric" autoFocus maxLength={6} placeholder="••••••" className="text-center text-lg tracking-[0.5em]" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} onKeyDown={(e) => e.key === 'Enter' && code.length === 6 && confirm.mutate()} /></Field>
            <Button className="w-full" loading={confirm.isPending} disabled={code.length !== 6} onClick={() => confirm.mutate()}>Confirm withdrawal of {naira(Math.round(Number(amount) * 100))}</Button>
            <button className="btn-ghost btn-sm w-full" disabled={sendCode.isPending} onClick={() => sendCode.mutate()}>Send a new code</button>
          </div>
        )}
        {step.kind === 'done' && (
          <div className="space-y-3 text-center">
            <CheckCircle2 size={52} className="mx-auto text-ok" />
            <h3 className="text-xl font-extrabold">Withdrawal confirmed</h3>
            <p className="text-sm text-muted">{naira(step.amount)} is on its way. <span className="font-semibold text-white">Your money will reach your account within 24 hours.</span></p>
            <p className="text-xs text-muted">Reference <span className="font-mono">{step.reference}</span></p>
            <Button className="w-full" onClick={closeWithdraw}>Done</Button>
          </div>
        )}
      </Modal>

      <Modal open={editAcct} onClose={() => setEditAcct(false)} title="Payout bank account">
        <div className="space-y-4">
          <Field label="Bank"><Select value={bank} onChange={(e) => setBank(e.target.value)}><option value="">Choose your bank</option>{acct.data?.banks.map((b) => <option key={b}>{b}</option>)}</Select></Field>
          <Field label="Account number" hint="10 digits"><Input inputMode="numeric" maxLength={10} value={number} onChange={(e) => setNumber(e.target.value.replace(/\D/g, ''))} placeholder={acct.data?.account ? `Current: ${acct.data.account.accountNumberMasked}` : '0123456789'} /></Field>
          <Field label="Account name" hint="Exactly as it appears on the account"><Input value={holder} onChange={(e) => setHolder(e.target.value)} maxLength={80} /></Field>
          <p className="text-xs text-muted">Double-check these details. Money is sent exactly where you tell us, and we can't recover transfers to a wrong account.</p>
          <Button className="w-full" loading={saveAcct.isPending} disabled={!bank || number.length !== 10 || holder.trim().length < 3} onClick={() => saveAcct.mutate()}>Save account</Button>
        </div>
      </Modal>
    </div>
  )
}
