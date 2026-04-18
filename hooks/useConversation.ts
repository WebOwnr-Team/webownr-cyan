'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import type { ConversationThread, CyanMessage, ConversationMode } from '@/types'

// ─────────────────────────────────────────────
// useConversation
//
// Drives the full-screen Cyan chat interface.
// Handles:
//   - Thread creation and selection
//   - Streaming message display
//   - Message history loading
//   - Mode switching
//   - Error and upgrade states
// ─────────────────────────────────────────────

export interface ConversationMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  streaming?: boolean
  tokensUsed?: number
}

interface UseConversationReturn {
  // Thread state
  threads: ConversationThread[]
  activeThread: ConversationThread | null
  messages: ConversationMessage[]
  mode: ConversationMode

  // UI state
  sending: boolean
  streaming: boolean
  error: string | null
  upgradeRequired: boolean
  threadsLoading: boolean

  // Actions
  sendMessage: (content: string) => Promise<void>
  selectThread: (threadId: string) => Promise<void>
  newThread: () => void
  setMode: (mode: ConversationMode) => void
  clearError: () => void
}

export function useConversation(): UseConversationReturn {
  const { getIdToken } = useAuth()

  const [threads, setThreads] = useState<ConversationThread[]>([])
  const [activeThread, setActiveThread] = useState<ConversationThread | null>(null)
  const [messages, setMessages] = useState<ConversationMessage[]>([])
  const [mode, setMode] = useState<ConversationMode>('strategy')
  const [sending, setSending] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [upgradeRequired, setUpgradeRequired] = useState(false)
  const [threadsLoading, setThreadsLoading] = useState(true)

  const abortRef = useRef<AbortController | null>(null)

  // ── Auth helper ──────────────────────────────────────────────────────────

  const withToken = useCallback(async <T>(
    fn: (token: string) => Promise<T>
  ): Promise<T | null> => {
    const token = await getIdToken()
    if (!token) { setError('Not authenticated'); return null }
    return fn(token)
  }, [getIdToken])

  // ── Load thread list on mount ────────────────────────────────────────────

  useEffect(() => {
    void withToken(async (token) => {
      setThreadsLoading(true)
      const res = await fetch('/api/cyan/conversation/threads', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json() as { threads: ConversationThread[] }
        setThreads(data.threads)
      }
      setThreadsLoading(false)
    })
  }, [withToken])

  // ── Select a thread and load its messages ────────────────────────────────

  const selectThread = useCallback(async (threadId: string) => {
    await withToken(async (token) => {
      const res = await fetch(
        `/api/cyan/conversation/threads?threadId=${threadId}&messages=true`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (!res.ok) return
      const data = await res.json() as {
        thread: ConversationThread
        messages: CyanMessage[]
      }
      setActiveThread(data.thread)
      setMode(data.thread.mode)
      setMessages(
        data.messages.map(m => ({
          id: m.messageId,
          role: m.role,
          content: m.content,
          tokensUsed: m.tokensUsed,
        }))
      )
    })
  }, [withToken])

  // ── Start a new thread ───────────────────────────────────────────────────

  const newThread = useCallback(() => {
    setActiveThread(null)
    setMessages([])
    setError(null)
    setUpgradeRequired(false)
  }, [])

  // ── Send a message ───────────────────────────────────────────────────────

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || sending) return

    setError(null)
    setUpgradeRequired(false)
    setSending(true)

    // Optimistically add user message
    const userMsgId = `user-${Date.now()}`
    setMessages(prev => [...prev, { id: userMsgId, role: 'user', content }])

    // Add streaming placeholder
    const streamMsgId = `stream-${Date.now()}`
    setMessages(prev => [
      ...prev,
      { id: streamMsgId, role: 'assistant', content: '', streaming: true },
    ])

    await withToken(async (token) => {
      abortRef.current = new AbortController()

      try {
        const res = await fetch('/api/cyan/conversation', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            threadId: activeThread?.threadId ?? null,
            message: content,
            mode,
            stream: true,
          }),
          signal: abortRef.current.signal,
        })

        if (!res.ok) {
          const err = await res.json() as { error?: string; upgradeRequired?: boolean }
          if (err.upgradeRequired) setUpgradeRequired(true)
          throw new Error(err.error ?? 'Request failed')
        }

        setStreaming(true)
        setSending(false)

        const reader = res.body?.getReader()
        const decoder = new TextDecoder()
        let accumulated = ''
        let finalThreadId: string | null = null

        if (reader) {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            const chunk = decoder.decode(value, { stream: true })
            for (const line of chunk.split('\n')) {
              if (!line.startsWith('data: ')) continue
              const data = line.slice(6)
              if (data === '[DONE]') break

              try {
                const parsed = JSON.parse(data) as {
                  text?: string
                  threadId?: string
                  messageCount?: number
                }
                if (parsed.text) {
                  accumulated += parsed.text
                  setMessages(prev =>
                    prev.map(m =>
                      m.id === streamMsgId
                        ? { ...m, content: accumulated }
                        : m
                    )
                  )
                }
                if (parsed.threadId) finalThreadId = parsed.threadId
              } catch { /* ignore parse errors */ }
            }
          }
        }

        // Finalise the streaming message
        setMessages(prev =>
          prev.map(m =>
            m.id === streamMsgId ? { ...m, content: accumulated, streaming: false } : m
          )
        )

        // Update thread state
        if (finalThreadId && !activeThread) {
          // New thread was created — add to thread list
          await selectThread(finalThreadId)
        } else if (activeThread) {
          // Update existing thread preview
          setActiveThread(prev => prev
            ? { ...prev, lastMessagePreview: accumulated.slice(0, 80) }
            : prev
          )
        }

      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return
        const msg = err instanceof Error ? err.message : 'Something went wrong'
        setError(msg)
        // Remove the streaming placeholder on error
        setMessages(prev => prev.filter(m => m.id !== streamMsgId))
      } finally {
        setStreaming(false)
        setSending(false)
      }
    })
  }, [sending, activeThread, mode, withToken, selectThread])

  return {
    threads,
    activeThread,
    messages,
    mode,
    sending,
    streaming,
    error,
    upgradeRequired,
    threadsLoading,
    sendMessage,
    selectThread,
    newThread,
    setMode,
    clearError: () => setError(null),
  }
}
