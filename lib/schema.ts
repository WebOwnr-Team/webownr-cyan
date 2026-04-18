import type { WorkSchedule } from '@/types/businessContext'

// ─────────────────────────────────────────────
// Firestore Collection Path Builders
// Single source of truth for all document paths.
// Never hardcode paths elsewhere — always use these.
// Safe to import on both client and server.
// ─────────────────────────────────────────────

export const COLLECTIONS = {
  businessContext: (businessId: string) =>
    `businessContext/${businessId}`,

  attendanceRecords: (businessId: string) =>
    `attendance/${businessId}/records`,
  attendanceRecord: (businessId: string, recordId: string) =>
    `attendance/${businessId}/records/${recordId}`,

  cyanAlerts: (businessId: string) =>
    `cyanAlerts/${businessId}/alerts`,
  cyanAlert: (businessId: string, alertId: string) =>
    `cyanAlerts/${businessId}/alerts/${alertId}`,

  dailyBriefings: (businessId: string) =>
    `cyanBriefings/${businessId}/daily`,
  dailyBriefing: (businessId: string, date: string) =>
    `cyanBriefings/${businessId}/daily/${date}`,

  weeklyReports: (businessId: string) =>
    `cyanBriefings/${businessId}/weekly`,
  weeklyReport: (businessId: string, weekStart: string) =>
    `cyanBriefings/${businessId}/weekly/${weekStart}`,

  personalBriefings: (businessId: string) =>
    `cyanBriefings/${businessId}/personal`,
  personalBriefing: (businessId: string, date: string, memberId: string) =>
    `cyanBriefings/${businessId}/personal/${date}_${memberId}`,

  threads: (businessId: string) =>
    `conversations/${businessId}/threads`,
  thread: (businessId: string, threadId: string) =>
    `conversations/${businessId}/threads/${threadId}`,

  messages: (businessId: string, threadId: string) =>
    `conversations/${businessId}/threads/${threadId}/messages`,
  message: (businessId: string, threadId: string, messageId: string) =>
    `conversations/${businessId}/threads/${threadId}/messages/${messageId}`,

  tokenUsage: (businessId: string) =>
    `tokenUsage/${businessId}`,
  tokenUsageMonth: (businessId: string, month: string) =>
    `tokenUsage/${businessId}/${month}`,

  teamMembers: (businessId: string) =>
    `teamMembers/${businessId}/members`,
  teamMember: (businessId: string, memberId: string) =>
    `teamMembers/${businessId}/members/${memberId}`,
} as const

// ─────────────────────────────────────────────
// Default work schedule — Lagos timezone, Mon–Fri 9am–5pm
// Safe to import on client.
// ─────────────────────────────────────────────

export const DEFAULT_WORK_SCHEDULE: WorkSchedule = {
  timezone: 'Africa/Lagos',
  workDays: [1, 2, 3, 4, 5],
  workStartTime: '09:00',
  workEndTime: '17:00',
  breakSchedule: [
    { breakName: 'Lunch', startTime: '13:00', endTime: '14:00' },
  ],
}