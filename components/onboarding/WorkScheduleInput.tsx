'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import type { WorkSchedule, BreakScheduleEntry } from '@/types'
import { DEFAULT_WORK_SCHEDULE } from '@/lib/schema'

// ─────────────────────────────────────────────
// WorkScheduleInput
//
// Visual work schedule builder for onboarding step 5.
// Outputs: serialised WorkSchedule JSON string via onChange.
// Displays: day toggles, time pickers, break management.
// ─────────────────────────────────────────────

interface WorkScheduleInputProps {
  value: string          // JSON-serialised WorkSchedule
  onChange: (value: string) => void
}

const DAY_LABELS: Record<number, string> = {
  1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat', 7: 'Sun',
}

const TIMEZONE_OPTIONS = [
  { value: 'Africa/Lagos',     label: 'Lagos (WAT, UTC+1)' },
  { value: 'Africa/Accra',     label: 'Accra (GMT, UTC+0)' },
  { value: 'Africa/Nairobi',   label: 'Nairobi (EAT, UTC+3)' },
  { value: 'Africa/Johannesburg', label: 'Johannesburg (SAST, UTC+2)' },
  { value: 'Europe/London',    label: 'London (GMT/BST)' },
  { value: 'America/New_York', label: 'New York (EST/EDT)' },
  { value: 'UTC',              label: 'UTC' },
]

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
    const updated = { ...schedule, ...partial }
    onChange(JSON.stringify(updated))
  }

  function toggleDay(day: number) {
    const days = schedule.workDays.includes(day)
      ? schedule.workDays.filter(d => d !== day)
      : [...schedule.workDays, day].sort()
    update({ workDays: days })
  }

  function addBreak() {
    const newBreak: BreakScheduleEntry = { breakName: 'Break', startTime: '12:00', endTime: '13:00' }
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
    <div className="space-y-5">

      {/* Timezone */}
      <div>
        <label style={labelStyle}>Timezone</label>
        <select
          className="form-input w-full px-4 py-3 mt-1.5"
          style={{ fontSize: 14 }}
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
        <div className="flex gap-2 mt-2 flex-wrap">
          {[1, 2, 3, 4, 5, 6, 7].map(day => {
            const active = schedule.workDays.includes(day)
            return (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  border: active ? '1px solid var(--cyan)' : '1px solid var(--border)',
                  background: active ? 'var(--cyan-subtle)' : 'var(--navy-mid)',
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
                  gap: 2,
                }}
              >
                {DAY_LABELS[day]}
                {active && (
                  <div style={{
                    width: 4, height: 4, borderRadius: '50%',
                    background: 'var(--cyan)', marginTop: 1,
                  }} />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Work hours */}
      <div className="flex gap-4">
        <div className="flex-1">
          <label style={labelStyle}>Start time</label>
          <input
            type="time"
            className="form-input w-full px-4 py-3 mt-1.5"
            style={{ fontSize: 14 }}
            value={schedule.workStartTime}
            onChange={e => update({ workStartTime: e.target.value })}
          />
        </div>
        <div className="flex-1">
          <label style={labelStyle}>End time</label>
          <input
            type="time"
            className="form-input w-full px-4 py-3 mt-1.5"
            style={{ fontSize: 14 }}
            value={schedule.workEndTime}
            onChange={e => update({ workEndTime: e.target.value })}
          />
        </div>
      </div>

      {/* Break schedule */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label style={labelStyle}>Breaks</label>
          <button
            type="button"
            onClick={addBreak}
            style={{
              fontSize: 12,
              color: 'var(--cyan)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            + Add break
          </button>
        </div>

        {schedule.breakSchedule.length === 0 && (
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            No breaks scheduled. Add a lunch break or morning break.
          </p>
        )}

        <div className="space-y-2">
          {schedule.breakSchedule.map((brk, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                gap: 10,
                alignItems: 'center',
                background: 'var(--navy-mid)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: '10px 12px',
              }}
            >
              <input
                className="form-input"
                style={{ flex: 1, padding: '6px 10px', fontSize: 13 }}
                placeholder="Break name"
                value={brk.breakName}
                onChange={e => updateBreak(i, { breakName: e.target.value })}
              />
              <input
                type="time"
                className="form-input"
                style={{ width: 108, padding: '6px 10px', fontSize: 13 }}
                value={brk.startTime}
                onChange={e => updateBreak(i, { startTime: e.target.value })}
              />
              <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>to</span>
              <input
                type="time"
                className="form-input"
                style={{ width: 108, padding: '6px 10px', fontSize: 13 }}
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
                  fontSize: 18,
                  lineHeight: 1,
                  padding: '0 2px',
                  flexShrink: 0,
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
        <div className="cyan-card p-3">
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            <span style={{ color: 'var(--cyan)', fontWeight: 600 }}>Cyan will be active</span>
            {' '}on{' '}
            {schedule.workDays.map(d => DAY_LABELS[d]).join(', ')}{' '}
            from {schedule.workStartTime} to {schedule.workEndTime}
            {schedule.breakSchedule.length > 0 && (
              <>, with {schedule.breakSchedule.length} scheduled break{schedule.breakSchedule.length > 1 ? 's' : ''}</>
            )}
            .
          </p>
        </div>
      )}
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--text-secondary)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  fontFamily: 'var(--font-display)',
  display: 'block',
}
