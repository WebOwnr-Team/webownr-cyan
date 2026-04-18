import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/firebase/firebaseAdmin'
import { verifyAuthAndGetContext } from '@/lib/auth-middleware'
import { COLLECTIONS } from '@/lib/schema'
import {
  buildAttendanceSummary,
  getTodayAttendance,
  getMemberAttendanceHistory,
} from '@/lib/attendance-engine'
import { todayString } from '@/lib/utils'

// ─────────────────────────────────────────────
// GET /api/cyan/attendance/summary
//
// Query params:
//   ?type=today          → today's full summary (founder)
//   ?type=history        → last 30 days for current user
//   ?type=member&id=uid  → history for a specific member (founder only)
//   ?type=records        → all raw records for today (founder only)
// ─────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const auth = await verifyAuthAndGetContext(req)
  if (!auth.success) {
    return NextResponse.json({ error: auth.error.error }, { status: auth.error.status })
  }

  const { businessId, uid } = auth.context
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') ?? 'today'
  const date = searchParams.get('date') ?? todayString()

  try {
    switch (type) {
      case 'today': {
        const summary = await buildAttendanceSummary(businessId, date)
        return NextResponse.json({ summary })
      }

      case 'records': {
        // Full raw records — founder view
        const records = await getTodayAttendance(businessId, date)
        return NextResponse.json({ records, date })
      }

      case 'history': {
        // Current user's own history
        const limit = parseInt(searchParams.get('limit') ?? '30', 10)
        const records = await getMemberAttendanceHistory(businessId, uid, limit)
        return NextResponse.json({ records, memberId: uid })
      }

      case 'member': {
        // Specific member history — validate the requester is the owner
        const targetMemberId = searchParams.get('id')
        if (!targetMemberId) {
          return NextResponse.json({ error: 'Member id is required' }, { status: 400 })
        }

        // Confirm requester is the business owner
        const ctxSnap = await adminDb.doc(COLLECTIONS.businessContext(businessId)).get()
        if (!ctxSnap.exists) {
          return NextResponse.json({ error: 'Business not found' }, { status: 404 })
        }

        const ownerId = ctxSnap.data()?.identity?.ownerId as string
        if (ownerId !== uid) {
          return NextResponse.json(
            { error: 'Only the business owner can view other members\' history' },
            { status: 403 }
          )
        }

        const limit = parseInt(searchParams.get('limit') ?? '30', 10)
        const records = await getMemberAttendanceHistory(businessId, targetMemberId, limit)
        return NextResponse.json({ records, memberId: targetMemberId })
      }

      default:
        return NextResponse.json({ error: `Unknown summary type: ${type}` }, { status: 400 })
    }
  } catch (err) {
    console.error('[attendance/summary] Error:', err)
    return NextResponse.json({ error: 'Failed to fetch attendance data' }, { status: 500 })
  }
}
