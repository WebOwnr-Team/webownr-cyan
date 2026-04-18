import { NextRequest, NextResponse } from 'next/server'
import { Timestamp } from 'firebase-admin/firestore'
import { adminDb } from '@/firebase/firebaseAdmin'
import { verifyAuthOnly } from '@/lib/auth-middleware'
import {
  buildInitialBusinessContext,
  buildFounderTeamMember,
  buildInitialTokenUsage,
  COLLECTIONS,
} from '@/lib/schema'
import {
  buildGoalsFromOnboarding,
  buildBusinessDescription,
  inferIndustry,
} from '@/lib/onboarding'
import type { OnboardingState, ProductType } from '@/types'
import { DEFAULT_WORK_SCHEDULE } from '@/lib/schema'

// ─────────────────────────────────────────────
// POST /api/cyan/onboarding/complete
//
// Called when the founder finishes all 5 onboarding steps.
// Creates:
//   - businessContext/{businessId}
//   - teamMembers/{businessId}/members/{uid}  (founder record)
//   - tokenUsage/{businessId}/{month}          (initial usage doc)
//
// Uses verifyAuthOnly() — no teamMembers doc exists yet,
// so verifyAuthAndGetContext() would fail at this stage.
// businessId is generated server-side as the Firebase Auth uid
// of the founder — clean 1:1 mapping, no separate ID needed.
// ─────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // 1. Verify auth token
  const auth = await verifyAuthOnly(req)
  if (!auth.success) {
    return NextResponse.json({ error: auth.error.error }, { status: auth.error.status })
  }

  const { uid, email } = auth

  // 2. Parse and validate request body
  let body: {
    state: OnboardingState
    displayName: string
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { state, displayName } = body

  // Basic validation — critical fields must be present
  if (!state.businessName?.trim()) {
    return NextResponse.json({ error: 'businessName is required' }, { status: 400 })
  }
  if (!state.productType) {
    return NextResponse.json({ error: 'productType is required' }, { status: 400 })
  }
  if (!state.targetCustomer?.trim()) {
    return NextResponse.json({ error: 'targetCustomer is required' }, { status: 400 })
  }
  if (!state.primary90Day?.trim()) {
    return NextResponse.json({ error: 'primary90Day is required' }, { status: 400 })
  }

  // 3. businessId = founder's uid (clean 1:1 mapping)
  const businessId = uid
  const workSchedule = state.workSchedule ?? DEFAULT_WORK_SCHEDULE

  // 4. Build documents
  const businessContext = buildInitialBusinessContext({
    businessId,
    ownerId: uid,
    identity: {
      businessName: state.businessName.trim(),
      industry: inferIndustry(state.productType as ProductType),
      productType: state.productType as ProductType,
      targetCustomer: state.targetCustomer.trim(),
      businessDescription: buildBusinessDescription(state),
    },
    goals: buildGoalsFromOnboarding(state),
    team: {
      size: 1,
      roles: [
        {
          memberId: uid,
          name: displayName || email?.split('@')[0] || 'Founder',
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
    name: displayName || email?.split('@')[0] || 'Founder',
    email: email ?? '',
  })

  // Get current month for token usage init
  const now = new Date()
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const initialTokenUsage = buildInitialTokenUsage({
    businessId,
    plan: 'growth',  // all new accounts start on growth plan
    month,
  })

  // 5. Write all three documents in a batch — atomic
  try {
    const batch = adminDb.batch()

    // businessContext
    const contextRef = adminDb.doc(COLLECTIONS.businessContext(businessId))
    // Convert to plain object for Admin SDK (it doesn't accept class instances)
    batch.set(contextRef, {
      ...businessContext,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    })

    // teamMembers — founder record
    const memberRef = adminDb.doc(COLLECTIONS.teamMember(businessId, uid))
    batch.set(memberRef, {
      ...founderMember,
      joinedAt: Timestamp.now(),
    })

    // tokenUsage — initial monthly doc
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
      message: 'Business context created successfully',
    })

  } catch (err) {
    console.error('[onboarding/complete] Firestore batch write failed:', err)
    return NextResponse.json(
      { error: 'Failed to save your business setup. Please try again.' },
      { status: 500 }
    )
  }
}
