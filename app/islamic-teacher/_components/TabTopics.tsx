'use client'
import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { useTopicProgress } from '../_hooks/useTopicProgress'

const TOPICS_PER_GROUP = 6

export function TabTopics({ data }: any) {
  const { myClasses, classLearners, teacherId } = data
  const supabase = createClient()

  const [cls, setCls]                 = useState<any>(null)
  const [subjects, setSubjects]       = useState<any[]>([])
  const [subject, setSubject]         = useState<any>(null)
  const [topicList, setTopicList]     = useState<any[]>([])
  const [groupOffset, setGroupOffset] = useState(0)
  const [topicView, setTopicView]     = useState<'table' | 'card'>('table')
  const [selLearner, setSelLearner]   = useState<any>(null)

  const prog     = useTopicProgress(teacherId)
  const learners = cls ? (classLearners[cls.id] || []) : []

  async function selectClass(c: any) {
    setCls(c); setSubject(null); setTopicList([]); setGroupOffset(0); prog.reset()
    const { data: subs } = await supabase
      .from('curriculum_subjects').select('*').eq('class_id', c.id).eq('is_active', true).order('order_num')
    setSubjects(subs || [])
  }

  async function selectSubject(s: any) {
    setSubject(s); setGroupOffset(0); setSelLearner(null)
    const { data: tops } = await supabase
      .from('curriculum_topics').select('*').eq('subject_id', s.id).eq('is_active', true).eq('track_per_learner', true).order('order_num')
    setTopicList(tops || [])
    await prog.load(learners.map((l: any) => l.id), (tops || []).map((t: any) => t.id))
  }

  const topicGroups = useMemo(() => {
    const g = []
    for (let i = 0; i < topicList.length; i += TOPICS_PER_GROUP) g.push(topicList.slice(i, i + TOPICS_PER_GROUP))
    return g
  }, [topicList])

  const currentGroup = topicGroups[groupOffset] || []
  const tIds         = topicList.map((t: any) => t.id)
  const overallPct   = prog.overallPct(learners.map((l: any) => l.id), tIds)

  // ── Print checklist ─────────────────────────────────────────────────────────
  // Splits topics into chunks of max 12 per page (landscape) so the grid fits
  const PRINT_COLS = 12
  const printGroups = useMemo(() => {
    const g = []
    for (let i = 0; i < topicList.length; i += PRINT_COLS) g.push(topicList.slice(i, i + PRINT_COLS))
    return g
  }, [topicList])

  function doPrint() {
    const id = '__topics_print__'
    let el = document.getElementById(id) as HTMLStyleElement | null
    if (!el) { el = document.createElement('style'); el.id = id; document.head.appendChild(el) }
    el.innerHTML = `
      @page { size: A4 landscape; margin: 8mm 10mm; }
      @media print {
        body > * { visibility: hidden; }
        #topic-print-sheet, #topic-print-sheet * { visibility: visible; }
        #topic-print-sheet { position: absolute; top: 0; left: 0; width: 100%; }
        .no-print { display: none !important; }
      }
    `
    setTimeout(() => window.print(), 120)
  }

  // ── Class selection screen ──────────────────────────────────────────────────
  if (!cls) return (
    <div>
      <div style={{ marginBottom: 14 }}>
        <div className="h1">Topic Tracking</div>
        <div className="sub">Per-learner progress</div>
      </div>
      {myClasses.map((c: any) => (
        <button key={c.id} className="nav-btn" onClick={() => selectClass(c)}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A1A' }}>{c.name}</div>
            <div style={{ fontSize: 11, color: '#AAA', marginTop: 2 }}>{(classLearners[c.id] || []).length} learners</div>
          </div>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#15803D" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      ))}
    </div>
  )

  // ── Subject selection screen ────────────────────────────────────────────────
  if (!subject) return (
    <div>
      <button className="bk" onClick={() => setCls(null)}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>Back
      </button>
      <div style={{ marginBottom: 14 }}>
        <div className="h1">{cls.name}</div>
        <div className="sub">Select a subject</div>
      </div>
      {subjects.length === 0
        ? <div className="empty">No subjects — admin needs to add curriculum</div>
        : subjects.map((s: any) => (
          <button key={s.id} className="nav-btn" onClick={() => selectSubject(s)}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A1A' }}>{s.name}</div>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#15803D" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        ))}
    </div>
  )

  // ── Topic view ──────────────────────────────────────────────────────────────
  return (
    <div>
      {/* ── Hidden print sheet — only visible on print ── */}
      <div id="topic-print-sheet" style={{ display: 'none' }}>
        <style>{`
          @media print {
            #topic-print-sheet { display: block !important; font-family: 'DM Sans', Arial, sans-serif; }
          }
          .ps-page { page-break-after: always; }
          .ps-page:last-child { page-break-after: avoid; }
          .ps-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 2px solid #15803D; }
          .ps-title { font-size: 14px; font-weight: 800; color: #15803D; margin-bottom: 2px; }
          .ps-meta  { font-size: 9px; color: #888; }
          .ps-legend { display: flex; gap: 14px; font-size: 8px; color: #666; align-items: center; }
          .ps-legend-item { display: flex; align-items: center; gap: 4px; }
          .ps-grid { width: 100%; border-collapse: collapse; font-size: 7.5px; table-layout: fixed; }
          .ps-grid col.ps-name-col { width: 88px; }
          .ps-grid col.ps-rank-col { width: 14px; }
          .ps-grid col.ps-cell-col { width: 22px; }
          .ps-grid col.ps-done-col { width: 28px; }
          .ps-grid th { background: #F0FDF4; font-weight: 800; color: #15803D; border: 1px solid #BBF7D0; padding: 2px 2px; text-align: center; font-size: 7px; letter-spacing: .02em; text-transform: uppercase; overflow: hidden; }
          .ps-grid th.ps-name-col { text-align: left; padding: 2px 4px; }
          .ps-grid td { border: 1px solid #E5E5E3; padding: 0; vertical-align: middle; height: 19px; overflow: hidden; }
          .ps-grid td.ps-name { padding: 2px 5px; font-weight: 600; font-size: 7.5px; color: #1A1A1A; background: #FAFAF8; border-right: 2px solid #D1D5DB; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .ps-grid td.ps-rank { text-align: center; font-size: 7px; color: #AAA; background: #FAFAF8; border-right: 1px solid #E5E5E3; padding: 0 2px; }
          .ps-grid td.ps-cell { text-align: center; }
          .ps-grid td.ps-done-cell { text-align: center; font-weight: 800; font-size: 8px; color: #15803D; background: #F0FDF4; border-left: 2px solid #BBF7D0; }
          .ps-box { width: 13px; height: 13px; border: 1.5px solid #C5C5C3; border-radius: 2px; margin: 0 auto; display: flex; align-items: center; justify-content: center; }
          .ps-box.filled { background: #15803D; border-color: #15803D; }
          .ps-topic-header { writing-mode: vertical-rl; text-orientation: mixed; transform: rotate(180deg); display: block; max-height: 70px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 7px; font-weight: 700; color: #374151; padding: 2px 0px; }
          .ps-footer { margin-top: 10px; display: flex; justify-content: space-between; font-size: 8px; color: #AAA; padding-top: 6px; border-top: 1px solid #F0F0EE; }
          .ps-sign { display: flex; gap: 40px; }
          .ps-sign-item { font-size: 8px; color: #888; }
          .ps-sign-line { width: 100px; border-bottom: 1px solid #CCC; margin-top: 14px; margin-bottom: 2px; }
          .ps-row-alt { background: #FAFAFA; }
          .ps-section-label { font-size: 8px; color: #888; padding: 2px 6px; background: #F5F5F3; border-bottom: 1px solid #E5E5E3; font-style: italic; }
        `}</style>

        {printGroups.map((group, gi) => (
          <div key={`pg-${gi}`} className="ps-page">
            {/* Page header */}
            <div className="ps-header">
              <div>
                <div className="ps-title">
                  {subject.name} — {cls.name}
                </div>
                <div className="ps-meta">
                  Topics {gi * PRINT_COLS + 1}–{Math.min((gi + 1) * PRINT_COLS, topicList.length)} of {topicList.length} &nbsp;·&nbsp;
                  {learners.length} learners &nbsp;·&nbsp;
                  Printed: {new Date().toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
                  {printGroups.length > 1 && ` · Page ${gi + 1} of ${printGroups.length}`}
                </div>
              </div>
              <div className="ps-legend">
                <div className="ps-legend-item">
                  <div className="ps-box filled">
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                  Already logged
                </div>
                <div className="ps-legend-item">
                  <div className="ps-box" />
                  Tick on paper
                </div>
                <div className="ps-legend-item" style={{ marginLeft: 8, fontSize: 8, color: '#15803D', fontWeight: 600 }}>
                  ← Log these into system after class
                </div>
              </div>
            </div>

            {/* Checklist grid */}
            <table className="ps-grid">
              <colgroup>
                <col className="ps-rank-col" />
                <col className="ps-name-col" />
                {group.map((t: any) => <col key={`col-${t.id}`} className="ps-cell-col" />)}
                <col className="ps-done-col" />
              </colgroup>
              <thead>
                <tr>
                  <th className="ps-rank-col">#</th>
                  <th className="ps-name-col">Learner Name</th>
                  {group.map((t: any) => (
                    <th key={t.id}>
                      <span className="ps-topic-header" title={t.title}>{t.title}</span>
                    </th>
                  ))}
                  <th style={{ minWidth: 36 }}>Done</th>
                </tr>
              </thead>
              <tbody>
                {learners.map((l: any, li: number) => {
                  // How many of this group's topics are done
                  const groupDone = group.filter((t: any) => prog.progress[l.id]?.[t.id]).length
                  // Total across all topics
                  const allDone   = prog.completedCount(l.id, tIds)
                  return (
                    <tr key={l.id} className={li % 2 === 1 ? 'ps-row-alt' : ''}>
                      <td className="ps-rank">{li + 1}</td>
                      <td className="ps-name">{l.full_name}</td>
                      {group.map((t: any) => {
                        const isDone = prog.progress[l.id]?.[t.id]
                        return (
                          <td key={`${l.id}-${t.id}`} className="ps-cell">
                            <div className={`ps-box ${isDone ? 'filled' : ''}`}>
                              {isDone && (
                                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                              )}
                            </div>
                          </td>
                        )
                      })}
                      <td className="ps-done-cell">
                        {allDone}/{tIds.length}
                      </td>
                    </tr>
                  )
                })}
                {/* Summary row */}
                <tr style={{ borderTop: '2px solid #BBF7D0' }}>
                  <td colSpan={2} style={{ padding: '4px 7px', fontSize: 8, fontWeight: 700, color: '#15803D', background: '#F0FDF4', textAlign: 'right' }}>
                    Class totals →
                  </td>
                  {group.map((t: any) => {
                    const count = learners.filter((l: any) => prog.progress[l.id]?.[t.id]).length
                    const pct   = learners.length > 0 ? Math.round(count / learners.length * 100) : 0
                    return (
                      <td key={`sum-${t.id}`} style={{ textAlign: 'center', fontSize: 8, fontWeight: 700, color: pct >= 70 ? '#15803D' : pct >= 40 ? '#A16207' : '#888', background: '#F8F8F6', padding: '3px 2px' }}>
                        {count}/{learners.length}
                      </td>
                    )
                  })}
                  <td style={{ textAlign: 'center', fontSize: 8, fontWeight: 700, color: '#15803D', background: '#F0FDF4' }}>
                    {tIds.length > 0 ? Math.round(learners.reduce((s: number, l: any) => s + prog.completedCount(l.id, tIds), 0) / (learners.length * tIds.length) * 100) : 0}%
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Page footer */}
            <div className="ps-footer">
              <div className="ps-sign">
                <div className="ps-sign-item">
                  <div className="ps-sign-line" />
                  Teacher signature
                </div>
                <div className="ps-sign-item">
                  <div className="ps-sign-line" style={{ width: 80 }} />
                  Date logged
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div>Enderun Heights · {subject.name} · {cls.name}</div>
                <div style={{ marginTop: 2, color: '#BBB' }}>Overall class completion: {overallPct}%</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Screen UI ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <button className="bk" onClick={() => setSubject(null)}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>Back
          </button>
          <div className="h1">{subject.name}</div>
          <div style={{ fontSize: 11, color: '#AAA' }}>{cls.name} · {topicList.length} topics · {learners.length} learners</div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {prog.syncStatus === 'saving' && <span className="sync-status sync-saving">Saving…</span>}
          {prog.syncStatus === 'saved'  && <span className="sync-status sync-saved">✓ Saved</span>}
          {prog.syncStatus === 'error'  && <span className="sync-status" style={{ background: '#FEF2F2', color: '#DC2626' }}>Error — retry</span>}
          {/* Print button */}
          {topicList.length > 0 && learners.length > 0 && (
            <button onClick={doPrint}
              style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#1A1A1A', color: '#fff', border: 'none', borderRadius: 7, padding: '7px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <polyline points="6 9 6 2 18 2 18 9"/>
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                <rect x="6" y="14" width="12" height="8"/>
              </svg>
              Print Checklist
            </button>
          )}
        </div>
      </div>

      {/* Overall completion bar */}
      <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: '10px 14px', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#15803D' }}>Overall Completion</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#15803D' }}>{overallPct}%</span>
        </div>
        <div style={{ height: 6, background: '#BBF7D0', borderRadius: 3, overflow: 'hidden', marginBottom: 4 }}>
          <div style={{ height: '100%', background: '#15803D', borderRadius: 3, width: `${overallPct}%`, transition: 'width .3s' }} />
        </div>
        <div style={{ fontSize: 10, color: '#15803D' }}>
          {learners.reduce((sum: number, l: any) => sum + prog.completedCount(l.id, tIds), 0)} of {learners.length * tIds.length} ticks completed
        </div>
      </div>

      {/* View toggle */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
        <button className={`fp ${topicView === 'table' ? 'on' : ''}`} onClick={() => setTopicView('table')}>Table View</button>
        <button className={`fp ${topicView === 'card' ? 'on' : ''}`} onClick={() => setTopicView('card')}>Per Learner</button>
      </div>

      {topicView === 'table' ? (
        <>
          {topicGroups.length > 1 && (
            <div className="group-nav">
              <span style={{ fontSize: 10, color: '#AAA', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em' }}>Topics:</span>
              {topicGroups.map((_, idx) => (
                <button key={idx} className={`gnav-btn ${groupOffset === idx ? 'on' : ''}`} onClick={() => setGroupOffset(idx)}>
                  {idx * TOPICS_PER_GROUP + 1}–{Math.min((idx + 1) * TOPICS_PER_GROUP, topicList.length)}
                </button>
              ))}
              <span style={{ fontSize: 10, color: '#AAA' }}>{topicList.length} total · {TOPICS_PER_GROUP} per page</span>
            </div>
          )}
          <div className="topic-table-outer">
            <table>
              <thead>
                <tr>
                  <th>Learner</th>
                  {currentGroup.map((t: any) => (
                    <th key={t.id} title={t.title}>
                      <span className="th-topic">{t.title}</span>
                    </th>
                  ))}
                  <th>Done</th>
                </tr>
              </thead>
              <tbody>
                {learners.map((l: any) => {
                  const allDone = prog.completedCount(l.id, tIds)
                  const pct     = tIds.length > 0 ? Math.round(allDone / tIds.length * 100) : 0
                  return (
                    <tr key={l.id}>
                      <td>
                        <div className="lncell">{l.full_name}</div>
                        <div className="lsub">{allDone}/{tIds.length} · {pct}%</div>
                      </td>
                      {currentGroup.map((t: any) => (
                        <td key={`${l.id}-${t.id}`}>
                          <button className={`tick-btn ${prog.progress[l.id]?.[t.id] ? 'done' : ''}`} onClick={() => prog.toggle(l.id, t.id)}>
                            {prog.progress[l.id]?.[t.id]
                              ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                              : <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#E5E5E5' }} />}
                          </button>
                        </td>
                      ))}
                      <td>
                        <span className="pct-badge" style={{ background: pct >= 70 ? '#F0FDF4' : pct >= 40 ? '#FEFCE8' : '#FEF2F2', color: pct >= 70 ? '#15803D' : pct >= 40 ? '#A16207' : '#B91C1C' }}>{pct}%</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <>
          <div className="learner-card-list">
            {learners.map((l: any) => {
              const done = prog.completedCount(l.id, tIds)
              const pct  = tIds.length > 0 ? Math.round(done / tIds.length * 100) : 0
              return (
                <div key={l.id} className={`learner-card ${selLearner?.id === l.id ? 'selected' : ''}`} onClick={() => setSelLearner(selLearner?.id === l.id ? null : l)}>
                  <div className="lc-name">{l.full_name}</div>
                  <div className="lc-pct" style={{ color: pct >= 70 ? '#15803D' : pct >= 40 ? '#A16207' : '#DC2626' }}>{pct}%</div>
                  <div className="lc-sub">{done}/{tIds.length} topics</div>
                </div>
              )
            })}
          </div>
          {selLearner && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A', marginBottom: 10 }}>{selLearner.full_name} — Topics</div>
              <div className="topic-check-list">
                {topicList.map((t: any) => {
                  const done = prog.progress[selLearner.id]?.[t.id]
                  return (
                    <div key={t.id} className={`topic-check-item ${done ? 'done' : ''}`} onClick={() => prog.toggle(selLearner.id, t.id)}>
                      <div className={`tci-check ${done ? 'done' : ''}`}>
                        {done && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>}
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 500, color: '#1A1A1A', flex: 1 }}>{t.title}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}