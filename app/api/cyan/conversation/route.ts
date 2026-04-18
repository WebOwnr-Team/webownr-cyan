import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/firebase/firebaseAdmin'
import { verifyAuthAndGetContext } from '@/lib/auth-middleware'
import { COLLECTIONS } from '@/lib/schema'
import { selectContext, buildSystemPrompt } from '@/lib/context-selector'
import { checkTokenBudget, checkSonnetLimit, logTokenUsage, buildUpgradePromptSuffix } from '@/lib/token-tracker'
import { createStreamingCompletion, sonnetCompletion, haikuCompletion, MODELS } from '@/lib/anthropic-client'
import {
  createThread,
  getThread,
  saveMessage,
  getThreadMessages,
  updateThreadAfterMessage,
  generateThreadTitle,
  compressThreadHistory,
  buildMessageHistory,
} from '@/lib/conversation-manager'
import type { BusinessContext, ConversationMode } from '@/types'
import { currentMonth, generateId } from '@/lib/utils'
import { COMPRESSION_THRESHOLD } from '@/types'

// ─────────────────────────────────────────────
// POST /api/cyan/conversation
//
// Unified conversation endpoint.
// Handles both streaming (stream=true) and full responses.
//
// Body:
//   { threadId?, message, mode, stream? }
//
// If threadId is null → creates a new thread.
// After COMPRESSION_THRESHOLD messages → compresses history.
// ─────────────────────────────────────────────

export const dynamic = 'force-dynamic'

interface ConversationRequest {
  threadId: string | null
  message: string
  mode: ConversationMode
  stream?: boolean
}

