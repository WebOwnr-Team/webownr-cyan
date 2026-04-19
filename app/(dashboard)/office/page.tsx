'use client'

import { useState } from 'react'
import { useBusinessContext } from '@/hooks'
import { OfficeFloorPlan } from '@/components/office/OfficeFloorPlan'
import { DepartmentView } from '@/components/office/DepartmentView'
import { CyanOrb } from '@/components/ui/CyanOrb'
import { Grid3x3, List } from 'lucide-react'

export default function OfficePage() {
  const { context, loading } = useBusinessContext()
  const [view, setView] = useState<'floor' | 'department'>('floor')
  const [selectedDept, setSelectedDept] = useState<string | null>(null)

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', gap: 6 }}><span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" /></div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--navy)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ borderBottom: '1px solid var(--border-dim)', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 16, background: 'var(--navy-mid)' }}>
        <CyanOrb size={28} />
        <div>
          <h1 style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: 1 }}>{context?.identity.businessName ?? 'The Office'}</h1>
          <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Virtual Headquarters</p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4, background: 'var(--navy)', border: '1px solid var(--border)', borderRadius: 10, padding: 3 }}>
          {(['floor', 'department'] as const).map(v => (
            <button key={v} onClick={() => setView(v)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: view === v ? 'var(--cyan)' : 'transparent', color: view === v ? 'var(--navy)' : 'var(--text-muted)', transition: 'all 150ms' }}>
              {v === 'floor' ? <><Grid3x3 size={13} /> Floor Plan</> : <><List size={13} /> Departments</>}
            </button>
          ))}
        </div>
      </div>
      <div style={{ flex: 1, padding: '24px', overflow: 'auto' }}>
        {view === 'floor'
          ? <OfficeFloorPlan onSelectDepartment={(dept) => { setSelectedDept(dept); setView('department') }} />
          : <DepartmentView departmentFilter={selectedDept} onBack={() => { setSelectedDept(null); setView('floor') }} />
        }
      </div>
    </div>
  )
}