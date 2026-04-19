'use client'
import { useState, useMemo } from 'react'
import { topicStatus, fmt, weekBounds } from '../_types/constants'

const MAT_ICONS: Record<string, any> = {
  video: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>,
  pdf:   <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
  link:  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
  note:  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/></svg>,
}
const MAT_COLORS: Record<string, { bg: string; c: string }> = {
  video: { bg: '#FEF2F2', c: '#DC2626' }, pdf: { bg: '#EFF6FF', c: '#1D4ED8' },
  link:  { bg: '#F0FDF4', c: '#15803D' }, note: { bg: '#FDF4FF', c: '#7E22CE' },
}
const UNDERSTAND = {
  good:      { bg: '#F0FDF4', c: '#15803D', label: 'Understood well', e: '✓' },
  mixed:     { bg: '#FEFCE8', c: '#A16207', label: 'Mixed',           e: '~' },
  difficult: { bg: '#FEF2F2', c: '#DC2626', label: 'Had difficulty',  e: '✗' },
}

export function TabCurriculum({ data }: any) {
  const { teacher, subjects, topics, progress, materials, terms, topicTerms, lessonPlans,
          loadMaterials, saveLessonPlan, markTopicDone, unmarkTopic } = data

  const [currView,   setCurrView]   = useState<'list' | 'detail'>('list')
  const [currFilter, setCurrFilter] = useState<'week' | 'term' | 'all'>('week')
  const [activeTerm, setActiveTerm] = useState<any>(null)
  const [activeGrade,setActiveGrade]= useState<string | null>(null)
  const [activeSub,  setActiveSub]  = useState<string | null>(null)
  const [selTopic,   setSelTopic]   = useState<any>(null)
  const [subtopics,  setSubtopics]  = useState<any[]>([])

  // Feedback modal
  const [fbModal, setFbModal] = useState<any>(null)
  const [fbNote,  setFbNote]  = useState('')
  const [fbU,     setFbU]     = useState<'good' | 'mixed' | 'difficult'>('good')
  const [fbSaving,setFbSaving]= useState(false)

  // Lesson plan modal
  const [lpModal,      setLpModal]      = useState<any>(null)
  const [lpObjectives, setLpObjectives] = useState('')
  const [lpActivities, setLpActivities] = useState('')
  const [lpResources,  setLpResources]  = useState('')
  const [lpAssessment, setLpAssessment] = useState('')
  const [lpNotes,      setLpNotes]      = useState('')
  const [lpDate,       setLpDate]       = useState('')
  const [lpSaving,     setLpSaving]     = useState(false)

  const grades = useMemo(() => {
    const m = new Map<string, any>()
    subjects.forEach((s: any) => { if (s.classes) m.set(s.classes.id, s.classes) })
    return [...m.values()]
  }, [subjects])

  const gradeSubjects = useMemo(() =>
    activeGrade ? subjects.filter((s: any) => s.class_id === activeGrade) : [], [subjects, activeGrade])

  function filteredTopics() {
    let t = topics.filter((x: any) => !x.parent_topic_id)
    if (activeGrade) t = t.filter((x: any) => x.curriculum_subjects?.class_id === activeGrade)
    if (activeSub)   t = t.filter((x: any) => x.subject_id === activeSub)
    if (currFilter === 'week') {
      const { ws, we } = weekBounds()
      t = t.filter((x: any) => { if (!x.planned_start) return false; const s = new Date(x.planned_start), e = x.planned_end ? new Date(x.planned_end) : s; return s <= we && e >= ws })
    } else if (currFilter === 'term' && activeTerm) {
      const ids = new Set(topicTerms.filter((tt: any) => tt.term_id === activeTerm.id).map((tt: any) => tt.topic_id))
      t = t.filter((x: any) => ids.has(x.id))
    }
    return t
  }

  const ft           = filteredTopics()
  const thisWk       = topics.filter((t: any) => !t.parent_topic_id && topicStatus(t) === 'this-week').length
  const done         = progress.filter((p: any) => p.is_completed).length
  const overdue      = topics.filter((t: any) => !t.parent_topic_id && topicStatus(t) === 'overdue' && !progress.find((p: any) => p.topic_id === t.id && p.is_completed)).length
  const pendingPlans = topics.filter((t: any) => !t.parent_topic_id && topicStatus(t) === 'this-week').filter((t: any) => !lessonPlans.find((lp: any) => lp.topic_id === t.id && lp.status === 'submitted')).length

  async function openDetail(topic: any) {
    setSelTopic(topic); setCurrView('detail')
    const mats = await loadMaterials(topic.id)
    // load subtopics inline
    // (they're already in topics state if loaded)
  }

  function openLp(topic: any) {
    const ex = lessonPlans.find((lp: any) => lp.topic_id === topic.id)
    setLpObjectives(ex?.objectives || ''); setLpActivities(ex?.activities || '')
    setLpResources(ex?.resources || ''); setLpAssessment(ex?.assessment || '')
    setLpNotes(ex?.notes || ''); setLpDate(ex?.plan_date || new Date().toISOString().split('T')[0])
    setLpModal(topic)
  }

  function openFb(topic: any) {
    const ex = progress.find((p: any) => p.topic_id === topic.id)
    setFbU(ex?.understanding || 'good'); setFbNote(ex?.feedback_note || ''); setFbModal(topic)
  }

  async function saveFb() {
    if (!fbModal) return
    setFbSaving(true)
    await markTopicDone(fbModal, teacher.id, fbU, fbNote)
    setFbModal(null); setFbSaving(false)
  }

  async function doSaveLp(status: 'draft' | 'submitted') {
    if (!lpModal) return
    setLpSaving(true)
    await saveLessonPlan(lpModal, teacher.id, status, {
      objectives: lpObjectives, activities: lpActivities, resources: lpResources,
      assessment: lpAssessment, notes: lpNotes, plan_date: lpDate,
    })
    setLpModal(null); setLpSaving(false)
  }

  function printLessonPlan(topic: any) {
    const lp = lessonPlans.find((l: any) => l.topic_id === topic.id)
    const id = '__lp_print__'; let el = document.getElementById(id) as HTMLStyleElement | null
    if (!el) { el = document.createElement('style'); el.id = id; document.head.appendChild(el) }
    el.innerHTML = `@page{size:A4 portrait;margin:12mm 14mm;}@media print{body>*{visibility:hidden;}#lp-print-sheet,#lp-print-sheet *{visibility:visible;}#lp-print-sheet{position:absolute;top:0;left:0;width:100%;}}`

    // Build print div
    let existing = document.getElementById('lp-print-sheet')
    if (!existing) { existing = document.createElement('div'); existing.id = 'lp-print-sheet'; document.body.appendChild(existing) }
    existing.innerHTML = `
      <div style="font-family:'DM Sans',Arial,sans-serif;font-size:10px;">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;border-bottom:2px solid #1D4ED8;padding-bottom:8px;margin-bottom:14px;">
          <div>
            <div style="font-size:16px;font-weight:800;color:#1D4ED8;">Lesson Plan</div>
            <div style="font-size:11px;color:#888;margin-top:2px;">Enderun Heights · Secular Department</div>
          </div>
          <div style="text-align:right;font-size:9px;color:#AAA;">
            <div>Date: ${lp?.plan_date || new Date().toISOString().split('T')[0]}</div>
            <div>Status: ${lp?.status || 'draft'}</div>
          </div>
        </div>
        <div style="margin-bottom:12px;">
          <div style="font-size:13px;font-weight:700;color:#1A1A1A;">${topic.title}</div>
          <div style="font-size:10px;color:#888;margin-top:3px;">
            Subject: ${topic.curriculum_subjects?.name || '—'} · Class: ${topic.curriculum_subjects?.classes?.name || '—'}
            ${topic.planned_start ? ` · Planned: ${fmt(topic.planned_start)}${topic.planned_end ? ` → ${fmt(topic.planned_end)}` : ''}` : ''}
          </div>
          ${topic.description ? `<div style="font-size:10px;color:#666;margin-top:4px;">${topic.description}</div>` : ''}
        </div>
        ${[
          ['Learning Objectives', lp?.objectives],
          ['Activities & Methodology', lp?.activities],
          ['Resources & Materials', lp?.resources],
          ['Assessment', lp?.assessment],
          ['Notes', lp?.notes],
        ].filter(([, v]) => v).map(([label, value]) => `
          <div style="margin-bottom:12px;padding:10px 12px;background:#F8F8F6;border-left:3px solid #1D4ED8;border-radius:0 6px 6px 0;">
            <div style="font-size:9px;font-weight:800;color:#1D4ED8;text-transform:uppercase;letter-spacing:.05em;margin-bottom:5px;">${label}</div>
            <div style="font-size:10.5px;color:#1A1A1A;line-height:1.6;white-space:pre-wrap;">${value}</div>
          </div>
        `).join('')}
        <div style="margin-top:20px;display:flex;gap:40px;padding-top:10px;border-top:1px solid #EFEFED;">
          <div style="font-size:9px;color:#888;">Teacher: <span style="display:inline-block;width:120px;border-bottom:1px solid #CCC;margin-left:4px;"></span></div>
          <div style="font-size:9px;color:#888;">Date: <span style="display:inline-block;width:80px;border-bottom:1px solid #CCC;margin-left:4px;"></span></div>
        </div>
      </div>
    `
    setTimeout(() => window.print(), 120)
  }

  // ── Topic detail view ──────────────────────────────────────────────────────
  if (currView === 'detail' && selTopic) {
    const lp       = lessonPlans.find((l: any) => l.topic_id === selTopic.id)
    const prog     = progress.find((p: any) => p.topic_id === selTopic.id)
    const ts       = topicStatus(selTopic)
    const topicSubs = topics.filter((t: any) => t.parent_topic_id === selTopic.id)
    const ucfg     = prog?.is_completed ? (UNDERSTAND as any)[prog.understanding] : null

    return (
      <div>
        <button className="bk" onClick={() => setCurrView('list')}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>Back
        </button>
        <div className="h1">{selTopic.title}</div>
        <div className="sub">{selTopic.curriculum_subjects?.name} · {selTopic.curriculum_subjects?.classes?.name}
          {selTopic.planned_start && ` · ${fmt(selTopic.planned_start)}${selTopic.planned_end ? ` → ${fmt(selTopic.planned_end)}` : ''}`}
        </div>

        {/* Status + LP row */}
        <div style={{ display: 'flex', gap: 8, marginTop: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          {ts === 'this-week' && <span style={{ fontSize: 11, fontWeight: 700, background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE', padding: '3px 10px', borderRadius: 7 }}>📅 This Week</span>}
          {ts === 'overdue' && <span style={{ fontSize: 11, fontWeight: 700, background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', padding: '3px 10px', borderRadius: 7 }}>⚠ Overdue</span>}
          {prog?.is_completed && ucfg && <span style={{ fontSize: 11, fontWeight: 700, background: ucfg.bg, color: ucfg.c, border: `1px solid`, padding: '3px 10px', borderRadius: 7 }}>{ucfg.e} {ucfg.label}</span>}

          <button onClick={() => openLp(selTopic)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 8, border: `1.5px solid ${lp?.status === 'submitted' ? '#BBF7D0' : lp?.status === 'draft' ? '#FDE68A' : '#EFEFED'}`, background: lp?.status === 'submitted' ? '#F0FDF4' : lp?.status === 'draft' ? '#FEFCE8' : '#fff', color: lp?.status === 'submitted' ? '#15803D' : lp?.status === 'draft' ? '#A16207' : '#666', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            {lp?.status === 'submitted' ? '✓ Plan Submitted' : lp?.status === 'draft' ? '~ Draft Plan' : 'Add Lesson Plan'}
          </button>
          {lp && (
            <button onClick={() => printLessonPlan(selTopic)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 8, border: '1px solid #EFEFED', background: '#F5F5F3', color: '#444', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
              Print PDF
            </button>
          )}
          {!prog?.is_completed
            ? <button onClick={() => openFb(selTopic)} style={{ marginLeft: 'auto', padding: '5px 12px', borderRadius: 8, border: '1.5px solid #BBF7D0', background: '#F0FDF4', color: '#15803D', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>Mark as Done ✓</button>
            : <button onClick={() => unmarkTopic(selTopic.id)} style={{ marginLeft: 'auto', padding: '5px 12px', borderRadius: 8, border: '1px solid #EFEFED', background: '#F5F5F3', color: '#AAA', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>Unmark</button>}
        </div>

        {/* Description */}
        {selTopic.description && <div style={{ background: '#F8F7F4', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#555', marginBottom: 12 }}>{selTopic.description}</div>}

        {/* Subtopics */}
        {topicSubs.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#AAA', textTransform: 'uppercase' as const, letterSpacing: '.05em', marginBottom: 8 }}>Subtopics ({topicSubs.length})</div>
            {topicSubs.map((st: any) => (
              <div key={st.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', background: '#fff', border: '1px solid #EFEFED', borderRadius: 8, marginBottom: 5 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#D1D5DB', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 500 }}>{st.title}</div>
                  {st.description && <div style={{ fontSize: 10, color: '#AAA' }}>{st.description}</div>}
                </div>
                {st.planned_start && <div style={{ fontSize: 10, color: '#AAA' }}>{fmt(st.planned_start)}{st.planned_end ? ` → ${fmt(st.planned_end)}` : ''}</div>}
              </div>
            ))}
          </div>
        )}

        {/* Materials */}
        <div style={{ fontSize: 10, fontWeight: 700, color: '#AAA', textTransform: 'uppercase' as const, letterSpacing: '.05em', marginBottom: 8 }}>Materials</div>
        {materials.length === 0
          ? <div style={{ color: '#CCC', fontSize: 12, textAlign: 'center', padding: '20px 0' }}>No materials yet</div>
          : <div style={{ background: '#fff', border: '1px solid #EFEFED', borderRadius: 12, overflow: 'hidden' }}>
              {materials.map((m: any) => {
                const cfg = MAT_COLORS[m.type] || MAT_COLORS.link
                return (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid #F8F8F6' }}>
                    <div style={{ width: 28, height: 28, borderRadius: 7, background: cfg.bg, color: cfg.c, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{MAT_ICONS[m.type]}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{m.title}</div>
                      {m.url && <a href={m.url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: '#1D4ED8', textDecoration: 'none' }}>{m.url}</a>}
                      {m.content && <div style={{ fontSize: 11, color: '#888' }}>{m.content}</div>}
                    </div>
                    {m.url && <a href={m.url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: '#1D4ED8', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 6, padding: '3px 8px', textDecoration: 'none', fontWeight: 500 }}>Open</a>}
                  </div>
                )
              })}
            </div>}
      </div>
    )
  }

  // ── List view ──────────────────────────────────────────────────────────────
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <div><div className="h1">Curriculum</div><div className="sub">Lesson planning & progress</div></div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 14 }}>
        {[{ n: thisWk, l: 'This Week', c: '#1D4ED8', bg: '#EFF6FF' }, { n: done, l: 'Done', c: '#15803D', bg: '#F0FDF4' }, { n: overdue, l: 'Overdue', c: '#DC2626', bg: '#FEF2F2' }, { n: pendingPlans, l: 'Plans Pending', c: '#A16207', bg: '#FEFCE8' }].map(s => (
          <div key={s.l} className="stat-card" style={{ background: s.bg, borderColor: 'transparent', textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.c }}>{s.n}</div>
            <div style={{ fontSize: 10, color: s.c, opacity: .75, textTransform: 'uppercase' as const, letterSpacing: '.04em', marginTop: 3 }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        {(['week', 'term', 'all'] as const).map(f => (
          <button key={f} className={`fp ${currFilter === f ? 'on' : ''}`} onClick={() => setCurrFilter(f)}>
            {f === 'week' ? '📅 This Week' : f === 'term' ? '📚 Term' : '🗂 All'}
          </button>
        ))}
        {currFilter === 'term' && terms.map((t: any) => (
          <button key={t.id} className={`fp ${activeTerm?.id === t.id ? 'on' : ''}`} onClick={() => setActiveTerm(t)}>{t.name}</button>
        ))}
      </div>

      {/* Grade + subject filters */}
      {grades.length > 0 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
          <button className={`fp ${!activeGrade ? 'on' : ''}`} onClick={() => { setActiveGrade(null); setActiveSub(null) }}>All Classes</button>
          {grades.map((g: any) => <button key={g.id} className={`fp ${activeGrade === g.id ? 'on' : ''}`} onClick={() => { setActiveGrade(g.id); setActiveSub(null) }}>{g.name}</button>)}
        </div>
      )}
      {activeGrade && gradeSubjects.length > 0 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
          <button className={`fp ${!activeSub ? 'on' : ''}`} onClick={() => setActiveSub(null)}>All Subjects</button>
          {gradeSubjects.map((s: any) => <button key={s.id} className={`fp ${activeSub === s.id ? 'on' : ''}`} onClick={() => setActiveSub(s.id)}>{s.name}</button>)}
        </div>
      )}

      {ft.length === 0
        ? <div className="card"><div className="empty">{currFilter === 'week' ? 'No topics scheduled this week' : 'No topics found'}</div></div>
        : ft.map((t: any) => {
            const ts   = topicStatus(t)
            const lp   = lessonPlans.find((l: any) => l.topic_id === t.id)
            const prog = progress.find((p: any) => p.topic_id === t.id)
            const ucfg = prog?.is_completed ? (UNDERSTAND as any)[prog.understanding] : null

            return (
              <div key={t.id} className="card" style={{ borderLeft: `3px solid ${ts === 'this-week' ? '#3B82F6' : ts === 'overdue' && !prog?.is_completed ? '#EF4444' : prog?.is_completed ? '#22C55E' : '#EFEFED'}` }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A1A', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      {t.title}
                      {ts === 'this-week' && !prog?.is_completed && <span style={{ fontSize: 9, fontWeight: 700, background: '#EFF6FF', color: '#1D4ED8', padding: '1px 6px', borderRadius: 4 }}>This Week</span>}
                      {ts === 'overdue' && !prog?.is_completed && <span style={{ fontSize: 9, fontWeight: 700, background: '#FEF2F2', color: '#DC2626', padding: '1px 6px', borderRadius: 4 }}>Overdue</span>}
                      {prog?.is_completed && ucfg && <span style={{ fontSize: 9, fontWeight: 700, background: ucfg.bg, color: ucfg.c, padding: '1px 6px', borderRadius: 4 }}>{ucfg.e} Done</span>}
                    </div>
                    <div style={{ fontSize: 11, color: '#AAA', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <span>{t.curriculum_subjects?.name}</span>
                      {t.curriculum_subjects?.classes?.name && <span>· {t.curriculum_subjects.classes.name}</span>}
                      {t.planned_start && <span>· {fmt(t.planned_start)}{t.planned_end ? ` → ${fmt(t.planned_end)}` : ''}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0, flexWrap: 'wrap' }}>
                    <button onClick={() => openLp(t)}
                      style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6, border: `1px solid ${lp?.status === 'submitted' ? '#BBF7D0' : lp?.status === 'draft' ? '#FDE68A' : '#EFEFED'}`, background: lp?.status === 'submitted' ? '#F0FDF4' : lp?.status === 'draft' ? '#FEFCE8' : '#F8F8F6', color: lp?.status === 'submitted' ? '#15803D' : lp?.status === 'draft' ? '#A16207' : '#AAA', cursor: 'pointer' }}>
                      {lp?.status === 'submitted' ? '✓ Plan' : lp?.status === 'draft' ? '~ Draft' : '+ Plan'}
                    </button>
                    {!prog?.is_completed
                      ? <button onClick={() => openFb(t)} style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6, border: '1px solid #BBF7D0', background: '#F0FDF4', color: '#15803D', cursor: 'pointer' }}>Mark Done</button>
                      : <button onClick={() => unmarkTopic(t.id)} style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6, border: '1px solid #EFEFED', background: '#F5F5F3', color: '#AAA', cursor: 'pointer' }}>Unmark</button>}
                    <button onClick={() => openDetail(t)} style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6, border: '1px solid #BFDBFE', background: '#EFF6FF', color: '#1D4ED8', cursor: 'pointer' }}>
                      View →
                    </button>
                  </div>
                </div>
                {prog?.feedback_note && <div style={{ marginTop: 8, fontSize: 11, color: '#888', background: '#FAFAF8', borderRadius: 7, padding: '6px 10px' }}>{prog.feedback_note}</div>}
              </div>
            )
          })}

      {/* Feedback modal */}
      {fbModal && (
        <div className="modal-over" onClick={e => { if (e.target === e.currentTarget) setFbModal(null) }}>
          <div className="modal">
            <div className="mhead">
              <div className="mtitle">Mark as Done — {fbModal.title}</div>
              <button onClick={() => setFbModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#AAA' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="mbody">
              <div className="mfield">
                <label>How did learners understand?</label>
                <div style={{ display: 'flex', gap: 7 }}>
                  {(Object.entries(UNDERSTAND) as any).map(([k, v]: any) => (
                    <button key={k} onClick={() => setFbU(k)}
                      style={{ flex: 1, padding: '8px 4px', borderRadius: 8, border: `2px solid ${fbU === k ? v.c : '#EFEFED'}`, background: fbU === k ? v.bg : '#fff', color: fbU === k ? v.c : '#AAA', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
                      {v.e} {v.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mfield">
                <label>Feedback note (optional)</label>
                <textarea className="mfinput" rows={3} value={fbNote} onChange={e => setFbNote(e.target.value)} placeholder="Notes on this lesson…" />
              </div>
              <button className="msave" style={{ background: '#15803D' }} onClick={saveFb} disabled={fbSaving}>{fbSaving ? '…' : 'Mark as Done ✓'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Lesson plan modal */}
      {lpModal && (
        <div className="modal-over" onClick={e => { if (e.target === e.currentTarget) setLpModal(null) }}>
          <div className="modal">
            <div className="mhead">
              <div className="mtitle">Lesson Plan — {lpModal.title}</div>
              <button onClick={() => setLpModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#AAA' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="mbody">
              <div className="mfield"><label>Plan Date</label><input type="date" className="mfinput" style={{ height: 36 }} value={lpDate} onChange={e => setLpDate(e.target.value)} /></div>
              <div className="mfield"><label>Learning Objectives *</label><textarea className="mfinput" rows={3} value={lpObjectives} onChange={e => setLpObjectives(e.target.value)} placeholder="What learners will be able to do…" /></div>
              <div className="mfield"><label>Activities & Methodology</label><textarea className="mfinput" rows={3} value={lpActivities} onChange={e => setLpActivities(e.target.value)} placeholder="How you'll teach this…" /></div>
              <div className="mfield"><label>Resources & Materials</label><textarea className="mfinput" rows={2} value={lpResources} onChange={e => setLpResources(e.target.value)} placeholder="Textbooks, worksheets, videos…" /></div>
              <div className="mfield"><label>Assessment</label><textarea className="mfinput" rows={2} value={lpAssessment} onChange={e => setLpAssessment(e.target.value)} placeholder="How will you assess understanding…" /></div>
              <div className="mfield"><label>Notes</label><textarea className="mfinput" rows={2} value={lpNotes} onChange={e => setLpNotes(e.target.value)} placeholder="Any other notes…" /></div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                <button className="msave" style={{ background: '#888', flex: 1 }} onClick={() => doSaveLp('draft')} disabled={lpSaving}>Save Draft</button>
                <button className="msave" style={{ background: '#1D4ED8', flex: 1, marginBottom: 0 }} onClick={() => doSaveLp('submitted')} disabled={lpSaving}>{lpSaving ? '…' : 'Submit ✓'}</button>
              </div>
              <button onClick={() => printLessonPlan(lpModal)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px', border: '1px solid #EFEFED', borderRadius: 10, background: '#F8F7F4', color: '#555', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                Print / Export PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
