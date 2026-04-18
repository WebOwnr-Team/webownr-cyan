'use client'

import { useEffect, useState } from 'react'
import { useApiRequest } from '@/hooks'
import type { MonthlyTokenUsage } from '@/types'
import { formatNGN } from '@/lib/utils'
import { CyanOrbInline } from '@/components/ui/CyanOrb'
import { Badge } from '@/components/ui/Badge'

// ─────────────────────────────────────────────
// TokenGauge — shows monthly token consumption
// Surfaces upgrade prompt when at 80%+
// Used in: dashboard sidebar, settings billing page
// ─────────────────────────────────────────────

export function TokenGauge() {
  const { data, loading, execute } = useApiRequest<{ usage: MonthlyTokenUsage }>()

  useEffect(() => {
    void execute('/api/cyan/tokens')
  }, [execute])

  if (loading) {
    return (
      <div style={{ padding: '12px 0' }}>
        <div className="skeleton" style={{ height: 8, borderRadius: 999, marginBottom: 8 }} />
        <div className="skeleton" style={{ height: 10, width: '60%' }} />
      </div>
    )
  }

  if (!data?.usage) return null

  const { usage } = data
  const pct = Math.min(usage.usagePercent ?? 0, 100)
  const isWarning = pct >= 80
  const isCritical = pct >= 95

  const barColor = isCritical
    ? 'var(--red)'
    : isWarning
      ? 'var(--orange)'
      : 'var(--cyan)'

  return (
    <div style={{ padding: '10px 0' }}>
      {/* Header row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <CyanOrbInline size={14} />
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Cyan tokens
          </span>
        </div>
        <Badge variant={isCritical ? 'red' : isWarning ? 'orange' : 'muted'}>
          {usage.plan}
        </Badge>
      </div>

      {/* Progress bar */}
      <div style={{
        height: 4,
        background: 'var(--border)',
        borderRadius: 999,
        overflow: 'hidden',
        marginBottom: 6,
      }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          background: barColor,
          borderRadius: 999,
          transition: 'width 600ms var(--ease-out)',
        }} />
      </div>

      {/* Stats */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{ fontSize: 11, color: isWarning ? barColor : 'var(--text-muted)' }}>
          {usage.tokensUsed.toLocaleString()} / {usage.tokenBudget === Infinity ? '∞' : usage.tokenBudget.toLocaleString()}
        </span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          {pct}% used
        </span>
      </div>

      {/* Upgrade prompt */}
      {isWarning && usage.plan !== 'enterprise' && (
        <div
          className="alert-orange"
          style={{ padding: '8px 10px', marginTop: 10 }}
        >
          <p style={{ fontSize: 11, color: 'var(--orange)', lineHeight: 1.5 }}>
            {isCritical
              ? 'Token budget nearly exhausted.'
              : `${100 - pct}% remaining this month.`
            }
            {' '}
            <span style={{ fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}>
              Upgrade to Business →
            </span>
          </p>
        </div>
      )}

      {/* Sonnet session usage — only show if on Growth plan */}
      {usage.plan === 'growth' && (
        <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
            Sonnet sessions
          </span>
          <span style={{
            fontSize: 10,
            color: (usage.sonnetSessionsUsed ?? 0) >= (usage.sonnetSessionLimit ?? 10)
              ? 'var(--orange)'
              : 'var(--text-muted)',
          }}>
            {usage.sonnetSessionsUsed ?? 0} / {usage.sonnetSessionLimit ?? 10}
          </span>
        </div>
      )}
    </div>
  )
}
