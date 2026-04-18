// ─────────────────────────────────────────────
// Attendance Records
// Stored at: attendance/{businessId}/records/{date}_{memberId}
// Record ID format: 'YYYY-MM-DD_{memberId}' — enforced server-side
//
// Note on Timestamp typing:
// We use a shared FirestoreTimestamp interface instead of importing
// from firebase/firestore or firebase-admin/firestore directly.
// This avoids the Admin SDK / client SDK type mismatch when these
// types are used in both server-side engines and client components.
// Both SDKs' Timestamp classes satisfy this interface at runtime.
// ─────────────────────────────────────────────

export interface FirestoreTimestamp {
  seconds: number
  nanoseconds: number
  toDate(): Date
  toMillis(): number
}

export type AttendanceStatus =
  | 'on-time'
  | 'late'
  | 'absent'
  | 'overtime-only'     // checked in outside scheduled hours, no scheduled-hours presence
  | 'overtime-extended' // checked in on time AND stayed past end time

export interface AttendanceRecord {
  memberId: string
  memberName: string
  date: string           // 'YYYY-MM-DD'
  scheduledStart: string // from team workSchedule e.g. '09:00'
  scheduledEnd: string   // e.g. '17:00'
  checkInTime: FirestoreTimestamp | null
  checkOutTime: FirestoreTimestamp | null
  isOvertime: boolean    // true if check-in outside scheduled work hours
  overtimeNote: string   // optional: why they're in during non-work hours
  status: AttendanceStatus
  hoursWorked: number    // calculated on checkout — 0 if not yet checked out
  cyanNote: string       // Cyan's generated note about this attendance record
}

// ─────────────────────────────────────────────
// Attendance creation payload —
// used when writing a new record (check-in event)
// ─────────────────────────────────────────────

export interface AttendanceCheckInPayload {
  memberId: string
  memberName: string
  businessId: string
  scheduledStart: string
  scheduledEnd: string
  timezone: string
}

// ─────────────────────────────────────────────
// Attendance summary —
// used by Cyan in briefings and reports
// ─────────────────────────────────────────────

export interface AttendanceSummary {
  date: string
  totalScheduled: number
  presentCount: number
  lateCount: number
  absentCount: number
  overtimeCount: number
  members: {
    memberId: string
    memberName: string
    status: AttendanceStatus
    checkInTime: FirestoreTimestamp | null
  }[]
}

// ─────────────────────────────────────────────
// Late arrival threshold constant
// A check-in more than this many minutes after scheduledStart = 'late'
// ─────────────────────────────────────────────

export const LATE_THRESHOLD_MINUTES = 15
