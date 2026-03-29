'use client'
import { useEffect, useState } from 'react'
import { createClient } from '../lib/supabase'
import { useRouter } from 'next/navigation'

const supabase = createClient()

const Icons = {
  learners:   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  classes:    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  staff:      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  timetable:  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  islamic:    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/><path d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3"/></svg>,
  reports:    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  import:     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
  settings:   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  logout:     <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  arrow:      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>,
  year:       <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  curriculum: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>,
  cleaning:   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>,
  warning:    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  docs:       <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
  check:      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
}

type YearSummary = { id: string; name: string; start_date: string; end_date: string; is_active: boolean; is_archived: boolean; total_learners?: number; active?: number; transferred?: number; retained?: number; graduated?: number; withdrawn?: number }
type Enrollment  = { id: string; learner_id: string; class_id: string; enrollment_status: string; year_end_note: string | null; learner_name: string; class_name: string }
type PrayerStat  = { id: string; name: string; present: number; total: number; marked: boolean }
type WeekDay     = { date: string; day: string; pct: number | null; present: number; total: number }
type AtRiskRow   = { id: string; name: string; pct: number; total: number }

const STATUS_OPTIONS = [
  { key: 'active',      label: 'Active',       color: '#15803D', bg: '#F0FDF4' },
  { key: 'completed',   label: 'Completed',    color: '#1D4ED8', bg: '#EFF6FF' },
  { key: 'retained',    label: 'Retained',     color: '#A16207', bg: '#FEFCE8' },
  { key: 'transferred', label: 'Transferred',  color: '#7E22CE', bg: '#FDF4FF' },
  { key: 'graduated',   label: 'Graduated',    color: '#0E7490', bg: '#ECFEFF' },
  { key: 'withdrawn',   label: 'Withdrawn',    color: '#DC2626', bg: '#FEF2F2' },
]
const TRANSFER_TYPES = [
  { key: 'school', label: 'Another School' }, { key: 'course', label: 'Course / Centre' },
  { key: 'program', label: 'Other Program' }, { key: 'graduated', label: 'Graduated' },
  { key: 'withdrawn', label: 'Own Request' }, { key: 'other', label: 'Other' },
]

