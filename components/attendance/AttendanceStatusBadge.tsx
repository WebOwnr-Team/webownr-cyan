import type { AttendanceStatus } from '@/types'

interface AttendanceStatusBadgeProps {
  status: AttendanceStatus
  compact?: boolean
}

const STATUS_CONFIG: Record<AttendanceStatus, {
  label: string
  color: string
  bg: string
  border: string
}> = {
  'on-time':          { label: 'On time',        color: 'var(--green)',  bg: 'var(--green-dim)',  border: 'rgba(0,230,118,0.25)' },
  'late':             { label: 'Late',            color: 'var(--orange)', bg: 'var(--orange-dim)', border: 'rgba(255,107,53,0.25)' },
  'absent':           { label: 'Absent',          color: 'var(--red)',    bg: 'var(--red-dim)',    border: 'rgba(255,71,87,0.25)' },
  'overtime-only':    { label: 'Overtime',        color: 'var(--cyan)',   bg: 'var(--cyan-subtle)', border: 'rgba(0,212,255,0.25)' },
  'overtime-extended':{ label: 'Extended',        color: 'var(--cyan)',   bg: 'var(--cyan-subtle)', border: 'rgba(0,212,255,0.25)' },
}

export function AttendanceStatusBadge({ status, compact = false }: AttendanceStatusBadgeProps) {
  const config = STATUS_CONFIG[status]

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      padding: compact ? '2px 7px' : '3px 8px',
      borderRadius: 999,
      background: config.bg,
      border: `1px solid ${config.border}`,
      fontSize: compact ? 10 : 11,
      fontWeight: 700,
      color: config.color,
      fontFamily: 'var(--font-display)',
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      whiteSpace: 'nowrap',
    }}>
      <span style={{
        width: 5,
        height: 5,
        borderRadius: '50%',
        background: config.color,
        flexShrink: 0,
      }} />
      {config.label}
    </span>
  )
}
