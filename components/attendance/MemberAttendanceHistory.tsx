'use client'

import { useEffect } from 'react'
import { useApiRequest } from '@/hooks'
import type { AttendanceRecord } from '@/types'
import { AttendanceStatusBadge } from './AttendanceStatusBadge'
import { CyanOrbInline } from '@/components/ui/CyanOrb'

interface MemberAttendanceHistoryProps {
  memberId?: string    // if undefined, shows current user's history
  memberName?: string
}

export function MemberAttendanceHistory({ memberId, memberName }: MemberAttendanceHistoryProps) {
  const endpoint = memberId
    ? `/api/cyan/attendance/summary?type=member&id=${memberId}`
    : '/api/cyan/attendance/summary?type=history'

  const { data, loading, execute } = useApiRequest<{ records: AttendanceRecord[] }>()

  useEffect(() => {
    void execute(endpoint)
  }, [endpoint, execute])

  if (loading) {
    return (
      <div className="card p-5 space-y-3">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="skeleton" style={{ height: 36, borderRadius: 8 }} />
        ))}
      </div>
    )
  }

  const records = data?.records ?? []

  // Build streak from records
  let streak = 0
  for (const rec of records) {
    if (rec.status === 'absent') break
    streak++
  }

  // Stats
  const onTimeCount = records.filter(r => r.status === 'on-time').length
  const lateCount   = records.filter(r => r.status === 'late').length
  const absentCount = records.filter(r => r.status === 'absent').length
  const totalHours  = records.reduce((sum, r) => sum + (r.hoursWorked ?? 0), 0)

  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-dim)' }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
          Attendance History · Last 30 Days
        </p>
        {memberName && (
          <p style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{memberName}</p>
        )}
      </div>

      {/* Stats row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        borderBottom: '1px solid var(--border-dim)',
      }}>
        {[
          { label: 'On time',   value: onTimeCount,              color: 'var(--green)' },
          { label: 'Late',      value: lateCount,                color: 'var(--orange)' },
          { label: 'Absent',    value: absentCount,              color: 'var(--red)' },
          { label: 'Streak',    value: `${streak}d`,             color: 'var(--cyan)' },
        ].map((stat, i) => (
          <div
            key={i}
            style={{
              padding: '10px 0',
              textAlign: 'center',
              borderRight: i < 3 ? '1px solid var(--border-dim)' : 'none',
            }}
          >
            <p style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-display)', color: stat.color }}>
              {stat.value}
            </p>
            <p style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      {/* Total hours */}
      <div style={{
        padding: '8px 18px',
        borderBottom: '1px solid var(--border-dim)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Total hours worked (30 days)</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
          {totalHours.toFixed(1)}h
        </span>
      </div>

      {/* Record list */}
      {records.length === 0 ? (
        <div style={{ padding: '24px 18px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
            <CyanOrbInline size={18} />
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No records yet</p>
        </div>
      ) : (
        <div style={{ maxHeight: 360, overflowY: 'auto' }}>
          {records.map((record, i) => (
            <div
              key={record.date}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 18px',
                borderBottom: i < records.length - 1 ? '1px solid var(--border-dim)' : 'none',
                gap: 12,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 2 }}>
                  <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                    {record.date}
                  </p>
                  <AttendanceStatusBadge status={record.status} compact />
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  {record.checkInTime && (
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      In: {record.scheduledStart}
                    </span>
                  )}
                  {record.checkOutTime && (
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      Out: {record.scheduledEnd}
                    </span>
                  )}
                  {record.hoursWorked > 0 && (
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {record.hoursWorked}h
                    </span>
                  )}
                </div>
                {/* Cyan note */}
                {record.cyanNote && (
                  <p style={{
                    fontSize: 11,
                    color: 'var(--cyan)',
                    marginTop: 4,
                    fontStyle: 'italic',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {record.cyanNote}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
