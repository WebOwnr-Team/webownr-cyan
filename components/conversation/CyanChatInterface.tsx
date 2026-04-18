'use client'

import { useState, useRef, useEffect, KeyboardEvent } from 'react'
import { Send, AlertCircle, TrendingUp, Settings, Users, FileText } from 'lucide-react'
import { useConversation } from '@/hooks'
import { ThreadList } from './ThreadList'
import { MessageBubble } from './MessageBubble'
import { ContextPanel } from './ContextPanel'
import { CyanOrb } from '@/components/ui/CyanOrb'
import type { ConversationMode } from '@/types'

// ─────────────────────────────────────────────
// CyanChatInterface — three-panel layout
//
// Left panel:   Thread history + pinned conversations
// Centre panel: Active conversation (Cyan messages as briefing cards)
// Right panel:  Business context (what Cyan knows — collapsible)
//
// Mode selector at top of centre panel.
// Ask Cyan input at bottom with cyan glow on focus.
// ─────────────────────────────────────────────

const MODES: { key: ConversationMode; label: string; icon: React.ReactNode }[] = [
  { key: 'strategy',   label: 'Strategy',   icon: <TrendingUp size={13} /> },
  { key: 'operations', label: 'Operations', icon: <Settings size={13} /> },
  { key: 'content',    label: 'Content',    icon: <FileText size={13} /> },
  { key: 'team',       label: 'Team',       icon: <Users size={13} /> },
]

export function CyanChatInterface() {
  const {
    threads, activeThread, messages, mode,
    sending, streaming, error, upgradeRequired,
    threadsLoading, sendMessage, selectThread,
    newThread, setMode, clearError,
  } = useConversation()

  const [input, setInput] = useState('')
  const [showContext, setShowContext] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`
  }, [input])

  const handleSend = async () => {
    if (!input.trim() || sending || streaming) return
    const content = input.trim()
    setInput('')
    await sendMessage(content)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSend()
    }
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: showContext ? '240px 1fr 260px' : '240px 1fr',
      height: '100vh',
      background: 'var(--navy)',
      overflow: 'hidden',
    }}>

      {/* ── Left panel: Thread list ─────────────────────────────────── */}
      <ThreadList
        threads={threads}
        activeThreadId={activeThread?.threadId ?? null}
        loading={threadsLoading}
        onSelect={(id) => void selectThread(id)}
        onNew={newThread}
      />

      {/* ── Centre panel: Conversation ──────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>

        {/* Mode selector bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          height: 52,
          borderBottom: '1px solid var(--border-dim)',
          flexShrink: 0,
          background: 'var(--navy)',
        }}>
          <div style={{ display: 'flex', gap: 2 }}>
            {MODES.map(m => (
              <button
                key={m.key}
                onClick={() => setMode(m.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '5px 10px', borderRadius: 7,
                  border: 'none', cursor: 'pointer',
                  background: mode === m.key ? 'var(--cyan-subtle)' : 'transparent',
                  color: mode === m.key ? 'var(--cyan)' : 'var(--text-muted)',
                  fontSize: 12, fontWeight: mode === m.key ? 600 : 400,
                  transition: 'all 150ms',
                }}
              >
                {m.icon}
                {m.label}
              </button>
            ))}
          </div>

          {/* Context panel toggle */}
          <button
            onClick={() => setShowContext(s => !s)}
            style={{
              fontSize: 11, color: showContext ? 'var(--cyan)' : 'var(--text-muted)',
              border: 'none', cursor: 'pointer',
              padding: '4px 8px', borderRadius: 6,
              background: showContext ? 'var(--cyan-subtle)' : 'transparent',
            } as React.CSSProperties}
          >
            Context {showContext ? '→' : '←'}
          </button>
        </div>

        {/* Messages area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>

          {/* Empty state */}
          {messages.length === 0 && !sending && (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', height: '60%', gap: 16, textAlign: 'center',
            }}>
              <CyanOrb size={52} pulse />
              <div>
                <p style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: 8 }}>
                  Ask Cyan anything
                </p>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, maxWidth: 360 }}>
                  Strategy, operations, content, or team — Cyan knows your business and gives specific advice, not generic tips.
                </p>
              </div>
              {/* Prompt starters */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', maxWidth: 440 }}>
                {[
                  "What should I focus on this week?",
                  "Write an Instagram post for my top product",
                  "Why might my revenue be dropping?",
                  "Help me prepare for a team review",
                ].map(prompt => (
                  <button
                    key={prompt}
                    onClick={() => { setInput(prompt); textareaRef.current?.focus() }}
                    style={{
                      padding: '6px 12px', borderRadius: 20,
                      background: 'var(--card-bg)', border: '1px solid var(--border)',
                      color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer',
                      transition: 'all 150ms',
                    }}
                    onMouseEnter={e => {
                      ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(0,212,255,0.3)'
                      ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'
                    }}
                    onMouseLeave={e => {
                      ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'
                      ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'
                    }}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message list */}
          {messages.map(msg => (
            <MessageBubble key={msg.id} message={msg} />
          ))}

          {/* Error state */}
          {error && (
            <div className="alert-orange" style={{ padding: '10px 14px', marginTop: 8, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <AlertCircle size={14} style={{ color: 'var(--orange)', flexShrink: 0, marginTop: 1 }} />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, color: 'var(--orange)' }}>{error}</p>
                {upgradeRequired && (
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                    Upgrade to Business plan for unlimited tokens.
                  </p>
                )}
              </div>
              <button onClick={clearError} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 16, lineHeight: 1, padding: 0 }}>×</button>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div style={{
          padding: '16px 32px 20px',
          borderTop: '1px solid var(--border-dim)',
          flexShrink: 0,
          background: 'var(--navy)',
        }}>
          <div style={{
            display: 'flex',
            gap: 10,
            alignItems: 'flex-end',
            background: 'var(--navy-mid)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: '10px 14px',
            transition: 'border-color 200ms, box-shadow 200ms',
          }}
            onFocusCapture={e => {
              const el = e.currentTarget as HTMLDivElement
              el.style.borderColor = 'var(--cyan)'
              el.style.boxShadow = '0 0 0 3px var(--cyan-glow)'
            }}
            onBlurCapture={e => {
              const el = e.currentTarget as HTMLDivElement
              el.style.borderColor = 'var(--border)'
              el.style.boxShadow = 'none'
            }}
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Ask Cyan — ${mode} mode`}
              rows={1}
              disabled={sending || streaming}
              style={{
                flex: 1, background: 'none', border: 'none', outline: 'none',
                color: 'var(--text-primary)', fontSize: 14, lineHeight: 1.6,
                resize: 'none', fontFamily: 'var(--font-body)',
                maxHeight: 160, overflowY: 'auto',
              }}
            />
            <button
              onClick={() => void handleSend()}
              disabled={!input.trim() || sending || streaming}
              style={{
                width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                background: input.trim() && !sending && !streaming
                  ? 'var(--cyan)' : 'var(--border)',
                border: 'none', cursor: input.trim() ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 150ms, box-shadow 150ms',
                boxShadow: input.trim() ? '0 0 12px rgba(0,212,255,0.3)' : 'none',
              }}
            >
              <Send size={14} style={{
                color: input.trim() && !sending && !streaming ? 'var(--navy)' : 'var(--text-muted)',
              }} />
            </button>
          </div>
          <p style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', marginTop: 8 }}>
            Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>

      {/* ── Right panel: Business context ───────────────────────────── */}
      {showContext && <ContextPanel mode={mode} />}
    </div>
  )
}
