'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useBusinessContext } from '@/hooks'
import { db } from '@/firebase/firebaseConfig'
import { doc, updateDoc } from 'firebase/firestore'
import { COLLECTIONS, DEFAULT_WORK_SCHEDULE } from '@/lib/schema'
import { Save, Bell, Clock, User, Building2, Sparkles, Shield } from 'lucide-react'

type Tab = 'business' | 'schedule' | 'cyan' | 'notifications' | 'security'

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: 'business',      label: 'Business',     icon: Building2 },
  { key: 'schedule',      label: 'Work Hours',   icon: Clock     },
  { key: 'cyan',          label: 'Cyan AI',      icon: Sparkles  },
  { key: 'notifications', label: 'Notifications',icon: Bell      },
  { key: 'security',      label: 'Security',     icon: Shield    },
]

export default function SettingsPage() {
  const { user } = useAuth()
  const { context, loading } = useBusinessContext()
  const [tab, setTab] = useState<Tab>('business')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [businessForm, setBusinessForm] = useState({
    businessName: '', industry: '', productType: '', targetCustomer: '', revenueModel: '',
  })
  const [scheduleForm, setScheduleForm] = useState({ ...DEFAULT_WORK_SCHEDULE })

  useEffect(() => {
    if (context) {
      setBusinessForm({
        businessName: context.identity.businessName,
        industry: context.identity.industry,
        productType: context.identity.productType,
        targetCustomer: context.identity.targetCustomer,
        revenueModel: context.identity.revenueModel,
      })
      if (context.team.workSchedule) setScheduleForm(context.team.workSchedule)
    }
  }, [context])

  const saveBusinessSettings = async () => {
    if (!user) return
    setSaving(true)
    await updateDoc(doc(db, COLLECTIONS.businessContext(user.uid)), {
      'identity.businessName': businessForm.businessName,
      'identity.industry': businessForm.industry,
      'identity.productType': businessForm.productType,
      'identity.targetCustomer': businessForm.targetCustomer,
      'identity.revenueModel': businessForm.revenueModel,
    })
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2500)
  }

  const saveSchedule = async () => {
    if (!user) return
    setSaving(true)
    await updateDoc(doc(db, COLLECTIONS.businessContext(user.uid)), { 'team.workSchedule': scheduleForm })
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2500)
  }

  if (loading) return <div style={{ minHeight: '100vh', background: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ display: 'flex', gap: 6 }}><span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" /></div></div>

  return (
    <main style={{ minHeight: '100vh', background: 'var(--navy)', padding: '48px 24px' }}>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: 28 }}>Settings</h1>

        <div style={{ display: 'flex', gap: 24 }}>
          {/* Tabs */}
          <div style={{ width: 180, flexShrink: 0 }}>
            {TABS.map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => setTab(key)} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', marginBottom: 2, background: tab === key ? 'rgba(0,212,255,0.08)' : 'transparent', color: tab === key ? 'var(--cyan)' : 'var(--text-secondary)', fontSize: 13, fontWeight: tab === key ? 600 : 500, textAlign: 'left' }}>
                <Icon size={15} />{label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div style={{ flex: 1 }}>
            {tab === 'business' && (
              <div className="card" style={{ padding: 28 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: 20 }}>Business Profile</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {[
                    { label: 'Business name', key: 'businessName', placeholder: 'Adire by Tolu' },
                    { label: 'Industry', key: 'industry', placeholder: 'Fashion, Tech, Services...' },
                    { label: 'What you sell / do', key: 'productType', placeholder: 'Handmade ankara pieces' },
                    { label: 'Target customer', key: 'targetCustomer', placeholder: 'Nigerian women aged 25-40' },
                    { label: 'Revenue model', key: 'revenueModel', placeholder: 'Direct sales via Instagram + website' },
                  ].map(({ label, key, placeholder }) => (
                    <div key={key}>
                      <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 6 }}>{label}</label>
                      <input className="cyan-input" value={(businessForm as Record<string, string>)[key]} onChange={e => setBusinessForm(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder} style={{ width: '100%', padding: '10px 14px', fontSize: 13 }} />
                    </div>
                  ))}
                </div>
                {saved && <p style={{ fontSize: 12, color: 'var(--green)', marginTop: 12 }}>✓ Saved successfully</p>}
                <button onClick={saveBusinessSettings} disabled={saving} style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 8, background: 'var(--cyan)', color: 'var(--navy)', border: 'none', borderRadius: 10, padding: '11px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  <Save size={14} />{saving ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            )}

            {tab === 'schedule' && (
              <div className="card" style={{ padding: 28 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: 6 }}>Work Hours</h2>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 24 }}>Set your team's working hours. Cyan uses this for briefings, check-ins, and break reminders.</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 6 }}>Work starts</label>
                      <input type="time" className="cyan-input" value={scheduleForm.workStartTime} onChange={e => setScheduleForm(f => ({ ...f, workStartTime: e.target.value }))} style={{ width: '100%', padding: '10px 14px', fontSize: 13 }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 6 }}>Work ends</label>
                      <input type="time" className="cyan-input" value={scheduleForm.workEndTime} onChange={e => setScheduleForm(f => ({ ...f, workEndTime: e.target.value }))} style={{ width: '100%', padding: '10px 14px', fontSize: 13 }} />
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 6 }}>Timezone</label>
                    <select className="cyan-input" value={scheduleForm.timezone} onChange={e => setScheduleForm(f => ({ ...f, timezone: e.target.value }))} style={{ width: '100%', padding: '10px 14px', fontSize: 13 }}>
                      <option value="Africa/Lagos">Africa/Lagos (WAT)</option>
                      <option value="Africa/Nairobi">Africa/Nairobi (EAT)</option>
                      <option value="Africa/Accra">Africa/Accra (GMT)</option>
                      <option value="Africa/Johannesburg">Africa/Johannesburg (SAST)</option>
                      <option value="Europe/London">Europe/London (GMT/BST)</option>
                      <option value="America/New_York">America/New_York (EST)</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 6 }}>Work days</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {['S','M','T','W','T','F','S'].map((day, i) => (
                        <<button 
  key={i} 
  onClick={() => setScheduleForm(f => ({ ...f, workDays: f.workDays.includes(i) ? f.workDays.filter(d => d !== i) : [...f.workDays, i].sort() }))} 
  style={{ 
    width: 36, 
    height: 36, 
    borderRadius: '50%', 
    cursor: 'pointer', 
    fontSize: 12, 
    fontWeight: 700, 
    background: scheduleForm.workDays.includes(i) ? 'var(--cyan)' : 'var(--card-bg)', 
    color: scheduleForm.workDays.includes(i) ? 'var(--navy)' : 'var(--text-muted)', 
    border: scheduleForm.workDays.includes(i) ? 'none' : '1px solid var(--border)' 
  }}
>
                          {day}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                {saved && <p style={{ fontSize: 12, color: 'var(--green)', marginTop: 12 }}>✓ Saved successfully</p>}
                <button onClick={saveSchedule} disabled={saving} style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 8, background: 'var(--cyan)', color: 'var(--navy)', border: 'none', borderRadius: 10, padding: '11px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  <Save size={14} />{saving ? 'Saving...' : 'Save schedule'}
                </button>
              </div>
            )}

            {tab === 'cyan' && (
              <div className="card" style={{ padding: 28 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: 6 }}>Cyan AI Settings</h2>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 24 }}>Configure how Cyan behaves across your workspace.</p>
                <div className="cyan-card" style={{ padding: '14px 18px' }}>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>Cyan AI settings are managed through the Cyan full-screen interface. Go to <strong style={{ color: 'var(--cyan)' }}>Cyan AI → Mode selector</strong> to adjust Cyan's reasoning context, or visit your <strong style={{ color: 'var(--cyan)' }}>My Workspace</strong> page to configure your personal Cyan preferences.</p>
                </div>
              </div>
            )}

            {tab === 'notifications' && (
              <div className="card" style={{ padding: 28 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: 6 }}>Notifications</h2>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 24 }}>Control what Cyan and the platform notify you about.</p>
                {[
                  { label: 'Daily briefing', desc: 'Cyan sends a morning briefing when you log in' },
                  { label: 'Anomaly alerts', desc: 'Get notified when Cyan detects unusual patterns' },
                  { label: 'Team activity', desc: 'When team members come online or complete tasks' },
                  { label: 'Break reminders', desc: 'Gentle nudges at scheduled break times' },
                  { label: 'Weekly reports', desc: 'Full performance summary every Monday' },
                ].map(({ label, desc }, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: i < 4 ? '1px solid var(--border-dim)' : 'none' }}>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{label}</p>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{desc}</p>
                    </div>
                    <div style={{ width: 44, height: 24, borderRadius: 12, background: 'var(--cyan)', position: 'relative', cursor: 'pointer', flexShrink: 0 }}>
                      <div style={{ position: 'absolute', right: 3, top: 3, width: 18, height: 18, borderRadius: '50%', background: 'var(--navy)' }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {tab === 'security' && (
              <div className="card" style={{ padding: 28 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: 6 }}>Security</h2>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 24 }}>Your account is secured by Firebase Authentication.</p>
                <div style={{ display: 'flex', flex: 'column', gap: 12 }}>
                  <div className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--green-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Shield size={16} style={{ color: 'var(--green)' }} /></div>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>Email authentication</p>
                      <p style={{ fontSize: 12, color: 'var(--green)' }}>Active · {user?.email}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}