import { Timestamp } from 'firebase-admin/firestore'
import { adminDb } from '@/firebase/firebaseAdmin'
import { COLLECTIONS } from '@/lib/schema'
import { selectContext, buildSystemPrompt } from '@/lib/context-selector'
import { haikuCompletion, sonnetCompletion } from '@/lib/anthropic-client'
import { logTokenUsage } from '@/lib/token-tracker'
import type {
  BusinessContext,
  DailyBriefing,
  WeeklyReport,
  PersonalBriefing,
  FirestoreTimestamp,
} from '@/types'
import {
  todayString,
  getMondayOfWeek,
  getSundayOfWeek,
  currentMonth,
  formatNGN,
  percentageDelta,
  deltaLabel,
  deltaDirection,
} from '@/lib/utils'

// ─────────────────────────────────────────────
// Briefing Generator
//
// All briefings are PRE-GENERATED and CACHED in Firestore.
// Never regenerated until the next scheduled window.
// Served from Firestore — zero extra API calls during the day.
//
// Daily:    Generated at 07:00 business timezone — Haiku
// Weekly:   Generated Monday 07:00 — Sonnet
// Personal: Generated on first login of the day — Haiku
// ─────────────────────────────────────────────

// ── Daily Briefing ────────────────────────────────────────────────────────────

export async function generateDailyBriefing(
  businessId: string,
  ctx: BusinessContext,
  date: string = todayString()
): Promise<DailyBriefing> {
  const selectedCtx = selectContext('daily_briefing', ctx)
  const systemPrompt = buildSystemPrompt(selectedCtx)

  const userPrompt = `Generate a morning briefing for ${ctx.identity.businessName}.

Business performance data:
- Average weekly revenue: ${formatNGN(ctx.performance.avgWeeklyRevenue)}
- Revenue baseline: ${formatNGN(ctx.performance.revenueBaseline)}
- Top products: ${ctx.performance.topProducts.join(', ') || 'not set yet'}
- Growth rate: ${ctx.performance.growthRate}%
- Open recommendations: ${ctx.cyanMemory.openRecommendations.filter(r => r.status === 'open').length}
- 90-day goal: ${ctx.goals.primary90Day}

Respond ONLY with a JSON object matching this exact structure:
{
  "narrative": "2-3 sentence plain English summary of what needs attention today. Specific, not generic. Reference real numbers.",
  "topPriority": "One specific action the founder should take today. Start with a verb.",
  "sections": [
    { "label": "Revenue this week", "value": "₦X", "delta": "+X% vs baseline", "deltaDirection": "up|down|neutral" },
    { "label": "Goal progress", "value": "X% to target", "delta": null, "deltaDirection": "neutral" }
  ]
}

Use actual numbers from the performance data. If data is missing, say so in the narrative and set value to "Not set". Maximum 2 sections.`

  const result = await haikuCompletion(systemPrompt, userPrompt, 600)

  // Parse JSON from Haiku response
  let parsed: { narrative: string; topPriority: string; sections: DailyBriefing['sections'] }
  try {
    const clean = result.content.replace(/```json|```/g, '').trim()
    parsed = JSON.parse(clean)
  } catch {
    // Fallback if JSON parsing fails
    parsed = {
      narrative: result.content.slice(0, 300),
      topPriority: 'Review your business performance and set your revenue baseline.',
      sections: [
        {
          label: 'Status',
          value: 'Briefing ready',
          deltaDirection: 'neutral',
        },
      ],
    }
  }

  const briefing: DailyBriefing = {
    businessId,
    date,
    generatedAt: Timestamp.now() as unknown as FirestoreTimestamp,
    modelUsed: 'claude-haiku-4-5-20251001',
    tokensUsed: result.inputTokens + result.outputTokens,
    sections: parsed.sections ?? [],
    narrative: parsed.narrative ?? '',
    topPriority: parsed.topPriority ?? '',
    pendingOrders: 0,    // Phase 5+ — populated from Sales Engine data
    pendingInvoices: 0,
    activeAlertCount: ctx.cyanMemory.openRecommendations.filter(r => r.status === 'open').length,
    activeAlertTitles: ctx.cyanMemory.openRecommendations
      .filter(r => r.status === 'open')
      .slice(0, 3)
      .map(r => r.text.slice(0, 60)),
  }

  // Cache in Firestore
  await adminDb
    .doc(COLLECTIONS.dailyBriefing(businessId, date))
    .set(briefing)

  // Log token usage
  await logTokenUsage({
    businessId,
    month: currentMonth(),
    feature: 'daily_briefing',
    model: 'claude-haiku-4-5-20251001',
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    memberId: 'system',
  })

  return briefing
}

// ── Weekly Report ─────────────────────────────────────────────────────────────

