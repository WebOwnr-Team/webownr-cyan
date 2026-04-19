'use client'

import { useEffect, useState } from 'react'
import { CyanOrb } from '@/components/ui/CyanOrb'

interface OnboardingCardProps {
  message: string
  subtext?: string
  step: number
  totalSteps: number
}

export function OnboardingCard({ message, subtext, step, totalSteps }: OnboardingCardProps) {
  const [displayedMessage, setDisplayedMessage] = useState('')
  const [messageComplete, setMessageComplete] = useState(false)
  const [displayedSubtext, setDisplayedSubtext] = useState('')

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
    }, 16)
    return () => clearInterval(interval)
  }, [message])

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
    }, 10)
    return () => clearInterval(interval)
  }, [messageComplete, subtext])

  return (
    <div
      className="animate-fade-up"
      style={{
        background: 'var(--card-bg)',
        border: '1px solid rgba(0,212,255,0.18)',
        borderRadius: 14,
        padding: '20px 22px',
        boxShadow: '0 0 0 1px rgba(0,212,255,0.04), 0 4px 24px rgba(0,0,0,0.3)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <CyanOrb size={34} pulse={!messageComplete} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{
              fontSize: 10, fontWeight: 700, color: 'var(--cyan)',
              fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.1em',
            }}>
              Cyan
            </span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <span style={{ fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
              Step {step} of {totalSteps}
            </span>
          </div>

          <p style={{
            fontSize: 17, fontWeight: 600, color: 'var(--text-primary)',
            fontFamily: 'var(--font-display)', lineHeight: 1.45,
            marginBottom: subtext ? 10 : 0,
          }}>
            {displayedMessage}
            {!messageComplete && (
              <span style={{
                display: 'inline-block', width: 2, height: 15,
                background: 'var(--cyan)', marginLeft: 2, verticalAlign: 'middle',
                animation: 'cyan-pulse 0.8s ease-in-out infinite',
              }} />
            )}
          </p>

          {subtext && displayedSubtext && (
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65 }}>
              {displayedSubtext}
            </p>
          )}
        </div>
      </div>

      <div style={{
        marginTop: 18, height: 2, background: 'var(--border)',
        borderRadius: 999, overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${(step / totalSteps) * 100}%`,
          background: 'var(--cyan)',
          borderRadius: 999,
          transition: 'width 450ms var(--ease-out)',
        }} />
      </div>
    </div>
  )
}