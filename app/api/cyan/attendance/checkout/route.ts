import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/firebase/firebaseAdmin'
import { verifyAuthAndGetContext } from '@/lib/auth-middleware'
import { COLLECTIONS } from '@/lib/schema'
import { recordCheckOut, generateAttendanceNote } from '@/lib/attendance-engine'
import type { BusinessContext } from '@/types'
import { todayString, buildAttendanceRecordId } from '@/lib/utils'

// ─────────────────────────────────────────────
// POST /api/cyan/attendance/checkout
//
// Called when a team member closes the platform
// or is detected as offline (via heartbeat timeout).
// Calculates hours worked, detects overtime extension,
// and triggers Cyan's attendance note generation.
// ─────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const auth = await verifyAuthAndGetContext(req)
  if (!auth.success) {
    return NextResponse.json({ error: auth.error.error }, { status: auth.error.status })
  }

  const { businessId, uid } = auth.context

  const date = todayString()

  // Fetch business name for Cyan note generation
  const ctxSnap = await adminDb.doc(COLLECTIONS.businessContext(businessId)).get()
  const businessName = ctxSnap.exists
    ? (ctxSnap.data() as BusinessContext).identity.businessName
    : 'your business'

  try {
    const record = await recordCheckOut(businessId, uid, date)

    if (!record) {
      return NextResponse.json({ error: 'No check-in record found for today' }, { status: 404 })
    }

    // Update online status
    await adminDb.doc(COLLECTIONS.teamMember(businessId, uid)).update({
      isOnline: false,
      lastSeenAt: new Date(),
    })

    // Generate Cyan note asynchronously — don't block the response
    // The note is written directly to the attendance record
    void (async () => {
      try {
        const note = await generateAttendanceNote(businessId, record, businessName)
        const recordId = buildAttendanceRecordId(date, uid)
        await adminDb.doc(COLLECTIONS.attendanceRecord(businessId, recordId)).update({
          cyanNote: note,
        })
      } catch (err) {
        console.error('[attendance/checkout] Note generation failed (non-critical):', err)
      }
    })()

    return NextResponse.json({
      record,
      hoursWorked: record.hoursWorked,
      status: record.status,
    })
  } catch (err) {
    console.error('[attendance/checkout] Error:', err)
    return NextResponse.json({ error: 'Failed to record check-out' }, { status: 500 })
  }
}
