import * as React from 'react'
import { cn } from '@/lib/utils'

// ─────────────────────────────────────────────
// Input component — form-input variant (no cyan glow)
// For Cyan-specific chat inputs, use className="cyan-input" directly
// ─────────────────────────────────────────────

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              fontFamily: 'var(--font-display)',
            }}
          >
            {label}
          </label>
        )}

        <input
          ref={ref}
          id={inputId}
          className={cn(
            'form-input w-full px-4 py-3',
            error && 'border-[var(--red)] focus:border-[var(--red)]',
            className
          )}
          style={{ fontSize: 14 }}
          {...props}
        />

        {error && (
          <p style={{ fontSize: 12, color: 'var(--red)' }}>{error}</p>
        )}
        {hint && !error && (
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{hint}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
