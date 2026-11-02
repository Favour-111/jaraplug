import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthState } from './auth'
import { startChatCachePersistence, syncChatCache } from './chatCache'
import { getActAs } from './api'

/** Renders nothing. Must sit above <App /> so it runs first on every auth change. */
export function ChatCacheSync() {
  const { status, userKey: realKey } = useAuthState()
  // Keep each demo account's cached chats apart from the admin's own.
  const actAs = getActAs()
  const userKey = realKey && actAs ? `${realKey}:as-${actAs.id}` : realKey
  const qc = useQueryClient()
  syncChatCache(qc, status, userKey)
  useEffect(() => (status === 'signedIn' && userKey ? startChatCachePersistence(qc, userKey) : undefined), [qc, status, userKey])
  return null
}
