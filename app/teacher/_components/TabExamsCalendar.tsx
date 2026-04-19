'use client'
import { useState } from 'react'
import { fmtFull } from '../_types/constants'

// ─── TabExams ─────────────────────────────────────────────────────────────────
export function TabExams({ data }: any) {
  const { teacher, isHead, exams, allClasses, quizSessions, quizResults, addExam } = data
  const [showForm, setShowForm] = useState(false)
  const [eTitle,   setETitle]   = useState('')
  const [eDate,    setEDate]    = useState('')
  const [eClass,   setEClass]   = useState(allClasses[0]?.id || '')
  const [eDesc,    setEDesc]    = useState('')
  const [eSaving,  setESaving]  = useState(false)
  const [examTab,  setExamTab]  = useState<'exams' | 'quizzes'>('exams')

  const today = new Date().toISOString().split('T')[0]
  const upcoming = exams.filter((e: any) => e.exam_date >= today)
  const past     = exams.filter((e: any) => e.exam_date < today)

  async function doAdd() {
    if (!eTitle.trim() || !eDate || !eClass) return
    setESaving(true)
    await addExam(teacher.id, eTitle.trim(), eDate, eClass, eDesc)
    setETitle(''); setEDate(''); setEDesc('')
    setShowForm(false); setESaving(false)
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <div><div className="h1">Exams & Quizzes</div><div className="sub">Assessments</div></div>
        <button onClick={() => setShowForm(!showForm)} style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#1D4ED8', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>+ Add Exam</button>
      </div>

      {/* Toggle */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        <button className={`fp ${examTab === 'exams' ? 'on' : ''}`} onClick={() => setExamTab('exams')}>Exams ({exams.length})</button>
        <button className={`fp ${examTab === 'quizzes' ? 'on' : ''}`} onClick={() => setExamTab('quizzes')}>Quizzes ({quizSessions.length})</button>
      </div>

      {showForm && examTab === 'exams' && (
        <div className="card" style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 12 }}>New Exam</div>
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input className="form-input" value={eTitle} onChange={e => setETitle(e.target.value)} placeholder="Exam title *" style={{ flex: 2 }} />
              <input type="date" value={eDate} onChange={e => setEDate(e.target.value)} className="form-input" style={{ flex: 1 }} />
              <select className="form-select" value={eClass} onChange={e => setEClass(e.target.value)} style={{ flex: 1 }}>
                {allClasses.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <input className="form-input" value={eDesc} onChange={e => setEDesc(e.target.value)} placeholder="Description (optional)" style={{ width: '100%' }} />
            <button className="add-btn" onClick={doAdd} disabled={eSaving || !eTitle.trim() || !eDate} style={{ width: '100%', height: 40 }}>{eSaving ? '…' : 'Add Exam'}</button>
          </div>
        </div>
      )}

      {examTab === 'exams' ? (
        <>
          {upcoming.length > 0 && (
            <>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#AAA', textTransform: 'uppercase' as const, letterSpacing: '.05em', marginBottom: 8 }}>Upcoming</div>
              {upcoming.map((e: any) => (
                <div key={e.id} style={{ background: '#fff', border: '1px solid #BFDBFE', borderLeft: '3px solid #3B82F6', borderRadius: 10, padding: '10px 14px', marginBottom: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{e.title}</div>
                  <div style={{ fontSize: 11, color: '#AAA', marginTop: 3 }}>{e.classes?.name} · {fmtFull(e.exam_date)}</div>
                  {e.description && <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>{e.description}</div>}
                </div>
              ))}
            </>
          )}
          {past.length > 0 && (
            <>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#AAA', textTransform: 'uppercase' as const, letterSpacing: '.05em', marginBottom: 8, marginTop: 12 }}>Past</div>
              {past.map((e: any) => (
                <div key={e.id} style={{ background: '#F8F8F6', border: '1px solid #EFEFED', borderRadius: 10, padding: '10px 14px', marginBottom: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#666' }}>{e.title}</div>
                  <div style={{ fontSize: 11, color: '#AAA', marginTop: 3 }}>{e.classes?.name} · {fmtFull(e.exam_date)}</div>
                </div>
              ))}
            </>
          )}
          {exams.length === 0 && <div className="card"><div className="empty">No exams yet</div></div>}
        </>
      ) : (
        <>
          {quizSessions.length === 0
            ? <div className="card"><div className="empty">No quizzes created yet — use the Quiz Builder</div></div>
            : quizSessions.map((s: any) => {
                const results = quizResults.filter((r: any) => r.quiz_session_id === s.id)
                const avgPct  = results.length > 0 ? Math.round(results.reduce((acc: number, r: any) => acc + (r.percentage || 0), 0) / results.length) : null
                const statusColor = s.status === 'completed' ? '#15803D' : s.status === 'sent' ? '#1D4ED8' : '#888'
                const statusBg    = s.status === 'completed' ? '#F0FDF4' : s.status === 'sent' ? '#EFF6FF' : '#F5F5F3'
                return (
                  <div key={s.id} style={{ background: '#fff', border: '1px solid #EFEFED', borderRadius: 10, padding: '10px 14px', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{s.title}</div>
                      <span style={{ fontSize: 9, fontWeight: 700, background: statusBg, color: statusColor, padding: '2px 7px', borderRadius: 5 }}>{s.status}</span>
                      {avgPct != null && <span style={{ fontSize: 10, fontWeight: 700, background: avgPct >= 70 ? '#F0FDF4' : '#FEFCE8', color: avgPct >= 70 ? '#15803D' : '#A16207', padding: '2px 7px', borderRadius: 5 }}>Avg: {avgPct}%</span>}
                    </div>
                    <div style={{ fontSize: 11, color: '#AAA' }}>
                      {s.classes?.name && <span>{s.classes.name} · </span>}
                      {(s.curriculum_topics as any)?.title && <span>{(s.curriculum_topics as any).title} · </span>}
                      <span>{results.length} results · {s.question_ids?.length || 0} questions</span>
                    </div>
                  </div>
                )
              })}
        </>
      )}
    </div>
  )
}

// ─── TabCalendar ──────────────────────────────────────────────────────────────
export function TabCalendar({ data }: any) {
  const { allCalEvents } = data
  const [monthOffset, setMonthOffset] = useState(0)

  const monthDate = (() => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + monthOffset); return d })()
  const y = monthDate.getFullYear(), m = monthDate.getMonth()
  const monthEvents = allCalEvents.filter((e: any) => {
    if (!e.planned_date) return false
    const d = new Date(e.planned_date); return d.getFullYear() === y && d.getMonth() === m
  })
  const monthLabel = monthDate.toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' })

  // Build calendar grid
  const firstDay = new Date(y, m, 1).getDay()
  const daysInMonth = new Date(y, m + 1, 0).getDate()
  const cells: (number | null)[] = []
  for (let i = 0; i < (firstDay === 0 ? 6 : firstDay - 1); i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const today = new Date()
  const isToday = (day: number) => today.getFullYear() === y && today.getMonth() === m && today.getDate() === day

  const eventsByDay: Record<number, any[]> = {}
  monthEvents.forEach((e: any) => {
    const day = new Date(e.planned_date).getDate()
    if (!eventsByDay[day]) eventsByDay[day] = []
    eventsByDay[day].push(e)
  })

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div className="h1">Calendar</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={() => setMonthOffset(o => o - 1)} style={{ width: 30, height: 30, borderRadius: 7, border: '1px solid #EFEFED', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A1A', minWidth: 130, textAlign: 'center' }}>{monthLabel}</div>
          <button onClick={() => setMonthOffset(o => o + 1)} style={{ width: 30, height: 30, borderRadius: 7, border: '1px solid #EFEFED', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
          {monthOffset !== 0 && <button onClick={() => setMonthOffset(0)} style={{ fontSize: 11, color: '#1D4ED8', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>Today</button>}
        </div>
      </div>

      {/* Calendar grid */}
      <div style={{ background: '#fff', border: '1px solid #EFEFED', borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', borderBottom: '1px solid #EFEFED' }}>
          {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
            <div key={d} style={{ padding: '8px 4px', textAlign: 'center', fontSize: 9, fontWeight: 700, color: '#AAA', textTransform: 'uppercase' as const, letterSpacing: '.05em' }}>{d}</div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)' }}>
          {cells.map((day, i) => {
            const events = day ? (eventsByDay[day] || []) : []
            const today_ = day ? isToday(day) : false
            return (
              <div key={i} style={{ minHeight: 52, padding: '5px 4px', borderRight: '1px solid #F5F5F3', borderBottom: '1px solid #F5F5F3', background: today_ ? '#EFF6FF' : 'transparent' }}>
                {day && <div style={{ fontSize: 11, fontWeight: today_ ? 700 : 400, color: today_ ? '#1D4ED8' : '#1A1A1A', marginBottom: 3 }}>{day}</div>}
                {events.slice(0,2).map((e: any, ei: number) => (
                  <div key={ei} title={e.title} style={{ fontSize: 8, fontWeight: 600, background: e.departments?.color ? `${e.departments.color}20` : '#EFF6FF', color: e.departments?.color || '#1D4ED8', padding: '1px 4px', borderRadius: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const, marginBottom: 2 }}>{e.title}</div>
                ))}
                {events.length > 2 && <div style={{ fontSize: 7, color: '#AAA' }}>+{events.length - 2}</div>}
              </div>
            )
          })}
        </div>
      </div>

      {/* Event list for month */}
      {monthEvents.length > 0 && (
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#AAA', textTransform: 'uppercase' as const, letterSpacing: '.05em', marginBottom: 8 }}>Events in {monthLabel}</div>
          {monthEvents.sort((a: any, b: any) => a.planned_date.localeCompare(b.planned_date)).map((e: any) => (
            <div key={e.id} style={{ background: '#fff', border: '1px solid #EFEFED', borderLeft: `3px solid ${e.departments?.color || '#1D4ED8'}`, borderRadius: 9, padding: '9px 14px', marginBottom: 7, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: e.departments?.color || '#1D4ED8', minWidth: 28, textAlign: 'center', background: `${e.departments?.color || '#1D4ED8'}15`, borderRadius: 6, padding: '3px 4px' }}>
                {new Date(e.planned_date).getDate()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{e.title}</div>
                <div style={{ fontSize: 10, color: '#AAA', marginTop: 2 }}>{fmtFull(e.planned_date)}{e.departments?.name ? ` · ${e.departments.name}` : ''}</div>
                {e.description && <div style={{ fontSize: 11, color: '#666', marginTop: 3 }}>{e.description}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
      {monthEvents.length === 0 && <div className="card"><div className="empty">No events in {monthLabel}</div></div>}
    </div>
  )
}
