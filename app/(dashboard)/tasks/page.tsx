'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { db } from '@/firebase/firebaseConfig'
import { collection, onSnapshot, addDoc, updateDoc, doc, query, orderBy, Timestamp } from 'firebase/firestore'
import { Plus, CheckCircle2, Circle, Clock, AlertCircle, Sparkles, X } from 'lucide-react'
import { useBusinessContext } from '@/hooks'

type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done'
type TaskPriority = 'low' | 'medium' | 'high'

interface Task {
  id: string
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  assignedTo: string
  department: string
  createdAt: Timestamp
  dueDate: string
  cyanNote?: string
}

const STATUS_COLS: { key: TaskStatus; label: string; color: string }[] = [
  { key: 'todo',        label: 'To Do',      color: 'var(--text-muted)' },
  { key: 'in_progress', label: 'In Progress', color: 'var(--cyan)'      },
  { key: 'in_review',   label: 'In Review',   color: 'var(--gold)'      },
  { key: 'done',        label: 'Done',        color: 'var(--green)'     },
]

const PRIORITY_COLOR: Record<TaskPriority, string> = { low: 'var(--text-muted)', medium: 'var(--gold)', high: 'var(--orange)' }

export default function TasksPage() {
  const { user } = useAuth()
  const { context } = useBusinessContext()
  const [tasks, setTasks] = useState<Task[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [newTask, setNewTask] = useState({ title: '', description: '', priority: 'medium' as TaskPriority, assignedTo: '', dueDate: '' })
  const [adding, setAdding] = useState(false)
  const [cyanLoading, setCyanLoading] = useState(false)
  const [cyanSuggestions, setCyanSuggestions] = useState<string[]>([])
  const businessId = user?.uid ?? ''

  useEffect(() => {
    if (!businessId) return
    const q = query(collection(db, `tasks/${businessId}/items`), orderBy('createdAt', 'desc'))
    return onSnapshot(q, snap => setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() } as Task))))
  }, [businessId])

  const addTask = async () => {
    if (!newTask.title.trim()) return
    setAdding(true)
    await addDoc(collection(db, `tasks/${businessId}/items`), {
      ...newTask, status: 'todo' as TaskStatus, department: 'general',
      createdAt: Timestamp.now(),
    })
    setNewTask({ title: '', description: '', priority: 'medium', assignedTo: '', dueDate: '' })
    setShowAdd(false); setAdding(false)
  }

  const updateStatus = async (taskId: string, status: TaskStatus) => {
    await updateDoc(doc(db, `tasks/${businessId}/items`, taskId), { status })
  }

  const fetchCyanSuggestions = async () => {
    setCyanLoading(true)
    try {
      const token = await user?.getIdToken()
      const res = await fetch('/api/cyan/task-suggestions', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ businessGoal: context?.goals.primary90Day }) })
      const data = await res.json()
      if (data.suggestions) setCyanSuggestions(data.suggestions)
    } catch {}
    finally { setCyanLoading(false) }
  }

  const tasksByStatus = (status: TaskStatus) => tasks.filter(t => t.status === status)

  return (
    <main style={{ minHeight: '100vh', background: 'var(--navy)', padding: '48px 24px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: 4 }}>Tasks</h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{tasks.filter(t => t.status !== 'done').length} open · {tasks.filter(t => t.status === 'done').length} done</p>
          </div>
          <button onClick={fetchCyanSuggestions} disabled={cyanLoading} style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.2)', color: 'var(--cyan)', borderRadius: 10, padding: '9px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            <Sparkles size={13} /> {cyanLoading ? 'Thinking...' : 'Ask Cyan'}
          </button>
          <button onClick={() => setShowAdd(true)} style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'var(--cyan)', color: 'var(--navy)', border: 'none', borderRadius: 10, padding: '10px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            <Plus size={15} /> Add task
          </button>
        </div>

        {/* Cyan suggestions */}
        {cyanSuggestions.length > 0 && (
          <div className="cyan-card" style={{ padding: '14px 18px', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--cyan)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Cyan · Suggested tasks for your 90-day goal</p>
              <button onClick={() => setCyanSuggestions([])} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={14} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {cyanSuggestions.map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <span style={{ fontSize: 12, color: 'var(--cyan)', fontWeight: 700, flexShrink: 0, marginTop: 1 }}>{i + 1}.</span>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{s}</p>
                  <button onClick={async () => { await addDoc(collection(db, `tasks/${businessId}/items`), { title: s, description: '', priority: 'medium', assignedTo: '', dueDate: '', status: 'todo', department: 'general', createdAt: Timestamp.now(), cyanNote: 'Suggested by Cyan' }); setCyanSuggestions(prev => prev.filter((_, j) => j !== i)) }} style={{ flexShrink: 0, background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.2)', color: 'var(--cyan)', borderRadius: 7, padding: '4px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Add</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Kanban board */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {STATUS_COLS.map(col => (
            <div key={col.key}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: col.color }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: col.color, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{col.label}</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>{tasksByStatus(col.key).length}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 120 }}>
                {tasksByStatus(col.key).map(task => (
                  <div key={task.id} className="card" style={{ padding: '14px 16px', cursor: 'pointer' }}>
                    {task.cyanNote && <p style={{ fontSize: 10, color: 'var(--cyan)', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>✦ Cyan</p>}
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6, lineHeight: 1.4 }}>{task.title}</p>
                    {task.description && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{task.description}</p>}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: PRIORITY_COLOR[task.priority], textTransform: 'uppercase', letterSpacing: '0.06em' }}>{task.priority}</span>
                      {task.dueDate && <><span style={{ color: 'var(--border)', fontSize: 10 }}>·</span><span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{task.dueDate}</span></>}
                    </div>
                    <div style={{ display: 'flex', gap: 4, marginTop: 10, flexWrap: 'wrap' }}>
                      {STATUS_COLS.filter(s => s.key !== col.key).map(s => (
                        <button key={s.key} onClick={() => updateStatus(task.id, s.key)} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 5, background: 'transparent', border: `1px solid ${s.color}40`, color: s.color, cursor: 'pointer', fontWeight: 600 }}>→ {s.label}</button>
                      ))}
                    </div>
                  </div>
                ))}
                {tasksByStatus(col.key).length === 0 && (
                  <div style={{ padding: 20, border: '1px dashed var(--border)', borderRadius: 12, textAlign: 'center' }}>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Empty</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Add task modal */}
        {showAdd && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(5,13,26,0.85)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <div className="card" style={{ width: '100%', maxWidth: 480, padding: 28, position: 'relative' }}>
              <button onClick={() => setShowAdd(false)} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
              <h2 style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: 20 }}>New task</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <input className="cyan-input" value={newTask.title} onChange={e => setNewTask(f => ({ ...f, title: e.target.value }))} placeholder="Task title" style={{ width: '100%', padding: '10px 14px', fontSize: 14 }} />
                <textarea className="cyan-input" value={newTask.description} onChange={e => setNewTask(f => ({ ...f, description: e.target.value }))} placeholder="Description (optional)" rows={3} style={{ width: '100%', padding: '10px 14px', fontSize: 13, resize: 'vertical' }} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 6 }}>Priority</label>
                    <select className="cyan-input" value={newTask.priority} onChange={e => setNewTask(f => ({ ...f, priority: e.target.value as TaskPriority }))} style={{ width: '100%', padding: '10px 14px', fontSize: 13 }}>
                      <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 6 }}>Due date</label>
                    <input type="date" className="cyan-input" value={newTask.dueDate} onChange={e => setNewTask(f => ({ ...f, dueDate: e.target.value }))} style={{ width: '100%', padding: '10px 14px', fontSize: 13 }} />
                  </div>
                </div>
                <button onClick={addTask} disabled={adding || !newTask.title.trim()} style={{ background: 'var(--cyan)', color: 'var(--navy)', border: 'none', borderRadius: 10, padding: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: adding ? 0.7 : 1 }}>
                  {adding ? 'Adding...' : 'Add task'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}