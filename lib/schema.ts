import { Timestamp } from 'firebase-admin/firestore'
import type {
  BusinessContext,
  BusinessIdentity,
  BusinessGoals,
  BusinessTeam,
  WorkSchedule,
} from '@/types/businessContext'
import type { MonthlyTokenUsage } from '@/types/tokenUsage'
import type { TeamMember } from '@/types/teamMember'
import {
  DEFAULT_CYAN_SETTINGS,
} from '@/types/teamMember'
import {
  PLAN_TOKEN_BUDGETS,
  PLAN_SONNET_SESSION_LIMITS,
} from '@/types/tokenUsage'
import type { PricingPlan } from '@/types/tokenUsage'
import { currentMonth } from '@/lib/utils'

// ─────────────────────────────────────────────
// Firestore Collection Path Builders
// Single source of truth for all document paths.
// Never hardcode paths elsewhere — always use these.
// ─────────────────────────────────────────────

export const COLLECTIONS = {
  // businessContext/{businessId}
  businessContext: (businessId: string) =>
    `businessContext/${businessId}`,

  // attendance/{businessId}/records/{date}_{memberId}
  attendanceRecords: (businessId: string) =>
    `attendance/${businessId}/records`,
  attendanceRecord: (businessId: string, recordId: string) =>
    `attendance/${businessId}/records/${recordId}`,

  // cyanAlerts/{businessId}/alerts/{alertId}
  cyanAlerts: (businessId: string) =>
    `cyanAlerts/${businessId}/alerts`,
  cyanAlert: (businessId: string, alertId: string) =>
    `cyanAlerts/${businessId}/alerts/${alertId}`,

  // cyanBriefings/{businessId}/daily/{YYYY-MM-DD}
  dailyBriefings: (businessId: string) =>
    `cyanBriefings/${businessId}/daily`,
  dailyBriefing: (businessId: string, date: string) =>
    `cyanBriefings/${businessId}/daily/${date}`,

  // cyanBriefings/{businessId}/weekly/{YYYY-MM-DD} (Monday)
  weeklyReports: (businessId: string) =>
    `cyanBriefings/${businessId}/weekly`,
  weeklyReport: (businessId: string, weekStart: string) =>
    `cyanBriefings/${businessId}/weekly/${weekStart}`,

  // cyanBriefings/{businessId}/personal/{YYYY-MM-DD}_{memberId}
  personalBriefings: (businessId: string) =>
    `cyanBriefings/${businessId}/personal`,
  personalBriefing: (businessId: string, date: string, memberId: string) =>
    `cyanBriefings/${businessId}/personal/${date}_${memberId}`,

  // conversations/{businessId}/threads/{threadId}
  threads: (businessId: string) =>
    `conversations/${businessId}/threads`,
  thread: (businessId: string, threadId: string) =>
    `conversations/${businessId}/threads/${threadId}`,

  // conversations/{businessId}/threads/{threadId}/messages/{messageId}
  messages: (businessId: string, threadId: string) =>
    `conversations/${businessId}/threads/${threadId}/messages`,
  message: (businessId: string, threadId: string, messageId: string) =>
    `conversations/${businessId}/threads/${threadId}/messages/${messageId}`,

  // tokenUsage/{businessId}/{YYYY-MM}
  tokenUsage: (businessId: string) =>
    `tokenUsage/${businessId}`,
  tokenUsageMonth: (businessId: string, month: string) =>
    `tokenUsage/${businessId}/${month}`,

  // teamMembers/{businessId}/members/{memberId}
  teamMembers: (businessId: string) =>
    `teamMembers/${businessId}/members`,
  teamMember: (businessId: string, memberId: string) =>
    `teamMembers/${businessId}/members/${memberId}`,
} as const

// ─────────────────────────────────────────────
// Document Builders
// Factory functions that create valid, typed documents
// ready to write to Firestore.
// ─────────────────────────────────────────────

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

// Default work schedule — Lagos timezone, Mon–Fri 9am–5pm
export const DEFAULT_WORK_SCHEDULE: WorkSchedule = {
  timezone: 'Africa/Lagos',
  workDays: [1, 2, 3, 4, 5],
  workStartTime: '09:00',
  workEndTime: '17:00',
  breakSchedule: [
    { breakName: 'Lunch', startTime: '13:00', endTime: '14:00' },
  ],
}
