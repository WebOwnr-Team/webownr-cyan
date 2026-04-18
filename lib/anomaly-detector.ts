import { Timestamp } from 'firebase-admin/firestore'
import { adminDb } from '@/firebase/firebaseAdmin'
import { COLLECTIONS } from '@/lib/schema'
import { selectContext, buildSystemPrompt } from '@/lib/context-selector'
import { haikuCompletion, sonnetCompletion } from '@/lib/anthropic-client'
import { logTokenUsage } from '@/lib/token-tracker'
import {
  ANOMALY_THRESHOLDS,
  type CreateAlertPayload,
  type CyanAlert,
  type AlertCategory,
  type AlertSeverity,
} from '@/types'
import type { BusinessContext, BusinessPerformance } from '@/types'
import { percentageDelta, currentMonth, generateId } from '@/lib/utils'
import type { FirestoreTimestamp } from '@/types'

// ─────────────────────────────────────────────
// Anomaly Detector — server-side only
//
// Called on a schedule (or on-demand from the API).
// Compares live metric snapshots against the baselines
// stored in businessContext.performance.
//
// When an anomaly is detected:
//   1. Cyan analyses it with a Sonnet call
//   2. A CyanAlert document is written to Firestore
//   3. The alert title is added to cyanMemory.openRecommendations
//
// Haiku handles pattern-matching; Sonnet handles
// root-cause analysis on confirmed anomalies only.
// ─────────────────────────────────────────────

// ── Live metrics snapshot — provided by the caller ───────────────────────────

export interface LiveMetricsSnapshot {
  currentWeekRevenue: number        // NGN
  lastWeekRevenue: number           // NGN — for week-over-week delta
  cartAbandonmentRate: number       // 0–100 percentage
  pendingOrders: number
  overdueInvoicesCount: number
  overdueInvoicesTotal: number      // NGN
  teamPresentCount: number
  teamTotalCount: number
  trafficThisWeek: number           // page views / store visits
  trafficLastWeek: number
  topProductStockLevels: Record<string, number> // productName → stock count
}

// ── Core anomaly detection ────────────────────────────────────────────────────

export interface DetectedAnomaly {
  category: AlertCategory
  severity: AlertSeverity
  title: string
  rawData: Record<string, unknown>
  percentageDelta?: number
}

