'use client'

import { useEffect, Component, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { AttendanceAutoCheckIn } from '@/components/attendance/AttendanceAutoCheckIn'

// ─────────────────────────────────────────────
// Error Boundary
//
// Catches any client-side JS crash inside the dashboard
// and shows a recoverable error screen instead of a blank page.
// Without this, a single thrown error in any child component
// kills the entire React tree silently.
// ─────────────────────────────────────────────

interface ErrorBoundaryState {
  hasError: boolean
  message: string
}

class DashboardErrorBoundary extends Component<
  { children: ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    const message =
      error instanceof Error ? error.message : 'An unexpected error occurred'
    return { hasError: true, message }
  }

  componentDidCatch(error: unknown, info: { componentStack?: string }) {
    console.error('[DashboardErrorBoundary] Caught error:', error)
    console.error('[DashboardErrorBoundary] Component stack:', info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            background: 'var(--navy)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
        >
          <div
            style={{
              maxWidth: 420,
              width: '100%',
              background: 'var(--card-bg)',
              border: '1px solid rgba(255,107,53,0.3)',
              borderLeft: '3px solid var(--orange)',
              borderRadius: 14,
              padding: '24px',
            }}
          >
            <p
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--orange)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: 8,
              }}
            >
              Something went wrong
            </p>
            <p style={{ fontSize: 14, color: 'var(--text-primary)', marginBottom: 4 }}>
              {this.state.message}
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>
              This error has been logged. Try refreshing the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: 'var(--cyan)',
                color: 'var(--navy)',
                border: 'none',
                borderRadius: 8,
                padding: '10px 20px',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'var(--font-display)',
              }}
            >
              Reload page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// ─────────────────────────────────────────────
// Auth guard — redirects to login if not authenticated
// ─────────────────────────────────────────────

function DashboardGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'var(--navy)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
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
      <AttendanceAutoCheckIn />
      {children}
    </>
  )
}

// ─────────────────────────────────────────────
// Dashboard layout
// Wraps all /dashboard/* routes with:
//   1. AuthProvider — Firebase auth state
//   2. DashboardErrorBoundary — catches any JS crash
//   3. DashboardGuard — redirects unauthenticated users
// ─────────────────────────────────────────────

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <DashboardErrorBoundary>
        <DashboardGuard>
          {children}
        </DashboardGuard>
      </DashboardErrorBoundary>
    </AuthProvider>
  )
}
