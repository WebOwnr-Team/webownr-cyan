'use client'

import { PersonalMorningCard } from '@/components/workspace/PersonalMorningCard'
import { MemberProfileCard } from '@/components/workspace/MemberProfileCard'
import { WellbeingCheckIn } from '@/components/workspace/WellbeingCheckIn'
import { MemberAttendanceHistory } from '@/components/attendance/MemberAttendanceHistory'
import { TokenGauge } from '@/components/dashboard/TokenGauge'

// ─────────────────────────────────────────────
// Personal Workspace — /workspace
//
// Each team member's personal command centre.
// Surfaces Cyan's morning card, their profile,
// attendance history, and Cyan's quiet wellbeing check-in.
//
// Phase 8 — the full personal workspace experience.
// ─────────────────────────────────────────────

export default function WorkspacePage() {
  return (
    <main style={{
      minHeight: '100vh',
      background: 'var(--navy)',
      padding: '48px 24px',
    }}>
      <div
        className="animate-fade-up stagger"
        style={{ maxWidth: 680, margin: '0 auto' }}
      >
        {/* Profile card */}
        <div className="animate-fade-up" style={{ marginBottom: 16 }}>
          <MemberProfileCard />
        </div>

        {/* Cyan morning briefing */}
        <div className="animate-fade-up" style={{ marginBottom: 16 }}>
          <PersonalMorningCard />
        </div>

        {/* Two-column: attendance history + token gauge */}
        <div
          className="animate-fade-up"
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}
        >
          <div className="card p-5">
            <TokenGauge />
          </div>

          <div className="card p-5">
            <p style={{
              fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
              textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10,
            }}>
              This week
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Attendance history and streak tracking are live. Check the Attendance page for your full 30-day record.
            </p>
          </div>
        </div>

        {/* Attendance history */}
        <div className="animate-fade-up">
          <MemberAttendanceHistory />
        </div>
      </div>

      {/* Wellbeing check-in — floats in bottom-right, appears after 90s */}
      <WellbeingCheckIn />
    </main>
  )
}