export async function generateWeeklyReport(
  businessId: string,
  ctx: BusinessContext,
  weekStart: string = getMondayOfWeek()
): Promise<WeeklyReport> {
  const weekEnd = getSundayOfWeek()
  const selectedCtx = selectContext('weekly_report', ctx)
  const systemPrompt = buildSystemPrompt(selectedCtx)

  const recentDecisions = ctx.decisions.log.slice(-5).map(d => d.decision).join('\n- ')

  const userPrompt = `Generate the weekly business report for ${ctx.identity.businessName} (week of ${weekStart} to ${weekEnd}).

Full context:
- 90-day goal: ${ctx.goals.primary90Day}
- 6-month revenue target: ${formatNGN(ctx.goals.sixMonthRevenue)}
- Avg weekly revenue: ${formatNGN(ctx.performance.avgWeeklyRevenue)}
- Revenue baseline: ${formatNGN(ctx.performance.revenueBaseline)}
- Growth rate: ${ctx.performance.growthRate}%
- Top products: ${ctx.performance.topProducts.join(', ') || 'not configured'}
- Peak sales days: ${ctx.patterns.peakSalesDays.join(', ') || 'not tracked yet'}
- Recent decisions: ${recentDecisions || 'none recorded'}
- Open recommendations: ${ctx.cyanMemory.openRecommendations.filter(r => r.status === 'open').length}
- Conversation summary: ${ctx.cyanMemory.conversationSummary || 'none yet'}

Respond ONLY with a JSON object:
{
  "overallAssessment": "One paragraph, 3-4 sentences. Specific assessment of the week. Reference real numbers.",
  "weekAheadRecommendation": "One specific, actionable recommendation for next week. Start with a verb.",
  "goalProgressSummary": "One sentence on 90-day goal progress.",
  "goalProgressPercent": 0,
  "sections": [
    {
      "title": "Revenue",
      "content": "2-3 sentence analysis of revenue this week.",
      "highlights": ["highlight 1", "highlight 2"]
    },
    {
      "title": "What Worked",
      "content": "What drove results this week.",
      "highlights": ["item 1"]
    },
    {
      "title": "Watch This Week",
      "content": "What to monitor in the week ahead.",
      "highlights": ["item 1", "item 2"]
    }
  ]
}`

  const messages = [{ role: 'user' as const, content: userPrompt }]
  const result = await sonnetCompletion(systemPrompt, messages, 1500)

  let parsed: {
    overallAssessment: string
    weekAheadRecommendation: string
    goalProgressSummary: string
    goalProgressPercent: number
    sections: WeeklyReport['sections']
  }

  try {
    const clean = result.content.replace(/```json|```/g, '').trim()
    parsed = JSON.parse(clean)
  } catch {
    parsed = {
      overallAssessment: result.content.slice(0, 500),
      weekAheadRecommendation: 'Review this week\'s performance and set priorities for next week.',
      goalProgressSummary: 'Goal tracking in progress.',
      goalProgressPercent: 0,
      sections: [],
    }
  }

  const revenueVsBaseline = percentageDelta(
    ctx.performance.avgWeeklyRevenue,
    ctx.performance.revenueBaseline
  )

  const report: WeeklyReport = {
    businessId,
    weekStart,
    weekEnd,
    generatedAt: Timestamp.now() as unknown as FirestoreTimestamp,
    modelUsed: 'claude-sonnet-4-5',
    tokensUsed: result.inputTokens + result.outputTokens,
    totalRevenue: ctx.performance.avgWeeklyRevenue,
    revenueVsLastWeek: 0,      // Phase 5+ — requires historical tracking
    revenueVsBaseline,
    teamAttendanceSummary: `${ctx.team.size} team member${ctx.team.size !== 1 ? 's' : ''}`,
    topPerformerNote: null,
    sections: parsed.sections ?? [],
    goalProgressSummary: parsed.goalProgressSummary ?? '',
    goalProgressPercent: parsed.goalProgressPercent ?? 0,
    overallAssessment: parsed.overallAssessment ?? '',
    weekAheadRecommendation: parsed.weekAheadRecommendation ?? '',
  }

  await adminDb
    .doc(COLLECTIONS.weeklyReport(businessId, weekStart))
    .set(report)

  await logTokenUsage({
    businessId,
    month: currentMonth(),
    feature: 'weekly_report',
    model: 'claude-sonnet-4-5',
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    memberId: 'system',
  })

  return report
}

// ── Personal Morning Briefing ─────────────────────────────────────────────────

