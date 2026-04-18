'use client'

import { useEffect, useRef } from 'react'
import { Check } from 'lucide-react'
import type { OnboardingQuestion } from '@/lib/onboarding'
import { WorkScheduleInput } from './WorkScheduleInput'
import { DEFAULT_WORK_SCHEDULE } from '@/lib/schema'

// ─────────────────────────────────────────────
// OnboardingInput
//
// Renders the correct input control for each step.
// Auto-focuses text/textarea inputs so the user can
// start typing immediately after Cyan's message.
// ─────────────────────────────────────────────

interface OnboardingInputProps {
  question: OnboardingQuestion
  value: string
  onChange: (value: string) => void
  error: string | null
  disabled?: boolean
}

export function OnboardingInput({
  question,
  value,
  onChange,
  error,
  disabled = false,
}: OnboardingInputProps) {
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null)

  // Auto-focus on mount and question change
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus()
    }, 600) // delay until Cyan message finishes streaming
    return () => clearTimeout(timer)
  }, [question.step])

  // ── Select (product type) ────────────────────
  if (question.inputType === 'select' && question.options) {
    return (
      <div className="space-y-2 animate-fade-up" style={{ animationDelay: '300ms' }}>
        {question.options.map(opt => {
          const selected = value === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              disabled={disabled}
              onClick={() => onChange(opt.value)}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '14px 16px',
                borderRadius: 12,
                border: selected
                  ? '1px solid var(--cyan)'
                  : '1px solid var(--border)',
                background: selected ? 'var(--cyan-subtle)' : 'var(--navy-mid)',
                cursor: 'pointer',
                transition: 'all 150ms',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
              }}
            >
              {/* Selection indicator */}
              <div style={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                border: selected ? 'none' : '2px solid var(--border)',
                background: selected ? 'var(--cyan)' : 'transparent',
                flexShrink: 0,
                marginTop: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 150ms',
              }}>
                {selected && <Check size={11} color="var(--navy)" strokeWidth={3} />}
              </div>

              <div>
                <p style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: selected ? 'var(--cyan)' : 'var(--text-primary)',
                  fontFamily: 'var(--font-display)',
                  marginBottom: 3,
                  transition: 'color 150ms',
                }}>
                  {opt.label}
                </p>
                {opt.subtext && (
                  <p style={{
                    fontSize: 12,
                    color: 'var(--text-secondary)',
                    lineHeight: 1.5,
                  }}>
                    {opt.subtext}
                  </p>
                )}
              </div>
            </button>
          )
        })}

        {error && (
          <p style={{ fontSize: 12, color: 'var(--red)', paddingLeft: 4 }}>{error}</p>
        )}
      </div>
    )
  }

  // ── Work schedule ────────────────────────────
  if (question.inputType === 'schedule') {
    const scheduleValue = value || JSON.stringify(DEFAULT_WORK_SCHEDULE)
    return (
      <div className="animate-fade-up" style={{ animationDelay: '300ms' }}>
        <WorkScheduleInput
          value={scheduleValue}
          onChange={onChange}
        />
        {error && (
          <p style={{ fontSize: 12, color: 'var(--red)', marginTop: 8 }}>{error}</p>
        )}
      </div>
    )
  }

  // ── Textarea ─────────────────────────────────
  if (question.inputType === 'textarea') {
    return (
      <div className="animate-fade-up" style={{ animationDelay: '300ms' }}>
        <textarea
          ref={inputRef as React.Ref<HTMLTextAreaElement>}
          disabled={disabled}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={question.inputPlaceholder}
          rows={4}
          style={{
            width: '100%',
            background: 'var(--navy-mid)',
            border: error ? '1px solid var(--red)' : '1px solid var(--border)',
            borderRadius: 10,
            padding: '14px 16px',
            fontSize: 14,
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-body)',
            lineHeight: 1.6,
            resize: 'vertical',
            outline: 'none',
            transition: 'border-color 200ms',
          }}
          onFocus={e => {
            if (!error) e.target.style.borderColor = 'var(--cyan-dim)'
          }}
          onBlur={e => {
            if (!error) e.target.style.borderColor = 'var(--border)'
          }}
        />
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 6,
        }}>
          {error
            ? <p style={{ fontSize: 12, color: 'var(--red)' }}>{error}</p>
            : <span />
          }
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {value.length} chars
          </span>
        </div>
      </div>
    )
  }

  // ── Text input (default) ─────────────────────
  return (
    <div className="animate-fade-up" style={{ animationDelay: '300ms' }}>
      <input
        ref={inputRef as React.Ref<HTMLInputElement>}
        type="text"
        disabled={disabled}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={question.inputPlaceholder}
        style={{
          width: '100%',
          background: 'var(--navy-mid)',
          border: error ? '1px solid var(--red)' : '1px solid var(--border)',
          borderRadius: 10,
          padding: '14px 16px',
          fontSize: 15,
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-body)',
          outline: 'none',
          transition: 'border-color 200ms, box-shadow 200ms',
        }}
        onFocus={e => {
          e.target.style.borderColor = 'var(--cyan-dim)'
          e.target.style.boxShadow = '0 0 0 3px var(--cyan-glow)'
        }}
        onBlur={e => {
          e.target.style.borderColor = error ? 'var(--red)' : 'var(--border)'
          e.target.style.boxShadow = 'none'
        }}
        onKeyDown={e => {
          // Allow Enter to advance on text inputs
          if (e.key === 'Enter') {
            e.preventDefault()
          }
        }}
      />
      {error && (
        <p style={{ fontSize: 12, color: 'var(--red)', marginTop: 6 }}>{error}</p>
      )}
    </div>
  )
}