export function detectAnomalies(
  snapshot: LiveMetricsSnapshot,
  baseline: BusinessPerformance
): DetectedAnomaly[] {
  const anomalies: DetectedAnomaly[] = []

  // 1. Revenue drop vs weekly average
  if (baseline.avgWeeklyRevenue > 0 && snapshot.currentWeekRevenue > 0) {
    const delta = percentageDelta(snapshot.currentWeekRevenue, baseline.avgWeeklyRevenue)
    if (delta <= -ANOMALY_THRESHOLDS.REVENUE_DROP_PERCENT) {
      anomalies.push({
        category: 'revenue_drop',
        severity: delta <= -40 ? 'critical' : 'warning',
        title: `Revenue down ${Math.abs(delta)}% vs weekly average`,
        rawData: {
          currentWeekRevenue: snapshot.currentWeekRevenue,
          avgWeeklyRevenue: baseline.avgWeeklyRevenue,
          deltaPercent: delta,
        },
        percentageDelta: delta,
      })
    }
    // Also flag a spike — positive anomaly worth surfacing
    if (delta >= 30) {
      anomalies.push({
        category: 'revenue_spike',
        severity: 'info',
        title: `Revenue up ${delta}% vs weekly average`,
        rawData: {
          currentWeekRevenue: snapshot.currentWeekRevenue,
          avgWeeklyRevenue: baseline.avgWeeklyRevenue,
          deltaPercent: delta,
        },
        percentageDelta: delta,
      })
    }
  }

  // 2. Traffic drop
  if (snapshot.trafficLastWeek > 0 && snapshot.trafficThisWeek > 0) {
    const delta = percentageDelta(snapshot.trafficThisWeek, snapshot.trafficLastWeek)
    if (delta <= -ANOMALY_THRESHOLDS.TRAFFIC_DROP_PERCENT) {
      anomalies.push({
        category: 'traffic_drop',
        severity: delta <= -50 ? 'critical' : 'warning',
        title: `Store traffic down ${Math.abs(delta)}% this week`,
        rawData: {
          trafficThisWeek: snapshot.trafficThisWeek,
          trafficLastWeek: snapshot.trafficLastWeek,
          deltaPercent: delta,
        },
        percentageDelta: delta,
      })
    }
  }

  // 3. Cart abandonment spike
  if (snapshot.cartAbandonmentRate > 0) {
    const baselineAbandonmentRate = 60 // industry average baseline — per-business tracking added in Phase 9+
    const delta = percentageDelta(snapshot.cartAbandonmentRate, baselineAbandonmentRate)
    if (delta >= ANOMALY_THRESHOLDS.ABANDONMENT_SPIKE_PERCENT) {
      anomalies.push({
        category: 'high_abandonment',
        severity: snapshot.cartAbandonmentRate >= 85 ? 'critical' : 'warning',
        title: `Cart abandonment rate at ${snapshot.cartAbandonmentRate}%`,
        rawData: {
          cartAbandonmentRate: snapshot.cartAbandonmentRate,
          baseline: baselineAbandonmentRate,
        },
      })
    }
  }

  // 4. Overdue invoices
  if (snapshot.overdueInvoicesCount >= 1) {
    anomalies.push({
      category: 'overdue_invoice',
      severity: snapshot.overdueInvoicesCount >= 3 ? 'warning' : 'info',
      title: `${snapshot.overdueInvoicesCount} overdue invoice${snapshot.overdueInvoicesCount > 1 ? 's' : ''}`,
      rawData: {
        count: snapshot.overdueInvoicesCount,
        totalOverdue: snapshot.overdueInvoicesTotal,
      },
    })
  }

  // 5. Goal off-track check
  if (baseline.revenueBaseline > 0 && snapshot.currentWeekRevenue > 0) {
    const weeklyTargetFromBaseline = baseline.revenueBaseline
    const pacePercent = percentageDelta(snapshot.currentWeekRevenue, weeklyTargetFromBaseline)
    if (pacePercent <= -ANOMALY_THRESHOLDS.GOAL_OFF_TRACK_PERCENT) {
      anomalies.push({
        category: 'goal_off_track',
        severity: 'warning',
        title: `Revenue ${Math.abs(pacePercent)}% below target pace`,
        rawData: {
          currentWeekRevenue: snapshot.currentWeekRevenue,
          weeklyTarget: weeklyTargetFromBaseline,
          pacePercent,
        },
        percentageDelta: pacePercent,
      })
    }
  }

  // 6. Low inventory — flag products with zero or near-zero stock
  const lowStockProducts = Object.entries(snapshot.topProductStockLevels)
    .filter(([, stock]) => stock <= 3)
    .map(([name]) => name)

  if (lowStockProducts.length > 0) {
    anomalies.push({
      category: 'inventory_low',
      severity: lowStockProducts.some(p => snapshot.topProductStockLevels[p] === 0)
        ? 'warning'
        : 'info',
      title: `Low stock: ${lowStockProducts.slice(0, 3).join(', ')}${lowStockProducts.length > 3 ? ` +${lowStockProducts.length - 3} more` : ''}`,
      rawData: { lowStockProducts, stockLevels: snapshot.topProductStockLevels },
    })
  }

  return anomalies
}

// ── Generate Cyan's analysis for a confirmed anomaly ─────────────────────────

export async function analyseAnomaly(
  anomaly: DetectedAnomaly,
  ctx: BusinessContext
): Promise<{ summary: string; recommendation: string; tokensUsed: number }> {
  const selectedCtx = selectContext('anomaly_analysis', ctx)
  const systemPrompt = buildSystemPrompt(selectedCtx)

  const userPrompt = `Anomaly detected for ${ctx.identity.businessName}:

Category: ${anomaly.category}
Severity: ${anomaly.severity}
What happened: ${anomaly.title}
Raw data: ${JSON.stringify(anomaly.rawData, null, 2)}

Respond ONLY with a JSON object:
{
  "summary": "2-3 sentences. What this means for the business specifically. Use real numbers from the data. Never generic.",
  "recommendation": "One specific action the founder should take right now. Start with a verb. Be concrete."
}`

  // Use Sonnet for critical, Haiku for info/warning
  const result = anomaly.severity === 'critical'
    ? await sonnetCompletion(systemPrompt, [{ role: 'user', content: userPrompt }], 400)
    : await haikuCompletion(systemPrompt, userPrompt, 300)

  let parsed: { summary: string; recommendation: string } = {
    summary: anomaly.title,
    recommendation: 'Review your dashboard for more details.',
  }

  try {
    const clean = result.content.replace(/```json|```/g, '').trim()
    parsed = JSON.parse(clean)
  } catch {
    parsed.summary = result.content.slice(0, 200)
  }

  return {
    summary: parsed.summary,
    recommendation: parsed.recommendation,
    tokensUsed: result.inputTokens + result.outputTokens,
  }
}

