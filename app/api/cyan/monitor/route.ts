import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthAndGetContext } from '@/lib/auth-middleware'
import { checkTokenBudget } from '@/lib/token-tracker'
import { runMonitoringCycle, type LiveMetricsSnapshot } from '@/lib/anomaly-detector'

// ─────────────────────────────────────────────
// POST /api/cyan/monitor
//
// Triggers a full monitoring cycle for the authenticated business.
// Called by:
//   - The dashboard on load (lightweight check)
//   - A scheduled cron job (Phase 6+ production setup)
//   - Manual "scan now" from the alerts page
//
// The caller provides a LiveMetricsSnapshot.
// In Phase 6 this snapshot is constructed from available data.
// In Phase 7+ it will be auto-assembled from connected integrations.
// ─────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const auth = await verifyAuthAndGetContext(req)
  if (!auth.success) {
    return NextResponse.json({ error: auth.error.error }, { status: auth.error.status })
  }

  const { businessId } = auth.context

  // Check token budget before running analysis
  const budget = await checkTokenBudget(businessId, 400)
  if (!budget.allowed) {
    return NextResponse.json(
      { error: budget.reason, upgradeRequired: true },
      { status: 402 }
    )
  }

  let snapshot: LiveMetricsSnapshot
  try {
    const body = await req.json()
    snapshot = body.snapshot as LiveMetricsSnapshot
    if (!snapshot || typeof snapshot !== 'object') {
      throw new Error('snapshot is required')
    }
  } catch {
    return NextResponse.json({ error: 'Valid metrics snapshot is required' }, { status: 400 })
  }

  try {
    const result = await runMonitoringCycle(businessId, snapshot)
    return NextResponse.json(result)
  } catch (err) {
    console.error('[monitor] Monitoring cycle failed:', err)
    return NextResponse.json({ error: 'Monitoring cycle failed' }, { status: 500 })
  }
}
