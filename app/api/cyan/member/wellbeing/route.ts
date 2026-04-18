import { NextRequest, NextResponse } from 'next/server'
import { Timestamp } from 'firebase-admin/firestore'
import { adminDb } from '@/firebase/firebaseAdmin'
import { verifyAuthAndGetContext } from '@/lib/auth-middleware'
import { COLLECTIONS } from '@/lib/schema'
import { todayString } from '@/lib/utils'

// ─────────────────────────────────────────────
// POST /api/cyan/member/wellbeing
//
// Submits a private weekly wellbeing score (1-5).
// The response is stored privately per member.
// The founder only sees the team aggregate — never individual scores.
//
// Cyan asks this once per week, privately.
// It never shames or judges — the data protects the team.
// ─────────────────────────────────────────────

interface WellbeingEntry {
  memberId: string
  score: number           // 1–5
  week: string            // 'YYYY-WW' — ISO week
  submittedAt: ReturnType<typeof Timestamp.now>
}

function getISOWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNum = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`
}

export async function POST(req: NextRequest) {
  const auth = await verifyAuthAndGetContext(req)
  if (!auth.success) {
    return NextResponse.json({ error: auth.error.error }, { status: auth.error.status })
  }

  const { businessId, uid } = auth.context

  let body: { score: number }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { score } = body
  if (!score || score < 1 || score > 5 || !Number.isInteger(score)) {
    return NextResponse.json({ error: 'score must be an integer between 1 and 5' }, { status: 400 })
  }

  const week = getISOWeek(new Date())

  // Store in a private sub-collection — not readable by teamMembers security rules directly
  // Only the founder (via Admin SDK in API routes) can aggregate these
  const docPath = `wellbeing/${businessId}/entries/${week}_${uid}`

  const entry: WellbeingEntry = {
    memberId: uid,
    score,
    week,
    submittedAt: Timestamp.now(),
  }

  try {
    await adminDb.doc(docPath).set(entry)
    return NextResponse.json({ success: true, week })
  } catch (err) {
    console.error('[wellbeing POST] Error:', err)
    return NextResponse.json({ error: 'Failed to submit wellbeing check-in' }, { status: 500 })
  }
}

// GET — check if this member has submitted for the current week
export async function GET(req: NextRequest) {
  const auth = await verifyAuthAndGetContext(req)
  if (!auth.success) {
    return NextResponse.json({ error: auth.error.error }, { status: auth.error.status })
  }

  const { businessId, uid } = auth.context
  const week = getISOWeek(new Date())
  const docPath = `wellbeing/${businessId}/entries/${week}_${uid}`

  const snap = await adminDb.doc(docPath).get()
  return NextResponse.json({ submitted: snap.exists, week })
}
