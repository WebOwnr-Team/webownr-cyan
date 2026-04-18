import { Timestamp } from 'firebase-admin/firestore'
import { adminDb } from '@/firebase/firebaseAdmin'
import { COLLECTIONS } from '@/lib/schema'
import { haikuCompletion } from '@/lib/anthropic-client'
import { logTokenUsage } from '@/lib/token-tracker'
import type {
  ConversationThread,
  CyanMessage,
  ConversationMode,
  FirestoreTimestamp,
} from '@/types'
import {
  generateId,
  truncate,
  currentMonth,
} from '@/lib/utils'
import { COMPRESSION_THRESHOLD, MAX_HISTORY_MESSAGES } from '@/types'

// ─────────────────────────────────────────────
// Conversation Manager — server-side only
//
// Handles:
//   - Thread creation and retrieval
//   - Message persistence
//   - History compression every COMPRESSION_THRESHOLD messages
//   - Context summary updates in businessContext
// ─────────────────────────────────────────────

// ── Thread operations ─────────────────────────────────────────────────────────

export async function createThread(params: {
  businessId: string
  createdBy: string
  mode: ConversationMode
  title: string
}): Promise<ConversationThread> {
  const threadId = generateId()
  const now = Timestamp.now() as unknown as FirestoreTimestamp

  const thread: ConversationThread = {
    threadId,
    businessId: params.businessId,
    createdBy: params.createdBy,
    title: params.title,
    mode: params.mode,
    messageCount: 0,
    lastMessageAt: now,
    lastMessagePreview: '',
    isPinned: false,
    isArchived: false,
    createdAt: now,
    contextSummary: '',
    totalTokensUsed: 0,
  }

  await adminDb
    .doc(COLLECTIONS.thread(params.businessId, threadId))
    .set(thread)

  return thread
}

export async function getThread(
  businessId: string,
  threadId: string
): Promise<ConversationThread | null> {
  const snap = await adminDb
    .doc(COLLECTIONS.thread(businessId, threadId))
    .get()
  if (!snap.exists) return null
  return snap.data() as ConversationThread
}

export async function listThreads(
  businessId: string,
  createdBy: string,
  limit = 20
): Promise<ConversationThread[]> {
  const snap = await adminDb
    .collection(COLLECTIONS.threads(businessId))
    .where('createdBy', '==', createdBy)
    .where('isArchived', '==', false)
    .orderBy('lastMessageAt', 'desc')
    .limit(limit)
    .get()

  return snap.docs.map(d => d.data() as ConversationThread)
}

// ── Message operations ────────────────────────────────────────────────────────

export async function saveMessage(params: {
  businessId: string
  threadId: string
  role: 'user' | 'assistant'
  content: string
  tokensUsed?: number
  modelUsed?: 'claude-sonnet-4-5' | 'claude-haiku-4-5-20251001'
  mode?: ConversationMode
}): Promise<CyanMessage> {
  const messageId = generateId()
  const now = Timestamp.now() as unknown as FirestoreTimestamp

  const message: CyanMessage = {
    messageId,
    threadId: params.threadId,
    role: params.role,
    content: params.content,
    status: 'sent',
    createdAt: now,
    ...(params.tokensUsed !== undefined && { tokensUsed: params.tokensUsed }),
    ...(params.modelUsed && { modelUsed: params.modelUsed }),
    ...(params.mode && { mode: params.mode }),
  }

  await adminDb
    .doc(COLLECTIONS.message(params.businessId, params.threadId, messageId))
    .set(message)

  return message
}

export async function getThreadMessages(
  businessId: string,
  threadId: string,
  limit = MAX_HISTORY_MESSAGES
): Promise<CyanMessage[]> {
  const snap = await adminDb
    .collection(COLLECTIONS.messages(businessId, threadId))
    .orderBy('createdAt', 'asc')
    .limit(limit)
    .get()

  return snap.docs.map(d => d.data() as CyanMessage)
}

