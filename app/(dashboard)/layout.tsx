'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { AttendanceAutoCheckIn } from '@/components/attendance/AttendanceAutoCheckIn'

// ─────────────────────────────────────────────
// Inner guard — reads auth state, redirects if not authed
// ─────────────────────────────────────────────

function DashboardGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'var(--navy)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div className="flex gap-1.5">
          <span className="typing-dot" />
          <span className="typing-dot" />
          <span className="typing-dot" />
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <>
      {/* Auto check-in fires silently on every dashboard route */}
      <AttendanceAutoCheckIn />
      {children}
    </>
  )
}

// ─────────────────────────────────────────────
// Dashboard layout — wraps all /dashboard/* routes
// Phase 5: AttendanceAutoCheckIn added here
// ─────────────────────────────────────────────

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <DashboardGuard>
        {children}
      </DashboardGuard>
    </AuthProvider>
  )
}
