import { NextRequest } from 'next/server'
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
import { createStreamingCompletion, MODELS } from '@/lib/anthropic-client'
import type { BusinessContext, ConversationMode } from '@/types'
import { currentMonth } from '@/lib/utils'

// ─────────────────────────────────────────────
// POST /api/cyan/chat/stream
//
// Streaming version of the Cyan chat endpoint.
// Returns Server-Sent Events (SSE) for real-time
// text rendering in the Phase 7 conversation UI.
//
// Client reads chunks with EventSource or fetch + ReadableStream.
// Each chunk: data: {"text":"..."}\n\n
// Final chunk: data: [DONE]\n\n
// ─────────────────────────────────────────────

export const dynamic = 'force-dynamic'

interface StreamChatRequest {
  message: string
  mode: ConversationMode
  history?: { role: 'user' | 'assistant'; content: string }[]
}

export async function POST(req: NextRequest) {
  // 1. Auth
  const auth = await verifyAuthAndGetContext(req)
  if (!auth.success) {
    return new Response(
      JSON.stringify({ error: auth.error.error }),
      { status: auth.error.status, headers: { 'Content-Type': 'application/json' } }
    )
  }
  const { businessId, uid } = auth.context

  // 2. Parse body
  let body: StreamChatRequest
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { message, mode = 'strategy', history = [] } = body

  if (!message?.trim()) {
    return new Response(JSON.stringify({ error: 'Message is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // 3. Budget check
  const budgetCheck = await checkTokenBudget(businessId, 1000)
  if (!budgetCheck.allowed) {
    return new Response(JSON.stringify({ error: budgetCheck.reason, upgradeRequired: true }), {
      status: 402,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // 4. Model routing
  const sonnetCheck = await checkSonnetLimit(businessId)
  const model = sonnetCheck.allowed ? MODELS.sonnet : MODELS.haiku

  // 5. Fetch businessContext
  let businessContext: BusinessContext
  try {
    const snap = await adminDb.doc(COLLECTIONS.businessContext(businessId)).get()
    if (!snap.exists) {
      return new Response(JSON.stringify({ error: 'Business context not found' }), {
        status: 404, headers: { 'Content-Type': 'application/json' },
      })
    }
    businessContext = snap.data() as BusinessContext
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to load business context' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    })
  }

  // 6. Context selection + system prompt
  const modeToContextType = {
    strategy:   'strategy_chat',
    operations: 'strategy_chat',
    content:    'content_generation',
    team:       'team_query',
  } as const

  const modeInstructions: Record<ConversationMode, string> = {
    strategy:   'You are in Strategy mode. Focus on business decisions, growth, goals, and competitive positioning.',
    operations: 'You are in Operations mode. Focus on day-to-day tasks, orders, and processes.',
    content:    'You are in Content mode. Generate marketing copy, posts, and product descriptions in this business\'s brand voice.',
    team:       'You are in Team mode. Focus on team management, roles, and collaboration.',
  }

  const selectedContext = selectContext(modeToContextType[mode], businessContext)
  const systemPrompt = buildSystemPrompt(selectedContext, modeInstructions[mode])

  const messages = [
    ...history.slice(-6),
    { role: 'user' as const, content: message },
  ]

  // 7. Create streaming response
  const stream = await createStreamingCompletion({
    model,
    systemPrompt,
    messages,
    maxTokens: 1500,
    onComplete: (tokens) => {
      // Log after stream completes — fire and forget
      void logTokenUsage({
        businessId,
        month: currentMonth(),
        feature: `stream_${mode}`,
        model,
        inputTokens: tokens.inputTokens,
        outputTokens: tokens.outputTokens,
        memberId: uid,
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
