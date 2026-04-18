'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import type { AttendanceRecord } from '@/types'

// ─────────────────────────────────────────────
// useAttendance
//
// Handles the full attendance lifecycle client-side:
//   1. Auto check-in on mount (first load of the day)
//   2. Heartbeat every 5 minutes to detect activity
//   3. Auto check-out on page unload (beforeunload event)
//   4. Exposes today's record for the UI
//
// The hook fires silently — it never blocks the UI.
// All failures are non-fatal — attendance tracking
// must never degrade the core experience.
// ─────────────────────────────────────────────

const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000  // 5 minutes
const CHECKOUT_TIMEOUT_MS = 15 * 60 * 1000   // 15 min of inactivity = auto checkout

interface UseAttendanceReturn {
  todayRecord: AttendanceRecord | null
  checkInLoading: boolean
  isCheckedIn: boolean
  isCheckedOut: boolean
  manualCheckOut: () => Promise<void>
}

export function useAttendance(): UseAttendanceReturn {
  const { user, getIdToken } = useAuth()
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null)
  const [checkInLoading, setCheckInLoading] = useState(false)

  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hasCheckedInRef = useRef(false)
  const hasCheckedOutRef = useRef(false)

  // ── Core API calls ───────────────────────────────────────────────────────

  const callWithToken = useCallback(async (
    path: string,
    method: 'GET' | 'POST' = 'POST'
  ): Promise<Response | null> => {
    if (!user) return null
    try {
      const token = await getIdToken()
      if (!token) return null
      return fetch(path, {
        method,
        headers: { Authorization: `Bearer ${token}` },
      })
    } catch {
      return null
    }
  }, [user, getIdToken])

  const performCheckIn = useCallback(async () => {
    if (hasCheckedInRef.current || !user) return
    setCheckInLoading(true)
    try {
      const res = await callWithToken('/api/cyan/attendance/checkin')
      if (res?.ok) {
        const data = await res.json() as { record: AttendanceRecord }
        setTodayRecord(data.record)
        hasCheckedInRef.current = true
      }
    } catch {
      // Silent fail — attendance tracking must never crash the app
    } finally {
      setCheckInLoading(false)
    }
  }, [user, callWithToken])

  const performCheckOut = useCallback(async () => {
    if (hasCheckedOutRef.current || !hasCheckedInRef.current || !user) return
    hasCheckedOutRef.current = true
    try {
      const res = await callWithToken('/api/cyan/attendance/checkout')
      if (res?.ok) {
        const data = await res.json() as { record: AttendanceRecord }
        setTodayRecord(data.record)
      }
    } catch {
      // Silent fail
    }
  }, [user, callWithToken])

  // ── Fetch existing record on mount ───────────────────────────────────────

  const fetchTodayRecord = useCallback(async () => {
    const res = await callWithToken('/api/cyan/attendance/checkin', 'GET')
    if (res?.ok) {
      const data = await res.json() as { record: AttendanceRecord | null }
      if (data.record) {
        setTodayRecord(data.record)
        hasCheckedInRef.current = true
        if (data.record.checkOutTime) {
          hasCheckedOutRef.current = true
        }
      }
    }
  }, [callWithToken])

  // ── Reset inactivity timer ───────────────────────────────────────────────

  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current)
    }
    inactivityTimerRef.current = setTimeout(() => {
      void performCheckOut()
    }, CHECKOUT_TIMEOUT_MS)
  }, [performCheckOut])

  // ── Lifecycle ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!user) return

    // 1. Fetch any existing record first
    void fetchTodayRecord().then(() => {
      // 2. Check in if not already done today
      if (!hasCheckedInRef.current) {
        void performCheckIn()
      }
    })

    // 3. Heartbeat — keeps the session alive
    heartbeatRef.current = setInterval(() => {
      if (hasCheckedInRef.current && !hasCheckedOutRef.current) {
        // Just a keep-alive ping — actual check-out is event-driven
        resetInactivityTimer()
      }
    }, HEARTBEAT_INTERVAL_MS)

    // 4. Inactivity detection — activity events reset the timer
    const activityEvents = ['mousemove', 'keydown', 'click', 'touchstart', 'scroll']
    const handleActivity = () => resetInactivityTimer()
    activityEvents.forEach(evt => window.addEventListener(evt, handleActivity, { passive: true }))
    resetInactivityTimer()

    // 5. Page unload — fire checkout via visibilitychange (handles tab close and navigation)
    // Note: beforeunload is kept as a lightweight signal but the actual checkout
    // happens in visibilitychange where we still have an async context for getIdToken()
    const handleUnload = () => {
      // Mark intent — the visibilitychange handler does the actual async checkout
      if (hasCheckedInRef.current && !hasCheckedOutRef.current) {
        hasCheckedOutRef.current = true // prevent duplicate calls
      }
    }
    window.addEventListener('beforeunload', handleUnload)

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        void performCheckOut()
      }
    }
    window.addEventListener('visibilitychange', handleVisibility)

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current)
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current)
      activityEvents.forEach(evt => window.removeEventListener(evt, handleActivity))
      window.removeEventListener('beforeunload', handleUnload)
      window.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [user, fetchTodayRecord, performCheckIn, performCheckOut, resetInactivityTimer])

  const manualCheckOut = useCallback(async () => {
    await performCheckOut()
  }, [performCheckOut])

  const isCheckedIn = todayRecord !== null && todayRecord.checkInTime !== null
  const isCheckedOut = todayRecord !== null && todayRecord.checkOutTime !== null

  return {
    todayRecord,
    checkInLoading,
    isCheckedIn,
    isCheckedOut,
    manualCheckOut,
  }
}
