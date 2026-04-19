'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { PersonalMorningCard } from '@/components/workspace/PersonalMorningCard'
import { MemberProfileCard } from '@/components/workspace/MemberProfileCard'
import { WellbeingCheckIn } from '@/components/workspace/WellbeingCheckIn'
import { MemberAttendanceHistory } from '@/components/attendance/MemberAttendanceHistory'
import { TokenGauge } from '@/components/dashboard/TokenGauge'
import { Sparkles, CheckSquare, TrendingUp, User, Settings } from 'lucide-react'

export default function WorkspacePage() {
  const { user } = useAuth()
  const [statusMsg, setStatusMsg] = useState('')
  const [editingStatus, setEditingStatus] = useState(false)

  return (
    <main style={{ minHeight: '100vh', background: 'var(--navy)', padding: '48px 24px' }}>
      <div className="animate-fade-up stagger" style={{ maxWidth: 720, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: 4 }}>My Workspace</h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Your personal command centre</p>
          </div>
          <a href="/settings" style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 14px', textDecoration: 'none', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600 }}>
            <Settings size={13} /> Settings
          </a>
        </div>

        {/* Profile card */}
        <div className="animate-fade-up" style={{ marginBottom: 16 }}>
          <MemberProfileCard />
        </div>

        {/* Status message */}
        <div className="animate-fade-up card" style={{ padding: '14px 18px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          <User size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          {editingStatus ? (
            <input
              autoFocus
              className="cyan-input"
              value={statusMsg}
              onChange={e => setStatusMsg(e.target.value)}
              onBlur={() => setEditingStatus(false)}
              onKeyDown={e => e.key === 'Enter' && setEditingStatus(false)}
              placeholder="Set a status message..."
              style={{ flex: 1, padding: '6px 10px', fontSize: 13 }}
            />
          ) : (
            <button onClick={() => setEditingStatus(true)} style={{ flex: 1, background: 'none', border: 'none', cursor: 'pointer', color: statusMsg ? 'var(--text-secondary)' : 'var(--text-muted)', fontSize: 13, textAlign: 'left', fontStyle: statusMsg ? 'italic' : 'normal' }}>
              {statusMsg ? `"${statusMsg}"` : 'Set a status (e.g. "Deep work — back at 3pm")'}
            </button>
          )}
        </div>

        {/* Cyan morning briefing */}
        <div className="animate-fade-up" style={{ marginBottom: 16 }}>
          <PersonalMorningCard />
        </div>

        {/* Quick stats row */}
        <div className="animate-fade-up" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
          <div className="card p-5">
            <TokenGauge />
          </div>
          <div className="card" style={{ padding: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>Quick links</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { icon: Sparkles, label: 'Chat with Cyan', href: '/cyan', color: 'var(--cyan)' },
                { icon: CheckSquare, label: 'My tasks', href: '/tasks', color: 'var(--green)' },
                { icon: TrendingUp, label: 'Dashboard', href: '/dashboard', color: 'var(--gold)' },
              ].map(({ icon: Icon, label, href, color }) => (
                <a key={href} href={href} style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 500 }}>
                  <Icon size={13} style={{ color, flexShrink: 0 }} />{label}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Attendance history */}
        <div className="animate-fade-up">
          <MemberAttendanceHistory />
        </div>
      </div>

      <WellbeingCheckIn />
    </main>
  )
}