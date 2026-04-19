'use client'

import { Check } from 'lucide-react'
import type { WorkSchedule, BreakScheduleEntry } from '@/types'
import { DEFAULT_WORK_SCHEDULE } from '@/lib/schema'

interface WorkScheduleInputProps {
  value: string
  onChange: (value: string) => void
}

const DAY_LABELS: Record<number, string> = {
  1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat', 7: 'Sun',
}

const TIMEZONE_OPTIONS = [
  { value: 'Africa/Lagos',        label: 'Lagos — WAT (UTC+1)' },
  { value: 'Africa/Accra',        label: 'Accra — GMT (UTC+0)' },
  { value: 'Africa/Nairobi',      label: 'Nairobi — EAT (UTC+3)' },
  { value: 'Africa/Johannesburg', label: 'Johannesburg — SAST (UTC+2)' },
  { value: 'Europe/London',       label: 'London — GMT/BST' },
  { value: 'America/New_York',    label: 'New York — EST/EDT' },
  { value: 'UTC',                 label: 'UTC' },
]

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  background: 'var(--card-bg)',
  border: '1px solid var(--border)',
  borderRadius: 10,
  padding: '13px 14px',
  fontSize: 14,
  color: 'var(--text-primary)',
  fontFamily: 'var(--font-body)',
  outline: 'none',
  minHeight: 48,
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 700,
  color: 'var(--text-secondary)',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  fontFamily: 'var(--font-display)',
  marginBottom: 8,
}

function parseSchedule(value: string): WorkSchedule {
  if (!value) return DEFAULT_WORK_SCHEDULE
  try {
    return JSON.parse(value) as WorkSchedule
  } catch {
    return DEFAULT_WORK_SCHEDULE
  }
}

export function WorkScheduleInput({ value, onChange }: WorkScheduleInputProps) {
  const schedule = parseSchedule(value)

  function update(partial: Partial<WorkSchedule>) {
    onChange(JSON.stringify({ ...schedule, ...partial }))
  }

  function toggleDay(day: number) {
    const days = schedule.workDays.includes(day)
      ? schedule.workDays.filter(d => d !== day)
      : [...schedule.workDays, day].sort()
    update({ workDays: days })
  }

  function addBreak() {
    const newBreak: BreakScheduleEntry = {
      breakName: 'Break',
      startTime: '12:00',
      endTime: '13:00',
    }
    update({ breakSchedule: [...schedule.breakSchedule, newBreak] })
  }

  function updateBreak(index: number, partial: Partial<BreakScheduleEntry>) {
    const updated = schedule.breakSchedule.map((b, i) =>
      i === index ? { ...b, ...partial } : b
    )
    update({ breakSchedule: updated })
  }

  function removeBreak(index: number) {
    update({ breakSchedule: schedule.breakSchedule.filter((_, i) => i !== index) })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

      {/* Timezone */}
      <div>
        <label style={labelStyle}>Timezone</label>
        <select
          style={{ ...inputStyle, cursor: 'pointer' }}
          value={schedule.timezone}
          onChange={e => update({ timezone: e.target.value })}
        >
          {TIMEZONE_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Work days */}
      <div>
        <label style={labelStyle}>Work days</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[1, 2, 3, 4, 5, 6, 7].map(day => {
            const active = schedule.workDays.includes(day)
            return (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 10,
                  border: active ? '1px solid var(--cyan)' : '1px solid var(--border)',
                  background: active ? 'rgba(0,212,255,0.08)' : 'var(--card-bg)',
                  color: active ? 'var(--cyan)' : 'var(--text-muted)',
                  fontSize: 12,
                  fontWeight: 700,
                  fontFamily: 'var(--font-display)',
                  cursor: 'pointer',
                  transition: 'all 150ms',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                  gap: 3,
                  flexShrink: 0,
                }}
              >
                {DAY_LABELS[day]}
                {active && (
                  <div style={{
                    width: 4,
                    height: 4,
                    borderRadius: '50%',
                    background: 'var(--cyan)',
                  }} />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Work hours */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div>
          <label style={labelStyle}>Start time</label>
          <input
            type="time"
            style={inputStyle}
            value={schedule.workStartTime}
            onChange={e => update({ workStartTime: e.target.value })}
          />
        </div>
        <div>
          <label style={labelStyle}>End time</label>
          <input
            type="time"
            style={inputStyle}
            value={schedule.workEndTime}
            onChange={e => update({ workEndTime: e.target.value })}
          />
        </div>
      </div>

      {/* Break schedule */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <label style={{ ...labelStyle, marginBottom: 0 }}>Breaks</label>
          <button
            type="button"
            onClick={addBreak}
            style={{
              fontSize: 13,
              color: 'var(--cyan)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              padding: '2px 0',
            }}
          >
            + Add break
          </button>
        </div>

        {schedule.breakSchedule.length === 0 && (
          <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            No breaks scheduled. Add a lunch break or a morning break.
          </p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {schedule.breakSchedule.map((brk, i) => (
            <div
              key={i}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 120px auto 120px auto',
                gap: 8,
                alignItems: 'center',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: '10px 14px',
              }}
            >
              <input
                style={{ ...inputStyle, padding: '9px 12px', fontSize: 13, minHeight: 40 }}
                placeholder="Break name"
                value={brk.breakName}
                onChange={e => updateBreak(i, { breakName: e.target.value })}
              />
              <input
                type="time"
                style={{ ...inputStyle, padding: '9px 10px', fontSize: 13, minHeight: 40 }}
                value={brk.startTime}
                onChange={e => updateBreak(i, { startTime: e.target.value })}
              />
              <span style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center' }}>to</span>
              <input
                type="time"
                style={{ ...inputStyle, padding: '9px 10px', fontSize: 13, minHeight: 40 }}
                value={brk.endTime}
                onChange={e => updateBreak(i, { endTime: e.target.value })}
              />
              <button
                type="button"
                onClick={() => removeBreak(i)}
                style={{
                  color: 'var(--text-muted)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 20,
                  lineHeight: 1,
                  padding: '0 4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Summary */}
      {schedule.workDays.length > 0 && (
        <div style={{
          background: 'rgba(0,212,255,0.05)',
          border: '1px solid rgba(0,212,255,0.15)',
          borderRadius: 10,
          padding: '12px 16px',
        }}>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65 }}>
            <span style={{ color: 'var(--cyan)', fontWeight: 600 }}>Cyan will be active</span>
            {' '}on{' '}
            {schedule.workDays.map(d => DAY_LABELS[d]).join(', ')}{' '}
            from {schedule.workStartTime} to {schedule.workEndTime}
            {schedule.breakSchedule.length > 0 && (
              <>, with {schedule.breakSchedule.length} scheduled break{schedule.breakSchedule.length > 1 ? 's' : ''}</>
            )}.
          </p>
        </div>
      )}
    </div>
  )
}