import { Timestamp } from 'firebase-admin/firestore'
import { adminDb } from '@/firebase/firebaseAdmin'
import { COLLECTIONS, buildInitialTokenUsage } from '@/lib/schema'
import {
  PLAN_TOKEN_BUDGETS,
  PLAN_SONNET_SESSION_LIMITS,
  UPGRADE_PROMPT_THRESHOLD,
  type LogTokenUsagePayload,
  type MonthlyTokenUsage,
  type PricingPlan,
} from '@/types'
import { currentMonth, usagePercent, shouldShowUpgradePrompt } from '@/lib/utils'

// ─────────────────────────────────────────────
// Token Tracker — server-side only
//
// Called after EVERY Anthropic API call.
// Writes to tokenUsage/{businessId}/{YYYY-MM} via Admin SDK.
// Client write is blocked in Firestore security rules.
//
// Also enforces plan limits BEFORE making the API call —
// call checkTokenBudget() first, then call logTokenUsage() after.
// ─────────────────────────────────────────────

// ── Check budget BEFORE making an API call ───────────────────────────────────

export interface BudgetCheckResult {
  allowed: boolean
  reason?: string
  tokensRemaining: number
  usagePercent: number
  shouldPromptUpgrade: boolean
  plan: PricingPlan
}

export async function checkTokenBudget(
  businessId: string,
  estimatedTokens: number = 500
): Promise<BudgetCheckResult> {
  const month = currentMonth()
  const docPath = COLLECTIONS.tokenUsageMonth(businessId, month)

  try {
    const snap = await adminDb.doc(docPath).get()

    if (!snap.exists) {
      // No usage doc yet — create it (Growth plan default) and allow
      await adminDb.doc(docPath).set(
        buildInitialTokenUsage({ businessId, plan: 'growth', month })
      )
      return {
        allowed: true,
        tokensRemaining: PLAN_TOKEN_BUDGETS['growth'],
        usagePercent: 0,
        shouldPromptUpgrade: false,
        plan: 'growth',
      }
    }

    const usage = snap.data() as MonthlyTokenUsage
    const { plan, tokenBudget, tokensUsed } = usage

    // Infinite budget (enterprise) — always allow
    if (tokenBudget === Infinity || plan === 'enterprise') {
      return {
        allowed: true,
        tokensRemaining: Infinity,
        usagePercent: 0,
        shouldPromptUpgrade: false,
        plan,
      }
    }

    const remaining = tokenBudget - tokensUsed
    const pct = usagePercent(tokensUsed, tokenBudget)
    const promptUpgrade = shouldShowUpgradePrompt(tokensUsed, tokenBudget)

    if (remaining <= 0) {
      return {
        allowed: false,
        reason: `Monthly token budget exhausted. Upgrade to Business plan for 200,000 tokens/month.`,
        tokensRemaining: 0,
        usagePercent: 100,
        shouldPromptUpgrade: true,
        plan,
      }
    }

    // Warn if this call would exceed budget
    if (estimatedTokens > remaining) {
      return {
        allowed: false,
        reason: `This request needs ~${estimatedTokens} tokens but only ${remaining} remain this month.`,
        tokensRemaining: remaining,
        usagePercent: pct,
        shouldPromptUpgrade: true,
        plan,
      }
    }

    return {
      allowed: true,
      tokensRemaining: remaining,
      usagePercent: pct,
      shouldPromptUpgrade: promptUpgrade,
      plan,
    }
  } catch (err) {
    console.error('[checkTokenBudget] Error:', err)
    // Fail open on error — don't block the user due to tracking issues
    return {
      allowed: true,
      tokensRemaining: 999,
      usagePercent: 0,
      shouldPromptUpgrade: false,
      plan: 'growth',
    }
  }
}

// ── Check Sonnet session limit BEFORE a Sonnet call ──────────────────────────

