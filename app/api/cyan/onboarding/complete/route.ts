import { NextRequest, NextResponse } from 'next/server'
import { Timestamp } from 'firebase-admin/firestore'
import { adminDb } from '@/firebase/firebaseAdmin'
import { verifyAuthOnly } from '@/lib/auth-middleware'
import {
  buildInitialBusinessContext,
  buildFounderTeamMember,
  buildInitialTokenUsage,
} from '@/lib/schema.server'
import { COLLECTIONS, DEFAULT_WORK_SCHEDULE } from '@/lib/schema'
import {
  buildGoalsFromOnboarding,
  buildBusinessDescription,
  inferIndustry,
} from '@/lib/onboarding'
import type { OnboardingState, ProductType } from '@/types'

// ─────────────────────────────────────────────
// POST /api/cyan/onboarding/complete
//
// Called when the founder finishes all 5 onboarding steps.
// Creates three documents atomically via a batch write:
//   - businessContext/{businessId}
//   - teamMembers/{businessId}/members/{uid}  (founder record)
//   - tokenUsage/{businessId}/{month}          (initial usage doc)
//
// Uses verifyAuthOnly() — no teamMembers doc exists yet,
// so verifyAuthAndGetContext() would fail at this stage.
// businessId = Firebase Auth UID of the founder (clean 1:1 mapping).
// ─────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // 1. Verify Firebase auth token
  const auth = await verifyAuthOnly(req)
  if (!auth.success) {
    return NextResponse.json({ error: auth.error.error }, { status: auth.error.status })
  }

  const { uid, email } = auth

  // 2. Parse request body
  let body: { state: OnboardingState; displayName: string }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { state, displayName } = body

  // 3. Validate required fields
  if (!state.businessName?.trim()) {
    return NextResponse.json({ error: 'Business name is required.' }, { status: 400 })
  }
  if (!state.productType) {
    return NextResponse.json({ error: 'Business type is required.' }, { status: 400 })
  }
  if (!state.targetCustomer?.trim()) {
    return NextResponse.json({ error: 'Target customer description is required.' }, { status: 400 })
  }
  if (!state.primary90Day?.trim()) {
    return NextResponse.json({ error: '90-day goal is required.' }, { status: 400 })
  }

  const businessId = uid
  const workSchedule = state.workSchedule ?? DEFAULT_WORK_SCHEDULE
  const founderName = displayName?.trim() || email?.split('@')[0] || 'Founder'

  // 4. Build Firestore documents
  const businessContext = buildInitialBusinessContext({
    businessId,
    ownerId: uid,
    identity: {
      businessName: state.businessName.trim(),
      industry: inferIndustry(state.productType as ProductType),
      productType: state.productType as ProductType,
      targetCustomer: state.targetCustomer.trim(),
      revenueModel: state.revenueModel || 'Not Specified',
      businessDescription: buildBusinessDescription(state),
    },
    goals: buildGoalsFromOnboarding(state),
    team: {
      size: 1,
      roles: [
        {
          memberId: uid,
          name: founderName,
          role: 'founder',
          department: 'general',
        },
      ],
      workSchedule,
    },
  })

  const founderMember = buildFounderTeamMember({
    memberId: uid,
    businessId,
    name: founderName,
    email: email ?? '',
  })

  const now = new Date()
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const initialTokenUsage = buildInitialTokenUsage({
    businessId,
    plan: 'growth',
    month,
  })

  // 5. Atomic batch write
  try {
    const batch = adminDb.batch()

    // businessContext document
    const contextRef = adminDb.doc(COLLECTIONS.businessContext(businessId))
    batch.set(contextRef, {
      ...businessContext,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    })

    // Founder team member document
    const memberRef = adminDb.doc(COLLECTIONS.teamMember(businessId, uid))
    batch.set(memberRef, {
      ...founderMember,
      joinedAt: Timestamp.now(),
    })

    // Initial token usage document
    const tokenRef = adminDb.doc(COLLECTIONS.tokenUsageMonth(businessId, month))
    batch.set(tokenRef, {
      ...initialTokenUsage,
      updatedAt: Timestamp.now(),
    })

    await batch.commit()

    return NextResponse.json({
      success: true,
      businessId,
      businessName: state.businessName.trim(),
    })

  } catch (err) {
    console.error('[onboarding/complete] Batch write failed:', err)

    // Surface a useful message — most common cause is missing/invalid
    // FIREBASE_SERVICE_ACCOUNT_KEY env var in production.
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json(
      {
        error: 'Failed to save your workspace setup. Please try again.',
        detail: process.env.NODE_ENV === 'development' ? message : undefined,
      },
      { status: 500 }
    )
  }
}