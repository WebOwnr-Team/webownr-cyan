import type { FirestoreTimestamp } from './attendance'

// ─────────────────────────────────────────────
// Business Context — The foundation of Cyan
// Every Cyan API call draws from this document.
// Stored at: businessContext/{businessId}
// ─────────────────────────────────────────────

export type ProductType = 'physical' | 'digital' | 'service' | 'hybrid'

export interface BusinessIdentity {
  businessId: string
  ownerId: string
  businessName: string
  industry: string
  productType: ProductType
  targetCustomer: string
  businessDescription: string
}

export interface BusinessGoals {
  primary90Day: string
  sixMonthRevenue: number
  yearMilestone: string
  currentChallenges: string[]
}

export interface BreakScheduleEntry {
  breakName: string
  startTime: string
  endTime: string
}

export interface WorkSchedule {
  timezone: string
  workDays: number[]
  workStartTime: string
  workEndTime: string
  breakSchedule: BreakScheduleEntry[]
}

export interface TeamMemberRef {
  memberId: string
  name: string
  role: string
  department: string
}

export interface BusinessTeam {
  size: number
  roles: TeamMemberRef[]
  workSchedule: WorkSchedule
}

export interface BusinessPerformance {
  avgWeeklyRevenue: number
  avgOrderValue: number
  topProducts: string[]
  revenueBaseline: number
  churnSignals: string[]
  growthRate: number
}

export interface BusinessPatterns {
  peakSalesDays: string[]
  customerSegments: string[]
  contentPerformance: string
}

export interface DecisionLogEntry {
  date: FirestoreTimestamp
  decision: string
  outcome: string
  recordedBy: string
}

export interface DecisionLog {
  log: DecisionLogEntry[]
}

export type RecommendationStatus = 'open' | 'acted' | 'dismissed'

export interface OpenRecommendation {
  id: string
  text: string
  createdAt: FirestoreTimestamp
  status: RecommendationStatus
}

export interface CyanMemory {
  lastBriefingDate: FirestoreTimestamp | null
  lastWeeklyReportDate: FirestoreTimestamp | null
  openRecommendations: OpenRecommendation[]
  pendingFollowUps: string[]
  conversationSummary: string
}

export interface ConnectedTool {
  toolName: string
  connected: boolean
  lastSyncAt: FirestoreTimestamp | null
  cyanSummary: string
}

export interface BusinessContext {
  identity: BusinessIdentity
  goals: BusinessGoals
  team: BusinessTeam
  performance: BusinessPerformance
  patterns: BusinessPatterns
  decisions: DecisionLog
  cyanMemory: CyanMemory
  connectedTools: ConnectedTool[]
  createdAt: FirestoreTimestamp
  updatedAt: FirestoreTimestamp
}

export type OnboardingStep = 1 | 2 | 3 | 4 | 5

export interface OnboardingState {
  step: OnboardingStep
  businessName?: string
  industry?: string
  productType?: ProductType
  targetCustomer?: string
  businessDescription?: string
  primary90Day?: string
  sixMonthRevenue?: number
  currentChallenges?: string[]
  workSchedule?: WorkSchedule
}

export type ContextRequestType =
  | 'daily_briefing'
  | 'weekly_report'
  | 'morning_briefing_member'
  | 'task_assist'
  | 'strategy_chat'
  | 'content_generation'
  | 'anomaly_analysis'
  | 'goal_review'
  | 'revenue_query'
  | 'team_query'
  | 'attendance_summary'
  | 'onboarding'

export interface SelectedContext {
  businessName: string
  industry: string
  productType: ProductType
  targetCustomer: string
  businessDescription: string
  goals?: BusinessGoals
  team?: Partial<BusinessTeam>
  performance?: Partial<BusinessPerformance>
  patterns?: Partial<BusinessPatterns>
  recentDecisions?: DecisionLogEntry[]
  openRecommendations?: OpenRecommendation[]
  conversationSummary?: string
}
