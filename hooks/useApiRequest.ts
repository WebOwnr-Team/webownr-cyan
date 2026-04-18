'use client'

import { useCallback, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'

// ─────────────────────────────────────────────
// useApiRequest
//
// Authenticated fetch wrapper for all Cyan API routes.
// Automatically injects the Firebase ID token as Bearer.
// Used throughout the dashboard for any data mutation or fetch.
// ─────────────────────────────────────────────

interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
}

interface UseApiRequestReturn<T> {
  data: T | null
  loading: boolean
  error: string | null
  execute: (path: string, options?: ApiRequestOptions) => Promise<T | null>
  reset: () => void
}

export function useApiRequest<T = unknown>(): UseApiRequestReturn<T> {
  const { getIdToken } = useAuth()
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const execute = useCallback(
    async (path: string, options: ApiRequestOptions = {}): Promise<T | null> => {
      setLoading(true)
      setError(null)

      try {
        const token = await getIdToken()
        if (!token) throw new Error('Not authenticated')

        const res = await fetch(path, {
          method: options.method ?? 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: options.body ? JSON.stringify(options.body) : undefined,
        })

        const json = await res.json()

        if (!res.ok) {
          throw new Error(json.error ?? `Request failed: ${res.status}`)
        }

        setData(json as T)
        return json as T
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Request failed'
        setError(msg)
        return null
      } finally {
        setLoading(false)
      }
    },
    [getIdToken]
  )

  const reset = useCallback(() => {
    setData(null)
    setError(null)
    setLoading(false)
  }, [])

  return { data, loading, error, execute, reset }
}
