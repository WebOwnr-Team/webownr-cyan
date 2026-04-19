'use client'

import { useEffect, useRef } from 'react'
import { Check, AlertCircle } from 'lucide-react'
import type { OnboardingQuestion } from '@/lib/onboarding'
import { WorkScheduleInput } from './WorkScheduleInput'
import { DEFAULT_WORK_SCHEDULE } from '@/lib/schema'

interface OnboardingInputProps {
  question: OnboardingQuestion
  value: string
  onChange: (value: string) => void
  error: string | null
  disabled?: boolean
}

const baseInputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  background: 'var(--card-bg)',
  border: '1px solid var(--border)',
  borderRadius: 10,
  padding: '14px 16px',
  fontSize: 15,
  color: 'var(--text-primary)',
  fontFamily: 'var(--font-body)',
  lineHeight: 1.5,
  outline: 'none',
  transition: 'border-color 200ms, box-shadow 200ms',
  minHeight: 50,
}

function ErrorMessage({ text }: { text: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7, marginTop: 8 }}>
      <AlertCircle size={13} style={{ color: 'var(--orange)', flexShrink: 0, marginTop: 1 }} />
      <p style={{ fontSize: 13, color: 'var(--orange)', lineHeight: 1.4 }}>{text}</p>
    </div>
  )
}

export function OnboardingInput({ question, value, onChange, error, disabled = false }: OnboardingInputProps) {
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => { inputRef.current?.focus() }, 700)
    return () => clearTimeout(timer)
  }, [question.step])

  if (question.inputType === 'select' && question.options) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
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
                padding: '16px 18px',
                borderRadius: 12,
                border: selected ? '1px solid var(--cyan)' : '1px solid var(--border)',
                background: selected ? 'rgba(0,212,255,0.06)' : 'var(--card-bg)',
                cursor: disabled ? 'not-allowed' : 'pointer',
                transition: 'all 150ms',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 14,
                boxSizing: 'border-box',
              }}
            >
              <div style={{
                width: 22, height: 22, borderRadius: '50%',
                border: selected ? 'none' : '2px solid var(--border)',
                background: selected ? 'var(--cyan)' : 'transparent',
                flexShrink: 0, marginTop: 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 150ms',
              }}>
                {selected && <Check size={12} color="var(--navy)" strokeWidth={3} />}
              </div>
              <div>
                <p style={{
                  fontSize: 14, fontWeight: 600,
                  color: selected ? 'var(--cyan)' : 'var(--text-primary)',
                  fontFamily: 'var(--font-display)', marginBottom: 4,
                  lineHeight: 1.3, transition: 'color 150ms',
                }}>
                  {opt.label}
                </p>
                {opt.subtext && (
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                    {opt.subtext}
                  </p>
                )}
              </div>
            </button>
          )
        })}
        {error && <ErrorMessage text={error} />}
      </div>
    )
  }

  if (question.inputType === 'schedule') {
    return (
      <div>
        <WorkScheduleInput value={value || JSON.stringify(DEFAULT_WORK_SCHEDULE)} onChange={onChange} />
        {error && <ErrorMessage text={error} />}
      </div>
    )
  }

  if (question.inputType === 'textarea') {
    return (
      <div>
        <textarea
          ref={inputRef as React.Ref<HTMLTextAreaElement>}
          disabled={disabled}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={question.inputPlaceholder}
          rows={5}
          style={{
            ...baseInputStyle,
            border: error ? '1px solid var(--orange)' : '1px solid var(--border)',
            resize: 'vertical',
            minHeight: 120,
          }}
          onFocus={e => {
            if (!error) {
              e.target.style.borderColor = 'var(--cyan-dim)'
              e.target.style.boxShadow = '0 0 0 3px rgba(0,212,255,0.08)'
            }
          }}
          onBlur={e => {
            e.target.style.borderColor = error ? 'var(--orange)' : 'var(--border)'
            e.target.style.boxShadow = 'none'
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
          {error ? <ErrorMessage text={error} /> : <span />}
          <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>
            {value.length} chars
          </span>
        </div>
      </div>
    )
  }

  return (
    <div>
      <input
        ref={inputRef as React.Ref<HTMLInputElement>}
        type="text"
        disabled={disabled}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={question.inputPlaceholder}
        style={{
          ...baseInputStyle,
          border: error ? '1px solid var(--orange)' : '1px solid var(--border)',
        }}
        onFocus={e => {
          if (!error) {
            e.target.style.borderColor = 'var(--cyan-dim)'
            e.target.style.boxShadow = '0 0 0 3px rgba(0,212,255,0.08)'
          }
        }}
        onBlur={e => {
          e.target.style.borderColor = error ? 'var(--orange)' : 'var(--border)'
          e.target.style.boxShadow = 'none'
        }}
        onKeyDown={e => { if (e.key === 'Enter') e.preventDefault() }}
      />
      {error && <ErrorMessage text={error} />}
    </div>
  )
}