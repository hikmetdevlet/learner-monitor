'use client'
import { useEffect, useState } from 'react'
import { createClient } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

type Timetable = { id: string; name: string; day_of_week: number; start_time: string; end_time: string; users: any; classes: any }
type User = { id: string; full_name: string; display_name: string; role: string }
type Class = { id: string; name: string; class_type: string }

const DAYS = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const DAY_NUMS = [1, 2, 3, 4, 5, 6, 7]

export default function ManageSessions() {
  const [timetable, setTimetable]   = useState<Timetable[]>([])
  const [teachers, setTeachers]     = useState<User[]>([])
  const [classes, setClasses]       = useState<Class[]>([])
  const [activeView, setActiveView] = useState<'all' | 'islamic' | 'secular'>('all')
  const [filterClass, setFilterClass] = useState('all')
  const [showForm, setShowForm]     = useState(false)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')
  const [editingId, setEditingId]   = useState<string | null>(null)
  const [editForm, setEditForm]     = useState<any>({})
  const [showPrintModal, setShowPrintModal] = useState(false)
  const [printMode, setPrintMode]   = useState<'class' | 'teacher'>('class')
  const [printTarget, setPrintTarget] = useState('all')

  // Add form state
  const [name, setName]               = useState('')
  const [teacherId, setTeacherId]     = useState('')
  const [classId, setClassId]         = useState('')
  const [startTime, setStartTime]     = useState('08:00')
  const [endTime, setEndTime]         = useState('09:00')
  const [selectedDays, setSelectedDays] = useState<number[]>([1])

  const router   = useRouter()
  const supabase = createClient()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const [{ data: ttData }, { data: teacherData }, { data: classData }] = await Promise.all([
      supabase.from('timetable')
        .select('*, users(id, full_name, display_name, role), classes(id, name, class_type)')
        .order('day_of_week').order('start_time'),
      supabase.from('users').select('*').in('role', ['teacher', 'islamic_teacher']).order('full_name'),
      supabase.from('classes').select('*').order('class_type').order('name'),
    ])
    setTimetable(ttData || [])
    setTeachers(teacherData || [])
    setClasses(classData || [])

    // Set sensible defaults for the add form
    if (teacherData?.length) {
      const first = teacherData[0]
      setTeacherId(first.id)
      // Auto-select matching class type
      const matchingClass = (classData || []).find(c =>
        first.role === 'islamic_teacher' ? c.class_type === 'islamic' : c.class_type !== 'islamic'
      ) || classData?.[0]
      if (matchingClass) setClassId(matchingClass.id)
    } else if (classData?.length) {
      setClassId(classData[0].id)
    }
  }

  // ── Smart filtering: when teacher changes, filter available classes ──
  function onTeacherChange(tid: string) {
    setTeacherId(tid)
    const selectedTeacher = teachers.find(t => t.id === tid)
    if (!selectedTeacher) return

    // Auto-filter class list based on teacher role
    const isIslamic = selectedTeacher.role === 'islamic_teacher'
    const compatibleClasses = classes.filter(c =>
      isIslamic ? c.class_type === 'islamic' : c.class_type !== 'islamic'
    )

    // If current classId is not compatible, switch to first compatible
    const currentClass = classes.find(c => c.id === classId)
    const isCompatible = isIslamic
      ? currentClass?.class_type === 'islamic'
      : currentClass?.class_type !== 'islamic'

    if (!isCompatible && compatibleClasses.length > 0) {
      setClassId(compatibleClasses[0].id)
    }
  }

  // Classes shown in add form based on selected teacher role
  function getFormClasses(): Class[] {
    const selectedTeacher = teachers.find(t => t.id === teacherId)
    if (!selectedTeacher) return classes
    return selectedTeacher.role === 'islamic_teacher'
      ? classes.filter(c => c.class_type === 'islamic')
      : classes.filter(c => c.class_type !== 'islamic')
  }

  // Teachers shown in add form based on active view
  function getFormTeachers(): User[] {
    if (activeView === 'islamic') return teachers.filter(t => t.role === 'islamic_teacher')
    if (activeView === 'secular') return teachers.filter(t => t.role === 'teacher')
    return teachers
  }

  function toggleDay(day: number) {
    setSelectedDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day])
  }

  function getDisplayName(user: any) {
    return user?.display_name || user?.full_name || '—'
  }

  function getRoleLabel(role: string) {
    return role === 'islamic_teacher' ? 'Islamic' : 'Secular'
  }

  async function addSession() {
    if (!name.trim() || !teacherId || !classId || selectedDays.length === 0) return
    setLoading(true); setError('')
    for (const day of selectedDays) {
      await supabase.from('timetable').insert({
        name: name.trim(), teacher_id: teacherId, class_id: classId,
        day_of_week: day, start_time: startTime, end_time: endTime,
      })
    }
    setName(''); setSelectedDays([1]); setShowForm(false)
    await loadData()
    setLoading(false)
  }

  async function deleteSession(id: string) {
    const { count } = await supabase.from('attendance')
      .select('*', { count: 'exact', head: true }).eq('timetable_id', id)
    if ((count || 0) > 0) {
      const ok = window.confirm(`This session has ${count} attendance record(s).\n\nOK → Delete session AND all attendance data\nCancel → Keep session`)
      if (!ok) return
    } else {
      if (!confirm('Delete this session?')) return
    }
    await supabase.from('timetable').delete().eq('id', id)
    await loadData()
  }

  function startEdit(s: any) {
    setEditingId(s.id)
    setEditForm({
      name: s.name,
      start_time: s.start_time,
      end_time: s.end_time,
      teacher_id: s.users?.id || '',
      class_id: s.classes?.id || '',
    })
  }

  async function saveEdit() {
    if (!editingId) return
    await supabase.from('timetable').update({
      name: editForm.name,
      start_time: editForm.start_time,
      end_time: editForm.end_time,
      teacher_id: editForm.teacher_id || null,
      class_id: editForm.class_id || null,
    }).eq('id', editingId)
    setEditingId(null)
    await loadData()
  }

  // Edit form: get compatible teachers/classes
  function getEditTeachers() { return teachers }
  function getEditClasses() {
    const t = teachers.find(t => t.id === editForm.teacher_id)
    if (!t) return classes
    return t.role === 'islamic_teacher'
      ? classes.filter(c => c.class_type === 'islamic')
      : classes.filter(c => c.class_type !== 'islamic')
  }

  function doPrint() {
    setShowPrintModal(false)
    setTimeout(() => window.print(), 100)
  }

  function getTimeSlots(sessions: any[]) {
    return [...new Set(sessions.map(s => s.start_time?.slice(0, 5)))].sort()
  }

  function getPrintData() {
    if (printMode === 'class') {
      const list = printTarget === 'all' ? classes : classes.filter(c => c.id === printTarget)
      return list.map(c => ({
        label: c.name, type: c.class_type,
        sessions: timetable.filter((t: any) => t.classes?.id === c.id),
      }))
    } else {
      const list = printTarget === 'all' ? teachers : teachers.filter(t => t.id === printTarget)
      return list.map(t => ({
        label: getDisplayName(t), type: t.role,
        sessions: timetable.filter((s: any) => s.users?.id === t.id),
      }))
    }
  }

  // ── Derived ────────────────────────────────────────────────────
  const filtered = timetable.filter((t: any) => {
    if (activeView === 'islamic' && t.classes?.class_type !== 'islamic') return false
    if (activeView === 'secular' && t.classes?.class_type === 'islamic') return false
    if (filterClass !== 'all' && t.classes?.id !== filterClass) return false
    return true
  })

  const grouped = DAYS.slice(1).reduce((acc, dayName) => {
    const dayNum = DAYS.indexOf(dayName)
    acc[dayName] = filtered.filter(t => t.day_of_week === dayNum)
    return acc
  }, {} as Record<string, Timetable[]>)

  const filteredClasses = activeView === 'islamic'
    ? classes.filter(c => c.class_type === 'islamic')
    : activeView === 'secular'
    ? classes.filter(c => c.class_type !== 'islamic')
    : classes

  const totalSessions = filtered.length
  const sessionsByDay = DAY_NUMS.map(d => filtered.filter(t => t.day_of_week === d).length)
  const printData     = getPrintData()
  const activeDays    = DAY_NUMS.filter(d => timetable.some(t => t.day_of_week === d))

  return (
    <main style={{ minHeight: '100vh', background: '#F8F7F4', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&family=DM+Serif+Display&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin:0; padding:0; }
        .topbar { background:#fff; border-bottom:1px solid #EFEFED; padding:0 32px; height:56px; display:flex; align-items:center; justify-content:space-between; position:sticky; top:0; z-index:10; }
        .topbar-left { display:flex; align-items:center; gap:12px; }
        .back-btn { display:flex; align-items:center; gap:6px; font-size:13px; color:#999; background:none; border:none; cursor:pointer; padding:6px 10px; border-radius:8px; transition:all 0.15s; font-family:'DM Sans',sans-serif; }
        .back-btn:hover { background:#F5F5F3; color:#333; }
        .page-title { font-size:15px; font-weight:500; color:#1A1A1A; }
        .divider { color:#DDD; }
        .topbar-right { display:flex; align-items:center; gap:8px; }
        .print-btn { display:flex; align-items:center; gap:6px; background:#F5F5F3; color:#444; border:none; border-radius:9px; padding:7px 14px; font-size:13px; font-weight:500; cursor:pointer; font-family:'DM Sans',sans-serif; transition:all 0.15s; }
        .print-btn:hover { background:#EBEBEB; }
        .add-btn { display:flex; align-items:center; gap:6px; background:#1A1A1A; color:white; border:none; border-radius:9px; padding:8px 16px; font-size:13px; font-weight:500; cursor:pointer; transition:all 0.2s; font-family:'DM Sans',sans-serif; }
        .add-btn:hover { background:#333; }
        .add-btn.cancel { background:#F5F5F3; color:#666; }
        .add-btn.cancel:hover { background:#EBEBEB; }
        .wrap { max-width:960px; margin:0 auto; padding:28px 32px; }
        .view-tabs { display:flex; gap:6px; margin-bottom:20px; flex-wrap:wrap; }
        .view-tab { padding:7px 16px; border-radius:9px; border:1px solid #EFEFED; background:#fff; font-size:13px; color:#666; cursor:pointer; font-family:'DM Sans',sans-serif; font-weight:500; transition:all 0.15s; display:flex; align-items:center; gap:6px; }
        .view-tab:hover { border-color:#DDD; }
        .view-tab.active { background:#1A1A1A; color:white; border-color:#1A1A1A; }
        .stats-row { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-bottom:20px; }
        .stat-mini { background:#fff; border:1px solid #EFEFED; border-radius:12px; padding:14px 16px; }
        .stat-mini-n { font-size:22px; font-weight:500; color:#1A1A1A; }
        .stat-mini-l { font-size:11px; color:#AAA; margin-top:3px; text-transform:uppercase; letter-spacing:0.04em; }
        .filter-row { display:flex; gap:10px; margin-bottom:16px; align-items:center; flex-wrap:wrap; }
        .filter-select { height:36px; border:1px solid #EFEFED; border-radius:9px; padding:0 12px; font-size:13px; font-family:'DM Sans',sans-serif; background:#fff; color:#555; outline:none; }
        .filter-select:focus { border-color:#1A1A1A; }
        .form-card { background:#fff; border:1px solid #EFEFED; border-radius:14px; padding:22px; margin-bottom:20px; }
        .form-title { font-size:14px; font-weight:500; color:#1A1A1A; margin-bottom:16px; }
        .form-row { display:flex; gap:10px; margin-bottom:10px; flex-wrap:wrap; }
        .form-group { display:flex; flex-direction:column; gap:5px; flex:1; min-width:140px; }
        .form-label { font-size:11px; font-weight:500; color:#888; text-transform:uppercase; letter-spacing:0.04em; }
        .form-input, .form-select { height:38px; border:1px solid #EFEFED; border-radius:9px; padding:0 12px; font-size:13px; font-family:'DM Sans',sans-serif; color:#1A1A1A; background:#fff; outline:none; transition:border-color 0.15s; }
        .form-input:focus, .form-select:focus { border-color:#1A1A1A; }
        .form-input::placeholder { color:#CCC; }
        /* Teacher role indicator in select */
        .role-hint { font-size:11px; color:#AAA; margin-top:4px; }
        .days-grid { display:flex; gap:6px; flex-wrap:wrap; }
        .day-btn { width:44px; height:36px; border-radius:9px; border:1px solid #EFEFED; background:#fff; font-size:12px; font-weight:500; color:#666; cursor:pointer; font-family:'DM Sans',sans-serif; transition:all 0.15s; display:flex; align-items:center; justify-content:center; }
        .day-btn:hover { border-color:#AAA; }
        .day-btn.selected { background:#1A1A1A; color:white; border-color:#1A1A1A; }
        .form-actions { display:flex; justify-content:flex-end; gap:8px; margin-top:14px; }
        .save-btn { background:#1A1A1A; color:white; border:none; border-radius:9px; padding:9px 20px; font-size:13px; font-weight:500; cursor:pointer; font-family:'DM Sans',sans-serif; }
        .save-btn:hover { background:#333; }
        .save-btn:disabled { opacity:0.5; cursor:not-allowed; }
        .cancel-btn { background:#F5F5F3; color:#666; border:none; border-radius:9px; padding:9px 16px; font-size:13px; cursor:pointer; font-family:'DM Sans',sans-serif; }
        .cancel-btn:hover { background:#EBEBEB; }
        .error-msg { font-size:12px; color:#DC2626; margin-top:8px; }
        /* Info box when teacher auto-matched */
        .info-hint { background:#F0FDF4; border:1px solid #BBF7D0; border-radius:8px; padding:8px 12px; font-size:11px; color:#15803D; margin-bottom:12px; display:flex; align-items:center; gap:6px; }
        .warn-hint { background:#FFF7ED; border:1px solid #FED7AA; border-radius:8px; padding:8px 12px; font-size:11px; color:#C2410C; margin-bottom:12px; display:flex; align-items:center; gap:6px; }
        .day-section { margin-bottom:16px; }
        .day-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; }
        .day-name { font-size:12px; font-weight:500; color:#888; text-transform:uppercase; letter-spacing:0.06em; }
        .day-count { font-size:11px; color:#CCC; background:#F5F5F3; padding:2px 8px; border-radius:8px; }
        .sessions-card { background:#fff; border:1px solid #EFEFED; border-radius:12px; overflow:hidden; }
        .session-row { display:grid; grid-template-columns:90px 1fr 160px 110px 120px; align-items:center; padding:11px 16px; border-bottom:1px solid #F8F8F6; transition:background 0.15s; gap:8px; }
        .session-row:last-child { border-bottom:none; }
        .session-row:hover { background:#FAFAF8; }
        .time-text { font-size:12px; color:#AAA; white-space:nowrap; }
        .session-name { font-size:13px; font-weight:500; color:#1A1A1A; }
        .teacher-wrap { display:flex; flex-direction:column; }
        .teacher-display { font-size:12px; color:#555; font-weight:500; }
        .teacher-full { font-size:10px; color:#AAA; }
        .teacher-role { font-size:9px; font-weight:600; padding:1px 5px; border-radius:4px; display:inline-block; margin-top:2px; }
        .teacher-role.islamic { background:#F0FDF4; color:#15803D; }
        .teacher-role.secular { background:#EFF6FF; color:#1D4ED8; }
        .class-badge { font-size:10px; padding:3px 8px; border-radius:7px; font-weight:500; display:inline-block; }
        .class-badge.islamic { background:#F0FDF4; color:#15803D; }
        .class-badge.secular { background:#EFF6FF; color:#1D4ED8; }
        .row-actions { display:flex; gap:6px; justify-content:flex-end; }
        .action-btn { font-size:11px; padding:4px 9px; border-radius:7px; border:1px solid transparent; cursor:pointer; font-family:'DM Sans',sans-serif; font-weight:500; display:flex; align-items:center; gap:3px; transition:all 0.15s; }
        .edit-btn { background:#F5F5F3; color:#666; border-color:#EFEFED; }
        .edit-btn:hover { background:#EBEBEB; }
        .del-btn { background:#fff; color:#CCC; border-color:#EFEFED; }
        .del-btn:hover { background:#FEF2F2; color:#DC2626; border-color:#FECACA; }
        .edit-row { padding:12px 16px; background:#F8F8F6; border-bottom:1px solid #F0F0EE; display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
        .edit-input, .edit-select { height:32px; border:1px solid #DDD; border-radius:7px; padding:0 10px; font-size:12px; font-family:'DM Sans',sans-serif; color:#1A1A1A; background:#fff; outline:none; }
        .edit-input:focus, .edit-select:focus { border-color:#1A1A1A; }
        .edit-input { flex:1; min-width:100px; }
        .save-edit-btn { background:#1A1A1A; color:white; border:none; border-radius:7px; padding:6px 12px; font-size:12px; font-weight:500; cursor:pointer; font-family:'DM Sans',sans-serif; white-space:nowrap; }
        .cancel-edit-btn { background:#F5F5F3; color:#666; border:none; border-radius:7px; padding:6px 10px; font-size:12px; cursor:pointer; font-family:'DM Sans',sans-serif; }
        /* Modal */
        .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.4); z-index:100; display:flex; align-items:center; justify-content:center; }
        .modal { background:#fff; border-radius:16px; padding:28px; width:420px; max-width:90vw; }
        .modal-title { font-size:16px; font-weight:500; color:#1A1A1A; margin-bottom:20px; }
        .mode-tabs { display:flex; gap:6px; margin-bottom:16px; }
        .mode-tab { flex:1; padding:8px; border-radius:9px; border:1px solid #EFEFED; background:#fff; font-size:13px; color:#666; cursor:pointer; font-family:'DM Sans',sans-serif; font-weight:500; text-align:center; transition:all 0.15s; }
        .mode-tab.active { background:#1A1A1A; color:white; border-color:#1A1A1A; }
        .modal-label { font-size:11px; font-weight:500; color:#888; text-transform:uppercase; letter-spacing:0.04em; margin-bottom:6px; display:block; }
        .modal-select { width:100%; height:40px; border:1px solid #EFEFED; border-radius:9px; padding:0 12px; font-size:13px; font-family:'DM Sans',sans-serif; color:#1A1A1A; background:#fff; outline:none; margin-bottom:20px; }
        .modal-select:focus { border-color:#1A1A1A; }
        .modal-actions { display:flex; gap:8px; justify-content:flex-end; }
        .modal-print-btn { background:#1A1A1A; color:white; border:none; border-radius:9px; padding:10px 20px; font-size:13px; font-weight:500; cursor:pointer; font-family:'DM Sans',sans-serif; display:flex; align-items:center; gap:6px; }
        .modal-print-btn:hover { background:#333; }
        .modal-cancel-btn { background:#F5F5F3; color:#666; border:none; border-radius:9px; padding:10px 16px; font-size:13px; cursor:pointer; font-family:'DM Sans',sans-serif; }
        .modal-cancel-btn:hover { background:#EBEBEB; }
        /* Mismatch warning badge */
        .mismatch-badge { font-size:9px; font-weight:700; padding:2px 6px; border-radius:4px; background:#FEF2F2; color:#DC2626; margin-left:6px; }
        /* Print */
        @media screen { .print-area { display:none; } }
        @media print {
          .topbar, .view-tabs, .stats-row, .filter-row, .form-card, .row-actions, .edit-row, .day-section, .modal-overlay { display:none !important; }
          .wrap { display:none !important; }
          .print-area { display:block !important; }
          body { background:white; font-family:'DM Sans',sans-serif; }
          .print-page { page-break-after:always; padding:20px; }
          .print-page:last-child { page-break-after:auto; }
          .print-header { margin-bottom:16px; border-bottom:2px solid #1A1A1A; padding-bottom:10px; }
          .print-title { font-family:'DM Serif Display',serif; font-size:20px; color:#1A1A1A; }
          .print-sub { font-size:12px; color:#888; margin-top:3px; }
          .tt-table { width:100%; border-collapse:collapse; font-size:11px; }
          .tt-table th { background:#1A1A1A; color:white; padding:7px 10px; text-align:left; font-weight:500; }
          .tt-table td { border:1px solid #E5E5E5; padding:7px 10px; vertical-align:top; }
          .tt-table tr:nth-child(even) td { background:#FAFAFA; }
          .tt-cell-name { font-weight:500; color:#1A1A1A; font-size:11px; }
          .tt-cell-teacher { font-size:10px; color:#666; margin-top:2px; }
          .tt-empty { color:#CCC; font-size:10px; }
        }
        @media (max-width:768px) {
          .topbar { padding:0 16px; }
          .wrap { padding:16px; }
          .stats-row { grid-template-columns:1fr 1fr; gap:8px; }
          .view-tabs { gap:4px; }
          .filter-row { flex-direction:column; align-items:stretch; }
          .form-card { padding:14px; }
          .form-row { flex-direction:column; gap:8px; }
          .session-row { grid-template-columns:80px 1fr; gap:6px; padding:10px 12px; }
          .session-row > *:nth-child(3),
          .session-row > *:nth-child(4) { display:none; }
          .row-actions { grid-column:1/-1; justify-content:flex-start; }
        }
      `}</style>

      {/* ── Print modal ── */}
      {showPrintModal && (
        <div className="modal-overlay" onClick={() => setShowPrintModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">Print Timetable</div>
            <div className="mode-tabs">
              <button className={`mode-tab ${printMode === 'class' ? 'active' : ''}`} onClick={() => { setPrintMode('class'); setPrintTarget('all') }}>By Class</button>
              <button className={`mode-tab ${printMode === 'teacher' ? 'active' : ''}`} onClick={() => { setPrintMode('teacher'); setPrintTarget('all') }}>By Teacher</button>
            </div>
            <label className="modal-label">{printMode === 'class' ? 'Select class' : 'Select teacher'}</label>
            <select className="modal-select" value={printTarget} onChange={e => setPrintTarget(e.target.value)}>
              <option value="all">All {printMode === 'class' ? 'classes' : 'teachers'}</option>
              {printMode === 'class'
                ? classes.map(c => <option key={c.id} value={c.id}>{c.name} ({c.class_type})</option>)
                : teachers.map(t => <option key={t.id} value={t.id}>{getDisplayName(t)} — {getRoleLabel(t.role)}</option>)}
            </select>
            <div className="modal-actions">
              <button className="modal-cancel-btn" onClick={() => setShowPrintModal(false)}>Cancel</button>
              <button className="modal-print-btn" onClick={doPrint}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                Print / Save PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Print area ── */}
      <div className="print-area">
        {printData.map((item, idx) => {
          if (!item.sessions.length) return null
          const timeSlots = getTimeSlots(item.sessions)
          return (
            <div key={idx} className="print-page">
              <div className="print-header">
                <div className="print-title">{item.label}</div>
                <div className="print-sub">
                  {item.type === 'islamic' ? 'Islamic Education' : item.type === 'secular' ? 'Secular Education' : item.type === 'islamic_teacher' ? 'Islamic Teacher' : 'Teacher'} · Weekly Timetable
                </div>
              </div>
              <table className="tt-table">
                <thead>
                  <tr>
                    <th style={{ width: 80 }}>Time</th>
                    {activeDays.map(d => <th key={d}>{DAYS[d]}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {timeSlots.map(slot => (
                    <tr key={slot}>
                      <td style={{ fontWeight: 500, color: '#555', whiteSpace: 'nowrap' }}>{slot}</td>
                      {activeDays.map(d => {
                        const s = item.sessions.find((t: any) => t.day_of_week === d && t.start_time?.slice(0,5) === slot)
                        return (
                          <td key={d}>
                            {s ? (
                              <>
                                <div className="tt-cell-name">{s.name}</div>
                                <div className="tt-cell-teacher">{printMode === 'class' ? getDisplayName(s.users) : s.classes?.name}</div>
                                <div className="tt-cell-teacher">{s.start_time?.slice(0,5)} – {s.end_time?.slice(0,5)}</div>
                              </>
                            ) : <span className="tt-empty">—</span>}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        })}
      </div>

      {/* ── Topbar ── */}
      <div className="topbar">
        <div className="topbar-left">
          <button className="back-btn" onClick={() => router.push('/admin')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            Back
          </button>
          <span className="divider">|</span>
          <span className="page-title">Weekly Timetable</span>
        </div>
        <div className="topbar-right">
          <button className="print-btn" onClick={() => setShowPrintModal(true)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            Print / PDF
          </button>
          <button className={`add-btn ${showForm ? 'cancel' : ''}`} onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancel' : (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Add Session
              </>
            )}
          </button>
        </div>
      </div>

      <div className="wrap">

        {/* ── View tabs ── */}
        <div className="view-tabs">
          {[
            { key: 'all',     label: 'All sessions' },
            { key: 'islamic', label: 'Islamic' },
            { key: 'secular', label: 'Secular' },
          ].map(v => (
            <button key={v.key} className={`view-tab ${activeView === v.key ? 'active' : ''}`}
              onClick={() => { setActiveView(v.key as any); setFilterClass('all') }}>
              {v.key === 'islamic' && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7z"/></svg>
              )}
              {v.key === 'secular' && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              )}
              {v.label}
            </button>
          ))}
        </div>

        {/* ── Stats ── */}
        <div className="stats-row">
          <div className="stat-mini">
            <div className="stat-mini-n">{totalSessions}</div>
            <div className="stat-mini-l">Total sessions</div>
          </div>
          {['Mon', 'Tue', 'Wed', 'Thu'].map((d, i) => (
            <div key={d} className="stat-mini">
              <div className="stat-mini-n">{sessionsByDay[i]}</div>
              <div className="stat-mini-l">{d}</div>
            </div>
          ))}
        </div>

        {/* ── Add form ── */}
        {showForm && (() => {
          const formTeachers  = getFormTeachers()
          const formClasses   = getFormClasses()
          const selTeacher    = teachers.find(t => t.id === teacherId)
          const isIslamicTeacher = selTeacher?.role === 'islamic_teacher'

          return (
            <div className="form-card">
              <div className="form-title">Add session to timetable</div>

              {/* Smart hint */}
              {isIslamicTeacher && (
                <div className="info-hint">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  Islamic teacher seçildi — sadece Islamic sınıflar gösteriliyor
                </div>
              )}
              {!isIslamicTeacher && selTeacher && (
                <div className="info-hint" style={{ background: '#EFF6FF', borderColor: '#BFDBFE', color: '#1D4ED8' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  Secular teacher seçildi — sadece secular sınıflar gösteriliyor
                </div>
              )}

              <div className="form-row">
                <div className="form-group" style={{ flex: 2 }}>
                  <label className="form-label">Session name *</label>
                  <input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Quran, Fiqh, Maths..." />
                </div>
                <div className="form-group">
                  <label className="form-label">Start time</label>
                  <input className="form-input" type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">End time</label>
                  <input className="form-input" type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
                </div>
              </div>

              <div className="form-row">
                {/* Teacher — all teachers, but grouped */}
                <div className="form-group">
                  <label className="form-label">Teacher *</label>
                  <select className="form-select" value={teacherId} onChange={e => onTeacherChange(e.target.value)}>
                    {formTeachers.length === 0 && <option>No teachers</option>}
                    {activeView === 'all' ? (
                      <>
                        <optgroup label="Islamic Teachers">
                          {teachers.filter(t => t.role === 'islamic_teacher').map(t => (
                            <option key={t.id} value={t.id}>{getDisplayName(t)}{t.display_name ? ` (${t.full_name})` : ''}</option>
                          ))}
                        </optgroup>
                        <optgroup label="Secular Teachers">
                          {teachers.filter(t => t.role === 'teacher').map(t => (
                            <option key={t.id} value={t.id}>{getDisplayName(t)}{t.display_name ? ` (${t.full_name})` : ''}</option>
                          ))}
                        </optgroup>
                      </>
                    ) : formTeachers.map(t => (
                      <option key={t.id} value={t.id}>{getDisplayName(t)}{t.display_name ? ` (${t.full_name})` : ''}</option>
                    ))}
                  </select>
                </div>

                {/* Class — filtered by teacher role */}
                <div className="form-group">
                  <label className="form-label">Class *</label>
                  <select className="form-select" value={classId} onChange={e => setClassId(e.target.value)}>
                    {formClasses.length === 0
                      ? <option>No compatible classes</option>
                      : formClasses.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                  </select>
                  {formClasses.length === 0 && (
                    <div className="role-hint">
                      No {isIslamicTeacher ? 'Islamic' : 'secular'} classes found. Create one in Classes.
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="form-label" style={{ display: 'block', marginBottom: 8 }}>Repeat on days</label>
                <div className="days-grid">
                  {DAYS.slice(1).map((dayName, i) => (
                    <button key={dayName} className={`day-btn ${selectedDays.includes(i + 1) ? 'selected' : ''}`}
                      onClick={() => toggleDay(i + 1)} type="button">
                      {dayName.slice(0, 3)}
                    </button>
                  ))}
                </div>
                <p style={{ fontSize: 11, color: '#AAA', marginTop: 6 }}>
                  {selectedDays.length === 0
                    ? 'Select at least one day'
                    : `Adding to: ${selectedDays.map(d => DAYS[d]).join(', ')}`}
                </p>
              </div>

              {error && <p className="error-msg">{error}</p>}

              <div className="form-actions">
                <button className="cancel-btn" onClick={() => setShowForm(false)}>Cancel</button>
                <button className="save-btn" onClick={addSession}
                  disabled={loading || selectedDays.length === 0 || !name.trim() || !teacherId || !classId}>
                  {loading ? 'Adding...' : `Add to ${selectedDays.length} day${selectedDays.length !== 1 ? 's' : ''}`}
                </button>
              </div>
            </div>
          )
        })()}

        {/* ── Filter ── */}
        <div className="filter-row">
          <select className="filter-select" value={filterClass} onChange={e => setFilterClass(e.target.value)}>
            <option value="all">All classes</option>
            {filteredClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <span style={{ fontSize: 12, color: '#AAA' }}>{filtered.length} sessions</span>
        </div>

        {/* ── Timetable rows ── */}
        {DAYS.slice(1).map(dayName => {
          const daySessions = grouped[dayName] || []
          if (!daySessions.length) return null
          return (
            <div key={dayName} className="day-section">
              <div className="day-header">
                <span className="day-name">{dayName}</span>
                <span className="day-count">{daySessions.length} session{daySessions.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="sessions-card">
                {daySessions.map((s: any) => {
                  // Detect mismatch: Islamic teacher on secular class or vice versa
                  const teacherRole   = s.users?.role
                  const classType     = s.classes?.class_type
                  const hasMismatch   = (teacherRole === 'islamic_teacher' && classType !== 'islamic')
                                     || (teacherRole === 'teacher' && classType === 'islamic')

                  return (
                    <div key={s.id}>
                      {editingId === s.id ? (
                        <div className="edit-row">
                          <input className="edit-input" value={editForm.name}
                            onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                            placeholder="Session name" />
                          <input className="edit-input" type="time" value={editForm.start_time}
                            onChange={e => setEditForm({ ...editForm, start_time: e.target.value })}
                            style={{ maxWidth: 120 }} />
                          <input className="edit-input" type="time" value={editForm.end_time}
                            onChange={e => setEditForm({ ...editForm, end_time: e.target.value })}
                            style={{ maxWidth: 120 }} />
                          {/* Teacher select */}
                          <select className="edit-select" value={editForm.teacher_id}
                            onChange={e => setEditForm({ ...editForm, teacher_id: e.target.value })}
                            style={{ flex: 1 }}>
                            <optgroup label="Islamic Teachers">
                              {teachers.filter(t => t.role === 'islamic_teacher').map(t => (
                                <option key={t.id} value={t.id}>{getDisplayName(t)}</option>
                              ))}
                            </optgroup>
                            <optgroup label="Secular Teachers">
                              {teachers.filter(t => t.role === 'teacher').map(t => (
                                <option key={t.id} value={t.id}>{getDisplayName(t)}</option>
                              ))}
                            </optgroup>
                          </select>
                          {/* Class select */}
                          <select className="edit-select" value={editForm.class_id}
                            onChange={e => setEditForm({ ...editForm, class_id: e.target.value })}
                            style={{ flex: 1 }}>
                            {getEditClasses().map(c => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                          <button className="save-edit-btn" onClick={saveEdit}>Save</button>
                          <button className="cancel-edit-btn" onClick={() => setEditingId(null)}>Cancel</button>
                        </div>
                      ) : (
                        <div className="session-row">
                          <span className="time-text">{s.start_time?.slice(0,5)} – {s.end_time?.slice(0,5)}</span>
                          <div>
                            <span className="session-name">{s.name}</span>
                            {hasMismatch && <span className="mismatch-badge">⚠ mismatch</span>}
                          </div>
                          <div className="teacher-wrap">
                            <span className="teacher-display">{getDisplayName(s.users)}</span>
                            {s.users?.display_name && <span className="teacher-full">{s.users?.full_name}</span>}
                            {s.users?.role && (
                              <span className={`teacher-role ${s.users.role === 'islamic_teacher' ? 'islamic' : 'secular'}`}>
                                {getRoleLabel(s.users.role)}
                              </span>
                            )}
                          </div>
                          <span className={`class-badge ${classType === 'islamic' ? 'islamic' : 'secular'}`}>
                            {s.classes?.name}
                          </span>
                          <div className="row-actions">
                            <button className="action-btn edit-btn" onClick={() => startEdit(s)}>
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                              Edit
                            </button>
                            <button className="action-btn del-btn" onClick={() => deleteSession(s.id)}>
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}

        {filtered.length === 0 && (
          <div style={{ background: '#fff', border: '1px solid #EFEFED', borderRadius: 12, padding: 48, textAlign: 'center', color: '#CCC', fontSize: 13 }}>
            No sessions found. Add one above.
          </div>
        )}
      </div>
    </main>
  )
}