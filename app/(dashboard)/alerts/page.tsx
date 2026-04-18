'use client'

import { useState } from 'react'
import { Bell, RefreshCw } from 'lucide-react'
import { useAlerts } from '@/hooks'
import { AlertCard } from '@/components/alerts/AlertCard'
import { CyanOrb } from '@/components/ui/CyanOrb'
import type { AlertStatus } from '@/types'

export default function AlertsPage() {
  const { alerts, loading, error, updateStatus, refetch } = useAlerts()
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = async () => {
    setRefreshing(true)
    refetch()
    await new Promise(r => setTimeout(r, 800))
    setRefreshing(false)
  }

  const handleDismiss    = (id: string) => void updateStatus(id, 'dismissed')
  const handleAcknowledge = (id: string) => void updateStatus(id, 'acknowledged')
  const handleResolve    = (id: string) => void updateStatus(id, 'resolved')

  return (
    <main style={{
      minHeight: '100vh',
      background: 'var(--navy)',
      padding: '48px 24px',
    }}>
      <div
        className="animate-fade-up"
        style={{ maxWidth: 680, margin: '0 auto' }}
      >
        {/* Page header */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: 28,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Bell size={18} style={{ color: 'var(--text-secondary)' }} />
            <div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, marginBottom: 2 }}>
                Alerts
              </h1>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                Cyan monitors your business and flags anomalies here.
              </p>
            </div>
          </div>
          <button
            onClick={() => void handleRefresh()}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 8,
              background: 'var(--card-bg)', border: '1px solid var(--border)',
              color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer',
              transition: 'color 150ms',
            }}
          >
            <RefreshCw
              size={13}
              style={{
                transition: 'transform 600ms',
                transform: refreshing ? 'rotate(360deg)' : 'rotate(0deg)',
              }}
            />
            Scan now
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1, 2, 3].map(i => (
              <div key={i} className="skeleton" style={{ height: 56, borderRadius: 12 }} />
            ))}
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="alert-orange p-4">
            <p style={{ fontSize: 13, color: 'var(--orange)' }}>{error}</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && alerts.length === 0 && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 16,
            padding: '60px 24px',
            textAlign: 'center',
          }}>
            <CyanOrb size={48} pulse={false} />
            <div>
              <p style={{ fontSize: 16, fontWeight: 600, fontFamily: 'var(--font-display)', marginBottom: 6 }}>
                All clear
              </p>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: 300 }}>
                No active alerts. Cyan is monitoring your business and will flag anything that needs attention.
              </p>
            </div>
          </div>
        )}

        {/* Alert list */}
        {!loading && alerts.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Critical first, then warnings, then info */}
            {[
              ...alerts.filter(a => a.severity === 'critical'),
              ...alerts.filter(a => a.severity === 'warning'),
              ...alerts.filter(a => a.severity === 'info'),
            ].map(alert => (
              <AlertCard
                key={alert.alertId}
                alert={alert}
                onDismiss={handleDismiss}
                onAcknowledge={handleAcknowledge}
                onResolve={handleResolve}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
