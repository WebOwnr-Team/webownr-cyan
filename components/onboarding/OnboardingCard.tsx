'use client'

import { useEffect, useState } from 'react'
import { CyanOrb } from '@/components/ui/CyanOrb'

// ─────────────────────────────────────────────
// OnboardingCard
//
// The Cyan briefing card displayed on each onboarding step.
// Shows Cyan's message with a streaming text effect —
// feels like Cyan is typing, not a static form.
// ─────────────────────────────────────────────

interface OnboardingCardProps {
  message: string
  subtext?: string
  step: number
  totalSteps: number
}

export function OnboardingCard({
  message,
  subtext,
  step,
  totalSteps,
}: OnboardingCardProps) {
  const [displayedMessage, setDisplayedMessage] = useState('')
  const [messageComplete, setMessageComplete] = useState(false)
  const [displayedSubtext, setDisplayedSubtext] = useState('')

  // Stream the main message character by character
  useEffect(() => {
    setDisplayedMessage('')
    setMessageComplete(false)
    setDisplayedSubtext('')

    let i = 0
    const interval = setInterval(() => {
      if (i < message.length) {
        setDisplayedMessage(message.slice(0, i + 1))
        i++
      } else {
        clearInterval(interval)
        setMessageComplete(true)
      }
    }, 18)

    return () => clearInterval(interval)
  }, [message])

  // After main message completes, stream the subtext
  useEffect(() => {
    if (!messageComplete || !subtext) return

    let i = 0
    const interval = setInterval(() => {
      if (i < subtext.length) {
        setDisplayedSubtext(subtext.slice(0, i + 1))
        i++
      } else {
        clearInterval(interval)
      }
    }, 12)

    return () => clearInterval(interval)
  }, [messageComplete, subtext])

  return (
    <div className="cyan-card p-5 animate-fade-up">
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <CyanOrb size={32} pulse={!messageComplete} />

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Step indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{
              fontSize: 10,
              fontWeight: 700,
              color: 'var(--cyan)',
              fontFamily: 'var(--font-display)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}>
              Cyan
            </span>
            <div style={{ flex: 1, height: 1, background: 'var(--border-dim)' }} />
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
              {step} of {totalSteps}
            </span>
          </div>

          {/* Main message */}
          <p style={{
            fontSize: 16,
            fontWeight: 600,
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-display)',
            lineHeight: 1.4,
            marginBottom: subtext ? 8 : 0,
          }}>
            {displayedMessage}
            {/* Blinking cursor while streaming */}
            {!messageComplete && (
              <span style={{
                display: 'inline-block',
                width: 2,
                height: 14,
                background: 'var(--cyan)',
                marginLeft: 2,
                verticalAlign: 'middle',
                animation: 'cyan-pulse 0.8s ease-in-out infinite',
              }} />
            )}
          </p>

          {/* Subtext */}
          {subtext && displayedSubtext && (
            <p style={{
              fontSize: 13,
              color: 'var(--text-secondary)',
              lineHeight: 1.6,
            }}>
              {displayedSubtext}
            </p>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div style={{
        marginTop: 16,
        height: 2,
        background: 'var(--border-dim)',
        borderRadius: 999,
        overflow: 'hidden',
      }}>
        <div
          style={{
            height: '100%',
            width: `${(step / totalSteps) * 100}%`,
            background: 'var(--cyan)',
            borderRadius: 999,
            transition: 'width 400ms var(--ease-out)',
          }}
        />
      </div>
    </div>
  )
}
