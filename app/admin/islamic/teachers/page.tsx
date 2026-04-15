'use client'
import { useEffect, useState } from 'react'
import { createClient } from '../../../lib/supabase'
import { useRouter } from 'next/navigation'

export default function IslamicTeacherAssignment() {
  const [teachers, setTeachers] = useState<any[]>([])
  const [classes, setClasses] = useState<any[]>([])
  const [assignments, setAssignments] = useState<any[]>([])
  const [selectedTeacher, setSelectedTeacher] = useState<any>(null)
  const [saving, setSaving] = useState(false)

  // Progress view state
  const [showProgress, setShowProgress] = useState(false)
  const [progressClass, setProgressClass] = useState<any>(null)
  const [progressSubject, setProgressSubject] = useState<any>(null)
  const [currSubjects, setCurrSubjects] = useState<any[]>([])
  const [progressTopics, setProgressTopics] = useState<any[]>([])
  const [progressLearners, setProgressLearners] = useState<any[]>([])
  const [progressData, setProgressData] = useState<any[]>([])

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: teacherData } = await supabase
      .from('users').select('*').eq('role', 'islamic_teacher').order('full_name')
    setTeachers(teacherData || [])

    const { data: classData } = await supabase
      .from('classes').select('*').eq('class_type', 'islamic').order('name')
    setClasses(classData || [])

    const { data: assignData } = await supabase
      .from('islamic_teacher_classes').select('*, users(full_name), classes(name)')
    setAssignments(assignData || [])

    if (classData && classData.length > 0) {
      const classIds = classData.map((c: any) => c.id)
      const { data: subjData } = await supabase
        .from('curriculum_subjects').select('*')
        .in('class_id', classIds).eq('is_active', true).order('order_num')
      setCurrSubjects(subjData || [])
    }
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

  function isAssigned(teacherId: string, classId: string) {
    return assignments.some(a => a.teacher_id === teacherId && a.class_id === classId)
  }

  async function loadProgress(cls: any, subject: any) {
    setProgressClass(cls)
    setProgressSubject(subject)
    const { data: lcData } = await supabase
      .from('learner_classes').select('*, learners(id, full_name)').eq('class_id', cls.id)
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
    setShowProgress(true)
  }

  function getP(learnerId: string, topicId: string) {
    return progressData.find(p => p.learner_id === learnerId && p.topic_id === topicId)
  }

  const totalPossible = progressTopics.length * progressLearners.length
  const totalDone = progressData.filter(p => p.completed).length
  const overallPct = totalPossible > 0 ? Math.round((totalDone / totalPossible) * 100) : 0
  const printDate = new Date().toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <main style={{ minHeight: '100vh', background: '#F8F7F4', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&family=DM+Serif+Display&display=swap');
        * { box-sizing: border-box; }

        /* ── Print styles ─────────────────────────────── */
        @media print {
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          body > * { display: none !important; }
          #print-area { display: block !important; }
          #print-area {
            font-family: 'DM Sans', Arial, sans-serif;
            padding: 0; margin: 0; color: #1A1A1A;
          }
          .print-header {
            display: flex !important;
            align-items: flex-start;
            justify-content: space-between;
            margin-bottom: 20px;
            padding-bottom: 14px;
            border-bottom: 2px solid #15803D;
          }
          .print-school { font-size: 10px; color: #AAA; margin-bottom: 4px; }
          .print-title  { font-size: 22px; font-weight: 600; color: #1A1A1A; margin-bottom: 2px; }
          .print-sub    { font-size: 13px; color: #555; }
          .print-meta-grid {
            display: grid !important;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px; margin-bottom: 16px;
          }
          .print-stat-box { border: 1px solid #E5E7EB; border-radius: 8px; padding: 10px 14px; text-align: center; }
          .print-stat-n { font-size: 20px; font-weight: 600; color: #15803D; }
          .print-stat-l { font-size: 9px; color: #AAA; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 2px; }
          .print-table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 8px; }
          .print-table th {
            background: #F0FDF4; color: #15803D;
            font-size: 9px; font-weight: 600;
            text-transform: uppercase; letter-spacing: 0.05em;
            padding: 7px 8px; border: 1px solid #D1FAE5; text-align: center;
          }
          .print-table th.th-learner {
            text-align: left; min-width: 130px; background: #F9FAFB; color: #6B7280;
          }
          .print-table td { padding: 7px 8px; border: 1px solid #F0F0EE; text-align: center; vertical-align: middle; }
          .print-table td.td-learner { text-align: left; font-weight: 500; color: #1A1A1A; }
          .print-table tr:nth-child(even) td { background: #FAFAFA; }
          .print-check-done {
            display: inline-block; width: 18px; height: 18px; border-radius: 50%;
            background: #F0FDF4; color: #15803D;
            font-size: 10px; line-height: 18px; text-align: center; font-weight: 700;
          }
          .print-check-not {
            display: inline-block; width: 18px; height: 18px; border-radius: 50%;
            background: #F5F5F3; color: #D1D5DB;
            font-size: 10px; line-height: 18px; text-align: center;
          }
          .print-pct-good { font-weight: 700; color: #15803D; }
          .print-pct-mid  { font-weight: 700; color: #A16207; }
          .print-pct-low  { font-weight: 700; color: #DC2626; }
          .print-footer {
            margin-top: 24px; padding-top: 10px;
            border-top: 1px solid #E5E7EB;
            font-size: 9px; color: #AAA;
            display: flex !important; justify-content: space-between;
          }
        }
        #print-area { display: none; }
        /* ────────────────────────────────────────────── */
      `}</style>

      {/* ── Hidden print area ── */}
      <div id="print-area">
        <div className="print-header">
          <div>
            <div className="print-school">Enderun Heights — Islamic Education</div>
            <div className="print-title">{progressSubject?.name || 'Progress Report'}</div>
            <div className="print-sub">{progressClass?.name} &nbsp;·&nbsp; Per-learner topic tracking</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, color: '#AAA' }}>Printed on</div>
            <div style={{ fontSize: 12, fontWeight: 500, color: '#1A1A1A' }}>{printDate}</div>
            <div style={{ marginTop: 6, fontSize: 11, color: '#15803D', fontWeight: 600 }}>{overallPct}% overall completion</div>
          </div>
        </div>
        <div className="print-meta-grid">
          <div className="print-stat-box">
            <div className="print-stat-n">{overallPct}%</div>
            <div className="print-stat-l">Overall completion</div>
          </div>
          <div className="print-stat-box">
            <div className="print-stat-n" style={{ color: '#1D4ED8' }}>{totalDone}/{totalPossible}</div>
            <div className="print-stat-l">Topics completed</div>
          </div>
          <div className="print-stat-box">
            <div className="print-stat-n" style={{ color: '#7E22CE' }}>{progressLearners.length}</div>
            <div className="print-stat-l">Learners</div>
          </div>
        </div>
        <table className="print-table">
          <thead>
            <tr>
              <th className="th-learner">Learner</th>
              {progressTopics.map(t => <th key={t.id}>{t.title}</th>)}
              <th>%</th>
            </tr>
          </thead>
          <tbody>
            {progressLearners.map(l => {
              const done = progressTopics.filter(t => getP(l.id, t.id)?.completed).length
              const pct = progressTopics.length > 0 ? Math.round((done / progressTopics.length) * 100) : 0
              const pctClass = pct >= 70 ? 'print-pct-good' : pct >= 40 ? 'print-pct-mid' : 'print-pct-low'
              return (
                <tr key={l.id}>
                  <td className="td-learner">{l.full_name}</td>
                  {progressTopics.map(t => (
                    <td key={t.id}>
                      {getP(l.id, t.id)?.completed
                        ? <span className="print-check-done">✓</span>
                        : <span className="print-check-not">○</span>}
                    </td>
                  ))}
                  <td className={pctClass}>{pct}%</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <div className="print-footer">
          <span>Enderun Heights School Management System</span>
          <span>Generated: {printDate}</span>
        </div>
      </div>
      {/* ── End print area ── */}

      {/* ── Topbar ── */}
      <div style={{ background: '#fff', borderBottom: '1px solid #EFEFED', padding: '0 32px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => showProgress ? setShowProgress(false) : router.push('/admin/islamic')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#999', background: 'none', border: 'none', cursor: 'pointer', padding: '6px 10px', borderRadius: 8, fontFamily: "'DM Sans',sans-serif" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
            {showProgress ? 'Back to assignments' : 'Back'}
          </button>
          <span style={{ color: '#DDD' }}>|</span>
          <span style={{ fontSize: 15, fontWeight: 500, color: '#1A1A1A' }}>
            {showProgress ? `${progressSubject?.name} — ${progressClass?.name}` : 'Islamic Teacher Assignment'}
          </span>
        </div>
        {showProgress && progressTopics.length > 0 && progressLearners.length > 0 && (
          <button onClick={() => window.print()}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#1A1A1A', color: '#fff', border: 'none', borderRadius: 9, padding: '8px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 6 2 18 2 18 9"/>
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
              <rect x="6" y="14" width="12" height="8"/>
            </svg>
            PDF / Print
          </button>
        )}
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '28px 32px' }}>

        {/* ── Progress view ── */}
        {showProgress ? (
          <div>
            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 20 }}>
              {[
                { n: `${overallPct}%`, l: 'Overall completion', c: '#15803D' },
                { n: `${totalDone}/${totalPossible}`, l: 'Topics completed', c: '#1D4ED8' },
                { n: progressLearners.length, l: 'Learners', c: '#7E22CE' },
              ].map((s, i) => (
                <div key={i} style={{ background: '#fff', border: '1px solid #EFEFED', borderRadius: 12, padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 500, color: s.c }}>{s.n}</div>
                  <div style={{ fontSize: 10, color: '#AAA', marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.l}</div>
                </div>
              ))}
            </div>

            {progressTopics.length === 0 ? (
              <div style={{ background: '#FEFCE8', border: '1px solid #FDE68A', borderRadius: 10, padding: 16, fontSize: 12, color: '#A16207' }}>
                No per-learner tracked topics in this subject. Enable "Track learners" on topics in Curriculum Management.
              </div>
            ) : progressLearners.length === 0 ? (
              <div style={{ background: '#fff', border: '1px solid #EFEFED', borderRadius: 12, padding: 40, textAlign: 'center', color: '#CCC', fontSize: 13 }}>No learners in this class</div>
            ) : (
              <div style={{ background: '#fff', border: '1px solid #EFEFED', borderRadius: 12, overflow: 'hidden', overflowX: 'auto' }}>
                <div style={{ display: 'flex', background: '#FAFAF8', borderBottom: '1px solid #EFEFED', minWidth: 'max-content' }}>
                  <div style={{ padding: '10px 16px', fontSize: 10, fontWeight: 500, color: '#AAA', textTransform: 'uppercase', letterSpacing: '0.05em', minWidth: 160, flexShrink: 0 }}>Learner</div>
                  {progressTopics.map(t => (
                    <div key={t.id} style={{ padding: '10px 8px', fontSize: 10, fontWeight: 500, color: '#15803D', textTransform: 'uppercase', letterSpacing: '0.04em', minWidth: 72, textAlign: 'center' }}>
                      <span style={{ display: 'block', maxWidth: 64, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: '0 auto' }}>{t.title}</span>
                    </div>
                  ))}
                  <div style={{ padding: '10px 12px', fontSize: 10, fontWeight: 500, color: '#AAA', textTransform: 'uppercase', minWidth: 50, textAlign: 'center' }}>%</div>
                </div>
                {progressLearners.map(l => {
                  const done = progressTopics.filter(t => getP(l.id, t.id)?.completed).length
                  const pct = progressTopics.length > 0 ? Math.round((done / progressTopics.length) * 100) : 0
                  return (
                    <div key={l.id} style={{ display: 'flex', borderBottom: '1px solid #F8F8F6', alignItems: 'center', minWidth: 'max-content' }}>
                      <div style={{ padding: '10px 16px', fontSize: 13, fontWeight: 500, color: '#1A1A1A', minWidth: 160, flexShrink: 0 }}>{l.full_name}</div>
                      {progressTopics.map(t => (
                        <div key={t.id} style={{ padding: '10px 8px', minWidth: 72, textAlign: 'center' }}>
                          <div style={{ width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', fontSize: 11, background: getP(l.id, t.id)?.completed ? '#F0FDF4' : '#F5F5F3', color: getP(l.id, t.id)?.completed ? '#15803D' : '#CCC' }}>
                            {getP(l.id, t.id)?.completed ? '✓' : '○'}
                          </div>
                        </div>
                      ))}
                      <div style={{ padding: '10px 12px', minWidth: 50, textAlign: 'center', fontSize: 12, fontWeight: 500, color: pct >= 70 ? '#15803D' : pct >= 40 ? '#A16207' : '#DC2626' }}>{pct}%</div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ) : (

          /* ── Assignment view ── */
          <div>
            {teachers.length === 0 ? (
              <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #EFEFED', padding: 40, textAlign: 'center' }}>
                <p style={{ color: '#AAA', fontSize: 13 }}>No Islamic Teachers yet.</p>
                <button onClick={() => router.push('/admin/teachers')} style={{ marginTop: 10, fontSize: 13, color: '#0369A1', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
                  Add from Staff Management →
                </button>
              </div>
            ) : (
              teachers.map(teacher => {
                const teacherClasses = classes.filter(cls => isAssigned(teacher.id, cls.id))
                return (
                  <div key={teacher.id} style={{ background: '#fff', borderRadius: 14, border: '1px solid #EFEFED', overflow: 'hidden', marginBottom: 16 }}>
                    {/* Teacher header */}
                    <div style={{ padding: '14px 20px', borderBottom: '1px solid #F0F0EE', background: '#FAFAF8', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#F0FDF4', color: '#15803D', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
                        {(teacher.display_name || teacher.full_name).charAt(0)}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: '#1A1A1A' }}>{teacher.display_name || teacher.full_name}</div>
                        <div style={{ fontSize: 11, color: '#AAA' }}>{teacher.email}</div>
                      </div>
                    </div>

                    {/* Class assignment chips */}
                    <div style={{ padding: '12px 20px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      <span style={{ fontSize: 11, color: '#AAA', alignSelf: 'center', marginRight: 4 }}>Classes:</span>
                      {classes.length === 0 ? (
                        <span style={{ fontSize: 12, color: '#AAA' }}>No Islamic classes</span>
                      ) : (
                        classes.map(cls => {
                          const assigned = isAssigned(teacher.id, cls.id)
                          return (
                            <button key={cls.id}
                              onClick={() => toggleAssignment(teacher.id, cls.id)}
                              disabled={saving}
                              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 9, border: assigned ? '1.5px solid #15803D' : '1.5px solid #EFEFED', background: assigned ? '#F0FDF4' : '#fff', color: assigned ? '#15803D' : '#555', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", transition: 'all 0.15s' }}>
                              {assigned
                                ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                                : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>}
                              {cls.name}
                            </button>
                          )
                        })
                      )}
                    </div>

                    {/* Progress buttons for assigned classes */}
                    {teacherClasses.length > 0 && (
                      <div style={{ padding: '10px 20px 14px', borderTop: '1px solid #F5F5F3' }}>
                        <div style={{ fontSize: 11, color: '#AAA', marginBottom: 8 }}>View progress report:</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {teacherClasses.map(cls => {
                            const clsSubjects = currSubjects.filter(s => s.class_id === cls.id)
                            return clsSubjects.map(subj => (
                              <button key={`${cls.id}-${subj.id}`}
                                onClick={() => loadProgress(cls, subj)}
                                style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 500, background: '#F0F9FF', color: '#0369A1', border: '1px solid #BFDBFE', borderRadius: 7, padding: '5px 10px', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                                {cls.name} — {subj.name}
                              </button>
                            ))
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>
    </main>
  )
}