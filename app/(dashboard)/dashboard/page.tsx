'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useBusinessContext } from '@/hooks'
import { DailyBriefingCard } from '@/components/dashboard/DailyBriefingCard'
import { TokenGauge } from '@/components/dashboard/TokenGauge'
import { AttendanceSummaryCard } from '@/components/attendance/AttendanceSummaryCard'
import { AlertBar } from '@/components/alerts/AlertBar'
import { CyanOrb } from '@/components/ui/CyanOrb'
import { MetricCardSkeleton } from '@/components/ui/Skeleton'
import { Badge } from '@/components/ui/Badge'
import { formatNGN } from '@/lib/utils'

export default function DashboardPage() {
  const { context, loading, error } = useBusinessContext()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !error && !context) {
      router.replace('/onboarding')
    }
  }, [context, loading, error, router])

  if (loading) {
    return (
      <main style={mainStyle}>
        <div style={{ maxWidth: 680, width: '100%', padding: '0 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
            <div className="skeleton" style={{ width: 36, height: 36, borderRadius: '50%' }} />
            <div style={{ flex: 1 }}>
              <div className="skeleton" style={{ width: '40%', height: 14, marginBottom: 6 }} />
              <div className="skeleton" style={{ width: '25%', height: 10 }} />
            </div>
          </div>
          <div className="skeleton" style={{ height: 200, borderRadius: 14, marginBottom: 16 }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <MetricCardSkeleton />
            <MetricCardSkeleton />
          </div>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main style={mainStyle}>
        <div className="alert-orange p-5" style={{ maxWidth: 440, margin: '0 24px' }}>
          <p style={{ color: 'var(--orange)', fontSize: 14 }}>{error}</p>
        </div>
      </main>
    )
  }

  if (!context) return null

  const { identity, goals, performance, team } = context

  return (
    <main style={mainStyle}>
      <div
        className="animate-fade-up stagger"
        style={{ maxWidth: 680, width: '100%', padding: '0 24px' }}
      >
        {/* Business header */}
        <div className="animate-fade-up" style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
          <CyanOrb size={36} />
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, marginBottom: 2 }}>
              {identity.businessName}
            </h1>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{identity.industry}</p>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <Badge variant="cyan">{identity.productType}</Badge>
          </div>
        </div>

        {/* Alert bar — shows when anomalies are detected */}
        <div className="animate-fade-up">
          <AlertBar />
        </div>

        {/* Daily briefing card */}
        <div className="animate-fade-up" style={{ marginBottom: 16 }}>
          <DailyBriefingCard />
        </div>

        {/* Metrics row */}
        <div
          className="animate-fade-up"
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}
        >
          <div className="card p-5">
            <p style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              Avg weekly revenue
            </p>
            <p style={{ fontSize: 24, fontWeight: 700, fontFamily: 'var(--font-display)', color: performance.avgWeeklyRevenue > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>
              {performance.avgWeeklyRevenue > 0 ? formatNGN(performance.avgWeeklyRevenue, true) : '—'}
            </p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              {performance.avgWeeklyRevenue > 0 ? `baseline: ${formatNGN(performance.revenueBaseline, true)}` : 'set baseline in settings'}
            </p>
          </div>

          <div className="card p-5">
            <p style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              90-day goal
            </p>
            <p style={{
              fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.5,
              display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}>
              {goals.primary90Day || '—'}
            </p>
          </div>
        </div>

        {/* Team + token gauge row */}
        <div
          className="animate-fade-up"
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}
        >
          <div className="card p-5">
            <p style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
              Team
            </p>
            <p style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: 4 }}>
              {team.size} {team.size === 1 ? 'member' : 'members'}
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              {team.workSchedule.workStartTime}–{team.workSchedule.workEndTime} · {team.workSchedule.timezone.split('/')[1] ?? team.workSchedule.timezone}
            </p>
          </div>

          <div className="card p-5">
            <TokenGauge />
          </div>
        </div>

        {/* Attendance summary */}
        <div className="animate-fade-up">
          <AttendanceSummaryCard />
        </div>
      </div>
    </main>
  )
}

const mainStyle: React.CSSProperties = {
  minHeight: '100vh',
  background: 'var(--navy)',
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'center',
  paddingTop: 56,
  paddingBottom: 60,
}
