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

// ─────────────────────────────────────────────
// Onboarding page
//
// Route: /onboarding
// Guards: must be authenticated (redirects to /login if not)
//         redirects to /dashboard if already has a business
//
// Layout: centered single-column — focused, no distractions.
// Cyan's message + progress are the primary visual.
// Input is below — minimal, never competing.
// ─────────────────────────────────────────────

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

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div style={centeredStyle}>
        <div className="flex gap-1.5">
          <span className="typing-dot" />
          <span className="typing-dot" />
          <span className="typing-dot" />
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <main style={centeredStyle}>
      {/* Background accent */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          top: '-20%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 600,
          height: 400,
          borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(0,212,255,0.04) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ width: '100%', maxWidth: 520, padding: '0 20px', position: 'relative' }}>

        {/* WebOwnr wordmark */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <span style={{
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-display)',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}>
            WebOwnr · Cyan
          </span>
        </div>

        {/* Completion screen */}
        {completed ? (
          <OnboardingComplete businessName={state.businessName ?? 'Your business'} />
        ) : (
          <div className="stagger">

            {/* Cyan's message card */}
            <div className="animate-fade-up">
              <OnboardingCard
                message={currentQuestion.cyanMessage}
                subtext={currentQuestion.cyanSubtext}
                step={state.step}
                totalSteps={ONBOARDING_QUESTIONS.length}
              />
            </div>

            {/* Input area */}
            <div className="animate-fade-up" style={{ marginTop: 20 }}>
              <OnboardingInput
                question={currentQuestion}
                value={currentValue}
                onChange={setCurrentValue}
                error={error}
                disabled={submitting}
              />
            </div>

            {/* Navigation */}
            <div
              className="animate-fade-up"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: 20,
                gap: 12,
              }}
            >
              {/* Back button */}
              <button
                type="button"
                onClick={back}
                disabled={state.step === 1 || submitting}
                className="btn-ghost flex items-center gap-2"
                style={{
                  padding: '10px 16px',
                  fontSize: 13,
                  opacity: state.step === 1 ? 0 : 1,
                  pointerEvents: state.step === 1 ? 'none' : 'auto',
                  transition: 'opacity 200ms',
                }}
              >
                <ArrowLeft size={14} />
                Back
              </button>

              {/* Continue / Finish button */}
              <button
                type="button"
                onClick={advance}
                disabled={submitting}
                className="btn-primary flex items-center gap-2"
                style={{
                  padding: '12px 24px',
                  fontSize: 14,
                  flex: 1,
                  maxWidth: 220,
                  justifyContent: 'center',
                }}
              >
                {submitting ? (
                  <span className="flex gap-1">
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                  </span>
                ) : (
                  <>
                    {isLastStep ? 'Finish setup' : 'Continue'}
                    {!isLastStep && <ArrowRight size={14} />}
                  </>
                )}
              </button>
            </div>

            {/* Step dots */}
            <div
              className="animate-fade-up"
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: 6,
                marginTop: 28,
              }}
            >
              {ONBOARDING_QUESTIONS.map(q => (
                <div
                  key={q.step}
                  style={{
                    width: q.step === state.step ? 20 : 6,
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
