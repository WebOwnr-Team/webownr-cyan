'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { db } from '@/firebase/firebaseConfig'
import { collection, onSnapshot, query } from 'firebase/firestore'
import { COLLECTIONS } from '@/lib/schema'
import { useBusinessContext } from '@/hooks'
import type { TeamMember, Department } from '@/types'
import { Monitor, Palette, TrendingUp, Megaphone, Settings, DollarSign, Headphones, FileText } from 'lucide-react'

const DEPARTMENTS: { key: Department; label: string; icon: React.ElementType; color: string }[] = [
  { key: 'development', label: 'Development', icon: Monitor,     color: '#00D4FF' },
  { key: 'design',      label: 'Design',      icon: Palette,     color: '#9C6FFF' },
  { key: 'sales',       label: 'Sales',       icon: TrendingUp,  color: '#00E676' },
  { key: 'marketing',   label: 'Marketing',   icon: Megaphone,   color: '#FFD700' },
  { key: 'operations',  label: 'Operations',  icon: Settings,    color: '#FF6B35' },
  { key: 'finance',     label: 'Finance',     icon: DollarSign,  color: '#00E676' },
  { key: 'customer_success', label: 'Customer Success', icon: Headphones, color: '#00D4FF' },
  { key: 'content',     label: 'Content',     icon: FileText,    color: '#9C6FFF' },
]

interface Props { onSelectDepartment: (dept: string) => void }

export function OfficeFloorPlan({ onSelectDepartment }: Props) {
  const { user } = useAuth()
  const { context } = useBusinessContext()
  const [members, setMembers] = useState<TeamMember[]>([])
  const [cyanSummary, setCyanSummary] = useState<string>('')
  const [loadingSummary, setLoadingSummary] = useState(false)

  const businessId = user?.uid ?? ''

  useEffect(() => {
    if (!businessId) return
    const q = query(collection(db, COLLECTIONS.teamMembers(businessId)))
    const unsub = onSnapshot(q, (snap) => {
      setMembers(snap.docs.map(d => ({ memberId: d.id, ...d.data() } as TeamMember)))
    })
    return unsub
  }, [businessId])

  // Fetch Cyan office summary
  useEffect(() => {
    if (!businessId) return
    setLoadingSummary(true)
    fetch('/api/cyan/office-summary', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ businessId }) })
      .then(r => r.json()).then(d => { if (d.summary) setCyanSummary(d.summary) })
      .catch(() => {})
      .finally(() => setLoadingSummary(false))
  }, [businessId])

  const onlineCount = members.filter(m => m.isOnline).length
  const totalCount = members.length

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Cyan Office Brief */}
      {(cyanSummary || loadingSummary) && (
        <div className="cyan-card" style={{ padding: '14px 18px', marginBottom: 24 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--cyan)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Cyan · Office Overview</p>
          {loadingSummary ? (
            <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
              <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
            </div>
          ) : (
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{cyanSummary}</p>
          )}
        </div>
      )}

      {/* Building header */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 12, padding: '8px 20px', marginBottom: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: onlineCount > 0 ? 'var(--green)' : 'var(--text-muted)', boxShadow: onlineCount > 0 ? '0 0 6px var(--green)' : 'none' }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{onlineCount} online</span>
          <span style={{ color: 'var(--border)', fontSize: 12 }}>·</span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{totalCount} total</span>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Click any department to zoom in</p>
      </div>

      {/* Building SVG layout */}
      <div style={{ background: 'var(--navy-mid)', border: '1px solid var(--border)', borderRadius: 20, padding: '32px 24px', position: 'relative', overflow: 'hidden' }}>
        {/* Building label */}
        <div style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          {context?.identity.businessName ?? 'Headquarters'}
        </div>

        {/* Department grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginTop: 16 }}>
          {DEPARTMENTS.map(({ key, label, icon: Icon, color }) => {
            const deptMembers = members.filter(m => m.department === key)
            const deptOnline = deptMembers.filter(m => m.isOnline)
            const hasMembers = deptMembers.length > 0

            return (
              <div
                key={key}
                onClick={() => onSelectDepartment(key)}
                className="card-hover"
                style={{
                  background: 'var(--card-bg)', border: `1px solid ${hasMembers ? color + '30' : 'var(--border)'}`,
                  borderRadius: 14, padding: '16px 12px', cursor: 'pointer', position: 'relative',
                  minHeight: 120, display: 'flex', flexDirection: 'column', gap: 8,
                  transition: 'all 200ms',
                }}
              >
                {/* Light on/off indicator */}
                <div style={{ position: 'absolute', top: 10, right: 10, width: 8, height: 8, borderRadius: '50%', background: deptOnline.length > 0 ? color : 'var(--border)', boxShadow: deptOnline.length > 0 ? `0 0 8px ${color}` : 'none', transition: 'all 300ms' }} />

                <div style={{ width: 32, height: 32, borderRadius: 10, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={16} style={{ color }} />
                </div>

                <div>
                  <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>{label}</p>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {deptMembers.length === 0 ? 'No members' : `${deptOnline.length}/${deptMembers.length} online`}
                  </p>
                </div>

                {/* Member avatars */}
                {deptMembers.length > 0 && (
                  <div style={{ display: 'flex', gap: -4, marginTop: 'auto' }}>
                    {deptMembers.slice(0, 4).map((m, i) => (
                      <div key={m.memberId} style={{ width: 22, height: 22, borderRadius: '50%', background: m.isOnline ? color : 'var(--border)', border: '2px solid var(--card-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: m.isOnline ? 'var(--navy)' : 'var(--text-muted)', marginLeft: i > 0 ? -8 : 0, zIndex: deptMembers.length - i }}>
                        {m.name[0].toUpperCase()}
                      </div>
                    ))}
                    {deptMembers.length > 4 && <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--border)', border: '2px solid var(--card-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: 'var(--text-muted)', marginLeft: -8 }}>+{deptMembers.length - 4}</div>}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Lobby strip */}
        <div style={{ marginTop: 20, background: 'rgba(0,212,255,0.04)', border: '1px solid rgba(0,212,255,0.1)', borderRadius: 12, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--cyan)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>Lobby</p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>General · All hands</p>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
            {members.filter(m => m.department === 'general').slice(0, 6).map((m, i) => (
              <div key={m.memberId} title={m.name} style={{ width: 28, height: 28, borderRadius: '50%', background: m.isOnline ? 'var(--cyan)' : 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: m.isOnline ? 'var(--navy)' : 'var(--text-muted)', border: '2px solid var(--navy-mid)' }}>
                {m.name[0].toUpperCase()}
              </div>
            ))}
            {members.length === 0 && <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Invite your team to populate the office →</p>}
          </div>
        </div>
      </div>
    </div>
  )
}