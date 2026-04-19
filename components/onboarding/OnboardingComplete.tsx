'use client'

import { useEffect, useState } from 'react'
import { CyanOrb } from '@/components/ui/CyanOrb'

interface OnboardingCompleteProps {
  businessName: string
}

const COMPLETION_LINES = [
  (name: string) => `${name} is live on WebOwnr.`,
  () => `Your workspace is ready.`,
  () => `Invite your team from the dashboard to get started.`,
  () => `Taking you to your workspace now...`,
]

export function OnboardingComplete({ businessName }: OnboardingCompleteProps) {
  const [visibleLines, setVisibleLines] = useState(0)

  useEffect(() => {
    const timings = [100, 700, 1300, 1900]
    const timers = timings.map((delay, i) =>
      setTimeout(() => setVisibleLines(i + 1), delay)
    )
    return () => timers.forEach(clearTimeout)
  }, [])

  return (
    <div
      className="animate-fade-up"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 28,
        textAlign: 'center',
        padding: '24px 0',
      }}
    >
      <CyanOrb size={60} pulse />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 360 }}>
        {COMPLETION_LINES.map((line, i) => (
          <p
            key={i}
            style={{
              fontSize: i === 0 ? 20 : 15,
              fontWeight: i === 0 ? 700 : 400,
              fontFamily: i === 0 ? 'var(--font-display)' : 'var(--font-body)',
              color: i === 0 ? 'var(--text-primary)' : 'var(--text-secondary)',
              lineHeight: 1.45,
              opacity: visibleLines > i ? 1 : 0,
              transform: visibleLines > i ? 'translateY(0)' : 'translateY(10px)',
              transition: 'opacity 450ms ease, transform 450ms ease',
            }}
          >
            {line(businessName)}
          </p>
        ))}
      </div>

      {visibleLines >= 4 && (
        <div className="animate-fade-up" style={{ display: 'flex', gap: 6 }}>
          <span className="typing-dot" />
          <span className="typing-dot" />
          <span className="typing-dot" />
        </div>
      )}
    </div>
  )
}