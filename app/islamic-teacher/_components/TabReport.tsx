'use client'
import { useState, useMemo } from 'react'
import { weekBounds } from '../_types/constants'
import type { ReportRow, SubjectBreakdown } from '../_types/index'

type PrintFormat = 'portrait' | 'landscape'
type SectionKey  = 'attendance' | 'subjects' | 'top_needs' | 'pace' | 'table'
type Scope       = 'all' | 'class'

interface SectionOption { key: SectionKey; label: string; icon: string }
const SECTIONS: SectionOption[] = [
  { key: 'attendance', label: 'Attendance Chart',         icon: '📊' },
  { key: 'subjects',   label: 'Subject Progress',         icon: '📖' },
  { key: 'top_needs',  label: 'Top 5 + Needs Attention',  icon: '⭐' },
  { key: 'pace',       label: 'Curriculum Pace',          icon: '🕌' },
  { key: 'table',      label: 'Full Learner Table',       icon: '📋' },
]

// ─── Colour helpers ───────────────────────────────────────────────────────────
const pc  = (p: number) => p >= 70 ? '#15803D' : p >= 50 ? '#B45309' : '#DC2626'
const bg  = (p: number) => p >= 70 ? '#F0FDF4' : p >= 50 ? '#FFFBEB' : '#FEF2F2'
const bdr = (p: number) => p >= 70 ? '#BBF7D0' : p >= 50 ? '#FDE68A' : '#FCA5A5'

// ─── Inline progress bar ──────────────────────────────────────────────────────
function Bar({ pct, h = 6 }: { pct: number; h?: number }) {
  return (
    <div style={{ height: h, background: '#E9E9E7', borderRadius: 3, overflow: 'hidden', flex: 1, minWidth: 30 }}>
      <div style={{ height: '100%', width: `${Math.min(Math.max(pct, 0), 100)}%`, background: pc(pct), borderRadius: 3 }} />
    </div>
  )
}

// ─── SVG attendance chart — taller, wider bars, labels outside ────────────────
function AttChart({ data }: { data: { label: string; cur: number; prev: number }[] }) {
  const bw = 22, gap = 5, gw = bw * 2 + gap + 20
  const padL = 22, padR = 70, H = 110, cH = 78
  const w = data.length * gw + padL + padR

  return (
    <svg viewBox={`0 0 ${w} ${H}`} style={{ width: '100%', height: '100%', display: 'block' }}>
      {/* Grid lines */}
      {[0, 25, 50, 75, 100].map(v => (
        <g key={v}>
          <line x1={padL} y1={cH - v / 100 * cH} x2={w - padR} y2={cH - v / 100 * cH}
            stroke={v === 0 ? '#CCC' : '#F0F0EE'} strokeWidth={v === 0 ? '0.8' : '0.5'} />
          <text x={padL - 3} y={cH - v / 100 * cH + 3} fontSize="6.5" fill="#BBB" textAnchor="end">{v}%</text>
        </g>
      ))}
      {data.map((d, i) => {
        const x  = padL + i * gw
        const hp = Math.max(Math.round(d.prev / 100 * cH), 2)
        const hc = Math.max(Math.round(d.cur  / 100 * cH), 2)
        const cc = d.cur >= 70 ? '#22C55E' : d.cur >= 50 ? '#EAB308' : '#EF4444'
        const diff = d.cur - d.prev
        return (
          <g key={`bar-${i}`}>
            {/* Prev bar */}
            <rect x={x} y={cH - hp} width={bw} height={hp} fill="#D1D5DB" rx="2" />
            {/* Curr bar */}
            <rect x={x + bw + gap} y={cH - hc} width={bw} height={hc} fill={cc} rx="2" />
            {/* Value label above curr */}
            <text x={x + bw + gap + bw / 2} y={cH - hc - 4} fontSize="7.5" fill={cc} textAnchor="middle" fontWeight="bold">{d.cur}%</text>
            {/* Class label below */}
            <text x={x + bw + gap / 2} y={cH + 12} fontSize="7" fill="#555" textAnchor="middle" fontWeight="600">{d.label}</text>
            {/* Delta */}
            <text x={x + bw + gap / 2} y={cH + 22} fontSize="6.5"
              fill={diff > 0 ? '#15803D' : diff < 0 ? '#DC2626' : '#AAA'} textAnchor="middle">
              {diff > 0 ? `▲${diff}%` : diff < 0 ? `▼${Math.abs(diff)}%` : '→'}
            </text>
          </g>
        )
      })}
      {/* Legend */}
      <rect x={w - padR + 6} y={10} width={8} height={8} fill="#D1D5DB" rx="1" />
      <text x={w - padR + 17} y={17} fontSize="7" fill="#888">Last week</text>
      <rect x={w - padR + 6} y={22} width={8} height={8} fill="#22C55E" rx="1" />
      <text x={w - padR + 17} y={29} fontSize="7" fill="#888">This week</text>
    </svg>
  )
}

