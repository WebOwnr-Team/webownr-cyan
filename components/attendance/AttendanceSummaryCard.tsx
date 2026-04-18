'use client'

import { useEffect } from 'react'
import { Users, Clock, AlertCircle, TrendingUp } from 'lucide-react'
import { useApiRequest } from '@/hooks'
import type { AttendanceSummary, FirestoreTimestamp } from '@/types'
import { AttendanceStatusBadge } from './AttendanceStatusBadge'
import { CyanOrbInline } from '@/components/ui/CyanOrb'
import { timestampToString } from '@/lib/utils'

// ─────────────────────────────────────────────
// AttendanceSummaryCard
//
// Founder-facing card showing today's team attendance.
// Shows who's in, who's late, who's absent.
// Cyan's attendance note shown if available.
// ─────────────────────────────────────────────

export function AttendanceSummaryCard() {
  const { data, loading, error, execute } = useApiRequest<{ summary: AttendanceSummary }>()

  useEffect(() => {
    void execute('/api/cyan/attendance/summary?type=today')
  }, [execute])

  if (loading) {
    return (
      <div className="card p-5">
        <div className="skeleton" style={{ height: 12, width: '40%', marginBottom: 16 }} />
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton" style={{ height: 40, borderRadius: 8 }} />
          ))}
        </div>
      </div>
    )
  }

  if (error || !data?.summary) {
    return (
      <div className="card p-5">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Users size={14} style={{ color: 'var(--text-muted)' }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Team · Today
          </span>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          {error ?? 'No attendance data yet.'}
        </p>
      </div>
    )
  }

  const { summary } = data
  const attendanceRate = summary.totalScheduled > 0
    ? Math.round((summary.presentCount / summary.totalScheduled) * 100)
    : 0

  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        padding: '14px 18px',
        borderBottom: '1px solid var(--border-dim)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Users size={14} style={{ color: 'var(--text-muted)' }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Team · Today
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {summary.lateCount > 0 && (
            <span style={{ fontSize: 11, color: 'var(--orange)' }}>
              {summary.lateCount} late
            </span>
          )}
          {summary.absentCount > 0 && (
            <span style={{ fontSize: 11, color: 'var(--red)' }}>
              {summary.absentCount} absent
            </span>
          )}
          <span style={{
            fontSize: 12,
            fontWeight: 700,
            color: attendanceRate >= 80 ? 'var(--green)' : attendanceRate >= 60 ? 'var(--orange)' : 'var(--red)',
            fontFamily: 'var(--font-display)',
          }}>
            {summary.presentCount}/{summary.totalScheduled} in
          </span>
        </div>
      </div>

      {/* Stats row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        borderBottom: '1px solid var(--border-dim)',
      }}>
        {[
          { icon: <Users size={12} />, label: 'Present',  value: summary.presentCount,  color: 'var(--green)' },
          { icon: <Clock size={12} />, label: 'Late',     value: summary.lateCount,     color: 'var(--orange)' },
          { icon: <AlertCircle size={12} />, label: 'Absent', value: summary.absentCount, color: 'var(--red)' },
          { icon: <TrendingUp size={12} />, label: 'Overtime', value: summary.overtimeCount, color: 'var(--cyan)' },
        ].map((stat, i) => (
          <div
            key={i}
            style={{
              padding: '10px 12px',
              textAlign: 'center',
              borderRight: i < 3 ? '1px solid var(--border-dim)' : 'none',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4, color: stat.color }}>
              {stat.icon}
            </div>
            <p style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-display)', color: stat.value > 0 ? stat.color : 'var(--text-muted)' }}>
              {stat.value}
            </p>
            <p style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      {/* Member list */}
      {summary.members.length > 0 ? (
        <div style={{ padding: '8px 0' }}>
          {summary.members.map((member, i) => (
            <div
              key={member.memberId}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 18px',
                borderBottom: i < summary.members.length - 1 ? '1px solid var(--border-dim)' : 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {/* Avatar placeholder */}
                <div style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: 'var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--text-secondary)',
                  flexShrink: 0,
                }}>
                  {member.memberName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                    {member.memberName}
                  </p>
                  {member.checkInTime && (
                    <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      In at {timestampToString(member.checkInTime as FirestoreTimestamp, 'time')}
                    </p>
                  )}
                </div>
              </div>
              <AttendanceStatusBadge status={member.status} compact />
            </div>
          ))}
        </div>
      ) : (
        <div style={{ padding: '20px 18px', textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 6 }}>
            <CyanOrbInline size={16} />
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              No attendance records yet today
            </span>
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            Records appear when team members open their workspace
          </p>
        </div>
      )}
    </div>
  )
}
