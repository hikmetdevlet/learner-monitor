'use client'
// ─── Islamic Teacher Dashboard — main page ────────────────────────────────
// This file is intentionally thin. It only:
//   1. Calls useTeacherData() to load all data
//   2. Renders the topbar + tab bar + mobile nav
//   3. Renders the active tab component
//
// All data fetching lives in _hooks/useTeacherData.ts
// All tab UI lives in _components/
// All types live in _types/index.ts

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTeacherData } from './_hooks/useTeacherData'
import { STYLES } from './_types/styles'
import { TabDashboard }   from './_components/TabDashboard'
import { TabAttendance }  from './_components/TabAttendance'
import { TabCurriculum }  from './_components/TabCurriculum'
import { TabTopics }      from './_components/TabTopics'
import { TabReport }      from './_components/TabReport'
import { TabBehaviour }   from './_components/TabBehaviour'
import { TabQuizzes }     from './_components/TabQuizzes'

const TABS = [
  { key: 'dashboard',  label: 'Home',      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
  { key: 'attendance', label: 'Attend',    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg> },
  { key: 'curriculum', label: 'Lessons',   icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg> },
  { key: 'topics',     label: 'Topics',    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg> },
  { key: 'report',     label: 'Report',    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> },
  { key: 'behaviour',  label: 'Behaviour', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
  { key: 'quizzes',    label: 'Quizzes',   icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> },
]

export default function IslamicTeacherPage() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const router  = useRouter()
  const data    = useTeacherData()

  // Show nothing while auth/data loading
  if (!data.ready) {
    return (
      <main style={{ minHeight: '100vh', background: '#F8F7F4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans',sans-serif" }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 32, height: 32, border: '3px solid #BBF7D0', borderTopColor: '#15803D', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          <div style={{ fontSize: 12, color: '#AAA' }}>Loading…</div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </main>
    )
  }

  const sharedProps = { data, activeTab, setActiveTab }

  return (
    <main style={{ minHeight: '100vh', background: '#F8F7F4', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{STYLES}</style>

      {/* ── Topbar ── */}
      <div className="topbar">
        <div className="brand">
          <div className="brand-icon">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7z"/></svg>
          </div>
          <span className="brand-name">Islamic Teacher</span>
        </div>
        <div className="tbar-r">
          {data.activeYearName && (
            <div className="yr-chip">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              {data.activeYearName}
            </div>
          )}
          <div className="uchip">
            <div className="av">{data.teacherName.charAt(0)}</div>
            <span className="uname">{data.teacherName}</span>
          </div>
          <button className="logout" onClick={async () => { await data.supabase.auth.signOut(); router.push('/') }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Out
          </button>
        </div>
      </div>

      {/* ── Desktop tab bar ── */}
      <div className="tab-bar">
        {TABS.map(t => (
          <button key={t.key} className={`tab-btn ${activeTab === t.key ? 'active' : ''}`} onClick={() => setActiveTab(t.key)}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      <div className="wrap">
        {activeTab === 'dashboard'  && <TabDashboard  {...sharedProps} />}
        {activeTab === 'attendance' && <TabAttendance {...sharedProps} />}
        {activeTab === 'curriculum' && <TabCurriculum {...sharedProps} />}
        {activeTab === 'topics'     && <TabTopics     {...sharedProps} />}
        {activeTab === 'report'     && <TabReport     {...sharedProps} />}
        {activeTab === 'behaviour'  && <TabBehaviour  {...sharedProps} />}
        {activeTab === 'quizzes'    && <TabQuizzes    {...sharedProps} />}
      </div>

      {/* ── Mobile bottom nav ── */}
      <nav className="bnav">
        <div className="bnav-inner">
          {TABS.map(t => (
            <button key={t.key} className={`bnav-btn ${activeTab === t.key ? 'active' : ''}`} onClick={() => setActiveTab(t.key)}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>
      </nav>
    </main>
  )
}
