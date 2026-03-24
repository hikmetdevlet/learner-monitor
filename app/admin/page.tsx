'use client'
import { useEffect, useState } from 'react'
import { createClient } from '../lib/supabase'
import { useRouter } from 'next/navigation'

const Icons = {
  learners: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  classes: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  staff: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  timetable: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  islamic: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/><path d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3"/></svg>,
  reports: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  import: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
  settings: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  logout: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  warning: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  clock: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  arrow: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>,
}

export default function AdminDashboard() {
  const [userName, setUserName] = useState('')
  const [appName, setAppName] = useState('Learner Monitor')
  const [stats, setStats] = useState({ learners: 0, teachers: 0, classes: 0, islamic_teachers: 0 })
  const [atRisk, setAtRisk] = useState<any[]>([])
  const [todaySessions, setTodaySessions] = useState<any[]>([])
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }
    const { data: userData } = await supabase
      .from('users').select('full_name, role').eq('auth_id', user.id).single()
    if (userData?.role !== 'admin') { router.push('/'); return }
    setUserName(userData.full_name)

    const { data: settings } = await supabase
      .from('settings').select('value').eq('key', 'app_name').single()
    if (settings) setAppName(settings.value)

    const { count: lc } = await supabase.from('learners').select('*', { count: 'exact', head: true }).eq('is_active', true)
    const { count: tc } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'teacher')
    const { count: ic } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'islamic_teacher')
    const { count: cc } = await supabase.from('classes').select('*', { count: 'exact', head: true })
    setStats({ learners: lc || 0, teachers: tc || 0, classes: cc || 0, islamic_teachers: ic || 0 })

    const dayNum = new Date().getDay() === 0 ? 7 : new Date().getDay()
    const { data: sessions } = await supabase
      .from('timetable').select('*, classes(name), users(full_name)')
      .eq('day_of_week', dayNum).order('start_time')
    setTodaySessions(sessions || [])

    const { data: allAtt } = await supabase.from('attendance').select('learner_id, status, learners(id, full_name)')
    const { data: sd } = await supabase.from('settings').select('value').eq('key', 'at_risk_threshold').single()
    const threshold = sd ? parseInt(sd.value) : 70
    const map: Record<string, any> = {}
    allAtt?.forEach((a: any) => {
      if (!map[a.learner_id]) map[a.learner_id] = { learner: a.learners, total: 0, present: 0 }
      map[a.learner_id].total++
      if (a.status === 'present' || a.status === 'late') map[a.learner_id].present++
    })
    setAtRisk(Object.values(map)
      .filter((l: any) => l.total > 0 && Math.round((l.present / l.total) * 100) < threshold)
      .map((l: any) => ({ ...l.learner, pct: Math.round((l.present / l.total) * 100) })))
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  const DAYS = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  const todayName = DAYS[new Date().getDay() === 0 ? 7 : new Date().getDay()]
  const dateStr = new Date().toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' })

  const menuItems = [
    { title: 'Staff', desc: 'Teachers & Baskans', href: '/admin/teachers', icon: Icons.staff },
    { title: 'Learners', desc: 'Manage all learners', href: '/admin/learners', icon: Icons.learners },
    { title: 'Classes', desc: 'Islamic & secular', href: '/admin/classes', icon: Icons.classes },
    { title: 'Curriculum', desc: 'Subjects, topics & materials', href: '/admin/curriculum', icon: Icons.islamic, bg: '#F0FDF4', color: '#15803D' },
    { title: 'Timetable', desc: 'Weekly schedule', href: '/admin/sessions', icon: Icons.timetable },
    { title: 'Islamic Education', desc: 'Subjects & topics', href: '/admin/islamic', icon: Icons.islamic },
    { title: 'Cleaning', desc: 'Locations, checklists & assignments', href: '/admin/cleaning', icon: Icons.settings, bg: '#F0FDF4', color: '#15803D' },
    { title: 'Reports', desc: 'Progress & analytics', href: '/admin/reports', icon: Icons.reports },
    { title: 'Quick Import', desc: 'Bulk add data', href: '/admin/import', icon: Icons.import },
    { title: 'Settings', desc: 'App configuration', href: '/admin/settings', icon: Icons.settings },
  ]

  return (
    <main style={{ minHeight: '100vh', background: '#f5f4f0', fontFamily: '-apple-system, "Segoe UI", sans-serif' }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }

        .nav {
          background: rgba(255,255,255,0.85);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(0,0,0,0.06);
          padding: 0 32px;
          height: 52px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .nav-brand {
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .nav-dot {
          width: 8px; height: 8px;
          background: #d97706;
          border-radius: 50%;
        }

        .nav-title {
          font-size: 15px;
          font-weight: 600;
          color: #1c1c1c;
          letter-spacing: -0.3px;
        }

        .nav-right {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .nav-user {
          font-size: 13px;
          color: #666;
          padding: 5px 10px;
          background: rgba(0,0,0,0.04);
          border-radius: 8px;
        }

        .nav-logout {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 13px;
          color: #888;
          background: none;
          border: none;
          cursor: pointer;
          padding: 5px 10px;
          border-radius: 8px;
          transition: all 0.15s;
          font-family: inherit;
        }
        .nav-logout:hover { background: #fee2e2; color: #dc2626; }

        .page { max-width: 1040px; margin: 0 auto; padding: 32px; }

        .page-top { margin-bottom: 24px; }
        .page-greeting { font-size: 20px; font-weight: 600; color: #1c1c1c; letter-spacing: -0.4px; }
        .page-sub { font-size: 13px; color: #aaa; margin-top: 3px; }

        /* Stats row */
        .stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          margin-bottom: 20px;
        }

        .stat-card {
          background: #ffffff;
          border: 1px solid rgba(0,0,0,0.07);
          border-radius: 12px;
          padding: 18px 20px;
          transition: box-shadow 0.2s;
        }
        .stat-card:hover { box-shadow: 0 2px 12px rgba(0,0,0,0.07); }

        .stat-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }

        .stat-icon {
          width: 30px; height: 30px;
          border-radius: 8px;
          background: rgba(0,0,0,0.04);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #888;
        }

        .stat-num { font-size: 28px; font-weight: 600; color: #1c1c1c; letter-spacing: -1px; line-height: 1; }
        .stat-label { font-size: 11px; color: #bbb; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.06em; }

        /* Two col */
        .two-col {
          display: grid;
          grid-template-columns: 1fr 280px;
          gap: 10px;
          margin-bottom: 20px;
        }

        .panel {
          background: #ffffff;
          border: 1px solid rgba(0,0,0,0.07);
          border-radius: 12px;
          overflow: hidden;
        }

        .panel-head {
          padding: 13px 18px;
          border-bottom: 1px solid rgba(0,0,0,0.05);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .panel-title {
          font-size: 13px;
          font-weight: 500;
          color: #444;
        }

        .panel-count {
          font-size: 11px;
          color: #bbb;
          background: rgba(0,0,0,0.04);
          padding: 2px 7px;
          border-radius: 8px;
        }

        .session-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 18px;
          border-bottom: 1px solid rgba(0,0,0,0.03);
        }
        .session-row:last-child { border-bottom: none; }

        .time-tag {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          color: #bbb;
          min-width: 90px;
        }

        .s-name { font-size: 13px; font-weight: 500; color: #333; flex: 1; }
        .s-cls { font-size: 11px; color: #bbb; }

        .risk-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 9px 18px;
          border-bottom: 1px solid rgba(0,0,0,0.03);
          cursor: pointer;
          transition: background 0.1s;
        }
        .risk-row:hover { background: #fafaf8; }
        .risk-row:last-child { border-bottom: none; }

        .risk-name { font-size: 13px; font-weight: 500; color: #333; }

        .risk-chip {
          display: flex;
          align-items: center;
          gap: 3px;
          font-size: 11px;
          font-weight: 500;
          color: #dc2626;
          background: #fef2f2;
          padding: 2px 7px;
          border-radius: 8px;
        }

        .empty-msg {
          padding: 28px;
          text-align: center;
          font-size: 13px;
          color: #ddd;
        }

        /* Menu grid */
        .menu-section-title {
          font-size: 11px;
          font-weight: 500;
          color: #bbb;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          margin-bottom: 10px;
        }

        .menu {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
        }

        .menu-item {
          background: #ffffff;
          border: 1px solid rgba(0,0,0,0.07);
          border-radius: 12px;
          padding: 16px;
          cursor: pointer;
          text-align: left;
          transition: all 0.15s;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .menu-item:hover {
          background: #fafaf8;
          border-color: rgba(0,0,0,0.12);
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        }

        .menu-item-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .menu-icon {
          width: 30px; height: 30px;
          border-radius: 8px;
          background: rgba(0,0,0,0.04);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #777;
        }

        .menu-arrow { color: #ddd; }

        .menu-title { font-size: 13px; font-weight: 500; color: #333; }
        .menu-desc { font-size: 11px; color: #bbb; line-height: 1.4; }

        @media (max-width: 860px) {
          .stats { grid-template-columns: repeat(2,1fr); }
          .two-col { grid-template-columns: 1fr; }
          .menu { grid-template-columns: repeat(2,1fr); }
          .page { padding: 20px; }
        }
      `}</style>

      {/* Nav */}
      <nav className="nav">
        <div className="nav-brand">
          <div className="nav-dot" />
          <span className="nav-title">{appName}</span>
        </div>
        <div className="nav-right">
          <span className="nav-user">{userName}</span>
          <button className="nav-logout" onClick={handleLogout}>
            {Icons.logout} Sign out
          </button>
        </div>
      </nav>

      <div className="page">
        {/* Header */}
        <div className="page-top">
          <h1 className="page-greeting">Good morning, {userName.split(' ')[0]}</h1>
          <p className="page-sub">{todayName} · {dateStr}</p>
        </div>

        {/* Stats */}
        <div className="stats">
          {[
            { icon: Icons.learners, n: stats.learners, l: 'Learners' },
            { icon: Icons.staff, n: stats.teachers, l: 'Teachers' },
            { icon: Icons.islamic, n: stats.islamic_teachers, l: 'Islamic Teachers' },
            { icon: Icons.classes, n: stats.classes, l: 'Classes' },
          ].map(s => (
            <div key={s.l} className="stat-card">
              <div className="stat-top">
                <div className="stat-icon">{s.icon}</div>
              </div>
              <div className="stat-num">{s.n}</div>
              <div className="stat-label">{s.l}</div>
            </div>
          ))}
        </div>

        {/* Today + At Risk */}
        <div className="two-col">
          <div className="panel">
            <div className="panel-head">
              <span className="panel-title">Today's sessions</span>
              <span className="panel-count">{todaySessions.length}</span>
            </div>
            {todaySessions.length === 0 ? (
              <div className="empty-msg">No sessions today</div>
            ) : (
              todaySessions.map(s => (
                <div key={s.id} className="session-row">
                  <span className="time-tag">{Icons.clock} {s.start_time?.slice(0,5)} – {s.end_time?.slice(0,5)}</span>
                  <span className="s-name">{s.name}</span>
                  <span className="s-cls">{s.classes?.name}</span>
                </div>
              ))
            )}
          </div>

          <div className="panel">
            <div className="panel-head">
              <span className="panel-title">At-risk</span>
              <span className="panel-count">{atRisk.length}</span>
            </div>
            {atRisk.length === 0 ? (
              <div className="empty-msg">All clear</div>
            ) : (
              atRisk.slice(0, 7).map((l: any) => (
                <div key={l.id} className="risk-row" onClick={() => router.push(`/admin/learners/${l.id}`)}>
                  <span className="risk-name">{l.full_name}</span>
                  <span className="risk-chip">{Icons.warning} {l.pct}%</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Menu */}
        <p className="menu-section-title">Navigation</p>
        <div className="menu">
          {menuItems.map(item => (
            <button key={item.title} className="menu-item" onClick={() => router.push(item.href)}>
              <div className="menu-item-top">
                <div className="menu-icon">{item.icon}</div>
                <span className="menu-arrow">{Icons.arrow}</span>
              </div>
              <div>
                <div className="menu-title">{item.title}</div>
                <div className="menu-desc">{item.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </main>
  )
}