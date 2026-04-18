import type { FirestoreTimestamp } from './attendance'

// ─────────────────────────────────────────────
// Token Usage Tracking
// Stored at: tokenUsage/{businessId}/{YYYY-MM}
// Written server-side only via Admin SDK
// ─────────────────────────────────────────────

export type PricingPlan = 'growth' | 'business' | 'enterprise'

export const PLAN_TOKEN_BUDGETS: Record<PricingPlan, number> = {
  growth: 50_000,
  business: 200_000,
  enterprise: Infinity,
}

export const PLAN_SONNET_SESSION_LIMITS: Record<PricingPlan, number> = {
  growth: 10,
  business: Infinity,
  enterprise: Infinity,
}

export const PLAN_ROLLOVER_TOKENS: Record<PricingPlan, number> = {
  growth: 0,
  business: 50_000,
  enterprise: 0,
}

export const UPGRADE_PROMPT_THRESHOLD = 0.8

export interface TokenUsageEntry {
  feature: string
  model: 'claude-sonnet-4-5' | 'claude-haiku-4-5-20251001'
  inputTokens: number
  outputTokens: number
  totalTokens: number
  usedAt: FirestoreTimestamp
  memberId: string
}

export interface MonthlyTokenUsage {
  businessId: string
  month: string
  plan: PricingPlan
  tokenBudget: number
  tokensUsed: number
  tokensRemaining: number
  sonnetSessionsUsed: number
  sonnetSessionLimit: number
  usagePercent: number
  upgradePromptShown: boolean
  entries: TokenUsageEntry[]
  updatedAt: FirestoreTimestamp
}

export interface LogTokenUsagePayload {
  businessId: string
  month: string
  feature: string
  model: 'claude-sonnet-4-5' | 'claude-haiku-4-5-20251001'
  inputTokens: number
  outputTokens: number
  memberId: string
}
