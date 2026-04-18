import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthAndGetContext } from '@/lib/auth-middleware'
import { getTokenUsageSummary } from '@/lib/token-tracker'
import { buildInitialTokenUsage } from '@/lib/schema'
import { currentMonth } from '@/lib/utils'

// ─────────────────────────────────────────────
// GET /api/cyan/tokens
//
// Returns the current month's token usage summary.
// Used by: dashboard token gauge, settings billing page.
// ─────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const auth = await verifyAuthAndGetContext(req)
  if (!auth.success) {
    return NextResponse.json({ error: auth.error.error }, { status: auth.error.status })
  }

  const { businessId } = auth.context

  const summary = await getTokenUsageSummary(businessId)

  if (!summary) {
    // Return a zeroed-out default — no usage yet
    const initial = buildInitialTokenUsage({ businessId, plan: 'growth', month: currentMonth() })
    return NextResponse.json({ usage: initial })
  }

  return NextResponse.json({ usage: summary })
}
