'use client'
import { useState, useMemo } from 'react'
import { topicStatus, fmt, UNDERSTAND, MAT_COLORS } from '../_types/constants'

const MAT_ICONS: Record<string, any> = {
  video: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>,
  pdf:   <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
  link:  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
  note:  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
}

export function TabCurriculum({ data }: any) {
  const { currSubjects, currTopics, currProgress, currTerms, topicTerms, saveCurrProgress, unmarkCurrProgress, supabase } = data

  const [view, setView]               = useState<'list' | 'detail'>('list')
  const [filter, setFilter]           = useState<'week' | 'term' | 'all'>('week')
  const [activeTerm, setActiveTerm]   = useState<any>(currTerms[0] || null)
  const [activeGrade, setActiveGrade] = useState<string | null>(null)
  const [activeSub, setActiveSub]     = useState<string | null>(null)
  const [selTopic, setSelTopic]       = useState<any>(null)
  const [materials, setMaterials]     = useState<any[]>([])
  const [fbModal, setFbModal]         = useState<any>(null)
  const [fbNote, setFbNote]           = useState('')
  const [fbU, setFbU]                 = useState<'good' | 'mixed' | 'difficult'>('good')
  const [fbSaving, setFbSaving]       = useState(false)

  const grades = useMemo(() => {
    const m = new Map<string, any>()
    currSubjects.forEach((s: any) => { if (s.classes) m.set(s.classes.id, s.classes) })
    return [...m.values()]
  }, [currSubjects])

  const gradeSubjects = useMemo(
    () => activeGrade ? currSubjects.filter((s: any) => s.class_id === activeGrade) : [],
    [currSubjects, activeGrade]
  )

  function filteredTopics() {
    let t = currTopics
    if (activeGrade) t = t.filter((x: any) => x.curriculum_subjects?.class_id === activeGrade)
    if (activeSub)   t = t.filter((x: any) => x.subject_id === activeSub)
    if (filter === 'week') {
      const now = new Date()
      const ws = new Date(now); ws.setDate(now.getDate() - ((now.getDay() + 6) % 7)); ws.setHours(0,0,0,0)
      const we = new Date(ws); we.setDate(ws.getDate() + 6); we.setHours(23,59,59,999)
      t = t.filter((x: any) => {
        if (!x.planned_start) return false
        const s = new Date(x.planned_start), e = x.planned_end ? new Date(x.planned_end) : s
        return s <= we && e >= ws
      })
    } else if (filter === 'term' && activeTerm) {
      const ids = new Set(topicTerms.filter((tt: any) => tt.term_id === activeTerm.id).map((tt: any) => tt.topic_id))
      t = t.filter((x: any) => ids.has(x.id))
    }
    return t
  }

  const ft      = filteredTopics()
  const thisWk  = currTopics.filter((t: any) => topicStatus(t) === 'this-week').length
  const done    = currProgress.filter((p: any) => p.is_completed).length
  const overdue = currTopics.filter((t: any) => topicStatus(t) === 'overdue' && !currProgress.find((p: any) => p.topic_id === t.id && p.is_completed)).length

  async function openDetail(topic: any) {
    setSelTopic(topic); setView('detail')
    const { data: mats } = await supabase.from('curriculum_materials').select('*').eq('topic_id', topic.id).order('order_num')
    setMaterials(mats || [])
  }

  function openFb(topic: any) {
    const ex = currProgress.find((p: any) => p.topic_id === topic.id)
    setFbU(ex?.understanding || 'good'); setFbNote(ex?.feedback_note || ''); setFbModal(topic)
  }

  async function saveFb() {
    if (!fbModal) return
    setFbSaving(true)
    await saveCurrProgress(fbModal.id, { is_completed: true, completed_at: new Date().toISOString(), feedback_note: fbNote.trim() || null, understanding: fbU, taught_date: new Date().toISOString().split('T')[0] })
    setFbModal(null); setFbSaving(false)
  }

  return (
    <div>
      {fbModal && (
        <div className="mov" onClick={e => { if (e.target === e.currentTarget) setFbModal(null) }}>
          <div className="mo">
            <div className="mtit">Lesson Feedback</div>
            <div className="msub">{fbModal.title}</div>
            <div className="mlbl">Class Understanding</div>
            <div className="upills">
              {(['good', 'mixed', 'difficult'] as const).map(u => (
                <button key={u} className={`upill ${u === 'difficult' ? 'diff' : u} ${fbU === u ? 'sel' : ''}`} onClick={() => setFbU(u)}>
                  {u === 'good' ? '✓ Good' : u === 'mixed' ? '~ Mixed' : '✗ Difficult'}
                </button>
              ))}
            </div>
            <div className="mlbl" style={{ marginBottom: 5 }}>Note</div>
            <textarea className="mta" placeholder="What was covered…" value={fbNote} onChange={e => setFbNote(e.target.value)} rows={3} />
            <div className="macts">
              <button className="mcan" onClick={() => setFbModal(null)}>Cancel</button>
              <button className="msave" style={{ background: '#15803D' }} onClick={saveFb} disabled={fbSaving}>{fbSaving ? '…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      {view === 'list' ? (
        <div>
          <div style={{ marginBottom: 14 }}><div className="h1">Islamic Curriculum</div><div className="sub">Topic plan &amp; progress</div></div>
          <div className="s3" style={{ marginBottom: 14 }}>
            <div className="scard"><div className="sn" style={{ color: '#0284C7', fontSize: 18 }}>{thisWk}</div><div className="sl">This Week</div></div>
            <div className="scard"><div className="sn" style={{ color: '#16A34A', fontSize: 18 }}>{done}</div><div className="sl">Completed</div></div>
            <div className="scard"><div className="sn" style={{ color: overdue > 0 ? '#DC2626' : '#AAA', fontSize: 18 }}>{overdue}</div><div className="sl">Overdue</div></div>
          </div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 12 }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: '#AAA', textTransform: 'uppercase', letterSpacing: '.05em', marginRight: 2 }}>Show:</span>
            <button className={`fp ${filter === 'week' ? 'on' : ''}`} onClick={() => setFilter('week')}>This Week</button>
            <button className={`fp ${filter === 'all' ? 'on' : ''}`} onClick={() => setFilter('all')}>All</button>
            {currTerms.map((t: any) => (
              <button key={t.id} className={`fp term ${filter === 'term' && activeTerm?.id === t.id ? 'on' : ''}`} onClick={() => { setFilter('term'); setActiveTerm(t) }}>{t.name}</button>
            ))}
          </div>
          {grades.length > 0 && (
            <div className="card" style={{ marginBottom: 10 }}>
              <div className="gtabs">
                <button className={`gtab ${!activeGrade ? 'on' : ''}`} onClick={() => { setActiveGrade(null); setActiveSub(null) }}>All Classes</button>
                {grades.map((g: any) => <button key={g.id} className={`gtab ${activeGrade === g.id ? 'on' : ''}`} onClick={() => { setActiveGrade(g.id); setActiveSub(null) }}>{g.name}</button>)}
              </div>
              {activeGrade && gradeSubjects.length > 0 && (
                <div className="spills">
                  <button className={`sp ${!activeSub ? 'on' : ''}`} onClick={() => setActiveSub(null)}>All</button>
                  {gradeSubjects.map((s: any) => <button key={s.id} className={`sp ${activeSub === s.id ? 'on' : ''}`} onClick={() => setActiveSub(s.id)}>{s.name}</button>)}
                </div>
              )}
            </div>
          )}
          {ft.length === 0 ? (
            <div style={{ background: '#fff', border: '1px solid #EFEFED', borderRadius: 11, padding: 36, textAlign: 'center' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>{filter === 'week' ? 'No topics planned this week' : 'No topics found'}</div>
              {filter === 'week' && <div style={{ fontSize: 10, color: '#AAA' }}>Switch to "All" to see all topics</div>}
            </div>
          ) : ft.map((t: any) => {
            const p = currProgress.find((x: any) => x.topic_id === t.id)
            const isd = p?.is_completed, st = isd ? 'done' : topicStatus(t)
            return (
              <div key={t.id} className={`tcard ${st === 'this-week' ? 'tw' : st === 'overdue' ? 'ov' : st === 'done' ? 'dn' : ''}`} onClick={() => openDetail(t)}>
                <div className="tcin">
                  <div className="tcdot" style={{ background: isd ? '#16A34A' : st === 'this-week' ? '#0284C7' : st === 'overdue' ? '#DC2626' : '#D1D5DB' }} />
                  <div className="tci">
                    <div className="tctit">{t.title}</div>
                    <div className="tcmeta">
                      <span>{t.curriculum_subjects?.name}</span>
                      {!activeGrade && <span style={{ background: '#F5F5F3', padding: '1px 5px', borderRadius: 3, fontSize: 9 }}>{t.curriculum_subjects?.classes?.name}</span>}
                      {t.planned_start && <span>{fmt(t.planned_start)}{t.planned_end ? ` → ${fmt(t.planned_end)}` : ''}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    {isd && <span className="sc sc-dn">✓ Done</span>}
                    {!isd && st === 'this-week' && <span className="sc sc-tw">This Week</span>}
                    {!isd && st === 'overdue' && <span className="sc sc-ov">Overdue</span>}
                    {!isd && st === 'upcoming' && <span className="sc sc-up">Planned</span>}
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#DDD" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : selTopic && (
        <div>
          <button className="bk" onClick={() => { setView('list'); setSelTopic(null) }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>Back
          </button>
          <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 18, color: '#1A1A1A', marginBottom: 2 }}>{selTopic.title}</div>
          <div style={{ fontSize: 11, color: '#AAA', marginBottom: 12 }}>{selTopic.curriculum_subjects?.name} · {selTopic.curriculum_subjects?.classes?.name}</div>
          {selTopic.planned_start && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, padding: '8px 11px', marginBottom: 14, fontSize: 11, color: '#15803D', fontWeight: 600, flexWrap: 'wrap' }}>
              📅 <strong>{fmt(selTopic.planned_start)}</strong>{selTopic.planned_end && <> → <strong>{fmt(selTopic.planned_end)}</strong></>}
            </div>
          )}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 9, fontWeight: 800, color: '#AAA', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 9 }}>Materials {materials.length > 0 && `(${materials.length})`}</div>
            {materials.length === 0
              ? <div style={{ border: '1px solid #F0F0EE', borderRadius: 8, padding: 16, textAlign: 'center', color: '#CCC', fontSize: 11 }}>No materials added</div>
              : materials.map((m: any) => {
                  const cfg = MAT_COLORS[m.type] || MAT_COLORS.link
                  return (
                    <div key={m.id} className="mitem">
                      <div className="mico" style={{ background: cfg.bg, color: cfg.c }}>{MAT_ICONS[m.type]}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 500, color: '#1A1A1A' }}>{m.title}</div>
                        {m.url && <div style={{ fontSize: 10, color: '#0369A1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.url}</div>}
                        {m.content && <div style={{ fontSize: 10, color: '#888', marginTop: 1 }}>{m.content}</div>}
                      </div>
                      {m.url && <a href={m.url} target="_blank" rel="noreferrer" className="olink">Open ↗</a>}
                    </div>
                  )
                })}
          </div>
          {(() => {
            const p = currProgress.find((x: any) => x.topic_id === selTopic.id)
            const isc = p?.is_completed
            const ucfg = UNDERSTAND[p?.understanding as keyof typeof UNDERSTAND]
            return (
              <div>
                {isc && (
                  <div className="fbox">
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#15803D', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                      Completed — {fmt(p.taught_date)}
                    </div>
                    {ucfg && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 5, background: ucfg.bg, color: ucfg.c }}>{ucfg.e} {ucfg.label}</span>}
                    {p.feedback_note && <div style={{ fontSize: 11, color: '#555', marginTop: 6, lineHeight: 1.5 }}>{p.feedback_note}</div>}
                  </div>
                )}
                <div className="dacts">
                  {!isc ? (
                    <button className="act" style={{ background: '#15803D', color: '#fff' }} onClick={() => openFb(selTopic)}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>Mark as Taught
                    </button>
                  ) : (
                    <>
                      <button className="act" style={{ background: '#7E22CE', color: '#fff' }} onClick={() => openFb(selTopic)}>Update</button>
                      <button className="act" style={{ background: '#F5F5F3', color: '#666', border: '1px solid #EFEFED' }} onClick={() => unmarkCurrProgress(selTopic.id)}>Unmark</button>
                    </>
                  )}
                </div>
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}
