'use client'
import { useMemo } from 'react'
import { topicStatus, fmt, fmtFull, weekBounds } from '../_types/constants'

export function TabDashboard({ data, setTab }: any) {
  const { teacher, isHead, activeYearName, todaySessions, myClasses, attStats, upcomingExams, calEvents,
          topics, progress, lessonPlans, notifications } = data

  const { ws, we } = weekBounds()
  const thisWkTopics = topics.filter((t: any) => !t.parent_topic_id && topicStatus(t) === 'this-week')
  const overdueTopics= topics.filter((t: any) => !t.parent_topic_id && topicStatus(t) === 'overdue' && !progress.find((p: any) => p.topic_id === t.id && p.is_completed))
  const doneTopics   = progress.filter((p: any) => p.is_completed).length
  const pendingPlans = thisWkTopics.filter((t: any) => !lessonPlans.find((lp: any) => lp.topic_id === t.id && lp.status === 'submitted')).length

  const dateStr = new Date().toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div>
      {/* Greeting */}
      <div style={{ marginBottom: 16 }}>
        <div className="h1">Good morning, {teacher?.display_name || teacher?.full_name?.split(' ')[0]}</div>
        <div className="sub">{dateStr}{activeYearName ? ` · ${activeYearName}` : ''}</div>
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 16 }}>
        {[
          { n: todaySessions.length,   l: "Today's Sessions",  c: '#1D4ED8', bg: '#EFF6FF', tab: 'attendance' },
          { n: thisWkTopics.length,    l: 'This Week Topics',  c: '#1D4ED8', bg: '#EFF6FF', tab: 'curriculum' },
          { n: pendingPlans,           l: 'Plans Pending',     c: '#A16207', bg: '#FEFCE8', tab: 'curriculum' },
          { n: overdueTopics.length,   l: 'Overdue',           c: '#DC2626', bg: '#FEF2F2', tab: 'curriculum' },
        ].map(s => (
          <div key={s.l} onClick={() => setTab(s.tab)} style={{ background: s.bg, border: '1px solid transparent', borderRadius: 12, padding: '12px', textAlign: 'center', cursor: 'pointer', transition: 'opacity .12s' }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: s.c }}>{s.n}</div>
            <div style={{ fontSize: 9, color: s.c, opacity: .7, textTransform: 'uppercase' as const, letterSpacing: '.04em', marginTop: 3 }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Today sessions */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ padding: '11px 14px', borderBottom: '1px solid #F5F5F3', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#1A1A1A', textTransform: 'uppercase' as const, letterSpacing: '.04em' }}>Today's Sessions</span>
          <button onClick={() => setTab('attendance')} style={{ fontSize: 10, fontWeight: 600, color: '#1D4ED8', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>Mark Attendance →</button>
        </div>
        {todaySessions.length === 0
          ? <div className="empty">No sessions today</div>
          : todaySessions.map((s: any) => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 14px', borderBottom: '1px solid #F8F8F6' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{s.name}</div>
                <div style={{ fontSize: 11, color: '#AAA', marginTop: 1 }}>{s.classes?.name} · {s.start_time?.slice(0,5)}–{s.end_time?.slice(0,5)}</div>
              </div>
              {isHead && s.users && <div style={{ fontSize: 10, color: '#888' }}>{s.users?.display_name || s.users?.full_name}</div>}
            </div>
          ))}
      </div>

      {/* This week topics */}
      {thisWkTopics.length > 0 && (
        <div className="card" style={{ marginBottom: 12 }}>
          <div style={{ padding: '11px 14px', borderBottom: '1px solid #F5F5F3', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#1A1A1A', textTransform: 'uppercase' as const, letterSpacing: '.04em' }}>This Week</span>
            <button onClick={() => setTab('curriculum')} style={{ fontSize: 10, fontWeight: 600, color: '#1D4ED8', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>View All →</button>
          </div>
          {thisWkTopics.slice(0, 5).map((t: any) => {
            const lp   = lessonPlans.find((l: any) => l.topic_id === t.id)
            const prog = progress.find((p: any) => p.topic_id === t.id && p.is_completed)
            return (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', borderBottom: '1px solid #F8F8F6' }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: prog ? '#22C55E' : lp?.status === 'submitted' ? '#1D4ED8' : '#E5E5E3', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 500 }}>{t.title}</div>
                  <div style={{ fontSize: 10, color: '#AAA' }}>{t.curriculum_subjects?.name} · {t.curriculum_subjects?.classes?.name}</div>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {prog && <span style={{ fontSize: 9, fontWeight: 700, background: '#F0FDF4', color: '#15803D', padding: '1px 6px', borderRadius: 4 }}>Done</span>}
                  {lp?.status === 'submitted' && !prog && <span style={{ fontSize: 9, fontWeight: 700, background: '#EFF6FF', color: '#1D4ED8', padding: '1px 6px', borderRadius: 4 }}>Plan ✓</span>}
                  {!lp && !prog && <span style={{ fontSize: 9, fontWeight: 700, background: '#FEFCE8', color: '#A16207', padding: '1px 6px', borderRadius: 4 }}>No Plan</span>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Attendance by class */}
      {attStats.length > 0 && (
        <div className="card" style={{ marginBottom: 12 }}>
          <div style={{ padding: '11px 14px', borderBottom: '1px solid #F5F5F3', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#1A1A1A', textTransform: 'uppercase' as const, letterSpacing: '.04em' }}>Attendance Overview</span>
            <button onClick={() => setTab('report')} style={{ fontSize: 10, fontWeight: 600, color: '#1D4ED8', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>Reports →</button>
          </div>
          {attStats.map((s: any) => {
            const pct = s.pct; const color = pct >= 80 ? '#15803D' : pct >= 65 ? '#A16207' : '#DC2626'
            return (
              <div key={s.cls.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', borderBottom: '1px solid #F8F8F6' }}>
                <div style={{ fontSize: 13, fontWeight: 500, flex: 1 }}>{s.cls.name}</div>
                <div style={{ fontSize: 11, color: '#AAA' }}>{s.n} learners</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 60, height: 4, background: '#F0F0EE', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: color, width: `${pct}%` }} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color }}>{pct}%</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Upcoming exams */}
      {upcomingExams.length > 0 && (
        <div className="card" style={{ marginBottom: 12 }}>
          <div style={{ padding: '11px 14px', borderBottom: '1px solid #F5F5F3' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#1A1A1A', textTransform: 'uppercase' as const, letterSpacing: '.04em' }}>Upcoming Exams</span>
          </div>
          {upcomingExams.map((e: any) => (
            <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', borderBottom: '1px solid #F8F8F6' }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#EF4444', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 500 }}>{e.title}</div>
                <div style={{ fontSize: 10, color: '#AAA' }}>{e.classes?.name} · {fmtFull(e.exam_date)}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upcoming events */}
      {calEvents.length > 0 && (
        <div className="card">
          <div style={{ padding: '11px 14px', borderBottom: '1px solid #F5F5F3', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#1A1A1A', textTransform: 'uppercase' as const, letterSpacing: '.04em' }}>School Events</span>
            <button onClick={() => setTab('calendar')} style={{ fontSize: 10, fontWeight: 600, color: '#1D4ED8', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>Calendar →</button>
          </div>
          {calEvents.map((e: any) => (
            <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', borderBottom: '1px solid #F8F8F6' }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: e.departments?.color || '#1D4ED8', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 500 }}>{e.title}</div>
                <div style={{ fontSize: 10, color: '#AAA' }}>{fmtFull(e.planned_date)}{e.departments?.name ? ` · ${e.departments.name}` : ''}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
