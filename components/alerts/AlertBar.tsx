'use client'

import Link from 'next/link'
import { AlertTriangle, X } from 'lucide-react'
import { useAlerts } from '@/hooks'
import { useState } from 'react'

// ─────────────────────────────────────────────
// AlertBar
//
// A compact bar shown at the top of the dashboard
// when there are active alerts. Designed to be
// dismissible per session — not permanently.
// Critical alerts use orange, others use cyan tint.
// ─────────────────────────────────────────────

export function AlertBar() {
  const { alerts, loading, criticalCount } = useAlerts()
  const [dismissed, setDismissed] = useState(false)

  if (loading || dismissed || alerts.length === 0) return null

  const hasCritical = criticalCount > 0
  const label = alerts.length === 1
    ? alerts[0]!.title
    : `${alerts.length} alerts need your attention`

  return (
    <div
      className={hasCritical ? 'pulse-border' : ''}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 16px',
        background: hasCritical ? 'var(--orange-dim)' : 'var(--cyan-subtle)',
        border: `1px solid ${hasCritical ? 'rgba(255,107,53,0.35)' : 'rgba(0,212,255,0.2)'}`,
        borderRadius: 10,
        marginBottom: 16,
      }}
    >
      <AlertTriangle
        size={14}
        style={{ color: hasCritical ? 'var(--orange)' : 'var(--cyan)', flexShrink: 0 }}
      />

      <p style={{
        flex: 1,
        fontSize: 13,
        color: hasCritical ? 'var(--orange)' : 'var(--text-primary)',
        fontWeight: 500,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {label}
      </p>

      <Link
        href="/alerts"
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: hasCritical ? 'var(--orange)' : 'var(--cyan)',
          textDecoration: 'none',
          flexShrink: 0,
          fontFamily: 'var(--font-display)',
        }}
      >
        View {alerts.length > 1 ? `all ${alerts.length}` : ''} →
      </Link>

      <button
        onClick={() => setDismissed(true)}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--text-muted)', padding: 2, flexShrink: 0,
        }}
        aria-label="Dismiss alert bar"
      >
        <X size={13} />
      </button>
    </div>
  )
}