export default function AdminDashboard() {
  const router = useRouter()

  // UI
  const [activeTab, setActiveTab] = useState<'dashboard' | 'setup'>('dashboard')

  // Base
  const [userName, setUserName]   = useState('')
  const [appName, setAppName]     = useState('Learner Monitor')
  const [stats, setStats]         = useState({ learners: 0, teachers: 0, classes: 0, islamic_teachers: 0 })
  const [atRiskThreshold, setAtRiskThreshold] = useState(75)

  // Dashboard analytics
  const [dashLoading, setDashLoading] = useState(true)
  const [weeklyAtt, setWeeklyAtt]     = useState<WeekDay[]>([])
  const [atRisk, setAtRisk]           = useState<AtRiskRow[]>([])
  const [sessionsCov, setSessionsCov] = useState<{ total: number; marked: number; list: any[] }>({ total: 0, marked: 0, list: [] })
  const [prayerStats, setPrayerStats] = useState<PrayerStat[]>([])
  const [cleaningToday, setCleaningToday] = useState({ done: 0, total: 0 })
  const [docIssues, setDocIssues]     = useState(0)

  // Year panel
  const [activeYear, setActiveYear]   = useState<YearSummary | null>(null)
  const [allYears, setAllYears]       = useState<YearSummary[]>([])
  const [yearPanel, setYearPanel]     = useState(false)
  const [yearView, setYearView]       = useState<'overview' | 'learners' | 'archive' | 'compare'>('overview')
  const [newName, setNewName]         = useState('')
  const [newStart, setNewStart]       = useState('')
  const [newEnd, setNewEnd]           = useState('')
  const [archiving, setArchiving]     = useState(false)
  const [archiveResult, setArchiveResult] = useState<any>(null)
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [enrollLoading, setEnrollLoading] = useState(false)
  const [statusFilter, setStatusFilter]   = useState('all')
  const [transferTarget, setTransferTarget] = useState<Enrollment | null>(null)
  const [tType, setTType] = useState('school')
  const [tDest, setTDest] = useState('')
  const [tCity, setTCity] = useState('')
  const [tNote, setTNote] = useState('')
  const [tSaving, setTSaving] = useState(false)
  const [cmpA, setCmpA]     = useState('')
  const [cmpB, setCmpB]     = useState('')
  const [cmpData, setCmpData]     = useState<any>(null)
  const [cmpLoading, setCmpLoading] = useState(false)

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }
    const { data: u } = await supabase.from('users').select('full_name, role').eq('auth_id', user.id).single()
    if (u?.role !== 'admin') { router.push('/'); return }
    setUserName(u.full_name)

    const [{ data: appS }, { data: riskS }, { count: lc }, { count: tc }, { count: ic }, { count: cc }] = await Promise.all([
      supabase.from('settings').select('value').eq('key', 'app_name').single(),
      supabase.from('settings').select('value').eq('key', 'at_risk_threshold').single(),
      supabase.from('learners').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'teacher'),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'islamic_teacher'),
      supabase.from('classes').select('*', { count: 'exact', head: true }),
    ])
    if (appS) setAppName(appS.value)
    const threshold = riskS ? parseInt(riskS.value) || 75 : 75
    setAtRiskThreshold(threshold)
    setStats({ learners: lc || 0, teachers: tc || 0, classes: cc || 0, islamic_teachers: ic || 0 })

    await Promise.all([loadYears(), loadDashboard(threshold)])
  }

  async function loadDashboard(threshold: number) {
    setDashLoading(true)
    const today = new Date().toISOString().split('T')[0]
    const dayNum = new Date().getDay() === 0 ? 7 : new Date().getDay()
    const last7: string[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i)
      last7.push(d.toISOString().split('T')[0])
    }
    const d30 = new Date(); d30.setDate(d30.getDate() - 30)
    const thirtyDaysAgo = d30.toISOString().split('T')[0]

    const [
      { data: sessions },
      { data: todayAtt },
      { data: weekAtt },
      { data: monthAtt },
      { data: prayerActs },
      { data: prayerAtt },
      { data: cleanLocs },
      { data: cleanLogs },
      { data: docTypes },
      { data: learnerDocs },
      { data: learnersList },
    ] = await Promise.all([
      supabase.from('timetable').select('id, name, classes(name, class_type)').eq('day_of_week', dayNum),
      supabase.from('attendance').select('timetable_id').eq('attendance_date', today),
      supabase.from('attendance').select('attendance_date, status').in('attendance_date', last7),
      supabase.from('attendance').select('learner_id, status, learners(id, full_name)').gte('attendance_date', thirtyDaysAgo),
      supabase.from('daily_activities').select('id, name, order_num').eq('is_salaah', true).eq('is_active', true).order('order_num'),
      supabase.from('activity_attendance').select('activity_id, learner_id, status').eq('activity_date', today),
      supabase.from('cleaning_locations').select('id').eq('is_active', true),
      supabase.from('cleaning_logs').select('location_id, status').eq('log_date', today),
      supabase.from('document_types').select('id').eq('is_active', true),
      supabase.from('learner_documents').select('learner_id, submitted'),
      supabase.from('learners').select('id').eq('is_active', true),
    ])

    // Session coverage
    const markedIds = new Set((todayAtt || []).map((r: any) => r.timetable_id))
    const sessionList = (sessions || []).map((s: any) => ({ ...s, marked: markedIds.has(s.id) }))
    setSessionsCov({ total: sessionList.length, marked: sessionList.filter((s: any) => s.marked).length, list: sessionList })

    // Weekly chart
    const WDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const dateMap: Record<string, { present: number; total: number }> = {}
    last7.forEach(d => { dateMap[d] = { present: 0, total: 0 } })
    ;(weekAtt || []).forEach((r: any) => {
      if (dateMap[r.attendance_date]) {
        dateMap[r.attendance_date].total++
        if (r.status === 'present') dateMap[r.attendance_date].present++
      }
    })
    setWeeklyAtt(last7.map(d => ({
      date: d, day: WDAYS[new Date(d + 'T12:00:00').getDay()],
      ...dateMap[d],
      pct: dateMap[d].total > 0 ? Math.round(dateMap[d].present / dateMap[d].total * 100) : null,
    })))

    // At-risk
    const lMap: Record<string, { name: string; present: number; total: number }> = {}
    ;(monthAtt || []).forEach((r: any) => {
      if (!r.learner_id) return
      if (!lMap[r.learner_id]) lMap[r.learner_id] = { name: (r.learners as any)?.full_name || '—', present: 0, total: 0 }
      lMap[r.learner_id].total++
      if (r.status === 'present') lMap[r.learner_id].present++
    })
    setAtRisk(
      Object.entries(lMap)
        .map(([id, s]) => ({ id, ...s, pct: s.total > 0 ? Math.round(s.present / s.total * 100) : 100 }))
        .filter(l => l.pct < threshold && l.total >= 3)
        .sort((a, b) => a.pct - b.pct)
        .slice(0, 10)
    )

    // Prayers
    const totalL = (learnersList || []).length
    const pMap: Record<string, { present: number; records: number }> = {}
    ;(prayerActs || []).forEach((a: any) => { pMap[a.id] = { present: 0, records: 0 } })
    ;(prayerAtt || []).forEach((r: any) => {
      if (pMap[r.activity_id]) {
        pMap[r.activity_id].records++
        if (r.status === 'present') pMap[r.activity_id].present++
      }
    })
    setPrayerStats((prayerActs || []).map((a: any) => ({
      id: a.id, name: a.name,
      present: pMap[a.id]?.present || 0,
      total: totalL,
      marked: (pMap[a.id]?.records || 0) > 0,
    })))

    // Cleaning
    const totalLocs = (cleanLocs || []).length
    const doneLocs = new Set((cleanLogs || []).filter((l: any) => l.status === 'done').map((l: any) => l.location_id)).size
    setCleaningToday({ done: doneLocs, total: totalLocs })

    // Doc issues
    const totalDocTypes = (docTypes || []).length
    let issues = 0
    ;(learnersList || []).forEach((l: any) => {
      const sub = (learnerDocs || []).filter((d: any) => d.learner_id === l.id && d.submitted).length
      if (sub < totalDocTypes) issues++
    })
    setDocIssues(issues)

    setDashLoading(false)
  }

  async function loadYears() {
    const { data, error } = await supabase.from('vw_year_summary').select('*').order('start_date', { ascending: false })
    if (!error && data?.length) { setAllYears(data); setActiveYear(data.find((y: any) => y.is_active) || null) }
    else {
      const { data: raw } = await supabase.from('academic_years').select('*').order('start_date', { ascending: false })
      setAllYears(raw || []); setActiveYear((raw || []).find((y: any) => y.is_active) || null)
    }
  }

  async function loadEnrollments() {
    if (!activeYear) return
    setEnrollLoading(true)
    const { data } = await supabase.from('learner_classes')
      .select('id, learner_id, class_id, enrollment_status, year_end_note, learners(full_name), classes(name)')
      .eq('academic_year_id', activeYear.id).order('enrollment_status')
    setEnrollments((data || []).map((r: any) => ({ id: r.id, learner_id: r.learner_id, class_id: r.class_id, enrollment_status: r.enrollment_status || 'active', year_end_note: r.year_end_note, learner_name: r.learners?.full_name || '—', class_name: r.classes?.name || '—' })))
    setEnrollLoading(false)
  }

  async function doArchive() {
    if (!activeYear || !newName || !newStart || !newEnd) return
    setArchiving(true)
    const { data, error } = await supabase.rpc('archive_academic_year', { p_year_id: activeYear.id, p_new_year_name: newName, p_new_start: newStart, p_new_end: newEnd })
    if (error) { alert('Error: ' + error.message); setArchiving(false); return }
    setArchiveResult(data); await loadYears(); setArchiving(false)
  }

  async function createFirstYear() {
    if (!newName.trim() || !newStart || !newEnd) return
    setArchiving(true)
    const { data, error } = await supabase.from('academic_years').insert({ name: newName.trim(), start_date: newStart, end_date: newEnd, is_active: true }).select().single()
    if (error) { alert('Error: ' + error.message); setArchiving(false); return }
    await supabase.from('settings').upsert({ key: 'active_academic_year_id', value: data.id }, { onConflict: 'key' })
    const tables = ['learner_classes','attendance','activity_attendance','curriculum_progress','curriculum_terms','exams','homework_assignments','notes','learner_islamic_progress','learner_topic_progress','learner_surahs','learner_duas','cleaning_assignments','cleaning_logs','sessions']
    for (const t of tables) { await supabase.from(t).update({ academic_year_id: data.id }).is('academic_year_id', null) }
    setArchiveResult({ message: `"${data.name}" created and activated. All existing data linked.` })
    await loadYears(); setArchiving(false)
  }

  async function updateStatus(enrollId: string, learnerId: string, status: string) {
    await supabase.rpc('set_learner_year_status', { p_learner_id: learnerId, p_year_id: activeYear?.id, p_status: status })
    setEnrollments(prev => prev.map(e => e.id === enrollId ? { ...e, enrollment_status: status } : e))
  }

  async function saveTransfer() {
    if (!transferTarget || !activeYear) return
    setTSaving(true)
    await supabase.from('learner_transfers').insert({ learner_id: transferTarget.learner_id, academic_year_id: activeYear.id, from_class_id: transferTarget.class_id, transfer_type: tType, destination_name: tDest || null, destination_city: tCity || null, notes: tNote || null, transfer_date: new Date().toISOString().split('T')[0] })
    await updateStatus(transferTarget.id, transferTarget.learner_id, 'transferred')
    setTransferTarget(null); setTDest(''); setTCity(''); setTNote(''); setTSaving(false)
  }

  async function doCompare() {
    if (!cmpA || !cmpB) return
    setCmpLoading(true)
    const nA = allYears.find(y => y.id === cmpA)?.name || ''
    const nB = allYears.find(y => y.id === cmpB)?.name || ''
    const [{ data: att }, { data: curr }] = await Promise.all([
      supabase.from('vw_attendance_by_year').select('*').in('year_name', [nA, nB]),
      supabase.from('vw_curriculum_by_year').select('*').in('year_name', [nA, nB]),
    ])
    setCmpData({ yearA: allYears.find(y => y.id === cmpA), yearB: allYears.find(y => y.id === cmpB), attendance: att || [], curriculum: curr || [] })
    setCmpLoading(false)
  }

  function greeting() {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  function fmtDate(d: string) { return new Date(d).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) }

  const WEEKDAYS = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  const todayName = WEEKDAYS[new Date().getDay() === 0 ? 7 : new Date().getDay()]
  const dateStr   = new Date().toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' })
  const filtered  = statusFilter === 'all' ? enrollments : enrollments.filter(e => e.enrollment_status === statusFilter)

  const setupGroups = [
    {
      label: 'People',
      items: [
        { title: 'Staff',     desc: 'Teachers, Islamic Teachers & Baskans', href: '/admin/teachers', icon: Icons.staff },
        { title: 'Learners',  desc: 'Profiles, documents & classes',        href: '/admin/learners', icon: Icons.learners },
      ],
    },
    {
      label: 'Academics',
      items: [
        { title: 'Classes',           desc: 'Islamic & secular classes',    href: '/admin/classes',    icon: Icons.classes },
        { title: 'Timetable',         desc: 'Weekly session schedule',      href: '/admin/sessions',   icon: Icons.timetable },
        { title: 'Curriculum',        desc: 'Subjects, topics & materials', href: '/admin/curriculum', icon: Icons.curriculum },
        { title: 'Islamic Education', desc: 'Quraan, Duas & subjects',      href: '/admin/islamic',    icon: Icons.islamic },
      ],
    },
    {
      label: 'Operations',
      items: [
        { title: 'Cleaning',      desc: 'Locations, checklists & rosters', href: '/admin/cleaning', icon: Icons.cleaning },
        { title: 'Quick Import',  desc: 'Bulk add learners & data',        href: '/admin/import',   icon: Icons.import },
      ],
    },
    {
      label: 'System',
      items: [
        { title: 'Settings',      desc: 'App name, thresholds & config', href: '/admin/settings', icon: Icons.settings },
        { title: 'Academic Year', desc: activeYear?.name || 'No active year', href: '#', icon: Icons.year, action: () => setYearPanel(true) },
      ],
    },
  ]

  return (
    <main style={{ minHeight: '100vh', background: '#F5F4F0', fontFamily: "'DM Sans',-apple-system,sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }

        /* ── Nav ── */
        .nav { background:rgba(255,255,255,0.95); backdrop-filter:blur(12px); border-bottom:1px solid rgba(0,0,0,0.06); padding:0 32px; height:52px; display:flex; align-items:center; justify-content:space-between; position:sticky; top:0; z-index:50; }
        .nav-brand { display:flex; align-items:center; gap:9px; }
        .nav-dot { width:8px; height:8px; background:#D97706; border-radius:50%; }
        .nav-title { font-size:15px; font-weight:600; color:#1C1C1C; letter-spacing:-0.3px; }
        .nav-right { display:flex; align-items:center; gap:8px; }
        .nav-user { font-size:13px; color:#666; padding:4px 10px; background:rgba(0,0,0,0.04); border-radius:8px; }
        .nav-logout { display:flex; align-items:center; gap:5px; font-size:13px; color:#888; background:none; border:none; cursor:pointer; padding:5px 10px; border-radius:8px; transition:all 0.15s; font-family:inherit; }
        .nav-logout:hover { background:#FEE2E2; color:#DC2626; }
        .year-chip { display:inline-flex; align-items:center; gap:5px; background:#FFF7ED; border:1px solid #FED7AA; border-radius:8px; padding:4px 10px 4px 8px; font-size:11px; font-weight:600; color:#C2410C; cursor:pointer; transition:all 0.15s; white-space:nowrap; font-family:inherit; border-width:1px; }
        .year-chip:hover { background:#FEF3C7; border-color:#F59E0B; }
        .caret { transition:transform 0.2s; display:inline-block; }
        .caret.open { transform:rotate(180deg); }

        /* ── Main tabs ── */
        .main-tabs { display:flex; gap:0; padding:0 32px; border-bottom:1px solid rgba(0,0,0,0.06); background:#fff; }
        .main-tab { padding:12px 18px; border:none; background:none; font-size:13px; font-weight:500; color:#999; cursor:pointer; font-family:inherit; border-bottom:2px solid transparent; transition:all 0.15s; }
        .main-tab:hover { color:#555; }
        .main-tab.on { color:#1A1A1A; border-bottom-color:#1A1A1A; }

        /* ── Year side panel ── */
        .overlay { position:fixed; inset:0; background:rgba(0,0,0,0.25); z-index:60; backdrop-filter:blur(2px); }
        .sp { position:fixed; top:0; right:0; bottom:0; width:min(500px,100vw); background:#fff; z-index:70; display:flex; flex-direction:column; box-shadow:-12px 0 40px rgba(0,0,0,0.12); }
        .sp-top { display:flex; align-items:center; justify-content:space-between; padding:16px 20px; border-bottom:1px solid #EFEFED; flex-shrink:0; }
        .sp-h { font-size:14px; font-weight:600; color:#1A1A1A; display:flex; align-items:center; gap:7px; }
        .sp-x { background:none; border:none; cursor:pointer; color:#AAA; padding:5px; border-radius:7px; line-height:0; }
        .sp-x:hover { background:#F5F5F3; color:#333; }
        .sp-tabs { display:flex; padding:10px 20px 0; border-bottom:1px solid #EFEFED; gap:2px; flex-shrink:0; overflow-x:auto; scrollbar-width:none; }
        .sp-tabs::-webkit-scrollbar { display:none; }
        .stab { padding:7px 13px; border-radius:8px 8px 0 0; border:none; background:none; font-size:12px; font-weight:500; color:#888; cursor:pointer; font-family:inherit; white-space:nowrap; border-bottom:2px solid transparent; transition:all 0.15s; }
        .stab:hover { color:#555; }
        .stab.on { color:#1A1A1A; border-bottom-color:#1A1A1A; background:#F8F8F6; }
        .sp-body { flex:1; overflow-y:auto; padding:20px; }
        .ycard { border:1px solid #EFEFED; border-radius:12px; padding:14px 16px; margin-bottom:10px; }
        .ycard.act { border-color:#FED7AA; background:#FFFBF5; }
        .ycard.arc { background:#FAFAF8; opacity:0.75; }
        .yc-h { display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; gap:8px; }
        .yc-n { font-size:14px; font-weight:600; color:#1A1A1A; display:flex; align-items:center; gap:7px; }
        .ba  { font-size:9px; font-weight:700; background:#D97706; color:#fff; padding:2px 7px; border-radius:5px; text-transform:uppercase; }
        .bar { font-size:9px; font-weight:600; background:#F0F0EE; color:#AAA; padding:2px 7px; border-radius:5px; text-transform:uppercase; }
        .yc-d { font-size:11px; color:#AAA; white-space:nowrap; }
        .yc-g { display:grid; grid-template-columns:repeat(3,1fr); gap:6px; }
        .ycs { background:#F8F8F6; border-radius:8px; padding:8px; text-align:center; }
        .ycs-n { font-size:18px; font-weight:600; }
        .ycs-l { font-size:9px; color:#AAA; text-transform:uppercase; letter-spacing:0.04em; margin-top:1px; }
        .ibox { background:#FFF7ED; border:1px solid #FED7AA; border-radius:10px; padding:12px 14px; margin-bottom:16px; font-size:12px; color:#92400E; line-height:1.6; }
        .wbox { background:#FEF2F2; border:1px solid #FCA5A5; border-radius:10px; padding:10px 12px; margin-bottom:14px; font-size:12px; color:#DC2626; }
        .sbox { background:#F0FDF4; border:1px solid #BBF7D0; border-radius:10px; padding:14px; margin-bottom:14px; }
        .sbox-t { font-size:13px; font-weight:600; color:#15803D; margin-bottom:3px; }
        .sbox-m { font-size:12px; color:#166534; }
        .fl { font-size:10px; font-weight:500; color:#888; text-transform:uppercase; letter-spacing:0.04em; margin-bottom:5px; display:block; }
        .fi { width:100%; height:36px; border:1px solid #EFEFED; border-radius:8px; padding:0 10px; font-size:13px; font-family:inherit; color:#1A1A1A; background:#fff; outline:none; }
        .fi:focus { border-color:#1A1A1A; }
        .fi::placeholder { color:#CCC; }
        .fr { margin-bottom:12px; }
        .fr2 { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:12px; }
        .bp { width:100%; padding:10px; background:#1A1A1A; color:#fff; border:none; border-radius:9px; font-size:13px; font-weight:600; cursor:pointer; font-family:inherit; }
        .bp:disabled { opacity:0.45; cursor:not-allowed; }
        .bp.rd { background:#DC2626; }
        .bs { padding:8px 14px; border:1px solid #EFEFED; border-radius:8px; background:#fff; font-size:12px; cursor:pointer; font-family:inherit; color:#666; }
        .frow-f { display:flex; gap:5px; flex-wrap:wrap; margin-bottom:14px; }
        .fp { padding:4px 10px; border-radius:7px; border:1px solid #EFEFED; background:#fff; font-size:11px; font-weight:500; cursor:pointer; font-family:inherit; color:#666; transition:all 0.15s; }
        .fp.on { background:#1A1A1A; color:#fff; border-color:#1A1A1A; }
        .er { display:flex; align-items:center; gap:10px; padding:9px 0; border-bottom:1px solid #F5F5F3; }
        .er:last-child { border-bottom:none; }
        .en { font-size:13px; font-weight:500; color:#1A1A1A; flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .ec { font-size:10px; color:#AAA; }
        .ss { height:28px; border:1px solid #EFEFED; border-radius:7px; padding:0 6px; font-size:11px; font-family:inherit; background:#fff; outline:none; cursor:pointer; flex-shrink:0; }
        .tb { font-size:10px; color:#7E22CE; background:none; border:none; cursor:pointer; font-family:inherit; padding:0; }
        .tb:hover { text-decoration:underline; }
        .cs { display:grid; grid-template-columns:1fr auto 1fr; gap:8px; align-items:center; margin-bottom:14px; }
        .cv { font-size:12px; color:#AAA; text-align:center; }
        .ys { height:36px; border:1px solid #EFEFED; border-radius:8px; padding:0 10px; font-size:12px; font-family:inherit; background:#fff; outline:none; width:100%; }
        .st { font-size:10px; font-weight:700; color:#AAA; text-transform:uppercase; letter-spacing:0.06em; margin:16px 0 8px; }
        .ct { width:100%; border-collapse:collapse; font-size:12px; }
        .ct th { padding:7px 10px; text-align:left; font-size:10px; font-weight:600; color:#AAA; text-transform:uppercase; letter-spacing:0.05em; border-bottom:1px solid #EFEFED; background:#FAFAF8; }
        .ct td { padding:8px 10px; border-bottom:1px solid #F5F5F3; }
        .ct tr:last-child td { border-bottom:none; }
        .bt { color:#15803D; font-weight:600; }
        .ws { color:#DC2626; }

        /* ── Transfer modal ── */
        .mw { position:fixed; inset:0; background:rgba(0,0,0,0.4); z-index:100; display:flex; align-items:center; justify-content:center; padding:20px; }
        .mo { background:#fff; border-radius:16px; padding:22px; width:100%; max-width:400px; }
        .mo-t { font-size:15px; font-weight:600; color:#1A1A1A; margin-bottom:2px; }
        .mo-s { font-size:12px; color:#AAA; margin-bottom:18px; }
        .tg { display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-bottom:14px; }
        .tb2 { padding:8px 10px; border-radius:8px; border:2px solid #EFEFED; background:#fff; cursor:pointer; font-size:11px; font-weight:500; font-family:inherit; text-align:left; transition:all 0.15s; }
        .tb2.on { border-color:#7E22CE; background:#FDF4FF; color:#7E22CE; }
        .ma { display:flex; gap:8px; justify-content:flex-end; margin-top:16px; }

        /* ── Dashboard page ── */
        .dash { max-width:1100px; margin:0 auto; padding:28px 32px; }
        .dash-header { margin-bottom:24px; }
        .dash-gr { font-size:22px; font-weight:600; color:#1C1C1C; letter-spacing:-0.5px; }
        .dash-sub { font-size:13px; color:#AAA; margin-top:3px; }

        /* ── Stat cards ── */
        .sg { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-bottom:24px; }
        .sc { background:#fff; border:1px solid rgba(0,0,0,0.07); border-radius:14px; padding:18px 20px; }
        .sc.alert { border-color:#FCA5A5; background:#FFF5F5; }
        .sc-top { display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; }
        .sc-ic { width:30px; height:30px; border-radius:8px; background:rgba(0,0,0,0.04); display:flex; align-items:center; justify-content:center; color:#888; }
        .sc-ic.red { background:#FEF2F2; color:#DC2626; }
        .sc-ic.amber { background:#FFF7ED; color:#D97706; }
        .sc-n { font-size:28px; font-weight:600; color:#1C1C1C; letter-spacing:-1px; line-height:1; }
        .sc-l { font-size:11px; color:#BBB; margin-top:4px; text-transform:uppercase; letter-spacing:0.06em; }

        /* ── Dashboard grid ── */
        .dash-grid { display:grid; grid-template-columns:1fr 300px; gap:16px; }
        .dash-col { display:flex; flex-direction:column; gap:16px; }

        /* ── Dash cards ── */
        .dcard { background:#fff; border:1px solid rgba(0,0,0,0.07); border-radius:14px; padding:18px 20px; }
        .dcard-head { font-size:13px; font-weight:600; color:#1A1A1A; margin-bottom:2px; display:flex; align-items:center; justify-content:space-between; }
        .dcard-sub { font-size:11px; color:#AAA; margin-bottom:14px; }
        .badge { font-size:10px; font-weight:600; padding:2px 8px; border-radius:8px; }

        /* ── Weekly chart ── */
        .chart-wrap { display:flex; align-items:flex-end; gap:6px; height:90px; margin-top:6px; }
        .chart-col { flex:1; display:flex; flex-direction:column; align-items:center; gap:3px; height:100%; justify-content:flex-end; }
        .chart-pct { font-size:9px; color:#888; font-weight:500; }
        .chart-bar { width:100%; border-radius:4px 4px 0 0; transition:height 0.4s; min-height:3px; }
        .chart-day { font-size:9px; color:#BBB; text-transform:uppercase; letter-spacing:0.03em; }

        /* ── At-risk list ── */
        .risk-row { display:flex; align-items:center; gap:8px; padding:8px 0; border-bottom:1px solid #F5F5F3; cursor:pointer; transition:background 0.1s; }
        .risk-row:last-child { border-bottom:none; }
        .risk-row:hover { opacity:0.8; }
        .risk-name { font-size:13px; font-weight:500; color:#1A1A1A; flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .risk-pct { font-size:12px; font-weight:600; width:36px; text-align:right; flex-shrink:0; }
        .risk-bar-bg { flex:1; height:4px; background:#F0F0EE; border-radius:2px; overflow:hidden; max-width:80px; }
        .risk-bar { height:100%; border-radius:2px; transition:width 0.4s; }
        .risk-sessions { font-size:10px; color:#CCC; flex-shrink:0; }
        .empty-dash { padding:20px 0; text-align:center; font-size:12px; color:#CCC; }

        /* ── Sessions coverage ── */
        .prog-wrap { height:6px; background:#F0F0EE; border-radius:3px; overflow:hidden; margin-bottom:6px; }
        .prog-bar { height:100%; border-radius:3px; background:#86EFAC; transition:width 0.4s; }
        .prog-label { font-size:11px; color:#AAA; margin-bottom:12px; }
        .sess-item { display:flex; align-items:center; gap:8px; padding:6px 0; border-bottom:1px solid #F8F8F6; }
        .sess-item:last-child { border-bottom:none; }
        .sess-dot { width:8px; height:8px; border-radius:50%; background:#F0F0EE; flex-shrink:0; }
        .sess-dot.done { background:#86EFAC; }
        .sess-name { font-size:12px; color:#333; flex:1; }
        .sess-class { font-size:10px; color:#AAA; }

        /* ── Prayer pills ── */
        .prayer-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:6px; }
        .prayer-pill { border-radius:10px; padding:8px 6px; text-align:center; border:1px solid #EFEFED; background:#FAFAF8; }
        .prayer-pill.marked { background:#F0FDF4; border-color:#BBF7D0; }
        .prayer-pname { font-size:10px; font-weight:500; color:#555; }
        .prayer-count { font-size:13px; font-weight:600; color:#1A1A1A; margin-top:2px; }
        .prayer-pill.marked .prayer-count { color:#15803D; }

        /* ── Cleaning ── */
        .clean-big { font-size:28px; font-weight:600; color:#1A1A1A; letter-spacing:-1px; line-height:1; margin-bottom:6px; }

        /* ── Setup page ── */
        .setup { max-width:900px; margin:0 auto; padding:28px 32px; }
        .setup-group { margin-bottom:28px; }
        .setup-label { font-size:11px; font-weight:600; color:#BBB; text-transform:uppercase; letter-spacing:0.07em; margin-bottom:10px; }
        .mg { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; }
        .mi { background:#fff; border:1px solid rgba(0,0,0,0.07); border-radius:12px; padding:16px; cursor:pointer; text-align:left; transition:all 0.15s; display:flex; flex-direction:column; gap:8px; font-family:inherit; }
        .mi:hover { background:#FAFAF8; border-color:rgba(0,0,0,0.12); transform:translateY(-1px); box-shadow:0 2px 8px rgba(0,0,0,0.06); }
        .mi-tp { display:flex; align-items:center; justify-content:space-between; }
        .mic { width:30px; height:30px; border-radius:8px; background:rgba(0,0,0,0.04); display:flex; align-items:center; justify-content:center; color:#777; }
        .mar { color:#DDD; }
        .mt { font-size:13px; font-weight:500; color:#333; }
        .md { font-size:11px; color:#BBB; line-height:1.4; }

        /* ── Responsive ── */
        @media (max-width:900px) {
          .dash-grid { grid-template-columns:1fr; }
          .mg { grid-template-columns:repeat(2,1fr); }
          .sg { grid-template-columns:repeat(2,1fr); }
          .dash { padding:20px; }
          .setup { padding:20px; }
          .nav { padding:0 16px; }
          .main-tabs { padding:0 16px; }
        }
        @media (max-width:480px) {
          .mg { grid-template-columns:1fr 1fr; }
          .dash { padding:14px; }
          .setup { padding:14px; }
          .nav-user { display:none; }
          .prayer-grid { grid-template-columns:repeat(3,1fr); }
        }
      `}</style>

      {/* Transfer Modal */}
      {transferTarget && (
        <div className="mw" onClick={e => { if (e.target === e.currentTarget) setTransferTarget(null) }}>
          <div className="mo">
            <div className="mo-t">Transfer Record</div>
            <div className="mo-s">{transferTarget.learner_name} — {transferTarget.class_name}</div>
            <label className="fl">Transfer Type</label>
            <div className="tg">
              {TRANSFER_TYPES.map(t => <button key={t.key} className={`tb2 ${tType === t.key ? 'on' : ''}`} onClick={() => setTType(t.key)}>{t.label}</button>)}
            </div>
            <div className="fr2">
              <div><label className="fl">Institution / School</label><input className="fi" value={tDest} onChange={e => setTDest(e.target.value)} placeholder="e.g. Hilal Academy" /></div>
              <div><label className="fl">City</label><input className="fi" value={tCity} onChange={e => setTCity(e.target.value)} placeholder="e.g. Johannesburg" /></div>
            </div>
            <div className="fr"><label className="fl">Notes</label><input className="fi" value={tNote} onChange={e => setTNote(e.target.value)} placeholder="Additional info..." /></div>
            <div className="ma">
              <button className="bs" onClick={() => setTransferTarget(null)}>Cancel</button>
              <button style={{ padding:'8px 20px', border:'none', borderRadius:8, background:'#7E22CE', color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }} onClick={saveTransfer} disabled={tSaving}>{tSaving ? '...' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      {yearPanel && <div className="overlay" onClick={() => setYearPanel(false)} />}

      {/* Year Side Panel */}
      {yearPanel && (
        <div className="sp">
          <div className="sp-top">
            <span className="sp-h">{Icons.year} Academic Year — <span style={{ color:'#C2410C' }}>{activeYear?.name || '—'}</span></span>
            <button className="sp-x" onClick={() => setYearPanel(false)}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
          </div>
          <div className="sp-tabs">
            {[{ k:'overview',l:'📋 Overview' },{ k:'learners',l:'👥 Learners' },{ k:'archive',l:'📦 New Year' },{ k:'compare',l:'📊 Compare' }].map(t => (
              <button key={t.k} className={`stab ${yearView === t.k ? 'on' : ''}`} onClick={() => { setYearView(t.k as any); if (t.k === 'learners') loadEnrollments() }}>{t.l}</button>
            ))}
          </div>
          <div className="sp-body">
            {yearView === 'overview' && allYears.map(y => (
              <div key={y.id} className={`ycard ${y.is_active ? 'act' : ''} ${y.is_archived ? 'arc' : ''}`}>
                <div className="yc-h">
                  <div className="yc-n">{Icons.year} {y.name} {y.is_active && <span className="ba">Active</span>}{y.is_archived && <span className="bar">Archived</span>}</div>
                  <span className="yc-d">{fmtDate(y.start_date)} → {fmtDate(y.end_date)}</span>
                </div>
                {y.total_learners !== undefined && (
                  <div className="yc-g">
                    {[{ n:y.total_learners||0,l:'Total',c:'#1A1A1A' },{ n:y.active||0,l:'Active',c:'#15803D' },{ n:y.transferred||0,l:'Transfer',c:'#7E22CE' },{ n:y.graduated||0,l:'Graduated',c:'#0E7490' },{ n:y.retained||0,l:'Retained',c:'#A16207' },{ n:y.withdrawn||0,l:'Withdrawn',c:'#DC2626' }].map(s => (
                      <div key={s.l} className="ycs"><div className="ycs-n" style={{ color:s.c }}>{s.n}</div><div className="ycs-l">{s.l}</div></div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {yearView === 'learners' && (
              <div>
                <div style={{ fontSize:12, color:'#AAA', marginBottom:12 }}><strong style={{ color:'#C2410C' }}>{activeYear?.name}</strong> — year-end status per learner</div>
                <div className="frow-f">
                  <button className={`fp ${statusFilter === 'all' ? 'on' : ''}`} onClick={() => setStatusFilter('all')}>All ({enrollments.length})</button>
                  {STATUS_OPTIONS.map(s => { const n = enrollments.filter(e => e.enrollment_status === s.key).length; if (!n && s.key !== 'active') return null; return <button key={s.key} className={`fp ${statusFilter === s.key ? 'on' : ''}`} onClick={() => setStatusFilter(s.key)} style={statusFilter === s.key ? { background:s.color, borderColor:s.color } : {}}>{s.label} ({n})</button> })}
                </div>
                {enrollLoading ? <div style={{ textAlign:'center', color:'#CCC', padding:24 }}>Loading...</div> : filtered.length === 0 ? <div style={{ textAlign:'center', color:'#CCC', padding:24 }}>No records</div> : filtered.map(e => (
                  <div key={e.id} className="er">
                    <div style={{ flex:1, minWidth:0 }}><div className="en">{e.learner_name}</div><div className="ec">{e.class_name}</div></div>
                    <select className="ss" value={e.enrollment_status} onChange={ev => { if (ev.target.value === 'transferred') setTransferTarget(e); else updateStatus(e.id, e.learner_id, ev.target.value) }}>
                      {STATUS_OPTIONS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                    </select>
                    {e.enrollment_status === 'transferred' && <button className="tb" onClick={() => setTransferTarget(e)}>📝</button>}
                  </div>
                ))}
              </div>
            )}

            {yearView === 'archive' && (
              <div>
                {archiveResult ? (
                  <div>
                    <div className="sbox"><div className="sbox-t">✓ Done</div><div className="sbox-m">{archiveResult.message}</div></div>
                    <button className="bp" onClick={() => { setArchiveResult(null); setNewName(''); setNewStart(''); setNewEnd(''); setYearView('overview') }}>Back to Overview</button>
                  </div>
                ) : !activeYear ? (
                  <div>
                    <div className="ibox">No academic year set up yet. Create your first year — all existing data will be linked to it.</div>
                    <div className="fr"><label className="fl">Year Name *</label><input className="fi" value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. 2024-2025" /></div>
                    <div className="fr2">
                      <div><label className="fl">Start *</label><input className="fi" type="date" value={newStart} onChange={e => setNewStart(e.target.value)} /></div>
                      <div><label className="fl">End *</label><input className="fi" type="date" value={newEnd} onChange={e => setNewEnd(e.target.value)} /></div>
                    </div>
                    <button className="bp" disabled={!newName.trim() || !newStart || !newEnd || archiving} onClick={createFirstYear}>{archiving ? 'Creating...' : '+ Create Academic Year'}</button>
                  </div>
                ) : (
                  <div>
                    <div style={{ background:'#FAFAF8', border:'1px solid #EFEFED', borderRadius:10, padding:'12px 14px', marginBottom:16 }}>
                      <div style={{ fontSize:11, color:'#AAA', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:5 }}>Current Active Year</div>
                      <div style={{ fontSize:15, fontWeight:600, color:'#1A1A1A', marginBottom:3 }}>{activeYear.name}</div>
                      <div style={{ fontSize:11, color:'#AAA' }}>{fmtDate(activeYear.start_date)} → {fmtDate(activeYear.end_date)}</div>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:8, margin:'0 0 16px', color:'#BBB', fontSize:11 }}>
                      <div style={{ flex:1, height:1, background:'#EFEFED' }} /><span>New year details</span><div style={{ flex:1, height:1, background:'#EFEFED' }} />
                    </div>
                    <div className="fr"><label className="fl">New Year Name *</label><input className="fi" value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. 2025-2026" /></div>
                    <div className="fr2">
                      <div><label className="fl">Start *</label><input className="fi" type="date" value={newStart} onChange={e => setNewStart(e.target.value)} /></div>
                      <div><label className="fl">End *</label><input className="fi" type="date" value={newEnd} onChange={e => setNewEnd(e.target.value)} /></div>
                    </div>
                    {newName && newStart && newEnd && (
                      <div style={{ background:'#F0FDF4', border:'1px solid #BBF7D0', borderRadius:9, padding:'10px 12px', marginBottom:14, fontSize:12, color:'#166534' }}>
                        <strong>{activeYear.name}</strong> will be archived → <strong>{newName}</strong> will become active
                        <div style={{ fontSize:11, color:'#AAA', marginTop:3 }}>Active learners carried over · Transfers/withdrawals not carried · Old data preserved</div>
                      </div>
                    )}
                    <div className="wbox">⚠ This cannot be undone. Update learner statuses in the Learners tab first.</div>
                    <button className="bp rd" disabled={!newName.trim() || !newStart || !newEnd || archiving} onClick={doArchive}>{archiving ? 'Processing...' : `Close ${activeYear.name} → Open ${newName || '...'}`}</button>
                  </div>
                )}
              </div>
            )}

            {yearView === 'compare' && (
              <div>
                <div className="cs">
                  <select className="ys" value={cmpA} onChange={e => setCmpA(e.target.value)}><option value="">Select year...</option>{allYears.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}</select>
                  <span className="cv">vs</span>
                  <select className="ys" value={cmpB} onChange={e => setCmpB(e.target.value)}><option value="">Select year...</option>{allYears.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}</select>
                </div>
                <button className="bp" style={{ marginBottom:20 }} disabled={!cmpA || !cmpB || cmpA === cmpB || cmpLoading} onClick={doCompare}>{cmpLoading ? 'Comparing...' : 'Compare'}</button>
                {cmpData && (() => {
                  const nA = cmpData.yearA?.name; const nB = cmpData.yearB?.name
                  return (
                    <div>
                      <div className="st">Learner Status</div>
                      <table className="ct" style={{ marginBottom:8 }}><thead><tr><th>Status</th><th>{nA}</th><th>{nB}</th></tr></thead><tbody>{STATUS_OPTIONS.map(s => <tr key={s.key}><td><span style={{ fontSize:10, fontWeight:600, padding:'2px 7px', borderRadius:5, background:s.bg, color:s.color }}>{s.label}</span></td><td>{(cmpData.yearA as any)?.[s.key] ?? '—'}</td><td>{(cmpData.yearB as any)?.[s.key] ?? '—'}</td></tr>)}</tbody></table>
                      {cmpData.attendance.length > 0 && (<><div className="st">Attendance %</div><table className="ct" style={{ marginBottom:8 }}><thead><tr><th>Class</th><th>{nA}</th><th>{nB}</th></tr></thead><tbody>{[...new Set(cmpData.attendance.map((r: any) => r.class_name))].map((cls: any) => { const ra = cmpData.attendance.find((r: any) => r.class_name === cls && r.year_name === nA); const rb = cmpData.attendance.find((r: any) => r.class_name === cls && r.year_name === nB); const pA = ra?.attendance_pct; const pB = rb?.attendance_pct; return <tr key={cls}><td>{cls}</td><td>{pA != null ? `${pA}%` : '—'}</td><td className={pB != null && pA != null ? pB > pA ? 'bt' : pB < pA ? 'ws' : '' : ''}>{pB != null ? `${pB}%` : '—'}</td></tr> })}</tbody></table></>)}
                      {cmpData.curriculum.length > 0 && (<><div className="st">Curriculum %</div><table className="ct"><thead><tr><th>Subject</th><th>{nA}</th><th>{nB}</th></tr></thead><tbody>{[...new Set(cmpData.curriculum.map((r: any) => r.subject_name))].map((s: any) => { const ra = cmpData.curriculum.find((r: any) => r.subject_name === s && r.year_name === nA); const rb = cmpData.curriculum.find((r: any) => r.subject_name === s && r.year_name === nB); const pA = ra?.completion_pct; const pB = rb?.completion_pct; return <tr key={s}><td>{s}</td><td>{pA != null ? `${pA}%` : '—'}</td><td className={pB != null && pA != null ? pB > pA ? 'bt' : pB < pA ? 'ws' : '' : ''}>{pB != null ? `${pB}%` : '—'}</td></tr> })}</tbody></table></>)}
                      {!cmpData.attendance.length && !cmpData.curriculum.length && <div style={{ textAlign:'center', color:'#CCC', padding:24, fontSize:13 }}>No data</div>}
                    </div>
                  )
                })()}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="nav">
        <div className="nav-brand"><div className="nav-dot" /><span className="nav-title">{appName}</span></div>
        <div className="nav-right">
          <button className="year-chip" onClick={() => setYearPanel(true)}>
            {Icons.year}
            {activeYear?.name || 'No year'}
            <svg className={`caret ${yearPanel ? 'open' : ''}`} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <span className="nav-user">{userName}</span>
          <button className="nav-logout" onClick={async () => { await supabase.auth.signOut(); router.push('/') }}>{Icons.logout} Sign out</button>
        </div>
      </nav>

      {/* Main Tabs */}
      <div className="main-tabs">
        <button className={`main-tab ${activeTab === 'dashboard' ? 'on' : ''}`} onClick={() => setActiveTab('dashboard')}>Dashboard</button>
        <button className={`main-tab ${activeTab === 'setup' ? 'on' : ''}`} onClick={() => setActiveTab('setup')}>Setup</button>
      </div>

      {/* ── DASHBOARD TAB ── */}
      {activeTab === 'dashboard' && (
        <div className="dash">
          <div className="dash-header">
            <h1 className="dash-gr">{greeting()}, {userName.split(' ')[0]}</h1>
            <p className="dash-sub">{todayName} · {dateStr}</p>
          </div>

          {/* Stat row */}
          <div className="sg">
            <div className="sc">
              <div className="sc-top"><div className="sc-ic">{Icons.learners}</div></div>
              <div className="sc-n">{stats.learners}</div>
              <div className="sc-l">Active Learners</div>
            </div>
            <div className="sc">
              <div className="sc-top"><div className="sc-ic">{Icons.timetable}</div></div>
              <div className="sc-n">{sessionsCov.marked}<span style={{ fontSize:16, fontWeight:400, color:'#CCC' }}>/{sessionsCov.total}</span></div>
              <div className="sc-l">Sessions Marked Today</div>
            </div>
            <div className={`sc ${atRisk.length > 0 ? 'alert' : ''}`}>
              <div className="sc-top"><div className={`sc-ic ${atRisk.length > 0 ? 'red' : ''}`}>{Icons.warning}</div></div>
              <div className="sc-n" style={{ color: atRisk.length > 0 ? '#DC2626' : '#1C1C1C' }}>{atRisk.length}</div>
              <div className="sc-l">Learners At Risk</div>
            </div>
            <div className={`sc ${docIssues > 0 ? 'alert' : ''}`}>
              <div className="sc-top"><div className={`sc-ic ${docIssues > 0 ? 'amber' : ''}`}>{Icons.docs}</div></div>
              <div className="sc-n" style={{ color: docIssues > 0 ? '#D97706' : '#1C1C1C' }}>{docIssues}</div>
              <div className="sc-l">Doc Issues</div>
            </div>
          </div>

          {dashLoading ? (
            <div style={{ textAlign:'center', padding:'60px 0', color:'#CCC', fontSize:13 }}>Loading analytics...</div>
          ) : (
            <div className="dash-grid">

              {/* ── Left column ── */}
              <div className="dash-col">

                {/* 7-day attendance chart */}
                <div className="dcard">
                  <div className="dcard-head">7-Day Attendance</div>
                  <div className="dcard-sub">Daily % present across all sessions</div>
                  <div className="chart-wrap">
                    {weeklyAtt.map(d => (
                      <div key={d.date} className="chart-col">
                        <span className="chart-pct">{d.pct !== null ? d.pct + '%' : ''}</span>
                        <div className="chart-bar" style={{
                          height: d.pct !== null ? `${d.pct}%` : '3px',
                          background: d.pct === null ? '#F0F0EE' : d.pct < atRiskThreshold ? '#FCA5A5' : d.pct < 85 ? '#FCD34D' : '#86EFAC',
                        }} />
                        <span className="chart-day">{d.day}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* At-risk learners */}
                <div className="dcard">
                  <div className="dcard-head">
                    At Risk
                    <span className="badge" style={{ background: atRisk.length > 0 ? '#FEF2F2' : '#F0FDF4', color: atRisk.length > 0 ? '#DC2626' : '#15803D' }}>
                      {atRisk.length > 0 ? atRisk.length + ' learners' : '✓ All clear'}
                    </span>
                  </div>
                  <div className="dcard-sub">Below {atRiskThreshold}% attendance · last 30 days</div>
                  {atRisk.length === 0 ? (
                    <div className="empty-dash">No learners below threshold</div>
                  ) : atRisk.map(l => (
                    <div key={l.id} className="risk-row" onClick={() => router.push('/admin/learners/' + l.id)}>
                      <span className="risk-name">{l.name}</span>
                      <span className="risk-pct" style={{ color: l.pct < 50 ? '#DC2626' : '#D97706' }}>{l.pct}%</span>
                      <div className="risk-bar-bg">
                        <div className="risk-bar" style={{ width: l.pct + '%', background: l.pct < 50 ? '#FCA5A5' : '#FCD34D' }} />
                      </div>
                      <span className="risk-sessions">{l.total} sess.</span>
                    </div>
                  ))}
                </div>

              </div>

              {/* ── Right column ── */}
              <div className="dash-col">

                {/* Today's session coverage */}
                <div className="dcard">
                  <div className="dcard-head">Today's Sessions</div>
                  <div className="dcard-sub">{todayName}</div>
                  {sessionsCov.list.length === 0 ? (
                    <div className="empty-dash">No sessions scheduled today</div>
                  ) : (
                    <>
                      <div className="prog-wrap">
                        <div className="prog-bar" style={{ width: sessionsCov.total > 0 ? (sessionsCov.marked / sessionsCov.total * 100) + '%' : '0%' }} />
                      </div>
                      <div className="prog-label">{sessionsCov.marked} of {sessionsCov.total} marked</div>
                      {sessionsCov.list.map((s: any) => (
                        <div key={s.id} className="sess-item">
                          <div className={`sess-dot ${s.marked ? 'done' : ''}`} />
                          <span className="sess-name">{s.name}</span>
                          <span className="sess-class">{(s.classes as any)?.name}</span>
                        </div>
                      ))}
                    </>
                  )}
                </div>

                {/* Today's prayers */}
                {prayerStats.length > 0 && (
                  <div className="dcard">
                    <div className="dcard-head">Today's Prayers</div>
                    <div className="dcard-sub">Present count / total learners</div>
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
                  <div className="prog-wrap">
                    <div className="prog-bar" style={{ width: cleaningToday.total > 0 ? (cleaningToday.done / cleaningToday.total * 100) + '%' : '0%' }} />
                  </div>
                  {cleaningToday.total === 0 && <div className="empty-dash" style={{ padding:'8px 0 0' }}>No locations set up</div>}
                </div>

              </div>
            </div>
          )}
        </div>
      )}

      {/* ── SETUP TAB ── */}
      {activeTab === 'setup' && (
        <div className="setup">
          {setupGroups.map(group => (
            <div key={group.label} className="setup-group">
              <div className="setup-label">{group.label}</div>
              <div className="mg">
                {group.items.map(item => (
                  <button key={item.title} className="mi" onClick={() => (item as any).action ? (item as any).action() : router.push(item.href)}>
                    <div className="mi-tp"><div className="mic">{item.icon}</div><span className="mar">{Icons.arrow}</span></div>
                    <div><div className="mt">{item.title}</div><div className="md">{item.desc}</div></div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
