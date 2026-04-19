'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { db } from '@/firebase/firebaseConfig'
import { collection, onSnapshot, query, limit, orderBy } from 'firebase/firestore'
import { COLLECTIONS } from '@/lib/schema'
import { Sparkles, Bell, CheckSquare, Clock } from 'lucide-react'
import type { CyanAlert } from '@/types'

export function OfficeToolsSidebar() {
  const { user } = useAuth()
  const [alerts, setAlerts] = useState<CyanAlert[]>([])
  const businessId = user?.uid ?? ''

  useEffect(() => {
    if (!businessId) return
    const q = query(collection(db, COLLECTIONS.cyanAlerts(businessId)), orderBy('createdAt', 'desc'), limit(3))
    return onSnapshot(q, snap => setAlerts(snap.docs.map(d => ({ alertId: d.id, ...d.data() } as unknown as CyanAlert))))
  }, [businessId])

  const now = new Date()
  const hour = now.getHours()
  const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'

  return (
    <div style={{ width: 280, flexShrink: 0, borderLeft: '1px solid var(--border-dim)', background: 'var(--navy-mid)', padding: '20px 16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Quick Cyan brief */}
      <div className="cyan-card" style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'radial-gradient(circle at 35% 35%, #00D4FF, #006688)' }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--cyan)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Cyan</span>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          Good {timeOfDay}. The office is live. Click any department to see your team at work.
        </p>
      </div>

      {/* Recent alerts */}
      {alerts.length > 0 && (
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Recent Alerts</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {alerts.slice(0, 2).map(alert => (
              <div key={alert.alertId} className="card" style={{ padding: '10px 14px', borderLeft: `3px solid ${alert.severity === 'warning' ? 'var(--orange)' : alert.severity === 'critical' ? 'var(--red)' : 'var(--cyan)'}` }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{alert.title}</p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{alert.summary}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick links */}
      <div>
        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Quick Access</p>
        {[
          { icon: Sparkles, label: 'Ask Cyan', href: '/cyan', color: 'var(--cyan)' },
          { icon: CheckSquare, label: 'View tasks', href: '/tasks', color: 'var(--green)' },
          { icon: Bell, label: 'Alerts', href: '/alerts', color: 'var(--orange)' },
          { icon: Clock, label: 'Attendance', href: '/attendance', color: 'var(--gold)' },
        ].map(({ icon: Icon, label, href, color }) => (
          <a key={href} href={href} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 9, textDecoration: 'none', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500, marginBottom: 2, transition: 'all 150ms' }}>
            <Icon size={14} style={{ color, flexShrink: 0 }} />
            {label}
          </a>
        ))}
      </div>
    </div>
  )
}