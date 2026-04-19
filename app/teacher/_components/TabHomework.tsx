'use client'
import { useState, useEffect } from 'react'
import { HW_STATUS_OPTIONS, fmt } from '../_types/constants'

export function TabHomework({ data }: any) {
  const { teacher, myClasses, classLearners, hwAssignments, hwSessions, loadHomework, createHwAssignment, deleteHwAssignment, loadHwSubmissions, saveHwSubmissions } = data

  const [hwTab,    setHwTab]    = useState<'list' | 'mark'>('list')
  const [filter,   setFilter]   = useState<'all' | 'upcoming' | 'overdue'>('all')
  const [showForm, setShowForm] = useState(false)

  // Assignment form
  const [title,       setTitle]       = useState('')
  const [description, setDescription] = useState('')
  const [dueDate,     setDueDate]     = useState('')
  const [classId,     setClassId]     = useState('')
  const [timetableId, setTimetableId] = useState('')
  const [maxMarks,    setMaxMarks]    = useState('10')
  const [formSaving,  setFormSaving]  = useState(false)

  // Marking view
  const [selAssignment, setSelAssignment] = useState<any>(null)
  const [submissions,   setSubmissions]   = useState<any[]>([])
  const [markSaving,    setMarkSaving]    = useState(false)
  const [markSaved,     setMarkSaved]     = useState(false)

  const today   = new Date().toISOString().split('T')[0]
  const overdue = hwAssignments.filter((a: any) => a.due_date < today)
  const upcoming= hwAssignments.filter((a: any) => a.due_date >= today)
  const displayed = filter === 'all' ? hwAssignments : filter === 'upcoming' ? upcoming : overdue

  // Load learners when class changes
  const currentClassLearners = classId ? (classLearners[classId] || []) : []

  async function create() {
    if (!title.trim() || !dueDate || !classId) return
    setFormSaving(true)
    await createHwAssignment(teacher.id, { title: title.trim(), description: description.trim() || null, due_date: dueDate, class_id: classId, timetable_id: timetableId || null, max_marks: parseInt(maxMarks) || 10 }, currentClassLearners)
    setTitle(''); setDescription(''); setDueDate(''); setTimetableId(''); setMaxMarks('10')
    setShowForm(false); setFormSaving(false)
  }

  async function openMark(a: any) {
    setSelAssignment(a); setHwTab('mark')
    const subs = await loadHwSubmissions(a.id)
    setSubmissions(subs); setMarkSaved(false)
  }

  function updateSub(id: string, field: string, value: any) {
    setSubmissions(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s))
    setMarkSaved(false)
  }

  async function saveAll() {
    setMarkSaving(true)
    await saveHwSubmissions(submissions)
    setMarkSaving(false); setMarkSaved(true)
  }

  function getStats(subs: any[]) {
    return {
      total: subs.length,
      onTime: subs.filter(s => s.status === 'submitted_on_time').length,
      late:   subs.filter(s => s.status === 'submitted_late').length,
      incomplete: subs.filter(s => s.status === 'incomplete').length,
      notSubmitted: subs.filter(s => s.status === 'not_submitted').length,
      avgMarks: subs.filter(s => s.marks != null).length > 0
        ? Math.round(subs.filter(s => s.marks != null).reduce((a, s) => a + s.marks, 0) / subs.filter(s => s.marks != null).length)
        : null,
    }
  }

  // ── Marking view ───────────────────────────────────────────────────────────
  if (hwTab === 'mark' && selAssignment) {
    const stats = getStats(submissions)
    const isOverdue = selAssignment.due_date < today

    return (
      <div>
        <button className="bk" onClick={() => { setHwTab('list'); setSelAssignment(null) }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>Back
        </button>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
          <div>
            <div className="h1">{selAssignment.title}</div>
            <div className="sub">{selAssignment.classes?.name} · Due: {selAssignment.due_date}{isOverdue ? ' · Overdue' : ''}</div>
          </div>
          <button className="svbtn" onClick={saveAll} disabled={markSaving}>{markSaving ? 'Saving…' : markSaved ? '✓ Saved' : 'Save All'}</button>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8, marginBottom: 16 }}>
          {[{ l: 'Total', n: stats.total, c: '#1A1A1A', bg: '#F8F7F4' }, { l: 'On Time', n: stats.onTime, c: '#15803D', bg: '#F0FDF4' }, { l: 'Late', n: stats.late, c: '#A16207', bg: '#FEFCE8' }, { l: 'Incomplete', n: stats.incomplete, c: '#C2410C', bg: '#FFF7ED' }, { l: 'Not Submitted', n: stats.notSubmitted, c: '#DC2626', bg: '#FEF2F2' }].map(s => (
            <div key={s.l} style={{ background: s.bg, border: '1px solid #EFEFED', borderRadius: 10, padding: '10px 8px', textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: s.c }}>{s.n}</div>
              <div style={{ fontSize: 9, color: s.c, opacity: .7, textTransform: 'uppercase' as const, letterSpacing: '.03em', marginTop: 2 }}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* Submissions */}
        {submissions.length === 0
          ? <div className="card"><div className="empty">No submissions yet</div></div>
          : submissions.map((sub: any) => (
            <div key={sub.id} className="card" style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 6 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A1A' }}>{sub.learners?.full_name}</div>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {HW_STATUS_OPTIONS.map(s => (
                    <button key={s.key} onClick={() => updateSub(sub.id, 'status', s.key)}
                      style={{ padding: '3px 8px', borderRadius: 6, border: 'none', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", background: sub.status === s.key ? s.bg : '#F5F5F3', color: sub.status === s.key ? s.text : '#AAA', transition: 'all .12s' }}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 11, color: '#AAA' }}>Marks:</span>
                  <input type="number" value={sub.marks || ''} onChange={e => updateSub(sub.id, 'marks', parseInt(e.target.value) || null)}
                    placeholder={`/ ${selAssignment.max_marks}`} min={0} max={selAssignment.max_marks}
                    style={{ width: 70, height: 32, border: '1px solid #EFEFED', borderRadius: 7, padding: '0 8px', fontSize: 12, fontFamily: "'DM Sans',sans-serif", outline: 'none' }} />
                  <span style={{ fontSize: 11, color: '#AAA' }}>/ {selAssignment.max_marks}</span>
                </div>
                <input value={sub.feedback || ''} onChange={e => updateSub(sub.id, 'feedback', e.target.value)}
                  placeholder="Feedback…"
                  style={{ flex: 1, minWidth: 160, height: 32, border: '1px solid #EFEFED', borderRadius: 7, padding: '0 10px', fontSize: 12, fontFamily: "'DM Sans',sans-serif", outline: 'none' }} />
              </div>
            </div>
          ))}
      </div>
    )
  }

  // ── Assignment list ────────────────────────────────────────────────────────
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <div><div className="h1">Homework</div><div className="sub">Assignments & marking</div></div>
        <button onClick={() => setShowForm(!showForm)}
          style={{ display: 'flex', alignItems: 'center', gap: 5, background: showForm ? '#EF4444' : '#1D4ED8', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
          {showForm ? '✕ Cancel' : '+ New Assignment'}
        </button>
      </div>

      {/* Quick stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 12 }}>
        {[{ l: 'Total', n: hwAssignments.length, c: '#1A1A1A', bg: '#F8F7F4' }, { l: 'Upcoming', n: upcoming.length, c: '#1D4ED8', bg: '#EFF6FF' }, { l: 'Overdue', n: overdue.length, c: '#DC2626', bg: '#FEF2F2' }].map(s => (
          <div key={s.l} style={{ background: s.bg, border: '1px solid #EFEFED', borderRadius: 10, padding: '10px', textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.c }}>{s.n}</div>
            <div style={{ fontSize: 10, color: s.c, opacity: .75, textTransform: 'uppercase' as const, marginTop: 2 }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Create form */}
      {showForm && (
        <div className="card" style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 12 }}>New Assignment</div>
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
            <input className="form-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Assignment title *" style={{ width: '100%' }} />
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description (optional)" rows={2}
              style={{ border: '1px solid #EFEFED', borderRadius: 8, padding: '8px 10px', fontSize: 13, fontFamily: "'DM Sans',sans-serif", resize: 'vertical' as const, outline: 'none', width: '100%' }} />
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <select className="form-select" value={classId} onChange={e => setClassId(e.target.value)} style={{ flex: 1 }}>
                <option value="">— Select class *</option>
                {myClasses.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select className="form-select" value={timetableId} onChange={e => setTimetableId(e.target.value)} style={{ flex: 1 }}>
                <option value="">— Session (optional)</option>
                {hwSessions.map((s: any) => <option key={s.id} value={s.id}>{s.name} ({s.classes?.name})</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 10, color: '#AAA', fontWeight: 700, textTransform: 'uppercase' as const, display: 'block', marginBottom: 4 }}>Due Date *</label>
                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="form-input" style={{ width: '100%' }} />
              </div>
              <div style={{ width: 100 }}>
                <label style={{ fontSize: 10, color: '#AAA', fontWeight: 700, textTransform: 'uppercase' as const, display: 'block', marginBottom: 4 }}>Max Marks</label>
                <input type="number" value={maxMarks} onChange={e => setMaxMarks(e.target.value)} min={1} className="form-input" style={{ width: '100%' }} />
              </div>
            </div>
            <button className="add-btn" onClick={create} disabled={formSaving || !title.trim() || !dueDate || !classId} style={{ width: '100%', height: 40 }}>
              {formSaving ? 'Creating…' : 'Create Assignment'}
            </button>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        {(['all', 'upcoming', 'overdue'] as const).map(f => (
          <button key={f} className={`fp ${filter === f ? 'on' : ''}`} onClick={() => setFilter(f)}>
            {f === 'all' ? `All (${hwAssignments.length})` : f === 'upcoming' ? `Upcoming (${upcoming.length})` : `Overdue (${overdue.length})`}
          </button>
        ))}
      </div>

      {/* Assignment cards */}
      {displayed.length === 0
        ? <div className="card"><div className="empty">No assignments{filter !== 'all' ? ` (${filter})` : ''}</div></div>
        : displayed.map((a: any) => {
            const isOver = a.due_date < today
            return (
              <div key={a.id} className={`hw-card ${isOver ? 'overdue' : 'upcoming'}`}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A1A', marginBottom: 4 }}>{a.title}</div>
                    {a.description && <div style={{ fontSize: 11, color: '#888', marginBottom: 5 }}>{a.description}</div>}
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 10, fontWeight: 600, background: '#EFF6FF', color: '#1D4ED8', padding: '2px 8px', borderRadius: 5 }}>{a.classes?.name}</span>
                      {a.timetable && <span style={{ fontSize: 10, background: '#F5F5F3', color: '#666', padding: '2px 8px', borderRadius: 5 }}>{a.timetable?.name}</span>}
                      <span style={{ fontSize: 10, fontWeight: 600, background: isOver ? '#FEF2F2' : '#F0FDF4', color: isOver ? '#DC2626' : '#15803D', padding: '2px 8px', borderRadius: 5 }}>Due: {a.due_date}</span>
                      <span style={{ fontSize: 10, background: '#F5F5F3', color: '#666', padding: '2px 8px', borderRadius: 5 }}>Max: {a.max_marks} marks</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => openMark(a)}
                      style={{ fontSize: 11, fontWeight: 700, background: '#1D4ED8', color: '#fff', border: 'none', borderRadius: 7, padding: '5px 12px', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
                      Mark →
                    </button>
                    <button onClick={() => { if (confirm('Delete this assignment?')) deleteHwAssignment(a.id, teacher.id) }}
                      style={{ width: 30, height: 30, borderRadius: 7, border: '1px solid #EFEFED', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#CCC' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
    </div>
  )
}
