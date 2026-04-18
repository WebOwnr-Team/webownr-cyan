'use client'

import { useEffect, useState } from 'react'
import { CyanOrb } from '@/components/ui/CyanOrb'

interface OnboardingCompleteProps {
  businessName: string
}

// ─────────────────────────────────────────────
// OnboardingComplete
//
// Shown after successful API call.
// Streams Cyan's completion message, then the
// parent (useOnboarding) redirects to /dashboard.
// ─────────────────────────────────────────────

const COMPLETION_LINES = [
  (name: string) => `${name} is live.`,
  () => `I've set up your workspace.`,
  () => `Your first briefing will be ready tomorrow morning.`,
  () => `Taking you to your dashboard now...`,
]

export function OnboardingComplete({ businessName }: OnboardingCompleteProps) {
  const [visibleLines, setVisibleLines] = useState(0)

  useEffect(() => {
    const timings = [0, 600, 1200, 1800]
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
        gap: 24,
        textAlign: 'center',
        padding: '8px 0',
      }}
    >
      <CyanOrb size={56} pulse />

      <div className="space-y-3" style={{ maxWidth: 340 }}>
        {COMPLETION_LINES.map((line, i) => (
          <p
            key={i}
            style={{
              fontSize: i === 0 ? 18 : 14,
              fontWeight: i === 0 ? 700 : 400,
              fontFamily: i === 0 ? 'var(--font-display)' : 'var(--font-body)',
              color: i === 0 ? 'var(--text-primary)' : 'var(--text-secondary)',
              opacity: visibleLines > i ? 1 : 0,
              transform: visibleLines > i ? 'translateY(0)' : 'translateY(8px)',
              transition: 'opacity 400ms ease, transform 400ms ease',
            }}
          >
            {line(businessName)}
          </p>
        ))}
      </div>

      {/* Loading dots */}
      {visibleLines >= 4 && (
        <div className="flex gap-1.5 animate-fade-up">
          <span className="typing-dot" />
          <span className="typing-dot" />
          <span className="typing-dot" />
        </div>
      )}
    </div>
  )
}
