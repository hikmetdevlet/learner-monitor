'use client'
import { useEffect, useState } from 'react'
import { createClient } from '../lib/supabase'
import { useRouter } from 'next/navigation'

const DAYS = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export default function IslamicTeacherDashboard() {
  const [teacherName, setTeacherName] = useState('')
  const [teacherId, setTeacherId] = useState('')
  const [activeTab, setActiveTab] = useState('dashboard')

  const [stats, setStats] = useState<any[]>([])
  const [topicStats, setTopicStats] = useState<any[]>([])
  const [weeklyAtt, setWeeklyAtt] = useState<any[]>([])

  const [todaySessions, setTodaySessions] = useState<any[]>([])
  const [selectedSession, setSelectedSession] = useState<any>(null)
  const [learners, setLearners] = useState<any[]>([])
  const [attendance, setAttendance] = useState<Record<string, string>>({})
  const [attNotes, setAttNotes] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [attDate, setAttDate] = useState(new Date().toISOString().split('T')[0])

  const [myClasses, setMyClasses] = useState<any[]>([])
  const [selectedClass, setSelectedClass] = useState<any>(null)
  const [islamicLearners, setIslamicLearners] = useState<any[]>([])
  const [subjects, setSubjects] = useState<any[]>([])
  const [selectedSubject, setSelectedSubject] = useState<any>(null)
  const [topics, setTopics] = useState<any[]>([])
  const [progress, setProgress] = useState<Record<string, Record<string, boolean>>>({})
  const [savingProgress, setSavingProgress] = useState(false)
  const [savedProgress, setSavedProgress] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => { loadTeacher() }, [])

  async function loadTeacher() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }
    const { data: userData } = await supabase.from('users').select('*').eq('auth_id', user.id).single()
    if (!userData || userData.role !== 'islamic_teacher') { router.push('/'); return }
    setTeacherName(userData.full_name)
    setTeacherId(userData.id)
    loadMyClasses(userData.id)
    loadTodaySessions(userData.id)
  }

  async function loadMyClasses(tId: string) {
    const { data } = await supabase
      .from('islamic_teacher_classes')
      .select('*, classes(id, name, class_type)')
      .eq('teacher_id', tId)
    const classList = data?.map((a: any) => a.classes) || []
    setMyClasses(classList)
    if (classList.length > 0) loadDashboardStats(classList)
  }

  async function loadDashboardStats(classList: any[]) {
    const allStats: any[] = []
    for (const cls of classList) {
      const { data: lcData } = await supabase
        .from('learner_classes').select('*, learners(id, full_name)').eq('class_id', cls.id)
      const learnerList = lcData?.map((lc: any) => lc.learners).filter(Boolean) || []
      for (const learner of learnerList) {
        const { data: attData } = await supabase.from('attendance').select('status, attendance_date').eq('learner_id', learner.id)
        const total = attData?.length || 0
        const present = attData?.filter((a: any) => a.status === 'present' || a.status === 'late').length || 0
        const pct = total > 0 ? Math.round((present / total) * 100) : 0
        allStats.push({ learner, cls, total, present, pct, attData: attData || [] })
      }
    }
    setStats(allStats)

    // Weekly attendance
    const days = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' })
      const dayRecords = allStats.flatMap(s => s.attData.filter((a: any) => a.attendance_date === dateStr))
      const total = dayRecords.length
      const present = dayRecords.filter((a: any) => a.status === 'present' || a.status === 'late').length
      const pct = total > 0 ? Math.round((present / total) * 100) : 0
      days.push({ date: dateStr, day: dayName, total, present, pct, hasData: total > 0 })
    }
    setWeeklyAtt(days)

    // Topic stats from curriculum — track_per_learner topics only
    const classIds = classList.map((c: any) => c.id)
    const { data: subjData } = await supabase
      .from('curriculum_subjects').select('*, curriculum_topics(id)')
      .in('class_id', classIds).eq('is_active', true)

    const tStats: any[] = []
    for (const subj of (subjData || [])) {
      const trackedTopicIds = (subj.curriculum_topics || []).map((t: any) => t.id)
      if (trackedTopicIds.length === 0) continue
      // Only get tracked ones
      const { data: trackedTopics } = await supabase
        .from('curriculum_topics').select('id')
        .in('id', trackedTopicIds).eq('track_per_learner', true).eq('is_active', true)
      if (!trackedTopics || trackedTopics.length === 0) continue
      const topicIds = trackedTopics.map((t: any) => t.id)
      const { data: progressData } = await supabase
        .from('learner_topic_progress').select('*')
        .in('topic_id', topicIds).eq('completed', true)
      const totalPossible = topicIds.length * allStats.length
      const completed = progressData?.length || 0
      const pct = totalPossible > 0 ? Math.round((completed / totalPossible) * 100) : 0
      tStats.push({ subject: subj, topicCount: topicIds.length, completed, totalPossible, pct })
    }
    setTopicStats(tStats)
  }

  async function loadTodaySessions(tId: string) {
    const today = new Date().getDay()
    const dayNum = today === 0 ? 7 : today
    const { data } = await supabase.from('timetable')
      .select('*, classes(name, id, class_type)')
      .eq('teacher_id', tId).eq('day_of_week', dayNum).order('start_time')
    setTodaySessions(data || [])
  }

  async function loadSubjectsForClass(classId: string) {
    const { data } = await supabase
      .from('curriculum_subjects').select('*')
      .eq('class_id', classId).eq('is_active', true).order('order_num')
    setSubjects(data || [])
  }

  async function selectSession(session: any) {
    setSelectedSession(session)
    setSaved(false)
    const { data } = await supabase.from('learner_classes')
      .select('*, learners(id, full_name)').eq('class_id', session.classes.id)
    const list = data?.map((lc: any) => lc.learners).filter(Boolean) || []
    setLearners(list)
    await loadAttendanceForDate(session.id, attDate, list)
  }

  async function loadAttendanceForDate(sessionId: string, date: string, learnerList: any[]) {
    const { data: attData } = await supabase.from('attendance')
      .select('*').eq('timetable_id', sessionId).eq('attendance_date', date)
    const attMap: Record<string, string> = {}
    const notesMap: Record<string, string> = {}
    learnerList.forEach(l => { attMap[l.id] = 'absent' })
    attData?.forEach((a: any) => {
      attMap[a.learner_id] = a.status
      if (a.note) notesMap[a.learner_id] = a.note
    })
    setAttendance(attMap)
    setAttNotes(notesMap)
  }

  async function changeDate(newDate: string) {
    setAttDate(newDate); setSaved(false)
    if (selectedSession) await loadAttendanceForDate(selectedSession.id, newDate, learners)
  }

  function markAll(status: string) {
    const map: Record<string, string> = {}
    learners.forEach(l => { map[l.id] = status })
    setAttendance(map); setSaved(false)
  }

  async function saveAttendance() {
    if (!selectedSession) return
    setSaving(true)
    for (const learner of learners) {
      await supabase.from('attendance').upsert({
        timetable_id: selectedSession.id,
        learner_id: learner.id,
        attendance_date: attDate,
        status: attendance[learner.id] || 'absent',
        excused: attendance[learner.id] === 'excused',
        note: attNotes[learner.id] || null,
      }, { onConflict: 'timetable_id,learner_id,attendance_date' })
    }
    setSaving(false); setSaved(true)
  }

  async function selectClass(cls: any) {
    setSelectedClass(cls)
    setSelectedSubject(null)
    setTopics([])
    setProgress({})
    const { data } = await supabase.from('learner_classes')
      .select('*, learners(id, full_name)').eq('class_id', cls.id)
    setIslamicLearners(data?.map((lc: any) => lc.learners).filter(Boolean) || [])
    await loadSubjectsForClass(cls.id)
  }

  async function selectSubject(subject: any) {
    setSelectedSubject(subject)
    setSavedProgress(false)
    // Only load track_per_learner topics from curriculum
    const { data: topicData } = await supabase
      .from('curriculum_topics').select('*')
      .eq('subject_id', subject.id)
      .eq('is_active', true)
      .eq('track_per_learner', true)
      .order('order_num')
    setTopics(topicData || [])

    if (islamicLearners.length > 0 && topicData && topicData.length > 0) {
      const learnerIds = islamicLearners.map((l: any) => l.id)
      const topicIds = topicData.map((t: any) => t.id)
      const { data: progressData } = await supabase
        .from('learner_topic_progress').select('*')
        .in('learner_id', learnerIds).in('topic_id', topicIds)
      const map: Record<string, Record<string, boolean>> = {}
      progressData?.forEach((p: any) => {
        if (!map[p.learner_id]) map[p.learner_id] = {}
        map[p.learner_id][p.topic_id] = p.completed
      })
      setProgress(map)
    }
  }

  function toggleProgress(learnerId: string, topicId: string) {
    setProgress(prev => ({ ...prev, [learnerId]: { ...prev[learnerId], [topicId]: !prev[learnerId]?.[topicId] } }))
    setSavedProgress(false)
  }

  async function saveProgress() {
    setSavingProgress(true)
    const today = new Date().toISOString().split('T')[0]
    for (const learner of islamicLearners) {
      for (const topic of topics) {
        const completed = progress[learner.id]?.[topic.id] || false
        await supabase.from('learner_topic_progress').upsert({
          learner_id: learner.id,
          topic_id: topic.id,
          completed,
          completed_date: completed ? today : null,
          marked_by: teacherId,
        }, { onConflict: 'learner_id,topic_id' })
      }
    }
    setSavingProgress(false); setSavedProgress(true)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  const todayName = DAYS[new Date().getDay() === 0 ? 7 : new Date().getDay()]
  const dateFormatted = new Date().toLocaleDateString('en-ZA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  const STATUS_OPTIONS = [
    { key: 'present', label: 'Present', bg: '#22C55E', light: '#F0FDF4', text: '#15803D' },
    { key: 'late', label: 'Late', bg: '#EAB308', light: '#FEFCE8', text: '#A16207' },
    { key: 'absent', label: 'Absent', bg: '#EF4444', light: '#FEF2F2', text: '#B91C1C' },
    { key: 'excused', label: 'Excused', bg: '#3B82F6', light: '#EFF6FF', text: '#1D4ED8' },
  ]

  const presentCount = learners.filter(l => attendance[l.id] === 'present').length
  const lateCount = learners.filter(l => attendance[l.id] === 'late').length
  const absentCount = learners.filter(l => attendance[l.id] === 'absent' || !attendance[l.id]).length
  const excusedCount = learners.filter(l => attendance[l.id] === 'excused').length

  return (
    <main style={{ minHeight: '100vh', background: '#F8F7F4', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&family=DM+Serif+Display&display=swap');
        * { box-sizing: border-box; }
        .topbar { background:#fff; border-bottom:1px solid #EFEFED; padding:0 32px; height:56px; display:flex; align-items:center; justify-content:space-between; position:sticky; top:0; z-index:10; }
        .brand { display:flex; align-items:center; gap:10px; }
        .brand-icon { width:30px; height:30px; background:#15803D; border-radius:8px; display:flex; align-items:center; justify-content:center; color:white; }
        .brand-name { font-size:15px; font-weight:500; color:#1A1A1A; }
        .topbar-right { display:flex; align-items:center; gap:8px; }
        .user-chip { display:flex; align-items:center; gap:8px; background:#F5F5F3; border-radius:100px; padding:4px 12px 4px 4px; }
        .avatar { width:26px; height:26px; background:#15803D; border-radius:50%; display:flex; align-items:center; justify-content:center; color:white; font-size:11px; font-weight:500; }
        .username { font-size:13px; color:#444; font-weight:500; }
        .logout { display:flex; align-items:center; gap:5px; font-size:13px; color:#999; background:none; border:none; cursor:pointer; padding:6px 10px; border-radius:8px; transition:all 0.15s; font-family:'DM Sans',sans-serif; }
        .logout:hover { background:#FEE2E2; color:#DC2626; }
        .tab-bar { background:#fff; border-bottom:1px solid #EFEFED; padding:0 32px; display:flex; gap:2px; }
        .tab-btn { padding:14px 16px; font-size:13px; font-weight:500; color:#999; background:none; border:none; border-bottom:2px solid transparent; cursor:pointer; font-family:'DM Sans',sans-serif; transition:all 0.15s; display:flex; align-items:center; gap:6px; }
        .tab-btn:hover { color:#555; }
        .tab-btn.active { color:#15803D; border-bottom-color:#15803D; }
        .wrap { max-width:900px; margin:0 auto; padding:28px 32px; }
        .page-header { margin-bottom:24px; }
        .page-greeting { font-family:'DM Serif Display',serif; font-size:22px; color:#1A1A1A; }
        .page-date { font-size:13px; color:#AAA; margin-top:3px; font-weight:300; }
        .stats-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-bottom:20px; }
        .stat-card { background:#fff; border:1px solid #EFEFED; border-radius:14px; padding:18px; }
        .stat-n { font-size:28px; font-weight:500; line-height:1; }
        .stat-l { font-size:11px; color:#AAA; margin-top:5px; text-transform:uppercase; letter-spacing:0.05em; }
        .card { background:#fff; border:1px solid #EFEFED; border-radius:14px; overflow:hidden; margin-bottom:16px; }
        .card-head { padding:14px 20px; border-bottom:1px solid #F5F5F3; display:flex; align-items:center; justify-content:space-between; }
        .card-title { font-size:13px; font-weight:500; color:#1A1A1A; }
        .week-chart { display:flex; align-items:flex-end; gap:6px; padding:20px; height:100px; }
        .week-bar-wrap { flex:1; display:flex; flex-direction:column; align-items:center; gap:6px; height:100%; justify-content:flex-end; }
        .week-bar-track { width:100%; flex:1; background:#F5F5F3; border-radius:4px; overflow:hidden; display:flex; flex-direction:column; justify-content:flex-end; }
        .week-bar-fill { width:100%; border-radius:4px; transition:height 0.4s; }
        .week-day { font-size:10px; color:#AAA; font-weight:500; }
        .week-pct { font-size:10px; color:#555; font-weight:500; }
        .learner-att-row { display:flex; align-items:center; justify-content:space-between; padding:10px 20px; border-bottom:1px solid #FAFAF8; }
        .learner-att-row:last-child { border-bottom:none; }
        .progress-bar { flex:1; height:4px; background:#F0F0EE; border-radius:2px; overflow:hidden; margin:0 12px; }
        .progress-fill { height:100%; border-radius:2px; }
        .topic-bar-row { padding:12px 20px; border-bottom:1px solid #F5F5F3; }
        .topic-bar-row:last-child { border-bottom:none; }
        .topic-bar-header { display:flex; justify-content:space-between; margin-bottom:6px; }
        .topic-bar-name { font-size:13px; font-weight:500; color:#1A1A1A; }
        .topic-bar-pct { font-size:13px; font-weight:500; color:#15803D; }
        .topic-track { width:100%; height:6px; background:#F0F0EE; border-radius:3px; overflow:hidden; }
        .topic-fill { height:100%; border-radius:3px; background:#22C55E; }
        .topic-sub { font-size:11px; color:#AAA; margin-top:4px; }
        .session-card { background:#fff; border:1px solid #EFEFED; border-radius:12px; padding:16px 20px; margin-bottom:10px; cursor:pointer; transition:all 0.15s; display:flex; align-items:center; justify-content:space-between; }
        .session-card:hover { border-color:#BBF7D0; background:#F0FDF4; }
        .session-name { font-size:14px; font-weight:500; color:#1A1A1A; }
        .session-meta { font-size:12px; color:#AAA; margin-top:3px; }
        .att-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:20px; flex-wrap:wrap; gap:12px; }
        .att-back { font-size:13px; color:#AAA; background:none; border:none; cursor:pointer; font-family:'DM Sans',sans-serif; display:flex; align-items:center; gap:4px; margin-bottom:6px; padding:0; }
        .att-back:hover { color:#555; }
        .att-title { font-size:18px; font-weight:500; color:#1A1A1A; font-family:'DM Serif Display',serif; }
        .att-subtitle { font-size:12px; color:#AAA; margin-top:2px; }
        .att-controls { display:flex; align-items:center; gap:10px; }
        .date-input { height:38px; border:1px solid #EFEFED; border-radius:9px; padding:0 12px; font-size:13px; font-family:'DM Sans',sans-serif; color:#1A1A1A; background:#fff; outline:none; }
        .date-input:focus { border-color:#15803D; }
        .save-att-btn { background:#15803D; color:white; border:none; border-radius:9px; padding:9px 20px; font-size:13px; font-weight:500; cursor:pointer; font-family:'DM Sans',sans-serif; }
        .save-att-btn:disabled { opacity:0.5; }
        .att-summary { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin-bottom:16px; }
        .att-sum-card { border-radius:10px; padding:10px 12px; text-align:center; }
        .att-sum-n { font-size:20px; font-weight:500; }
        .att-sum-l { font-size:10px; margin-top:2px; text-transform:uppercase; letter-spacing:0.04em; }
        .mark-all-row { display:flex; gap:6px; margin-bottom:14px; align-items:center; flex-wrap:wrap; }
        .mark-all-label { font-size:12px; color:#AAA; }
        .mark-all-btn { font-size:11px; padding:5px 12px; border-radius:8px; border:1px solid transparent; cursor:pointer; font-family:'DM Sans',sans-serif; font-weight:500; }
        .learner-card { background:#fff; border:1px solid #EFEFED; border-radius:12px; padding:14px 16px; margin-bottom:8px; transition:border-color 0.15s; }
        .learner-card-top { display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; flex-wrap:wrap; gap:8px; }
        .learner-card-name { font-size:14px; font-weight:500; color:#1A1A1A; display:flex; align-items:center; gap:8px; }
        .learner-status-dot { width:8px; height:8px; border-radius:50%; }
        .status-btns { display:flex; gap:5px; flex-wrap:wrap; }
        .status-btn { padding:5px 12px; border-radius:8px; border:2px solid transparent; cursor:pointer; font-size:12px; font-weight:500; font-family:'DM Sans',sans-serif; transition:all 0.15s; }
        .note-input { width:100%; height:34px; border:1px solid #F0F0EE; border-radius:8px; padding:0 12px; font-size:12px; font-family:'DM Sans',sans-serif; color:#555; background:#FAFAF8; outline:none; }
        .note-input:focus { border-color:#15803D; background:#fff; }
        .note-input::placeholder { color:#CCC; }
        .class-btn { background:#fff; border:1px solid #EFEFED; border-radius:12px; padding:16px 20px; margin-bottom:10px; cursor:pointer; transition:all 0.15s; display:flex; align-items:center; justify-content:space-between; width:100%; text-align:left; font-family:'DM Sans',sans-serif; }
        .class-btn:hover { border-color:#BBF7D0; background:#F0FDF4; }
        .subject-btn { background:#fff; border:1px solid #EFEFED; border-radius:12px; padding:14px 20px; margin-bottom:8px; cursor:pointer; transition:all 0.15s; display:flex; align-items:center; justify-content:space-between; width:100%; text-align:left; font-family:'DM Sans',sans-serif; }
        .subject-btn:hover { border-color:#BBF7D0; background:#F0FDF4; }
        .progress-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:20px; flex-wrap:wrap; gap:10px; }
        .progress-back { font-size:13px; color:#AAA; background:none; border:none; cursor:pointer; font-family:'DM Sans',sans-serif; display:flex; align-items:center; gap:4px; padding:0; }
        .progress-back:hover { color:#555; }
        .progress-title { font-size:18px; font-weight:500; color:#1A1A1A; font-family:'DM Serif Display',serif; margin-top:6px; }
        .progress-meta { font-size:12px; color:#AAA; margin-top:2px; }
        .save-prog-btn { background:#15803D; color:white; border:none; border-radius:9px; padding:9px 20px; font-size:13px; font-weight:500; cursor:pointer; font-family:'DM Sans',sans-serif; }
        .save-prog-btn:disabled { opacity:0.5; }
        .prog-table { background:#fff; border:1px solid #EFEFED; border-radius:14px; overflow:hidden; }
        .prog-table-inner { overflow-x:auto; }
        table { width:100%; border-collapse:collapse; }
        thead tr { background:#FAFAF8; border-bottom:1px solid #EFEFED; }
        th { padding:10px 12px; font-size:11px; font-weight:500; color:#AAA; text-align:center; text-transform:uppercase; letter-spacing:0.04em; white-space:nowrap; }
        th:first-child { text-align:left; min-width:140px; }
        td { padding:10px 12px; border-bottom:1px solid #FAFAF8; text-align:center; }
        td:first-child { text-align:left; }
        tr:last-child td { border-bottom:none; }
        tr:hover td { background:#FAFAF8; }
        .learner-name-cell { font-size:13px; font-weight:500; color:#1A1A1A; }
        .learner-pct-cell { font-size:11px; color:#AAA; margin-top:2px; }
        .tick-btn { width:32px; height:32px; border-radius:8px; border:2px solid #EFEFED; background:#fff; cursor:pointer; display:flex; align-items:center; justify-content:center; margin:0 auto; transition:all 0.15s; }
        .tick-btn.done { background:#22C55E; border-color:#22C55E; }
        .tick-btn:not(.done):hover { border-color:#BBF7D0; background:#F0FDF4; }
        .pct-badge { font-size:11px; font-weight:500; padding:3px 8px; border-radius:8px; display:inline-block; }
        .no-tracked-msg { padding:32px; text-align:center; }
        .empty-state { padding:48px 20px; text-align:center; }
        .empty-title { font-size:14px; font-weight:500; color:#555; margin-bottom:4px; }
        .empty-sub { font-size:12px; color:#AAA; }
      `}</style>

      <div className="topbar">
        <div className="brand">
          <div className="brand-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7z"/></svg>
          </div>
          <span className="brand-name">Islamic Teacher</span>
        </div>
        <div className="topbar-right">
          <div className="user-chip">
            <div className="avatar">{teacherName.charAt(0)}</div>
            <span className="username">{teacherName}</span>
          </div>
          <button className="logout" onClick={handleLogout}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Sign out
          </button>
        </div>
      </div>

      <div className="tab-bar">
        {[
          { key: 'dashboard', label: 'Dashboard', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> },
          { key: 'attendance', label: 'Attendance', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg> },
          { key: 'islamic', label: 'Topic Tracking', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg> },
        ].map(tab => (
          <button key={tab.key} className={`tab-btn ${activeTab === tab.key ? 'active' : ''}`} onClick={() => setActiveTab(tab.key)}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <div className="wrap">

        {/* DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div>
            <div className="page-header">
              <h1 className="page-greeting">Good morning, {teacherName.split(' ')[0]}</h1>
              <p className="page-date">{dateFormatted}</p>
            </div>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-n" style={{ color: '#15803D' }}>{myClasses.length}</div>
                <div className="stat-l">My classes</div>
              </div>
              <div className="stat-card">
                <div className="stat-n" style={{ color: '#1D4ED8' }}>{stats.length}</div>
                <div className="stat-l">Total learners</div>
              </div>
              <div className="stat-card">
                <div className="stat-n" style={{ color: stats.length > 0 && Math.round(stats.reduce((a, s) => a + s.pct, 0) / stats.length) < 70 ? '#EF4444' : '#15803D' }}>
                  {stats.length > 0 ? Math.round(stats.reduce((a, s) => a + s.pct, 0) / stats.length) : 0}%
                </div>
                <div className="stat-l">Avg attendance</div>
              </div>
            </div>

            {weeklyAtt.length > 0 && (
              <div className="card">
                <div className="card-head"><span className="card-title">Attendance this week</span></div>
                <div className="week-chart">
                  {weeklyAtt.map((d, i) => (
                    <div key={i} className="week-bar-wrap">
                      <span className="week-pct" style={{ color: d.hasData ? (d.pct >= 70 ? '#15803D' : '#EF4444') : '#CCC' }}>
                        {d.hasData ? `${d.pct}%` : '—'}
                      </span>
                      <div className="week-bar-track">
                        <div className="week-bar-fill" style={{ height: `${d.hasData ? Math.max(d.pct, 4) : 4}%`, background: d.hasData ? (d.pct >= 70 ? '#22C55E' : '#EF4444') : '#E5E5E5' }} />
                      </div>
                      <span className="week-day">{d.day}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {topicStats.length > 0 && (
              <div className="card">
                <div className="card-head"><span className="card-title">Topic completion</span></div>
                {topicStats.map((ts: any) => (
                  <div key={ts.subject.id} className="topic-bar-row">
                    <div className="topic-bar-header">
                      <span className="topic-bar-name">{ts.subject.name}</span>
                      <span className="topic-bar-pct">{ts.pct}%</span>
                    </div>
                    <div className="topic-track"><div className="topic-fill" style={{ width: `${ts.pct}%` }} /></div>
                    <div className="topic-sub">{ts.completed} / {ts.totalPossible} completed</div>
                  </div>
                ))}
              </div>
            )}

            <div className="card">
              <div className="card-head">
                <span className="card-title">Learner attendance rates</span>
                <span style={{ fontSize: '11px', color: '#AAA' }}>{stats.length} learners</span>
              </div>
              {stats.length === 0 ? (
                <div className="empty-state"><p className="empty-title">No data yet</p><p className="empty-sub">Mark attendance to see stats</p></div>
              ) : (
                stats.map((s: any) => (
                  <div key={s.learner.id} className="learner-att-row">
                    <div style={{ minWidth: 140 }}>
                      <div style={{ fontSize: '13px', fontWeight: 500, color: '#1A1A1A' }}>{s.learner.full_name}</div>
                      <div style={{ fontSize: '11px', color: '#AAA' }}>{s.cls.name}</div>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${s.pct}%`, background: s.pct >= 70 ? '#22C55E' : '#EF4444' }} />
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 500, color: s.pct >= 70 ? '#15803D' : '#DC2626', minWidth: 36, textAlign: 'right' }}>{s.pct}%</span>
                  </div>
                ))
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
                  <h1 className="page-greeting">Attendance</h1>
                  <p className="page-date">Select a session to mark attendance</p>
                </div>
                {todaySessions.length === 0 ? (
                  <div className="empty-state">
                    <p className="empty-title">No sessions today</p>
                    <p className="empty-sub">{todayName} has no scheduled sessions</p>
                  </div>
                ) : (
                  todaySessions.map(s => (
                    <div key={s.id} className="session-card" onClick={() => selectSession(s)}>
                      <div>
                        <div className="session-name">{s.name}</div>
                        <div className="session-meta">{s.classes?.name} · {s.start_time?.slice(0,5)} – {s.end_time?.slice(0,5)}</div>
                      </div>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#15803D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div>
                <div className="att-header">
                  <div>
                    <button className="att-back" onClick={() => setSelectedSession(null)}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                      Back to sessions
                    </button>
                    <div className="att-title">{selectedSession.name}</div>
                    <div className="att-subtitle">{selectedSession.classes?.name} · {selectedSession.start_time?.slice(0,5)} – {selectedSession.end_time?.slice(0,5)}</div>
                  </div>
                  <div className="att-controls">
                    <input type="date" value={attDate} onChange={e => changeDate(e.target.value)} className="date-input" />
                    <button className="save-att-btn" onClick={saveAttendance} disabled={saving}>
                      {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save'}
                    </button>
                  </div>
                </div>
                <div className="att-summary">
                  {[
                    { label: 'Present', count: presentCount, bg: '#F0FDF4', color: '#15803D' },
                    { label: 'Late', count: lateCount, bg: '#FEFCE8', color: '#A16207' },
                    { label: 'Absent', count: absentCount, bg: '#FEF2F2', color: '#B91C1C' },
                    { label: 'Excused', count: excusedCount, bg: '#EFF6FF', color: '#1D4ED8' },
                  ].map(s => (
                    <div key={s.label} className="att-sum-card" style={{ background: s.bg }}>
                      <div className="att-sum-n" style={{ color: s.color }}>{s.count}</div>
                      <div className="att-sum-l" style={{ color: s.color }}>{s.label}</div>
                    </div>
                  ))}
                </div>
                <div className="mark-all-row">
                  <span className="mark-all-label">Mark all:</span>
                  {STATUS_OPTIONS.map(s => (
                    <button key={s.key} className="mark-all-btn" onClick={() => markAll(s.key)} style={{ background: s.light, color: s.text }}>
                      {s.label}
                    </button>
                  ))}
                </div>
                {learners.map(l => {
                  const status = attendance[l.id] || 'absent'
                  const statusCfg = STATUS_OPTIONS.find(s => s.key === status)
                  return (
                    <div key={l.id} className="learner-card" style={{ borderColor: statusCfg?.light || '#EFEFED' }}>
                      <div className="learner-card-top">
                        <div className="learner-card-name">
                          <div className="learner-status-dot" style={{ background: statusCfg?.bg || '#EF4444' }} />
                          {l.full_name}
                        </div>
                        <div className="status-btns">
                          {STATUS_OPTIONS.map(s => (
                            <button key={s.key} className="status-btn"
                              onClick={() => { setAttendance(prev => ({ ...prev, [l.id]: s.key })); setSaved(false) }}
                              style={{ background: status === s.key ? s.bg : '#F8F8F6', color: status === s.key ? 'white' : '#AAA', borderColor: status === s.key ? s.bg : 'transparent' }}>
                              {s.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <input className="note-input" value={attNotes[l.id] || ''}
                        onChange={e => { setAttNotes(prev => ({ ...prev, [l.id]: e.target.value })); setSaved(false) }}
                        placeholder="Add a note..." />
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* TOPIC TRACKING */}
        {activeTab === 'islamic' && (
          <div>
            {!selectedClass ? (
              <div>
                <div className="page-header">
                  <h1 className="page-greeting">Topic Tracking</h1>
                  <p className="page-date">Select a class to track progress</p>
                </div>
                {myClasses.length === 0 ? (
                  <div className="empty-state">
                    <p className="empty-title">No classes assigned</p>
                    <p className="empty-sub">Contact admin to assign classes</p>
                  </div>
                ) : (
                  myClasses.map(cls => (
                    <button key={cls.id} className="class-btn" onClick={() => selectClass(cls)}>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 500, color: '#1A1A1A' }}>{cls.name}</div>
                        <div style={{ fontSize: '12px', color: '#AAA', marginTop: 2 }}>Islamic class</div>
                      </div>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#15803D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                    </button>
                  ))
                )}
              </div>
            ) : !selectedSubject ? (
              <div>
                <button className="progress-back" onClick={() => setSelectedClass(null)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                  Back to classes
                </button>
                <div className="page-header" style={{ marginTop: 8 }}>
                  <h1 className="page-greeting">{selectedClass.name}</h1>
                  <p className="page-date">Select a subject</p>
                </div>
                {subjects.length === 0 ? (
                  <div className="empty-state">
                    <p className="empty-title">No subjects in curriculum</p>
                    <p className="empty-sub">Admin needs to add subjects in Curriculum Management</p>
                  </div>
                ) : (
                  subjects.map(s => (
                    <button key={s.id} className="subject-btn" onClick={() => selectSubject(s)}>
                      <div style={{ fontSize: '14px', fontWeight: 500, color: '#1A1A1A' }}>{s.name}</div>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#15803D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                    </button>
                  ))
                )}
              </div>
            ) : (
              <div>
                <div className="progress-header">
                  <div>
                    <button className="progress-back" onClick={() => setSelectedSubject(null)}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                      Back to subjects
                    </button>
                    <div className="progress-title">{selectedSubject.name}</div>
                    <div className="progress-meta">{selectedClass.name} · {topics.length} tracked topics · {islamicLearners.length} learners</div>
                  </div>
                  <button className="save-prog-btn" onClick={saveProgress} disabled={savingProgress}>
                    {savingProgress ? 'Saving...' : savedProgress ? '✓ Saved' : 'Save progress'}
                  </button>
                </div>

                {topics.length === 0 ? (
                  <div className="empty-state">
                    <p className="empty-title">No tracked topics</p>
                    <p className="empty-sub">Admin needs to enable "Track per learner" on topics in Curriculum Management</p>
                  </div>
                ) : islamicLearners.length === 0 ? (
                  <div className="empty-state">
                    <p className="empty-title">No learners in this class</p>
                  </div>
                ) : (
                  <div className="prog-table">
                    <div className="prog-table-inner">
                      <table>
                        <thead>
                          <tr>
                            <th>Learner</th>
                            {topics.map(t => (
                              <th key={t.id} title={t.title}>
                                <span style={{ display: 'block', maxWidth: 70, overflow: 'hidden', textOverflow: 'ellipsis', margin: '0 auto' }}>{t.title}</span>
                              </th>
                            ))}
                            <th>Done</th>
                          </tr>
                        </thead>
                        <tbody>
                          {islamicLearners.map((l: any) => {
                            const completedCount = topics.filter(t => progress[l.id]?.[t.id]).length
                            const pct = topics.length > 0 ? Math.round((completedCount / topics.length) * 100) : 0
                            return (
                              <tr key={l.id}>
                                <td>
                                  <div className="learner-name-cell">{l.full_name}</div>
                                  <div className="learner-pct-cell">{completedCount}/{topics.length}</div>
                                </td>
                                {topics.map(t => (
                                  <td key={t.id}>
                                    <button className={`tick-btn ${progress[l.id]?.[t.id] ? 'done' : ''}`} onClick={() => toggleProgress(l.id, t.id)}>
                                      {progress[l.id]?.[t.id] ? (
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                      ) : (
                                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#E5E5E5' }} />
                                      )}
                                    </button>
                                  </td>
                                ))}
                                <td>
                                  <span className="pct-badge" style={{
                                    background: pct >= 70 ? '#F0FDF4' : pct >= 40 ? '#FEFCE8' : '#FEF2F2',
                                    color: pct >= 70 ? '#15803D' : pct >= 40 ? '#A16207' : '#B91C1C',
                                  }}>{pct}%</span>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}