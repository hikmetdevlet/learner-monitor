'use client'
import { useEffect, useState } from 'react'
import { createClient } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

export default function IslamicAdmin() {
  const [teachers, setTeachers] = useState<any[]>([])
  const [classes, setClasses] = useState<any[]>([])
  const [assignments, setAssignments] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'dashboard' | 'assign' | 'progress'>('dashboard')

  const [currSubjects, setCurrSubjects] = useState<any[]>([])
  const [selectedSubject, setSelectedSubject] = useState<any>(null)
  const [selectedClass, setSelectedClass] = useState<any>(null)
  const [progressTopics, setProgressTopics] = useState<any[]>([])
  const [progressLearners, setProgressLearners] = useState<any[]>([])
  const [progressData, setProgressData] = useState<any[]>([])

  const [dashData, setDashData] = useState<any[]>([])
  const [dashLoading, setDashLoading] = useState(true)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const [{ data: teacherData }, { data: classData }, { data: assignData }] = await Promise.all([
      supabase.from('users').select('*').eq('role', 'islamic_teacher').order('full_name'),
      supabase.from('classes').select('*').eq('class_type', 'islamic').order('name'),
      supabase.from('islamic_teacher_classes').select('*, users(full_name, display_name), classes(name)'),
    ])
    setTeachers(teacherData || [])
    setClasses(classData || [])
    setAssignments(assignData || [])
    await loadDashboard(classData || [], assignData || [])
    await loadCurrSubjects(classData || [])
  }

  async function loadCurrSubjects(classList: any[]) {
    if (classList.length === 0) return
    const classIds = classList.map(c => c.id)
    const { data } = await supabase
      .from('curriculum_subjects').select('*')
      .in('class_id', classIds).eq('is_active', true).order('order_num')
    setCurrSubjects(data || [])
  }

  async function loadDashboard(classList: any[], assignList: any[]) {
    setDashLoading(true)
    const result = []
    for (const cls of classList) {
      const { data: lcData } = await supabase
        .from('learner_classes').select('*, learners(id, full_name)').eq('class_id', cls.id)
      const learnerList = lcData?.map((lc: any) => lc.learners).filter(Boolean) || []
      const assignedTeachers = assignList.filter(a => a.class_id === cls.id)

      let totalAtt = 0, presentAtt = 0
      for (const l of learnerList) {
        const { data: attData } = await supabase.from('attendance').select('status').eq('learner_id', l.id)
        totalAtt += attData?.length || 0
        presentAtt += attData?.filter((a: any) => a.status === 'present' || a.status === 'late').length || 0
      }
      const attPct = totalAtt > 0 ? Math.round((presentAtt / totalAtt) * 100) : 0

      const { data: subjData } = await supabase
        .from('curriculum_subjects').select('id, name').eq('class_id', cls.id).eq('is_active', true)

      let totalTracked = 0, totalCompleted = 0
      const subjectProgress = []
      for (const subj of (subjData || [])) {
        const { data: topicData } = await supabase
          .from('curriculum_topics').select('id, title')
          .eq('subject_id', subj.id).eq('is_active', true).eq('track_per_learner', true)
        if (!topicData || topicData.length === 0) continue
        const topicIds = topicData.map((t: any) => t.id)
        const possible = topicIds.length * learnerList.length
        const { data: progData } = await supabase
          .from('learner_topic_progress').select('*')
          .in('topic_id', topicIds).eq('completed', true)
        const completed = progData?.length || 0
        totalTracked += possible
        totalCompleted += completed
        const pct = possible > 0 ? Math.round((completed / possible) * 100) : 0
        subjectProgress.push({ subj, topicCount: topicIds.length, completed, possible, pct })
      }
      const topicPct = totalTracked > 0 ? Math.round((totalCompleted / totalTracked) * 100) : 0

      const learnerStats = []
      for (const l of learnerList) {
        const { data: lAttData } = await supabase.from('attendance').select('status').eq('learner_id', l.id)
        const lTotal = lAttData?.length || 0
        const lPresent = lAttData?.filter((a: any) => a.status === 'present' || a.status === 'late').length || 0
        const lAttPct = lTotal > 0 ? Math.round((lPresent / lTotal) * 100) : 0

        let lTopicDone = 0, lTopicTotal = 0
        for (const subj of subjectProgress) {
          const { data: topicIds } = await supabase
            .from('curriculum_topics').select('id')
            .eq('subject_id', subj.subj.id).eq('is_active', true).eq('track_per_learner', true)
          if (!topicIds) continue
          lTopicTotal += topicIds.length
          const { data: lProg } = await supabase
            .from('learner_topic_progress').select('*')
            .in('topic_id', topicIds.map((t: any) => t.id))
            .eq('learner_id', l.id).eq('completed', true)
          lTopicDone += lProg?.length || 0
        }
        const lTopicPct = lTopicTotal > 0 ? Math.round((lTopicDone / lTopicTotal) * 100) : 0
        learnerStats.push({ learner: l, attPct: lAttPct, topicPct: lTopicPct, topicDone: lTopicDone, topicTotal: lTopicTotal })
      }

      result.push({ cls, learnerList, assignedTeachers, attPct, topicPct, subjectProgress, learnerStats, totalAtt, presentAtt })
    }
    setDashData(result)
    setDashLoading(false)
  }

  async function loadProgress(subject: any, cls: any) {
    setSelectedSubject(subject)
    setSelectedClass(cls)
    const { data: lcData } = await supabase.from('learner_classes').select('*, learners(id, full_name)').eq('class_id', cls.id)
    const learnerList = lcData?.map((lc: any) => lc.learners).filter(Boolean) || []
    setProgressLearners(learnerList)
    const { data: topicData } = await supabase
      .from('curriculum_topics').select('*')
      .eq('subject_id', subject.id).eq('is_active', true).eq('track_per_learner', true).order('order_num')
    setProgressTopics(topicData || [])
    if (topicData && topicData.length > 0 && learnerList.length > 0) {
      const { data } = await supabase.from('learner_topic_progress').select('*')
        .in('topic_id', topicData.map((t: any) => t.id))
        .in('learner_id', learnerList.map((l: any) => l.id))
      setProgressData(data || [])
    } else {
      setProgressData([])
    }
  }

  function isAssigned(teacherId: string, classId: string) {
    return assignments.some(a => a.teacher_id === teacherId && a.class_id === classId)
  }

  async function toggleAssignment(teacherId: string, classId: string) {
    setSaving(true)
    const existing = assignments.find(a => a.teacher_id === teacherId && a.class_id === classId)
    if (existing) {
      await supabase.from('islamic_teacher_classes').delete().eq('id', existing.id)
    } else {
      await supabase.from('islamic_teacher_classes').insert({ teacher_id: teacherId, class_id: classId })
    }
    loadData()
    setSaving(false)
  }

  function getP(learnerId: string, topicId: string) {
    return progressData.find(p => p.learner_id === learnerId && p.topic_id === topicId)
  }

  return (
    <main style={{ minHeight: '100vh', background: '#F8F7F4', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&family=DM+Serif+Display&display=swap');
        * { box-sizing: border-box; }
        .topbar { background:#fff; border-bottom:1px solid #EFEFED; padding:0 32px; height:56px; display:flex; align-items:center; justify-content:space-between; position:sticky; top:0; z-index:10; }
        .topbar-left { display:flex; align-items:center; gap:12px; }
        .back-btn { display:flex; align-items:center; gap:6px; font-size:13px; color:#999; background:none; border:none; cursor:pointer; padding:6px 10px; border-radius:8px; font-family:'DM Sans',sans-serif; }
        .back-btn:hover { background:#F5F5F3; color:#333; }
        .page-title { font-size:15px; font-weight:500; color:#1A1A1A; }
        .divider { color:#DDD; }
        .curriculum-btn { display:flex; align-items:center; gap:6px; background:#F0FDF4; color:#15803D; border:1px solid #BBF7D0; border-radius:9px; padding:7px 14px; font-size:13px; font-weight:500; cursor:pointer; font-family:'DM Sans',sans-serif; }
        .curriculum-btn:hover { background:#DCFCE7; }
        .tab-bar { background:#fff; border-bottom:1px solid #EFEFED; padding:0 32px; display:flex; gap:2px; overflow-x:auto; }
        .tab-btn { padding:14px 16px; font-size:13px; font-weight:500; color:#999; background:none; border:none; border-bottom:2px solid transparent; cursor:pointer; font-family:'DM Sans',sans-serif; transition:all 0.15s; display:flex; align-items:center; gap:6px; white-space:nowrap; }
        .tab-btn.active { color:#15803D; border-bottom-color:#15803D; }
        .wrap { max-width:1100px; margin:0 auto; padding:28px 32px; }
        .empty { padding:40px; text-align:center; color:#CCC; font-size:13px; }
        .info-box { background:#F0F9FF; border:1px solid #BFDBFE; border-radius:10px; padding:12px 16px; margin-bottom:20px; font-size:12px; color:#1D4ED8; display:flex; align-items:center; gap:8px; }
        .card { background:#fff; border:1px solid #EFEFED; border-radius:14px; overflow:hidden; margin-bottom:16px; }
        .card-head { padding:14px 20px; border-bottom:1px solid #F5F5F3; display:flex; align-items:center; justify-content:space-between; }
        .card-title { font-size:13px; font-weight:500; color:#1A1A1A; }
        .card-sub { font-size:11px; color:#AAA; }
        .teacher-block { border-bottom:1px solid #F5F5F3; }
        .teacher-block:last-child { border-bottom:none; }
        .teacher-head { padding:12px 20px; background:#FAFAF8; display:flex; align-items:center; gap:10px; }
        .teacher-avatar { width:30px; height:30px; border-radius:50%; background:#F0FDF4; color:#15803D; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:500; flex-shrink:0; }
        .teacher-name { font-size:13px; font-weight:500; color:#1A1A1A; }
        .teacher-email { font-size:11px; color:#AAA; }
        .class-grid { display:flex; flex-wrap:wrap; gap:8px; padding:12px 20px; }
        .class-chip { display:flex; align-items:center; gap:6px; padding:6px 12px; border-radius:9px; border:1.5px solid #EFEFED; cursor:pointer; font-size:12px; font-weight:500; transition:all 0.15s; font-family:'DM Sans',sans-serif; background:#fff; }
        .class-chip:hover { border-color:#BBF7D0; background:#F0FDF4; }
        .class-chip.assigned { border-color:#15803D; background:#F0FDF4; color:#15803D; }
        .check-icon { width:14px; height:14px; }
        .progress-controls { display:flex; gap:10px; margin-bottom:16px; flex-wrap:wrap; }
        .ctrl-select { height:36px; border:1px solid #EFEFED; border-radius:8px; padding:0 12px; font-size:13px; font-family:'DM Sans',sans-serif; color:#1A1A1A; background:#fff; outline:none; min-width:200px; }
        .ctrl-select:focus { border-color:#15803D; }
        .overall-stats { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin-bottom:20px; }
        .stat-mini { background:#fff; border:1px solid #EFEFED; border-radius:12px; padding:14px; text-align:center; }
        .stat-n { font-size:22px; font-weight:500; }
        .stat-l { font-size:10px; color:#AAA; margin-top:3px; text-transform:uppercase; letter-spacing:0.04em; }
        .progress-table { background:#fff; border:1px solid #EFEFED; border-radius:12px; overflow:hidden; overflow-x:auto; }
        .tbl-head { display:flex; background:#FAFAF8; border-bottom:1px solid #EFEFED; min-width:max-content; }
        .th-name { padding:10px 16px; font-size:10px; font-weight:500; color:#AAA; text-transform:uppercase; letter-spacing:0.05em; min-width:160px; flex-shrink:0; }
        .th-topic { padding:10px 8px; font-size:10px; font-weight:500; color:#15803D; text-transform:uppercase; letter-spacing:0.04em; min-width:72px; text-align:center; }
        .th-pct { padding:10px 12px; font-size:10px; font-weight:500; color:#AAA; text-transform:uppercase; min-width:50px; text-align:center; }
        .tbl-row { display:flex; border-bottom:1px solid #F8F8F6; align-items:center; min-width:max-content; }
        .tbl-row:last-child { border-bottom:none; }
        .td-name { padding:10px 16px; font-size:13px; font-weight:500; color:#1A1A1A; min-width:160px; flex-shrink:0; }
        .td-topic { padding:10px 8px; min-width:72px; text-align:center; }
        .td-pct { padding:10px 12px; min-width:50px; text-align:center; font-size:12px; font-weight:500; }
        .tick { width:22px; height:22px; border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto; font-size:11px; }
        .tick.done { background:#F0FDF4; color:#15803D; }
        .tick.not { background:#F5F5F3; color:#CCC; }
        .no-topics-msg { padding:16px; background:#FEFCE8; border:1px solid #FDE68A; border-radius:10px; font-size:12px; color:#A16207; margin-bottom:16px; }
      `}</style>

      <div className="topbar">
        <div className="topbar-left">
          <button className="back-btn" onClick={() => router.push('/admin')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            Back
          </button>
          <span className="divider">|</span>
          <span className="page-title">Islamic Education</span>
        </div>
        <button className="curriculum-btn" onClick={() => router.push('/admin/curriculum')}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
          Manage Subjects & Topics →
        </button>
      </div>

      <div className="tab-bar">
        {[
          { key: 'dashboard', label: 'Dashboard', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> },
          { key: 'assign', label: 'Teacher Assignment', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
          { key: 'progress', label: 'Progress Report', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> },
        ].map(tab => (
          <button key={tab.key} className={`tab-btn ${activeTab === tab.key ? 'active' : ''}`} onClick={() => setActiveTab(tab.key as any)}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <div className="wrap">

        {/* DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div>
            {dashLoading ? (
              <div className="empty">Loading...</div>
            ) : dashData.length === 0 ? (
              <div className="card"><div className="empty">No Islamic classes yet</div></div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
                  {[
                    { n: classes.length, l: 'Classes', color: '#15803D' },
                    { n: dashData.reduce((a, d) => a + d.learnerList.length, 0), l: 'Total learners', color: '#1D4ED8' },
                    { n: teachers.length, l: 'Islamic teachers', color: '#7E22CE' },
                    { n: dashData.length > 0 ? Math.round(dashData.reduce((a, d) => a + d.attPct, 0) / dashData.length) + '%' : '—', l: 'Avg attendance', color: '#C2410C' },
                  ].map((s, i) => (
                    <div key={i} className="stat-mini">
                      <div className="stat-n" style={{ color: s.color }}>{s.n}</div>
                      <div className="stat-l">{s.l}</div>
                    </div>
                  ))}
                </div>
                {dashData.map(d => (
                  <ClassDashCard
                    key={d.cls.id}
                    d={d}
                    onViewProgress={(subj: any) => {
                      setSelectedSubject(subj)
                      setSelectedClass(d.cls)
                      loadProgress(subj, d.cls)
                      setActiveTab('progress')
                    }}
                  />
                ))}
              </>
            )}
          </div>
        )}

        {/* TEACHER ASSIGNMENT */}
        {activeTab === 'assign' && (
          <div>
            <div className="info-box">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              Assign Islamic Teachers to classes. Teachers will only see their assigned classes in their dashboard.
            </div>
            {teachers.length === 0 ? (
              <div className="card"><div className="empty">No Islamic Teachers yet — add them from Staff Management</div></div>
            ) : (
              <div className="card">
                <div className="card-head">
                  <span className="card-title">Class assignments</span>
                  <span className="card-sub">{assignments.length} total assignments</span>
                </div>
                {teachers.map(t => (
                  <div key={t.id} className="teacher-block">
                    <div className="teacher-head">
                      <div className="teacher-avatar">{(t.display_name || t.full_name).charAt(0)}</div>
                      <div>
                        <div className="teacher-name">{t.display_name || t.full_name}</div>
                        <div className="teacher-email">{t.email}</div>
                      </div>
                    </div>
                    {classes.length === 0 ? (
                      <div style={{ padding: '12px 20px', fontSize: 12, color: '#AAA' }}>No Islamic classes yet</div>
                    ) : (
                      <div className="class-grid">
                        {classes.map(cls => {
                          const assigned = isAssigned(t.id, cls.id)
                          return (
                            <button key={cls.id} className={`class-chip ${assigned ? 'assigned' : ''}`}
                              onClick={() => toggleAssignment(t.id, cls.id)} disabled={saving}>
                              {assigned ? (
                                <svg className="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                              ) : (
                                <svg className="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                              )}
                              {cls.name}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* PROGRESS REPORT */}
        {activeTab === 'progress' && (
          <div>
            <div className="progress-controls">
              <select className="ctrl-select" value={selectedClass?.id || ''} onChange={e => {
                const cls = classes.find(c => c.id === e.target.value)
                setSelectedClass(cls || null)
                if (cls && selectedSubject) loadProgress(selectedSubject, cls)
              }}>
                <option value="">— Select class —</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select className="ctrl-select" value={selectedSubject?.id || ''} onChange={e => {
                const subj = currSubjects.find(s => s.id === e.target.value)
                setSelectedSubject(subj || null)
                if (subj && selectedClass) loadProgress(subj, selectedClass)
              }}>
                <option value="">— Select subject —</option>
                {currSubjects.filter(s => !selectedClass || s.class_id === selectedClass?.id).map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {!selectedClass || !selectedSubject ? (
              <div className="card"><div className="empty">Select a class and subject to view progress</div></div>
            ) : progressTopics.length === 0 ? (
              <div className="no-topics-msg">
                No per-learner tracked topics in this subject. Go to Curriculum Management → select this subject → enable "Track learners" on topics.
              </div>
            ) : progressLearners.length === 0 ? (
              <div className="card"><div className="empty">No learners in this class</div></div>
            ) : (
              <>
                <div className="overall-stats">
                  {(() => {
                    const totalPossible = progressTopics.length * progressLearners.length
                    const totalDone = progressData.filter(p => p.completed).length
                    const pct = totalPossible > 0 ? Math.round((totalDone / totalPossible) * 100) : 0
                    const fullyDone = progressLearners.filter(l =>
                      progressTopics.every(t => progressData.find(p => p.learner_id === l.id && p.topic_id === t.id && p.completed))
                    ).length
                    return (
                      <>
                        <div className="stat-mini"><div className="stat-n" style={{ color: '#15803D' }}>{pct}%</div><div className="stat-l">Overall completion</div></div>
                        <div className="stat-mini"><div className="stat-n">{totalDone}/{totalPossible}</div><div className="stat-l">Topics completed</div></div>
                        <div className="stat-mini"><div className="stat-n" style={{ color: fullyDone > 0 ? '#15803D' : '#AAA' }}>{fullyDone}</div><div className="stat-l">Fully completed</div></div>
                      </>
                    )
                  })()}
                </div>
                <div className="progress-table">
                  <div className="tbl-head">
                    <div className="th-name">Learner</div>
                    {progressTopics.map(t => (
                      <div key={t.id} className="th-topic" title={t.title}>
                        <span style={{ display: 'block', maxWidth: 64, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: '0 auto' }}>{t.title}</span>
                      </div>
                    ))}
                    <div className="th-pct">%</div>
                  </div>
                  {progressLearners.map(l => {
                    const done = progressTopics.filter(t => getP(l.id, t.id)?.completed).length
                    const pct = progressTopics.length > 0 ? Math.round((done / progressTopics.length) * 100) : 0
                    return (
                      <div key={l.id} className="tbl-row">
                        <div className="td-name">{l.full_name}</div>
                        {progressTopics.map(t => (
                          <div key={t.id} className="td-topic">
                            <div className={`tick ${getP(l.id, t.id)?.completed ? 'done' : 'not'}`}>
                              {getP(l.id, t.id)?.completed ? '✓' : '○'}
                            </div>
                          </div>
                        ))}
                        <div className="td-pct" style={{ color: pct >= 70 ? '#15803D' : pct >= 40 ? '#A16207' : '#DC2626' }}>{pct}%</div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </main>
  )
}

function ClassDashCard({ d, onViewProgress }: any) {
  const [expanded, setExpanded] = useState(false)
  const sorted = [...d.learnerStats].sort((a: any, b: any) => b.topicPct - a.topicPct)
  const top5 = sorted.slice(0, 5)
  const bottom5 = sorted.length > 5 ? sorted.slice(-5).reverse() : []
  const hasTopicData = d.learnerStats.some((ls: any) => ls.topicTotal > 0)

  return (
    <div style={{ background: '#fff', border: '1px solid #EFEFED', borderRadius: 14, overflow: 'hidden', marginBottom: 16 }}>
      {/* Header */}
      <div style={{ padding: '16px 24px', background: '#FAFAF8', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', borderBottom: expanded ? '1px solid #F0F0EE' : 'none' }} onClick={() => setExpanded(e => !e)}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 500, color: '#1A1A1A', fontFamily: "'DM Serif Display',serif" }}>{d.cls.name}</div>
          <div style={{ fontSize: 11, color: '#AAA', marginTop: 3, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span>Islamic class</span>
            <span style={{ color: '#DDD' }}>·</span>
            <span>{d.learnerList.length} learners</span>
            <span style={{ color: '#DDD' }}>·</span>
            <span>{d.assignedTeachers.length > 0
              ? d.assignedTeachers.map((a: any) => a.users?.display_name || a.users?.full_name).join(', ')
              : <span style={{ color: '#DC2626' }}>No teacher assigned</span>
            }</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 500, color: d.attPct >= 70 ? '#15803D' : d.attPct >= 50 ? '#A16207' : '#DC2626' }}>{d.attPct}%</div>
            <div style={{ fontSize: 10, color: '#AAA', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>Attendance</div>
          </div>
          <div style={{ width: 1, height: 32, background: '#EFEFED' }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 500, color: d.topicPct >= 70 ? '#15803D' : d.topicPct >= 40 ? '#A16207' : '#AAA' }}>
              {d.subjectProgress.length > 0 ? `${d.topicPct}%` : '—'}
            </div>
            <div style={{ fontSize: 10, color: '#AAA', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>Topics</div>
          </div>
          <div style={{ width: 1, height: 32, background: '#EFEFED' }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 500, color: '#1D4ED8' }}>{d.learnerList.length}</div>
            <div style={{ fontSize: 10, color: '#AAA', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>Learners</div>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#AAA" strokeWidth="2" style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', marginLeft: 8 }}><polyline points="6 9 12 15 18 9"/></svg>
        </div>
      </div>

      {expanded && (
        <div style={{ padding: '20px 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>

            {/* Kolon 1: Subject progress */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 500, color: '#AAA', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                Topic completion
              </div>
              {d.subjectProgress.length === 0 ? (
                <div style={{ fontSize: 12, color: '#CCC', padding: '8px 0' }}>No tracked topics yet</div>
              ) : (
                d.subjectProgress.map((sp: any) => (
                  <div key={sp.subj.id} style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: 12, fontWeight: 500, color: '#333' }}>{sp.subj.name}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 11, color: '#AAA' }}>{sp.completed}/{sp.possible}</span>
                        <span style={{ fontSize: 12, fontWeight: 500, color: sp.pct >= 70 ? '#15803D' : sp.pct >= 40 ? '#A16207' : '#DC2626' }}>{sp.pct}%</span>
                        <button onClick={() => onViewProgress(sp.subj)} style={{ fontSize: 10, color: '#0369A1', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 5, padding: '1px 7px', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", fontWeight: 500 }}>
                          View →
                        </button>
                      </div>
                    </div>
                    <div style={{ width: '100%', height: 6, background: '#F0F0EE', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${sp.pct}%`, height: '100%', borderRadius: 3, background: sp.pct >= 70 ? '#22C55E' : sp.pct >= 40 ? '#EAB308' : '#EF4444', transition: 'width 0.4s' }} />
                    </div>
                  </div>
                ))
              )}

              {/* Attendance breakdown */}
              <div style={{ fontSize: 11, fontWeight: 500, color: '#AAA', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10, marginTop: 20, display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                Attendance breakdown
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[
                  { label: 'Good ≥70%', count: d.learnerStats.filter((ls: any) => ls.attPct >= 70).length, color: '#15803D', bg: '#F0FDF4' },
                  { label: 'At risk 50–70%', count: d.learnerStats.filter((ls: any) => ls.attPct >= 50 && ls.attPct < 70).length, color: '#A16207', bg: '#FEFCE8' },
                  { label: 'Critical <50%', count: d.learnerStats.filter((ls: any) => ls.attPct < 50).length, color: '#DC2626', bg: '#FEF2F2' },
                ].map(s => (
                  <div key={s.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: s.bg, borderRadius: 9, padding: '8px 12px' }}>
                    <span style={{ fontSize: 12, color: s.color, fontWeight: 500 }}>{s.label}</span>
                    <span style={{ fontSize: 16, fontWeight: 500, color: s.color }}>{s.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Kolon 2: Top performers */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 500, color: '#15803D', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#15803D" strokeWidth="2"><polyline points="18 15 12 9 6 15"/></svg>
                Top performers
              </div>
              {top5.length === 0 ? (
                <div style={{ fontSize: 12, color: '#CCC' }}>No data yet</div>
              ) : (
                top5.map((ls: any, i: number) => (
                  <div key={ls.learner.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 9, background: i === 0 ? '#F0FDF4' : '#FAFAF8', marginBottom: 5, border: i === 0 ? '1px solid #BBF7D0' : '1px solid transparent' }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: i === 0 ? '#22C55E' : i === 1 ? '#86EFAC' : '#E5E5E5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600, color: i < 2 ? 'white' : '#888', flexShrink: 0 }}>{i + 1}</div>
                    <span style={{ fontSize: 12, fontWeight: 500, color: '#1A1A1A', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ls.learner.full_name}</span>
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      {ls.topicTotal > 0 && <span style={{ fontSize: 10, fontWeight: 500, padding: '2px 6px', borderRadius: 5, background: ls.topicPct >= 70 ? '#F0FDF4' : '#F5F5F3', color: ls.topicPct >= 70 ? '#15803D' : '#888' }}>{ls.topicDone}/{ls.topicTotal}</span>}
                      <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 5, background: ls.attPct >= 70 ? '#F0FDF4' : '#FEF2F2', color: ls.attPct >= 70 ? '#15803D' : '#DC2626' }}>{ls.attPct}% att</span>
                    </div>
                  </div>
                ))
              )}

              {/* Teachers */}
              <div style={{ fontSize: 11, fontWeight: 500, color: '#AAA', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10, marginTop: 20, display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                Assigned teachers
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {d.assignedTeachers.length === 0 ? (
                  <div style={{ fontSize: 12, background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', padding: '8px 12px', borderRadius: 8 }}>⚠ No teacher assigned</div>
                ) : (
                  d.assignedTeachers.map((a: any) => (
                    <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 9, padding: '8px 12px' }}>
                      <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#BBF7D0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: '#15803D', flexShrink: 0 }}>
                        {(a.users?.display_name || a.users?.full_name || '?').charAt(0)}
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 500, color: '#15803D' }}>{a.users?.display_name || a.users?.full_name}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Kolon 3: Need attention */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 500, color: '#DC2626', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2"><polyline points="18 9 12 15 6 9"/></svg>
                Need attention
              </div>
              {bottom5.length === 0 ? (
                <div style={{ fontSize: 12, color: '#CCC' }}>Not enough data</div>
              ) : (
                bottom5.map((ls: any, i: number) => (
                  <div key={ls.learner.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 9, background: i === 0 ? '#FEF2F2' : '#FAFAL8', marginBottom: 5, border: i === 0 ? '1px solid #FECACA' : '1px solid transparent' }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: i === 0 ? '#EF4444' : '#FCA5A5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600, color: 'white', flexShrink: 0 }}>!</div>
                    <span style={{ fontSize: 12, fontWeight: 500, color: '#1A1A1A', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ls.learner.full_name}</span>
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      {ls.topicTotal > 0 && <span style={{ fontSize: 10, fontWeight: 500, padding: '2px 6px', borderRadius: 5, background: '#FEF2F2', color: '#DC2626' }}>{ls.topicDone}/{ls.topicTotal}</span>}
                      <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 5, background: ls.attPct >= 70 ? '#F0FDF4' : '#FEF2F2', color: ls.attPct >= 70 ? '#15803D' : '#DC2626' }}>{ls.attPct}% att</span>
                    </div>
                  </div>
                ))
              )}

              {/* All learners attendance if no topic data */}
              {!hasTopicData && (
                <>
                  <div style={{ fontSize: 11, fontWeight: 500, color: '#AAA', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10, marginTop: 16 }}>All learners</div>
                  {d.learnerStats.map((ls: any) => (
                    <div key={ls.learner.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #F8F8F6' }}>
                      <span style={{ fontSize: 12, fontWeight: 500, color: '#1A1A1A' }}>{ls.learner.full_name}</span>
                      <span style={{ fontSize: 10, fontWeight: 500, padding: '2px 8px', borderRadius: 6, background: ls.attPct >= 70 ? '#F0FDF4' : '#FEF2F2', color: ls.attPct >= 70 ? '#15803D' : '#DC2626' }}>{ls.attPct}% att</span>
                    </div>
                  ))}
                </>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  )
}