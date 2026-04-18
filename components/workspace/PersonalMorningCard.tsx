'use client'

import { useEffect } from 'react'
import { ArrowRight, AlertCircle } from 'lucide-react'
import { useApiRequest } from '@/hooks'
import type { PersonalBriefing } from '@/types'
import { CyanOrb } from '@/components/ui/CyanOrb'
import { BriefingCardSkeleton } from '@/components/ui/Skeleton'

// ─────────────────────────────────────────────
// PersonalMorningCard
//
// Cyan's personalised morning briefing for team members.
// Shows 3 specific prioritised tasks — never generic.
// "Morning! Here are your tasks" is explicitly forbidden.
// Every task references real work context.
// ─────────────────────────────────────────────

export function PersonalMorningCard() {
  const { data, loading, error, execute } = useApiRequest<{ briefing: PersonalBriefing; cached: boolean }>()

  useEffect(() => {
    void execute('/api/cyan/briefing?type=personal')
  }, [execute])

  if (loading) return <BriefingCardSkeleton />

  if (error) {
    return (
      <div className="alert-orange p-4 flex items-start gap-3">
        <AlertCircle size={15} style={{ color: 'var(--orange)', flexShrink: 0, marginTop: 1 }} />
        <p style={{ fontSize: 13, color: 'var(--orange)' }}>
          Briefing unavailable — {error}
        </p>
      </div>
    )
  }

  if (!data?.briefing) return null

  const { briefing } = data

  return (
    <div className="cyan-card" style={{ overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        padding: '14px 18px 12px',
        borderBottom: '1px solid var(--border-dim)',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <CyanOrb size={26} pulse />
        <div>
          <p style={{
            fontSize: 10, fontWeight: 700, color: 'var(--cyan)',
            fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.08em',
          }}>
            Cyan · {briefing.memberName}
          </p>
          <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {briefing.date} · {briefing.isScheduledWorkDay ? `Work starts ${briefing.scheduledStart}` : 'Non-work day'}
          </p>
        </div>
      </div>

      {/* Priority tasks */}
      <div style={{ padding: '12px 0' }}>
        <p style={{
          fontSize: 10, fontWeight: 600, color: 'var(--text-muted)',
          textTransform: 'uppercase', letterSpacing: '0.07em',
          padding: '0 18px', marginBottom: 8,
        }}>
          Today's priorities
        </p>

        {briefing.priorityTasks.map((task, i) => (
          <div
            key={i}
            style={{
              padding: '10px 18px',
              borderBottom: i < 2 ? '1px solid var(--border-dim)' : 'none',
              display: 'flex', alignItems: 'flex-start', gap: 12,
            }}
          >
            {/* Number badge */}
            <div style={{
              width: 22, height: 22, borderRadius: '50%',
              background: i === 0 ? 'var(--cyan-subtle)' : 'var(--card-hover)',
              border: `1px solid ${i === 0 ? 'rgba(0,212,255,0.3)' : 'var(--border)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, marginTop: 1,
            }}>
              <span style={{
                fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-display)',
                color: i === 0 ? 'var(--cyan)' : 'var(--text-muted)',
              }}>
                {i + 1}
              </span>
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                fontSize: 13, fontWeight: 600, color: 'var(--text-primary)',
                marginBottom: 3, lineHeight: 1.4,
              }}>
                {task.title}
              </p>
              <p style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 2 }}>
                {task.reason}
              </p>
              <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                {task.source}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Collaboration prompt */}
      {briefing.collaborationPrompt && (
        <div style={{
          margin: '0 18px 12px',
          padding: '10px 12px',
          background: 'rgba(0,212,255,0.04)',
          border: '1px solid var(--border-dim)',
          borderRadius: 8,
        }}>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>Collaboration</p>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {briefing.collaborationPrompt}
          </p>
        </div>
      )}

      {/* Growth note */}
      {briefing.growthNote && (
        <div style={{
          borderTop: '1px solid var(--border-dim)',
          padding: '10px 18px',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: 'var(--green)', flexShrink: 0,
          }} />
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {briefing.growthNote}
          </p>
        </div>
      )}
    </div>
  )
}
