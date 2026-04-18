import { NextRequest, NextResponse } from 'next/server'
import { Timestamp } from 'firebase-admin/firestore'
import { adminDb } from '@/firebase/firebaseAdmin'
import { verifyAuthAndGetContext } from '@/lib/auth-middleware'
import { COLLECTIONS } from '@/lib/schema'

// ─────────────────────────────────────────────
// PATCH /api/cyan/context/update
//
// Updates specific fields in businessContext.
// Used for: post-onboarding settings, goal updates,
// performance baseline setting, Cyan memory updates.
//
// Body: { path: string, value: unknown }
// path uses dot notation: e.g. 'goals.sixMonthRevenue'
//
// Security: only the business owner can update their context.
// businessId is resolved server-side — never trusted from client.
// ─────────────────────────────────────────────

export async function PATCH(req: NextRequest) {
  const auth = await verifyAuthAndGetContext(req)
  if (!auth.success) {
    return NextResponse.json({ error: auth.error.error }, { status: auth.error.status })
  }

  const { businessId } = auth.context

  let body: { updates: Record<string, unknown> }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!body.updates || typeof body.updates !== 'object') {
    return NextResponse.json({ error: 'updates object is required' }, { status: 400 })
  }

  // Blocklist — these fields must never be updated via this endpoint
  const PROTECTED_PATHS = ['identity.businessId', 'identity.ownerId', 'createdAt']
  for (const key of Object.keys(body.updates)) {
    if (PROTECTED_PATHS.includes(key)) {
      return NextResponse.json(
        { error: `Field '${key}' cannot be updated via this endpoint` },
        { status: 403 }
      )
    }
  }

  try {
    const contextRef = adminDb.doc(COLLECTIONS.businessContext(businessId))
    await contextRef.update({
      ...body.updates,
      updatedAt: Timestamp.now(),
    })

    return NextResponse.json({ success: true })

  } catch (err) {
    console.error('[context/update] Update failed:', err)
    return NextResponse.json({ error: 'Failed to update business context' }, { status: 500 })
  }
}

// ─────────────────────────────────────────────
// GET /api/cyan/context/update
// Returns the current businessContext for the authenticated business.
// Used by: settings pages, the Cyan Business Context panel (Phase 7).
// ─────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const auth = await verifyAuthAndGetContext(req)
  if (!auth.success) {
    return NextResponse.json({ error: auth.error.error }, { status: auth.error.status })
  }

  const { businessId } = auth.context

  try {
    const contextRef = adminDb.doc(COLLECTIONS.businessContext(businessId))
    const snap = await contextRef.get()

    if (!snap.exists) {
      return NextResponse.json({ error: 'Business context not found' }, { status: 404 })
    }

    return NextResponse.json({ context: snap.data() })

  } catch (err) {
    console.error('[context/update GET] Failed:', err)
    return NextResponse.json({ error: 'Failed to fetch business context' }, { status: 500 })
  }
}
