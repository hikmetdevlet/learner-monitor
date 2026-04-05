'use client'
import { useEffect, useState } from 'react'
import { createClient } from '../lib/supabase'
import { useRouter } from 'next/navigation'

const supabase = createClient()

// ─── Icons ────────────────────────────────────────────────────────────────────
const I = {
  dashboard:  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
  learners:   <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  classes:    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  staff:      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  timetable:  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  curriculum: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>,
  islamic:    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/><path d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3"/></svg>,
  quiz:       <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  cleaning:   <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>,
  import:     <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
  settings:   <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  year:       <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  warning:    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  docs:       <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
  bell:       <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  logout:     <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  chevron:    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>,
  arrow:      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>,
}

type WeekDay   = { date: string; day: string; pct: number | null; present: number; total: number }
type AtRiskRow = { id: string; name: string; pct: number; total: number }
type PrayerStat = { id: string; name: string; present: number; total: number; marked: boolean }

const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', href: null },
    ],
  },
  {
    label: 'People',
    items: [
      { id: 'staff',    label: 'Staff',    icon: 'staff',    href: '/admin/teachers' },
      { id: 'learners', label: 'Learners', icon: 'learners', href: '/admin/learners' },
    ],
  },
  {
    label: 'Academics',
    items: [
      { id: 'classes',    label: 'Classes',           icon: 'classes',    href: '/admin/classes' },
      { id: 'timetable',  label: 'Timetable',         icon: 'timetable',  href: '/admin/sessions' },
      { id: 'departments', label: 'Academic Calendar', icon: 'classes', href: '/admin/departments' },
      { id: 'curriculum', label: 'Curriculum',        icon: 'curriculum', href: '/admin/curriculum' },
      { id: 'islamic',    label: 'Islamic Education', icon: 'islamic',    href: '/admin/islamic' },
      { id: 'quiz',       label: 'Quiz & Questions',  icon: 'quiz',       href: '/teacher/quiz' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { id: 'cleaning', label: 'Cleaning',     icon: 'cleaning', href: '/admin/cleaning' },
      { id: 'import',   label: 'Quick Import', icon: 'import',   href: '/admin/import' },
    ],
  },
  {
    label: 'System',
    items: [
      { id: 'settings', label: 'Settings',     icon: 'settings', href: '/admin/settings' },
      { id: 'year',     label: 'Academic Year', icon: 'year',    href: null },
    ],
  },
]

