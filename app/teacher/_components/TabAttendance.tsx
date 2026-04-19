'use client'
import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { STATUS_OPTIONS, DAYS } from '../_types/constants'

const todayName = DAYS[new Date().getDay() === 0 ? 7 : new Date().getDay()]

function isoDate(d: Date) { return d.toISOString().split('T')[0] }
function weekdaysBetween(start: string, end: string): Date[] {
  const days: Date[] = []; const cur = new Date(start); cur.setHours(12); const fin = new Date(end); fin.setHours(12)
  while (cur <= fin) { const dow = cur.getDay(); if (dow !== 0 && dow !== 6) days.push(new Date(cur)); cur.setDate(cur.getDate() + 1) }
  return days
}
function rangeFor(mode: '2w' | '1m') {
  const today = new Date()
  if (mode === '2w') {
    const dow = today.getDay() === 0 ? 7 : today.getDay()
    const mon = new Date(today); mon.setDate(today.getDate() - dow - 6); mon.setHours(12)
    const fri = new Date(mon); fri.setDate(mon.getDate() + 11)
    return { start: isoDate(mon), end: isoDate(fri) }
  } else {
    return { start: isoDate(new Date(today.getFullYear(), today.getMonth(), 1)), end: isoDate(new Date(today.getFullYear(), today.getMonth() + 1, 0)) }
  }
}
const SYM: Record<string, string> = { present: '✓', late: 'L', absent: '✗', excused: 'E' }
const SYM_COLOR: Record<string, string> = { present: '#15803D', late: '#B45309', absent: '#DC2626', excused: '#1D4ED8' }

