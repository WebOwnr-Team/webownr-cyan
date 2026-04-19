'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { db } from '@/firebase/firebaseConfig'
import { collection, onSnapshot, query } from 'firebase/firestore'
import { COLLECTIONS } from '@/lib/schema'
import type { TeamMember, MemberRole, Department } from '@/types'
import { UserPlus, Copy, Check, X, Circle, Mail } from 'lucide-react'

const ROLES: MemberRole[] = ['founder', 'department_head', 'team_member', 'contractor', 'client']
const DEPARTMENTS: Department[] = ['general', 'sales', 'marketing', 'development', 'design', 'operations', 'finance', 'customer_success', 'content']

export default function TeamPage() {
  const { user } = useAuth()
  const [members, setMembers] = useState<TeamMember[]>([])
  const [showInvite, setShowInvite] = useState(false)
  const [inviteForm, setInviteForm] = useState({ email: '', name: '', role: 'team_member' as MemberRole, department: 'general' as Department })
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteResult, setInviteResult] = useState<{ url: string; message: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  const businessId = user?.uid ?? ''

  useEffect(() => {
    if (!businessId) return
    const unsub = onSnapshot(query(collection(db, COLLECTIONS.teamMembers(businessId))), snap => {
      setMembers(snap.docs.map(d => ({ memberId: d.id, ...d.data() } as TeamMember)))
    })
    return unsub
  }, [businessId])

  const handleInvite = async () => {
    if (!inviteForm.email.trim() || !inviteForm.name.trim()) { setError('Name and email are required.'); return }
    setError(''); setInviteLoading(true)
    try {
      const token = await user?.getIdToken()
      const res = await fetch('/api/cyan/invite', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(inviteForm) })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to send invite'); return }
      setInviteResult({ url: data.inviteUrl, message: data.message })
    } catch { setError('Network error. Try again.') }
    finally { setInviteLoading(false) }
  }

  const copyLink = async () => {
    if (!inviteResult?.url) return
    await navigator.clipboard.writeText(inviteResult.url)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  const onlineCount = members.filter(m => m.isOnline).length

  return (
    <main style={{ minHeight: '100vh', background: 'var(--navy)', padding: '48px 24px' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: 4 }}>Team</h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{onlineCount} online · {members.length} total</p>
          </div>
          <button
            onClick={() => { setShowInvite(true); setInviteResult(null); setError('') }}
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--cyan)', color: 'var(--navy)', border: 'none', borderRadius: 10, padding: '10px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
          >
            <UserPlus size={15} /> Invite member
          </button>
        </div>

        {/* Invite modal */}
        {showInvite && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(5,13,26,0.85)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <div className="card" style={{ width: '100%', maxWidth: 480, padding: 28, position: 'relative' }}>
              <button onClick={() => setShowInvite(false)} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
              <h2 style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: 4 }}>Invite team member</h2>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>They'll receive an invite link to join your workspace.</p>

              {!inviteResult ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 6 }}>Full name</label>
                    <input className="cyan-input" value={inviteForm.name} onChange={e => setInviteForm(f => ({ ...f, name: e.target.value }))} placeholder="Tolu Adeyemi" style={{ width: '100%', padding: '10px 14px', fontSize: 13 }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 6 }}>Email</label>
                    <input className="cyan-input" type="email" value={inviteForm.email} onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))} placeholder="tolu@company.com" style={{ width: '100%', padding: '10px 14px', fontSize: 13 }} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 6 }}>Role</label>
                      <select className="cyan-input" value={inviteForm.role} onChange={e => setInviteForm(f => ({ ...f, role: e.target.value as MemberRole }))} style={{ width: '100%', padding: '10px 14px', fontSize: 13 }}>
                        {ROLES.map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 6 }}>Department</label>
                      <select className="cyan-input" value={inviteForm.department} onChange={e => setInviteForm(f => ({ ...f, department: e.target.value as Department }))} style={{ width: '100%', padding: '10px 14px', fontSize: 13 }}>
                        {DEPARTMENTS.map(d => <option key={d} value={d}>{d.replace('_', ' ')}</option>)}
                      </select>
                    </div>
                  </div>
                  {error && <p style={{ fontSize: 12, color: 'var(--orange)' }}>{error}</p>}
                  <button onClick={handleInvite} disabled={inviteLoading} style={{ background: 'var(--cyan)', color: 'var(--navy)', border: 'none', borderRadius: 10, padding: '12px', fontSize: 14, fontWeight: 700, cursor: inviteLoading ? 'not-allowed' : 'pointer', opacity: inviteLoading ? 0.7 : 1 }}>
                    {inviteLoading ? 'Sending...' : 'Send invite'}
                  </button>
                </div>
              ) : (
                <div>
                  <div className="alert-green" style={{ padding: '12px 16px', marginBottom: 16 }}>
                    <p style={{ fontSize: 13, color: 'var(--green)', fontWeight: 600, marginBottom: 2 }}>Invite created!</p>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{inviteResult.message}</p>
                  </div>
                  <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Invite link</p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input readOnly value={inviteResult.url} className="cyan-input" style={{ flex: 1, padding: '10px 14px', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis' }} />
                    <button onClick={copyLink} style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, background: copied ? 'var(--green)' : 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: copied ? 'var(--navy)' : 'var(--text-primary)', transition: 'all 150ms' }}>
                      {copied ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy</>}
                    </button>
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 10 }}>Share this link with {inviteForm.name}. Expires in 7 days.</p>
                  <button onClick={() => { setInviteResult(null); setInviteForm({ email: '', name: '', role: 'team_member', department: 'general' }) }} style={{ marginTop: 16, background: 'none', border: '1px solid var(--border)', borderRadius: 10, padding: '10px', width: '100%', fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    Invite another person
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Member list */}
        {members.length === 0 ? (
          <div className="card" style={{ padding: 40, textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--card-bg)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <UserPlus size={24} style={{ color: 'var(--cyan)' }} />
            </div>
            <p style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: 8 }}>Your team is empty</p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>Invite team members to get started. They'll appear in The Office once they join.</p>
            <button onClick={() => setShowInvite(true)} style={{ background: 'var(--cyan)', color: 'var(--navy)', border: 'none', borderRadius: 10, padding: '11px 24px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              Invite first member
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {members.map(member => (
              <div key={member.memberId} className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: member.isOnline ? 'var(--cyan)' : 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: member.isOnline ? 'var(--navy)' : 'var(--text-muted)' }}>{member.name[0].toUpperCase()}</div>
                  <div style={{ position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: '50%', background: member.isOnline ? 'var(--green)' : 'var(--border)', border: '2px solid var(--card-bg)', boxShadow: member.isOnline ? '0 0 6px var(--green)' : 'none' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{member.name}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{member.role.replace('_', ' ')}</span>
                    <span style={{ color: 'var(--border)' }}>·</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{member.department}</span>
                  </div>
                  {member.email && <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{member.email}</p>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  <Circle size={8} style={{ color: member.isOnline ? 'var(--green)' : 'var(--text-muted)', fill: 'currentColor' }} />
                  <span style={{ fontSize: 12, color: member.isOnline ? 'var(--green)' : 'var(--text-muted)', fontWeight: 600 }}>{member.isOnline ? 'Online' : 'Offline'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}