import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { api, errMsg } from '../lib/api'
import { useToast } from '../lib/toast'
import { Button, ConfirmDialog, Modal, Select, Textarea, Field } from './ui'

export const REPORT_CATEGORIES: [string, string][] = [
  ['NON_CONSENSUAL_IMAGERY', 'Non-consensual or private imagery'],
  ['UNDERAGE', 'Appears to involve a minor'],
  ['EXPLOITATION', 'Exploitation, coercion or trafficking'],
  ['IMPERSONATION', 'Impersonation / stolen photos'],
  ['HARASSMENT', 'Harassment or abuse'],
  ['SPAM_OR_SCAM', 'Spam or scam'],
  ['OTHER', 'Something else'],
]

export function ReportDialog({ open, onClose, reportedUserId, reportedContentId, label }: { open: boolean; onClose: () => void; reportedUserId?: string; reportedContentId?: string; label?: string }) {
  const [category, setCategory] = useState('HARASSMENT')
  const [description, setDescription] = useState('')
  const { toast } = useToast()
  const m = useMutation({
    mutationFn: () => api.post('/reports', { reportedUserId, reportedContentId, category, description }),
    onSuccess: () => { toast('Report sent. Thank you for keeping JaraPlug safe.', 'success'); setDescription(''); onClose() },
    onError: (e) => toast(errMsg(e), 'error'),
  })
  const serious = ['NON_CONSENSUAL_IMAGERY', 'UNDERAGE', 'EXPLOITATION'].includes(category)
  return (
    <Modal open={open} onClose={onClose} title={label ?? 'Report'}>
      <div className="space-y-4">
        <Field label="What's wrong?"><Select value={category} onChange={(e) => setCategory(e.target.value)}>{REPORT_CATEGORIES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></Field>
        {serious && <p className="rounded-xl bg-red-soft p-3 text-xs text-red">Priority report: if content is involved it will be hidden immediately while our team reviews it.</p>}
        <Field label="Details (optional)"><Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} placeholder="Tell us what happened" /></Field>
        <Button className="w-full" loading={m.isPending} onClick={() => m.mutate()}>Submit report</Button>
      </div>
    </Modal>
  )
}

export function BlockDialog({ open, onClose, userId, name, onDone }: { open: boolean; onClose: () => void; userId: string; name: string; onDone?: () => void }) {
  const { toast } = useToast()
  const m = useMutation({
    mutationFn: () => api.post('/blocks', { userId }),
    onSuccess: () => { toast(`${name} blocked`, 'success'); onClose(); onDone?.() },
    onError: (e) => toast(errMsg(e), 'error'),
  })
  return <ConfirmDialog open={open} onClose={onClose} danger title={`Block ${name}?`} text="You won't see each other, and you can't message or book each other. Pending requests are cancelled. You can unblock from Settings." confirmLabel="Block" busy={m.isPending} onConfirm={() => m.mutate()} />
}
