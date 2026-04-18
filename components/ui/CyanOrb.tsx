import { cn } from '@/lib/utils'

interface CyanOrbProps {
  size?: number
  pulse?: boolean
  className?: string
}

// ─────────────────────────────────────────────
// CyanOrb — Cyan's visual identity
// An abstract animated orb — not a face, not a robot.
// Used in: auth pages, onboarding, empty states,
//          Cyan briefing card headers, loading states.
// ─────────────────────────────────────────────

export function CyanOrb({ size = 40, pulse = true, className }: CyanOrbProps) {
  return (
    <div
      className={cn(pulse && 'cyan-pulse', className)}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'radial-gradient(circle at 35% 35%, #00D4FF, #006688)',
        flexShrink: 0,
      }}
      aria-hidden="true"
    />
  )
}

// Inline orb for use inside text/rows — no pulse by default
export function CyanOrbInline({ size = 20 }: { size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'radial-gradient(circle at 35% 35%, #00D4FF, #006688)',
        flexShrink: 0,
      }}
      aria-hidden="true"
    />
  )
}
