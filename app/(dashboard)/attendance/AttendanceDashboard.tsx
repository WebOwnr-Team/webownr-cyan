'use client'

import { useState } from 'react'
import { Users, Clock } from 'lucide-react'
import { AttendanceSummaryCard } from '@/components/attendance/AttendanceSummaryCard'
import { MemberAttendanceHistory } from '@/components/attendance/MemberAttendanceHistory'
import { useBusinessContext } from '@/hooks'

type Tab = 'today' | 'history'

export function AttendanceDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('today')
  const { context } = useBusinessContext()

  return (
    <main style={{
      minHeight: '100vh',
      background: 'var(--navy)',
      padding: '48px 24px',
    }}>
      <div
        className="animate-fade-up"
        style={{ maxWidth: 720, margin: '0 auto' }}
      >
        {/* Page header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
            Attendance
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {context?.identity.businessName} ·{' '}
            {context?.team.workSchedule.workStartTime}–{context?.team.workSchedule.workEndTime}{' '}
            {context?.team.workSchedule.timezone}
          </p>
        </div>

        {/* Tab selector */}
        <div style={{
          display: 'flex',
          gap: 4,
          background: 'var(--card-bg)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: 4,
          width: 'fit-content',
          marginBottom: 20,
        }}>
          {([
            { key: 'today', label: 'Today', icon: <Users size={13} /> },
            { key: 'history', label: 'My History', icon: <Clock size={13} /> },
          ] as { key: Tab; label: string; icon: React.ReactNode }[]).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 14px',
                borderRadius: 7,
                border: 'none',
                background: activeTab === tab.key ? 'var(--cyan-subtle)' : 'transparent',
                color: activeTab === tab.key ? 'var(--cyan)' : 'var(--text-muted)',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 150ms',
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'today' && <AttendanceSummaryCard />}
        {activeTab === 'history' && <MemberAttendanceHistory />}
      </div>
    </main>
  )
}