export async function POST(req: NextRequest) {
  // 1. Auth
  const auth = await verifyAuthAndGetContext(req)
  if (!auth.success) {
    return NextResponse.json({ error: auth.error.error }, { status: auth.error.status })
  }
  const { businessId, uid } = auth.context

  // 2. Parse body
  let body: ConversationRequest
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { threadId: incomingThreadId, message, mode = 'strategy', stream = false } = body

  if (!message?.trim()) {
    return NextResponse.json({ error: 'message is required' }, { status: 400 })
  }

  // 3. Budget check
  const budget = await checkTokenBudget(businessId, 1200)
  if (!budget.allowed) {
    return NextResponse.json(
      { error: budget.reason, upgradeRequired: true },
      { status: 402 }
    )
  }

  // 4. Model routing
  const sonnetCheck = await checkSonnetLimit(businessId)
  const model = sonnetCheck.allowed ? MODELS.sonnet : MODELS.haiku

  // 5. Fetch business context
  const ctxSnap = await adminDb.doc(COLLECTIONS.businessContext(businessId)).get()
  if (!ctxSnap.exists) {
    return NextResponse.json({ error: 'Business context not found' }, { status: 404 })
  }
  const ctx = ctxSnap.data() as BusinessContext

  // 6. Get or create thread
  let thread = incomingThreadId
    ? await getThread(businessId, incomingThreadId)
    : null

  const isNewThread = !thread
  if (!thread) {
    thread = await createThread({
      businessId,
      createdBy: uid,
      mode,
      title: 'New conversation',
    })
  }

  const threadId = thread.threadId

  // 7. Get message history
  const existingMessages = await getThreadMessages(businessId, threadId)
  const contextSummary = thread.contextSummary ?? ''

  // 8. Build system prompt
  const modeToContextType = {
    strategy:   'strategy_chat',
    operations: 'strategy_chat',
    content:    'content_generation',
    team:       'team_query',
  } as const

  const modeInstructions: Record<ConversationMode, string> = {
    strategy:   'You are in Strategy mode. Focus on business decisions, growth, and competitive positioning. Be decisive.',
    operations: 'You are in Operations mode. Focus on day-to-day execution, tasks, orders, and processes.',
    content:    'You are in Content mode. Generate marketing copy, social posts, and product descriptions in this business\'s brand voice.',
    team:       'You are in Team mode. Focus on team management, roles, collaboration, and performance.',
  }

  const selectedCtx = selectContext(modeToContextType[mode], ctx)
  const systemPrompt = buildSystemPrompt(selectedCtx, modeInstructions[mode])

  // 9. Build history for API call
  const history = buildMessageHistory(existingMessages, contextSummary)
  const messages = [...history, { role: 'user' as const, content: message }]

  // 10. Save user message to Firestore
  await saveMessage({
    businessId,
    threadId,
    role: 'user',
    content: message,
    mode,
  })

  // 11. Generate title on first message
  if (isNewThread || thread.messageCount === 0) {
    void generateThreadTitle(businessId, threadId, message)
  }

  // ── Streaming response ────────────────────────────────────────────────────

  if (stream) {
    let fullContent = ''
    let finalTokens = { inputTokens: 0, outputTokens: 0 }

    const streamResult = await createStreamingCompletion({
      model,
      systemPrompt,
      messages,
      maxTokens: 1500,
      onComplete: async (tokens) => {
        finalTokens = tokens
        const totalTokens = tokens.inputTokens + tokens.outputTokens

        // Save assistant message
        await saveMessage({
          businessId,
          threadId,
          role: 'assistant',
          content: fullContent,
          tokensUsed: totalTokens,
          modelUsed: model,
          mode,
        })

        // Update thread metadata
        const newCount = (thread?.messageCount ?? 0) + 2
        await updateThreadAfterMessage({
          businessId,
          threadId,
          lastMessageContent: fullContent,
          tokensUsed: totalTokens,
          messageCount: newCount,
        })

        // Log tokens
        await logTokenUsage({
          businessId,
          month: currentMonth(),
          feature: `conversation_${mode}`,
          model,
          inputTokens: tokens.inputTokens,
          outputTokens: tokens.outputTokens,
          memberId: uid,
        })

        // Compress if threshold reached
        if (newCount >= COMPRESSION_THRESHOLD) {
          const allMessages = await getThreadMessages(businessId, threadId, COMPRESSION_THRESHOLD)
          void compressThreadHistory(businessId, threadId, allMessages)
        }
      },
    })

    // Intercept stream to capture content for saving
    const encoder = new TextEncoder()
    const decoder = new TextDecoder()
    const upgradeSuffix = buildUpgradePromptSuffix(budget.usagePercent, budget.plan)

    const intercepted = new ReadableStream<Uint8Array>({
      async start(controller) {
        const reader = streamResult.getReader()
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            const text = decoder.decode(value)
            // Parse SSE chunks to accumulate content
            for (const line of text.split('\n')) {
              if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                try {
                  const parsed = JSON.parse(line.slice(6)) as { text?: string }
                  if (parsed.text) fullContent += parsed.text
                } catch { /* ignore parse errors in stream */ }
              }
            }
            controller.enqueue(value)
          }

          // Append upgrade prompt if needed
          if (upgradeSuffix) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text: upgradeSuffix })}\n\n`)
            )
          }
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ threadId, messageCount: (thread?.messageCount ?? 0) + 2 })}\n\n`)
          )
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        } catch (err) {
          controller.error(err)
        }
      },
    })

    return new Response(intercepted, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    })
  }

  // ── Non-streaming response ────────────────────────────────────────────────

  let result
  try {
    result = model === MODELS.sonnet
      ? await sonnetCompletion(systemPrompt, messages, 1500)
      : await haikuCompletion(systemPrompt, message, 1200)
  } catch (err) {
    console.error('[conversation] Anthropic error:', err)
    return NextResponse.json(
      { error: 'Cyan is temporarily unavailable. Please try again.' },
      { status: 503 }
    )
  }

  const totalTokens = result.inputTokens + result.outputTokens
  const upgradeSuffix = buildUpgradePromptSuffix(budget.usagePercent, budget.plan)
  const finalContent = result.content + upgradeSuffix

  // Save assistant message
  await saveMessage({
    businessId,
    threadId,
    role: 'assistant',
    content: finalContent,
    tokensUsed: totalTokens,
    modelUsed: model,
    mode,
  })

  const newCount = (thread.messageCount ?? 0) + 2
  await updateThreadAfterMessage({
    businessId,
    threadId,
    lastMessageContent: finalContent,
    tokensUsed: totalTokens,
    messageCount: newCount,
  })

  await logTokenUsage({
    businessId,
    month: currentMonth(),
    feature: `conversation_${mode}`,
    model,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    memberId: uid,
  })

  if (newCount >= COMPRESSION_THRESHOLD) {
    const allMessages = await getThreadMessages(businessId, threadId, COMPRESSION_THRESHOLD)
    void compressThreadHistory(businessId, threadId, allMessages)
  }

  return NextResponse.json({
    threadId,
    messageId: generateId(),
    content: finalContent,
    model,
    tokensUsed: totalTokens,
    isNewThread,
  })
}
