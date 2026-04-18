import type { FirestoreTimestamp } from './attendance'

// ─────────────────────────────────────────────
// Team Members
// Stored at: teamMembers/{businessId}/members/{memberId}
// memberId === Firebase Auth UID
// ─────────────────────────────────────────────

export type MemberRole =
  | 'founder'
  | 'department_head'
  | 'team_member'
  | 'contractor'
  | 'client'

export type Department =
  | 'general'
  | 'sales'
  | 'marketing'
  | 'development'
  | 'design'
  | 'operations'
  | 'finance'
  | 'customer_success'
  | 'content'

export interface CyanPersonalSettings {
  nickname: string
  briefingEnabled: boolean
  breakRemindersEnabled: boolean
  wellbeingCheckInEnabled: boolean
  quietHoursStart: string
  quietHoursEnd: string
}

export interface SkillGrowthEntry {
  skillName: string
  firstUsed: FirestoreTimestamp
  lastUsed: FirestoreTimestamp
  usageCount: number
  cyanAssessment: string
}

export interface TeamMember {
  memberId: string
  businessId: string
  name: string
  email: string
  role: MemberRole
  department: Department
  avatarUrl: string | null
  statusMessage: string
  isOnline: boolean
  lastSeenAt: FirestoreTimestamp | null
  joinedAt: FirestoreTimestamp
  cyanSettings: CyanPersonalSettings
  skillGrowth: SkillGrowthEntry[]
  unlockedDecorations: string[]
  tasksCompletedTotal: number
  currentStreak: number
}

export interface TeamInvitePayload {
  email: string
  name: string
  role: MemberRole
  department: Department
  businessId: string
  invitedBy: string
}

export const DEFAULT_CYAN_SETTINGS: CyanPersonalSettings = {
  nickname: 'Cyan',
  briefingEnabled: true,
  breakRemindersEnabled: true,
  wellbeingCheckInEnabled: true,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
}
