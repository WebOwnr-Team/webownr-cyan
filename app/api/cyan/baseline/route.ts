import { NextRequest, NextResponse } from 'next/server'
import { Timestamp } from 'firebase-admin/firestore'
import { adminDb } from '@/firebase/firebaseAdmin'
import { verifyAuthAndGetContext } from '@/lib/auth-middleware'
import { COLLECTIONS } from '@/lib/schema'
import type { BusinessPerformance } from '@/types'

// ─────────────────────────────────────────────
// PATCH /api/cyan/baseline
//
// Updates the performance baseline in businessContext.
// This is the data the anomaly detector compares against.
// Called from: settings page, onboarding completion,
//              manual "set baseline" action in dashboard.
//
// GET /api/cyan/baseline
// Returns the current performance section of businessContext.
// ─────────────────────────────────────────────

export async function PATCH(req: NextRequest) {
  const auth = await verifyAuthAndGetContext(req)
  if (!auth.success) {
    return NextResponse.json({ error: auth.error.error }, { status: auth.error.status })
  }

  const { businessId } = auth.context

  let body: Partial<BusinessPerformance>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  // Whitelist allowed fields — never let client overwrite arbitrary paths
  const allowed: (keyof BusinessPerformance)[] = [
    'avgWeeklyRevenue',
    'avgOrderValue',
    'topProducts',
    'revenueBaseline',
    'churnSignals',
    'growthRate',
  ]

  const updates: Record<string, unknown> = { updatedAt: Timestamp.now() }
  for (const key of allowed) {
    if (key in body && body[key] !== undefined) {
      updates[`performance.${key}`] = body[key]
    }
  }

  if (Object.keys(updates).length === 1) {
    return NextResponse.json({ error: 'No valid fields provided' }, { status: 400 })
  }

  try {
    await adminDb.doc(COLLECTIONS.businessContext(businessId)).update(updates)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[baseline PATCH] Error:', err)
    return NextResponse.json({ error: 'Failed to update baseline' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const auth = await verifyAuthAndGetContext(req)
  if (!auth.success) {
    return NextResponse.json({ error: auth.error.error }, { status: auth.error.status })
  }

  const { businessId } = auth.context

  try {
    const snap = await adminDb.doc(COLLECTIONS.businessContext(businessId)).get()
    if (!snap.exists) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }
    const data = snap.data()
    return NextResponse.json({ performance: data?.performance ?? {} })
  } catch (err) {
    console.error('[baseline GET] Error:', err)
    return NextResponse.json({ error: 'Failed to fetch baseline' }, { status: 500 })
  }
}
