'use client'

import { Pin, MessageSquare, Plus, Archive } from 'lucide-react'
import type { ConversationThread, ConversationMode } from '@/types'
import { CyanOrbInline } from '@/components/ui/CyanOrb'

interface ThreadListProps {
  threads: ConversationThread[]
  activeThreadId: string | null
  loading: boolean
  onSelect: (threadId: string) => void
  onNew: () => void
}

const MODE_LABELS: Record<ConversationMode, string> = {
  strategy:   'Strategy',
  operations: 'Operations',
  content:    'Content',
  team:       'Team',
}

const MODE_COLORS: Record<ConversationMode, string> = {
  strategy:   'var(--cyan)',
  operations: 'var(--green)',
  content:    'var(--purple)',
  team:       'var(--gold)',
}

export function ThreadList({
  threads,
  activeThreadId,
  loading,
  onSelect,
  onNew,
}: ThreadListProps) {
  const pinned = threads.filter(t => t.isPinned)
  const recent = threads.filter(t => !t.isPinned)

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'var(--navy-mid)',
      borderRight: '1px solid var(--border)',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 16px 12px',
        borderBottom: '1px solid var(--border-dim)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CyanOrbInline size={18} />
          <span style={{
            fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-display)',
            color: 'var(--text-primary)',
          }}>
            Conversations
          </span>
        </div>
        <button
          onClick={onNew}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 28, height: 28, borderRadius: 7,
            background: 'var(--cyan-subtle)', border: '1px solid rgba(0,212,255,0.2)',
            cursor: 'pointer', color: 'var(--cyan)',
            transition: 'background 150ms',
          }}
          title="New conversation"
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Thread list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {loading && (
          <div style={{ padding: '16px' }}>
            {[1, 2, 3].map(i => (
              <div key={i} className="skeleton" style={{ height: 48, borderRadius: 8, marginBottom: 6 }} />
            ))}
          </div>
        )}

        {!loading && threads.length === 0 && (
          <div style={{ padding: '24px 16px', textAlign: 'center' }}>
            <MessageSquare size={24} style={{ color: 'var(--text-muted)', margin: '0 auto 8px' }} />
            <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
              No conversations yet. Start one below.
            </p>
          </div>
        )}

        {/* Pinned */}
        {pinned.length > 0 && (
          <div>
            <div style={{
              padding: '6px 16px 4px',
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              <Pin size={10} style={{ color: 'var(--text-muted)' }} />
              <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                Pinned
              </span>
            </div>
            {pinned.map(t => (
              <ThreadItem
                key={t.threadId}
                thread={t}
                isActive={t.threadId === activeThreadId}
                onSelect={onSelect}
              />
            ))}
            <div style={{ height: 1, background: 'var(--border-dim)', margin: '4px 0 6px' }} />
          </div>
        )}

        {/* Recent */}
        {recent.length > 0 && (
          <div>
            {recent.map(t => (
              <ThreadItem
                key={t.threadId}
                thread={t}
                isActive={t.threadId === activeThreadId}
                onSelect={onSelect}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ThreadItem({
  thread,
  isActive,
  onSelect,
}: {
  thread: ConversationThread
  isActive: boolean
  onSelect: (id: string) => void
}) {
  return (
    <div
      onClick={() => onSelect(thread.threadId)}
      style={{
        padding: '8px 16px',
        cursor: 'pointer',
        background: isActive ? 'var(--cyan-subtle)' : 'transparent',
        borderLeft: isActive ? '2px solid var(--cyan)' : '2px solid transparent',
        transition: 'all 150ms',
      }}
      onMouseEnter={e => {
        if (!isActive) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.03)'
      }}
      onMouseLeave={e => {
        if (!isActive) (e.currentTarget as HTMLDivElement).style.background = 'transparent'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
        <div style={{
          width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
          background: MODE_COLORS[thread.mode] ?? 'var(--text-muted)',
        }} />
        <p style={{
          fontSize: 12, fontWeight: isActive ? 600 : 400,
          color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {thread.title}
        </p>
      </div>
      {thread.lastMessagePreview && (
        <p style={{
          fontSize: 11, color: 'var(--text-muted)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          paddingLeft: 12,
        }}>
          {thread.lastMessagePreview}
        </p>
      )}
    </div>
  )
}
