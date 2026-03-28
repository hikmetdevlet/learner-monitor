'use client'
import { useEffect, useState, useMemo } from 'react'
import { createClient } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

type Session  = { id: string; name: string; day_of_week: number; start_time: string; end_time: string; class_id: string; users: any; classes: any }
type User     = { id: string; full_name: string; display_name: string; role: string }
type Class    = { id: string; name: string; class_type: string }
type Subject  = { id: string; name: string; class_id: string }

const DAYS    = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const DAY_NUMS = [1, 2, 3, 4, 5, 6, 7]
const DAY_SHORT = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function dn(u: any) { return u?.display_name || u?.full_name || '—' }

export default function ManageSessions() {
  const [sessions,  setSessions]  = useState<Session[]>([])
  const [teachers,  setTeachers]  = useState<User[]>([])
  const [classes,   setClasses]   = useState<Class[]>([])
  const [subjects,  setSubjects]  = useState<Subject[]>([])

  // View
  const [viewMode,    setViewMode]    = useState<'grid' | 'list'>('grid')
  const [filterClass, setFilterClass] = useState('all')   // class id or 'all'
  const [filterType,  setFilterType]  = useState<'all' | 'islamic' | 'secular'>('all')

  // Add form
  const [showForm,   setShowForm]   = useState(false)
  const [formClass,  setFormClass]  = useState('')
  const [formSubject,setFormSubject]= useState('')        // curriculum subject id or ''
  const [formName,   setFormName]   = useState('')        // editable name (pre-filled from subject)
  const [formTeacher,setFormTeacher]= useState('')
  const [formDays,   setFormDays]   = useState<number[]>([1])
  const [formStart,  setFormStart]  = useState('08:00')
  const [formEnd,    setFormEnd]    = useState('09:00')
  const [saving,     setSaving]     = useState(false)

  // Edit
  const [editId,   setEditId]   = useState<string | null>(null)
  const [editData, setEditData] = useState<any>({})

  // Print
  const [showPrint,  setShowPrint]  = useState(false)
  const [printMode,  setPrintMode]  = useState<'class' | 'teacher'>('class')
  const [printTarget,setPrintTarget]= useState('all')

  const router   = useRouter()
  const supabase = createClient()

  useEffect(() => { load() }, [])

  async function load() {
    const [{ data: sd }, { data: td }, { data: cd }, { data: sub }] = await Promise.all([
      supabase.from('timetable')
        .select('*, users(id,full_name,display_name,role), classes(id,name,class_type)')
        .order('day_of_week').order('start_time'),
      supabase.from('users').select('*').in('role', ['teacher','islamic_teacher']).order('full_name'),
      supabase.from('classes').select('*').order('class_type').order('name'),
      supabase.from('curriculum_subjects').select('id,name,class_id').eq('is_active', true).order('name'),
    ])
    setSessions(sd || [])
    setTeachers(td || [])
    setClasses(cd || [])
    setSubjects(sub || [])

    // Set default form values
    if (cd?.length)  setFormClass(cd[0].id)
    if (td?.length)  setFormTeacher(td[0].id)
  }

  // ── Derived ───────────────────────────────────────────────────
  const filteredSessions = useMemo(() => sessions.filter(s => {
    if (filterType === 'islamic' && s.classes?.class_type !== 'islamic') return false
    if (filterType === 'secular' && s.classes?.class_type === 'islamic') return false
    if (filterClass !== 'all' && s.class_id !== filterClass) return false
    return true
  }), [sessions, filterType, filterClass])

  // Time slots present in filtered sessions
  const timeSlots = useMemo(() => {
    const set = new Set(filteredSessions.map(s => s.start_time?.slice(0,5)))
    return [...set].sort()
  }, [filteredSessions])

  // Classes shown in grid columns
  const gridClasses = useMemo(() => {
    let list = classes
    if (filterType === 'islamic') list = list.filter(c => c.class_type === 'islamic')
    if (filterType === 'secular') list = list.filter(c => c.class_type !== 'islamic')
    if (filterClass !== 'all')    list = list.filter(c => c.id === filterClass)
    // Only show classes that have at least one session in filtered view
    return list.filter(c => filteredSessions.some(s => s.class_id === c.id))
  }, [classes, filterType, filterClass, filteredSessions])

  // Teachers compatible with a given class type
  function teachersForClass(classId: string) {
    const cls = classes.find(c => c.id === classId)
    if (!cls) return teachers
    return cls.class_type === 'islamic'
      ? teachers.filter(t => t.role === 'islamic_teacher')
      : teachers.filter(t => t.role === 'teacher')
  }

  // Subjects for a given class
  function subjectsForClass(classId: string) {
    return subjects.filter(s => s.class_id === classId)
  }

  // ── Form handlers ─────────────────────────────────────────────
  function onFormClassChange(cid: string) {
    setFormClass(cid)
    setFormSubject('')
    setFormName('')
    // Auto-select first compatible teacher
    const compat = teachersForClass(cid)
    if (compat.length) setFormTeacher(compat[0].id)
  }

  function onFormSubjectChange(sid: string) {
    setFormSubject(sid)
    if (sid) {
      const sub = subjects.find(s => s.id === sid)
      if (sub) setFormName(sub.name)
    } else {
      setFormName('')
    }
  }

  async function addSessions() {
    if (!formName.trim() || !formClass || !formTeacher || !formDays.length) return
    setSaving(true)
    for (const day of formDays) {
      await supabase.from('timetable').insert({
        name: formName.trim(),
        class_id: formClass,
        teacher_id: formTeacher,
        day_of_week: day,
        start_time: formStart,
        end_time: formEnd,
      })
    }
    setFormName(''); setFormSubject(''); setFormDays([1]); setShowForm(false)
    setSaving(false)
    await load()
  }

  async function deleteSession(id: string) {
    const { count } = await supabase.from('attendance')
      .select('*', { count: 'exact', head: true }).eq('timetable_id', id)
    if ((count || 0) > 0) {
      if (!confirm(`This session has ${count} attendance record(s).\nOK = delete everything, Cancel = keep`)) return
    } else {
      if (!confirm('Delete this session?')) return
    }
    await supabase.from('timetable').delete().eq('id', id)
    await load()
  }

  function startEdit(s: any) {
    setEditId(s.id)
    setEditData({
      name: s.name,
      start_time: s.start_time,
      end_time: s.end_time,
      teacher_id: s.users?.id || '',
      class_id: s.class_id,
    })
  }

  async function saveEdit() {
    if (!editId) return
    await supabase.from('timetable').update({
      name: editData.name,
      start_time: editData.start_time,
      end_time: editData.end_time,
      teacher_id: editData.teacher_id,
      class_id: editData.class_id,
    }).eq('id', editId)
    setEditId(null)
    await load()
  }

  // ── Print ─────────────────────────────────────────────────────
  function getPrintData() {
    if (printMode === 'class') {
      const list = printTarget === 'all' ? classes : classes.filter(c => c.id === printTarget)
      return list.map(c => ({ label: c.name, type: c.class_type, rows: sessions.filter(s => s.class_id === c.id) }))
    }
    const list = printTarget === 'all' ? teachers : teachers.filter(t => t.id === printTarget)
    return list.map(t => ({ label: dn(t), type: t.role, rows: sessions.filter(s => s.users?.id === t.id) }))
  }
  function doPrint() { setShowPrint(false); setTimeout(() => window.print(), 100) }
  const activeDays = DAY_NUMS.filter(d => sessions.some(s => s.day_of_week === d))

  // ── Grouped for list view ─────────────────────────────────────
  const groupedByDay = useMemo(() =>
    DAYS.slice(1).reduce((acc, day) => {
      const n = DAYS.indexOf(day)
      acc[day] = filteredSessions.filter(s => s.day_of_week === n)
      return acc
    }, {} as Record<string, Session[]>),
  [filteredSessions])

  // ── Grid cell lookup ──────────────────────────────────────────
  function cellSessions(classId: string, day: number, slot: string) {
    return filteredSessions.filter(s =>
      s.class_id === classId && s.day_of_week === day && s.start_time?.slice(0,5) === slot
    )
  }

  const clsColor = (ct: string) => ct === 'islamic'
    ? { bg: '#F0FDF4', border: '#BBF7D0', text: '#15803D' }
    : { bg: '#EFF6FF', border: '#BFDBFE', text: '#1D4ED8' }

  return (
    <main style={{ minHeight: '100vh', background: '#F5F4F0', fontFamily: '-apple-system,"DM Sans",sans-serif' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Serif+Display&display=swap');
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }

        /* ── TOPBAR ── */
        .topbar { background:#fff; border-bottom:1px solid #E8E8E6; padding:0 28px; height:52px; display:flex; align-items:center; justify-content:space-between; position:sticky; top:0; z-index:30; }
        .tl { display:flex; align-items:center; gap:10px; }
        .back { display:flex; align-items:center; gap:5px; font-size:13px; color:#888; background:none; border:none; cursor:pointer; padding:5px 8px; border-radius:7px; font-family:inherit; transition:all .15s; }
        .back:hover { background:#F5F5F3; color:#333; }
        .ptitle { font-size:15px; font-weight:600; color:#1A1A1A; }
        .tr { display:flex; align-items:center; gap:7px; }
        .btn-outline { display:flex; align-items:center; gap:5px; background:#F5F5F3; color:#555; border:none; border-radius:8px; padding:7px 13px; font-size:12px; font-weight:500; cursor:pointer; font-family:inherit; transition:all .15s; }
        .btn-outline:hover { background:#EBEBEB; }
        .btn-primary { display:flex; align-items:center; gap:5px; background:#1A1A1A; color:#fff; border:none; border-radius:8px; padding:7px 14px; font-size:12px; font-weight:600; cursor:pointer; font-family:inherit; transition:all .15s; }
        .btn-primary:hover { background:#333; }
        .btn-primary:disabled { opacity:.45; cursor:not-allowed; }

        /* ── WRAP ── */
        .wrap { max-width:1200px; margin:0 auto; padding:20px 24px 40px; }

        /* ── FILTER BAR ── */
        .fbar { display:flex; gap:6px; flex-wrap:wrap; align-items:center; margin-bottom:16px; }
        .fpill { padding:5px 13px; border-radius:8px; border:1px solid #E8E8E6; background:#fff; font-size:12px; font-weight:500; color:#666; cursor:pointer; font-family:inherit; transition:all .12s; white-space:nowrap; display:inline-flex; align-items:center; gap:5px; }
        .fpill:hover { border-color:#AAA; }
        .fpill.on { background:#1A1A1A; color:#fff; border-color:#1A1A1A; }
        .fpill.islamic.on { background:#15803D; border-color:#15803D; }
        .fpill.secular.on { background:#1D4ED8; border-color:#1D4ED8; }
        .fsel { height:34px; border:1px solid #E8E8E6; border-radius:8px; padding:0 10px; font-size:12px; font-family:inherit; color:#555; background:#fff; outline:none; cursor:pointer; }
        .view-tog { display:flex; background:#F0F0EE; border-radius:8px; padding:2px; gap:2px; }
        .vtab { padding:5px 12px; border-radius:6px; border:none; font-size:11px; font-weight:600; cursor:pointer; font-family:inherit; background:transparent; color:#888; transition:all .12s; }
        .vtab.on { background:#fff; color:#1A1A1A; box-shadow:0 1px 3px rgba(0,0,0,.1); }

        /* ── ADD FORM ── */
        .form-card { background:#fff; border:1px solid #E8E8E6; border-radius:12px; padding:20px; margin-bottom:18px; }
        .form-card-title { font-size:14px; font-weight:600; color:#1A1A1A; margin-bottom:14px; }
        .form-row { display:flex; gap:10px; margin-bottom:12px; flex-wrap:wrap; }
        .fg { display:flex; flex-direction:column; gap:4px; flex:1; min-width:140px; }
        .fl { font-size:10px; font-weight:700; color:#888; text-transform:uppercase; letter-spacing:.05em; }
        .fi { height:36px; border:1px solid #E8E8E6; border-radius:8px; padding:0 10px; font-size:13px; font-family:inherit; color:#1A1A1A; background:#fff; outline:none; }
        .fi:focus { border-color:#1A1A1A; }
        .fi::placeholder { color:#CCC; }
        .hint { font-size:10px; color:#AAA; margin-top:3px; }
        .hint.green { color:#15803D; }
        .days-row { display:flex; gap:5px; flex-wrap:wrap; }
        .dybtn { width:42px; height:34px; border-radius:8px; border:1px solid #E8E8E6; background:#fff; font-size:11px; font-weight:600; color:#666; cursor:pointer; font-family:inherit; transition:all .12s; display:flex; align-items:center; justify-content:center; }
        .dybtn:hover { border-color:#AAA; }
        .dybtn.on { background:#1A1A1A; color:#fff; border-color:#1A1A1A; }
        .form-actions { display:flex; justify-content:flex-end; gap:8px; margin-top:14px; }

        /* ── GRID VIEW ── */
        .grid-wrap { overflow-x:auto; -webkit-overflow-scrolling:touch; border-radius:12px; border:1px solid #E8E8E6; background:#fff; }
        .tt-grid { border-collapse:collapse; min-width:600px; width:100%; }
        .tt-grid th { background:#FAFAF8; border-bottom:1px solid #EFEFED; border-right:1px solid #EFEFED; padding:9px 12px; font-size:10px; font-weight:700; color:#888; text-transform:uppercase; letter-spacing:.05em; white-space:nowrap; text-align:left; }
        .tt-grid th:first-child { width:80px; min-width:80px; }
        .tt-grid td { border-bottom:1px solid #EFEFED; border-right:1px solid #EFEFED; padding:6px 8px; vertical-align:top; min-width:130px; }
        .tt-grid td:first-child { background:#FAFAF8; font-size:11px; font-weight:600; color:#888; white-space:nowrap; padding:8px 10px; }
        .tt-grid tr:last-child td { border-bottom:none; }
        .tt-grid td:last-child, .tt-grid th:last-child { border-right:none; }

        /* Class header tabs */
        .cls-header { display:flex; flex-direction:column; }
        .cls-name { font-size:12px; font-weight:600; color:#1A1A1A; }
        .cls-type { font-size:9px; font-weight:600; text-transform:uppercase; letter-spacing:.05em; margin-top:2px; }

        /* Session cell card */
        .sess-cell { background:#fff; border:1px solid #E8E8E6; border-radius:8px; padding:7px 9px; margin-bottom:5px; cursor:pointer; transition:all .12s; position:relative; }
        .sess-cell:last-child { margin-bottom:0; }
        .sess-cell:hover { box-shadow:0 2px 6px rgba(0,0,0,.08); }
        .sess-cell.islamic { border-left:3px solid #15803D; }
        .sess-cell.secular { border-left:3px solid #1D4ED8; }
        .sc-name { font-size:12px; font-weight:600; color:#1A1A1A; }
        .sc-teacher { font-size:10px; color:#888; margin-top:2px; }
        .sc-time { font-size:10px; color:#AAA; }
        .sc-actions { display:flex; gap:4px; margin-top:5px; }
        .sc-btn { font-size:9px; padding:2px 7px; border-radius:5px; border:1px solid #EFEFED; background:#F5F5F3; color:#666; cursor:pointer; font-family:inherit; font-weight:500; transition:all .1s; }
        .sc-btn:hover { background:#EBEBEB; }
        .sc-btn.del:hover { background:#FEF2F2; color:#DC2626; border-color:#FECACA; }
        .empty-cell { color:#E0E0DC; font-size:11px; text-align:center; padding:8px 0; }

        /* ── LIST VIEW ── */
        .day-sect { margin-bottom:14px; }
        .day-hd { display:flex; align-items:center; gap:8px; margin-bottom:7px; }
        .day-nm { font-size:11px; font-weight:700; color:#888; text-transform:uppercase; letter-spacing:.06em; }
        .day-ct { font-size:10px; color:#CCC; background:#F0F0EE; padding:2px 7px; border-radius:6px; }
        .list-card { background:#fff; border:1px solid #E8E8E6; border-radius:10px; overflow:hidden; }
        .list-row { display:grid; grid-template-columns:70px 1fr 150px 110px 90px; align-items:center; padding:10px 14px; border-bottom:1px solid #F5F5F3; gap:8px; transition:background .1s; }
        .list-row:last-child { border-bottom:none; }
        .list-row:hover { background:#FAFAF8; }
        .lr-time { font-size:11px; color:#AAA; white-space:nowrap; }
        .lr-name { font-size:13px; font-weight:500; color:#1A1A1A; }
        .lr-teacher { font-size:11px; color:#666; }
        .lr-sub { font-size:10px; color:#AAA; margin-top:1px; }
        .lr-badge { font-size:9px; padding:2px 7px; border-radius:5px; font-weight:600; }
        .lr-badge.islamic { background:#F0FDF4; color:#15803D; }
        .lr-badge.secular { background:#EFF6FF; color:#1D4ED8; }
        .lr-acts { display:flex; gap:4px; justify-content:flex-end; }
        .lr-btn { font-size:10px; padding:3px 8px; border-radius:6px; border:1px solid #EFEFED; background:#F5F5F3; color:#666; cursor:pointer; font-family:inherit; font-weight:500; transition:all .1s; display:flex; align-items:center; gap:3px; }
        .lr-btn:hover { background:#EBEBEB; }
        .lr-btn.del:hover { background:#FEF2F2; color:#DC2626; border-color:#FECACA; }

        /* ── EDIT ROW ── */
        .edit-row { padding:10px 14px; background:#F8F8F6; border-bottom:1px solid #EFEFED; display:flex; gap:7px; align-items:center; flex-wrap:wrap; }
        .ei { height:30px; border:1px solid #DDD; border-radius:7px; padding:0 9px; font-size:12px; font-family:inherit; color:#1A1A1A; background:#fff; outline:none; }
        .ei:focus { border-color:#1A1A1A; }
        .ei.stretch { flex:1; min-width:100px; }
        .save-eb { background:#1A1A1A; color:#fff; border:none; border-radius:7px; padding:5px 12px; font-size:12px; font-weight:600; cursor:pointer; font-family:inherit; }
        .canc-eb { background:#F5F5F3; color:#666; border:none; border-radius:7px; padding:5px 10px; font-size:12px; cursor:pointer; font-family:inherit; }

        /* ── PRINT MODAL ── */
        .mov { position:fixed; inset:0; background:rgba(0,0,0,.4); z-index:100; display:flex; align-items:center; justify-content:center; padding:20px; }
        .mo { background:#fff; border-radius:14px; padding:24px; width:100%; max-width:400px; }
        .mo-title { font-size:15px; font-weight:600; color:#1A1A1A; margin-bottom:16px; }
        .mo-tabs { display:flex; gap:5px; margin-bottom:14px; }
        .mo-tab { flex:1; padding:7px; border-radius:8px; border:1px solid #E8E8E6; background:#fff; font-size:12px; color:#666; cursor:pointer; font-family:inherit; font-weight:500; text-align:center; transition:all .12s; }
        .mo-tab.on { background:#1A1A1A; color:#fff; border-color:#1A1A1A; }
        .mo-lbl { font-size:10px; font-weight:700; color:#888; text-transform:uppercase; letter-spacing:.05em; margin-bottom:5px; display:block; }
        .mo-sel { width:100%; height:38px; border:1px solid #E8E8E6; border-radius:8px; padding:0 10px; font-size:12px; font-family:inherit; color:#1A1A1A; background:#fff; outline:none; margin-bottom:16px; }
        .mo-acts { display:flex; gap:7px; justify-content:flex-end; }

        /* ── MISMATCH ── */
        .mismatch { font-size:9px; font-weight:700; background:#FEF2F2; color:#DC2626; padding:1px 5px; border-radius:4px; margin-left:5px; }

        /* ── PRINT ── */
        @media screen { .print-area { display:none; } }
        @media print {
          .topbar, .fbar, .form-card, .view-tog, .lr-acts, .sc-actions, .mov, .wrap { display:none !important; }
          .print-area { display:block !important; }
          body { background:#fff; font-family:sans-serif; }
          .pp { page-break-after:always; padding:16px; }
          .pp:last-child { page-break-after:auto; }
          .ph { border-bottom:2px solid #1A1A1A; padding-bottom:8px; margin-bottom:12px; }
          .ph-title { font-size:18px; font-weight:700; }
          .ph-sub { font-size:11px; color:#888; }
          .ptt { width:100%; border-collapse:collapse; font-size:10px; }
          .ptt th { background:#1A1A1A; color:#fff; padding:6px 8px; text-align:left; }
          .ptt td { border:1px solid #E5E5E5; padding:6px 8px; vertical-align:top; }
          .ptt tr:nth-child(even) td { background:#FAFAFA; }
          .pc-name { font-weight:600; font-size:10px; }
          .pc-sub { font-size:9px; color:#666; }
        }

        /* ── RESPONSIVE ── */
        @media (max-width:768px) {
          .topbar { padding:0 14px; }
          .wrap { padding:12px 12px 40px; }
          .list-row { grid-template-columns:60px 1fr 80px; }
          .list-row > *:nth-child(3), .list-row > *:nth-child(5) { display:none; }
          .fbar { gap:5px; }
        }
      `}</style>

      {/* ── Print modal ── */}
      {showPrint && (
        <div className="mov" onClick={() => setShowPrint(false)}>
          <div className="mo" onClick={e => e.stopPropagation()}>
            <div className="mo-title">Print Timetable</div>
            <div className="mo-tabs">
              <button className={`mo-tab ${printMode === 'class' ? 'on' : ''}`} onClick={() => { setPrintMode('class'); setPrintTarget('all') }}>By Class</button>
              <button className={`mo-tab ${printMode === 'teacher' ? 'on' : ''}`} onClick={() => { setPrintMode('teacher'); setPrintTarget('all') }}>By Teacher</button>
            </div>
            <label className="mo-lbl">Select {printMode === 'class' ? 'class' : 'teacher'}</label>
            <select className="mo-sel" value={printTarget} onChange={e => setPrintTarget(e.target.value)}>
              <option value="all">All {printMode === 'class' ? 'classes' : 'teachers'}</option>
              {printMode === 'class'
                ? classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)
                : teachers.map(t => <option key={t.id} value={t.id}>{dn(t)}</option>)}
            </select>
            <div className="mo-acts">
              <button className="btn-outline" onClick={() => setShowPrint(false)}>Cancel</button>
              <button className="btn-primary" onClick={doPrint}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                Print / PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Print area ── */}
      <div className="print-area">
        {getPrintData().map((item, idx) => {
          if (!item.rows.length) return null
          const slots = [...new Set(item.rows.map(s => s.start_time?.slice(0,5)))].sort()
          return (
            <div key={idx} className="pp">
              <div className="ph">
                <div className="ph-title">{item.label}</div>
                <div className="ph-sub">{item.type === 'islamic_teacher' ? 'Islamic Teacher' : item.type} · Weekly Timetable</div>
              </div>
              <table className="ptt">
                <thead><tr><th style={{ width: 70 }}>Time</th>{activeDays.map(d => <th key={d}>{DAYS[d]}</th>)}</tr></thead>
                <tbody>
                  {slots.map(slot => (
                    <tr key={slot}>
                      <td style={{ fontWeight: 600, color: '#555' }}>{slot}</td>
                      {activeDays.map(d => {
                        const s = item.rows.find((r: any) => r.day_of_week === d && r.start_time?.slice(0,5) === slot)
                        return (
                          <td key={d}>
                            {s ? (
                              <>
                                <div className="pc-name">{(s as any).name}</div>
                                <div className="pc-sub">{printMode === 'class' ? dn((s as any).users) : (s as any).classes?.name}</div>
                                <div className="pc-sub">{(s as any).start_time?.slice(0,5)} – {(s as any).end_time?.slice(0,5)}</div>
                              </>
                            ) : <span style={{ color: '#CCC', fontSize: 9 }}>—</span>}
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
        <div className="tl">
          <button className="back" onClick={() => router.push('/admin')}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
            Admin
          </button>
          <span style={{ color: '#E0E0DC' }}>|</span>
          <span className="ptitle">Timetable</span>
        </div>
        <div className="tr">
          <button className="btn-outline" onClick={() => setShowPrint(true)}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            Print
          </button>
          <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancel' : (
              <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Add Session</>
            )}
          </button>
        </div>
      </div>

      <div className="wrap">

        {/* ── Add form ── */}
        {showForm && (() => {
          const compatTeachers = teachersForClass(formClass)
          const classSubjects  = subjectsForClass(formClass)
          const selCls = classes.find(c => c.id === formClass)

          return (
            <div className="form-card">
              <div className="form-card-title">Add Session</div>

              {/* Row 1: Class + Subject + Editable name */}
              <div className="form-row">
                <div className="fg">
                  <label className="fl">Class *</label>
                  <select className="fi" value={formClass} onChange={e => onFormClassChange(e.target.value)}>
                    {classes.length === 0 && <option>No classes</option>}
                    <optgroup label="Islamic Classes">
                      {classes.filter(c => c.class_type === 'islamic').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </optgroup>
                    <optgroup label="Secular Classes">
                      {classes.filter(c => c.class_type !== 'islamic').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </optgroup>
                  </select>
                  {selCls && (
                    <div className={`hint ${selCls.class_type === 'islamic' ? 'green' : ''}`}>
                      {selCls.class_type === 'islamic' ? 'Islamic class — Islamic teachers shown' : 'Secular class — secular teachers shown'}
                    </div>
                  )}
                </div>

                <div className="fg">
                  <label className="fl">Subject (from curriculum)</label>
                  <select className="fi" value={formSubject} onChange={e => onFormSubjectChange(e.target.value)}>
                    <option value="">— Manual / none —</option>
                    {classSubjects.length === 0
                      ? <option disabled>No subjects for this class</option>
                      : classSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <div className="hint">Selects name automatically</div>
                </div>

                <div className="fg" style={{ flex: 1.5 }}>
                  <label className="fl">Session Name *</label>
                  <input className="fi" value={formName} onChange={e => setFormName(e.target.value)}
                    placeholder="e.g. Quran, Fiqh, Break..." />
                  <div className="hint">Edit freely — pre-filled from subject above</div>
                </div>
              </div>

              {/* Row 2: Teacher + Start + End */}
              <div className="form-row">
                <div className="fg" style={{ flex: 2 }}>
                  <label className="fl">Teacher *</label>
                  <select className="fi" value={formTeacher} onChange={e => setFormTeacher(e.target.value)}>
                    {compatTeachers.length === 0
                      ? <option>No compatible teachers for this class type</option>
                      : compatTeachers.map(t => (
                        <option key={t.id} value={t.id}>
                          {dn(t)}{t.display_name ? ` (${t.full_name})` : ''}
                        </option>
                      ))}
                  </select>
                  {compatTeachers.length === 0 && (
                    <div className="hint" style={{ color: '#DC2626' }}>
                      Add {selCls?.class_type === 'islamic' ? 'Islamic' : 'secular'} teachers first
                    </div>
                  )}
                </div>
                <div className="fg">
                  <label className="fl">Start</label>
                  <input className="fi" type="time" value={formStart} onChange={e => setFormStart(e.target.value)} />
                </div>
                <div className="fg">
                  <label className="fl">End</label>
                  <input className="fi" type="time" value={formEnd} onChange={e => setFormEnd(e.target.value)} />
                </div>
              </div>

              {/* Days */}
              <div style={{ marginBottom: 4 }}>
                <div className="fl" style={{ marginBottom: 7 }}>Days</div>
                <div className="days-row">
                  {DAYS.slice(1).map((d, i) => (
                    <button key={d} className={`dybtn ${formDays.includes(i+1) ? 'on' : ''}`}
                      onClick={() => setFormDays(prev => prev.includes(i+1) ? prev.filter(x => x !== i+1) : [...prev, i+1])}>
                      {d.slice(0,3)}
                    </button>
                  ))}
                </div>
                <div className="hint" style={{ marginTop: 5 }}>
                  {formDays.length === 0 ? 'Select at least one day' : `${formDays.length} day(s): ${formDays.map(d => DAYS[d]).join(', ')}`}
                </div>
              </div>

              <div className="form-actions">
                <button className="btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
                <button className="btn-primary" onClick={addSessions}
                  disabled={saving || !formName.trim() || !formClass || !formTeacher || formDays.length === 0}>
                  {saving ? 'Adding...' : `Add to ${formDays.length} day${formDays.length !== 1 ? 's' : ''}`}
                </button>
              </div>
            </div>
          )
        })()}

        {/* ── Filter bar ── */}
        <div className="fbar">
          <div className="view-tog">
            <button className={`vtab ${viewMode === 'grid' ? 'on' : ''}`} onClick={() => setViewMode('grid')}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
              Grid
            </button>
            <button className={`vtab ${viewMode === 'list' ? 'on' : ''}`} onClick={() => setViewMode('list')}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
              List
            </button>
          </div>

          <button className={`fpill ${filterType === 'all' ? 'on' : ''}`} onClick={() => { setFilterType('all'); setFilterClass('all') }}>All</button>
          <button className={`fpill islamic ${filterType === 'islamic' ? 'on' : ''}`} onClick={() => { setFilterType('islamic'); setFilterClass('all') }}>Islamic</button>
          <button className={`fpill secular ${filterType === 'secular' ? 'on' : ''}`} onClick={() => { setFilterType('secular'); setFilterClass('all') }}>Secular</button>

          <select className="fsel" value={filterClass} onChange={e => setFilterClass(e.target.value)}>
            <option value="all">All classes</option>
            {classes
              .filter(c => filterType === 'all' || (filterType === 'islamic' ? c.class_type === 'islamic' : c.class_type !== 'islamic'))
              .map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          <span style={{ fontSize: 11, color: '#AAA', marginLeft: 'auto' }}>{filteredSessions.length} sessions</span>
        </div>

        {/* ════ GRID VIEW ════ */}
        {viewMode === 'grid' && (
          <>
            {gridClasses.length === 0 ? (
              <div style={{ background: '#fff', border: '1px solid #E8E8E6', borderRadius: 12, padding: 48, textAlign: 'center', color: '#CCC', fontSize: 13 }}>
                No sessions found. Add one above.
              </div>
            ) : (
              DAY_NUMS.filter(d => filteredSessions.some(s => s.day_of_week === d)).map(dayNum => (
                <div key={dayNum} style={{ marginBottom: 18 }}>
                  {/* Day header */}
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                    {DAYS[dayNum]}
                  </div>
                  <div className="grid-wrap">
                    <table className="tt-grid">
                      <thead>
                        <tr>
                          <th>Time</th>
                          {gridClasses.map(c => {
                            const col = clsColor(c.class_type)
                            return (
                              <th key={c.id}>
                                <div className="cls-header">
                                  <span className="cls-name">{c.name}</span>
                                  <span className="cls-type" style={{ color: col.text }}>{c.class_type}</span>
                                </div>
                              </th>
                            )
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {timeSlots
                          .filter(slot => filteredSessions.some(s => s.day_of_week === dayNum && s.start_time?.slice(0,5) === slot))
                          .map(slot => (
                            <tr key={slot}>
                              <td>{slot}</td>
                              {gridClasses.map(c => {
                                const cells = cellSessions(c.id, dayNum, slot)
                                return (
                                  <td key={c.id}>
                                    {cells.length === 0 ? (
                                      <div className="empty-cell">—</div>
                                    ) : cells.map(s => {
                                      const ct = s.classes?.class_type || 'secular'
                                      const teacherRole = s.users?.role
                                      const mismatch = (teacherRole === 'islamic_teacher' && ct !== 'islamic') || (teacherRole === 'teacher' && ct === 'islamic')

                                      if (editId === s.id) {
                                        return (
                                          <div key={s.id} style={{ background: '#F8F8F6', border: '1px solid #EFEFED', borderRadius: 8, padding: 8 }}>
                                            <input className="ei" style={{ width: '100%', marginBottom: 5 }} value={editData.name}
                                              onChange={e => setEditData({ ...editData, name: e.target.value })} placeholder="Name" />
                                            <div style={{ display: 'flex', gap: 4, marginBottom: 5 }}>
                                              <input className="ei" type="time" style={{ flex: 1 }} value={editData.start_time}
                                                onChange={e => setEditData({ ...editData, start_time: e.target.value })} />
                                              <input className="ei" type="time" style={{ flex: 1 }} value={editData.end_time}
                                                onChange={e => setEditData({ ...editData, end_time: e.target.value })} />
                                            </div>
                                            <select className="ei" style={{ width: '100%', marginBottom: 5 }} value={editData.teacher_id}
                                              onChange={e => setEditData({ ...editData, teacher_id: e.target.value })}>
                                              {teachers.map(t => <option key={t.id} value={t.id}>{dn(t)}</option>)}
                                            </select>
                                            <div style={{ display: 'flex', gap: 4 }}>
                                              <button className="save-eb" onClick={saveEdit}>Save</button>
                                              <button className="canc-eb" onClick={() => setEditId(null)}>Cancel</button>
                                            </div>
                                          </div>
                                        )
                                      }

                                      return (
                                        <div key={s.id} className={`sess-cell ${ct}`}>
                                          <div className="sc-name">
                                            {s.name}
                                            {mismatch && <span className="mismatch">⚠</span>}
                                          </div>
                                          <div className="sc-teacher">{dn(s.users)}</div>
                                          <div className="sc-time">{s.start_time?.slice(0,5)} – {s.end_time?.slice(0,5)}</div>
                                          <div className="sc-actions">
                                            <button className="sc-btn" onClick={() => startEdit(s)}>Edit</button>
                                            <button className="sc-btn del" onClick={() => deleteSession(s.id)}>
                                              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                                            </button>
                                          </div>
                                        </div>
                                      )
                                    })}
                                  </td>
                                )
                              })}
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))
            )}
          </>
        )}

        {/* ════ LIST VIEW ════ */}
        {viewMode === 'list' && (
          <>
            {DAYS.slice(1).map(dayName => {
              const daySessions = groupedByDay[dayName] || []
              if (!daySessions.length) return null
              return (
                <div key={dayName} className="day-sect">
                  <div className="day-hd">
                    <span className="day-nm">{dayName}</span>
                    <span className="day-ct">{daySessions.length}</span>
                  </div>
                  <div className="list-card">
                    {daySessions.map(s => {
                      const ct = s.classes?.class_type || 'secular'
                      const teacherRole = s.users?.role
                      const mismatch = (teacherRole === 'islamic_teacher' && ct !== 'islamic') || (teacherRole === 'teacher' && ct === 'islamic')

                      if (editId === s.id) {
                        return (
                          <div key={s.id} className="edit-row">
                            <input className="ei stretch" value={editData.name}
                              onChange={e => setEditData({ ...editData, name: e.target.value })} placeholder="Name" />
                            <input className="ei" type="time" style={{ width: 110 }} value={editData.start_time}
                              onChange={e => setEditData({ ...editData, start_time: e.target.value })} />
                            <input className="ei" type="time" style={{ width: 110 }} value={editData.end_time}
                              onChange={e => setEditData({ ...editData, end_time: e.target.value })} />
                            <select className="ei stretch" value={editData.teacher_id}
                              onChange={e => setEditData({ ...editData, teacher_id: e.target.value })}>
                              <optgroup label="Islamic Teachers">
                                {teachers.filter(t => t.role === 'islamic_teacher').map(t => <option key={t.id} value={t.id}>{dn(t)}</option>)}
                              </optgroup>
                              <optgroup label="Secular Teachers">
                                {teachers.filter(t => t.role === 'teacher').map(t => <option key={t.id} value={t.id}>{dn(t)}</option>)}
                              </optgroup>
                            </select>
                            <button className="save-eb" onClick={saveEdit}>Save</button>
                            <button className="canc-eb" onClick={() => setEditId(null)}>Cancel</button>
                          </div>
                        )
                      }

                      return (
                        <div key={s.id} className="list-row">
                          <span className="lr-time">{s.start_time?.slice(0,5)} – {s.end_time?.slice(0,5)}</span>
                          <div>
                            <div className="lr-name">
                              {s.name}
                              {mismatch && <span className="mismatch">⚠ mismatch</span>}
                            </div>
                            <div className="lr-sub">{s.classes?.name}</div>
                          </div>
                          <div>
                            <div className="lr-teacher">{dn(s.users)}</div>
                            <div className="lr-sub">{s.users?.role === 'islamic_teacher' ? 'Islamic' : 'Secular'}</div>
                          </div>
                          <span className={`lr-badge ${ct}`}>{s.classes?.name}</span>
                          <div className="lr-acts">
                            <button className="lr-btn" onClick={() => startEdit(s)}>
                              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                              Edit
                            </button>
                            <button className="lr-btn del" onClick={() => deleteSession(s.id)}>
                              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
            {filteredSessions.length === 0 && (
              <div style={{ background: '#fff', border: '1px solid #E8E8E6', borderRadius: 12, padding: 48, textAlign: 'center', color: '#CCC', fontSize: 13 }}>
                No sessions. Add one above.
              </div>
            )}
          </>
        )}
      </div>
    </main>
  )
}