export function TabAttendance({ data }: any) {
  const { todaySessions, classLearners, myClasses, saveSessionAttendance, loadSessionAttendance, rawAttData, teacher } = data
  const supabase = useMemo(() => createClient(), [])

  const [selSession, setSelSession] = useState<any>(null)
  const [attMap,     setAttMap]     = useState<Record<string, string>>({})
  const [hwMap,      setHwMap]      = useState<Record<string, boolean>>({})
  const [noteMap,    setNoteMap]    = useState<Record<string, string>>({})
  const [attDate,    setAttDate]    = useState(new Date().toISOString().split('T')[0])
  const [saving,     setSaving]     = useState(false)
  const [saved,      setSaved]      = useState(false)

  // Print sheet state
  const [printMode,    setPrintMode]    = useState<'2w' | '1m'>('2w')
  const [printClass,   setPrintClass]   = useState<any>(null)
  const [showPrintCfg, setShowPrintCfg] = useState(false)
  const [printLoading, setPrintLoading] = useState(false)
  const [printSessions,   setPrintSessions]   = useState<any[]>([])
  const [printAttendance, setPrintAttendance] = useState<Record<string, Record<string, Record<string, string>>>>({})

  const sessLearners = selSession ? (classLearners[selSession.classes?.id] || []) : []
  const presentCount = sessLearners.filter((l: any) => attMap[l.id] === 'present').length
  const lateCount    = sessLearners.filter((l: any) => attMap[l.id] === 'late').length
  const absentCount  = sessLearners.filter((l: any) => !attMap[l.id] || attMap[l.id] === 'absent').length
  const excusedCount = sessLearners.filter((l: any) => attMap[l.id] === 'excused').length

  async function selectSession(s: any) {
    setSelSession(s); setSaved(false)
    const { attMap: am, noteMap: nm, hwMap: hm } = await loadSessionAttendance(s.id, attDate, s.classes.id)
    setAttMap(am); setNoteMap(nm); setHwMap(hm)
  }
  async function changeDate(d: string) {
    setAttDate(d); setSaved(false)
    if (selSession) {
      const { attMap: am, noteMap: nm, hwMap: hm } = await loadSessionAttendance(selSession.id, d, selSession.classes.id)
      setAttMap(am); setNoteMap(nm); setHwMap(hm)
    }
  }
  function markAll(status: string) {
    const m: Record<string, string> = {}
    sessLearners.forEach((l: any) => { m[l.id] = status })
    setAttMap(m); setSaved(false)
  }
  async function save() {
    if (!selSession) return
    setSaving(true)
    await saveSessionAttendance(selSession.id, selSession.classes.id, attDate, attMap, noteMap, hwMap, teacher.id)
    setSaving(false); setSaved(true)
  }

  // Print data loading
  async function loadPrintData(cls: any, mode: '2w' | '1m') {
    setPrintLoading(true)
    const range = rangeFor(mode)
    const days  = weekdaysBetween(range.start, range.end)
    const { data: sessions } = await supabase.from('timetable').select('id, name, day_of_week, start_time, end_time').eq('class_id', cls.id).order('day_of_week').order('start_time')
    const sessionsData = sessions || []
    setPrintSessions(sessionsData)
    if (!sessionsData.length) { setPrintLoading(false); return }
    const sessionIds = sessionsData.map((s: any) => s.id)
    const learners   = classLearners[cls.id] || []
    const learnerIds = learners.map((l: any) => l.id)
    const { data: attRows } = await supabase.from('attendance').select('timetable_id, learner_id, status, attendance_date')
      .in('timetable_id', sessionIds).gte('attendance_date', range.start).lte('attendance_date', range.end).in('learner_id', learnerIds)
    const lookup: Record<string, Record<string, Record<string, string>>> = {}
    ;(attRows || []).forEach((row: any) => {
      if (!lookup[row.timetable_id]) lookup[row.timetable_id] = {}
      if (!lookup[row.timetable_id][row.attendance_date]) lookup[row.timetable_id][row.attendance_date] = {}
      lookup[row.timetable_id][row.attendance_date][row.learner_id] = row.status
    })
    setPrintAttendance(lookup)
    setPrintLoading(false)
  }

  const range       = rangeFor(printMode)
  const printDays   = useMemo(() => weekdaysBetween(range.start, range.end), [printMode])
  const printLearners = printClass ? (classLearners[printClass.id] || []) : []
  const printColumns = useMemo(() => {
    const cols: any[] = []
    let prevWeekMon = ''
    printDays.forEach(d => {
      const jsDow = d.getDay()
      const sessForDay = printSessions.filter((s: any) => s.day_of_week === jsDow || s.day_of_week === (jsDow === 0 ? 7 : jsDow))
      if (!sessForDay.length) return
      const dow = d.getDay() === 0 ? 7 : d.getDay()
      const mon = new Date(d); mon.setDate(d.getDate() - (dow - 1))
      const monStr = isoDate(mon)
      sessForDay.forEach((sess: any, si: number) => {
        cols.push({ session: sess, date: d, dateStr: isoDate(d), isFirstOfDay: si === 0, isFirstOfWeek: si === 0 && monStr !== prevWeekMon })
        if (si === 0) prevWeekMon = monStr
      })
    })
    return cols
  }, [printDays, printSessions])

  const uniqueDates = useMemo(() => {
    const seen = new Set<string>()
    return printColumns.filter(c => { if (seen.has(c.dateStr)) return false; seen.add(c.dateStr); return true }).map(c => c.date)
  }, [printColumns])
  const colsByDay = useMemo(() => {
    const m: Record<string, number> = {}
    printColumns.forEach(col => { m[col.dateStr] = (m[col.dateStr] || 0) + 1 })
    return m
  }, [printColumns])

  function learnerStats(learnerId: string) {
    let present = 0, total = 0
    printColumns.forEach(col => {
      const s = printAttendance[col.session.id]?.[col.dateStr]?.[learnerId]
      if (s) { total++; if (s === 'present' || s === 'late') present++ }
    })
    return { present, total }
  }
  function colStats(sessionId: string, dateStr: string) {
    let present = 0, total = 0
    printLearners.forEach((l: any) => {
      const s = printAttendance[sessionId]?.[dateStr]?.[l.id]
      if (s) { total++; if (s === 'present' || s === 'late') present++ }
    })
    return { present, total }
  }
  function doPrint() {
    if (!printClass) return
    const id = '__att_print__'; let el = document.getElementById(id) as HTMLStyleElement | null
    if (!el) { el = document.createElement('style'); el.id = id; document.head.appendChild(el) }
    el.innerHTML = `@page{size:A4 landscape;margin:7mm 8mm;}@media print{body>*{visibility:hidden;}#att-print-sheet,#att-print-sheet *{visibility:visible;}#att-print-sheet{position:absolute;top:0;left:0;width:100%;}}`
    setTimeout(() => window.print(), 120)
  }

  // ── Session list ───────────────────────────────────────────────────────────
  if (!selSession) return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <div><div className="h1">Attendance</div><div className="sub">Select a session to mark</div></div>
        <button onClick={() => setShowPrintCfg(!showPrintCfg)}
          style={{ display: 'flex', alignItems: 'center', gap: 5, background: showPrintCfg ? '#1A1A1A' : '#F5F5F3', color: showPrintCfg ? '#fff' : '#444', border: '1px solid #EFEFED', borderRadius: 8, padding: '7px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
          Print Register
        </button>
      </div>

      {showPrintCfg && (
        <div style={{ background: '#fff', border: '1px solid #EFEFED', borderRadius: 11, padding: 14, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700 }}>Print Session Register</div>
            <button onClick={() => setShowPrintCfg(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#AAA', fontSize: 16 }}>✕</button>
          </div>
          <div style={{ fontSize: 9, fontWeight: 800, color: '#AAA', textTransform: 'uppercase' as const, letterSpacing: '.05em', marginBottom: 7 }}>Period</div>
          <div style={{ display: 'flex', gap: 7, marginBottom: 12 }}>
            {(['2w', '1m'] as const).map(m => {
              const r = rangeFor(m)
              return (
                <button key={m} onClick={() => { setPrintMode(m); if (printClass) loadPrintData(printClass, m) }}
                  style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: `2px solid ${printMode === m ? '#1D4ED8' : '#EFEFED'}`, background: printMode === m ? '#EFF6FF' : '#fff', color: printMode === m ? '#1D4ED8' : '#666', fontWeight: 700, fontSize: 11, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", textAlign: 'left' as const }}>
                  <div>{m === '2w' ? '2 Weeks' : '1 Month'}</div>
                  <div style={{ fontSize: 9, color: printMode === m ? '#1D4ED8' : '#AAA', marginTop: 2 }}>{new Date(r.start).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })} → {new Date(r.end).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}</div>
                </button>
              )
            })}
          </div>
          <div style={{ fontSize: 9, fontWeight: 800, color: '#AAA', textTransform: 'uppercase' as const, letterSpacing: '.05em', marginBottom: 7 }}>Class</div>
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' as const, marginBottom: 12 }}>
            {myClasses.map((c: any) => (
              <button key={c.id} onClick={() => { setPrintClass(c); loadPrintData(c, printMode) }}
                style={{ padding: '6px 12px', borderRadius: 8, border: `2px solid ${printClass?.id === c.id ? '#1D4ED8' : '#EFEFED'}`, background: printClass?.id === c.id ? '#1D4ED8' : '#fff', color: printClass?.id === c.id ? '#fff' : '#666', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
                {c.name} <span style={{ opacity: .65, fontSize: 9 }}>({(classLearners[c.id] || []).length})</span>
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' as const }}>
            <div style={{ flex: 1, fontSize: 10, color: '#888', background: '#F8F7F4', borderRadius: 7, padding: '6px 10px' }}>
              {printLoading ? '⏳ Loading…' : printClass ? `${printColumns.length} session-slots · ${printLearners.length} learners · ${uniqueDates.length} days` : 'Select a class to continue'}
            </div>
            <button onClick={doPrint} disabled={!printClass || printLoading || printColumns.length === 0}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: printClass && !printLoading ? '#1A1A1A' : '#E5E5E3', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 16px', fontSize: 11, fontWeight: 700, cursor: printClass && !printLoading ? 'pointer' : 'not-allowed', fontFamily: "'DM Sans',sans-serif", whiteSpace: 'nowrap' as const }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
              Print Sheet
            </button>
          </div>
        </div>
      )}

      {todaySessions.length === 0
        ? <div className="card"><div className="empty">{todayName} — no sessions scheduled</div></div>
        : todaySessions.map((s: any) => (
          <button key={s.id} className="nav-btn" onClick={() => selectSession(s)}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A1A' }}>{s.name}</div>
              <div style={{ fontSize: 11, color: '#AAA', marginTop: 2 }}>{s.classes?.name} · {s.start_time?.slice(0,5)}–{s.end_time?.slice(0,5)} · {(classLearners[s.classes?.id] || []).length} learners</div>
            </div>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#1D4ED8" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        ))}

      {/* Hidden print sheet */}
      {printClass && printColumns.length > 0 && (
        <div id="att-print-sheet" style={{ display: 'none' }}>
          <style>{`
            @media print{#att-print-sheet{display:block!important;font-family:'DM Sans',Arial,sans-serif;}}
            .ap{width:100%;border-collapse:collapse;font-size:7px;table-layout:fixed;}
            .ap th{border:1px solid #BFDBFE;background:#EFF6FF;font-weight:800;color:#1D4ED8;padding:2px 1px;text-align:center;overflow:hidden;font-size:6.5px;text-transform:uppercase;}
            .ap th.ap-name{text-align:left;padding:2px 5px;width:82px;font-size:7px;}
            .ap th.ap-num{width:12px;}
            .ap th.ap-tot{width:22px;background:#DBEAFE;color:#1D4ED8;}
            .ap th.ap-day{font-weight:800;color:#1A1A1A;background:#F8F8F6;border-color:#D1D5DB;padding:2px 1px;}
            .ap th.ap-sess{font-size:6px;font-weight:700;color:#374151;background:#fff;border-color:#E5E5E3;}
            .ap th.ap-time{font-size:5.5px;font-weight:400;color:#888;background:#fff;border-color:#E5E5E3;padding:0 1px 2px;}
            .ap th.ap-wk,.ap td.ap-wk{border-left:2px solid #BFDBFE!important;}
            .ap td{border:1px solid #E5E5E3;padding:0;text-align:center;vertical-align:middle;height:17px;overflow:hidden;}
            .ap td.ap-name{padding:2px 5px;font-weight:600;font-size:7.5px;color:#1A1A1A;background:#FAFAF8;border-right:2px solid #D1D5DB;text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
            .ap td.ap-num{font-size:6.5px;color:#CCC;background:#FAFAF8;}
            .ap td.ap-tot{font-weight:800;font-size:7.5px;background:#EFF6FF;border-left:2px solid #BAE6FD;}
            .ap td.ap-cell{font-size:8px;font-weight:700;}
            .ap tr.alt td{background:#FAFAFA;}.ap tr.alt td.ap-name{background:#F5F5F3;}.ap tr.alt td.ap-tot{background:#E8F4FD;}
            .ap tr.ap-sum td{background:#EFF6FF;border-top:2px solid #BFDBFE;font-size:6.5px;font-weight:800;color:#1D4ED8;height:14px;}
          `}</style>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8, paddingBottom: 6, borderBottom: '2px solid #1D4ED8' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#1D4ED8', marginBottom: 2 }}>Session Attendance Register — {printClass.name}</div>
              <div style={{ fontSize: 8.5, color: '#888' }}>
                {new Date(range.start).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })} → {new Date(range.end).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })} · {printLearners.length} learners · Printed: {new Date().toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, fontSize: 7, color: '#555', alignItems: 'center' }}>
              {[['✓','Present','#15803D'],['L','Late','#B45309'],['✗','Absent','#DC2626'],['E','Excused','#1D4ED8'],['·','Not recorded','#CCC']].map(([sym,label,color]) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 3 }}><span style={{ color, minWidth: 8 }}>{sym}</span><span style={{ color: '#666' }}>{label}</span></div>
              ))}
            </div>
          </div>
          <table className="ap">
            <colgroup><col style={{ width: 12 }} /><col style={{ width: 82 }} />{printColumns.map((_: any, ci: number) => <col key={ci} style={{ width: 18 }} />)}<col style={{ width: 22 }} /><col style={{ width: 22 }} /></colgroup>
            <thead>
              <tr>
                <th colSpan={2} rowSpan={3} className="ap-name" style={{ verticalAlign: 'bottom', paddingBottom: 3 }}>Learner</th>
                {uniqueDates.map((d: Date, di: number) => {
                  const dateStr = isoDate(d); const span = colsByDay[dateStr] || 1
                  const dow = d.getDay() === 0 ? 7 : d.getDay()
                  return <th key={`day-${dateStr}`} colSpan={span} className={`ap-day${dow === 1 && di > 0 ? ' ap-wk' : ''}`}>{d.toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' })}</th>
                })}
                <th colSpan={2} rowSpan={3} className="ap-tot" style={{ verticalAlign: 'middle', fontSize: 7, fontWeight: 800 }}>Total</th>
              </tr>
              <tr>{printColumns.map((col: any, ci: number) => {
                const dow = col.date.getDay() === 0 ? 7 : col.date.getDay()
                return <th key={`sn-${ci}`} className={`ap-sess${dow === 1 && col.isFirstOfDay && ci > 0 ? ' ap-wk' : ''}`} title={col.session.name}>{col.session.name?.length > 8 ? col.session.name.substring(0, 7) + '…' : col.session.name}</th>
              })}</tr>
              <tr>{printColumns.map((col: any, ci: number) => {
                const dow = col.date.getDay() === 0 ? 7 : col.date.getDay()
                return <th key={`st-${ci}`} className={`ap-time${dow === 1 && col.isFirstOfDay && ci > 0 ? ' ap-wk' : ''}`}>{col.session.start_time?.slice(0, 5)}</th>
              })}</tr>
            </thead>
            <tbody>
              {printLearners.map((l: any, li: number) => {
                const { present, total } = learnerStats(l.id)
                const pct = total > 0 ? Math.round(present / total * 100) : null
                const pctColor = pct == null ? '#AAA' : pct >= 80 ? '#15803D' : pct >= 60 ? '#B45309' : '#DC2626'
                return (
                  <tr key={l.id} className={li % 2 === 1 ? 'alt' : ''}>
                    <td className="ap-num">{li + 1}</td>
                    <td className="ap-name">{l.full_name}</td>
                    {printColumns.map((col: any, ci: number) => {
                      const status = printAttendance[col.session.id]?.[col.dateStr]?.[l.id]
                      const dow = col.date.getDay() === 0 ? 7 : col.date.getDay()
                      return <td key={`${l.id}-${ci}`} className={`ap-cell${dow === 1 && col.isFirstOfDay && ci > 0 ? ' ap-wk' : ''}`}>{status ? <span style={{ color: SYM_COLOR[status] }}>{SYM[status]}</span> : <span style={{ color: '#DDD' }}>·</span>}</td>
                    })}
                    <td className="ap-tot" style={{ color: pctColor }}>{present}/{total || '—'}</td>
                    <td className="ap-tot" style={{ color: pctColor, borderLeft: 'none' }}>{pct != null ? `${pct}%` : '—'}</td>
                  </tr>
                )
              })}
              <tr className="ap-sum">
                <td colSpan={2} style={{ textAlign: 'right', paddingRight: 5 }}>Class →</td>
                {printColumns.map((col: any, ci: number) => {
                  const { present, total } = colStats(col.session.id, col.dateStr)
                  const dow = col.date.getDay() === 0 ? 7 : col.date.getDay()
                  return <td key={`sum-${ci}`} className={dow === 1 && col.isFirstOfDay && ci > 0 ? 'ap-wk' : ''} style={{ color: total === 0 ? '#DDD' : present / Math.max(total, 1) >= 0.8 ? '#15803D' : '#DC2626' }}>{total > 0 ? present : '·'}</td>
                })}
                <td colSpan={2} style={{ background: '#DBEAFE', color: '#1D4ED8', fontSize: 7 }}>
                  {(() => { const tot = printLearners.reduce((s: number, l: any) => s + learnerStats(l.id).total, 0); const prs = printLearners.reduce((s: number, l: any) => s + learnerStats(l.id).present, 0); return tot > 0 ? `${Math.round(prs / tot * 100)}%` : '—' })()}
                </td>
              </tr>
            </tbody>
          </table>
          <div style={{ marginTop: 7, display: 'flex', justifyContent: 'space-between', fontSize: 7.5, color: '#AAA', paddingTop: 5, borderTop: '1px solid #F0F0EE' }}>
            <div>Teacher: <span style={{ display: 'inline-block', width: 80, borderBottom: '1px solid #CCC', marginRight: 12 }} /> Date verified: <span style={{ display: 'inline-block', width: 60, borderBottom: '1px solid #CCC' }} /></div>
            <div>Enderun Heights · Secular Dept · {printClass.name} · <span style={{ color: '#CCC' }}>empty cells = not yet logged</span></div>
          </div>
        </div>
      )}
    </div>
  )

  // ── Mark attendance ────────────────────────────────────────────────────────
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <div>
          <button className="bk" onClick={() => { setSelSession(null); setSaved(false) }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>Back
          </button>
          <div className="h1">{selSession.name}</div>
          <div className="sub">{selSession.classes?.name} · {selSession.start_time?.slice(0,5)}–{selSession.end_time?.slice(0,5)}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input type="date" value={attDate} onChange={e => changeDate(e.target.value)} className="date-input" />
          <button className="svbtn" onClick={save} disabled={saving}>{saving ? 'Saving…' : saved ? '✓ Saved' : 'Save'}</button>
        </div>
      </div>

      <div className="att-sum">
        {[{l:'Present',n:presentCount,bg:'#F0FDF4',c:'#15803D'},{l:'Late',n:lateCount,bg:'#FEFCE8',c:'#A16207'},{l:'Absent',n:absentCount,bg:'#FEF2F2',c:'#B91C1C'},{l:'Excused',n:excusedCount,bg:'#EFF6FF',c:'#1D4ED8'}].map(s => (
          <div key={s.l} className="asc" style={{ background: s.bg }}><div className="asn" style={{ color: s.c }}>{s.n}</div><div className="asl" style={{ color: s.c }}>{s.l}</div></div>
        ))}
      </div>

      {/* Quick mark all */}
      <div className="mark-row">
        <span className="mark-lbl">Mark all:</span>
        {STATUS_OPTIONS.map(s => <button key={s.key} className="mark-btn" onClick={() => markAll(s.key)} style={{ background: s.light, color: s.text }}>{s.label}</button>)}
      </div>

      {sessLearners.map((l: any) => {
        const status = attMap[l.id] || 'absent'
        const cfg    = STATUS_OPTIONS.find(s => s.key === status)
        return (
          <div key={l.id} className="lcard" style={{ borderColor: cfg?.light || '#EFEFED' }}>
            <div className="ltop">
              <div className="lname"><div className="sdot" style={{ background: cfg?.bg || '#EF4444' }} />{l.full_name}</div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                {/* HW quick toggle */}
                <button onClick={() => { setHwMap(p => ({ ...p, [l.id]: !p[l.id] })); setSaved(false) }}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6, border: `1.5px solid ${hwMap[l.id] ? '#BBF7D0' : '#EFEFED'}`, background: hwMap[l.id] ? '#F0FDF4' : '#F8F8F6', color: hwMap[l.id] ? '#15803D' : '#AAA', cursor: 'pointer' }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/></svg>
                  HW
                </button>
                <div className="sbtns">
                  {STATUS_OPTIONS.map(s => (
                    <button key={s.key} className="sbtn"
                      onClick={() => { setAttMap(p => ({ ...p, [l.id]: s.key })); setSaved(false) }}
                      style={{ background: status === s.key ? s.bg : '#F8F8F6', color: status === s.key ? 'white' : '#AAA', borderColor: status === s.key ? s.bg : 'transparent' }}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <input className="ni" value={noteMap[l.id] || ''} placeholder="Note…"
              onChange={e => { setNoteMap(p => ({ ...p, [l.id]: e.target.value })); setSaved(false) }} />
          </div>
        )
      })}
    </div>
  )
}
