'use client'

import { useEffect, useCallback, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import type { CyanAlert, AlertStatus } from '@/types'

// ─────────────────────────────────────────────
// useAlerts
//
// Fetches active alerts for the dashboard.
// Provides dismiss/acknowledge/resolve actions.
// Polls every 5 minutes to catch new anomalies.
// ─────────────────────────────────────────────

const POLL_INTERVAL_MS = 5 * 60 * 1000

interface UseAlertsReturn {
  alerts: CyanAlert[]
  loading: boolean
  error: string | null
  criticalCount: number
  updateStatus: (alertId: string, status: AlertStatus) => Promise<void>
  refetch: () => void
}

export function useAlerts(): UseAlertsReturn {
  const { getIdToken } = useAuth()
  const [alerts, setAlerts] = useState<CyanAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAlerts = useCallback(async () => {
    try {
      const token = await getIdToken()
      if (!token) return

      const res = await fetch('/api/cyan/alerts?status=active&limit=20', {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) {
        const data = await res.json() as { error?: string }
        throw new Error(data.error ?? 'Failed to fetch alerts')
      }

      const data = await res.json() as { alerts: CyanAlert[] }
      setAlerts(data.alerts)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load alerts')
    } finally {
      setLoading(false)
    }
  }, [getIdToken])

  // Initial fetch + polling
  useEffect(() => {
    void fetchAlerts()
    const interval = setInterval(() => void fetchAlerts(), POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [fetchAlerts])

  const updateStatus = useCallback(async (alertId: string, status: AlertStatus) => {
    try {
      const token = await getIdToken()
      if (!token) return

      const res = await fetch('/api/cyan/alerts', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ alertId, status }),
      })

      if (!res.ok) {
        const data = await res.json() as { error?: string }
        throw new Error(data.error ?? 'Failed to update alert')
      }

      // Optimistically remove from active list
      setAlerts(prev => prev.filter(a => a.alertId !== alertId))
    } catch (err) {
      console.error('[useAlerts] updateStatus failed:', err)
    }
  }, [getIdToken])

  const criticalCount = alerts.filter(a => a.severity === 'critical').length

  return {
    alerts,
    loading,
    error,
    criticalCount,
    updateStatus,
    refetch: () => void fetchAlerts(),
  }
}
