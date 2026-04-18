import { NextRequest, NextResponse } from 'next/server'
import { Timestamp } from 'firebase-admin/firestore'
import { adminDb } from '@/firebase/firebaseAdmin'
import { verifyAuthAndGetContext } from '@/lib/auth-middleware'
import { COLLECTIONS } from '@/lib/schema'
import type { CyanAlert, AlertStatus, FirestoreTimestamp } from '@/types'

// ─────────────────────────────────────────────
// GET /api/cyan/alerts
// Returns all active (and recently resolved) alerts for the business.
// Query params:
//   ?status=active|acknowledged|resolved|all  (default: active)
//   ?limit=20  (default: 20, max: 50)
//
// PATCH /api/cyan/alerts
// Update alert status: acknowledge or resolve.
// Body: { alertId: string, status: 'acknowledged' | 'resolved' }
// ─────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const auth = await verifyAuthAndGetContext(req)
  if (!auth.success) {
    return NextResponse.json({ error: auth.error.error }, { status: auth.error.status })
  }

  const { businessId } = auth.context
  const { searchParams } = new URL(req.url)
  const statusFilter = searchParams.get('status') ?? 'active'
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 50)

  try {
    let query = adminDb
      .collection(COLLECTIONS.cyanAlerts(businessId))
      .orderBy('detectedAt', 'desc')
      .limit(limit)

    if (statusFilter !== 'all') {
      query = query.where('status', '==', statusFilter) as typeof query
    }

    const snap = await query.get()
    const alerts = snap.docs.map(doc => doc.data() as CyanAlert)

    return NextResponse.json({ alerts, count: alerts.length })
  } catch (err) {
    console.error('[alerts GET] Error:', err)
    return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await verifyAuthAndGetContext(req)
  if (!auth.success) {
    return NextResponse.json({ error: auth.error.error }, { status: auth.error.status })
  }

  const { businessId, uid } = auth.context

  let body: { alertId: string; status: AlertStatus }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { alertId, status } = body

  if (!alertId || !status) {
    return NextResponse.json({ error: 'alertId and status are required' }, { status: 400 })
  }

  const validStatuses: AlertStatus[] = ['acknowledged', 'resolved', 'dismissed']
  if (!validStatuses.includes(status)) {
    return NextResponse.json(
      { error: `status must be one of: ${validStatuses.join(', ')}` },
      { status: 400 }
    )
  }

  try {
    const alertRef = adminDb.doc(COLLECTIONS.cyanAlert(businessId, alertId))
    const alertSnap = await alertRef.get()

    if (!alertSnap.exists) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 })
    }

    const updates: Partial<CyanAlert> = { status }
    if (status === 'acknowledged') {
      updates.acknowledgedAt = Timestamp.now() as unknown as FirestoreTimestamp
    } else if (status === 'resolved' || status === 'dismissed') {
      updates.resolvedAt = Timestamp.now() as unknown as FirestoreTimestamp
      updates.resolvedBy = uid
    }

    await alertRef.update(updates)

    // If resolved/dismissed, also update cyanMemory.openRecommendations
    if (status === 'resolved' || status === 'dismissed') {
      const ctxRef = adminDb.doc(COLLECTIONS.businessContext(businessId))
      const ctxSnap = await ctxRef.get()
      if (ctxSnap.exists) {
        const ctx = ctxSnap.data()
        const recommendations = (ctx?.cyanMemory?.openRecommendations ?? []) as {
          id: string; status: string
        }[]
        const updated = recommendations.map(r =>
          r.id === alertId ? { ...r, status: status === 'resolved' ? 'acted' : 'dismissed' } : r
        )
        await ctxRef.update({
          'cyanMemory.openRecommendations': updated,
          updatedAt: Timestamp.now(),
        })
      }
    }

    return NextResponse.json({ success: true, alertId, status })
  } catch (err) {
    console.error('[alerts PATCH] Error:', err)
    return NextResponse.json({ error: 'Failed to update alert' }, { status: 500 })
  }
}
