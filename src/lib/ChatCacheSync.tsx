import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthState } from './auth'
import { startChatCachePersistence, syncChatCache } from './chatCache'

/** Renders nothing. Must sit above <App /> so it runs first on every auth change. */
export function ChatCacheSync() {
  const { status, userKey } = useAuthState()
  const qc = useQueryClient()
  syncChatCache(qc, status, userKey)
  useEffect(() => (status === 'signedIn' && userKey ? startChatCachePersistence(qc, userKey) : undefined), [qc, status, userKey])
  return null
}