// ── Write a CyanAlert to Firestore ────────────────────────────────────────────

export async function createAlert(payload: CreateAlertPayload): Promise<CyanAlert> {
  const alertId = generateId()
  const alert: CyanAlert = {
    alertId,
    businessId: payload.businessId,
    category: payload.category,
    severity: payload.severity,
    status: 'active',
    title: payload.title,
    summary: payload.summary,
    recommendation: payload.recommendation,
    dataSnapshot: payload.dataSnapshot,
    detectedAt: Timestamp.now() as unknown as FirestoreTimestamp,
    acknowledgedAt: null,
    resolvedAt: null,
    resolvedBy: null,
  }

  await adminDb
    .doc(COLLECTIONS.cyanAlert(payload.businessId, alertId))
    .set(alert)

  return alert
}

// ── Dedup check — don't re-alert for the same active issue ───────────────────

export async function hasActiveAlert(
  businessId: string,
  category: AlertCategory
): Promise<boolean> {
  const snap = await adminDb
    .collection(COLLECTIONS.cyanAlerts(businessId))
    .where('category', '==', category)
    .where('status', '==', 'active')
    .limit(1)
    .get()

  return !snap.empty
}

// ── Full monitoring run — detect + analyse + write alerts ────────────────────

export async function runMonitoringCycle(
  businessId: string,
  snapshot: LiveMetricsSnapshot
): Promise<{ alertsCreated: number; alerts: CyanAlert[] }> {
  // Fetch business context
  const ctxSnap = await adminDb.doc(COLLECTIONS.businessContext(businessId)).get()
  if (!ctxSnap.exists) {
    return { alertsCreated: 0, alerts: [] }
  }
  const ctx = ctxSnap.data() as BusinessContext

  // Detect anomalies against stored baselines
  const anomalies = detectAnomalies(snapshot, ctx.performance)

  if (anomalies.length === 0) {
    return { alertsCreated: 0, alerts: [] }
  }

  const createdAlerts: CyanAlert[] = []
  let totalTokensUsed = 0

  for (const anomaly of anomalies) {
    // Skip if we already have an active alert for this category
    const alreadyAlerted = await hasActiveAlert(businessId, anomaly.category)
    if (alreadyAlerted) continue

    // Analyse with Cyan
    const analysis = await analyseAnomaly(anomaly, ctx)
    totalTokensUsed += analysis.tokensUsed

    // Create the alert
    const alert = await createAlert({
      businessId,
      category: anomaly.category,
      severity: anomaly.severity,
      title: anomaly.title,
      summary: analysis.summary,
      recommendation: analysis.recommendation,
      dataSnapshot: anomaly.rawData,
    })

    createdAlerts.push(alert)

    // Add to cyanMemory.openRecommendations
    const contextRef = adminDb.doc(COLLECTIONS.businessContext(businessId))
    const existing = ctx.cyanMemory.openRecommendations ?? []
    await contextRef.update({
      'cyanMemory.openRecommendations': [
        ...existing,
        {
          id: alert.alertId,
          text: alert.title,
          createdAt: Timestamp.now(),
          status: 'open',
        },
      ],
      updatedAt: Timestamp.now(),
    })
  }

  // Log token usage for the whole monitoring run
  if (totalTokensUsed > 0) {
    await logTokenUsage({
      businessId,
      month: currentMonth(),
      feature: 'monitoring_cycle',
      model: anomalies.some(a => a.severity === 'critical')
        ? 'claude-sonnet-4-5'
        : 'claude-haiku-4-5-20251001',
      inputTokens: Math.floor(totalTokensUsed * 0.6),
      outputTokens: Math.floor(totalTokensUsed * 0.4),
      memberId: 'system',
    })
  }

  return { alertsCreated: createdAlerts.length, alerts: createdAlerts }
}