export default function AdminDashboard() {
  const router = useRouter()

  const [userName,       setUserName]       = useState('')
  const [appName,        setAppName]        = useState('Learner Monitor')
  const [stats,          setStats]          = useState({ learners: 0, teachers: 0, classes: 0 })
  const [atRiskThreshold, setAtRiskThreshold] = useState(75)
  const [dashLoading,    setDashLoading]    = useState(true)
  const [weeklyAtt,      setWeeklyAtt]      = useState<WeekDay[]>([])
  const [atRisk,         setAtRisk]         = useState<AtRiskRow[]>([])
  const [sessionsCov,    setSessionsCov]    = useState<{ total: number; marked: number; list: any[] }>({ total: 0, marked: 0, list: [] })
  const [prayerStats,    setPrayerStats]    = useState<PrayerStat[]>([])
  const [cleaningToday,  setCleaningToday]  = useState({ done: 0, total: 0 })
  const [docIssues,      setDocIssues]      = useState(0)
  const [alerts,         setAlerts]         = useState<{ msg: string; href: string; sev: 'warn' | 'crit' | 'info' }[]>([])
  const [showAlerts,     setShowAlerts]     = useState(false)
  const [activeYear,     setActiveYear]     = useState<{ id: string; name: string } | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }
    const { data: u } = await supabase.from('users').select('full_name, role').eq('auth_id', user.id).single()
    if (u?.role !== 'admin') { router.push('/'); return }
    setUserName(u.full_name)

    const [{ data: appS }, { data: riskS }, { count: lc }, { count: tc }, { count: cc }, { data: yearData }] = await Promise.all([
      supabase.from('settings').select('value').eq('key', 'app_name').single(),
      supabase.from('settings').select('value').eq('key', 'at_risk_threshold').single(),
      supabase.from('learners').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('users').select('*', { count: 'exact', head: true }).in('role', ['teacher', 'islamic_teacher']),
      supabase.from('classes').select('*', { count: 'exact', head: true }),
      supabase.from('academic_years').select('id, name').eq('is_active', true).single(),
    ])
    if (appS) setAppName(appS.value)
    if (yearData) setActiveYear(yearData)
    const threshold = riskS ? parseInt(riskS.value) || 75 : 75
    setAtRiskThreshold(threshold)
    setStats({ learners: lc || 0, teachers: tc || 0, classes: cc || 0 })
    await loadDashboard(threshold)
  }

  async function loadDashboard(threshold: number) {
    setDashLoading(true)
    const today  = new Date().toISOString().split('T')[0]
    const dayNum = new Date().getDay() === 0 ? 7 : new Date().getDay()
    const last7: string[] = []
    for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); last7.push(d.toISOString().split('T')[0]) }
    const d30 = new Date(); d30.setDate(d30.getDate() - 30)
    const thirtyAgo = d30.toISOString().split('T')[0]

    const [
      { data: sessions }, { data: todayAtt }, { data: weekAtt }, { data: monthAtt },
      { data: prayerActs }, { data: prayerAtt },
      { data: cleanLocs }, { data: cleanLogs },
      { data: docTypes }, { data: learnerDocs }, { data: learnersList },
    ] = await Promise.all([
      supabase.from('timetable').select('id, name, classes(name, class_type)').eq('day_of_week', dayNum),
      supabase.from('attendance').select('timetable_id').eq('attendance_date', today),
      supabase.from('attendance').select('attendance_date, status').in('attendance_date', last7),
      supabase.from('attendance').select('learner_id, status, learners(id, full_name)').gte('attendance_date', thirtyAgo),
      supabase.from('daily_activities').select('id, name, order_num').eq('is_salaah', true).eq('is_active', true).order('order_num'),
      supabase.from('activity_attendance').select('activity_id, learner_id, status').eq('activity_date', today),
      supabase.from('cleaning_locations').select('id').eq('is_active', true),
      supabase.from('cleaning_logs').select('location_id, status').eq('log_date', today),
      supabase.from('document_types').select('id').eq('is_active', true),
      supabase.from('learner_documents').select('learner_id, submitted'),
      supabase.from('learners').select('id').eq('is_active', true),
    ])

    const markedIds  = new Set((todayAtt || []).map((r: any) => r.timetable_id))
    const sessionList = (sessions || []).map((s: any) => ({ ...s, marked: markedIds.has(s.id) }))
    setSessionsCov({ total: sessionList.length, marked: sessionList.filter((s: any) => s.marked).length, list: sessionList })

    const WDAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
    const dateMap: Record<string, { present: number; total: number }> = {}
    last7.forEach(d => { dateMap[d] = { present: 0, total: 0 } })
    ;(weekAtt || []).forEach((r: any) => {
      if (dateMap[r.attendance_date]) { dateMap[r.attendance_date].total++; if (r.status === 'present') dateMap[r.attendance_date].present++ }
    })
    setWeeklyAtt(last7.map(d => ({ date: d, day: WDAYS[new Date(d+'T12:00:00').getDay()], ...dateMap[d], pct: dateMap[d].total > 0 ? Math.round(dateMap[d].present/dateMap[d].total*100) : null })))

    const lMap: Record<string, { name: string; present: number; total: number }> = {}
    ;(monthAtt || []).forEach((r: any) => {
      if (!r.learner_id) return
      if (!lMap[r.learner_id]) lMap[r.learner_id] = { name: (r.learners as any)?.full_name || '—', present: 0, total: 0 }
      lMap[r.learner_id].total++; if (r.status === 'present') lMap[r.learner_id].present++
    })
    setAtRisk(Object.entries(lMap).map(([id,s]) => ({ id, ...s, pct: s.total > 0 ? Math.round(s.present/s.total*100) : 100 })).filter(l => l.pct < threshold && l.total >= 3).sort((a,b) => a.pct-b.pct).slice(0,10))

    const totalL = (learnersList || []).length
    const pMap: Record<string, { present: number; records: number }> = {}
    ;(prayerActs || []).forEach((a: any) => { pMap[a.id] = { present: 0, records: 0 } })
    ;(prayerAtt  || []).forEach((r: any) => { if (pMap[r.activity_id]) { pMap[r.activity_id].records++; if (r.status === 'present') pMap[r.activity_id].present++ } })
    setPrayerStats((prayerActs || []).map((a: any) => ({ id: a.id, name: a.name, present: pMap[a.id]?.present||0, total: totalL, marked: (pMap[a.id]?.records||0) > 0 })))

    const doneLocs = new Set((cleanLogs || []).filter((l: any) => l.status === 'done').map((l: any) => l.location_id)).size
    setCleaningToday({ done: doneLocs, total: (cleanLocs || []).length })

    const totalDocTypes = (docTypes || []).length
    let issues = 0
    ;(learnersList || []).forEach((l: any) => { const sub = (learnerDocs || []).filter((d: any) => d.learner_id === l.id && d.submitted).length; if (sub < totalDocTypes) issues++ })
    setDocIssues(issues)

    const newAlerts: { msg: string; href: string; sev: 'warn' | 'crit' | 'info' }[] = []
    const unmarked = sessionList.filter((s: any) => !s.marked).length
    if (unmarked > 0) newAlerts.push({ msg: `${unmarked} session${unmarked>1?'s':''} not marked today`, href: '/admin/sessions', sev: 'warn' })
    const riskCount = Object.values(lMap).filter((s: any) => s.total >= 3 && Math.round(s.present/s.total*100) < threshold).length
    if (riskCount > 0) newAlerts.push({ msg: `${riskCount} learner${riskCount>1?'s':''} below ${threshold}% attendance`, href: '/admin/learners', sev: 'crit' })
    if (issues > 0) newAlerts.push({ msg: `${issues} learner${issues>1?'s':''} have missing documents`, href: '/admin/learners', sev: 'info' })
    const unmarkedPrayers = (prayerActs || []).filter((a: any) => !(pMap[a.id]?.records > 0)).length
    if (unmarkedPrayers > 0) newAlerts.push({ msg: `${unmarkedPrayers} prayer${unmarkedPrayers>1?'s':''} not recorded today`, href: '/admin/islamic', sev: 'info' })
    setAlerts(newAlerts)
    setDashLoading(false)
  }

  function greeting() { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening' }
  const WEEKDAYS = ['','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
  const todayName = WEEKDAYS[new Date().getDay() === 0 ? 7 : new Date().getDay()]
  const dateStr   = new Date().toLocaleDateString('en-ZA', { year:'numeric', month:'long', day:'numeric' })

  function handleNav(item: typeof NAV_GROUPS[0]['items'][0]) {
    if (item.id === 'year') { router.push('/admin/academic-year'); return }
    if (item.href) { router.push(item.href); return }
    // dashboard — already there
  }

  return (
    <main style={{ minHeight:'100vh', background:'#F5F4F0', fontFamily:"'DM Sans',-apple-system,sans-serif", display:'flex' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }

        /* ── Sidebar ── */
        .sidebar {
          width: 220px;
          min-height: 100vh;
          background: #1A1A1A;
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
          position: sticky;
          top: 0;
          height: 100vh;
          overflow-y: auto;
          scrollbar-width: none;
          transition: width 0.2s;
        }
        .sidebar::-webkit-scrollbar { display: none; }
        .sidebar.collapsed { width: 56px; }

        .sb-brand {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 18px 16px 14px;
          border-bottom: 1px solid rgba(255,255,255,0.07);
          flex-shrink: 0;
        }
        .sb-dot { width: 8px; height: 8px; background: #D97706; border-radius: 50%; flex-shrink: 0; }
        .sb-name { font-size: 14px; font-weight: 600; color: #fff; letter-spacing: -0.3px; white-space: nowrap; overflow: hidden; }
        .sidebar.collapsed .sb-name { display: none; }

        .sb-nav { flex: 1; padding: 10px 8px; }
        .sb-group { margin-bottom: 4px; }
        .sb-group-label {
          font-size: 10px; font-weight: 600; color: rgba(255,255,255,0.3);
          text-transform: uppercase; letter-spacing: 0.07em;
          padding: 8px 8px 4px;
          white-space: nowrap; overflow: hidden;
        }
        .sidebar.collapsed .sb-group-label { opacity: 0; }

        .sb-item {
          display: flex; align-items: center; gap: 9px;
          padding: 8px 9px; border-radius: 8px;
          border: none; background: none; cursor: pointer;
          font-family: 'DM Sans', sans-serif; font-size: 13px;
          color: rgba(255,255,255,0.55); width: 100%; text-align: left;
          transition: all 0.15s; margin-bottom: 1px;
          white-space: nowrap; overflow: hidden;
        }
        .sb-item:hover { background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.9); }
        .sb-item.active { background: rgba(255,255,255,0.1); color: #fff; }
        .sb-item svg { flex-shrink: 0; opacity: 0.7; }
        .sb-item.active svg { opacity: 1; }
        .sb-item-label { overflow: hidden; text-overflow: ellipsis; }
        .sidebar.collapsed .sb-item-label { display: none; }
        .sidebar.collapsed .sb-item { justify-content: center; padding: 8px; }

        .sb-footer {
          padding: 12px 8px;
          border-top: 1px solid rgba(255,255,255,0.07);
          flex-shrink: 0;
        }
        .sb-year {
          display: flex; align-items: center; gap: 8px;
          padding: 7px 9px; border-radius: 8px;
          background: rgba(217,119,6,0.15); border: 1px solid rgba(217,119,6,0.25);
          font-size: 11px; font-weight: 600; color: #F59E0B;
          margin-bottom: 6px; overflow: hidden; white-space: nowrap;
          cursor: pointer;
        }
        .sidebar.collapsed .sb-year-name { display: none; }
        .sb-signout {
          display: flex; align-items: center; gap: 8px;
          padding: 7px 9px; border-radius: 8px;
          border: none; background: none; cursor: pointer;
          font-family: 'DM Sans', sans-serif; font-size: 12px;
          color: rgba(255,255,255,0.35); width: 100%; text-align: left;
          transition: all 0.15s; white-space: nowrap; overflow: hidden;
        }
        .sb-signout:hover { background: rgba(239,68,68,0.15); color: #FCA5A5; }
        .sidebar.collapsed .sb-signout span { display: none; }
        .sidebar.collapsed .sb-year { justify-content: center; }

        .collapse-btn {
          display: flex; align-items: center; justify-content: center;
          width: 24px; height: 24px; border-radius: 6px;
          border: none; background: rgba(255,255,255,0.08);
          cursor: pointer; color: rgba(255,255,255,0.4);
          transition: all 0.15s; margin-left: auto; flex-shrink: 0;
        }
        .collapse-btn:hover { background: rgba(255,255,255,0.15); color: #fff; }
        .sidebar.collapsed .collapse-btn { margin-left: 0; transform: rotate(180deg); }

        /* ── Main ── */
        .main { flex: 1; display: flex; flex-direction: column; min-width: 0; overflow: hidden; }

        /* ── Topbar ── */
        .topbar {
          background: rgba(255,255,255,0.95); backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(0,0,0,0.06);
          padding: 0 28px; height: 52px;
          display: flex; align-items: center; justify-content: space-between;
          position: sticky; top: 0; z-index: 30;
        }
        .topbar-left { font-size: 15px; font-weight: 600; color: #1C1C1C; }
        .topbar-right { display: flex; align-items: center; gap: 8px; }
        .nav-user { font-size: 13px; color: #666; padding: 4px 10px; background: rgba(0,0,0,0.04); border-radius: 8px; }

        /* Bell */
        .bell-wrap { position: relative; }
        .bell-btn { display: flex; align-items: center; justify-content: center; width: 34px; height: 34px; background: none; border: none; cursor: pointer; border-radius: 8px; color: #888; transition: all 0.15s; position: relative; }
        .bell-btn:hover { background: rgba(0,0,0,0.05); color: #1A1A1A; }
        .bell-badge { position: absolute; top: 4px; right: 4px; min-width: 16px; height: 16px; background: #EF4444; border-radius: 8px; font-size: 10px; font-weight: 700; color: #fff; display: flex; align-items: center; justify-content: center; padding: 0 3px; }
        .bell-drop { position: absolute; top: calc(100% + 8px); right: 0; width: 300px; background: #fff; border: 1px solid #E5E7EB; border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.12); z-index: 200; overflow: hidden; }
        .bell-drop-head { padding: 12px 16px; border-bottom: 1px solid #F3F4F6; display: flex; align-items: center; justify-content: space-between; }
        .bell-drop-title { font-size: 13px; font-weight: 600; color: #1A1A1A; }
        .bell-drop-clear { font-size: 12px; color: #6B7280; background: none; border: none; cursor: pointer; padding: 2px 6px; border-radius: 5px; font-family: inherit; }
        .bell-drop-clear:hover { background: #F3F4F6; }
        .bell-alert { display: flex; align-items: flex-start; gap: 10px; padding: 10px 16px; border-bottom: 1px solid #F9FAFB; cursor: pointer; transition: background 0.1s; text-decoration: none; }
        .bell-alert:hover { background: #F9FAFB; }
        .bell-alert:last-child { border-bottom: none; }
        .bell-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; margin-top: 4px; }
        .bell-alert-msg { font-size: 13px; color: #374151; line-height: 1.4; }
        .bell-empty { padding: 24px 16px; text-align: center; font-size: 13px; color: #9CA3AF; }

        /* ── Dashboard content ── */
        .dash { max-width: 1100px; margin: 0 auto; padding: 24px 28px; }
        .dash-header { margin-bottom: 20px; }
        .dash-gr { font-size: 20px; font-weight: 600; color: #1C1C1C; letter-spacing: -0.5px; }
        .dash-sub { font-size: 13px; color: #AAA; margin-top: 3px; }

        /* Stat cards */
        .sg { display: grid; grid-template-columns: repeat(4,1fr); gap: 10px; margin-bottom: 20px; }
        .sc { background: #fff; border: 1px solid rgba(0,0,0,0.07); border-radius: 14px; padding: 16px 18px; }
        .sc.alert { border-color: #FCA5A5; background: #FFF5F5; }
        .sc-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
        .sc-ic { width: 28px; height: 28px; border-radius: 8px; background: rgba(0,0,0,0.04); display: flex; align-items: center; justify-content: center; color: #888; }
        .sc-ic.red { background: #FEF2F2; color: #DC2626; }
        .sc-ic.amber { background: #FFF7ED; color: #D97706; }
        .sc-n { font-size: 26px; font-weight: 600; color: #1C1C1C; letter-spacing: -1px; line-height: 1; }
        .sc-l { font-size: 11px; color: #BBB; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.06em; }

        /* Grid */
        .dash-grid { display: grid; grid-template-columns: 1fr 280px; gap: 14px; }
        .dash-col { display: flex; flex-direction: column; gap: 14px; }
        .dcard { background: #fff; border: 1px solid rgba(0,0,0,0.07); border-radius: 14px; padding: 16px 18px; }
        .dcard-head { font-size: 13px; font-weight: 600; color: #1A1A1A; margin-bottom: 2px; display: flex; align-items: center; justify-content: space-between; }
        .dcard-sub { font-size: 11px; color: #AAA; margin-bottom: 12px; }
        .badge { font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 8px; }

        /* Chart */
        .chart-wrap { display: flex; align-items: flex-end; gap: 5px; height: 80px; margin-top: 4px; }
        .chart-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 3px; height: 100%; justify-content: flex-end; }
        .chart-pct { font-size: 9px; color: #888; font-weight: 500; }
        .chart-bar { width: 100%; border-radius: 3px 3px 0 0; transition: height 0.4s; min-height: 3px; }
        .chart-day { font-size: 9px; color: #BBB; text-transform: uppercase; }

        /* At-risk */
        .risk-row { display: flex; align-items: center; gap: 8px; padding: 7px 0; border-bottom: 1px solid #F5F5F3; cursor: pointer; }
        .risk-row:last-child { border-bottom: none; }
        .risk-row:hover { opacity: 0.8; }
        .risk-name { font-size: 13px; font-weight: 500; color: #1A1A1A; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .risk-pct { font-size: 12px; font-weight: 600; width: 34px; text-align: right; flex-shrink: 0; }
        .risk-bar-bg { flex: 1; height: 4px; background: #F0F0EE; border-radius: 2px; overflow: hidden; max-width: 70px; }
        .risk-bar { height: 100%; border-radius: 2px; }
        .empty-dash { padding: 16px 0; text-align: center; font-size: 12px; color: #CCC; }

        /* Sessions */
        .prog-wrap { height: 5px; background: #F0F0EE; border-radius: 3px; overflow: hidden; margin-bottom: 5px; }
        .prog-bar { height: 100%; border-radius: 3px; background: #86EFAC; transition: width 0.4s; }
        .prog-label { font-size: 11px; color: #AAA; margin-bottom: 10px; }
        .sess-item { display: flex; align-items: center; gap: 7px; padding: 5px 0; border-bottom: 1px solid #F8F8F6; }
        .sess-item:last-child { border-bottom: none; }
        .sess-dot { width: 7px; height: 7px; border-radius: 50%; background: #F0F0EE; flex-shrink: 0; }
        .sess-dot.done { background: #86EFAC; }
        .sess-name { font-size: 12px; color: #333; flex: 1; }
        .sess-class { font-size: 10px; color: #AAA; }

        /* Prayers */
        .prayer-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 5px; }
        .prayer-pill { border-radius: 8px; padding: 7px 5px; text-align: center; border: 1px solid #EFEFED; background: #FAFAF8; }
        .prayer-pill.marked { background: #F0FDF4; border-color: #BBF7D0; }
        .prayer-pname { font-size: 10px; font-weight: 500; color: #555; }
        .prayer-count { font-size: 12px; font-weight: 600; color: #1A1A1A; margin-top: 1px; }
        .prayer-pill.marked .prayer-count { color: #15803D; }

        .clean-big { font-size: 26px; font-weight: 600; color: #1A1A1A; letter-spacing: -1px; line-height: 1; margin-bottom: 5px; }

        @media (max-width: 900px) {
          .sidebar { display: none; }
          .dash-grid { grid-template-columns: 1fr; }
          .sg { grid-template-columns: repeat(2,1fr); }
          .dash { padding: 16px; }
        }
      `}</style>

      {/* ── Sidebar ── */}
      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sb-brand">
          <div className="sb-dot" />
          <span className="sb-name">{appName}</span>
          <button className="collapse-btn" onClick={() => setSidebarCollapsed(v => !v)}>
            {I.chevron}
          </button>
        </div>

        <nav className="sb-nav">
          {NAV_GROUPS.map(group => (
            <div key={group.label} className="sb-group">
              <div className="sb-group-label">{group.label}</div>
              {group.items.map(item => (
                <button
                  key={item.id}
                  className={`sb-item ${item.id === 'dashboard' ? 'active' : ''}`}
                  onClick={() => handleNav(item)}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  {(I as any)[item.icon]}
                  <span className="sb-item-label">{item.label}</span>
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="sb-footer">
          {activeYear && (
            <div className="sb-year" onClick={() => router.push('/admin/academic-year')} title={sidebarCollapsed ? activeYear.name : undefined}>
              {I.year}
              <span className="sb-year-name">{activeYear.name}</span>
            </div>
          )}
          <button className="sb-signout" onClick={async () => { await supabase.auth.signOut(); router.push('/') }} title={sidebarCollapsed ? 'Sign out' : undefined}>
            {I.logout}
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="main">

        {/* Topbar */}
        <div className="topbar">
          <span className="topbar-left">Dashboard</span>
          <div className="topbar-right">
            {/* Alerts bell */}
            <div className="bell-wrap">
              <button className="bell-btn" onClick={() => setShowAlerts(v => !v)}>
                {I.bell}
                {alerts.length > 0 && <span className="bell-badge">{alerts.length}</span>}
              </button>
              {showAlerts && (
                <>
                  <div style={{ position:'fixed', inset:0, zIndex:150 }} onClick={() => setShowAlerts(false)} />
                  <div className="bell-drop" style={{ zIndex:200 }}>
                    <div className="bell-drop-head">
                      <span className="bell-drop-title">Alerts {alerts.length > 0 && `(${alerts.length})`}</span>
                      {alerts.length > 0 && <button className="bell-drop-clear" onClick={() => { setAlerts([]); setShowAlerts(false) }}>Dismiss all</button>}
                    </div>
                    {alerts.length === 0
                      ? <div className="bell-empty">All clear</div>
                      : alerts.map((a, i) => (
                        <a key={i} className="bell-alert" href={a.href} onClick={() => setShowAlerts(false)}>
                          <div className="bell-dot" style={{ background: a.sev==='crit'?'#EF4444':a.sev==='warn'?'#F59E0B':'#3B82F6' }} />
                          <span className="bell-alert-msg">{a.msg}</span>
                        </a>
                      ))
                    }
                  </div>
                </>
              )}
            </div>
            <span className="nav-user">{userName}</span>
          </div>
        </div>

        {/* Dashboard content */}
        <div className="dash">
          <div className="dash-header">
            <h1 className="dash-gr">{greeting()}, {userName.split(' ')[0]}</h1>
            <p className="dash-sub">{todayName} · {dateStr}</p>
          </div>

          {/* Stats */}
          <div className="sg">
            <div className="sc">
              <div className="sc-top"><div className="sc-ic">{I.learners}</div></div>
              <div className="sc-n">{stats.learners}</div>
              <div className="sc-l">Active Learners</div>
            </div>
            <div className="sc">
              <div className="sc-top"><div className="sc-ic">{I.timetable}</div></div>
              <div className="sc-n">{sessionsCov.marked}<span style={{ fontSize:16, fontWeight:400, color:'#CCC' }}>/{sessionsCov.total}</span></div>
              <div className="sc-l">Sessions Today</div>
            </div>
            <div className={`sc ${atRisk.length > 0 ? 'alert' : ''}`}>
              <div className="sc-top"><div className={`sc-ic ${atRisk.length > 0 ? 'red' : ''}`}>{I.warning}</div></div>
              <div className="sc-n" style={{ color: atRisk.length > 0 ? '#DC2626' : '#1C1C1C' }}>{atRisk.length}</div>
              <div className="sc-l">At Risk</div>
            </div>
            <div className={`sc ${docIssues > 0 ? 'alert' : ''}`}>
              <div className="sc-top"><div className={`sc-ic ${docIssues > 0 ? 'amber' : ''}`}>{I.docs}</div></div>
              <div className="sc-n" style={{ color: docIssues > 0 ? '#D97706' : '#1C1C1C' }}>{docIssues}</div>
              <div className="sc-l">Doc Issues</div>
            </div>
          </div>

          {dashLoading ? (
            <div style={{ textAlign:'center', padding:'60px 0', color:'#CCC', fontSize:13 }}>Loading analytics...</div>
          ) : (
            <div className="dash-grid">
              <div className="dash-col">

                {/* 7-day chart */}
                <div className="dcard">
                  <div className="dcard-head">7-Day Attendance</div>
                  <div className="dcard-sub">Daily % present across all sessions</div>
                  <div className="chart-wrap">
                    {weeklyAtt.map(d => (
                      <div key={d.date} className="chart-col">
                        <span className="chart-pct">{d.pct !== null ? d.pct+'%' : ''}</span>
                        <div className="chart-bar" style={{ height: d.pct !== null ? `${d.pct}%` : '3px', background: d.pct === null ? '#F0F0EE' : d.pct < atRiskThreshold ? '#FCA5A5' : d.pct < 85 ? '#FCD34D' : '#86EFAC' }} />
                        <span className="chart-day">{d.day}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* At-risk */}
                <div className="dcard">
                  <div className="dcard-head">
                    At Risk
                    <span className="badge" style={{ background: atRisk.length > 0 ? '#FEF2F2' : '#F0FDF4', color: atRisk.length > 0 ? '#DC2626' : '#15803D' }}>
                      {atRisk.length > 0 ? atRisk.length+' learners' : '✓ All clear'}
                    </span>
                  </div>
                  <div className="dcard-sub">Below {atRiskThreshold}% attendance · last 30 days</div>
                  {atRisk.length === 0
                    ? <div className="empty-dash">No learners below threshold</div>
                    : atRisk.map(l => (
                      <div key={l.id} className="risk-row" onClick={() => router.push('/admin/learners/'+l.id)}>
                        <span className="risk-name">{l.name}</span>
                        <span className="risk-pct" style={{ color: l.pct < 50 ? '#DC2626' : '#D97706' }}>{l.pct}%</span>
                        <div className="risk-bar-bg"><div className="risk-bar" style={{ width: l.pct+'%', background: l.pct < 50 ? '#FCA5A5' : '#FCD34D' }} /></div>
                      </div>
                    ))
                  }
                </div>

              </div>
              <div className="dash-col">

                {/* Sessions */}
                <div className="dcard">
                  <div className="dcard-head">Today's Sessions</div>
                  <div className="dcard-sub">{todayName}</div>
                  {sessionsCov.list.length === 0
                    ? <div className="empty-dash">No sessions today</div>
                    : <>
                        <div className="prog-wrap"><div className="prog-bar" style={{ width: sessionsCov.total > 0 ? (sessionsCov.marked/sessionsCov.total*100)+'%' : '0%' }} /></div>
                        <div className="prog-label">{sessionsCov.marked} of {sessionsCov.total} marked</div>
                        {sessionsCov.list.map((s: any) => (
                          <div key={s.id} className="sess-item">
                            <div className={`sess-dot ${s.marked ? 'done' : ''}`} />
                            <span className="sess-name">{s.name}</span>
                            <span className="sess-class">{(s.classes as any)?.name}</span>
                          </div>
                        ))}
                      </>
                  }
                </div>

                {/* Prayers */}
                {prayerStats.length > 0 && (
                  <div className="dcard">
                    <div className="dcard-head">Today's Prayers</div>
                    <div className="dcard-sub">Present / total learners</div>
                    <div className="prayer-grid">
                      {prayerStats.map(p => (
                        <div key={p.id} className={`prayer-pill ${p.marked ? 'marked' : ''}`}>
                          <div className="prayer-pname">{p.name}</div>
                          <div className="prayer-count">{p.present}<span style={{ fontSize:10, fontWeight:400, color:'#AAA' }}>/{p.total}</span></div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Cleaning */}
                <div className="dcard">
                  <div className="dcard-head">Cleaning Today</div>
                  <div className="dcard-sub">Locations completed</div>
                  <div className="clean-big">{cleaningToday.done}<span style={{ fontSize:16, fontWeight:400, color:'#CCC' }}>/{cleaningToday.total}</span></div>
                  <div className="prog-wrap"><div className="prog-bar" style={{ width: cleaningToday.total > 0 ? (cleaningToday.done/cleaningToday.total*100)+'%' : '0%' }} /></div>
                </div>

              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}