'use client'
import { useEffect, useState } from 'react'
import { createClient } from '../lib/supabase'
import { useRouter } from 'next/navigation'

const DAYS = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export default function TeacherDashboard() {
  const [teacher, setTeacher] = useState<any>(null)
  const [isHead, setIsHead] = useState(false)
  const [activeTab, setActiveTab] = useState('dashboard')

  // Dashboard
  const [todaySessions, setTodaySessions] = useState<any[]>([])
  const [myClasses, setMyClasses] = useState<any[]>([])
  const [attendanceStats, setAttendanceStats] = useState<any[]>([])
  const [upcomingExams, setUpcomingExams] = useState<any[]>([])
  const [recentHomework, setRecentHomework] = useState<any[]>([])

  // Attendance marking
  const [selectedSession, setSelectedSession] = useState<any>(null)
  const [learners, setLearners] = useState<any[]>([])
  const [attendance, setAttendance] = useState<Record<string, string>>({})
  const [homework, setHomework] = useState<Record<string, boolean>>({})
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Exams
  const [exams, setExams] = useState<any[]>([])
  const [allClasses, setAllClasses] = useState<any[]>([])
  const [showExamForm, setShowExamForm] = useState(false)
  const [examTitle, setExamTitle] = useState('')
  const [examDate, setExamDate] = useState('')
  const [examClass, setExamClass] = useState('')
  const [examDesc, setExamDesc] = useState('')
  const [examSaving, setExamSaving] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => { loadTeacher() }, [])

  async function loadTeacher() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }
    const { data: userData } = await supabase.from('users').select('*').eq('auth_id', user.id).single()
    if (!userData || userData.role !== 'teacher') { router.push('/'); return }
    setTeacher(userData)
    setIsHead(userData.is_head_teacher || false)
    await loadDashboard(userData)
  }

  async function loadDashboard(t: any) {
    const today = new Date().getDay()
    const dayNum = today === 0 ? 7 : today

    // Today's sessions
    const sessionQuery = t.is_head_teacher
      ? supabase.from('timetable').select('*, classes(name, id), users(full_name, display_name)').eq('day_of_week', dayNum).order('start_time')
      : supabase.from('timetable').select('*, classes(name, id), users(full_name, display_name)').eq('teacher_id', t.id).eq('day_of_week', dayNum).order('start_time')

    const [{ data: sessions }, { data: classData }, { data: examData }, { data: hwData }] = await Promise.all([
      sessionQuery,
      t.is_head_teacher
        ? supabase.from('classes').select('*').eq('class_type', 'secular').order('name')
        : supabase.from('timetable').select('classes(id, name)').eq('teacher_id', t.id),
      supabase.from('exams').select('*, classes(name)').eq('is_active', true).gte('exam_date', new Date().toISOString().split('T')[0]).order('exam_date').limit(5),
      t.is_head_teacher
        ? supabase.from('homework_assignments').select('*, classes(name), users(full_name, display_name), homework_submissions(status)').order('created_at', { ascending: false }).limit(8)
        : supabase.from('homework_assignments').select('*, classes(name), homework_submissions(status)').eq('teacher_id', t.id).order('created_at', { ascending: false }).limit(8),
    ])

    setTodaySessions(sessions || [])
    setUpcomingExams(examData || [])
    setRecentHomework(hwData || [])

    // Classes
    const classes = t.is_head_teacher
      ? classData || []
      : [...new Set((classData || []).map((s: any) => s.classes).filter(Boolean))]
    setMyClasses(classes)
    setAllClasses(classes)
    if (classes.length > 0) setExamClass(classes[0].id)

    // Load exams for exam tab
    const examTabQuery = t.is_head_teacher
      ? supabase.from('exams').select('*, classes(name)').eq('is_active', true).order('exam_date')
      : supabase.from('exams').select('*, classes(name)').eq('teacher_id', t.id).eq('is_active', true).order('exam_date')
    const { data: allExams } = await examTabQuery
    setExams(allExams || [])

    // Attendance stats per class
    const stats = []
    for (const cls of classes) {
      const { data: lcData } = await supabase.from('learner_classes').select('learner_id').eq('class_id', cls.id)
      const learnerIds = lcData?.map((l: any) => l.learner_id) || []
      if (learnerIds.length === 0) { stats.push({ cls, total: 0, present: 0, pct: 0, learnerCount: 0 }); continue }
      const { data: attData } = await supabase.from('attendance').select('status').in('learner_id', learnerIds)
      const total = attData?.length || 0
      const present = attData?.filter(a => a.status === 'present' || a.status === 'late').length || 0
      stats.push({ cls, total, present, pct: total > 0 ? Math.round((present / total) * 100) : 0, learnerCount: learnerIds.length })
    }
    setAttendanceStats(stats)
  }

  async function selectSession(session: any) {
    setSelectedSession(session)
    setSaved(false)
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase.from('learner_classes').select('*, learners(id, full_name)').eq('class_id', session.classes.id)
    const list = data?.map((lc: any) => lc.learners).filter(Boolean) || []
    setLearners(list)
    const [{ data: attData }, { data: hwData }, { data: notesData }] = await Promise.all([
      supabase.from('attendance').select('*').eq('timetable_id', session.id).eq('attendance_date', today),
      supabase.from('homework').select('*').eq('timetable_id', session.id).eq('attendance_date', today),
      supabase.from('notes').select('*').eq('timetable_id', session.id),
    ])
    const attMap: Record<string, string> = {}
    const hwMap: Record<string, boolean> = {}
    const notesMap: Record<string, string> = {}
    list.forEach(l => { attMap[l.id] = 'absent' })
    attData?.forEach((a: any) => { attMap[a.learner_id] = a.status })
    hwData?.forEach((h: any) => { hwMap[h.learner_id] = h.submitted })
    notesData?.forEach((n: any) => { notesMap[n.learner_id] = n.content })
    setAttendance(attMap)
    setHomework(hwMap)
    setNotes(notesMap)
  }

  async function saveAttendance() {
    if (!selectedSession || !teacher) return
    setSaving(true)
    const today = new Date().toISOString().split('T')[0]
    for (const learner of learners) {
      await supabase.from('attendance').upsert({ timetable_id: selectedSession.id, learner_id: learner.id, attendance_date: today, status: attendance[learner.id] || 'absent' }, { onConflict: 'timetable_id,learner_id,attendance_date' })
      await supabase.from('homework').upsert({ timetable_id: selectedSession.id, learner_id: learner.id, attendance_date: today, submitted: homework[learner.id] || false }, { onConflict: 'timetable_id,learner_id,attendance_date' })
      if (notes[learner.id]?.trim()) {
        await supabase.from('notes').upsert({ timetable_id: selectedSession.id, learner_id: learner.id, teacher_id: teacher.id, content: notes[learner.id].trim() }, { onConflict: 'timetable_id,learner_id' })
      }
    }
    setSaving(false)
    setSaved(true)
  }

  async function addExam() {
    if (!examTitle.trim() || !examDate || !examClass) return
    setExamSaving(true)
    await supabase.from('exams').insert({ title: examTitle.trim(), exam_date: examDate, class_id: examClass, teacher_id: teacher?.id, description: examDesc.trim() || null })
    setExamTitle(''); setExamDate(''); setExamDesc('')
    setShowExamForm(false)
    const query = isHead
      ? supabase.from('exams').select('*, classes(name)').eq('is_active', true).order('exam_date')
      : supabase.from('exams').select('*, classes(name)').eq('teacher_id', teacher?.id).eq('is_active', true).order('exam_date')
    const { data } = await query
    setExams(data || [])
    setExamSaving(false)
  }

  async function deleteExam(id: string) {
    if (!confirm('Delete this exam?')) return
    await supabase.from('exams').update({ is_active: false }).eq('id', id)
    setExams(prev => prev.filter(e => e.id !== id))
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  const today = DAYS[new Date().getDay() === 0 ? 7 : new Date().getDay()]
  const dateFormatted = new Date().toLocaleDateString('en-ZA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const todayStr = new Date().toISOString().split('T')[0]

  return (
    <main style={{ minHeight: '100vh', background: '#F8F7F4', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&family=DM+Serif+Display&display=swap');
        * { box-sizing: border-box; }
        .topbar { background:#fff; border-bottom:1px solid #EFEFED; padding:0 32px; height:56px; display:flex; align-items:center; justify-content:space-between; position:sticky; top:0; z-index:10; }
        .brand { display:flex; align-items:center; gap:10px; }
        .brand-icon { width:30px; height:30px; background:#1D4ED8; border-radius:8px; display:flex; align-items:center; justify-content:center; color:white; }
        .brand-name { font-size:15px; font-weight:500; color:#1A1A1A; }
        .topbar-right { display:flex; align-items:center; gap:8px; }
        .user-chip { display:flex; align-items:center; gap:8px; background:#F5F5F3; border-radius:100px; padding:4px 12px 4px 4px; }
        .avatar { width:26px; height:26px; background:#1D4ED8; border-radius:50%; display:flex; align-items:center; justify-content:center; color:white; font-size:11px; font-weight:500; }
        .username { font-size:13px; color:#444; font-weight:500; }
        .head-chip { font-size:10px; font-weight:600; background:#FFF7ED; color:#C2410C; border:1px solid #FED7AA; padding:2px 7px; border-radius:6px; text-transform:uppercase; letter-spacing:0.05em; }
        .logout { display:flex; align-items:center; gap:5px; font-size:13px; color:#999; background:none; border:none; cursor:pointer; padding:6px 10px; border-radius:8px; transition:all 0.15s; font-family:'DM Sans',sans-serif; }
        .logout:hover { background:#FEE2E2; color:#DC2626; }
        .tab-bar { background:#fff; border-bottom:1px solid #EFEFED; padding:0 32px; display:flex; gap:2px; overflow-x:auto; }
        .tab-btn { padding:14px 16px; font-size:13px; font-weight:500; color:#999; background:none; border:none; border-bottom:2px solid transparent; cursor:pointer; font-family:'DM Sans',sans-serif; transition:all 0.15s; display:flex; align-items:center; gap:6px; white-space:nowrap; }
        .tab-btn:hover { color:#555; }
        .tab-btn.active { color:#1D4ED8; border-bottom-color:#1D4ED8; }
        .wrap { max-width:900px; margin:0 auto; padding:28px 32px; }
        .page-header { margin-bottom:24px; }
        .page-greeting { font-family:'DM Serif Display',serif; font-size:22px; color:#1A1A1A; }
        .page-date { font-size:13px; color:#AAA; margin-top:3px; }
        .stats-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-bottom:20px; }
        .stat-card { background:#fff; border:1px solid #EFEFED; border-radius:14px; padding:18px; }
        .stat-icon { width:34px; height:34px; border-radius:9px; display:flex; align-items:center; justify-content:center; margin-bottom:12px; }
        .stat-n { font-size:28px; font-weight:500; color:#1A1A1A; }
        .stat-l { font-size:11px; color:#AAA; margin-top:4px; text-transform:uppercase; letter-spacing:0.05em; }
        .card { background:#fff; border:1px solid #EFEFED; border-radius:14px; overflow:hidden; margin-bottom:16px; }
        .card-head { padding:14px 20px; border-bottom:1px solid #F5F5F3; display:flex; align-items:center; justify-content:space-between; }
        .card-title { font-size:13px; font-weight:500; color:#1A1A1A; }
        .card-sub { font-size:11px; color:#AAA; }
        .list-row { display:flex; align-items:center; justify-content:space-between; padding:11px 20px; border-bottom:1px solid #F8F8F6; transition:background 0.15s; }
        .list-row:last-child { border-bottom:none; }
        .list-row:hover { background:#FAFAF8; }
        .row-name { font-size:13px; font-weight:500; color:#1A1A1A; }
        .row-sub { font-size:11px; color:#AAA; margin-top:2px; }
        .pct-bar { display:flex; align-items:center; gap:8px; min-width:100px; }
        .bar-track { flex:1; height:4px; background:#F0F0EE; border-radius:2px; overflow:hidden; }
        .bar-fill { height:100%; border-radius:2px; }
        .pct-text { font-size:12px; font-weight:500; min-width:32px; text-align:right; }
        .badge { font-size:10px; font-weight:500; padding:3px 8px; border-radius:8px; display:inline-block; }
        .badge-ok { background:#F0FDF4; color:#15803D; }
        .badge-warn { background:#FEF2F2; color:#DC2626; }
        .badge-mid { background:#FEFCE8; color:#A16207; }
        .badge-gray { background:#F5F5F3; color:#888; }
        .badge-blue { background:#EFF6FF; color:#1D4ED8; }
        .session-btn { width:100%; background:#fff; border:1px solid #EFEFED; border-radius:12px; padding:14px 18px; text-align:left; cursor:pointer; transition:all 0.15s; display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; font-family:'DM Sans',sans-serif; }
        .session-btn:hover { border-color:#BFDBFE; background:#EFF6FF; }
        .att-back { font-size:13px; color:#AAA; background:none; border:none; cursor:pointer; font-family:'DM Sans',sans-serif; display:flex; align-items:center; gap:4px; padding:0; margin-bottom:8px; }
        .att-back:hover { color:#555; }
        .att-title { font-family:'DM Serif Display',serif; font-size:20px; color:#1A1A1A; }
        .att-meta { font-size:12px; color:#AAA; margin-top:2px; }
        .att-header { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:20px; }
        .save-btn { background:#1D4ED8; color:white; border:none; border-radius:9px; padding:9px 20px; font-size:13px; font-weight:500; cursor:pointer; font-family:'DM Sans',sans-serif; }
        .save-btn:hover { background:#1E40AF; }
        .save-btn:disabled { opacity:0.5; }
        .learner-card { background:#fff; border:1px solid #EFEFED; border-radius:11px; padding:13px 16px; margin-bottom:8px; transition:border-color 0.15s; }
        .learner-top { display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; }
        .learner-name { font-size:13px; font-weight:500; color:#1A1A1A; display:flex; align-items:center; gap:8px; }
        .status-dot { width:8px; height:8px; border-radius:50%; }
        .status-btns { display:flex; gap:5px; }
        .status-btn { padding:5px 12px; border-radius:8px; border:2px solid transparent; cursor:pointer; font-size:11px; font-weight:500; font-family:'DM Sans',sans-serif; transition:all 0.15s; }
        .note-input { width:100%; height:32px; border:1px solid #F0F0EE; border-radius:8px; padding:0 10px; font-size:12px; font-family:'DM Sans',sans-serif; color:#555; background:#FAFAF8; outline:none; }
        .note-input:focus { border-color:#1D4ED8; background:#fff; }
        .note-input::placeholder { color:#CCC; }
        .hw-check { display:flex; align-items:center; gap:6px; font-size:12px; color:#666; cursor:pointer; }
        .bottom-row { display:flex; gap:12px; margin-top:8px; align-items:center; }
        .exam-countdown { font-size:11px; font-weight:600; }
        .add-exam-btn { display:flex; align-items:center; gap:6px; background:#1A1A1A; color:white; border:none; border-radius:8px; padding:6px 14px; font-size:12px; font-weight:500; cursor:pointer; font-family:'DM Sans',sans-serif; }
        .form-card { background:#fff; border:1px solid #EFEFED; border-radius:14px; padding:20px; margin-bottom:16px; }
        .form-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
        .form-group { display:flex; flex-direction:column; gap:4px; }
        .form-group.col2 { grid-column:span 2; }
        .form-label { font-size:11px; font-weight:500; color:#888; text-transform:uppercase; letter-spacing:0.04em; }
        .form-input, .form-select { height:36px; border:1px solid #EFEFED; border-radius:8px; padding:0 10px; font-size:13px; font-family:'DM Sans',sans-serif; color:#1A1A1A; background:#fff; outline:none; }
        .form-input:focus, .form-select:focus { border-color:#1D4ED8; }
        .form-input::placeholder { color:#CCC; }
        .form-actions { display:flex; justify-content:flex-end; gap:8px; margin-top:12px; }
        .empty { padding:32px; text-align:center; color:#CCC; font-size:13px; }
        .hw-go-btn { font-size:11px; background:#EFF6FF; color:#1D4ED8; border:1px solid #BFDBFE; border-radius:7px; padding:4px 10px; cursor:pointer; font-family:'DM Sans',sans-serif; font-weight:500; }
        @media (max-width:768px) {
          .wrap { padding:16px; }
          .stats-grid { grid-template-columns:1fr 1fr; gap:8px; }
          .form-grid { grid-template-columns:1fr; }
          .topbar { padding:0 16px; }
          .card { padding:14px; }
        }
      `}</style>

      {/* Topbar */}
      <div className="topbar">
        <div className="brand">
          <div className="brand-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
          </div>
          <span className="brand-name">Teacher</span>
        </div>
        <div className="topbar-right">
          <div className="user-chip">
            <div className="avatar">{teacher?.full_name?.charAt(0)}</div>
            <span className="username">{teacher?.display_name || teacher?.full_name}</span>
          </div>
          {isHead && <span className="head-chip">Head Teacher</span>}
          <button className="logout" onClick={handleLogout}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Sign out
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-bar">
        {[
          { key: 'dashboard', label: 'Dashboard', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> },
          { key: 'attendance', label: 'Mark Attendance', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg> },
          { key: 'homework', label: 'Homework', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> },
          { key: 'exams', label: 'Exams', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
        ].map(tab => (
          <button key={tab.key} className={`tab-btn ${activeTab === tab.key ? 'active' : ''}`} onClick={() => { setActiveTab(tab.key); setSelectedSession(null) }}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <div className="wrap">

        {/* DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div>
            <div className="page-header">
              <h1 className="page-greeting">Good morning, {teacher?.display_name?.split(' ')[0] || teacher?.full_name?.split(' ')[0]}</h1>
              <p className="page-date">{dateFormatted}</p>
            </div>

            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon" style={{ background: '#EFF6FF', color: '#1D4ED8' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
                </div>
                <div className="stat-n">{myClasses.length}</div>
                <div className="stat-l">{isHead ? 'All classes' : 'My classes'}</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon" style={{ background: '#F0FDF4', color: '#15803D' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                </div>
                <div className="stat-n">{todaySessions.length}</div>
                <div className="stat-l">Sessions today</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon" style={{ background: '#FFF7ED', color: '#C2410C' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                </div>
                <div className="stat-n">{upcomingExams.length}</div>
                <div className="stat-l">Upcoming exams</div>
              </div>
            </div>

            {/* Today's sessions */}
            <div className="card">
              <div className="card-head">
                <span className="card-title">Today — {today}</span>
                <button className="hw-go-btn" onClick={() => setActiveTab('attendance')}>Mark attendance →</button>
              </div>
              {todaySessions.length === 0 ? (
                <div className="empty">No sessions today</div>
              ) : (
                todaySessions.map(s => (
                  <div key={s.id} className="list-row">
                    <div>
                      <div className="row-name">{s.name}</div>
                      <div className="row-sub">{s.classes?.name} · {s.start_time?.slice(0,5)} – {s.end_time?.slice(0,5)}{isHead && s.users && ` · ${s.users.display_name || s.users.full_name}`}</div>
                    </div>
                    <span className="badge badge-blue">{s.start_time?.slice(0,5)}</span>
                  </div>
                ))
              )}
            </div>

            {/* Class attendance */}
            <div className="card">
              <div className="card-head">
                <span className="card-title">{isHead ? 'All classes' : 'My classes'} — attendance</span>
              </div>
              {attendanceStats.length === 0 ? (
                <div className="empty">No data yet</div>
              ) : (
                attendanceStats.map(s => (
                  <div key={s.cls.id} className="list-row">
                    <div>
                      <div className="row-name">{s.cls.name}</div>
                      <div className="row-sub">{s.learnerCount} learners</div>
                    </div>
                    <div className="pct-bar">
                      <div className="bar-track">
                        <div className="bar-fill" style={{ width: `${s.pct}%`, background: s.pct >= 70 ? '#22C55E' : '#EF4444' }} />
                      </div>
                      <span className="pct-text" style={{ color: s.pct >= 70 ? '#15803D' : '#DC2626' }}>{s.pct}%</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Upcoming exams */}
            {upcomingExams.length > 0 && (
              <div className="card">
                <div className="card-head">
                  <span className="card-title">Upcoming exams</span>
                  <button className="hw-go-btn" onClick={() => setActiveTab('exams')}>Manage →</button>
                </div>
                {upcomingExams.map(e => {
                  const daysLeft = Math.ceil((new Date(e.exam_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                  return (
                    <div key={e.id} className="list-row">
                      <div>
                        <div className="row-name">{e.title}</div>
                        <div className="row-sub">{e.classes?.name} · {e.exam_date}</div>
                      </div>
                      <span className="exam-countdown" style={{ color: daysLeft <= 3 ? '#DC2626' : daysLeft <= 7 ? '#A16207' : '#15803D' }}>
                        {daysLeft === 0 ? 'Today!' : daysLeft === 1 ? 'Tomorrow!' : `${daysLeft} days`}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Recent homework */}
            <div className="card">
              <div className="card-head">
                <span className="card-title">Recent homework</span>
                <button className="hw-go-btn" onClick={() => setActiveTab('homework')}>All homework →</button>
              </div>
              {recentHomework.length === 0 ? (
                <div className="empty">No homework assigned yet</div>
              ) : (
                recentHomework.map(hw => {
                  const subs = hw.homework_submissions || []
                  const submitted = subs.filter((s: any) => s.status === 'submitted_on_time' || s.status === 'submitted_late').length
                  const pct = subs.length > 0 ? Math.round((submitted / subs.length) * 100) : 0
                  return (
                    <div key={hw.id} className="list-row">
                      <div>
                        <div className="row-name">{hw.title}</div>
                        <div className="row-sub">
                          {isHead && hw.users && `${hw.users.display_name || hw.users.full_name} · `}
                          {hw.classes?.name} · Due: {hw.due_date}
                        </div>
                      </div>
                      <div className="pct-bar">
                        <div className="bar-track">
                          <div className="bar-fill" style={{ width: `${pct}%`, background: pct >= 70 ? '#22C55E' : '#EF4444' }} />
                        </div>
                        <span className="pct-text" style={{ color: pct >= 70 ? '#15803D' : '#DC2626' }}>{pct}%</span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}

        {/* ATTENDANCE */}
        {activeTab === 'attendance' && (
          <div>
            {!selectedSession ? (
              <div>
                <div className="page-header">
                  <h1 className="page-greeting">Mark Attendance</h1>
                  <p className="page-date">{dateFormatted}</p>
                </div>
                {todaySessions.length === 0 ? (
                  <div className="card"><div className="empty">No sessions scheduled today</div></div>
                ) : (
                  todaySessions.map(s => (
                    <button key={s.id} className="session-btn" onClick={() => selectSession(s)}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 500, color: '#1A1A1A' }}>{s.name}</div>
                        <div style={{ fontSize: 12, color: '#AAA', marginTop: 2 }}>
                          {s.classes?.name} · {s.start_time?.slice(0,5)} – {s.end_time?.slice(0,5)}
                          {isHead && s.users && ` · ${s.users.display_name || s.users.full_name}`}
                        </div>
                      </div>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1D4ED8" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                    </button>
                  ))
                )}
              </div>
            ) : (
              <div>
                <div className="att-header">
                  <div>
                    <button className="att-back" onClick={() => { setSelectedSession(null); setSaved(false) }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
                      Back
                    </button>
                    <div className="att-title">{selectedSession.name}</div>
                    <div className="att-meta">{selectedSession.classes?.name} · {selectedSession.start_time?.slice(0,5)} – {selectedSession.end_time?.slice(0,5)}</div>
                  </div>
                  <button className="save-btn" onClick={saveAttendance} disabled={saving}>
                    {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save'}
                  </button>
                </div>
                {learners.map(l => {
                  const status = attendance[l.id] || 'absent'
                  const statusColors: Record<string, { bg: string; text: string }> = {
                    present: { bg: '#22C55E', text: 'white' },
                    late: { bg: '#EAB308', text: 'white' },
                    absent: { bg: '#EF4444', text: 'white' },
                  }
                  return (
                    <div key={l.id} className="learner-card" style={{ borderColor: status === 'present' ? '#BBF7D0' : status === 'late' ? '#FDE68A' : '#EFEFED' }}>
                      <div className="learner-top">
                        <div className="learner-name">
                          <div className="status-dot" style={{ background: status === 'present' ? '#22C55E' : status === 'late' ? '#EAB308' : '#E5E5E5' }} />
                          {l.full_name}
                        </div>
                        <div className="status-btns">
                          {(['present', 'late', 'absent'] as const).map(s => (
                            <button key={s} className="status-btn"
                              onClick={() => { setAttendance(prev => ({ ...prev, [l.id]: s })); setSaved(false) }}
                              style={{ background: status === s ? statusColors[s].bg : '#F8F8F6', color: status === s ? statusColors[s].text : '#AAA', borderColor: status === s ? statusColors[s].bg : 'transparent' }}>
                              {s.charAt(0).toUpperCase() + s.slice(1)}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="bottom-row">
                        <label className="hw-check">
                          <input type="checkbox" checked={homework[l.id] || false}
                            onChange={e => { setHomework(prev => ({ ...prev, [l.id]: e.target.checked })); setSaved(false) }} />
                          Homework submitted
                        </label>
                        <input className="note-input" style={{ flex: 1 }} value={notes[l.id] || ''} placeholder="Add note..."
                          onChange={e => { setNotes(prev => ({ ...prev, [l.id]: e.target.value })); setSaved(false) }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* HOMEWORK */}
        {activeTab === 'homework' && (
          <div>
            <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h1 className="page-greeting">Homework</h1>
                <p className="page-date">{isHead ? 'All teachers' : 'My assignments'}</p>
              </div>
              <button className="add-exam-btn" onClick={() => router.push('/teacher/homework')}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                New assignment
              </button>
            </div>
            <div className="card">
              <div className="card-head"><span className="card-title">Recent assignments</span></div>
              {recentHomework.length === 0 ? (
                <div className="empty">No homework yet</div>
              ) : (
                recentHomework.map(hw => {
                  const subs = hw.homework_submissions || []
                  const submitted = subs.filter((s: any) => s.status === 'submitted_on_time' || s.status === 'submitted_late').length
                  const pct = subs.length > 0 ? Math.round((submitted / subs.length) * 100) : 0
                  const isOverdue = hw.due_date < todayStr
                  return (
                    <div key={hw.id} className="list-row">
                      <div style={{ flex: 1 }}>
                        <div className="row-name">{hw.title}</div>
                        <div className="row-sub">
                          {isHead && hw.users && `${hw.users.display_name || hw.users.full_name} · `}
                          {hw.classes?.name} · Due: {hw.due_date}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="pct-bar" style={{ minWidth: 80 }}>
                          <div className="bar-track">
                            <div className="bar-fill" style={{ width: `${pct}%`, background: pct >= 70 ? '#22C55E' : '#EF4444' }} />
                          </div>
                          <span className="pct-text" style={{ color: pct >= 70 ? '#15803D' : '#DC2626' }}>{pct}%</span>
                        </div>
                        <span className={`badge ${isOverdue ? 'badge-warn' : 'badge-ok'}`}>{isOverdue ? 'Overdue' : 'Active'}</span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}

        {/* EXAMS */}
        {activeTab === 'exams' && (
          <div>
            <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h1 className="page-greeting">Exams</h1>
                <p className="page-date">Upcoming exam dates and countdown</p>
              </div>
              <button className="add-exam-btn" onClick={() => setShowExamForm(!showExamForm)}>
                {showExamForm ? 'Cancel' : (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Add exam
                  </>
                )}
              </button>
            </div>

            {showExamForm && (
              <div className="form-card">
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Exam title *</label>
                    <input className="form-input" value={examTitle} onChange={e => setExamTitle(e.target.value)} placeholder="e.g. Maths Term 1 Exam" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Date *</label>
                    <input className="form-input" type="date" value={examDate} onChange={e => setExamDate(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Class *</label>
                    <select className="form-select" value={examClass} onChange={e => setExamClass(e.target.value)}>
                      {allClasses.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Description (optional)</label>
                    <input className="form-input" value={examDesc} onChange={e => setExamDesc(e.target.value)} placeholder="Chapters covered, format..." />
                  </div>
                </div>
                <div className="form-actions">
                  <button style={{ background: '#F5F5F3', color: '#666', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }} onClick={() => setShowExamForm(false)}>Cancel</button>
                  <button style={{ background: '#1A1A1A', color: 'white', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }} onClick={addExam} disabled={examSaving}>
                    {examSaving ? 'Saving...' : 'Add exam'}
                  </button>
                </div>
              </div>
            )}

            {/* Past exams */}
            {exams.filter(e => e.exam_date < todayStr).length > 0 && (
              <div className="card" style={{ marginBottom: 16 }}>
                <div className="card-head"><span className="card-title">Past exams</span></div>
                {exams.filter(e => e.exam_date < todayStr).map(e => (
                  <div key={e.id} className="list-row">
                    <div>
                      <div className="row-name">{e.title}</div>
                      <div className="row-sub">{e.classes?.name} · {e.exam_date}{e.description && ` · ${e.description}`}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span className="badge badge-gray">Done</span>
                      <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#CCC', padding: 4 }} onClick={() => deleteExam(e.id)}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Upcoming exams */}
            <div className="card">
              <div className="card-head"><span className="card-title">Upcoming exams</span></div>
              {exams.filter(e => e.exam_date >= todayStr).length === 0 ? (
                <div className="empty">No upcoming exams — add one above</div>
              ) : (
                exams.filter(e => e.exam_date >= todayStr).map(e => {
                  const daysLeft = Math.ceil((new Date(e.exam_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                  return (
                    <div key={e.id} className="list-row">
                      <div>
                        <div className="row-name">{e.title}</div>
                        <div className="row-sub">{e.classes?.name} · {e.exam_date}{e.description && ` · ${e.description}`}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span className="exam-countdown" style={{ color: daysLeft <= 3 ? '#DC2626' : daysLeft <= 7 ? '#A16207' : '#15803D', fontSize: 13 }}>
                          {daysLeft === 0 ? 'Today!' : daysLeft === 1 ? 'Tomorrow!' : `${daysLeft} days`}
                        </span>
                        <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#CCC', padding: 4 }} onClick={() => deleteExam(e.id)}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}