'use client'

import { useEffect, useRef, useState, Component, type ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard, Sparkles, Building2, Users, CalendarCheck,
  Bell, LogOut, Menu, X, ChevronRight, CheckSquare, Settings,
} from 'lucide-react'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { AttendanceAutoCheckIn } from '@/components/attendance/AttendanceAutoCheckIn'

interface ErrorBoundaryState { hasError: boolean; message: string }
class DashboardErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode }) { super(props); this.state = { hasError: false, message: '' } }
  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { hasError: true, message: error instanceof Error ? error.message : 'Unexpected error' }
  }
  componentDidCatch(error: unknown, info: { componentStack?: string }) {
    console.error('[DashboardErrorBoundary]', error, info.componentStack)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', background: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ maxWidth: 420, width: '100%', background: 'var(--card-bg)', border: '1px solid rgba(255,107,53,0.3)', borderLeft: '3px solid var(--orange)', borderRadius: 14, padding: 24 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--orange)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Something went wrong</p>
            <p style={{ fontSize: 14, color: 'var(--text-primary)', marginBottom: 4 }}>{this.state.message}</p>
            <button onClick={() => window.location.reload()} style={{ background: 'var(--cyan)', color: 'var(--navy)', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Reload page</button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// 1. Define clear interfaces
interface NavItem {
  href: string
  label: string
  icon: React.ElementType
}

interface NavSection {
  label: string
  items: NavItem[]
}

// 2. Apply the type to your array (and remove 'as const')
const NAV_SECTIONS: NavSection[] = [
  { label: 'Workspace', items: [
    { href: '/dashboard',  label: 'Dashboard',    icon: LayoutDashboard },
    { href: '/office',     label: 'The Office',   icon: Building2       },
    { href: '/workspace',  label: 'My Workspace', icon: Users           },
    { href: '/tasks',      label: 'Tasks',        icon: CheckSquare     },
  ]},
  { label: 'Intelligence', items: [
    { href: '/cyan',       label: 'Cyan AI',      icon: Sparkles        },
    { href: '/alerts',     label: 'Alerts',       icon: Bell            },
  ]},
  { label: 'People', items: [
    { href: '/team',       label: 'Team',         icon: Users           },
    { href: '/attendance', label: 'Attendance',   icon: CalendarCheck   },
  ]},
  { label: 'Configure', items: [
    { href: '/settings',   label: 'Settings',     icon: Settings        },
  ]},
]

// You can keep this for the BottomTabBar, or just use NavItem[]
type NavItemType = NavItem


function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname()
  const { logout, user } = useAuth()
  const router = useRouter()
  const handleLogout = async () => { await logout(); router.replace('/login') }

  return (
    <aside style={{ width: 224, minHeight: '100vh', background: 'var(--navy-mid)', borderRight: '1px solid var(--border-dim)', display: 'flex', flexDirection: 'column', padding: '0 0 20px', flexShrink: 0, position: 'sticky', top: 0, height: '100vh', overflowY: 'auto' }}>
      <div style={{ padding: '18px 16px 14px', borderBottom: '1px solid var(--border-dim)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'radial-gradient(circle at 35% 35%, #00D4FF, #006688)', flexShrink: 0, boxShadow: '0 0 12px rgba(0,212,255,0.25)' }} />
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-display)', lineHeight: 1.1, marginBottom: 1 }}>WebOwnr</p>
            <p style={{ fontSize: 10, color: 'var(--cyan)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Cyan OS</p>
          </div>
        </div>
        {onClose && <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}><X size={18} /></button>}
      </div>

      <nav style={{ flex: 1, padding: '10px 10px 0', overflowY: 'auto' }}>
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 12px', marginBottom: 4 }}>{section.label}</p>
            {section.items.map(({ href, label, icon: Icon }) => {
              const active = pathname === href
              return (
                <Link key={href} href={href} onClick={onClose} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 9, marginBottom: 1, color: active ? 'var(--cyan)' : 'var(--text-secondary)', background: active ? 'rgba(0,212,255,0.08)' : 'transparent', textDecoration: 'none', fontSize: 13, fontWeight: active ? 600 : 500, border: active ? '1px solid rgba(0,212,255,0.15)' : '1px solid transparent', transition: 'color 150ms, background 150ms' }}>
                  <Icon size={15} strokeWidth={active ? 2.5 : 2} style={{ flexShrink: 0 }} />
                  {label}
                  {active && <ChevronRight size={11} style={{ marginLeft: 'auto', opacity: 0.4 }} />}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      <div style={{ padding: '0 10px' }}>
        <div style={{ height: 1, background: 'var(--border-dim)', marginBottom: 10 }} />
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', marginBottom: 4 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 12, fontWeight: 700, color: 'var(--cyan)' }}>
              {(user.displayName ?? user.email ?? '?')[0].toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.displayName ?? 'You'}</p>
              <p style={{ fontSize: 10, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</p>
            </div>
          </div>
        )}
        <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 12px', borderRadius: 9, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13, fontWeight: 500 }}>
          <LogOut size={15} style={{ flexShrink: 0 }} /> Sign out
        </button>
      </div>
    </aside>
  )
}

const BOTTOM_NAV: NavItemType[] = [
  { href: '/dashboard', label: 'Home',   icon: LayoutDashboard },
  { href: '/office',    label: 'Office', icon: Building2       },
  { href: '/cyan',      label: 'Cyan',   icon: Sparkles        },
  { href: '/tasks',     label: 'Tasks',  icon: CheckSquare     },
  { href: '/team',      label: 'Team',   icon: Users           },
]

function BottomTabBar() {
  const pathname = usePathname()
  return (
    <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: 60, background: 'var(--navy-mid)', borderTop: '1px solid var(--border-dim)', display: 'flex', alignItems: 'stretch', zIndex: 100, paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {BOTTOM_NAV.map(({ href, label, icon: Icon }) => {
        const active = pathname === href
        return (
          <Link key={href} href={href} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, textDecoration: 'none', color: active ? 'var(--cyan)' : 'var(--text-muted)', fontSize: 10, fontWeight: active ? 700 : 500, position: 'relative', paddingTop: 6 }}>
            {active && <span style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 24, height: 2, borderRadius: '0 0 2px 2px', background: 'var(--cyan)', boxShadow: '0 0 8px var(--cyan)' }} />}
            <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
            <span>{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

function MobileHeader({ onMenuOpen }: { onMenuOpen: () => void }) {
  const pathname = usePathname()
 const allItems = NAV_SECTIONS.flatMap(s => s.items)
  const current = allItems.find(item => pathname === item.href)
  return (
    <header style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 52, background: 'var(--navy-mid)', borderBottom: '1px solid var(--border-dim)', display: 'flex', alignItems: 'center', padding: '0 16px', zIndex: 90, gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
        <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'radial-gradient(circle at 35% 35%, #00D4FF, #006688)' }} />
        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>{current?.label ?? 'WebOwnr'}</span>
      </div>
      <button onClick={onMenuOpen} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 6 }}><Menu size={20} /></button>
    </header>
  )
}

function MobileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  if (!open) return null
  return (
    <div ref={ref} onClick={(e) => { if (e.target === ref.current) onClose() }} style={{ position: 'fixed', inset: 0, background: 'rgba(5,13,26,0.85)', zIndex: 200, display: 'flex' }}>
      <div style={{ width: 240, height: '100%', animation: 'slideInLeft 200ms ease-out both' }}>
        <style>{`@keyframes slideInLeft { from { transform: translateX(-100%); } to { transform: translateX(0); } }`}</style>
        <Sidebar onClose={onClose} />
      </div>
    </div>
  )
}

function DashboardGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [drawerOpen, setDrawerOpen] = useState(false)
  useEffect(() => { if (!loading && !user) router.replace('/login') }, [user, loading, router])
  if (loading) return <div style={{ minHeight: '100vh', background: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ display: 'flex', gap: 6 }}><span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" /></div></div>
  if (!user) return null
  return (
    <>
      <AttendanceAutoCheckIn />
      <div className="wo-desktop"><Sidebar /><main style={{ flex: 1, minWidth: 0, minHeight: '100vh' }}>{children}</main></div>
      <div className="wo-mobile">
        <MobileHeader onMenuOpen={() => setDrawerOpen(true)} />
        <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
        <div style={{ paddingTop: 52, paddingBottom: 68 }}>{children}</div>
        <BottomTabBar />
      </div>
      <style>{`.wo-desktop{display:flex;}.wo-mobile{display:none;}@media(max-width:767px){.wo-desktop{display:none!important;}.wo-mobile{display:block!important;}}`}</style>
    </>
  )
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <AuthProvider><DashboardErrorBoundary><DashboardGuard>{children}</DashboardGuard></DashboardErrorBoundary></AuthProvider>
}