'use client'
import { useEffect, useState } from 'react'
import { createClient } from '../../../lib/supabase'
import { useRouter, useParams } from 'next/navigation'

export default function ClassDetail() {
  const [cls, setCls] = useState<any>(null)
  const [classType, setClassType] = useState<any>(null)
  const [enrolled, setEnrolled] = useState<any[]>([])
  const [allLearners, setAllLearners] = useState<any[]>([])
  const [sessions, setSessions] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'learners' | 'sessions' | 'curriculum'>('learners')
  const [search, setSearch] = useState('')
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [currSubjects, setCurrSubjects] = useState<any[]>([])

  const router = useRouter()
  const params = useParams()
  const classId = params.id as string
  const supabase = createClient()

  useEffect(() => { if (classId) loadData() }, [classId])

  async function loadData() {
    const [{ data: clsData }, { data: enrollData }, { data: learnerData }, { data: sessionData }, { data: subjData }] = await Promise.all([
      supabase.from('classes').select('*').eq('id', classId).single(),
      supabase.from('learner_classes').select('*, learners(id, full_name, is_active)').eq('class_id', classId),
      supabase.from('learners').select('id, full_name').eq('is_active', true).order('full_name'),
      supabase.from('timetable').select('*, users(full_name, display_name)').eq('class_id', classId).order('day_of_week').order('start_time'),
      supabase.from('curriculum_subjects').select('*, curriculum_topics(id, title, track_per_learner, is_active)').eq('class_id', classId).eq('is_active', true).order('order_num'),
    ])
    setCls(clsData)
    setEnrolled(enrollData?.map(e => e.learners).filter((l: any) => l && l.is_active) || [])
    setAllLearners(learnerData || [])
    setSessions(sessionData || [])
    setCurrSubjects(subjData || [])

    if (clsData) {
      const { data: typeData } = await supabase.from('class_types').select('*').eq('name', clsData.class_type).single()
      setClassType(typeData)
    }
  }

  async function addLearner(learnerId: string) {
    setSaving(true)
    await supabase.from('learner_classes').insert({ learner_id: learnerId, class_id: classId, class_type: cls?.class_type })
    await loadData()
    setSaving(false)
  }

  async function removeLearner(learnerId: string) {
    if (!confirm('Remove this learner from the class?')) return
    setSaving(true)
    await supabase.from('learner_classes').delete().eq('learner_id', learnerId).eq('class_id', classId)
    await loadData()
    setSaving(false)
  }

  const enrolledIds = enrolled.map(l => l.id)
  const notEnrolled = allLearners.filter(l => !enrolledIds.includes(l.id))
  const filteredNotEnrolled = notEnrolled.filter(l => l.full_name.toLowerCase().includes(search.toLowerCase()))
  const filteredEnrolled = enrolled.filter(l => l.full_name.toLowerCase().includes(search.toLowerCase()))

  const DAYS = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

  if (!cls) return (
    <main style={{ minHeight: '100vh', background: '#F8F7F4', fontFamily: "'DM Sans', sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#CCC', fontSize: 13 }}>Loading...</div>
    </main>
  )

  const typeColor = classType?.color || '#888'

  return (
    <main style={{ minHeight: '100vh', background: '#F8F7F4', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&family=DM+Serif+Display&display=swap');
        * { box-sizing: border-box; }
        .topbar { background:#fff; border-bottom:1px solid #EFEFED; padding:0 32px; height:56px; display:flex; align-items:center; justify-content:space-between; position:sticky; top:0; z-index:10; }
        .topbar-left { display:flex; align-items:center; gap:12px; }
        .back-btn { display:flex; align-items:center; gap:6px; font-size:13px; color:#999; background:none; border:none; cursor:pointer; padding:6px 10px; border-radius:8px; font-family:'DM Sans',sans-serif; }
        .back-btn:hover { background:#F5F5F3; color:#333; }
        .divider { color:#DDD; }
        .tab-bar { background:#fff; border-bottom:1px solid #EFEFED; padding:0 32px; display:flex; gap:2px; }
        .tab-btn { padding:14px 16px; font-size:13px; font-weight:500; color:#999; background:none; border:none; border-bottom:2px solid transparent; cursor:pointer; font-family:'DM Sans',sans-serif; transition:all 0.15s; display:flex; align-items:center; gap:6px; }
        .tab-btn.active { color:#1A1A1A; border-bottom-color:#1A1A1A; }
        .wrap { max-width:800px; margin:0 auto; padding:28px 32px; }
        .class-hero { background:#fff; border:1px solid #EFEFED; border-radius:14px; padding:20px 24px; margin-bottom:20px; display:flex; align-items:center; justify-content:space-between; }
        .class-hero-left { display:flex; align-items:center; gap:14px; }
        .class-icon { width:44px; height:44px; border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:18px; flex-shrink:0; }
        .class-name { font-family:'DM Serif Display',serif; font-size:20px; color:#1A1A1A; }
        .class-type-badge { font-size:11px; font-weight:500; padding:3px 9px; border-radius:8px; margin-top:4px; display:inline-block; }
        .hero-stats { display:flex; gap:20px; }
        .hero-stat { text-align:center; }
        .hero-stat-n { font-size:20px; font-weight:500; color:#1A1A1A; }
        .hero-stat-l { font-size:10px; color:#AAA; text-transform:uppercase; letter-spacing:0.04em; margin-top:2px; }
        .search-row { display:flex; align-items:center; gap:10px; margin-bottom:16px; }
        .search-input { flex:1; height:38px; border:1px solid #EFEFED; border-radius:9px; padding:0 12px 0 36px; font-size:13px; font-family:'DM Sans',sans-serif; color:#1A1A1A; background:#fff; outline:none; }
        .search-input:focus { border-color:#1A1A1A; }
        .search-input::placeholder { color:#CCC; }
        .search-wrap { position:relative; flex:1; }
        .search-icon { position:absolute; left:11px; top:50%; transform:translateY(-50%); color:#CCC; pointer-events:none; }
        .add-toggle-btn { display:flex; align-items:center; gap:6px; background:#1A1A1A; color:white; border:none; border-radius:9px; padding:8px 14px; font-size:13px; font-weight:500; cursor:pointer; font-family:'DM Sans',sans-serif; white-space:nowrap; }
        .card { background:#fff; border:1px solid #EFEFED; border-radius:14px; overflow:hidden; margin-bottom:12px; }
        .card-head { padding:12px 16px; border-bottom:1px solid #F5F5F3; display:flex; align-items:center; justify-content:space-between; background:#FAFAF8; }
        .card-title { font-size:12px; font-weight:500; color:#AAA; text-transform:uppercase; letter-spacing:0.05em; }
        .learner-row { display:flex; align-items:center; justify-content:space-between; padding:11px 16px; border-bottom:1px solid #F8F8F6; transition:background 0.15s; }
        .learner-row:last-child { border-bottom:none; }
        .learner-row:hover { background:#FAFAF8; }
        .learner-name { font-size:13px; font-weight:500; color:#1A1A1A; }
        .remove-btn { font-size:11px; padding:4px 9px; border-radius:7px; border:1px solid #EFEFED; background:#fff; cursor:pointer; font-family:'DM Sans',sans-serif; color:#CCC; transition:all 0.15s; }
        .remove-btn:hover { background:#FEF2F2; color:#DC2626; border-color:#FECACA; }
        .add-learner-row { display:flex; align-items:center; justify-content:space-between; padding:9px 16px; border-bottom:1px solid #F8F8F6; }
        .add-learner-row:last-child { border-bottom:none; }
        .add-learner-btn { font-size:11px; padding:4px 10px; border-radius:7px; border:1px solid #EFEFED; background:#F0FDF4; color:#15803D; cursor:pointer; font-family:'DM Sans',sans-serif; font-weight:500; transition:all 0.15s; }
        .add-learner-btn:hover { background:#DCFCE7; border-color:#BBF7D0; }
        .add-learner-btn:disabled { opacity:0.5; cursor:not-allowed; }
        .empty { padding:32px; text-align:center; color:#CCC; font-size:13px; }
        .session-row { display:flex; align-items:center; justify-content:space-between; padding:11px 16px; border-bottom:1px solid #F8F8F6; }
        .session-row:last-child { border-bottom:none; }
        .session-name { font-size:13px; font-weight:500; color:#1A1A1A; }
        .session-meta { font-size:11px; color:#AAA; margin-top:2px; }
        .session-time { font-size:12px; font-weight:500; color:#555; background:#F5F5F3; padding:3px 8px; border-radius:7px; }
        .subj-block { border-bottom:1px solid #F5F5F3; }
        .subj-block:last-child { border-bottom:none; }
        .subj-head { padding:12px 16px; display:flex; align-items:center; justify-content:space-between; background:#FAFAF8; }
        .subj-name { font-size:13px; font-weight:500; color:#1A1A1A; }
        .subj-count { font-size:11px; color:#AAA; }
        .topic-row { display:flex; align-items:center; justify-content:space-between; padding:8px 16px 8px 28px; border-bottom:1px solid #F8F8F6; }
        .topic-row:last-child { border-bottom:none; }
        .topic-name { font-size:12px; color:#555; }
        .track-pill { font-size:10px; font-weight:500; padding:2px 7px; border-radius:6px; background:#FDF4FF; color:#7E22CE; border:1px solid #E9D5FF; }
        @media (max-width:768px) {
          .wrap { padding:16px; }
          .hero { flex-direction:column; align-items:flex-start; gap:12px; }
          .hero-stats { flex-wrap:wrap; gap:12px; }
          .topbar { padding:0 16px; }
        }
      `}</style>

      <div className="topbar">
        <div className="topbar-left">
          <button className="back-btn" onClick={() => router.push('/admin/classes')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            Back
          </button>
          <span className="divider">|</span>
          <span style={{ fontSize: 15, fontWeight: 500, color: '#1A1A1A' }}>{cls.name}</span>
        </div>
        <button className="back-btn" onClick={() => router.push('/admin/curriculum')}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
          Curriculum →
        </button>
      </div>

      <div className="tab-bar">
        {[
          { key: 'learners', label: `Learners (${enrolled.length})`, icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg> },
          { key: 'sessions', label: `Timetable (${sessions.length})`, icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
          { key: 'curriculum', label: `Curriculum (${currSubjects.length})`, icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg> },
        ].map(tab => (
          <button key={tab.key} className={`tab-btn ${activeTab === tab.key ? 'active' : ''}`} onClick={() => setActiveTab(tab.key as any)}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <div className="wrap">
        {/* Hero */}
        <div className="class-hero">
          <div className="class-hero-left">
            <div className="class-icon" style={{ background: typeColor + '20', color: typeColor }}>
              {cls.class_type === 'islamic' ? '🕌' : cls.class_type === 'secular' ? '🏫' : '📋'}
            </div>
            <div>
              <div className="class-name">{cls.name}</div>
              <span className="class-type-badge" style={{ background: typeColor + '20', color: typeColor }}>
                {classType?.label || cls.class_type}
              </span>
            </div>
          </div>
          <div className="hero-stats">
            <div className="hero-stat">
              <div className="hero-stat-n">{enrolled.length}</div>
              <div className="hero-stat-l">Learners</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-n">{sessions.length}</div>
              <div className="hero-stat-l">Sessions</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-n">{currSubjects.length}</div>
              <div className="hero-stat-l">Subjects</div>
            </div>
          </div>
        </div>

        {/* LEARNERS TAB */}
        {activeTab === 'learners' && (
          <div>
            <div className="search-row">
              <div className="search-wrap">
                <svg className="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input className="search-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search learners..." />
              </div>
              <button className="add-toggle-btn" onClick={() => setAdding(a => !a)}>
                {adding ? (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    Done
                  </>
                ) : (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Add learners
                  </>
                )}
              </button>
            </div>

            {/* Add learners panel */}
            {adding && (
              <div className="card" style={{ marginBottom: 16, borderColor: '#BBF7D0' }}>
                <div className="card-head">
                  <span className="card-title">Not enrolled — click to add</span>
                  <span style={{ fontSize: 11, color: '#AAA' }}>{filteredNotEnrolled.length} available</span>
                </div>
                {filteredNotEnrolled.length === 0 ? (
                  <div className="empty">{search ? 'No matches' : 'All learners are enrolled'}</div>
                ) : (
                  filteredNotEnrolled.map(l => (
                    <div key={l.id} className="add-learner-row">
                      <span style={{ fontSize: 13, color: '#555' }}>{l.full_name}</span>
                      <button className="add-learner-btn" onClick={() => addLearner(l.id)} disabled={saving}>
                        + Add
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Enrolled */}
            <div className="card">
              <div className="card-head">
                <span className="card-title">Enrolled learners</span>
                <span style={{ fontSize: 11, color: '#AAA' }}>{enrolled.length} total</span>
              </div>
              {filteredEnrolled.length === 0 ? (
                <div className="empty">{enrolled.length === 0 ? 'No learners enrolled yet' : 'No matches'}</div>
              ) : (
                filteredEnrolled.map(l => (
                  <div key={l.id} className="learner-row">
                    <div className="learner-name">{l.full_name}</div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="remove-btn" onClick={() => router.push(`/admin/learners/${l.id}`)}>
                        Profile
                      </button>
                      <button className="remove-btn" onClick={() => removeLearner(l.id)}>
                        Remove
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* SESSIONS TAB */}
        {activeTab === 'sessions' && (
          <div>
            <div className="card">
              <div className="card-head">
                <span className="card-title">Timetable sessions</span>
                <button onClick={() => router.push('/admin/sessions')} style={{ fontSize: 11, color: '#0369A1', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
                  Manage timetable →
                </button>
              </div>
              {sessions.length === 0 ? (
                <div className="empty">No sessions scheduled for this class</div>
              ) : (
                sessions.map(s => (
                  <div key={s.id} className="session-row">
                    <div>
                      <div className="session-name">{s.name}</div>
                      <div className="session-meta">
                        {DAYS[s.day_of_week]} · {s.users?.display_name || s.users?.full_name || 'No teacher'}
                      </div>
                    </div>
                    <span className="session-time">{s.start_time?.slice(0, 5)} – {s.end_time?.slice(0, 5)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* CURRICULUM TAB */}
        {activeTab === 'curriculum' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
              <button onClick={() => router.push('/admin/curriculum')} style={{ fontSize: 12, color: '#0369A1', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", fontWeight: 500 }}>
                Edit in Curriculum Management →
              </button>
            </div>
            {currSubjects.length === 0 ? (
              <div className="card"><div className="empty">No curriculum subjects yet — add them in Curriculum Management</div></div>
            ) : (
              <div className="card">
                {currSubjects.map(subj => (
                  <div key={subj.id} className="subj-block">
                    <div className="subj-head">
                      <div className="subj-name">{subj.name}</div>
                      <span className="subj-count">{subj.curriculum_topics?.filter((t: any) => t.is_active).length || 0} topics</span>
                    </div>
                    {subj.curriculum_topics?.filter((t: any) => t.is_active).map((t: any) => (
                      <div key={t.id} className="topic-row">
                        <span className="topic-name">{t.title}</span>
                        {t.track_per_learner && <span className="track-pill">Per-learner</span>}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}