import type { QueryClient } from '@tanstack/react-query'
import type { Conversation, Message, UserSummary } from './types'

/**
 * Keeps the conversation list and the latest page of each thread in localStorage so chats open instantly,
 * then the normal queries refresh them in the background.
 *
 * Privacy rules:
 *  - one entry per account (keyed by the auth provider's user id), never shared between accounts
 *  - everything is wiped on sign-out, and when a different account signs in on this browser
 *  - signed media URLs are never stored, only message text/metadata
 */

const PREFIX = 'jp_chat:'
const VERSION = 1
const MAX_THREADS = 20
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000

type ThreadPage = { other: UserSummary; messages: Message[]; nextCursor: string | null }
type ConversationList = { items: Conversation[] }
interface Snapshot { v: number; savedAt: number; conversations: ConversationList | null; threads: Record<string, ThreadPage> }

/** Account the in-memory query cache currently belongs to (undefined = auth hasn't resolved yet). */
let activeKey: string | null | undefined

function ls(): Storage | null {
  try { return window.localStorage } catch { return null }
}

export function clearChatCache(keep?: string) {
  const s = ls()
  if (!s) return
  try {
    for (const k of Object.keys(s)) if (k.startsWith(PREFIX) && k !== PREFIX + keep) s.removeItem(k)
  } catch { /* storage unavailable */ }
}

function read(key: string): Snapshot | null {
  try {
    const raw = ls()?.getItem(PREFIX + key)
    if (!raw) return null
    const snap = JSON.parse(raw) as Snapshot
    if (snap.v !== VERSION || Date.now() - snap.savedAt > MAX_AGE_MS) return null
    return snap
  } catch { return null }
}

const withoutMedia = (p: ThreadPage): ThreadPage => ({ ...p, messages: p.messages.map((m) => ({ ...m, attachmentUrl: null })) })

function write(qc: QueryClient, key: string) {
  if (activeKey !== key) return
  const conversations = qc.getQueryData<ConversationList>(['conversations']) ?? null
  const rank = new Map((conversations?.items ?? []).map((c, i) => [c.id, i]))
  const threads: Record<string, ThreadPage> = {}
  const found = qc.getQueryCache().findAll({ queryKey: ['messages'] })
    .filter((q) => q.state.status === 'success' && (!rank.size || rank.has(q.queryKey[1] as string)))
    .sort((a, b) => (rank.get(a.queryKey[1] as string) ?? 0) - (rank.get(b.queryKey[1] as string) ?? 0))
    .slice(0, MAX_THREADS)
  for (const q of found) {
    const first = (q.state.data as { pages?: ThreadPage[] } | undefined)?.pages?.[0] // newest page only
    if (first) threads[q.queryKey[1] as string] = withoutMedia(first)
  }
  try {
    const snap: Snapshot = { v: VERSION, savedAt: Date.now(), conversations, threads }
    ls()?.setItem(PREFIX + key, JSON.stringify(snap))
  } catch { /* quota exceeded or storage blocked: the cache is optional */ }
}

function hydrate(qc: QueryClient, key: string) {
  const snap = read(key)
  if (!snap) return
  // updatedAt = when it was saved, so react-query treats it as stale and refetches straight away.
  if (snap.conversations && qc.getQueryData(['conversations']) === undefined) qc.setQueryData(['conversations'], snap.conversations, { updatedAt: snap.savedAt })
  for (const [id, page] of Object.entries(snap.threads)) {
    if (qc.getQueryData(['messages', id]) === undefined) qc.setQueryData(['messages', id], { pages: [page], pageParams: [undefined] }, { updatedAt: snap.savedAt })
  }
}

/**
 * Call on every render of a component above the app. Idempotent: it only acts when the signed-in account changes.
 * Runs during render on purpose so the previous account's data is gone, and this account's cache is in, before any page reads it.
 */
export function syncChatCache(qc: QueryClient, status: 'loading' | 'signedOut' | 'signedIn', userKey: string | null) {
  if (status === 'loading') return
  const key = status === 'signedIn' ? userKey : null
  if (key === activeKey) return
  const prev = activeKey
  activeKey = key
  if (key === null) {
    clearChatCache()
    if (prev) qc.clear()
    return
  }
  if (prev) qc.clear() // switched straight from another account
  clearChatCache(key) // drop any other account's leftovers
  hydrate(qc, key)
}

/** Writes the cache (debounced) whenever the conversation list or a thread is refreshed. Returns a cleanup function. */
export function startChatCachePersistence(qc: QueryClient, key: string) {
  let timer: ReturnType<typeof setTimeout> | undefined
  const flush = () => { if (timer) clearTimeout(timer); timer = undefined; write(qc, key) }
  const unsub = qc.getQueryCache().subscribe((e) => {
    const root = e.query.queryKey[0]
    if (e.type === 'updated' && e.action.type === 'success' && (root === 'conversations' || root === 'messages') && !timer) timer = setTimeout(flush, 800)
  })
  const onHide = () => { if (document.visibilityState === 'hidden') flush() }
  document.addEventListener('visibilitychange', onHide)
  window.addEventListener('pagehide', flush)
  return () => {
    unsub()
    if (timer) clearTimeout(timer)
    document.removeEventListener('visibilitychange', onHide)
    window.removeEventListener('pagehide', flush)
  }
}
