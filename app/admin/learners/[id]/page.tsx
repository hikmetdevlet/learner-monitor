'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '../../../lib/supabase'
import { useRouter, useParams } from 'next/navigation'

const INCIDENT_LABELS: Record<string, string> = {
  disruptive: 'Disruptive', disrespect: 'Disrespect', bullying: 'Bullying',
  phone: 'Phone use', late: 'Late', homework: 'Homework', other: 'Other',
}
const PRAISE_LABELS: Record<string, string> = {
  outstanding: 'Outstanding', helpful: 'Helpful', improvement: 'Improvement',
  leadership: 'Leadership', creativity: 'Creativity', other: 'Other',
}

export default function LearnerProfile() {
  const [learner, setLearner]             = useState<any>(null)
  const [attendance, setAttendance]       = useState<any[]>([])
  const [homework, setHomework]           = useState<any[]>([])
  const [notes, setNotes]                 = useState<any[]>([])
  const [salaahAtt, setSalaahAtt]         = useState<any[]>([])
  const [family, setFamily]               = useState<any[]>([])
  const [documents, setDocuments]         = useState<any[]>([])
  const [docTypes, setDocTypes]           = useState<any[]>([])
  const [classes, setClasses]             = useState<any[]>([])
  const [learnerClasses, setLearnerClasses] = useState<any[]>([])
  const [incidents, setIncidents]         = useState<any[]>([])
  const [praise, setPraise]               = useState<any[]>([])
  const [atRiskThreshold, setAtRiskThreshold] = useState(70)
  const [activeTab, setActiveTab]         = useState('overview')
  const [editingFamily, setEditingFamily] = useState<string | null>(null)
  const [savingFamily, setSavingFamily]   = useState(false)
  const [savingDoc, setSavingDoc]         = useState('')
  const [newNote, setNewNote]             = useState('')
  const [savingNote, setSavingNote]       = useState(false)
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const router = useRouter()
  const params = useParams()
  const supabase = createClient()

  useEffect(() => { loadProfile() }, [])

  async function loadProfile() {
    const id = params.id as string
    const [
      { data: ld }, { data: cls }, { data: lc },
      { data: att }, { data: hw }, { data: nt },
      { data: sal }, { data: fam }, { data: dts },
      { data: docs }, { data: set }, { data: inc }, { data: pr },
    ] = await Promise.all([
      supabase.from('learners').select('*').eq('id', id).single(),
      supabase.from('classes').select('*').order('name'),
      supabase.from('learner_classes').select('*, classes(name, class_type)').eq('learner_id', id),
      supabase.from('attendance').select('*, timetable(name, start_time)').eq('learner_id', id).order('attendance_date', { ascending: false }),
      supabase.from('homework').select('*, timetable(name)').eq('learner_id', id),
      supabase.from('notes').select('*, timetable(name), users(full_name)').eq('learner_id', id).order('created_at', { ascending: false }),
      supabase.from('activity_attendance').select('*, daily_activities(name, is_salaah)').eq('learner_id', id),
      supabase.from('learner_family').select('*').eq('learner_id', id),
      supabase.from('document_types').select('*').eq('is_active', true).order('name'),
      supabase.from('learner_documents').select('*, document_types(name)').eq('learner_id', id),
      supabase.from('settings').select('value').eq('key', 'at_risk_threshold').single(),
      supabase.from('behaviour_incidents').select('*').eq('learner_id', id).order('created_at', { ascending: false }),
      supabase.from('behaviour_praise').select('*').eq('learner_id', id).order('created_at', { ascending: false }),
    ])
    setLearner(ld)
    setClasses(cls || [])
    setLearnerClasses(lc || [])
    setAttendance(att || [])
    setHomework(hw || [])
    setNotes(nt || [])
    setSalaahAtt((sal || []).filter((a: any) => a.daily_activities?.is_salaah))
    setFamily(fam || [])
    setDocTypes(dts || [])
    setDocuments(docs || [])
    setIncidents(inc || [])
    setPraise(pr || [])
    if (set) setAtRiskThreshold(parseInt(set.value) || 70)
  }

  async function saveFamily(relation: string, data: any) {
    setSavingFamily(true)
    const existing = family.find(f => f.relation === relation)
    if (existing) { await supabase.from('learner_family').update(data).eq('id', existing.id) }
    else { await supabase.from('learner_family').insert({ ...data, learner_id: params.id, relation }) }
    setEditingFamily(null); setSavingFamily(false); loadProfile()
  }

  async function toggleDocument(docTypeId: string, current: any) {
    setSavingDoc(docTypeId)
    if (current) {
      await supabase.from('learner_documents').update({ submitted: !current.submitted, submitted_date: !current.submitted ? new Date().toISOString().split('T')[0] : null }).eq('id', current.id)
    } else {
      await supabase.from('learner_documents').insert({ learner_id: params.id, document_type_id: docTypeId, submitted: true, submitted_date: new Date().toISOString().split('T')[0] })
    }
    setSavingDoc(''); loadProfile()
  }

  async function uploadDocument(docTypeId: string, file: File) {
    setSavingDoc(docTypeId)
    const path = `${params.id}/${docTypeId}/${file.name}`
    await supabase.storage.from('learner-documents').upload(path, file, { upsert: true })
    const { data: urlData } = supabase.storage.from('learner-documents').getPublicUrl(path)
    const existing = documents.find(d => d.document_type_id === docTypeId)
    if (existing) { await supabase.from('learner_documents').update({ file_url: urlData.publicUrl, submitted: true, submitted_date: new Date().toISOString().split('T')[0] }).eq('id', existing.id) }
    else { await supabase.from('learner_documents').insert({ learner_id: params.id, document_type_id: docTypeId, submitted: true, submitted_date: new Date().toISOString().split('T')[0], file_url: urlData.publicUrl }) }
    setSavingDoc(''); loadProfile()
  }

  async function addNote() {
    if (!newNote.trim()) return
    setSavingNote(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: u } = await supabase.from('users').select('id').eq('auth_id', user?.id).single()
    await supabase.from('notes').insert({ learner_id: params.id, content: newNote.trim(), teacher_id: u?.id })
    setNewNote(''); setSavingNote(false); loadProfile()
  }

  if (!learner) return (
    <main style={{ minHeight: '100vh', background: '#F8F7F4', fontFamily: "'DM Sans',sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ fontSize: 13, color: '#CCC' }}>Loading...</span>
    </main>
  )

  // ── Computed stats ──
  const totalSess   = attendance.length
  const presentSess = attendance.filter(a => a.status === 'present' || a.status === 'late').length
  const attPct      = totalSess > 0 ? Math.round(presentSess / totalSess * 100) : 0
  const totalHw     = homework.length
  const subHw       = homework.filter(h => h.submitted).length
  const hwPct       = totalHw > 0 ? Math.round(subHw / totalHw * 100) : 0
  const totalSal    = salaahAtt.length
  const presentSal  = salaahAtt.filter(s => s.status === 'present').length
  const salPct      = totalSal > 0 ? Math.round(presentSal / totalSal * 100) : 0
  const docsOk      = documents.filter(d => d.submitted).length
  const isAtRisk    = attPct < atRiskThreshold && totalSess > 0
  const isSalRisk   = salPct < atRiskThreshold && totalSal > 0

  // Missing fields
  const missingFields = [
    !learner.date_of_birth ? 'Date of birth' : null,
    !learner.phone         ? 'Phone'         : null,
    !learner.address       ? 'Address'       : null,
    !learner.home_language ? 'Home language' : null,
    !learner.student_id    ? 'Student ID'    : null,
    !family.some(f => ['father','mother','guardian'].includes(f.relation)) ? 'Family contact' : null,
    docsOk < docTypes.length ? `${docTypes.length - docsOk} document(s) missing` : null,
  ].filter(Boolean) as string[]

  // Attendance weekly chart (last 8 weeks)
  const weeklyChart = (() => {
    const weeks: { label: string; present: number; total: number }[] = []
    for (let w = 7; w >= 0; w--) {
      const end   = new Date(); end.setDate(end.getDate() - w * 7)
      const start = new Date(end); start.setDate(start.getDate() - 6)
      const s = start.toISOString().split('T')[0]
      const e = end.toISOString().split('T')[0]
      const week = attendance.filter(a => a.attendance_date >= s && a.attendance_date <= e)
      weeks.push({
        label: start.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' }),
        present: week.filter(a => a.status === 'present' || a.status === 'late').length,
        total: week.length,
      })
    }
    return weeks
  })()

  const tabs = [
    { key: 'overview',    label: 'Overview' },
    { key: 'family',      label: 'Family' },
    { key: 'documents',   label: `Docs ${docsOk}/${docTypes.length}` },
    { key: 'attendance',  label: `Attendance ${attPct}%` },
    { key: 'behaviour',   label: `Behaviour${incidents.length > 0 ? ` (${incidents.length})` : ''}` },
    { key: 'notes',       label: `Notes${notes.length > 0 ? ` (${notes.length})` : ''}` },
  ]

  const islamicClass = learnerClasses.find((lc: any) => lc.classes?.class_type === 'islamic')
  const secularClass = learnerClasses.find((lc: any) => lc.classes?.class_type === 'secular')

  return (
    <main style={{ minHeight: '100vh', background: '#F8F7F4', fontFamily: "'DM Sans',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        .topbar { background:#fff; border-bottom:1px solid #EFEFED; padding:0 28px; height:56px; display:flex; align-items:center; gap:12px; position:sticky; top:0; z-index:30; }
        .back-btn { display:flex; align-items:center; gap:5px; font-size:13px; color:#999; background:none; border:none; cursor:pointer; padding:6px 10px; border-radius:8px; font-family:'DM Sans',sans-serif; transition:all 0.15s; }
        .back-btn:hover { background:#F5F5F3; color:#333; }
        .page-title { font-size:14px; font-weight:500; color:#1A1A1A; }
        .divider { color:#DDD; }

        .page { max-width:860px; margin:0 auto; padding:24px 28px; }

        /* ── Profile header ── */
        .profile-card { background:#fff; border:1px solid #EFEFED; border-radius:16px; padding:22px 24px; margin-bottom:16px; display:flex; align-items:flex-start; gap:18px; }
        .avatar { width:56px; height:56px; border-radius:50%; background:#F0F0EE; display:flex; align-items:center; justify-content:center; font-size:20px; font-weight:600; color:#666; flex-shrink:0; }
        .avatar.risk { background:#FEF2F2; color:#DC2626; }
        .profile-name { font-size:20px; font-weight:600; color:#1A1A1A; letter-spacing:-0.4px; margin-bottom:6px; display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
        .risk-badge { font-size:10px; font-weight:600; background:#FEF2F2; color:#DC2626; border:1px solid #FECACA; padding:3px 8px; border-radius:7px; }
        .sal-badge  { font-size:10px; font-weight:600; background:#FFF7ED; color:#C2410C; border:1px solid #FED7AA; padding:3px 8px; border-radius:7px; }
        .class-pills { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:8px; }
        .class-pill { font-size:11px; font-weight:500; padding:3px 10px; border-radius:8px; }
        .class-pill.islamic { background:#F0FDF4; color:#15803D; border:1px solid #BBF7D0; }
        .class-pill.secular { background:#EFF6FF; color:#1D4ED8; border:1px solid #BFDBFE; }
        .profile-meta { display:flex; gap:16px; flex-wrap:wrap; }
        .meta-item { font-size:11px; color:#AAA; display:flex; align-items:center; gap:4px; }
        .meta-item strong { color:#666; font-weight:500; }

        /* ── Stat cards ── */
        .stats-row { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-bottom:16px; }
        .stat-card { background:#fff; border:1px solid #EFEFED; border-radius:12px; padding:14px 16px; text-align:center; }
        .stat-card.warn { border-color:#FED7AA; background:#FFFBF5; }
        .stat-card.danger { border-color:#FECACA; background:#FFF5F5; }
        .stat-n { font-size:24px; font-weight:600; color:#1A1A1A; letter-spacing:-0.5px; line-height:1; }
        .stat-n.ok { color:#15803D; }
        .stat-n.warn { color:#D97706; }
        .stat-n.danger { color:#DC2626; }
        .stat-l { font-size:10px; color:#AAA; text-transform:uppercase; letter-spacing:0.04em; margin-top:4px; }

        /* ── Tabs ── */
        .tabs { display:flex; gap:2px; border-bottom:1px solid #EFEFED; margin-bottom:16px; overflow-x:auto; scrollbar-width:none; }
        .tabs::-webkit-scrollbar { display:none; }
        .tab { padding:10px 14px; border:none; background:none; font-size:12px; font-weight:500; color:#999; cursor:pointer; font-family:'DM Sans',sans-serif; white-space:nowrap; border-bottom:2px solid transparent; transition:all 0.15s; }
        .tab:hover { color:#555; }
        .tab.on { color:#1A1A1A; border-bottom-color:#1A1A1A; }

        /* ── Cards ── */
        .card { background:#fff; border:1px solid #EFEFED; border-radius:14px; overflow:hidden; margin-bottom:12px; }
        .card-head { display:flex; align-items:center; justify-content:space-between; padding:14px 18px; border-bottom:1px solid #F5F5F3; }
        .card-title { font-size:13px; font-weight:600; color:#1A1A1A; }
        .card-sub { font-size:11px; color:#AAA; margin-top:1px; }
        .card-body { padding:16px 18px; }
        .card-edit-btn { font-size:12px; color:#1D4ED8; background:none; border:none; cursor:pointer; font-family:'DM Sans',sans-serif; padding:4px 8px; border-radius:6px; }
        .card-edit-btn:hover { background:#EFF6FF; }

        /* ── Issues banner ── */
        .issues-banner { background:#FFFBF5; border:1px solid #FED7AA; border-radius:12px; padding:12px 16px; margin-bottom:12px; }
        .issues-title { font-size:12px; font-weight:600; color:#C2410C; margin-bottom:8px; display:flex; align-items:center; gap:6px; }
        .issue-chips { display:flex; gap:6px; flex-wrap:wrap; }
        .issue-chip { font-size:11px; background:#FFF7ED; color:#92400E; border:1px solid #FED7AA; padding:3px 10px; border-radius:8px; }

        /* ── Overview info grid ── */
        .info-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
        .info-item { }
        .info-label { font-size:10px; font-weight:500; color:#AAA; text-transform:uppercase; letter-spacing:0.04em; margin-bottom:3px; }
        .info-val { font-size:13px; color:#1A1A1A; font-weight:500; }
        .info-val.empty { color:#DDD; font-weight:400; }
        .info-full { grid-column:span 2; }

        /* ── Form inputs ── */
        .fi { width:100%; height:36px; border:1px solid #EFEFED; border-radius:8px; padding:0 10px; font-size:13px; font-family:'DM Sans',sans-serif; color:#1A1A1A; background:#fff; outline:none; }
        .fi:focus { border-color:#1A1A1A; }
        .fi::placeholder { color:#CCC; }
        .form-label { font-size:10px; font-weight:500; color:#AAA; text-transform:uppercase; letter-spacing:0.04em; margin-bottom:4px; display:block; }
        .form-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
        .form-full { grid-column:span 2; }
        .save-btn { background:#1A1A1A; color:#fff; border:none; border-radius:8px; padding:9px 20px; font-size:13px; font-weight:500; cursor:pointer; font-family:'DM Sans',sans-serif; }
        .save-btn:disabled { opacity:0.5; }
        .cancel-btn { background:#F5F5F3; color:#666; border:none; border-radius:8px; padding:9px 14px; font-size:13px; cursor:pointer; font-family:'DM Sans',sans-serif; }
        .form-actions { display:flex; gap:8px; justify-content:flex-end; margin-top:14px; }

        /* ── Document rows ── */
        .doc-row { display:flex; align-items:center; gap:12px; padding:12px 18px; border-bottom:1px solid #F8F8F6; }
        .doc-row:last-child { border-bottom:none; }
        .doc-icon { width:32px; height:32px; border-radius:8px; display:flex; align-items:center; justify-content:center; flex-shrink:0; font-size:13px; }
        .doc-icon.ok { background:#F0FDF4; }
        .doc-icon.no { background:#F5F5F3; }
        .doc-name { font-size:13px; font-weight:500; color:#1A1A1A; flex:1; }
        .doc-date { font-size:11px; color:#AAA; }
        .doc-btn { font-size:11px; padding:4px 10px; border-radius:7px; border:1px solid #EFEFED; background:#fff; cursor:pointer; font-family:'DM Sans',sans-serif; font-weight:500; transition:all 0.15s; }
        .doc-btn.mark { color:#15803D; border-color:#BBF7D0; background:#F0FDF4; }
        .doc-btn.mark:hover { background:#DCFCE7; }
        .doc-btn.unmark { color:#DC2626; border-color:#FECACA; background:#FEF2F2; }
        .doc-btn.unmark:hover { background:#FEE2E2; }
        .doc-btn.upload { color:#555; }
        .doc-btn.upload:hover { background:#F5F5F3; }
        .doc-btn:disabled { opacity:0.5; cursor:not-allowed; }
        .view-link { font-size:11px; color:#1D4ED8; text-decoration:none; }
        .view-link:hover { text-decoration:underline; }

        /* ── Attendance chart ── */
        .att-chart { display:flex; align-items:flex-end; gap:5px; height:70px; margin-bottom:6px; }
        .att-col { flex:1; display:flex; flex-direction:column; align-items:center; gap:2px; height:100%; justify-content:flex-end; }
        .att-bar { width:100%; border-radius:3px 3px 0 0; min-height:3px; }
        .att-label { font-size:8px; color:#BBB; white-space:nowrap; }

        /* ── Attendance list ── */
        .att-row { display:flex; align-items:center; gap:10px; padding:9px 18px; border-bottom:1px solid #F8F8F6; }
        .att-row:last-child { border-bottom:none; }
        .att-session { font-size:13px; font-weight:500; color:#1A1A1A; flex:1; }
        .att-date { font-size:11px; color:#AAA; }
        .status-pill { font-size:10px; font-weight:600; padding:3px 8px; border-radius:7px; text-transform:capitalize; }
        .status-pill.present { background:#F0FDF4; color:#15803D; }
        .status-pill.absent  { background:#FEF2F2; color:#DC2626; }
        .status-pill.late    { background:#FFF7ED; color:#D97706; }
        .status-pill.excused { background:#EFF6FF; color:#1D4ED8; }

        /* ── Behaviour ── */
        .beh-summary { display:flex; gap:10px; margin-bottom:14px; }
        .beh-count { flex:1; border-radius:10px; padding:10px 14px; text-align:center; }
        .beh-count.inc { background:#FEF2F2; border:1px solid #FECACA; }
        .beh-count.pr  { background:#F0FDF4; border:1px solid #BBF7D0; }
        .beh-n { font-size:22px; font-weight:600; }
        .beh-n.inc { color:#DC2626; }
        .beh-n.pr  { color:#15803D; }
        .beh-l { font-size:10px; color:#AAA; text-transform:uppercase; letter-spacing:0.04em; margin-top:2px; }
        .beh-row { display:flex; align-items:center; gap:10px; padding:9px 18px; border-bottom:1px solid #F8F8F6; }
        .beh-row:last-child { border-bottom:none; }
        .beh-type { font-size:12px; font-weight:500; }
        .beh-date { font-size:11px; color:#AAA; }
        .inc-tag { font-size:10px; font-weight:600; padding:3px 8px; border-radius:7px; background:#FEF2F2; color:#DC2626; }
        .pr-tag  { font-size:10px; font-weight:600; padding:3px 8px; border-radius:7px; background:#F0FDF4; color:#15803D; }

        /* ── Notes ── */
        .note-input-wrap { padding:14px 18px; border-bottom:1px solid #F5F5F3; display:flex; gap:8px; }
        .note-input { flex:1; height:36px; border:1px solid #EFEFED; border-radius:8px; padding:0 12px; font-size:13px; font-family:'DM Sans',sans-serif; color:#1A1A1A; background:#fff; outline:none; }
        .note-input:focus { border-color:#1A1A1A; }
        .note-input::placeholder { color:#CCC; }
        .note-send-btn { background:#1A1A1A; color:#fff; border:none; border-radius:8px; padding:0 16px; font-size:13px; font-weight:500; cursor:pointer; font-family:'DM Sans',sans-serif; white-space:nowrap; }
        .note-send-btn:disabled { opacity:0.5; cursor:not-allowed; }
        .note-row { padding:12px 18px; border-bottom:1px solid #F8F8F6; }
        .note-row:last-child { border-bottom:none; }
        .note-content { font-size:13px; color:#1A1A1A; line-height:1.5; margin-bottom:4px; }
        .note-meta { font-size:11px; color:#AAA; }

        /* ── Section label ── */
        .sect-label { font-size:10px; font-weight:600; color:#AAA; text-transform:uppercase; letter-spacing:0.06em; margin:16px 0 8px; }

        /* ── Responsive ── */
        @media (max-width:680px) {
          .page { padding:14px 16px; }
          .topbar { padding:0 16px; }
          .stats-row { grid-template-columns:1fr 1fr; }
          .info-grid { grid-template-columns:1fr; }
          .form-grid { grid-template-columns:1fr; }
          .form-full { grid-column:span 1; }
          .profile-card { flex-direction:column; gap:12px; }
          .beh-summary { gap:6px; }
        }
      `}</style>

      {/* Topbar */}
      <div className="topbar">
        <button className="back-btn" onClick={() => router.back()}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          Back
        </button>
        <span className="divider">|</span>
        <span className="page-title">Learner Profile</span>
      </div>

      <div className="page">

        {/* Profile header */}
        <div className="profile-card">
          <div className={`avatar ${isAtRisk ? 'risk' : ''}`}>
            {learner.full_name.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="profile-name">
              {learner.full_name}
              {isAtRisk   && <span className="risk-badge">⚠ At Risk</span>}
              {isSalRisk  && <span className="sal-badge">Prayer Alert</span>}
              {!learner.is_active && <span style={{ fontSize:10, fontWeight:600, background:'#F5F5F3', color:'#AAA', border:'1px solid #EFEFED', padding:'3px 8px', borderRadius:7 }}>Archived</span>}
            </div>
            <div className="class-pills">
              {islamicClass && <span className="class-pill islamic">Islamic: {islamicClass.classes?.name}</span>}
              {secularClass && <span className="class-pill secular">Secular: {secularClass.classes?.name}</span>}
              {!islamicClass && !secularClass && <span style={{ fontSize:11, color:'#CCC' }}>No class assigned</span>}
            </div>
            <div className="profile-meta">
              {learner.student_id    && <span className="meta-item"><strong>ID</strong> {learner.student_id}</span>}
              {learner.date_of_birth && <span className="meta-item"><strong>DOB</strong> {learner.date_of_birth}</span>}
              {learner.phone         && <span className="meta-item"><strong>Phone</strong> {learner.phone}</span>}
              {learner.home_language && <span className="meta-item"><strong>Language</strong> {learner.home_language}</span>}
              {learner.join_date     && <span className="meta-item"><strong>Joined</strong> {learner.join_date}</span>}
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="stats-row">
          {[
            { n: attPct + '%', l: 'Attendance', cls: attPct < atRiskThreshold ? 'danger' : attPct < 85 ? 'warn' : 'ok' },
            { n: salPct + '%', l: 'Salaah', cls: salPct < atRiskThreshold ? 'danger' : salPct < 85 ? 'warn' : 'ok' },
            { n: hwPct  + '%', l: 'Homework', cls: hwPct < 50 ? 'danger' : hwPct < 75 ? 'warn' : 'ok' },
            { n: `${docsOk}/${docTypes.length}`, l: 'Documents', cls: docsOk < docTypes.length ? 'warn' : 'ok' },
          ].map(s => (
            <div key={s.l} className={`stat-card ${s.cls === 'danger' ? 'danger' : s.cls === 'warn' ? 'warn' : ''}`}>
              <div className={`stat-n ${s.cls}`}>{s.n}</div>
              <div className="stat-l">{s.l}</div>
            </div>
          ))}
        </div>

        {/* Issues banner */}
        {missingFields.length > 0 && (
          <div className="issues-banner">
            <div className="issues-title">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              {missingFields.length} issue{missingFields.length > 1 ? 's' : ''} need attention
            </div>
            <div className="issue-chips">
              {missingFields.map(f => <span key={f} className="issue-chip">{f}</span>)}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="tabs">
          {tabs.map(t => (
            <button key={t.key} className={`tab ${activeTab === t.key ? 'on' : ''}`} onClick={() => setActiveTab(t.key)}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW TAB ── */}
        {activeTab === 'overview' && (
          <OverviewCard
            learner={learner}
            classes={classes}
            learnerClasses={learnerClasses}
            onSave={async (data: any) => { await supabase.from('learners').update(data).eq('id', params.id); loadProfile() }}
            onUpdateClasses={async (islamicId: string, secularId: string) => {
              const id = params.id as string
              await supabase.from('learner_classes').delete().eq('learner_id', id)
              const ins: any[] = []
              if (islamicId) ins.push({ learner_id: id, class_id: islamicId, class_type: 'islamic' })
              if (secularId) ins.push({ learner_id: id, class_id: secularId, class_type: 'secular' })
              if (ins.length > 0) await supabase.from('learner_classes').insert(ins)
              loadProfile()
            }}
          />
        )}

        {/* ── FAMILY TAB ── */}
        {activeTab === 'family' && (
          <div>
            {(['father', 'mother', 'guardian'] as const).map(rel => (
              <FamilyCard
                key={rel}
                relation={rel}
                member={family.find(f => f.relation === rel)}
                isEditing={editingFamily === rel}
                onEdit={() => setEditingFamily(editingFamily === rel ? null : rel)}
                onSave={(data: any) => saveFamily(rel, data)}
                saving={savingFamily}
              />
            ))}
          </div>
        )}

        {/* ── DOCUMENTS TAB ── */}
        {activeTab === 'documents' && (
          <div className="card">
            <div className="card-head">
              <div><div className="card-title">Documents</div><div className="card-sub">{docsOk} of {docTypes.length} received</div></div>
            </div>
            {docTypes.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: '#CCC', fontSize: 13 }}>No document types configured. Add them in Settings.</div>
            ) : docTypes.map(dt => {
              const doc = documents.find(d => d.document_type_id === dt.id)
              const saving = savingDoc === dt.id
              return (
                <div key={dt.id} className="doc-row">
                  <div className={`doc-icon ${doc?.submitted ? 'ok' : 'no'}`}>{doc?.submitted ? '✓' : '○'}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="doc-name">{dt.name}</div>
                    {doc?.submitted_date && <div className="doc-date">Received {doc.submitted_date}</div>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {doc?.file_url && <a href={doc.file_url} target="_blank" className="view-link">View</a>}
                    <button disabled={saving} className={`doc-btn ${doc?.submitted ? 'unmark' : 'mark'}`} onClick={() => toggleDocument(dt.id, doc)}>
                      {saving ? '...' : doc?.submitted ? 'Unmark' : 'Mark received'}
                    </button>
                    <input type="file" ref={el => { fileRefs.current[dt.id] = el }} onChange={e => e.target.files?.[0] && uploadDocument(dt.id, e.target.files[0])} style={{ display: 'none' }} />
                    <button className="doc-btn upload" onClick={() => fileRefs.current[dt.id]?.click()}>Upload</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── ATTENDANCE TAB ── */}
        {activeTab === 'attendance' && (
          <div>
            {/* Mini chart */}
            <div className="card" style={{ padding: '16px 18px' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#1A1A1A', marginBottom: 12 }}>Weekly attendance — last 8 weeks</div>
              <div className="att-chart">
                {weeklyChart.map((w, i) => {
                  const pct = w.total > 0 ? Math.round(w.present / w.total * 100) : null
                  return (
                    <div key={i} className="att-col">
                      {pct !== null && <span style={{ fontSize: 8, color: '#888', marginBottom: 2 }}>{pct}%</span>}
                      <div className="att-bar" style={{
                        height: pct !== null ? `${pct}%` : '3px',
                        background: pct === null ? '#F0F0EE' : pct < atRiskThreshold ? '#FCA5A5' : pct < 85 ? '#FCD34D' : '#86EFAC',
                      }} />
                      <span className="att-label">{w.label}</span>
                    </div>
                  )
                })}
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 10, color: '#AAA' }}>
                <span><span style={{ display:'inline-block', width:8, height:8, borderRadius:2, background:'#86EFAC', marginRight:4 }}/>≥85%</span>
                <span><span style={{ display:'inline-block', width:8, height:8, borderRadius:2, background:'#FCD34D', marginRight:4 }}/>{atRiskThreshold}–84%</span>
                <span><span style={{ display:'inline-block', width:8, height:8, borderRadius:2, background:'#FCA5A5', marginRight:4 }}/>&lt;{atRiskThreshold}%</span>
              </div>
            </div>

            {/* Session attendance list */}
            <div className="card">
              <div className="card-head"><div className="card-title">Session Records <span style={{ fontSize:11, color:'#AAA', fontWeight:400 }}>({attendance.length})</span></div></div>
              {attendance.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', color: '#CCC', fontSize: 13 }}>No attendance records yet</div>
              ) : attendance.map((a: any) => (
                <div key={a.id} className="att-row">
                  <div style={{ flex: 1 }}>
                    <div className="att-session">{a.timetable?.name || '—'}</div>
                    <div className="att-date">{a.attendance_date}</div>
                  </div>
                  <span className={`status-pill ${a.status}`}>{a.status}</span>
                </div>
              ))}
            </div>

            {/* Salaah list */}
            {salaahAtt.length > 0 && (
              <div className="card">
                <div className="card-head"><div className="card-title">Prayer Records <span style={{ fontSize:11, color:'#AAA', fontWeight:400 }}>({salaahAtt.length})</span></div></div>
                {salaahAtt.map((a: any) => (
                  <div key={a.id} className="att-row">
                    <div style={{ flex: 1 }}>
                      <div className="att-session">{a.daily_activities?.name}</div>
                      <div className="att-date">{a.activity_date}</div>
                    </div>
                    <span className={`status-pill ${a.status}`}>{a.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── BEHAVIOUR TAB ── */}
        {activeTab === 'behaviour' && (
          <div>
            <div className="beh-summary">
              <div className="beh-count inc">
                <div className="beh-n inc">{incidents.length}</div>
                <div className="beh-l">Incidents</div>
              </div>
              <div className="beh-count pr">
                <div className="beh-n pr">{praise.length}</div>
                <div className="beh-l">Praise</div>
              </div>
            </div>

            {incidents.length > 0 && (
              <div className="card" style={{ marginBottom: 12 }}>
                <div className="card-head"><div className="card-title">Incidents</div></div>
                {incidents.map((inc: any) => (
                  <div key={inc.id} className="beh-row">
                    <span className="inc-tag">{INCIDENT_LABELS[inc.incident_type] || inc.incident_type}</span>
                    <span style={{ flex: 1 }} />
                    <span className="beh-date">{new Date(inc.created_at).toLocaleDateString('en-ZA', { day:'numeric', month:'short', year:'numeric' })}</span>
                  </div>
                ))}
              </div>
            )}

            {praise.length > 0 && (
              <div className="card">
                <div className="card-head"><div className="card-title">Praise</div></div>
                {praise.map((pr: any) => (
                  <div key={pr.id} className="beh-row">
                    <span className="pr-tag">{PRAISE_LABELS[pr.praise_type] || pr.praise_type}</span>
                    <span style={{ flex: 1 }} />
                    <span className="beh-date">{new Date(pr.created_at).toLocaleDateString('en-ZA', { day:'numeric', month:'short', year:'numeric' })}</span>
                  </div>
                ))}
              </div>
            )}

            {incidents.length === 0 && praise.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px', color: '#CCC', fontSize: 13 }}>No behaviour records yet</div>
            )}
          </div>
        )}

        {/* ── NOTES TAB ── */}
        {activeTab === 'notes' && (
          <div className="card">
            <div className="note-input-wrap">
              <input className="note-input" placeholder="Add a note about this learner..." value={newNote} onChange={e => setNewNote(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addNote() } }} />
              <button className="note-send-btn" onClick={addNote} disabled={savingNote || !newNote.trim()}>
                {savingNote ? '...' : 'Add'}
              </button>
            </div>
            {notes.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: '#CCC', fontSize: 13 }}>No notes yet</div>
            ) : notes.map((n: any) => (
              <div key={n.id} className="note-row">
                <div className="note-content">{n.content}</div>
                <div className="note-meta">
                  {n.users?.full_name && <span>{n.users.full_name}</span>}
                  {n.timetable?.name  && <span> · {n.timetable.name}</span>}
                  {n.created_at && <span> · {new Date(n.created_at).toLocaleDateString('en-ZA', { day:'numeric', month:'short', year:'numeric' })}</span>}
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </main>
  )
}

// ── Sub-components ──

function FamilyCard({ relation, member, isEditing, onEdit, onSave, saving }: any) {
  const [fd, setFd] = useState<any>({})
  useEffect(() => { setFd(member || {}) }, [member, isEditing])
  const fields = [
    { label: 'Full name',  key: 'full_name',  placeholder: 'Full name' },
    { label: 'ID number',  key: 'id_number',  placeholder: 'ID number' },
    { label: 'Phone',      key: 'phone',      placeholder: 'Phone number' },
    { label: 'Email',      key: 'email',      placeholder: 'Email address' },
  ]
  return (
    <div style={{ background:'#fff', border:'1px solid #EFEFED', borderRadius:14, overflow:'hidden', marginBottom:10 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'13px 18px', borderBottom:'1px solid #F5F5F3' }}>
        <span style={{ fontSize:13, fontWeight:600, color:'#1A1A1A', textTransform:'capitalize' }}>{relation}</span>
        <button onClick={onEdit} style={{ fontSize:12, color:'#1D4ED8', background:'none', border:'none', cursor:'pointer', fontFamily:"'DM Sans',sans-serif", padding:'4px 8px', borderRadius:6 }}>
          {isEditing ? 'Cancel' : member ? 'Edit' : '+ Add'}
        </button>
      </div>
      <div style={{ padding:'14px 18px' }}>
        {isEditing ? (
          <div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              {fields.map(f => (
                <div key={f.key}>
                  <label style={{ fontSize:10, fontWeight:500, color:'#AAA', textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:4, display:'block' }}>{f.label}</label>
                  <input value={fd[f.key] || ''} onChange={e => setFd((p: any) => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder}
                    style={{ width:'100%', height:36, border:'1px solid #EFEFED', borderRadius:8, padding:'0 10px', fontSize:13, fontFamily:"'DM Sans',sans-serif", color:'#1A1A1A', background:'#fff', outline:'none' }} />
                </div>
              ))}
              <div style={{ gridColumn:'span 2' }}>
                <label style={{ fontSize:10, fontWeight:500, color:'#AAA', textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:4, display:'block' }}>Address</label>
                <input value={fd.address || ''} onChange={e => setFd((p: any) => ({ ...p, address: e.target.value }))} placeholder="Address"
                  style={{ width:'100%', height:36, border:'1px solid #EFEFED', borderRadius:8, padding:'0 10px', fontSize:13, fontFamily:"'DM Sans',sans-serif", color:'#1A1A1A', background:'#fff', outline:'none' }} />
              </div>
            </div>
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:12 }}>
              <button onClick={onEdit} style={{ background:'#F5F5F3', color:'#666', border:'none', borderRadius:8, padding:'8px 14px', fontSize:13, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>Cancel</button>
              <button onClick={() => onSave(fd)} disabled={saving} style={{ background:'#1A1A1A', color:'#fff', border:'none', borderRadius:8, padding:'8px 20px', fontSize:13, fontWeight:500, cursor:'pointer', fontFamily:"'DM Sans',sans-serif", opacity: saving ? 0.5 : 1 }}>
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        ) : member ? (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            {[...fields, { label:'Address', key:'address', placeholder:'' }].map(f => (
              <div key={f.key} style={f.key === 'address' ? { gridColumn:'span 2' } : {}}>
                <div style={{ fontSize:10, color:'#AAA', textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:2 }}>{f.label}</div>
                <div style={{ fontSize:13, fontWeight:500, color: member[f.key] ? '#1A1A1A' : '#DDD' }}>{member[f.key] || '—'}</div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ fontSize:13, color:'#CCC' }}>No {relation} information added yet.</p>
        )}
      </div>
    </div>
  )
}

function OverviewCard({ learner, classes, onSave, onUpdateClasses, learnerClasses }: any) {
  const [editing, setEditing]         = useState(false)
  const [saving, setSaving]           = useState(false)
  const [form, setForm]               = useState<any>({})
  const [islamicClassId, setIslamicClassId] = useState('')
  const [secularClassId, setSecularClassId] = useState('')

  useEffect(() => {
    setForm({
      full_name: learner.full_name || '', student_id: learner.student_id || '',
      date_of_birth: learner.date_of_birth || '', join_date: learner.join_date || '',
      phone: learner.phone || '', home_language: learner.home_language || '',
      previous_school: learner.previous_school || '', address: learner.address || '',
      medical_notes: learner.medical_notes || '',
    })
    setIslamicClassId(learnerClasses?.find((lc: any) => lc.classes?.class_type === 'islamic')?.class_id || '')
    setSecularClassId(learnerClasses?.find((lc: any) => lc.classes?.class_type === 'secular')?.class_id || '')
  }, [learner, learnerClasses])

  async function handleSave() {
    setSaving(true)
    await onSave(form)
    await onUpdateClasses(islamicClassId, secularClassId)
    setSaving(false); setEditing(false)
  }

  const islamicClasses = classes.filter((c: any) => c.class_type === 'islamic')
  const secularClasses = classes.filter((c: any) => c.class_type === 'secular')

  const displayFields = [
    { label:'Full name',       key:'full_name' },
    { label:'Student ID',      key:'student_id' },
    { label:'Date of birth',   key:'date_of_birth' },
    { label:'Join date',       key:'join_date' },
    { label:'Phone',           key:'phone' },
    { label:'Home language',   key:'home_language' },
    { label:'Previous school', key:'previous_school' },
  ]

  return (
    <div>
      <div style={{ background:'#fff', border:'1px solid #EFEFED', borderRadius:14, overflow:'hidden', marginBottom:12 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'13px 18px', borderBottom:'1px solid #F5F5F3' }}>
          <span style={{ fontSize:13, fontWeight:600, color:'#1A1A1A' }}>Personal Information</span>
          <button onClick={() => setEditing(!editing)} style={{ fontSize:12, color:'#1D4ED8', background:'none', border:'none', cursor:'pointer', fontFamily:"'DM Sans',sans-serif", padding:'4px 8px', borderRadius:6 }}>
            {editing ? 'Cancel' : 'Edit'}
          </button>
        </div>
        <div style={{ padding:'16px 18px' }}>
          {editing ? (
            <div>
              <div className="form-grid">
                {displayFields.map(f => (
                  <div key={f.key}>
                    <label className="form-label">{f.label}</label>
                    <input className="fi" value={form[f.key] || ''} onChange={e => setForm((p: any) => ({ ...p, [f.key]: e.target.value }))}
                      type={f.key.includes('date') ? 'date' : 'text'} placeholder={f.label} />
                  </div>
                ))}
                <div className="form-full">
                  <label className="form-label">Address</label>
                  <input className="fi" value={form.address || ''} onChange={e => setForm((p: any) => ({ ...p, address: e.target.value }))} placeholder="Home address" />
                </div>
                <div className="form-full">
                  <label className="form-label">Medical notes</label>
                  <input className="fi" value={form.medical_notes || ''} onChange={e => setForm((p: any) => ({ ...p, medical_notes: e.target.value }))} placeholder="Allergies, conditions, notes..." />
                </div>
              </div>
              <div style={{ borderTop:'1px solid #F5F5F3', margin:'14px -18px 0', padding:'14px 18px 0' }}>
                <div style={{ fontSize:10, fontWeight:600, color:'#AAA', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:10 }}>Class Assignment</div>
                <div className="form-grid">
                  <div>
                    <label className="form-label">Islamic Class</label>
                    <select className="fi" value={islamicClassId} onChange={e => setIslamicClassId(e.target.value)} style={{ cursor:'pointer' }}>
                      <option value="">— None —</option>
                      {islamicClasses.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Secular Class</label>
                    <select className="fi" value={secularClassId} onChange={e => setSecularClassId(e.target.value)} style={{ cursor:'pointer' }}>
                      <option value="">— None —</option>
                      {secularClasses.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <div className="form-actions">
                <button className="cancel-btn" onClick={() => setEditing(false)}>Cancel</button>
                <button className="save-btn" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save changes'}</button>
              </div>
            </div>
          ) : (
            <div>
              <div className="info-grid">
                {displayFields.map(f => (
                  <div key={f.key} className="info-item">
                    <div className="info-label">{f.label}</div>
                    <div className={`info-val ${!learner[f.key] ? 'empty' : ''}`}>{learner[f.key] || '—'}</div>
                  </div>
                ))}
                {learner.address && (
                  <div className="info-item info-full">
                    <div className="info-label">Address</div>
                    <div className="info-val">{learner.address}</div>
                  </div>
                )}
                {learner.medical_notes && (
                  <div className="info-item info-full">
                    <div className="info-label">Medical notes</div>
                    <div className="info-val">{learner.medical_notes}</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
