'use client'

import { useState } from 'react'
import { Flame, Edit2, Check, X } from 'lucide-react'
import { useMember, useAttendance } from '@/hooks'
import { CyanOrbInline } from '@/components/ui/CyanOrb'
import { Badge } from '@/components/ui/Badge'
import { AttendanceStatusBadge } from '@/components/attendance/AttendanceStatusBadge'

// ─────────────────────────────────────────────
// MemberProfileCard
//
// Top section of the personal workspace.
// Shows: name, role, status message, streak, online state.
// Allows editing: status message and Cyan nickname inline.
// ─────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  founder:         'Founder',
  department_head: 'Department Head',
  team_member:     'Team Member',
  contractor:      'Contractor',
  client:          'Client',
}

const DEPT_LABELS: Record<string, string> = {
  general:          'General',
  sales:            'Sales',
  marketing:        'Marketing',
  development:      'Development',
  design:           'Design',
  operations:       'Operations',
  finance:          'Finance',
  customer_success: 'Customer Success',
  content:          'Content',
}

export function MemberProfileCard() {
  const { member, loading, updateProfile } = useMember()
  const { todayRecord, isCheckedIn, isCheckedOut } = useAttendance()

  const [editingStatus, setEditingStatus] = useState(false)
  const [editingNickname, setEditingNickname] = useState(false)
  const [statusDraft, setStatusDraft] = useState('')
  const [nicknameDraft, setNicknameDraft] = useState('')

  if (loading) {
    return (
      <div className="card p-5">
        <div className="flex items-center gap-4">
          <div className="skeleton" style={{ width: 48, height: 48, borderRadius: '50%' }} />
          <div style={{ flex: 1 }}>
            <div className="skeleton" style={{ width: '40%', height: 16, marginBottom: 8 }} />
            <div className="skeleton" style={{ width: '60%', height: 11 }} />
          </div>
        </div>
      </div>
    )
  }

  if (!member) return null

  const handleSaveStatus = async () => {
    await updateProfile({ statusMessage: statusDraft })
    setEditingStatus(false)
  }

  const handleSaveNickname = async () => {
    await updateProfile({ cyanSettings: { nickname: nicknameDraft } })
    setEditingNickname(false)
  }

  const presenceColor = isCheckedIn && !isCheckedOut ? 'var(--green)' : 'var(--text-muted)'

  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <div style={{ padding: '18px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
          {/* Avatar */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%',
              background: 'var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, fontWeight: 700, color: 'var(--text-secondary)',
              border: '2px solid var(--border)',
            }}>
              {member.name.charAt(0).toUpperCase()}
            </div>
            {/* Presence dot */}
            <div style={{
              position: 'absolute', bottom: 1, right: 1,
              width: 12, height: 12, borderRadius: '50%',
              background: presenceColor,
              border: '2px solid var(--card-bg)',
              boxShadow: isCheckedIn && !isCheckedOut ? `0 0 6px var(--green)` : 'none',
            }} />
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700 }}>
                {member.name}
              </h2>
              <Badge variant={member.role === 'founder' ? 'cyan' : 'muted'}>
                {ROLE_LABELS[member.role] ?? member.role}
              </Badge>
            </div>

            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
              {DEPT_LABELS[member.department] ?? member.department}
            </p>

            {/* Status message */}
            {editingStatus ? (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input
                  className="form-input"
                  style={{ flex: 1, padding: '5px 10px', fontSize: 12 }}
                  value={statusDraft}
                  onChange={e => setStatusDraft(e.target.value)}
                  maxLength={80}
                  autoFocus
                  onKeyDown={e => {
                    if (e.key === 'Enter') void handleSaveStatus()
                    if (e.key === 'Escape') setEditingStatus(false)
                  }}
                />
                <button onClick={() => void handleSaveStatus()} style={iconBtnStyle}><Check size={12} color="var(--green)" /></button>
                <button onClick={() => setEditingStatus(false)} style={iconBtnStyle}><X size={12} color="var(--text-muted)" /></button>
              </div>
            ) : (
              <div
                style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
                onClick={() => { setStatusDraft(member.statusMessage); setEditingStatus(true) }}
              >
                <p style={{ fontSize: 12, color: member.statusMessage ? 'var(--text-secondary)' : 'var(--text-muted)', fontStyle: member.statusMessage ? 'normal' : 'italic' }}>
                  {member.statusMessage || 'Set a status…'}
                </p>
                <Edit2 size={10} style={{ color: 'var(--text-muted)' }} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
        borderTop: '1px solid var(--border-dim)',
      }}>
        {/* Streak */}
        <div style={{ padding: '12px 16px', borderRight: '1px solid var(--border-dim)', textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 3 }}>
            <Flame size={13} style={{ color: 'var(--orange)' }} />
            <span style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-display)', color: member.currentStreak > 0 ? 'var(--orange)' : 'var(--text-muted)' }}>
              {member.currentStreak}
            </span>
          </div>
          <p style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Day streak
          </p>
        </div>

        {/* Today status */}
        <div style={{ padding: '12px 16px', borderRight: '1px solid var(--border-dim)', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 3 }}>
            {todayRecord
              ? <AttendanceStatusBadge status={todayRecord.status} compact />
              : <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>—</span>
            }
          </div>
          <p style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Today
          </p>
        </div>

        {/* Cyan nickname */}
        <div style={{ padding: '12px 16px', textAlign: 'center' }}>
          {editingNickname ? (
            <div style={{ display: 'flex', gap: 4, alignItems: 'center', justifyContent: 'center' }}>
              <input
                className="form-input"
                style={{ width: 80, padding: '3px 8px', fontSize: 11, textAlign: 'center' }}
                value={nicknameDraft}
                onChange={e => setNicknameDraft(e.target.value)}
                maxLength={20}
                autoFocus
                onKeyDown={e => {
                  if (e.key === 'Enter') void handleSaveNickname()
                  if (e.key === 'Escape') setEditingNickname(false)
                }}
              />
              <button onClick={() => void handleSaveNickname()} style={iconBtnStyle}><Check size={11} color="var(--green)" /></button>
            </div>
          ) : (
            <div
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
              onClick={() => { setNicknameDraft(member.cyanSettings.nickname); setEditingNickname(true) }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
                <CyanOrbInline size={12} />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--cyan)' }}>
                  {member.cyanSettings.nickname}
                </span>
              </div>
            </div>
          )}
          <p style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            AI name
          </p>
        </div>
      </div>
    </div>
  )
}

const iconBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer', padding: 3,
  display: 'flex', alignItems: 'center',
}
