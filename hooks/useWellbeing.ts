'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'

// ─────────────────────────────────────────────
// useWellbeing
//
// Manages the weekly private wellbeing check-in.
// Cyan asks once per week — never intrusive.
// Shows the prompt card only if not yet submitted this week.
// ─────────────────────────────────────────────

interface UseWellbeingReturn {
  shouldShowPrompt: boolean
  submitting: boolean
  submitted: boolean
  submitScore: (score: 1 | 2 | 3 | 4 | 5) => Promise<void>
  dismiss: () => void
}

export function useWellbeing(): UseWellbeingReturn {
  const { getIdToken } = useAuth()
  const [shouldShowPrompt, setShouldShowPrompt] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  // Check if submitted this week on mount
  useEffect(() => {
    void (async () => {
      const token = await getIdToken()
      if (!token) return
      try {
        const res = await fetch('/api/cyan/member/wellbeing', {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json() as { submitted: boolean }
        // Only show if not already submitted AND not dismissed this session
        if (!data.submitted) {
          // Delay the prompt — show after 90 seconds on the workspace
          setTimeout(() => setShouldShowPrompt(true), 90_000)
        }
      } catch {
        // Silent — wellbeing check never blocks the workspace
      }
    })()
  }, [getIdToken])

  const submitScore = useCallback(async (score: 1 | 2 | 3 | 4 | 5) => {
    setSubmitting(true)
    try {
      const token = await getIdToken()
      if (!token) return
      await fetch('/api/cyan/member/wellbeing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ score }),
      })
      setSubmitted(true)
      setTimeout(() => setShouldShowPrompt(false), 1500)
    } catch {
      // Silent
    } finally {
      setSubmitting(false)
    }
  }, [getIdToken])

  const dismiss = useCallback(() => {
    setDismissed(true)
    setShouldShowPrompt(false)
  }, [])

  return {
    shouldShowPrompt: shouldShowPrompt && !dismissed,
    submitting,
    submitted,
    submitScore,
    dismiss,
  }
}
