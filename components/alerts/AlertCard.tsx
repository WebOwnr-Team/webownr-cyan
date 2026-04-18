'use client'

import { useState } from 'react'
import {
  AlertTriangle, TrendingDown, TrendingUp, Package,
  Clock, FileText, Zap, X, CheckCircle, ChevronDown, ChevronUp,
} from 'lucide-react'
import type { CyanAlert, AlertCategory, AlertSeverity } from '@/types'
import { CyanOrbInline } from '@/components/ui/CyanOrb'

// ─────────────────────────────────────────────
// AlertCard
//
// Renders a single Cyan alert.
// Collapsed by default — shows title + severity.
// Expanded: full summary + recommendation + actions.
// ─────────────────────────────────────────────

interface AlertCardProps {
  alert: CyanAlert
  onDismiss: (alertId: string) => void
  onAcknowledge: (alertId: string) => void
  onResolve: (alertId: string) => void
}

const CATEGORY_ICONS: Record<AlertCategory, React.ReactNode> = {
  revenue_drop:     <TrendingDown size={14} />,
  revenue_spike:    <TrendingUp size={14} />,
  traffic_drop:     <TrendingDown size={14} />,
  high_abandonment: <AlertTriangle size={14} />,
  inventory_low:    <Package size={14} />,
  team_risk:        <AlertTriangle size={14} />,
  goal_off_track:   <AlertTriangle size={14} />,
  payment_failed:   <AlertTriangle size={14} />,
  churn_signal:     <AlertTriangle size={14} />,
  overdue_invoice:  <FileText size={14} />,
  integration_error:<Zap size={14} />,
  operational:      <Clock size={14} />,
}

const SEVERITY_STYLES: Record<AlertSeverity, {
  borderColor: string
  iconColor: string
  badgeBg: string
  badgeColor: string
  label: string
}> = {
  critical: {
    borderColor: 'var(--red)',
    iconColor: 'var(--red)',
    badgeBg: 'var(--red-dim)',
    badgeColor: 'var(--red)',
    label: 'Critical',
  },
  warning: {
    borderColor: 'var(--orange)',
    iconColor: 'var(--orange)',
    badgeBg: 'var(--orange-dim)',
    badgeColor: 'var(--orange)',
    label: 'Warning',
  },
  info: {
    borderColor: 'rgba(0,212,255,0.4)',
    iconColor: 'var(--cyan)',
    badgeBg: 'var(--cyan-subtle)',
    badgeColor: 'var(--cyan)',
    label: 'Info',
  },
}

export function AlertCard({ alert, onDismiss, onAcknowledge, onResolve }: AlertCardProps) {
  const [expanded, setExpanded] = useState(alert.severity === 'critical')
  const [acting, setActing] = useState(false)

  const style = SEVERITY_STYLES[alert.severity]
  const icon = CATEGORY_ICONS[alert.category]

  const handleAction = async (action: () => void) => {
    setActing(true)
    action()
    // Acting state clears as the card unmounts (optimistic removal)
  }

  // Format the detected time
  const detectedDate = alert.detectedAt
    ? new Date((alert.detectedAt as unknown as { seconds: number }).seconds * 1000)
    : null
  const timeAgo = detectedDate
    ? formatTimeAgo(detectedDate)
    : ''

  return (
    <div
      style={{
        background: 'var(--card-bg)',
        border: `1px solid ${style.borderColor}`,
        borderLeft: `3px solid ${style.borderColor}`,
        borderRadius: 12,
        overflow: 'hidden',
        transition: 'border-color 200ms',
        opacity: acting ? 0.5 : 1,
      }}
    >
      {/* Header row — always visible */}
      <div
        onClick={() => setExpanded(e => !e)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 16px',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        {/* Icon */}
        <div style={{ color: style.iconColor, flexShrink: 0 }}>
          {icon}
        </div>

        {/* Title */}
        <p style={{
          flex: 1,
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--text-primary)',
          lineHeight: 1.4,
        }}>
          {alert.title}
        </p>

        {/* Severity badge */}
        <span style={{
          fontSize: 10,
          fontWeight: 700,
          fontFamily: 'var(--font-display)',
          textTransform: 'uppercase',
          letterSpacing: '0.07em',
          padding: '2px 7px',
          borderRadius: 999,
          background: style.badgeBg,
          color: style.badgeColor,
          flexShrink: 0,
        }}>
          {style.label}
        </span>

        {/* Expand toggle */}
        <div style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </div>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div style={{ borderTop: `1px solid ${style.borderColor}22`, padding: '12px 16px' }}>
          {/* Time */}
          {timeAgo && (
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>
              Detected {timeAgo}
            </p>
          )}

          {/* Cyan's summary */}
          <div className="cyan-card" style={{ padding: '10px 12px', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <CyanOrbInline size={14} />
              <span style={{
                fontSize: 10, fontWeight: 700, color: 'var(--cyan)',
                textTransform: 'uppercase', letterSpacing: '0.07em',
                fontFamily: 'var(--font-display)',
              }}>
                Cyan
              </span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 8 }}>
              {alert.summary}
            </p>
            {alert.recommendation && (
              <div style={{
                borderTop: '1px solid var(--border-dim)',
                paddingTop: 8,
                marginTop: 4,
              }}>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>
                  Recommendation
                </p>
                <p style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500, lineHeight: 1.5 }}>
                  {alert.recommendation}
                </p>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => handleAction(() => onResolve(alert.alertId))}
              disabled={acting}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '6px 12px', borderRadius: 7,
                background: 'var(--green-dim)',
                border: '1px solid rgba(0,230,118,0.3)',
                color: 'var(--green)',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                transition: 'opacity 150ms',
              }}
            >
              <CheckCircle size={12} /> Resolved
            </button>

            {alert.status === 'active' && (
              <button
                onClick={() => handleAction(() => onAcknowledge(alert.alertId))}
                disabled={acting}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '6px 12px', borderRadius: 7,
                  background: 'var(--cyan-subtle)',
                  border: '1px solid rgba(0,212,255,0.2)',
                  color: 'var(--cyan)',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  transition: 'opacity 150ms',
                }}
              >
                Acknowledged
              </button>
            )}

            <button
              onClick={() => handleAction(() => onDismiss(alert.alertId))}
              disabled={acting}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '6px 12px', borderRadius: 7,
                background: 'transparent',
                border: '1px solid var(--border)',
                color: 'var(--text-muted)',
                fontSize: 12, fontWeight: 500, cursor: 'pointer',
                marginLeft: 'auto',
                transition: 'opacity 150ms',
              }}
            >
              <X size={12} /> Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function formatTimeAgo(date: Date): string {
  const diff = Date.now() - date.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}