export async function checkSonnetLimit(businessId: string): Promise<{
  allowed: boolean
  sessionsUsed: number
  sessionLimit: number
  reason?: string
}> {
  const month = currentMonth()
  const snap = await adminDb.doc(COLLECTIONS.tokenUsageMonth(businessId, month)).get()

  if (!snap.exists) {
    return { allowed: true, sessionsUsed: 0, sessionLimit: PLAN_SONNET_SESSION_LIMITS['growth'] }
  }

  const usage = snap.data() as MonthlyTokenUsage
  const limit = usage.sonnetSessionLimit

  if (limit === Infinity) {
    return { allowed: true, sessionsUsed: usage.sonnetSessionsUsed, sessionLimit: Infinity }
  }

  if (usage.sonnetSessionsUsed >= limit) {
    return {
      allowed: false,
      sessionsUsed: usage.sonnetSessionsUsed,
      sessionLimit: limit,
      reason: `You've used all ${limit} Sonnet sessions this month. Upgrade to Business plan for unlimited Sonnet access. I'll use a faster model for now.`,
    }
  }

  return { allowed: true, sessionsUsed: usage.sonnetSessionsUsed, sessionLimit: limit }
}

// ── Log usage AFTER a successful API call ────────────────────────────────────

export async function logTokenUsage(payload: LogTokenUsagePayload): Promise<void> {
  const { businessId, month, feature, model, inputTokens, outputTokens, memberId } = payload
  const totalTokens = inputTokens + outputTokens
  const docPath = COLLECTIONS.tokenUsageMonth(businessId, month)

  try {
    const snap = await adminDb.doc(docPath).get()

    const entry = {
      feature,
      model,
      inputTokens,
      outputTokens,
      totalTokens,
      usedAt: Timestamp.now(),
      memberId,
    }

    if (!snap.exists) {
      // Create the doc if it doesn't exist yet
      const initial = buildInitialTokenUsage({ businessId, plan: 'growth', month })
      await adminDb.doc(docPath).set({
        ...initial,
        tokensUsed: totalTokens,
        tokensRemaining: initial.tokenBudget - totalTokens,
        sonnetSessionsUsed: model === 'claude-sonnet-4-5' ? 1 : 0,
        usagePercent: usagePercent(totalTokens, initial.tokenBudget),
        entries: [entry],
        updatedAt: Timestamp.now(),
      })
      return
    }

    const current = snap.data() as MonthlyTokenUsage
    const newUsed = current.tokensUsed + totalTokens
    const newRemaining = Math.max(0, current.tokenBudget - newUsed)
    const newPct = usagePercent(newUsed, current.tokenBudget)
    const upgradePromptShown =
      current.upgradePromptShown ||
      shouldShowUpgradePrompt(newUsed, current.tokenBudget)

    // Cap entries array at 100 to avoid unbounded growth
    const entries = [...(current.entries ?? []), entry].slice(-100)

    await adminDb.doc(docPath).update({
      tokensUsed: newUsed,
      tokensRemaining: newRemaining,
      usagePercent: newPct,
      upgradePromptShown,
      entries,
      ...(model === 'claude-sonnet-4-5' && {
        sonnetSessionsUsed: (current.sonnetSessionsUsed ?? 0) + 1,
      }),
      updatedAt: Timestamp.now(),
    })
  } catch (err) {
    // Log but don't throw — token tracking failure must never block the user
    console.error('[logTokenUsage] Failed to log token usage:', err)
  }
}

// ── Get current month's usage summary ────────────────────────────────────────

export async function getTokenUsageSummary(businessId: string): Promise<MonthlyTokenUsage | null> {
  const month = currentMonth()
  try {
    const snap = await adminDb.doc(COLLECTIONS.tokenUsageMonth(businessId, month)).get()
    if (!snap.exists) return null
    return snap.data() as MonthlyTokenUsage
  } catch {
    return null
  }
}

// ── Build upgrade prompt suffix for Cyan responses ───────────────────────────
// Appended to Cyan's message when usage hits 80%+

export function buildUpgradePromptSuffix(usagePct: number, plan: PricingPlan): string {
  if (plan === 'enterprise') return ''
  if (usagePct < 80) return ''

  if (plan === 'growth') {
    return `\n\n---\n*You've used ${usagePct}% of your monthly Cyan token budget. Upgrade to Business plan (₦65,000/month) for 4× more tokens and unlimited Sonnet sessions.*`
  }
  return `\n\n---\n*You've used ${usagePct}% of your monthly token budget. Contact support to increase your allocation.*`
}
