'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import type { OnboardingState, OnboardingStep } from '@/types'
import {
  ONBOARDING_QUESTIONS,
  INITIAL_ONBOARDING_STATE,
} from '@/lib/onboarding'

// ─────────────────────────────────────────────
// useOnboarding — drives the entire onboarding flow
//
// Handles:
//   - State accumulation across 5 steps
//   - Per-step validation before advancing
//   - API call to /api/cyan/onboarding/complete
//   - Routing to /dashboard on success
// ─────────────────────────────────────────────

interface UseOnboardingReturn {
  state: OnboardingState
  currentQuestion: typeof ONBOARDING_QUESTIONS[0]
  currentValue: string
  error: string | null
  submitting: boolean
  completed: boolean
  setCurrentValue: (value: string) => void
  advance: () => void
  back: () => void
  isLastStep: boolean
}

export function useOnboarding(): UseOnboardingReturn {
  const { user, getIdToken } = useAuth()
  const router = useRouter()

  const [state, setState] = useState<OnboardingState>(INITIAL_ONBOARDING_STATE)
  const [currentValue, setCurrentValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [completed, setCompleted] = useState(false)

  const currentQuestion = ONBOARDING_QUESTIONS[state.step - 1]!
  const isLastStep = state.step === 5

  const advance = useCallback(async () => {
    // Validate current input
    const validationError = currentQuestion.validation(currentValue)
    if (validationError) {
      setError(validationError)
      return
    }
    setError(null)

    // Merge current value into state
    const updatedState: OnboardingState = {
      ...state,
      [currentQuestion.fieldKey]: currentQuestion.inputType === 'schedule'
        ? JSON.parse(currentValue)          // schedule is stored as JSON string in the input
        : currentValue.trim(),
    }

    if (!isLastStep) {
      // Advance to next step
      setState({ ...updatedState, step: (state.step + 1) as OnboardingStep })
      setCurrentValue('')
      return
    }

    // Last step — submit to API
    setSubmitting(true)
    try {
      const token = await getIdToken()
      if (!token) throw new Error('Not authenticated')

      const displayName = user?.displayName ?? user?.email?.split('@')[0] ?? 'Founder'

      const res = await fetch('/api/cyan/onboarding/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          state: updatedState,
          displayName,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error ?? 'Setup failed')
      }

      setCompleted(true)

      // Small delay so the completion animation plays before navigating
      setTimeout(() => {
        router.push('/dashboard')
      }, 2200)

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }, [state, currentValue, currentQuestion, isLastStep, getIdToken, user, router])

  const back = useCallback(() => {
    if (state.step <= 1) return
    setError(null)
    setCurrentValue('')
    setState(prev => ({ ...prev, step: (prev.step - 1) as OnboardingStep }))
  }, [state.step])

  return {
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
  }
}
