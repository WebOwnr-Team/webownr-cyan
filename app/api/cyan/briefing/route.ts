import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/firebase/firebaseAdmin'
import { verifyAuthAndGetContext } from '@/lib/auth-middleware'
import { COLLECTIONS } from '@/lib/schema'
import {
  generateDailyBriefing,
  generatePersonalBriefing,
  generateWeeklyReport,
  getCachedDailyBriefing,
  getCachedPersonalBriefing,
  getCachedWeeklyReport,
} from '@/lib/briefing-generator'
import { checkTokenBudget } from '@/lib/token-tracker'
import type { BusinessContext } from '@/types'
import { todayString, getMondayOfWeek } from '@/lib/utils'

// ─────────────────────────────────────────────
// GET /api/cyan/briefing?type=daily|personal|weekly
//
// Cache-first briefing fetch.
// If a cached briefing exists for today, serve it instantly.
// If not, generate a new one (costs tokens) and cache it.
//
// daily   → founder's dashboard briefing card
// personal → team member's morning card
// weekly  → Monday full report
// ─────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const auth = await verifyAuthAndGetContext(req)
  if (!auth.success) {
    return NextResponse.json({ error: auth.error.error }, { status: auth.error.status })
  }
  const { businessId, uid } = auth.context

  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') ?? 'daily'
  const date = todayString()
  const weekStart = getMondayOfWeek()

  // Fetch businessContext — needed for generation
  const ctxSnap = await adminDb.doc(COLLECTIONS.businessContext(businessId)).get()
  if (!ctxSnap.exists) {
    return NextResponse.json({ error: 'Business context not found' }, { status: 404 })
  }
  const ctx = ctxSnap.data() as BusinessContext

  try {
    switch (type) {
      case 'daily': {
        // Cache-first
        const cached = await getCachedDailyBriefing(businessId, date)
        if (cached) return NextResponse.json({ briefing: cached, cached: true })

        // Check budget before generating
        const budget = await checkTokenBudget(businessId, 600)
        if (!budget.allowed) {
          return NextResponse.json({ error: budget.reason, upgradeRequired: true }, { status: 402 })
        }

        const briefing = await generateDailyBriefing(businessId, ctx, date)
        return NextResponse.json({ briefing, cached: false })
      }

      case 'personal': {
        const cached = await getCachedPersonalBriefing(businessId, uid, date)
        if (cached) return NextResponse.json({ briefing: cached, cached: true })

        const budget = await checkTokenBudget(businessId, 600)
        if (!budget.allowed) {
          return NextResponse.json({ error: budget.reason, upgradeRequired: true }, { status: 402 })
        }

        // Get member name from teamMembers collection
        const memberSnap = await adminDb.doc(COLLECTIONS.teamMember(businessId, uid)).get()
        const memberName = memberSnap.exists
          ? (memberSnap.data()?.name as string ?? 'Team member')
          : 'Team member'

        const briefing = await generatePersonalBriefing(businessId, uid, memberName, ctx, date)
        return NextResponse.json({ briefing, cached: false })
      }

      case 'weekly': {
        const cached = await getCachedWeeklyReport(businessId, weekStart)
        if (cached) return NextResponse.json({ briefing: cached, cached: true })

        const budget = await checkTokenBudget(businessId, 1500)
        if (!budget.allowed) {
          return NextResponse.json({ error: budget.reason, upgradeRequired: true }, { status: 402 })
        }

        const report = await generateWeeklyReport(businessId, ctx, weekStart)
        return NextResponse.json({ briefing: report, cached: false })
      }

      default:
        return NextResponse.json({ error: `Unknown briefing type: ${type}` }, { status: 400 })
    }
  } catch (err) {
    console.error(`[briefing/${type}] Generation failed:`, err)
    return NextResponse.json(
      { error: 'Failed to generate briefing. Please try again.' },
      { status: 500 }
    )
  }
}
