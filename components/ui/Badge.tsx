import * as React from 'react'
import { cn } from '@/lib/utils'

type BadgeVariant = 'cyan' | 'orange' | 'green' | 'muted' | 'gold' | 'red' | 'purple'

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
}

const variantClasses: Record<BadgeVariant, string> = {
  cyan:   'badge-cyan',
  orange: 'badge-orange',
  green:  'badge-green',
  muted:  'badge-muted',
  gold:   'bg-[var(--gold-dim)] text-[var(--gold)] border border-[rgba(255,215,0,0.25)]',
  red:    'bg-[var(--red-dim)] text-[var(--red)] border border-[rgba(255,71,87,0.25)]',
  purple: 'bg-[rgba(156,111,255,0.1)] text-[var(--purple)] border border-[rgba(156,111,255,0.25)]',
}

export function Badge({ variant = 'muted', children, className }: BadgeProps) {
  return (
    <span className={cn('badge', variantClasses[variant], className)}>
      {children}
    </span>
  )
}
