// ─────────────────────────────────────────────
// schema.server.ts — SERVER-ONLY
//
// Document builder functions that use firebase-admin/firestore Timestamp.
// Import ONLY in:
//   - API route handlers (app/api/**/route.ts)
//   - Server-side lib files (lib/*.ts never imported by client components)
//
// Never import this in:
//   - Client components ('use client')
//   - Hooks (hooks/*.ts)
//   - Any file that ends up in the client bundle
// ─────────────────────────────────────────────

import { Timestamp } from 'firebase-admin/firestore'
import type {
  BusinessContext,
  BusinessIdentity,
  BusinessGoals,
  BusinessTeam,
} from '@/types/businessContext'
import type { MonthlyTokenUsage } from '@/types/tokenUsage'
import type { TeamMember } from '@/types/teamMember'
import { DEFAULT_CYAN_SETTINGS } from '@/types/teamMember'
import { PLAN_TOKEN_BUDGETS, PLAN_SONNET_SESSION_LIMITS } from '@/types/tokenUsage'
import type { PricingPlan } from '@/types/tokenUsage'
import { currentMonth } from '@/lib/utils'

// Build the initial businessContext document during onboarding
export function buildInitialBusinessContext(params: {
  businessId: string
  ownerId: string
  identity: Omit<BusinessIdentity, 'businessId' | 'ownerId'>
  goals: BusinessGoals
  team: BusinessTeam
}): BusinessContext {
  const now = Timestamp.now()
  return {
    identity: {
      businessId: params.businessId,
      ownerId: params.ownerId,
      ...params.identity,
    },
    goals: params.goals,
    team: params.team,
    performance: {
      avgWeeklyRevenue: 0,
      avgOrderValue: 0,
      topProducts: [],
      revenueBaseline: 0,
      churnSignals: [],
      growthRate: 0,
    },
    patterns: {
      peakSalesDays: [],
      customerSegments: [],
      contentPerformance: '',
    },
    decisions: {
      log: [],
    },
    cyanMemory: {
      lastBriefingDate: null,
      lastWeeklyReportDate: null,
      openRecommendations: [],
      pendingFollowUps: [],
      conversationSummary: '',
    },
    connectedTools: [],
    createdAt: now,
    updatedAt: now,
  }
}

// Build the founder's TeamMember document
export function buildFounderTeamMember(params: {
  memberId: string
  businessId: string
  name: string
  email: string
}): TeamMember {
  return {
    memberId: params.memberId,
    businessId: params.businessId,
    name: params.name,
    email: params.email,
    role: 'founder',
    department: 'general',
    avatarUrl: null,
    statusMessage: 'Available',
    isOnline: false,
    lastSeenAt: null,
    joinedAt: Timestamp.now(),
    cyanSettings: DEFAULT_CYAN_SETTINGS,
    skillGrowth: [],
    unlockedDecorations: [],
    tasksCompletedTotal: 0,
    currentStreak: 0,
  }
}

// Build the initial token usage document for a new month
export function buildInitialTokenUsage(params: {
  businessId: string
  plan: PricingPlan
  month?: string
}): MonthlyTokenUsage {
  const month = params.month ?? currentMonth()
  const budget = PLAN_TOKEN_BUDGETS[params.plan]
  const sonnetLimit = PLAN_SONNET_SESSION_LIMITS[params.plan]
  return {
    businessId: params.businessId,
    month,
    plan: params.plan,
    tokenBudget: budget,
    tokensUsed: 0,
    tokensRemaining: budget,
    sonnetSessionsUsed: 0,
    sonnetSessionLimit: sonnetLimit,
    usagePercent: 0,
    upgradePromptShown: false,
    entries: [],
    updatedAt: Timestamp.now(),
  }
}