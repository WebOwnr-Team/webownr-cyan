import { Timestamp } from 'firebase-admin/firestore'
import { adminDb } from '@/firebase/firebaseAdmin'
import { COLLECTIONS } from '@/lib/schema'
import { haikuCompletion } from '@/lib/anthropic-client'
import { logTokenUsage } from '@/lib/token-tracker'
import {
  buildAttendanceRecordId,
  parseTime,
  isWithinWorkHours,
  todayString,
  currentMonth,
} from '@/lib/utils'
import type {
  AttendanceRecord,
  AttendanceStatus,
  AttendanceSummary,
  AttendanceCheckInPayload,
  FirestoreTimestamp,
} from '@/types'
import { LATE_THRESHOLD_MINUTES } from '@/types'

// ─────────────────────────────────────────────
// Attendance Engine — server-side only
//
// Handles:
//   - Auto check-in when a member opens the platform
//   - Auto check-out when they close / go offline
//   - Late detection (15+ min after scheduled start)
//   - Overtime detection (activity outside work hours)
//   - Cyan-generated attendance notes per record
//   - Daily attendance summary for the founder briefing
// ─────────────────────────────────────────────

// ── Check-in ─────────────────────────────────────────────────────────────────

export async function recordCheckIn(
  payload: AttendanceCheckInPayload
): Promise<AttendanceRecord> {
  const { memberId, memberName, businessId, scheduledStart, scheduledEnd, timezone } = payload

  const date = todayString()
  const recordId = buildAttendanceRecordId(date, memberId)
  const docPath = COLLECTIONS.attendanceRecord(businessId, recordId)

  // Check if a record already exists for today — idempotent
  const existing = await adminDb.doc(docPath).get()
  if (existing.exists) {
    return existing.data() as AttendanceRecord
  }

  const now = new Date()
  const checkInTime = Timestamp.now()

  // Determine if this check-in is during scheduled hours or overtime
  const withinHours = isWithinWorkHours(scheduledStart, scheduledEnd, timezone)

  // Calculate status
  let status: AttendanceStatus = 'on-time'
  let isOvertime = false

  if (!withinHours) {
    // Checking in outside work hours = overtime-only
    status = 'overtime-only'
    isOvertime = true
  } else {
    // Within work hours — check if late
    const currentTimeStr = now.toLocaleTimeString('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })

    const scheduledMinutes = parseTime(scheduledStart).hours * 60 + parseTime(scheduledStart).minutes
    const currentMinutes = parseTime(currentTimeStr).hours * 60 + parseTime(currentTimeStr).minutes
    const minutesLate = currentMinutes - scheduledMinutes

    if (minutesLate > LATE_THRESHOLD_MINUTES) {
      status = 'late'
    }
  }

  const record: AttendanceRecord = {
    memberId,
    memberName,
    date,
    scheduledStart,
    scheduledEnd,
    checkInTime: checkInTime as unknown as FirestoreTimestamp,
    checkOutTime: null,
    isOvertime,
    overtimeNote: isOvertime ? 'Working outside scheduled hours' : '',
    status,
    hoursWorked: 0,
    cyanNote: '',
  }

  await adminDb.doc(docPath).set(record)
  return record
}

// ── Check-out ────────────────────────────────────────────────────────────────

export async function recordCheckOut(
  businessId: string,
  memberId: string,
  date: string = todayString()
): Promise<AttendanceRecord | null> {
  const recordId = buildAttendanceRecordId(date, memberId)
  const docPath = COLLECTIONS.attendanceRecord(businessId, recordId)

  const snap = await adminDb.doc(docPath).get()
  if (!snap.exists) return null

  const record = snap.data() as AttendanceRecord
  if (record.checkOutTime) return record // Already checked out

  const checkOutTime = Timestamp.now()

  // Calculate hours worked
  const checkInDate = record.checkInTime?.toDate() ?? new Date()
  const checkOutDate = checkOutTime.toDate()
  const diffMs = checkOutDate.getTime() - checkInDate.getTime()
  const hoursWorked = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100

  // Detect overtime extension — checked in on time but stayed past end
  let finalStatus = record.status
  if (record.status !== 'overtime-only') {
    const checkOutTimeStr = checkOutDate.toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit', hour12: false,
    })
    if (checkOutTimeStr > record.scheduledEnd) {
      finalStatus = 'overtime-extended'
    }
  }

  const updated: Partial<AttendanceRecord> = {
    checkOutTime: checkOutTime as unknown as FirestoreTimestamp,
    hoursWorked,
    status: finalStatus,
    isOvertime: finalStatus === 'overtime-only' || finalStatus === 'overtime-extended',
  }

  await adminDb.doc(docPath).update(updated)

  return { ...record, ...updated } as AttendanceRecord
}

// ── Mark absent members ───────────────────────────────────────────────────────
// Called by a scheduled function at end of day to mark no-shows

