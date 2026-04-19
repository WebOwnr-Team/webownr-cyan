import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

// ─────────────────────────────────────────────
// Timestamp handling
//
// Firestore Timestamp objects have a .toDate() method.
// BUT when the Admin SDK serializes data to JSON (via API routes),
// Timestamps become plain objects: { seconds: number, nanoseconds: number }
// Calling .toDate() on those plain objects throws "e.toDate is not a function".
//
// safeToDate() handles ALL three cases:
//   1. Real Firestore Timestamp  → call .toDate()
//   2. Plain { seconds, nanoseconds } object → construct Date from seconds
//   3. null / undefined → return null
// ─────────────────────────────────────────────

interface TimestampLike {
  toDate(): Date
  seconds?: number
  nanoseconds?: number
}

interface SerializedTimestamp {
  seconds: number
  nanoseconds?: number
}

function safeToDate(ts: TimestampLike | SerializedTimestamp | null | undefined): Date | null {
  if (!ts) return null
  // Real Firestore Timestamp — has .toDate() as a function
  if (typeof (ts as TimestampLike).toDate === 'function') {
    return (ts as TimestampLike).toDate()
  }
  // Serialized plain object — has seconds field
  if (typeof (ts as SerializedTimestamp).seconds === 'number') {
    return new Date((ts as SerializedTimestamp).seconds * 1000)
  }
  return null
}

// ─────────────────────────────────────────────
// shadcn/ui class merge utility
// ─────────────────────────────────────────────

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ─────────────────────────────────────────────
// Currency formatting — NGN (Nigerian Naira)
// ─────────────────────────────────────────────

export function formatNGN(amount: number, compact = false): string {
  if (compact) {
    if (amount >= 1_000_000) return `₦${(amount / 1_000_000).toFixed(1)}M`
    if (amount >= 1_000) return `₦${(amount / 1_000).toFixed(1)}K`
    return `₦${amount.toLocaleString('en-NG')}`
  }
  return `₦${amount.toLocaleString('en-NG')}`
}

// ─────────────────────────────────────────────
// Date utilities
// ─────────────────────────────────────────────

export function toDateString(date: Date): string {
  // Returns 'YYYY-MM-DD' — used as Firestore document IDs
  return date.toISOString().split('T')[0]!
}

export function todayString(): string {
  return toDateString(new Date())
}

export function getMondayOfWeek(date: Date = new Date()): string {
  const d = new Date(date)
  const day = d.getDay() // 0 = Sun
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Monday
  d.setDate(diff)
  return toDateString(d)
}

export function getSundayOfWeek(date: Date = new Date()): string {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? 0 : 7)
  d.setDate(diff)
  return toDateString(d)
}

export function currentMonth(): string {
  // Returns 'YYYY-MM' — used as tokenUsage document IDs
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

// Safe wrappers — handle both real Timestamps and plain serialized objects
export function timestampToDate(ts: TimestampLike | SerializedTimestamp | null | undefined): Date {
  return safeToDate(ts) ?? new Date(0)
}

export function timestampToString(
  ts: TimestampLike | SerializedTimestamp | null | undefined,
  format: 'time' | 'date' | 'datetime' = 'datetime'
): string {
  const date = safeToDate(ts)
  if (!date) return '—'
  switch (format) {
    case 'time':
      return date.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })
    case 'date':
      return date.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
    case 'datetime':
      return date.toLocaleString('en-NG', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
  }
}

// ─────────────────────────────────────────────
// Time utilities — work schedule helpers
// ─────────────────────────────────────────────

// Parse '09:00' → { hours: 9, minutes: 0 }
export function parseTime(timeStr: string): { hours: number; minutes: number } {
  const [hours, minutes] = timeStr.split(':').map(Number)
  return { hours: hours ?? 0, minutes: minutes ?? 0 }
}

// Get current time as 'HH:MM' string in a given timezone
export function getCurrentTimeInZone(timezone: string): string {
  return new Date().toLocaleTimeString('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

// Check if current time (in timezone) is within scheduled work hours
export function isWithinWorkHours(
  workStartTime: string,
  workEndTime: string,
  timezone: string
): boolean {
  const currentTime = getCurrentTimeInZone(timezone)
  return currentTime >= workStartTime && currentTime < workEndTime
}

// Check if today (in timezone) is a scheduled work day
// workDays: [1,2,3,4,5] = Mon–Fri (1=Mon, 7=Sun — ISO weekday)
export function isWorkDay(workDays: number[], timezone: string): boolean {
  const now = new Date()
  const dayOfWeek = parseInt(
    now.toLocaleDateString('en-US', { timeZone: timezone, weekday: 'long' })
      .replace('Sunday', '7').replace('Monday', '1').replace('Tuesday', '2')
      .replace('Wednesday', '3').replace('Thursday', '4')
      .replace('Friday', '5').replace('Saturday', '6')
  )
  return workDays.includes(dayOfWeek)
}

// Calculate minutes between two 'HH:MM' strings
export function minutesBetween(startTime: string, endTime: string): number {
  const start = parseTime(startTime)
  const end = parseTime(endTime)
  return (end.hours * 60 + end.minutes) - (start.hours * 60 + start.minutes)
}

// ─────────────────────────────────────────────
// Delta / percentage helpers
// ─────────────────────────────────────────────

export function percentageDelta(current: number, baseline: number): number {
  if (baseline === 0) return 0
  return Math.round(((current - baseline) / baseline) * 100)
}

export function deltaLabel(percent: number): string {
  if (percent > 0) return `+${percent}%`
  if (percent < 0) return `${percent}%`
  return '0%'
}

export function deltaDirection(percent: number): 'up' | 'down' | 'neutral' {
  if (percent > 0) return 'up'
  if (percent < 0) return 'down'
  return 'neutral'
}

// ─────────────────────────────────────────────
// Attendance record ID builder
// Format: 'YYYY-MM-DD_{memberId}'
// Enforced here so it never drifts
// ─────────────────────────────────────────────

export function buildAttendanceRecordId(date: string, memberId: string): string {
  return `${date}_${memberId}`
}

// ─────────────────────────────────────────────
// Token usage helpers
// ─────────────────────────────────────────────

export function usagePercent(used: number, budget: number): number {
  if (budget === 0 || budget === Infinity) return 0
  return Math.min(Math.round((used / budget) * 100), 100)
}

export function shouldShowUpgradePrompt(used: number, budget: number): boolean {
  if (budget === Infinity) return false
  return used / budget >= 0.8
}

// ─────────────────────────────────────────────
// String helpers
// ─────────────────────────────────────────────

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str
  return str.slice(0, length) + '...'
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

export function generateId(): string {
  // Simple ID for non-critical uses — Firestore auto-IDs preferred for documents
  return Math.random().toString(36).slice(2, 11)
}
