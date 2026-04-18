'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { useWellbeing } from '@/hooks'
import { CyanOrbInline } from '@/components/ui/CyanOrb'

// ─────────────────────────────────────────────
// WellbeingCheckIn
//
// Cyan's weekly private mood check-in.
// Appears as a soft overlay after 90 seconds.
// Never intrusive, never mandatory.
// Never looks like HR monitoring.
// The founder only sees the team aggregate — never individual scores.
// ─────────────────────────────────────────────

const SCORE_LABELS: Record<number, string> = {
  1: 'Tough week',
  2: 'A bit rough',
  3: 'Holding up',
  4: 'Pretty good',
  5: 'Doing great',
}

const SCORE_COLORS: Record<number, string> = {
  1: 'var(--red)',
  2: 'var(--orange)',
  3: 'var(--gold)',
  4: '#7ECFAA',
  5: 'var(--green)',
}

export function WellbeingCheckIn() {
  const { shouldShowPrompt, submitting, submitted, submitScore, dismiss } = useWellbeing()
  const [hovered, setHovered] = useState<number | null>(null)

  if (!shouldShowPrompt) return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 50,
        width: 300,
        background: 'var(--card-bg)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        overflow: 'hidden',
        animation: 'fade-up 350ms cubic-bezier(0.16,1,0.3,1) both',
      }}
    >
      {/* Header */}
      <div style={{
        padding: '14px 16px 10px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid var(--border-dim)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CyanOrbInline size={16} />
          <span style={{
            fontSize: 11, fontWeight: 700, color: 'var(--cyan)',
            fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.07em',
          }}>
            Cyan · Check-in
          </span>
        </div>
        <button
          onClick={dismiss}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', padding: 4, borderRadius: 4,
          }}
        >
          <X size={13} />
        </button>
      </div>

      {/* Body */}
      <div style={{ padding: '14px 16px 16px' }}>
        {submitted ? (
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--green)', marginBottom: 4 }}>
              Thanks — noted.
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Your response is private. See you next week.
            </p>
          </div>
        ) : (
          <>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 14 }}>
              How are you feeling about your work this week?
            </p>

            {/* Score buttons */}
            <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 10 }}>
              {[1, 2, 3, 4, 5].map(score => (
                <button
                  key={score}
                  disabled={submitting}
                  onClick={() => void submitScore(score as 1 | 2 | 3 | 4 | 5)}
                  onMouseEnter={() => setHovered(score)}
                  onMouseLeave={() => setHovered(null)}
                  style={{
                    width: 40, height: 40, borderRadius: 10,
                    border: `1px solid ${hovered === score ? SCORE_COLORS[score] : 'var(--border)'}`,
                    background: hovered === score
                      ? `${SCORE_COLORS[score]}22`
                      : 'var(--navy-mid)',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    fontSize: 18,
                    transition: 'all 150ms',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {['😔', '😕', '😐', '🙂', '😊'][score - 1]}
                </button>
              ))}
            </div>

            {/* Hovered label */}
            <p style={{
              fontSize: 11, color: 'var(--text-muted)', textAlign: 'center',
              minHeight: 16, transition: 'opacity 150ms',
              opacity: hovered ? 1 : 0,
            }}>
              {hovered ? SCORE_LABELS[hovered] : ''}
            </p>

            <p style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', marginTop: 10 }}>
              Private — Cyan only shares a team average with your founder.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
