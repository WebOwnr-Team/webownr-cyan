'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useOnboarding } from '@/hooks/useOnboarding'
import { OnboardingCard } from '@/components/onboarding/OnboardingCard'
import { OnboardingInput } from '@/components/onboarding/OnboardingInput'
import { OnboardingComplete } from '@/components/onboarding/OnboardingComplete'
import { ONBOARDING_QUESTIONS } from '@/lib/onboarding'

export default function OnboardingPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  const {
    state,
    currentQuestion,
    currentValue,
    error,
    submitting,
    completed,
    setCurrentValue,
    advance,
    back,
    isLastStep,
  } = useOnboarding()

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div style={centeredStyle}>
        <span style={{ display: 'flex', gap: 6 }}>
          <span className="typing-dot" />
          <span className="typing-dot" />
          <span className="typing-dot" />
        </span>
      </div>
    )
  }

  if (!user) return null

  return (
    <main style={{
      minHeight: '100vh',
      background: 'var(--navy)',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'center',
      padding: '48px 16px 80px',
    }}>
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          top: '-10%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 700,
          height: 500,
          borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(0,212,255,0.05) 0%, transparent 65%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      <div style={{ width: '100%', maxWidth: 560, position: 'relative', zIndex: 1 }}>

        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <span style={{
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-display)',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
          }}>
            WebOwnr · Cyan
          </span>
        </div>

        {completed ? (
          <OnboardingComplete businessName={state.businessName ?? 'Your business'} />
        ) : (
          <div>

            <div className="animate-fade-up">
              <OnboardingCard
                message={currentQuestion.cyanMessage}
                subtext={currentQuestion.cyanSubtext}
                step={state.step}
                totalSteps={ONBOARDING_QUESTIONS.length}
              />
            </div>

            <div className="animate-fade-up" style={{ marginTop: 16 }}>
              <OnboardingInput
                question={currentQuestion}
                value={currentValue}
                onChange={setCurrentValue}
                error={error}
                disabled={submitting}
              />
            </div>

            <div
              className="animate-fade-up"
              style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 20 }}
            >
              <button
                type="button"
                onClick={back}
                disabled={state.step === 1 || submitting}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '13px 18px',
                  background: 'none',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  color: 'var(--text-secondary)',
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: state.step === 1 ? 'default' : 'pointer',
                  opacity: state.step === 1 ? 0 : 1,
                  pointerEvents: state.step === 1 ? 'none' : 'auto',
                  transition: 'opacity 200ms',
                  minHeight: 50,
                  flexShrink: 0,
                  whiteSpace: 'nowrap',
                }}
              >
                <ArrowLeft size={15} />
                Back
              </button>

              <button
                type="button"
                onClick={advance}
                disabled={submitting}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '13px 24px',
                  background: submitting ? 'var(--border)' : 'var(--cyan)',
                  border: 'none',
                  borderRadius: 10,
                  color: submitting ? 'var(--text-muted)' : 'var(--navy)',
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  transition: 'background 200ms, color 200ms',
                  minHeight: 50,
                  fontFamily: 'var(--font-display)',
                }}
              >
                {submitting ? (
                  <span style={{ display: 'flex', gap: 4 }}>
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                  </span>
                ) : isLastStep ? (
                  'Launch workspace'
                ) : (
                  <>Continue <ArrowRight size={15} /></>
                )}
              </button>
            </div>

            <div
              className="animate-fade-up"
              style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 28 }}
            >
              {ONBOARDING_QUESTIONS.map(q => (
                <div
                  key={q.step}
                  style={{
                    width: q.step === state.step ? 22 : 6,
                    height: 6,
                    borderRadius: 999,
                    background: q.step === state.step
                      ? 'var(--cyan)'
                      : q.step < state.step
                        ? 'var(--cyan-dim)'
                        : 'var(--border)',
                    transition: 'all 300ms var(--ease-out)',
                  }}
                />
              ))}
            </div>

          </div>
        )}
      </div>
    </main>
  )
}

const centeredStyle: React.CSSProperties = {
  minHeight: '100vh',
  background: 'var(--navy)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}