export async function generatePersonalBriefing(
  businessId: string,
  memberId: string,
  memberName: string,
  ctx: BusinessContext,
  date: string = todayString()
): Promise<PersonalBriefing> {
  const selectedCtx = selectContext('morning_briefing_member', ctx)
  const systemPrompt = buildSystemPrompt(selectedCtx,
    `You are generating a personal morning briefing for ${memberName}, a team member at ${ctx.identity.businessName}. Be specific and personal — reference their actual work context.`
  )

  const memberRole = ctx.team.roles.find(r => r.memberId === memberId)
  const role = memberRole?.role ?? 'team_member'
  const dept = memberRole?.department ?? 'general'

  const userPrompt = `Generate a personal morning briefing for ${memberName} (${role}, ${dept} department).

Today is ${date}. Scheduled work hours: ${ctx.team.workSchedule.workStartTime} – ${ctx.team.workSchedule.workEndTime} (${ctx.team.workSchedule.timezone}).

Respond ONLY with a JSON object:
{
  "priorityTasks": [
    { "taskId": null, "title": "Specific task title", "reason": "Why this is priority today — specific", "source": "Where this came from" },
    { "taskId": null, "title": "Second task", "reason": "Specific reason", "source": "Source" },
    { "taskId": null, "title": "Third task", "reason": "Specific reason", "source": "Source" }
  ],
  "collaborationPrompt": "One specific prompt to collaborate with a colleague, or null",
  "growthNote": "One observation about a skill or area where this person is growing, or null"
}

IMPORTANT: Tasks must reference this business's actual context (${ctx.identity.businessName}, ${ctx.identity.industry}). Never say 'Good morning! Here are your tasks.' Tasks must feel like they come from Cyan's knowledge of this business, not a generic template.`

  const result = await haikuCompletion(systemPrompt, userPrompt, 600)

  let parsed: {
    priorityTasks: PersonalBriefing['priorityTasks']
    collaborationPrompt: string | null
    growthNote: string | null
  }

  try {
    const clean = result.content.replace(/```json|```/g, '').trim()
    parsed = JSON.parse(clean)
  } catch {
    parsed = {
      priorityTasks: [
        { taskId: null, title: 'Review today\'s priorities', reason: 'Start the day with clarity', source: 'Cyan' },
        { taskId: null, title: 'Check customer messages', reason: 'Stay on top of customer needs', source: 'Cyan' },
        { taskId: null, title: 'Update your task board', reason: 'Keep the team in sync', source: 'Cyan' },
      ],
      collaborationPrompt: null,
      growthNote: null,
    }
  }

  const isWorkDay = ctx.team.workSchedule.workDays.includes(
    new Date().getDay() === 0 ? 7 : new Date().getDay()
  )

  const briefing: PersonalBriefing = {
    businessId,
    memberId,
    memberName,
    date,
    generatedAt: Timestamp.now() as unknown as FirestoreTimestamp,
    modelUsed: 'claude-haiku-4-5-20251001',
    tokensUsed: result.inputTokens + result.outputTokens,
    priorityTasks: parsed.priorityTasks,
    collaborationPrompt: parsed.collaborationPrompt ?? null,
    growthNote: parsed.growthNote ?? null,
    isScheduledWorkDay: isWorkDay,
    scheduledStart: ctx.team.workSchedule.workStartTime,
    relevantAlerts: ctx.cyanMemory.openRecommendations
      .filter(r => r.status === 'open')
      .slice(0, 2)
      .map(r => r.text),
  }

  await adminDb
    .doc(COLLECTIONS.personalBriefing(businessId, date, memberId))
    .set(briefing)

  await logTokenUsage({
    businessId,
    month: currentMonth(),
    feature: 'personal_briefing',
    model: 'claude-haiku-4-5-20251001',
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    memberId,
  })

  return briefing
}

// ── Fetch cached briefings ────────────────────────────────────────────────────

export async function getCachedDailyBriefing(
  businessId: string,
  date: string = todayString()
): Promise<DailyBriefing | null> {
  const snap = await adminDb.doc(COLLECTIONS.dailyBriefing(businessId, date)).get()
  if (!snap.exists) return null
  return snap.data() as DailyBriefing
}

export async function getCachedPersonalBriefing(
  businessId: string,
  memberId: string,
  date: string = todayString()
): Promise<PersonalBriefing | null> {
  const snap = await adminDb.doc(COLLECTIONS.personalBriefing(businessId, date, memberId)).get()
  if (!snap.exists) return null
  return snap.data() as PersonalBriefing
}

export async function getCachedWeeklyReport(
  businessId: string,
  weekStart: string = getMondayOfWeek()
): Promise<WeeklyReport | null> {
  const snap = await adminDb.doc(COLLECTIONS.weeklyReport(businessId, weekStart)).get()
  if (!snap.exists) return null
  return snap.data() as WeeklyReport
}
