'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import type { BusinessContext } from '@/types'

// ─────────────────────────────────────────────
// useBusinessContext
//
// Fetches the authenticated business's context document
// via the /api/cyan/context/update (GET) endpoint.
//
// Used by: dashboard pages, settings, Cyan context panel.
// Caches in state — re-fetches on demand via refetch().
// ─────────────────────────────────────────────

interface UseBusinessContextReturn {
  context: BusinessContext | null
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useBusinessContext(): UseBusinessContextReturn {
  const { getIdToken, user } = useAuth()
  const [context, setContext] = useState<BusinessContext | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)

    try {
      const token = await getIdToken()
      if (!token) throw new Error('Not authenticated')

      const res = await window.fetch('/api/cyan/context/update', {
        headers: { Authorization: `Bearer ${token}` },
      })

      const data = await res.json()

      if (!res.ok) {
        // 403 = no business context — user needs onboarding
        if (res.status === 403) {
          setContext(null)
          return
        }
        throw new Error(data.error ?? 'Failed to fetch context')
      }

      setContext(data.context as BusinessContext)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load business data'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [user, getIdToken])

  useEffect(() => {
    void fetch()
  }, [fetch])

  return { context, loading, error, refetch: fetch }
}
