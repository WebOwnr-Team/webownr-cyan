import { CyanOrbInline } from '@/components/ui/CyanOrb'
import type { ConversationMessage } from '@/hooks/useConversation'

interface MessageBubbleProps {
  message: ConversationMessage
}

// ─────────────────────────────────────────────
// MessageBubble
//
// Cyan messages render as premium briefing cards
// with a left cyan border — never as chat bubbles.
// User messages are clean and minimal.
// Streaming messages show a typing cursor.
// ─────────────────────────────────────────────

export function MessageBubble({ message }: MessageBubbleProps) {
  if (message.role === 'user') {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'flex-end',
        marginBottom: 16,
      }}>
        <div style={{
          maxWidth: '72%',
          background: 'var(--card-bg)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: '10px 14px',
        }}>
          <p style={{
            fontSize: 14,
            color: 'var(--text-primary)',
            lineHeight: 1.65,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}>
            {message.content}
          </p>
        </div>
      </div>
    )
  }

  // Cyan assistant message — briefing card style
  return (
    <div style={{ marginBottom: 20 }}>
      {/* Cyan label */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8,
      }}>
        <CyanOrbInline size={16} />
        <span style={{
          fontSize: 10, fontWeight: 700, color: 'var(--cyan)',
          fontFamily: 'var(--font-display)', textTransform: 'uppercase',
          letterSpacing: '0.08em',
        }}>
          Cyan
        </span>
      </div>

      {/* Message card */}
      <div style={{
        background: 'var(--cyan-text-bg)',
        border: '1px solid rgba(0,212,255,0.15)',
        borderLeft: '3px solid var(--cyan)',
        borderRadius: '0 12px 12px 12px',
        padding: '14px 16px',
      }}>
        {message.streaming && !message.content ? (
          // Pure typing state — no content yet
          <div style={{ display: 'flex', gap: 4, alignItems: 'center', padding: '2px 0' }}>
            <span className="typing-dot" />
            <span className="typing-dot" />
            <span className="typing-dot" />
          </div>
        ) : (
          <>
            <p style={{
              fontSize: 14,
              color: 'var(--text-secondary)',
              lineHeight: 1.75,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}>
              {message.content}
              {/* Blinking cursor while streaming */}
              {message.streaming && (
                <span style={{
                  display: 'inline-block',
                  width: 2, height: 14,
                  background: 'var(--cyan)',
                  marginLeft: 2, verticalAlign: 'middle',
                  animation: 'cyan-pulse 0.8s ease-in-out infinite',
                }} />
              )}
            </p>
            {/* Token usage footnote */}
            {!message.streaming && message.tokensUsed && (
              <p style={{
                fontSize: 10, color: 'var(--text-muted)',
                marginTop: 10, textAlign: 'right',
              }}>
                {message.tokensUsed.toLocaleString()} tokens
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
