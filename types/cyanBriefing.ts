import type { FirestoreTimestamp } from './attendance'

// ─────────────────────────────────────────────
// Cyan Briefings
// Daily:  cyanBriefings/{businessId}/daily/{YYYY-MM-DD}
// Weekly: cyanBriefings/{businessId}/weekly/{YYYY-MM-DD} (Monday)
// Personal: cyanBriefings/{businessId}/personal/{YYYY-MM-DD}_{memberId}
// ─────────────────────────────────────────────

export interface DailyBriefingSection {
  label: string
  value: string
  delta?: string
  deltaDirection?: 'up' | 'down' | 'neutral'
}

export interface DailyBriefing {
  businessId: string
  date: string
  generatedAt: FirestoreTimestamp
  modelUsed: 'claude-haiku-4-5-20251001'
  tokensUsed: number
  sections: DailyBriefingSection[]
  narrative: string
  topPriority: string
  pendingOrders: number
  pendingInvoices: number
  activeAlertCount: number
  activeAlertTitles: string[]
}

export interface WeeklyReportSection {
  title: string
  content: string
  highlights: string[]
}

export interface WeeklyReport {
  businessId: string
  weekStart: string
  weekEnd: string
  generatedAt: FirestoreTimestamp
  modelUsed: 'claude-sonnet-4-5'
  tokensUsed: number
  totalRevenue: number
  revenueVsLastWeek: number
  revenueVsBaseline: number
  teamAttendanceSummary: string
  topPerformerNote: string | null
  sections: WeeklyReportSection[]
  goalProgressSummary: string
  goalProgressPercent: number
  overallAssessment: string
  weekAheadRecommendation: string
}

export interface PersonalTask {
  taskId: string | null
  title: string
  reason: string
  source: string
}

export interface PersonalBriefing {
  businessId: string
  memberId: string
  memberName: string
  date: string
  generatedAt: FirestoreTimestamp
  modelUsed: 'claude-haiku-4-5-20251001'
  tokensUsed: number
  priorityTasks: [PersonalTask, PersonalTask, PersonalTask]
  collaborationPrompt: string | null
  growthNote: string | null
  isScheduledWorkDay: boolean
  scheduledStart: string
  relevantAlerts: string[]
}
