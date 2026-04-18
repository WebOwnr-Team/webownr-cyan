'use client'

import { useEffect, useState } from 'react'
import { RefreshCw, ArrowRight, AlertTriangle } from 'lucide-react'
import { useApiRequest } from '@/hooks'
import type { DailyBriefing } from '@/types'
import { CyanOrb } from '@/components/ui/CyanOrb'
import { BriefingCardSkeleton } from '@/components/ui/Skeleton'
import { Badge } from '@/components/ui/Badge'

// ─────────────────────────────────────────────
// DailyBriefingCard
//
// The first thing the founder sees every morning.
// Renders Cyan's daily briefing with staggered reveal.
// Never shows "How can I help?" — Cyan leads with findings.
// ─────────────────────────────────────────────

export function DailyBriefingCard() {
  const { data, loading, error, execute } = useApiRequest<{ briefing: DailyBriefing; cached: boolean }>()
  const [revealed, setRevealed] = useState(false)

  const fetch = () => { void execute('/api/cyan/briefing?type=daily') }

  useEffect(() => {
    fetch()
  }, [])

  // Trigger staggered reveal after data loads
  useEffect(() => {
    if (data?.briefing) {
      const t = setTimeout(() => setRevealed(true), 100)
      return () => clearTimeout(t)
    }
    return undefined
  }, [data])

  if (loading) return <BriefingCardSkeleton />

  if (error) {
    return (
      <div className="alert-orange p-4 flex items-start gap-3">
        <AlertTriangle size={16} style={{ color: 'var(--orange)', flexShrink: 0, marginTop: 1 }} />
        <div>
          <p style={{ fontSize: 13, color: 'var(--orange)', fontWeight: 600, marginBottom: 2 }}>
            Briefing unavailable
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{error}</p>
          <button onClick={fetch} style={{
            marginTop: 8, fontSize: 12, color: 'var(--orange)', background: 'none',
            border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0,
          }}>
            Try again
          </button>
        </div>
      </div>
    )
  }

  if (!data?.briefing) return null

  const { briefing } = data

  return (
    <div className="cyan-card" style={{ overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '16px 18px 12px', borderBottom: '1px solid var(--border-dim)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <CyanOrb size={28} pulse />
            <div>
              <p style={{
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--cyan)',
                fontFamily: 'var(--font-display)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}>
                Cyan · Daily Briefing
              </p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {briefing.date}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {briefing.activeAlertCount > 0 && (
              <Badge variant="orange">{briefing.activeAlertCount} alert{briefing.activeAlertCount > 1 ? 's' : ''}</Badge>
            )}
            <button
              onClick={fetch}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text-muted)', padding: 4, borderRadius: 6,
                transition: 'color 150ms',
              }}
              title="Refresh briefing"
            >
              <RefreshCw size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* Metric sections */}
      {briefing.sections.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${Math.min(briefing.sections.length, 3)}, 1fr)`,
          borderBottom: '1px solid var(--border-dim)',
        }}>
          {briefing.sections.map((section, i) => (
            <div
              key={i}
              style={{
                padding: '12px 18px',
                borderRight: i < briefing.sections.length - 1 ? '1px solid var(--border-dim)' : 'none',
                opacity: revealed ? 1 : 0,
                transform: revealed ? 'translateY(0)' : 'translateY(6px)',
                transition: `opacity 400ms ease ${i * 80}ms, transform 400ms ease ${i * 80}ms`,
              }}
            >
              <p style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                {section.label}
              </p>
              <p style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: 3 }}>
                {section.value}
              </p>
              {section.delta && (
                <p style={{
                  fontSize: 11,
                  color: section.deltaDirection === 'up'
                    ? 'var(--green)'
                    : section.deltaDirection === 'down'
                      ? 'var(--red)'
                      : 'var(--text-muted)',
                  fontWeight: 500,
                }}>
                  {section.delta}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Narrative */}
      <div style={{ padding: '14px 18px' }}>
        <p
          style={{
            fontSize: 13,
            color: 'var(--text-secondary)',
            lineHeight: 1.7,
            marginBottom: briefing.topPriority ? 12 : 0,
            opacity: revealed ? 1 : 0,
            transition: 'opacity 400ms ease 200ms',
          }}
        >
          {briefing.narrative}
        </p>

        {/* Top priority */}
        {briefing.topPriority && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 12px',
              background: 'rgba(0,212,255,0.05)',
              borderRadius: 8,
              opacity: revealed ? 1 : 0,
              transform: revealed ? 'translateY(0)' : 'translateY(4px)',
              transition: 'opacity 400ms ease 320ms, transform 400ms ease 320ms',
            }}
          >
            <div>
              <p style={{ fontSize: 10, color: 'var(--cyan)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>
                Today's priority
              </p>
              <p style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>
                {briefing.topPriority}
              </p>
            </div>
            <ArrowRight size={14} style={{ color: 'var(--cyan)', flexShrink: 0, marginLeft: 12 }} />
          </div>
        )}
      </div>
    </div>
  )
}
