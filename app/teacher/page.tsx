'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useTeacherData } from './_hooks/useTeacherData'
import { STYLES } from './_types/styles'
import { TabDashboard }  from './_components/TabDashboard'
import { TabAttendance } from './_components/TabAttendance'
import { TabCurriculum } from './_components/TabCurriculum'
import { TabHomework }   from './_components/TabHomework'
import { TabBehaviour }  from './_components/TabBehaviour'
import { TabExams, TabCalendar } from './_components/TabExamsCalendar'
import { TabReport }     from './_components/TabReport'

const TABS = [
  { key: 'dashboard',  label: 'Home',       icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
  { key: 'attendance', label: 'Attend',     icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg> },
  { key: 'curriculum', label: 'Lessons',    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg> },
  { key: 'homework',   label: 'Homework',   icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> },
  { key: 'behaviour',  label: 'Behaviour',  icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
  { key: 'exams',      label: 'Exams',      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
  { key: 'report',     label: 'Reports',    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> },
  { key: 'calendar',   label: 'Calendar',   icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><circle cx="8" cy="15" r="1" fill="currentColor"/><circle cx="12" cy="15" r="1" fill="currentColor"/><circle cx="16" cy="15" r="1" fill="currentColor"/></svg> },
]

export default function TeacherPage() {
  const router       = useRouter()
  const supabase     = createClient()
  const d            = useTeacherData()
  const [tab,        setTab]        = useState('dashboard')
  const [loading,    setLoading]    = useState(true)
  const [showNotifs, setShowNotifs] = useState(false)

  useEffect(() => {
    d.init(router).then(() => setLoading(false))
  }, [])

  async function logout() {
    await supabase.auth.signOut(); router.push('/')
  }

  if (loading) return (
    <main style={{ minHeight: '100vh', background: '#F8F7F4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans',sans-serif" }}>
      <div style={{ fontSize: 13, color: '#AAA' }}>Loading…</div>
    </main>
  )
  if (!d.teacher) return null

  const unread = d.notifications.length
  const initials = (d.teacher.display_name || d.teacher.full_name || '?').split(' ').map((n: string) => n[0]).slice(0,2).join('')

  // Shared data object passed to all tabs
  const tabData = {
    ...d,
    loadSessionAttendance: d.loadSessionAttendance,
    saveSessionAttendance: d.saveSessionAttendance,
  }

  function renderTab() {
    switch (tab) {
      case 'dashboard':  return <TabDashboard data={d} setTab={setTab} />
      case 'attendance': return <TabAttendance data={tabData} />
      case 'curriculum': return <TabCurriculum data={{ teacher: d.teacher, subjects: d.subjects, topics: d.topics, progress: d.progress, materials: d.materials, terms: d.terms, topicTerms: d.topicTerms, lessonPlans: d.lessonPlans, loadMaterials: d.loadMaterials, saveLessonPlan: d.saveLessonPlan, markTopicDone: d.markTopicDone, unmarkTopic: d.unmarkTopic }} />
      case 'homework':   return <TabHomework data={{ teacher: d.teacher, myClasses: d.myClasses, classLearners: d.classLearners, hwAssignments: d.hwAssignments, hwSessions: d.hwSessions, loadHomework: d.loadHomework, createHwAssignment: d.createHwAssignment, deleteHwAssignment: d.deleteHwAssignment, loadHwSubmissions: d.loadHwSubmissions, saveHwSubmissions: d.saveHwSubmissions }} />
      case 'behaviour':  return <TabBehaviour data={{ teacher: d.teacher, allLearners: d.allLearners, incidents: d.incidents, praises: d.praises, saveBehaviour: d.saveBehaviour, deleteBehaviour: d.deleteBehaviour }} />
      case 'exams':      return <TabExams data={{ teacher: d.teacher, isHead: d.isHead, exams: d.exams, allClasses: d.allClasses, quizSessions: d.quizSessions, quizResults: d.quizResults, addExam: d.addExam }} />
      case 'report':     return <TabReport data={{ myClasses: d.myClasses, buildReport: d.buildReport, incidents: d.incidents, praises: d.praises, rawAttData: d.rawAttData, allLearners: d.allLearners }} />
      case 'calendar':   return <TabCalendar data={{ allCalEvents: d.allCalEvents }} />
      default:           return null
    }
  }

  return (
    <main style={{ minHeight: '100vh', background: '#F8F7F4', fontFamily: "'DM Sans',sans-serif" }}>
      <style>{STYLES}</style>

      {/* Topbar */}
      <div className="topbar">
        <div className="brand">
          <div className="brand-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
          </div>
          <div className="brand-name">Learner Monitor</div>
        </div>
        <div className="tbar-r">
          {d.activeYearName && <div className="yr-chip">{d.activeYearName}</div>}
          {/* Notifications */}
          <div style={{ position: 'relative' }}>
            <button className="notif-btn" onClick={() => { setShowNotifs(!showNotifs); if (!showNotifs && unread > 0) d.markNotifsRead(d.teacher.id) }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              {unread > 0 && <div className="notif-dot" />}
            </button>
            {showNotifs && (
              <div style={{ position: 'absolute', top: 40, right: 0, width: 300, background: '#fff', border: '1px solid #EFEFED', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,.1)', zIndex: 50, overflow: 'hidden' }}>
                <div style={{ padding: '11px 14px', borderBottom: '1px solid #F5F5F3', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, fontWeight: 700 }}>Notifications</span>
                  <button onClick={() => setShowNotifs(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#AAA' }}>✕</button>
                </div>
                {d.notifications.length === 0
                  ? <div style={{ padding: '24px', textAlign: 'center', color: '#CCC', fontSize: 12 }}>All clear ✓</div>
                  : d.notifications.map((n: any) => (
                    <div key={n.id} style={{ padding: '10px 14px', borderBottom: '1px solid #F8F8F6' }}>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>{n.title}</div>
                      <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{n.body}</div>
                    </div>
                  ))}
              </div>
            )}
          </div>
          <div className="uchip">
            <div className="av">{initials}</div>
            <div className="uname">{d.teacher.display_name || d.teacher.full_name?.split(' ')[0]}</div>
          </div>
          <button className="logout" onClick={logout}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Out
          </button>
        </div>
      </div>

      {/* Desktop tab bar */}
      <div className="tab-bar">
        {TABS.map(t => (
          <button key={t.key} className={`tab-btn ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
            {t.label}
            {t.key === 'homework' && d.hwAssignments.filter((a: any) => a.due_date < new Date().toISOString().split('T')[0]).length > 0 && (
              <span style={{ background: '#EF4444', color: '#fff', fontSize: 8, fontWeight: 800, padding: '1px 5px', borderRadius: 10 }}>
                {d.hwAssignments.filter((a: any) => a.due_date < new Date().toISOString().split('T')[0]).length}
              </span>
            )}
            {t.key === 'report' && d.allLearners.length > 0 && (
              <span style={{ background: '#EFF6FF', color: '#1D4ED8', fontSize: 8, fontWeight: 800, padding: '1px 5px', borderRadius: 10 }}>NEW</span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="wrap">{renderTab()}</div>

      {/* Mobile bottom nav */}
      <nav className="bnav">
        <div className="bnav-inner">
          {TABS.slice(0, 6).map(t => (
            <button key={t.key} className={`bnav-btn ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      </nav>
    </main>
  )
}
