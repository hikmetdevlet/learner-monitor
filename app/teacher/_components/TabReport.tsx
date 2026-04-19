'use client'
import { useState } from 'react'

function PctBar({ pct, color }: { pct: number | null; color: string }) {
  if (pct == null) return <span style={{ fontSize: 10, color: '#CCC' }}>—</span>
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <div style={{ flex: 1, height: 5, background: '#F0F0EE', borderRadius: 3, overflow: 'hidden', minWidth: 40 }}>
        <div style={{ height: '100%', background: color, borderRadius: 3, width: `${pct}%`, transition: 'width .3s' }} />
      </div>
      <span style={{ fontSize: 10, fontWeight: 700, color, minWidth: 28 }}>{pct}%</span>
    </div>
  )
}

function Badge({ n, label, color, bg }: any) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', background: bg, borderRadius: 8, padding: '8px 10px', minWidth: 60 }}>
      <div style={{ fontSize: 18, fontWeight: 700, color }}>{n ?? '—'}</div>
      <div style={{ fontSize: 9, color, opacity: .75, textTransform: 'uppercase' as const, letterSpacing: '.04em', marginTop: 2 }}>{label}</div>
    </div>
  )
}

export function TabReport({ data }: any) {
  const { myClasses, buildReport, incidents, praises, rawAttData, allLearners } = data

  const [selClass,    setSelClass]    = useState<any>(null)
  const [rows,        setRows]        = useState<any[]>([])
  const [loading,     setLoading]     = useState(false)
  const [sortBy,      setSortBy]      = useState<'name' | 'att' | 'hw' | 'marks' | 'behaviour'>('att')
  const [selLearner,  setSelLearner]  = useState<any>(null)

  async function loadClass(cls: any) {
    setSelClass(cls); setLoading(true); setSelLearner(null)
    const r = await buildReport(cls.id)
    setRows(r); setLoading(false)
  }

  const sorted = [...rows].sort((a, b) => {
    if (sortBy === 'name') return a.learner.full_name.localeCompare(b.learner.full_name)
    if (sortBy === 'att')  return (b.attPct ?? -1) - (a.attPct ?? -1)
    if (sortBy === 'hw')   return (b.hwPct ?? -1) - (a.hwPct ?? -1)
    if (sortBy === 'marks')return (b.avgMarks ?? -1) - (a.avgMarks ?? -1)
    if (sortBy === 'behaviour') return (b.praiseCount - b.incidentCount) - (a.praiseCount - a.incidentCount)
    return 0
  })

  const classAvgAtt   = rows.length > 0 ? Math.round(rows.filter(r => r.attPct != null).reduce((s, r) => s + (r.attPct ?? 0), 0) / rows.filter(r => r.attPct != null).length) : null
  const classAvgHw    = rows.length > 0 ? Math.round(rows.filter(r => r.hwPct != null).reduce((s, r) => s + (r.hwPct ?? 0), 0) / rows.filter(r => r.hwPct != null).length) : null
  const classAvgMarks = rows.length > 0 ? Math.round(rows.filter(r => r.avgMarks != null).reduce((s, r) => s + (r.avgMarks ?? 0), 0) / rows.filter(r => r.avgMarks != null).length) : null

  function attColor(pct: number | null) {
    if (pct == null) return '#AAA'
    return pct >= 80 ? '#15803D' : pct >= 65 ? '#A16207' : '#DC2626'
  }
  function hwColor(pct: number | null) {
    if (pct == null) return '#AAA'
    return pct >= 80 ? '#15803D' : pct >= 60 ? '#A16207' : '#DC2626'
  }
  function marksColor(n: number | null) {
    if (n == null) return '#AAA'
    return n >= 70 ? '#15803D' : n >= 50 ? '#A16207' : '#DC2626'
  }

  // ── Class selection ────────────────────────────────────────────────────────
  if (!selClass) return (
    <div>
      <div style={{ marginBottom: 14 }}><div className="h1">Reports</div><div className="sub">Learner achievement overview</div></div>
      {myClasses.map((c: any) => (
        <button key={c.id} className="nav-btn" onClick={() => loadClass(c)}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A1A' }}>{c.name}</div>
            <div style={{ fontSize: 11, color: '#AAA', marginTop: 2 }}>View attendance · homework · marks · behaviour</div>
          </div>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#1D4ED8" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      ))}
    </div>
  )

  // ── Individual learner detail ──────────────────────────────────────────────
  if (selLearner) {
    const row = rows.find(r => r.learner.id === selLearner.id)
    if (!row) return null
    const learnerInc = incidents.filter((i: any) => i.learner_id === selLearner.id)
    const learnerPr  = praises.filter((p: any)  => p.learner_id === selLearner.id)
    const attRecs    = rawAttData[selLearner.id] || []

    // Last 20 attendance records
    const recentAtt = [...attRecs].sort((a, b) => b.attendance_date.localeCompare(a.attendance_date)).slice(0, 20)

    return (
      <div>
        <button className="bk" onClick={() => setSelLearner(null)}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>Back to {selClass.name}
        </button>
        <div style={{ marginBottom: 14 }}>
          <div className="h1">{selLearner.full_name}</div>
          <div className="sub">{selClass.name}</div>
        </div>

        {/* KPI row */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          <Badge n={row.attPct != null ? `${row.attPct}%` : '—'} label="Attendance" color={attColor(row.attPct)} bg={row.attPct == null ? '#F5F5F3' : row.attPct >= 80 ? '#F0FDF4' : row.attPct >= 65 ? '#FEFCE8' : '#FEF2F2'} />
          <Badge n={row.hwPct != null ? `${row.hwPct}%` : '—'} label="Homework" color={hwColor(row.hwPct)} bg={row.hwPct == null ? '#F5F5F3' : row.hwPct >= 80 ? '#F0FDF4' : row.hwPct >= 60 ? '#FEFCE8' : '#FEF2F2'} />
          <Badge n={row.avgMarks != null ? `${row.avgMarks}` : '—'} label="Avg Marks" color={marksColor(row.avgMarks)} bg="#F5F5F3" />
          <Badge n={row.streak} label="Day Streak" color="#1D4ED8" bg="#EFF6FF" />
          <Badge n={row.praiseCount} label="Praise" color="#15803D" bg="#F0FDF4" />
          <Badge n={row.incidentCount} label="Incidents" color="#DC2626" bg="#FEF2F2" />
        </div>

        {/* Attendance history */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#AAA', textTransform: 'uppercase' as const, letterSpacing: '.05em', marginBottom: 8 }}>Recent Attendance ({row.attPresent}/{row.attTotal})</div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {recentAtt.map((a: any) => {
              const color = a.status === 'present' ? '#15803D' : a.status === 'late' ? '#B45309' : a.status === 'excused' ? '#1D4ED8' : '#DC2626'
              const bg    = a.status === 'present' ? '#F0FDF4' : a.status === 'late' ? '#FEFCE8' : a.status === 'excused' ? '#EFF6FF' : '#FEF2F2'
              const sym   = a.status === 'present' ? '✓' : a.status === 'late' ? 'L' : a.status === 'excused' ? 'E' : '✗'
              return (
                <div key={a.attendance_date} title={`${a.attendance_date} — ${a.status}`}
                  style={{ width: 32, height: 32, borderRadius: 7, background: bg, border: `1px solid ${color}20`, display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color }}>{sym}</div>
                  <div style={{ fontSize: 7, color, opacity: .6 }}>{a.attendance_date.slice(5)}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Behaviour */}
        {(learnerInc.length > 0 || learnerPr.length > 0) && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#AAA', textTransform: 'uppercase' as const, letterSpacing: '.05em', marginBottom: 8 }}>Behaviour Log</div>
            {learnerPr.map((b: any) => (
              <div key={b.id} style={{ display: 'flex', gap: 8, padding: '8px 12px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, marginBottom: 5, fontSize: 12 }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#22C55E', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 600, color: '#15803D' }}>{b.category}</span>
                  {b.description && <span style={{ color: '#555', marginLeft: 6 }}>{b.description}</span>}
                </div>
                <div style={{ fontSize: 10, color: '#AAA' }}>{b.log_date}</div>
              </div>
            ))}
            {learnerInc.map((b: any) => (
              <div key={b.id} style={{ display: 'flex', gap: 8, padding: '8px 12px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, marginBottom: 5, fontSize: 12 }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ color: 'white', fontSize: 10, fontWeight: 700 }}>!</span>
                </div>
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 600, color: '#DC2626' }}>{b.category}</span>
                  {b.description && <span style={{ color: '#555', marginLeft: 6 }}>{b.description}</span>}
                </div>
                <div style={{ fontSize: 10, color: '#AAA' }}>{b.log_date}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ── Class report table ─────────────────────────────────────────────────────
  return (
    <div>
      <button className="bk" onClick={() => setSelClass(null)}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>All Classes
      </button>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <div><div className="h1">{selClass.name}</div><div className="sub">Learner report · {rows.length} learners</div></div>
      </div>

      {loading && <div className="card"><div className="empty">Loading…</div></div>}

      {!loading && rows.length > 0 && (
        <>
          {/* Class averages */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
            <Badge n={classAvgAtt != null ? `${classAvgAtt}%` : '—'} label="Class Att." color={attColor(classAvgAtt)} bg={classAvgAtt == null ? '#F5F5F3' : classAvgAtt >= 80 ? '#F0FDF4' : '#FEFCE8'} />
            <Badge n={classAvgHw != null ? `${classAvgHw}%` : '—'} label="Class HW" color={hwColor(classAvgHw)} bg="#F5F5F3" />
            <Badge n={classAvgMarks != null ? `${classAvgMarks}` : '—'} label="Avg Marks" color={marksColor(classAvgMarks)} bg="#F5F5F3" />
            <Badge n={rows.filter(r => (r.attPct ?? 100) < 65).length} label="At Risk" color="#DC2626" bg="#FEF2F2" />
          </div>

          {/* Sort controls */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: '#AAA', fontWeight: 700 }}>Sort:</span>
            {([['name','Name'],['att','Attendance'],['hw','Homework'],['marks','Avg Marks'],['behaviour','Behaviour']] as const).map(([k, l]) => (
              <button key={k} className={`fp ${sortBy === k ? 'on' : ''}`} onClick={() => setSortBy(k)}>{l}</button>
            ))}
          </div>

          {/* Learner rows */}
          {sorted.map((row: any, i: number) => {
            const flagged = (row.attPct != null && row.attPct < 65) || row.incidentCount > 2
            return (
              <div key={row.learner.id} style={{ background: '#fff', border: `1px solid ${flagged ? '#FECACA' : '#EFEFED'}`, borderRadius: 11, padding: '12px 14px', marginBottom: 8, cursor: 'pointer', transition: 'background .12s' }}
                onClick={() => setSelLearner(row.learner)}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 120 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: flagged ? '#FEF2F2' : '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: flagged ? '#DC2626' : '#1D4ED8', flexShrink: 0 }}>
                      {i + 1}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A1A' }}>{row.learner.full_name}</div>
                    {flagged && <span style={{ fontSize: 9, fontWeight: 700, background: '#FEF2F2', color: '#DC2626', padding: '1px 6px', borderRadius: 4 }}>⚠ At Risk</span>}
                  </div>

                  <div style={{ display: 'flex', gap: 16, flex: 1, justifyContent: 'flex-end', flexWrap: 'wrap', alignItems: 'center' }}>
                    <div style={{ minWidth: 90 }}>
                      <div style={{ fontSize: 9, color: '#AAA', fontWeight: 700, textTransform: 'uppercase' as const, marginBottom: 3 }}>Attendance</div>
                      <PctBar pct={row.attPct} color={attColor(row.attPct)} />
                    </div>
                    <div style={{ minWidth: 90 }}>
                      <div style={{ fontSize: 9, color: '#AAA', fontWeight: 700, textTransform: 'uppercase' as const, marginBottom: 3 }}>Homework</div>
                      <PctBar pct={row.hwPct} color={hwColor(row.hwPct)} />
                    </div>
                    <div style={{ minWidth: 60 }}>
                      <div style={{ fontSize: 9, color: '#AAA', fontWeight: 700, textTransform: 'uppercase' as const, marginBottom: 3 }}>Avg Marks</div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: marksColor(row.avgMarks) }}>{row.avgMarks != null ? row.avgMarks : '—'}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {row.praiseCount > 0 && <span style={{ fontSize: 10, fontWeight: 700, background: '#F0FDF4', color: '#15803D', padding: '2px 6px', borderRadius: 5 }}>+{row.praiseCount}</span>}
                      {row.incidentCount > 0 && <span style={{ fontSize: 10, fontWeight: 700, background: '#FEF2F2', color: '#DC2626', padding: '2px 6px', borderRadius: 5 }}>⚠{row.incidentCount}</span>}
                    </div>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#1D4ED8" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                  </div>
                </div>
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}
