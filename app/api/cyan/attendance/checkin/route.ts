import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/firebase/firebaseAdmin'
import { verifyAuthAndGetContext } from '@/lib/auth-middleware'
import { COLLECTIONS } from '@/lib/schema'
import { recordCheckIn } from '@/lib/attendance-engine'
import type { BusinessContext } from '@/types'
import { isWorkDay, isWithinWorkHours, todayString, buildAttendanceRecordId } from '@/lib/utils'

// ─────────────────────────────────────────────
// POST /api/cyan/attendance/checkin
//
// Called automatically when a team member opens the
// dashboard. The client fires this once per day —
// idempotent: returns existing record if already checked in.
//
// Uses the business's workSchedule from businessContext
// to determine scheduled hours and detect lateness.
// ─────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const auth = await verifyAuthAndGetContext(req)
  if (!auth.success) {
    return NextResponse.json({ error: auth.error.error }, { status: auth.error.status })
  }

  const { businessId, uid } = auth.context

  // Fetch business context to get work schedule
  const ctxSnap = await adminDb.doc(COLLECTIONS.businessContext(businessId)).get()
  if (!ctxSnap.exists) {
    return NextResponse.json({ error: 'Business context not found' }, { status: 404 })
  }

  const ctx = ctxSnap.data() as BusinessContext
  const { workSchedule, roles } = ctx.team

  // Get member name from team roles
  const memberRole = roles.find(r => r.memberId === uid)
  const memberName = memberRole?.name ?? 'Team member'

  try {
    const record = await recordCheckIn({
      memberId: uid,
      memberName,
      businessId,
      scheduledStart: workSchedule.workStartTime,
      scheduledEnd: workSchedule.workEndTime,
      timezone: workSchedule.timezone,
    })

    // Also update the team member's isOnline status
    const memberDocPath = COLLECTIONS.teamMember(businessId, uid)
    await adminDb.doc(memberDocPath).update({
      isOnline: true,
      lastSeenAt: new Date(),
    })

    return NextResponse.json({
      record,
      isWorkDay: isWorkDay(workSchedule.workDays, workSchedule.timezone),
      isWithinHours: isWithinWorkHours(
        workSchedule.workStartTime,
        workSchedule.workEndTime,
        workSchedule.timezone
      ),
    })
  } catch (err) {
    console.error('[attendance/checkin] Error:', err)
    return NextResponse.json({ error: 'Failed to record check-in' }, { status: 500 })
  }
}

// ─────────────────────────────────────────────
// GET /api/cyan/attendance/checkin
// Returns today's attendance record for the current user
// ─────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const auth = await verifyAuthAndGetContext(req)
  if (!auth.success) {
    return NextResponse.json({ error: auth.error.error }, { status: auth.error.status })
  }

  const { businessId, uid } = auth.context
  const date = todayString()

  const recordId = buildAttendanceRecordId(date, uid)
  const snap = await adminDb.doc(COLLECTIONS.attendanceRecord(businessId, recordId)).get()

  if (!snap.exists) {
    return NextResponse.json({ record: null })
  }

  return NextResponse.json({ record: snap.data() })
}
