'use client'

import { useAttendance } from '@/hooks'

// ─────────────────────────────────────────────
// AttendanceAutoCheckIn
//
// Invisible component — renders nothing to the UI.
// Mounted inside the dashboard layout so it fires
// as soon as any dashboard route is accessed.
//
// useAttendance handles:
//   - Auto check-in on first load of the day
//   - Heartbeat every 5 min
//   - Auto check-out on visibility change / unload
//   - Inactivity timeout (15 min)
// ─────────────────────────────────────────────

export function AttendanceAutoCheckIn() {
  useAttendance()  // Side-effects only — no render output needed
  return null
}