// ─── Section wrapper ──────────────────────────────────────────────────────────
function S({ title, icon, children, red }: {
  title: string; icon: string; children: React.ReactNode; red?: boolean
}) {
  return (
    <div style={{ border: `1px solid ${red ? '#FCA5A5' : '#DEDED9'}`, borderRadius: 9, overflow: 'hidden', marginBottom: 10, pageBreakInside: 'avoid' as const, breakInside: 'avoid' as const }}>
      <div style={{ padding: '5px 12px', background: red ? '#FEF2F2' : '#F5F4F0', borderBottom: `1px solid ${red ? '#FCA5A5' : '#DEDED9'}`, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 12 }}>{icon}</span>
        <span style={{ fontSize: 9, fontWeight: 800, color: red ? '#DC2626' : '#444', textTransform: 'uppercase' as const, letterSpacing: '.06em' }}>{title}</span>
      </div>
      <div style={{ padding: '10px 12px', background: '#fff' }}>{children}</div>
    </div>
  )
}

// ─── Class group header inside table ─────────────────────────────────────────
function ClassHeader({ name, count }: { name: string; count: number }) {
  return (
    <tr>
      <td colSpan={9} style={{ padding: '5px 8px', background: '#F0FDF4', borderBottom: '1.5px solid #BBF7D0', borderTop: '1px solid #BBF7D0' }}>
        <span style={{ fontSize: 10, fontWeight: 800, color: '#15803D', letterSpacing: '.03em' }}>{name}</span>
        <span style={{ fontSize: 9, color: '#888', marginLeft: 8 }}>{count} learners</span>
      </td>
    </tr>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export function TabReport({ data }: { data: Record<string, any> }) {
  const { myClasses, classLearners, buildReport } = data as {
    myClasses: Array<{ id: string; name: string }>
    classLearners: Record<string, Array<{ id: string; full_name: string }>>
    buildReport: (cls: { id: string; name: string }) => Promise<ReportRow[]>
  }

  const [scope,    setScope]    = useState<Scope>('all')
  const [selClass, setSelClass] = useState<{ id: string; name: string } | null>(null)
  const [secs,     setSecs]     = useState<Set<SectionKey>>(new Set(SECTIONS.map(s => s.key)))
  const [fmt,      setFmt]      = useState<PrintFormat>('landscape')
  const [step,     setStep]     = useState<'config' | 'report'>('config')
  const [rows,     setRows]     = useState<ReportRow[]>([])
  const [allRows,  setAllRows]  = useState<Record<string, ReportRow[]>>({})
  const [loading,  setLoading]  = useState(false)
  const [selRow,   setSelRow]   = useState<ReportRow | null>(null)

  const { wsStr, weStr }           = weekBounds(0)
  const { wsStr: pws, weStr: pwe } = weekBounds(-1)
  const today = new Date().toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })
  const has = (k: SectionKey) => secs.has(k)

  const classScope = scope === 'class' && selClass ? [selClass] : myClasses
  const getRows    = (id: string) => scope === 'class' ? rows : (allRows[id] ?? [])

  // group rows by class
  const rowsByClass = useMemo(() => {
    const m: Record<string, ReportRow[]> = {}
    rows.forEach(r => { if (!m[r.classId]) m[r.classId] = []; m[r.classId].push(r) })
    return m
  }, [rows])
  const classOrder = useMemo(() => classScope.filter(c => (rowsByClass[c.id]?.length ?? 0) > 0), [classScope, rowsByClass])

  async function generate() {
    setLoading(true); setStep('report'); setSelRow(null)
    if (scope === 'class' && selClass) {
      setRows(await buildReport(selClass))
    } else {
      const map: Record<string, ReportRow[]> = {}
      for (const c of myClasses) map[c.id] = await buildReport(c)
      setAllRows(map)
      setRows(Object.values(map).flat())
    }
    setLoading(false)
  }

  function doPrint() {
    const id = '__rpt__'
    let el = document.getElementById(id) as HTMLStyleElement | null
    if (!el) { el = document.createElement('style'); el.id = id; document.head.appendChild(el) }
    el.innerHTML = `
      @page { size: A4 ${fmt}; margin: 9mm 10mm; }
      @media print {
        body { background: white !important; margin: 0; }
        body > * { visibility: hidden; }
        #rpt, #rpt * { visibility: visible; }
        #rpt { position: absolute; top: 0; left: 0; width: 100%; font-size: 9px; }
        .np { display: none !important; }
        #rpt table { font-size: 9px; }
        #rpt th, #rpt td { padding: 3px 5px !important; }
        #rpt .rpt-section { page-break-inside: avoid; break-inside: avoid; margin-bottom: 8px; }
      }
    `
    setTimeout(() => window.print(), 150)
  }

  // ── "Needs Attention" logic — smarter ─────────────────────────────────────
  // Only flag if attendance is genuinely low OR they have data but 0 topics
  // If EVERYONE has 0 topics (new system), don't flag everyone — only flag low attendance
  const everyoneZeroTopics = useMemo(() => rows.length > 0 && rows.every(r => r.topicsTotal === 0), [rows])

  const needsAtt = useMemo(() => rows.filter(r => {
    const lowAtt      = r.attPctCurr != null && r.attPctCurr < 60
    const longAbsent  = r.consecutiveAbsent >= 3
    // Only flag topic regression: had topics last week but 0 this week (genuine drop-off)
    // Never flag just because topics = 0 this week — teacher may not have marked yet
    const regressed   = !everyoneZeroTopics && r.topicsThisWeek === 0 && r.topicsLastWeek > 0
    return lowAtt || longAbsent || regressed
  }), [rows, everyoneZeroTopics])

  // Top effort — if everyone has 0 topics, rank by attendance + streak instead
  const topEffort = useMemo(() => {
    const allZeroTopics = rows.every(r => r.topicsThisWeek === 0)
    return [...rows]
      .sort((a, b) => {
        if (allZeroTopics) {
          // rank by attendance % + streak
          return ((b.attPctCurr ?? 0) + b.streak * 2) - ((a.attPctCurr ?? 0) + a.streak * 2)
        }
        return (b.topicsThisWeek * 10 + (b.attPctCurr ?? 0)) - (a.topicsThisWeek * 10 + (a.attPctCurr ?? 0))
      })
      .filter(r => (r.attPctCurr ?? 0) > 0 || r.topicsThisWeek > 0 || r.streak > 0)
      .slice(0, 5)
  }, [rows])

  // Attendance chart data
  const attChart = useMemo(() => classScope.map(cls => {
    const cr = getRows(cls.id)
    const cP = cr.map(r => r.attPctCurr).filter((p): p is number => p != null)
    const pP = cr.map(r => r.attPctPrev).filter((p): p is number => p != null)
    return {
      label: cls.name,
      cur:  cP.length ? Math.round(cP.reduce((a, b) => a + b, 0) / cP.length) : 0,
      prev: pP.length ? Math.round(pP.reduce((a, b) => a + b, 0) / pP.length) : 0,
    }
  }), [classScope, rows, allRows, scope])

  // Subject progress per class — keyed by subjectId (not name) to avoid duplicate key bug
  const subByClass = useMemo(() => {
    const result: Record<string, Array<{ id: string; name: string; avg: number; classAvg: number; worstLearner: string }>> = {}
    classScope.forEach(cls => {
      const cr = scope === 'class' ? rows : (allRows[cls.id] ?? [])
      const m: Record<string, { id: string; name: string; pcts: number[] }> = {}
      cr.forEach(r => r.subBreakdown.forEach((s: SubjectBreakdown) => {
        if (!m[s.subjectId]) m[s.subjectId] = { id: s.subjectId, name: s.subjectName, pcts: [] }
        m[s.subjectId].pcts.push(s.pct)
      }))
      result[cls.id] = Object.values(m).map(s => {
        const avg = Math.round(s.pcts.reduce((a, b) => a + b, 0) / s.pcts.length)
        // count learners below 50% in this subject
        const belowThreshold = cr.filter(r => {
          const sub = r.subBreakdown.find((x: SubjectBreakdown) => x.subjectId === s.id)
          return (sub?.pct ?? 0) < 50
        }).length
        // find lowest learner full name for tooltip
        const worst = cr
          .map(r => ({ name: r.learner.full_name, pct: r.subBreakdown.find((x: SubjectBreakdown) => x.subjectId === s.id)?.pct ?? 0 }))
          .sort((a, b) => a.pct - b.pct)[0]
        return { id: s.id, name: s.name, avg, classAvg: avg, worstLearner: worst?.name ?? '', belowCount: belowThreshold }
      }).sort((a, b) => b.avg - a.avg) // highest first — natural reading order
    })
    return result
  }, [classScope, rows, allRows, scope])

  // Curriculum pace per class
  const paceData = useMemo(() => classScope.map(cls => {
    const cr  = getRows(cls.id)
    const d   = cr.reduce((s, r) => s + r.topicsTotal, 0)
    const p   = cr.reduce((s, r) => s + r.topicsPossible, 0)
    const twk = cr.reduce((s, r) => s + r.topicsThisWeek, 0)
    const lwk = cr.reduce((s, r) => s + r.topicsLastWeek, 0)
    return { id: cls.id, name: cls.name, pct: p > 0 ? Math.round(d / p * 100) : 0, done: d, poss: p, thisWk: twk, lastWk: lwk, n: cr.length }
  }), [classScope, rows, allRows, scope])

  // Summary strip
  const summ = useMemo(() => {
    if (!rows.length) return null
    const aP = rows.map(r => r.attPctCurr).filter((p): p is number => p != null)
    const d  = rows.reduce((s, r) => s + r.topicsTotal, 0)
    const p  = rows.reduce((s, r) => s + r.topicsPossible, 0)
    return {
      att:      aP.length ? Math.round(aP.reduce((a, b) => a + b, 0) / aP.length) : 0,
      wkTopics: rows.reduce((s, r) => s + r.topicsThisWeek, 0),
      overall:  p > 0 ? Math.round(d / p * 100) : 0,
      attn:     needsAtt.length,
      absent3:  rows.filter(r => r.consecutiveAbsent >= 3).length,
    }
  }, [rows, needsAtt])

  // ── CONFIG SCREEN ─────────────────────────────────────────────────────────
  if (step === 'config') return (
    <div>
      <div style={{ marginBottom: 16 }}><div className="h1">Weekly Report</div><div className="sub">Configure then generate</div></div>

      {/* Scope */}
      <div style={{ background: '#fff', border: '1px solid #EFEFED', borderRadius: 10, padding: 14, marginBottom: 10 }}>
        <div style={{ fontSize: 9, fontWeight: 800, color: '#AAA', textTransform: 'uppercase' as const, letterSpacing: '.05em', marginBottom: 10 }}>1 · Scope</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: scope === 'class' ? 10 : 0 }}>
          {(['class', 'all'] as Scope[]).map(s => (
            <button key={s} onClick={() => setScope(s)}
              style={{ flex: 1, padding: '9px', borderRadius: 8, border: `2px solid ${scope === s ? '#15803D' : '#EFEFED'}`, background: scope === s ? '#F0FDF4' : '#fff', color: scope === s ? '#15803D' : '#666', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
              {s === 'class' ? 'Single Class' : 'All Classes — School Overview'}
            </button>
          ))}
        </div>
        {scope === 'class' && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {myClasses.map(c => (
              <button key={c.id} onClick={() => setSelClass(c)}
                style={{ padding: '6px 13px', borderRadius: 8, border: `2px solid ${selClass?.id === c.id ? '#15803D' : '#EFEFED'}`, background: selClass?.id === c.id ? '#15803D' : '#fff', color: selClass?.id === c.id ? '#fff' : '#666', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
                {c.name} <span style={{ opacity: .6, fontSize: 10 }}>({(classLearners[c.id] ?? []).length})</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Sections */}
      <div style={{ background: '#fff', border: '1px solid #EFEFED', borderRadius: 10, padding: 14, marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontSize: 9, fontWeight: 800, color: '#AAA', textTransform: 'uppercase' as const, letterSpacing: '.05em' }}>2 · Sections</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setSecs(new Set(SECTIONS.map(s => s.key)))} style={{ fontSize: 10, color: '#15803D', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>All</button>
            <button onClick={() => setSecs(new Set())} style={{ fontSize: 10, color: '#888', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>None</button>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 7 }}>
          {SECTIONS.map(s => {
            const on = secs.has(s.key)
            return (
              <div key={s.key} onClick={() => setSecs(p => { const n = new Set(p); n.has(s.key) ? n.delete(s.key) : n.add(s.key); return n })}
                style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 12px', borderRadius: 9, border: `1.5px solid ${on ? '#15803D' : '#EFEFED'}`, background: on ? '#F0FDF4' : '#FAFAF8', cursor: 'pointer' }}>
                <div style={{ width: 17, height: 17, borderRadius: 4, border: `2px solid ${on ? '#15803D' : '#DDD'}`, background: on ? '#15803D' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {on && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>}
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: on ? '#15803D' : '#555' }}>{s.icon} {s.label}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Print format */}
      <div style={{ background: '#fff', border: '1px solid #EFEFED', borderRadius: 10, padding: 14, marginBottom: 16 }}>
        <div style={{ fontSize: 9, fontWeight: 800, color: '#AAA', textTransform: 'uppercase' as const, letterSpacing: '.05em', marginBottom: 10 }}>3 · Print Format</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['portrait', 'landscape'] as PrintFormat[]).map(f => (
            <button key={f} onClick={() => setFmt(f)}
              style={{ flex: 1, padding: '9px', borderRadius: 8, border: `2px solid ${fmt === f ? '#1D4ED8' : '#EFEFED'}`, background: fmt === f ? '#EFF6FF' : '#fff', color: fmt === f ? '#1D4ED8' : '#666', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {f === 'portrait'
                ? <svg width="12" height="16" viewBox="0 0 12 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x=".5" y=".5" width="11" height="15" rx="1.5"/></svg>
                : <svg width="16" height="12" viewBox="0 0 16 12" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x=".5" y=".5" width="15" height="11" rx="1.5"/></svg>}
              A4 {f === 'portrait' ? 'Portrait' : 'Landscape'}
            </button>
          ))}
        </div>
        <div style={{ marginTop: 8, fontSize: 10, color: '#15803D', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 6, padding: '5px 10px' }}>
          💡 Landscape fits the learner table in fewer pages
        </div>
      </div>

      <button disabled={(scope === 'class' && !selClass) || secs.size === 0} onClick={generate}
        style={{ width: '100%', padding: 13, borderRadius: 10, border: 'none', background: (scope === 'class' && !selClass) || secs.size === 0 ? '#E5E5E3' : '#15803D', color: '#fff', fontSize: 14, fontWeight: 700, cursor: (scope === 'class' && !selClass) || secs.size === 0 ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans',sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
        Generate Report · {secs.size} section{secs.size !== 1 ? 's' : ''}
      </button>
    </div>
  )

  // ── LOADING ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ padding: '70px 20px', textAlign: 'center' }}>
      <div style={{ width: 30, height: 30, border: '3px solid #BBF7D0', borderTopColor: '#15803D', borderRadius: '50%', animation: 'spin .8s linear infinite', margin: '0 auto 12px' }} />
      <div style={{ fontSize: 12, color: '#AAA' }}>Building report…</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  // ── INDIVIDUAL LEARNER DRILL ───────────────────────────────────────────────
  if (selRow) {
    const r  = selRow
    const tp = r.topicsPossible > 0 ? Math.round(r.topicsTotal / r.topicsPossible * 100) : 0
    return (
      <div>
        <div className="np" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 8 }}>
          <button className="bk" onClick={() => setSelRow(null)}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>Back to Report
          </button>
          <button onClick={doPrint} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#1A1A1A', color: '#fff', border: 'none', borderRadius: 7, padding: '7px 14px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>Print
          </button>
        </div>
        <div id="rpt">
          <div style={{ background: 'linear-gradient(135deg,#15803D,#14532d)', borderRadius: 9, padding: '12px 16px', marginBottom: 12, color: '#fff' }}>
            <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 18, marginBottom: 3 }}>{r.learner.full_name}</div>
            <div style={{ fontSize: 10, opacity: .75 }}>
              {r.className} · Rank #{r.classRank} in class · {wsStr} → {weStr}
              {r.streak > 0 && ` · 🔥 ${r.streak}d streak`}
              {r.consecutiveAbsent >= 3 && ` · ⚠ ${r.consecutiveAbsent}d consecutive absent`}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 10 }}>
            {[
              { l: 'Att. This Week', v: r.attPctCurr != null ? `${r.attPctCurr}%` : '—', c: r.attPctCurr != null ? pc(r.attPctCurr) : '#AAA', chg: r.attChange },
              { l: 'Overall Att.',   v: `${r.overallAtt}%`,    c: pc(r.overallAtt),  chg: null },
              { l: 'Topics This Wk', v: String(r.topicsThisWeek), c: '#0284C7',       chg: r.topicChange },
              { l: 'Total Done',     v: `${tp}%`,               c: pc(tp),            chg: null },
            ].map(s => (
              <div key={s.l} style={{ background: '#fff', border: '1px solid #EFEFED', borderRadius: 9, padding: '10px 12px' }}>
                <div style={{ fontSize: 20, fontWeight: 600, color: s.c }}>{s.v}</div>
                <div style={{ fontSize: 8, color: '#AAA', textTransform: 'uppercase' as const, letterSpacing: '.04em', marginTop: 3 }}>{s.l}</div>
                {s.chg != null && s.chg !== 0 && (
                  <div style={{ fontSize: 9, color: s.chg >= 0 ? '#15803D' : '#DC2626', fontWeight: 700, marginTop: 2 }}>
                    {s.chg >= 0 ? '+' : ''}{s.chg} vs last wk
                  </div>
                )}
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 130px', gap: 8 }}>
            <S title="Subject Breakdown" icon="📖">
              {r.subBreakdown.length === 0
                ? <div style={{ color: '#AAA', fontSize: 11 }}>No subject data</div>
                : r.subBreakdown.map((s: SubjectBreakdown) => (
                  <div key={`ld-${s.subjectId}`} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <div style={{ minWidth: 100, fontSize: 11, color: '#333', fontWeight: 500 }}>{s.subjectName}</div>
                    <Bar pct={s.pct} />
                    <span style={{ fontSize: 10, fontWeight: 700, color: pc(s.pct), minWidth: 56, textAlign: 'right' as const }}>{s.completed}/{s.total} · {s.pct}%</span>
                  </div>
                ))}
            </S>
            <S title="Behaviour" icon="🧭">
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
                <div style={{ textAlign: 'center', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 8, padding: '10px 8px' }}>
                  <div style={{ fontSize: 26, fontWeight: 600, color: '#DC2626' }}>{r.incidentCount}</div>
                  <div style={{ fontSize: 8, color: '#DC2626', textTransform: 'uppercase' as const, marginTop: 2 }}>Incidents</div>
                </div>
                <div style={{ textAlign: 'center', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, padding: '10px 8px' }}>
                  <div style={{ fontSize: 26, fontWeight: 600, color: '#15803D' }}>{r.praiseCount}</div>
                  <div style={{ fontSize: 8, color: '#15803D', textTransform: 'uppercase' as const, marginTop: 2 }}>Praises</div>
                </div>
              </div>
            </S>
          </div>
        </div>
      </div>
    )
  }

  // ── FULL REPORT ───────────────────────────────────────────────────────────
  return (
    <div>
      {/* Screen toolbar */}
      <div className="np" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <button className="bk" onClick={() => { setStep('config'); setRows([]); setAllRows({}) }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>Reconfigure
        </button>
        <button onClick={doPrint} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#1A1A1A', color: '#fff', border: 'none', borderRadius: 7, padding: '7px 14px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
          Print · A4 {fmt === 'portrait' ? 'Portrait' : 'Landscape'}
        </button>
      </div>

      <div id="rpt">
        {/* ── Report header ── */}
        <div style={{ background: 'linear-gradient(135deg,#15803D 0%,#14532d 100%)', borderRadius: 9, padding: '12px 16px', marginBottom: 10, color: '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 17, marginBottom: 3 }}>Weekly Progress Report</div>
              <div style={{ fontSize: 9.5, opacity: .8 }}>
                {today} &nbsp;·&nbsp; {wsStr} → {weStr} &nbsp;·&nbsp; vs {pws} → {pwe}
                &nbsp;·&nbsp; {scope === 'all' ? 'All Classes' : selClass?.name}
                &nbsp;·&nbsp; {rows.length} learners
              </div>
            </div>
            {/* Summary chips */}
            {summ && (
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                {[
                  { v: `${summ.att}%`,           l: 'Avg Att.',    w: summ.att < 70 },
                  { v: String(summ.wkTopics),    l: 'Topics Wk',   w: false },
                  { v: `${summ.overall}%`,        l: 'Overall',     w: summ.overall < 30 },
                  { v: String(summ.attn),         l: 'Need Attn',   w: summ.attn > 0 },
                  { v: String(summ.absent3),      l: '3d+ Absent',  w: summ.absent3 > 0 },
                ].map(s => (
                  <div key={s.l} style={{ background: s.w ? 'rgba(254,226,226,.35)' : 'rgba(255,255,255,.18)', border: s.w ? '1px solid rgba(252,165,165,.5)' : '1px solid rgba(255,255,255,.25)', borderRadius: 7, padding: '5px 10px', textAlign: 'center', minWidth: 62 }}>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>{s.v}</div>
                    <div style={{ fontSize: 7.5, opacity: .8, textTransform: 'uppercase' as const, letterSpacing: '.04em', marginTop: 1 }}>{s.l}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Row 1: Attendance + Subject Progress side by side ── */}
        {(has('attendance') || has('subjects')) && (
          <div style={{ display: 'grid', gridTemplateColumns: has('attendance') && has('subjects') ? '1fr 1fr' : '1fr', gap: 10, marginBottom: 0 }}>

            {has('attendance') && attChart.length > 0 && (
              <S title="Attendance — This vs Last Week" icon="📊">
                <AttChart data={attChart} />
              </S>
            )}

            {has('subjects') && (
              <S title="Subject Progress by Class" icon="📖">
                {classOrder.length === 0
                  ? <div style={{ color: '#AAA', fontSize: 11 }}>No data yet</div>
                  : classOrder.map(cls => (
                    <div key={`sub-${cls.id}`} style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 9, fontWeight: 800, color: '#15803D', textTransform: 'uppercase' as const, letterSpacing: '.04em', marginBottom: 6, paddingBottom: 4, borderBottom: '1px solid #F0F0EE' }}>
                        {cls.name}
                      </div>
                      {(subByClass[cls.id] ?? []).length === 0
                        ? <div style={{ fontSize: 10, color: '#AAA' }}>No subject data</div>
                        : (subByClass[cls.id] ?? []).map(s => (
                          <div key={`sp-${s.id}`} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
                            <div style={{ minWidth: 80, fontSize: 10, fontWeight: 500, color: '#333' }}>{s.name}</div>
                            <Bar pct={s.avg} />
                            <span style={{ fontSize: 10, fontWeight: 700, color: pc(s.avg), minWidth: 32, textAlign: 'right' as const }}>{s.avg}%</span>
                            {(s as any).belowCount > 0 && (
                              <span style={{ fontSize: 8, color: '#DC2626', fontWeight: 600, whiteSpace: 'nowrap' as const }} title={`Lowest: ${s.worstLearner}`}>
                                ⚠ {(s as any).belowCount}
                              </span>
                            )}
                          </div>
                        ))}
                    </div>
                  ))}
              </S>
            )}
          </div>
        )}

        {/* ── Row 2: Top 5 + Needs Attention side by side ── */}
        {has('top_needs') && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 0 }}>

            <S title={rows.every(r => r.topicsThisWeek === 0) ? "Top 5 — Best Attendance This Week" : "Top 5 — Most Effort This Week"} icon="⭐">
              {topEffort.length === 0
                ? <div style={{ color: '#AAA', fontSize: 11 }}>No activity recorded yet</div>
                : topEffort.map((r, i) => (
                  <div key={`t5-${r.learner.id}`} onClick={() => setSelRow(r)}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: i < topEffort.length - 1 ? '1px solid #F5F5F3' : 'none', cursor: 'pointer' }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#A16207', minWidth: 22 }}>#{i + 1}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#1A1A1A' }}>{r.learner.full_name}</div>
                      <div style={{ fontSize: 9, color: '#888', marginTop: 1 }}>
                        {r.className}
                        {r.streak > 0 && <span style={{ color: '#A16207', marginLeft: 5 }}>🔥 {r.streak}d</span>}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' as const }}>
                      {r.topicsThisWeek > 0
                        ? <div style={{ fontSize: 12, fontWeight: 700, color: '#15803D' }}>{r.topicsThisWeek}t</div>
                        : r.attPctCurr != null
                          ? <div style={{ fontSize: 12, fontWeight: 700, color: pc(r.attPctCurr) }}>{r.attPctCurr}%</div>
                          : null
                      }
                      {r.streak > 0 && r.topicsThisWeek === 0 && (
                        <div style={{ fontSize: 9, color: '#A16207' }}>🔥 {r.streak}d</div>
                      )}
                      {r.topicsThisWeek > 0 && r.attPctCurr != null && (
                        <div style={{ fontSize: 9, color: pc(r.attPctCurr) }}>{r.attPctCurr}%</div>
                      )}
                    </div>
                  </div>
                ))}
            </S>

            <S title={`Needs Attention${needsAtt.length > 0 ? ` — ${needsAtt.length} learner${needsAtt.length > 1 ? 's' : ''}` : ''}`} icon="⚠️" red>
              {needsAtt.length === 0 ? (
                <div style={{ fontSize: 12, color: '#15803D', fontWeight: 600, padding: '8px 0' }}>
                  ✅ All learners on track this week
                </div>
              ) : needsAtt.map(r => (
                <div key={`na-${r.learner.id}`} onClick={() => setSelRow(r)}
                  style={{ padding: '5px 0', borderBottom: '1px solid #FEE2E2', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#1A1A1A' }}>{r.learner.full_name}</div>
                    <span style={{ fontSize: 8, background: '#F0F0EE', color: '#666', padding: '1px 5px', borderRadius: 3, fontWeight: 700 }}>{r.className}</span>
                  </div>
                  <div style={{ fontSize: 9, display: 'flex', gap: 7, flexWrap: 'wrap' as const, color: '#888' }}>
                    {r.attPctCurr != null && r.attPctCurr < 60 && <span style={{ color: '#DC2626', fontWeight: 700 }}>Att {r.attPctCurr}%</span>}
                    {r.consecutiveAbsent >= 3 && <span style={{ color: '#DC2626', fontWeight: 700 }}>{r.consecutiveAbsent}d absent</span>}
                    {!everyoneZeroTopics && r.topicsThisWeek === 0 && r.topicsTotal > 0 && <span style={{ color: '#DC2626', fontWeight: 700 }}>0 topics</span>}
                    <span>Overall att: {r.overallAtt}%</span>
                    {r.incidentCount > 0 && <span style={{ color: '#DC2626' }}>⚠ {r.incidentCount} incident{r.incidentCount > 1 ? 's' : ''}</span>}
                  </div>
                </div>
              ))}
            </S>
          </div>
        )}

        {/* ── Curriculum Pace ── */}
        {has('pace') && paceData.length > 0 && (
          <S title="Curriculum Pace by Class" icon="🕌">
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(paceData.length, 4)}, 1fr)`, gap: 12 }}>
              {paceData.map(c => {
                const diff = c.thisWk - c.lastWk
                return (
                  <div key={`pace-${c.id}`}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: '#1A1A1A', marginBottom: 6 }}>{c.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <Bar pct={c.pct} />
                      <span style={{ fontSize: 14, fontWeight: 700, color: pc(c.pct), minWidth: 36 }}>{c.pct}%</span>
                    </div>
                    <div style={{ fontSize: 9.5, color: '#888', marginBottom: 2 }}>{c.done}/{c.poss} topics · {c.n} learners</div>
                    {/* Only show weekly line if teacher has marked topics this week */}
                    {c.thisWk > 0 ? (
                      <div style={{ fontSize: 9.5, fontWeight: 600, color: diff >= 0 ? '#15803D' : '#DC2626' }}>
                        This week: {c.thisWk} topics{diff !== 0 ? ` (${diff > 0 ? '+' : ''}${diff} vs last)` : ''}
                      </div>
                    ) : (
                      <div style={{ fontSize: 9.5, color: '#AAA' }}>No topics marked this week</div>
                    )}
                  </div>
                )
              })}
            </div>
          </S>
        )}

        {/* ── Full learner table — grouped by class ── */}
        {has('table') && rows.length > 0 && (
          <S title="Full Learner Table" icon="📋">
            <div style={{ overflowX: 'auto' as const }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' as const, fontSize: 10 }}>
                <thead>
                  <tr style={{ background: '#F8F7F4' }}>
                    {['#', 'Learner', 'Att %', 'Δ Att', 'Topics Wk', 'Δ Topics', 'Total %', 'Streak', 'Beh'].map(h => (
                      <th key={h} style={{ padding: '4px 6px', textAlign: h === 'Learner' ? 'left' : 'center', fontWeight: 800, color: '#555', fontSize: 8, textTransform: 'uppercase' as const, letterSpacing: '.04em', whiteSpace: 'nowrap' as const, borderBottom: '1.5px solid #DEDED9' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {classOrder.map(cls => {
                    const clsRows = rowsByClass[cls.id] ?? []
                    if (!clsRows.length) return null
                    return (
                      <>
                        <ClassHeader key={`ch-${cls.id}`} name={cls.name} count={clsRows.length} />
                        {clsRows.map((r, i) => {
                          const tp  = r.topicsPossible > 0 ? Math.round(r.topicsTotal / r.topicsPossible * 100) : 0
                          const ia  = needsAtt.some(n => n.learner.id === r.learner.id)
                          return (
                            <tr key={`tr-${r.learner.id}`}
                              style={{ background: ia ? '#FFF9F9' : i % 2 === 0 ? '#fff' : '#FAFAF8', borderBottom: '1px solid #F2F2F0', cursor: 'pointer' }}
                              onClick={() => setSelRow(r)}>
                              <td style={{ padding: '4px 7px', textAlign: 'center', color: '#BBB', fontSize: 9, fontWeight: 600 }}>{r.classRank}</td>
                              <td style={{ padding: '5px 7px', fontWeight: 600, color: '#1A1A1A', whiteSpace: 'nowrap' as const }}>
                                {ia && <span style={{ color: '#DC2626', marginRight: 4 }}>⚠</span>}
                                {r.learner.full_name}
                                {r.consecutiveAbsent >= 3 && (
                                  <span style={{ fontSize: 8, color: '#DC2626', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 3, padding: '0 4px', marginLeft: 5, fontWeight: 700 }}>
                                    {r.consecutiveAbsent}d absent
                                  </span>
                                )}
                              </td>
                              <td style={{ padding: '4px 5px', textAlign: 'center' }}>
                                {r.attPctCurr != null
                                  ? <span style={{ background: bg(r.attPctCurr), color: pc(r.attPctCurr), padding: '1px 5px', borderRadius: 4, fontWeight: 700, fontSize: 10 }}>{r.attPctCurr}%</span>
                                  : <span style={{ color: '#CCC' }}>—</span>}
                              </td>
                              <td style={{ padding: '4px 5px', textAlign: 'center', fontWeight: 600, fontSize: 10, color: r.attChange != null ? (r.attChange >= 0 ? '#15803D' : '#DC2626') : '#CCC' }}>
                                {r.attChange != null ? `${r.attChange >= 0 ? '+' : ''}${r.attChange}%` : '—'}
                              </td>
                              <td style={{ padding: '4px 5px', textAlign: 'center', fontWeight: 700, fontSize: 12, color: r.topicsThisWeek > 0 ? '#15803D' : '#AAA' }}>
                                {r.topicsThisWeek}
                              </td>
                              <td style={{ padding: '4px 5px', textAlign: 'center', fontSize: 10, fontWeight: 600, color: r.topicChange > 0 ? '#15803D' : r.topicChange < 0 ? '#DC2626' : '#CCC' }}>
                                {r.topicChange === 0 ? '—' : `${r.topicChange > 0 ? '+' : ''}${r.topicChange}`}
                              </td>
                              <td style={{ padding: '4px 5px', textAlign: 'center' }}>
                                <span style={{ background: tp > 0 ? bg(tp) : '#F5F5F3', color: tp > 0 ? pc(tp) : '#AAA', padding: '1px 5px', borderRadius: 4, fontWeight: 700, fontSize: 10 }}>{tp > 0 ? `${tp}%` : '—'}</span>
                              </td>
                              <td style={{ padding: '4px 5px', textAlign: 'center', fontSize: 10, color: '#A16207' }}>
                                {r.streak > 0 ? `🔥 ${r.streak}d` : '—'}
                              </td>
                              <td style={{ padding: '4px 5px', textAlign: 'center', fontSize: 10 }}>
                                {r.incidentCount > 0 && <span style={{ color: '#DC2626', fontWeight: 700 }}>⚠{r.incidentCount} </span>}
                                {r.praiseCount > 0   && <span style={{ color: '#15803D', fontWeight: 700 }}>★{r.praiseCount}</span>}
                                {r.incidentCount === 0 && r.praiseCount === 0 && <span style={{ color: '#DDD' }}>—</span>}
                              </td>
                            </tr>
                          )
                        })}
                      </>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </S>
        )}

        {/* Footer */}
        <div style={{ marginTop: 8, padding: '6px 0', fontSize: 8.5, color: '#AAA', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #EFEFED' }}>
          <span>Enderun Heights · Islamic Department · {today}</span>
          <span>Week: {wsStr} → {weStr}</span>
        </div>
      </div>
    </div>
  )
}