// ── Thread update after each message ─────────────────────────────────────────

export async function updateThreadAfterMessage(params: {
  businessId: string
  threadId: string
  lastMessageContent: string
  tokensUsed: number
  messageCount: number
}): Promise<void> {
  const { businessId, threadId, lastMessageContent, tokensUsed, messageCount } = params

  await adminDb
    .doc(COLLECTIONS.thread(businessId, threadId))
    .update({
      messageCount,
      lastMessageAt: Timestamp.now(),
      lastMessagePreview: truncate(lastMessageContent, 80),
      totalTokensUsed: tokensUsed,
    })
}

// ── Auto-title generation ─────────────────────────────────────────────────────
// Called after the first user message to set a meaningful thread title

export async function generateThreadTitle(
  businessId: string,
  threadId: string,
  firstMessage: string
): Promise<string> {
  const systemPrompt = `Generate a concise 4-6 word title for a business conversation that started with the following message. Return ONLY the title — no quotes, no punctuation, no explanation.`

  try {
    const result = await haikuCompletion(systemPrompt, firstMessage, 30)
    const title = result.content.trim().replace(/^["']|["']$/g, '').slice(0, 60)

    await adminDb
      .doc(COLLECTIONS.thread(businessId, threadId))
      .update({ title })

    await logTokenUsage({
      businessId,
      month: currentMonth(),
      feature: 'thread_title',
      model: 'claude-haiku-4-5-20251001',
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      memberId: 'system',
    })

    return title
  } catch {
    return truncate(firstMessage, 50)
  }
}

// ── History compression ───────────────────────────────────────────────────────
// Every COMPRESSION_THRESHOLD messages, summarise the thread
// and store as contextSummary — used instead of raw history in future calls

export async function compressThreadHistory(
  businessId: string,
  threadId: string,
  messages: CyanMessage[]
): Promise<string> {
  if (messages.length < COMPRESSION_THRESHOLD) return ''

  const transcript = messages
    .map(m => `${m.role === 'user' ? 'Founder' : 'Cyan'}: ${m.content}`)
    .join('\n')

  const systemPrompt = `You are summarising a business conversation between a founder and Cyan (an AI business agent). Create a concise 2-3 sentence summary capturing the key topics discussed, decisions made, and any open recommendations. This summary will be used as context in future conversations.`

  try {
    const result = await haikuCompletion(
      systemPrompt,
      `Summarise this conversation:\n\n${transcript}`,
      200
    )

    const summary = result.content.trim()

    // Store on the thread
    await adminDb
      .doc(COLLECTIONS.thread(businessId, threadId))
      .update({ contextSummary: summary })

    // Also update businessContext.cyanMemory.conversationSummary
    await adminDb
      .doc(COLLECTIONS.businessContext(businessId))
      .update({
        'cyanMemory.conversationSummary': summary,
        updatedAt: Timestamp.now(),
      })

    await logTokenUsage({
      businessId,
      month: currentMonth(),
      feature: 'conversation_compression',
      model: 'claude-haiku-4-5-20251001',
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      memberId: 'system',
    })

    return summary
  } catch {
    return ''
  }
}

// ── Build message history for API call ───────────────────────────────────────
// Returns the last N messages formatted for Anthropic's messages array.
// If a contextSummary exists, prepends it as a system note.

export function buildMessageHistory(
  messages: CyanMessage[],
  contextSummary: string
): { role: 'user' | 'assistant'; content: string }[] {
  const recent = messages.slice(-MAX_HISTORY_MESSAGES)

  const formatted = recent.map(m => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }))

  // Prepend context summary as a synthetic assistant message if it exists
  if (contextSummary && messages.length > MAX_HISTORY_MESSAGES) {
    return [
      {
        role: 'user' as const,
        content: '[Earlier conversation summary for context]',
      },
      {
        role: 'assistant' as const,
        content: contextSummary,
      },
      ...formatted,
    ]
  }

  return formatted
}
