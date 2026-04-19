'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { db } from '@/firebase/firebaseConfig'
import { collection, onSnapshot, query } from 'firebase/firestore'
import { COLLECTIONS } from '@/lib/schema'
import type { TeamMember } from '@/types'
import { ArrowLeft, Circle, Clock, CheckCircle2 } from 'lucide-react'

interface Props { departmentFilter: string | null; onBack: () => void }

export function DepartmentView({ departmentFilter, onBack }: Props) {
  const { user } = useAuth()
  const [members, setMembers] = useState<TeamMember[]>([])
  const businessId = user?.uid ?? ''

  useEffect(() => {
    if (!businessId) return
    const unsub = onSnapshot(query(collection(db, COLLECTIONS.teamMembers(businessId))), snap => {
      setMembers(snap.docs.map(d => ({ memberId: d.id, ...d.data() } as TeamMember)))
    })
    return unsub
  }, [businessId])

  const filtered = departmentFilter ? members.filter(m => m.department === departmentFilter) : members

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13, marginBottom: 20, padding: '6px 0' }}>
        <ArrowLeft size={15} /> Back to floor plan
      </button>

      <h2 style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: 4, textTransform: 'capitalize' }}>
        {departmentFilter ?? 'All Departments'}
      </h2>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 24 }}>{filtered.length} team members</p>

      {filtered.length === 0 ? (
        <div className="card" style={{ padding: 32, textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No team members in this department yet.</p>
          <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 8 }}>Go to Team → Invite to add someone.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {filtered.map(member => (
            <div key={member.memberId} className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: member.isOnline ? 'var(--cyan)' : 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: member.isOnline ? 'var(--navy)' : 'var(--text-muted)' }}>
                  {member.name[0].toUpperCase()}
                </div>
                <div style={{ position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: '50%', background: member.isOnline ? 'var(--green)' : 'var(--text-muted)', border: '2px solid var(--card-bg)', boxShadow: member.isOnline ? '0 0 6px var(--green)' : 'none' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{member.name}</p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{member.role.replace('_', ' ')} · {member.department}</p>
                {member.statusMessage && <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2, fontStyle: 'italic' }}>"{member.statusMessage}"</p>}
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'flex-end', marginBottom: 4 }}>
                  <Circle size={8} style={{ color: member.isOnline ? 'var(--green)' : 'var(--text-muted)', fill: 'currentColor' }} />
                  <span style={{ fontSize: 11, color: member.isOnline ? 'var(--green)' : 'var(--text-muted)', fontWeight: 600 }}>
                    {member.isOnline ? 'Online' : 'Offline'}
                  </span>
                </div>
                <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{member.tasksCompletedTotal} tasks done</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}