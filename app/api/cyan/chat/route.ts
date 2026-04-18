import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/firebase/firebaseAdmin'
import { verifyAuthAndGetContext } from '@/lib/auth-middleware'
import { COLLECTIONS } from '@/lib/schema'
import { selectContext, buildSystemPrompt } from '@/lib/context-selector'
import {
  checkTokenBudget,
  checkSonnetLimit,
  logTokenUsage,
  buildUpgradePromptSuffix,
} from '@/lib/token-tracker'
import { haikuCompletion, sonnetCompletion, MODELS } from '@/lib/anthropic-client'
import type { BusinessContext, ConversationMode } from '@/types'
import { currentMonth } from '@/lib/utils'

// ─────────────────────────────────────────────
// POST /api/cyan/chat
//
// Single-turn Cyan completion with full context.
// Used by: ask Cyan quick input, task assist panel,
//          any non-streaming Cyan interaction.
//
// For streaming (Phase 7 full chat), see /api/cyan/chat/stream
//
// Flow:
//   1. Verify auth + resolve businessId
//   2. Check token budget
//   3. Check Sonnet limit (downgrade to Haiku if exceeded)
//   4. Fetch businessContext from Firestore
//   5. Select context subset for request type
//   6. Build system prompt
//   7. Call Anthropic API
//   8. Log token usage
//   9. Append upgrade prompt if at 80%+
//   10. Return response
// ─────────────────────────────────────────────

interface ChatRequest {
  message: string
  mode: ConversationMode
  threadId?: string    // optional — for context continuity (Phase 7)
  history?: { role: 'user' | 'assistant'; content: string }[]
}

export async function POST(req: NextRequest) {
  // 1. Auth
  const auth = await verifyAuthAndGetContext(req)
  if (!auth.success) {
    return NextResponse.json({ error: auth.error.error }, { status: auth.error.status })
  }
  const { businessId, uid } = auth.context

  // 2. Parse body
  let body: ChatRequest
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { message, mode = 'strategy', history = [] } = body

  if (!message?.trim()) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 })
  }

  // 3. Check token budget (estimate 800 tokens for a chat message)
  const budgetCheck = await checkTokenBudget(businessId, 800)
  if (!budgetCheck.allowed) {
    return NextResponse.json(
      { error: budgetCheck.reason, upgradeRequired: true },
      { status: 402 }
    )
  }

  // 4. Determine model — Sonnet for all chat modes, but downgrade if limit hit
  const sonnetCheck = await checkSonnetLimit(businessId)
  const useHaiku = !sonnetCheck.allowed
  const model = useHaiku ? MODELS.haiku : MODELS.sonnet
  const downgradedMessage = useHaiku ? sonnetCheck.reason ?? null : null

  // 5. Fetch businessContext
  let businessContext: BusinessContext
  try {
    const snap = await adminDb.doc(COLLECTIONS.businessContext(businessId)).get()
    if (!snap.exists) {
      return NextResponse.json({ error: 'Business context not found' }, { status: 404 })
    }
    businessContext = snap.data() as BusinessContext
  } catch {
    return NextResponse.json({ error: 'Failed to load business context' }, { status: 500 })
  }

  // 6. Map mode → context request type + select relevant context
  const modeToContextType = {
    strategy:   'strategy_chat',
    operations: 'strategy_chat',
    content:    'content_generation',
    team:       'team_query',
  } as const

  const contextType = modeToContextType[mode]
  const selectedContext = selectContext(contextType, businessContext)

  // 7. Build system prompt with Cyan's personality
  const modeInstructions: Record<ConversationMode, string> = {
    strategy:   'You are in Strategy mode. Focus on business decisions, growth, goals, and competitive positioning. Be decisive and specific.',
    operations: 'You are in Operations mode. Focus on day-to-day running of the business — tasks, orders, processes, and operational efficiency.',
    content:    'You are in Content mode. Focus on marketing copy, social posts, product descriptions, and brand voice. Write in the style that matches this business.',
    team:       'You are in Team mode. Focus on team management, roles, performance, and collaboration. Be supportive and constructive.',
  }

  const systemPrompt = buildSystemPrompt(selectedContext, modeInstructions[mode])

  // 8. Build message history (last 6 messages for context window efficiency)
  const recentHistory = history.slice(-6)
  const messages: { role: 'user' | 'assistant'; content: string }[] = [
    ...recentHistory,
    { role: 'user', content: message },
  ]

  // 9. Call Anthropic
  let result
  try {
    if (useHaiku) {
      result = await haikuCompletion(systemPrompt, message, 800)
    } else {
      result = await sonnetCompletion(systemPrompt, messages, 1200)
    }
  } catch (err) {
    console.error('[chat] Anthropic API error:', err)
    return NextResponse.json(
      { error: 'Cyan is temporarily unavailable. Please try again.' },
      { status: 503 }
    )
  }

  // 10. Log token usage
  await logTokenUsage({
    businessId,
    month: currentMonth(),
    feature: `chat_${mode}`,
    model,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    memberId: uid,
  })

  // 11. Append upgrade prompt if at 80%+
  const upgradeSuffix = buildUpgradePromptSuffix(budgetCheck.usagePercent, budgetCheck.plan)
  const finalContent = result.content + upgradeSuffix

  return NextResponse.json({
    content: finalContent,
    model,
    tokensUsed: result.inputTokens + result.outputTokens,
    tokensRemaining: Math.max(0, budgetCheck.tokensRemaining - result.inputTokens - result.outputTokens),
    usagePercent: budgetCheck.usagePercent,
    ...(downgradedMessage && { notice: downgradedMessage }),
    ...(budgetCheck.shouldPromptUpgrade && { upgradePrompt: true }),
  })
}