export async function markAbsentMembers(
  businessId: string,
  memberIds: string[],
  memberNames: Record<string, string>,
  scheduledStart: string,
  scheduledEnd: string,
  date: string = todayString()
): Promise<void> {
  const batch = adminDb.batch()

  for (const memberId of memberIds) {
    const recordId = buildAttendanceRecordId(date, memberId)
    const docPath = COLLECTIONS.attendanceRecord(businessId, recordId)

    // Only mark absent if no record exists yet
    const snap = await adminDb.doc(docPath).get()
    if (!snap.exists) {
      const absentRecord: AttendanceRecord = {
        memberId,
        memberName: memberNames[memberId] ?? 'Team member',
        date,
        scheduledStart,
        scheduledEnd,
        checkInTime: null,
        checkOutTime: null,
        isOvertime: false,
        overtimeNote: '',
        status: 'absent',
        hoursWorked: 0,
        cyanNote: '',
      }
      batch.set(adminDb.doc(docPath), absentRecord)
    }
  }

  await batch.commit()
}

// ── Generate Cyan attendance note ─────────────────────────────────────────────
// Called after check-out — generates a brief Cyan observation about the record

export async function generateAttendanceNote(
  businessId: string,
  record: AttendanceRecord,
  businessName: string
): Promise<string> {
  const systemPrompt = `You are Cyan, the AI business agent for ${businessName}. Generate a brief, warm, one-sentence attendance note about a team member's workday. Be specific and human — not robotic HR speak.`

  const hoursDisplay = record.hoursWorked > 0
    ? `${record.hoursWorked} hours`
    : 'unknown hours'

  const context = record.status === 'absent'
    ? `${record.memberName} was absent today (${record.date}).`
    : record.status === 'overtime-only'
    ? `${record.memberName} came in outside scheduled hours and worked ${hoursDisplay} on ${record.date}.`
    : record.status === 'overtime-extended'
    ? `${record.memberName} worked ${hoursDisplay} today, staying past their scheduled end time.`
    : record.status === 'late'
    ? `${record.memberName} arrived late today and worked ${hoursDisplay}.`
    : `${record.memberName} had a full day — ${hoursDisplay} worked on ${record.date}.`

  try {
    const result = await haikuCompletion(systemPrompt, `Write a one-sentence attendance note: ${context}`, 80)

    // Log tokens — attendance notes are cheap Haiku calls
    await logTokenUsage({
      businessId,
      month: currentMonth(),
      feature: 'attendance_note',
      model: 'claude-haiku-4-5-20251001',
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      memberId: record.memberId,
    })

    return result.content.trim()
  } catch {
    // Fallback — never fail check-out because of a note generation error
    return context
  }
}

// ── Get today's attendance records ────────────────────────────────────────────

export async function getTodayAttendance(
  businessId: string,
  date: string = todayString()
): Promise<AttendanceRecord[]> {
  const collectionPath = COLLECTIONS.attendanceRecords(businessId)

  const snap = await adminDb
    .collection(collectionPath)
    .where('date', '==', date)
    .get()

  return snap.docs.map(doc => doc.data() as AttendanceRecord)
}

// ── Get a single member's record for today ────────────────────────────────────

export async function getMemberTodayRecord(
  businessId: string,
  memberId: string,
  date: string = todayString()
): Promise<AttendanceRecord | null> {
  const recordId = buildAttendanceRecordId(date, memberId)
  const snap = await adminDb.doc(COLLECTIONS.attendanceRecord(businessId, recordId)).get()
  if (!snap.exists) return null
  return snap.data() as AttendanceRecord
}

// ── Get attendance history for a member ──────────────────────────────────────

export async function getMemberAttendanceHistory(
  businessId: string,
  memberId: string,
  limitDays: number = 30
): Promise<AttendanceRecord[]> {
  const snap = await adminDb
    .collection(COLLECTIONS.attendanceRecords(businessId))
    .where('memberId', '==', memberId)
    .orderBy('date', 'desc')
    .limit(limitDays)
    .get()

  return snap.docs.map(doc => doc.data() as AttendanceRecord)
}

// ── Build attendance summary for briefings ────────────────────────────────────

export async function buildAttendanceSummary(
  businessId: string,
  date: string = todayString()
): Promise<AttendanceSummary> {
  const records = await getTodayAttendance(businessId, date)

  const summary: AttendanceSummary = {
    date,
    totalScheduled: records.length,
    presentCount: records.filter(r =>
      r.status === 'on-time' || r.status === 'late' ||
      r.status === 'overtime-extended' || r.status === 'overtime-only'
    ).length,
    lateCount: records.filter(r => r.status === 'late').length,
    absentCount: records.filter(r => r.status === 'absent').length,
    overtimeCount: records.filter(r => r.isOvertime).length,
    members: records.map(r => ({
      memberId: r.memberId,
      memberName: r.memberName,
      status: r.status,
      checkInTime: r.checkInTime,
    })),
  }

  return summary
}

// ── Calculate streak (consecutive days with check-in) ────────────────────────

export async function calculateMemberStreak(
  businessId: string,
  memberId: string
): Promise<number> {
  const records = await getMemberAttendanceHistory(businessId, memberId, 60)

  if (records.length === 0) return 0

  let streak = 0
  const today = todayString()

  for (const record of records) {
    if (record.status === 'absent') break
    if (record.date > today) continue // skip future dates
    streak++
  }

  return streak
}
