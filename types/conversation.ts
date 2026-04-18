import type { FirestoreTimestamp } from './attendance'

// ─────────────────────────────────────────────
// Conversations — Cyan Full-Screen Chat
// Threads: conversations/{businessId}/threads/{threadId}
// Messages: conversations/{businessId}/threads/{threadId}/messages/{messageId}
// ─────────────────────────────────────────────

export type ConversationMode =
  | 'strategy'
  | 'operations'
  | 'content'
  | 'team'

export type MessageRole = 'user' | 'assistant'
export type MessageStatus = 'sending' | 'sent' | 'error'

export interface CyanMessage {
  messageId: string
  threadId: string
  role: MessageRole
  content: string
  status: MessageStatus
  createdAt: FirestoreTimestamp
  tokensUsed?: number
  modelUsed?: 'claude-sonnet-4-5' | 'claude-haiku-4-5-20251001'
  mode?: ConversationMode
}

export interface ConversationThread {
  threadId: string
  businessId: string
  createdBy: string
  title: string
  mode: ConversationMode
  messageCount: number
  lastMessageAt: FirestoreTimestamp
  lastMessagePreview: string
  isPinned: boolean
  isArchived: boolean
  createdAt: FirestoreTimestamp
  contextSummary: string
  totalTokensUsed: number
}

export interface SendMessageRequest {
  threadId: string | null
  content: string
  mode: ConversationMode
  businessId: string
}

export interface SendMessageResponse {
  threadId: string
  messageId: string
  content: string
  tokensUsed: number
  modelUsed: string
  threadCreated: boolean
  threadTitle?: string
}

export const COMPRESSION_THRESHOLD = 10
export const MAX_HISTORY_MESSAGES = 20
