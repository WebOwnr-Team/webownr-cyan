import type { Metadata } from 'next'
import { AttendanceDashboard } from './AttendanceDashboard'

export const metadata: Metadata = { title: 'Attendance' }

// ─────────────────────────────────────────────
// Attendance page — /attendance
// Founder + team view: today's summary and history
// ─────────────────────────────────────────────

export default function AttendancePage() {
  return <AttendanceDashboard />
}
