'use client'
import { useEffect, useState } from 'react'
import { createClient } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

type Class = { id: string; name: string; class_type: string }

const IslamicIcon = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7z"/>
  </svg>
)
const SchoolIcon = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
)

export default function ManageLearners() {
  const [learners, setLearners] = useState<any[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [docTypes, setDocTypes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeListTab, setActiveListTab] = useState<'active' | 'archived'>('active')
  const [showForm, setShowForm] = useState(false)
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filterClass, setFilterClass] = useState('all')
  const [filterIssues, setFilterIssues] = useState('all')
  const [archiveSearch, setArchiveSearch] = useState('')

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<any>(null)
  const [deleteStep, setDeleteStep] = useState<1 | 2 | 3>(1)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const [fullName, setFullName] = useState('')
  const [studentId, setStudentId] = useState('')
  const [islamicClassId, setIslamicClassId] = useState('')
  const [secularClassId, setSecularClassId] = useState('')
  const [dob, setDob] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [joinDate, setJoinDate] = useState(new Date().toISOString().split('T')[0])
  const [homeLanguage, setHomeLanguage] = useState('')
  const [previousSchool, setPreviousSchool] = useState('')
  const [medicalNotes, setMedicalNotes] = useState('')

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const [{ data: learnerData }, { data: classData }, { data: docTypesData }, { data: docsData }, { data: attData }] = await Promise.all([
      supabase.from('learners').select('*, learner_classes(class_id, class_type, classes(name))').order('full_name'),
      supabase.from('classes').select('*').order('name'),
      supabase.from('document_types').select('id, name').eq('is_active', true),
      supabase.from('learner_documents').select('learner_id, document_type_id, submitted').eq('submitted', true),
      supabase.from('attendance').select('learner_id, status'),
    ])

    const totalDocs = docTypesData?.length || 0
    const docsMap: Record<string, number> = {}
    docsData?.forEach((d: any) => {
      if (!docsMap[d.learner_id]) docsMap[d.learner_id] = 0
      docsMap[d.learner_id]++
    })

    const attMap: Record<string, { total: number; present: number }> = {}
    attData?.forEach((a: any) => {
      if (!attMap[a.learner_id]) attMap[a.learner_id] = { total: 0, present: 0 }
      attMap[a.learner_id].total++
      if (a.status === 'present' || a.status === 'late') attMap[a.learner_id].present++
    })

    const enriched = (learnerData || []).map((l: any) => ({
      ...l,
      attPct: attMap[l.id]?.total > 0 ? Math.round((attMap[l.id].present / attMap[l.id].total) * 100) : null,
      attCount: attMap[l.id]?.total || 0,
      docsSubmitted: docsMap[l.id] || 0,
      totalDocs,
      missingFields: [l.date_of_birth, l.phone, l.address, l.home_language].filter(v => !v).length,
    }))

    setLearners(enriched)
    setClasses(classData || [])
    setDocTypes(docTypesData || [])
    setLoading(false)
  }

  async function addLearner() {
    if (!fullName.trim()) return
    setAdding(true); setError('')
    const { data: newLearner, error: lerr } = await supabase.from('learners').insert({
      full_name: fullName.trim(), student_id: studentId.trim() || null,
      date_of_birth: dob || null, phone: phone.trim() || null, address: address.trim() || null,
      join_date: joinDate, home_language: homeLanguage.trim() || null,
      previous_school: previousSchool.trim() || null, medical_notes: medicalNotes.trim() || null,
      is_active: true,
    }).select().single()
    if (lerr) { setError(lerr.message); setAdding(false); return }
    const inserts = []
    if (islamicClassId) inserts.push({ learner_id: newLearner.id, class_id: islamicClassId, class_type: 'islamic' })
    if (secularClassId) inserts.push({ learner_id: newLearner.id, class_id: secularClassId, class_type: 'secular' })
    if (inserts.length > 0) await supabase.from('learner_classes').insert(inserts)
    setFullName(''); setStudentId(''); setDob(''); setPhone(''); setAddress('')
    setHomeLanguage(''); setPreviousSchool(''); setMedicalNotes(''); setIslamicClassId(''); setSecularClassId('')
    setShowForm(false); loadData(); setAdding(false)
  }

  async function toggleActive(id: string, current: boolean) {
    await supabase.from('learners').update({ is_active: !current }).eq('id', id)
    loadData()
  }

  function openDeleteModal(learner: any) {
    setDeleteTarget(learner)
    setDeleteStep(1)
    setDeleteConfirmText('')
    setDeleteError('')
  }

  function closeDeleteModal() {
    setDeleteTarget(null)
    setDeleteStep(1)
    setDeleteConfirmText('')
    setDeleteError('')
  }

  async function performDelete() {
    if (!deleteTarget) return
    if (deleteConfirmText !== deleteTarget.full_name) {
      setDeleteError('Name does not match. Please type the exact name.')
      return
    }
    setDeleting(true); setDeleteError('')
    try {
      const id = deleteTarget.id

      // Must manually delete NO ACTION tables first (in safe order)
      // homework_submissions before homework_assignments
      const { error: e1 } = await supabase.from('homework_submissions').delete().eq('learner_id', id)
      if (e1) throw e1
      const { error: e2 } = await supabase.from('homework_assignments').delete().eq('learner_id', id)
      if (e2) throw e2
      const { error: e3 } = await supabase.from('activity_attendance').delete().eq('learner_id', id)
      if (e3) throw e3
      const { error: e4 } = await supabase.from('attendance').delete().eq('learner_id', id)
      if (e4) throw e4
      const { error: e5 } = await supabase.from('notes').delete().eq('learner_id', id)
      if (e5) throw e5

      // CASCADE tables will auto-delete when learner is deleted:
      // cleaning_assignments, learner_classes, learner_documents,
      // learner_duas, learner_family, learner_islamic_progress,
      // learner_surahs, learner_topic_progress

      const { error: delErr } = await supabase.from('learners').delete().eq('id', id)
      if (delErr) throw delErr

      closeDeleteModal()
      loadData()
    } catch (err: any) {
      setDeleteError(err.message || 'Delete failed. Check console for details.')
      console.error('Delete error:', err)
    }
    setDeleting(false)
  }

  const islamicClasses = classes.filter(c => c.class_type === 'islamic')
  const secularClasses = classes.filter(c => c.class_type === 'secular')

  const filtered = learners.filter(l => {
    if (!l.is_active) return false
    if (search && !l.full_name.toLowerCase().includes(search.toLowerCase())) return false
    if (filterClass !== 'all' && !l.learner_classes?.some((lc: any) => lc.class_id === filterClass)) return false
    if (filterIssues === 'atrisk' && (l.attPct === null || l.attPct >= 70)) return false
    if (filterIssues === 'missingdocs' && (l.docsSubmitted >= l.totalDocs && l.totalDocs > 0)) return false
    if (filterIssues === 'incomplete' && l.missingFields === 0) return false
    return true
  })

  const archivedLearners = learners.filter(l =>
    !l.is_active && (!archiveSearch || l.full_name.toLowerCase().includes(archiveSearch.toLowerCase()))
  )

  const activeCount = learners.filter(l => l.is_active).length
  const archivedCount = learners.filter(l => !l.is_active).length
  const atRiskCount = learners.filter(l => l.is_active && l.attPct !== null && l.attPct < 70).length
  const missingDocsCount = learners.filter(l => l.is_active && l.totalDocs > 0 && l.docsSubmitted < l.totalDocs).length
  const incompleteCount = learners.filter(l => l.is_active && l.missingFields > 0).length

  return (
    <main style={{ minHeight: '100vh', background: '#F8F7F4', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Serif+Display&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        .topbar { background:#fff; border-bottom:1px solid #EFEFED; padding:0 32px; height:56px; display:flex; align-items:center; justify-content:space-between; position:sticky; top:0; z-index:30; }
        .topbar-left { display:flex; align-items:center; gap:12px; }
        .back-btn { display:flex; align-items:center; gap:6px; font-size:13px; color:#999; background:none; border:none; cursor:pointer; padding:6px 10px; border-radius:8px; transition:all 0.15s; font-family:'DM Sans',sans-serif; }
        .back-btn:hover { background:#F5F5F3; color:#333; }
        .page-title { font-size:15px; font-weight:600; color:#1A1A1A; }
        .add-btn { display:flex; align-items:center; gap:6px; background:#1A1A1A; color:white; border:none; border-radius:9px; padding:8px 16px; font-size:13px; font-weight:500; cursor:pointer; font-family:'DM Sans',sans-serif; }
        .add-btn:hover { background:#333; }
        .add-btn.cancel { background:#F5F5F3; color:#666; }
        .wrap { max-width:1060px; margin:0 auto; padding:24px 32px; }
        .list-tabs { display:flex; gap:2px; margin-bottom:20px; background:#fff; border:1px solid #EFEFED; border-radius:12px; padding:4px; width:fit-content; }
        .list-tab { display:flex; align-items:center; gap:7px; padding:7px 16px; border:none; border-radius:9px; font-size:13px; font-weight:500; cursor:pointer; font-family:'DM Sans',sans-serif; transition:all 0.15s; color:#888; background:none; }
        .list-tab:hover { color:#333; background:#F5F5F3; }
        .list-tab.active { background:#1A1A1A; color:#fff; }
        .list-tab .tab-count { font-size:11px; padding:1px 6px; border-radius:6px; font-weight:600; }
        .list-tab.active .tab-count { background:rgba(255,255,255,0.15); color:rgba(255,255,255,0.8); }
        .list-tab:not(.active) .tab-count { background:#F0F0EE; color:#AAA; }
        .report-row { display:flex; gap:8px; margin-bottom:20px; flex-wrap:wrap; }
        .report-chip { display:flex; align-items:center; gap:6px; padding:7px 12px; border-radius:9px; border:1px solid #EFEFED; background:#fff; font-size:12px; font-weight:500; cursor:pointer; transition:all 0.15s; }
        .report-chip:hover { border-color:#DDD; }
        .report-chip.selected { border-color:#1A1A1A; background:#1A1A1A; color:#fff; }
        .report-chip .rc-dot { width:7px; height:7px; border-radius:50%; flex-shrink:0; }
        .report-chip .rc-n { font-weight:600; }
        .filters { display:flex; gap:10px; margin-bottom:10px; flex-wrap:wrap; }
        .search-wrap { flex:1; min-width:200px; position:relative; }
        .search-icon { position:absolute; left:12px; top:50%; transform:translateY(-50%); color:#AAA; pointer-events:none; display:flex; }
        .search-input { width:100%; height:38px; border:1px solid #EFEFED; border-radius:9px; padding:0 12px 0 36px; font-size:13px; font-family:'DM Sans',sans-serif; background:#fff; color:#1A1A1A; outline:none; transition:border-color 0.15s; }
        .search-input:focus { border-color:#1A1A1A; }
        .search-input::placeholder { color:#CCC; }
        .filter-select { height:38px; border:1px solid #EFEFED; border-radius:9px; padding:0 12px; font-size:13px; font-family:'DM Sans',sans-serif; background:#fff; color:#555; outline:none; cursor:pointer; }
        .results-info { font-size:12px; color:#AAA; margin-bottom:10px; }
        .learner-table { background:#fff; border:1px solid #EFEFED; border-radius:14px; overflow:hidden; }
        .table-head { display:grid; grid-template-columns:1fr 150px 120px 160px 150px; padding:10px 20px; border-bottom:1px solid #F5F5F3; background:#FAFAF8; }
        .th { font-size:11px; font-weight:500; color:#AAA; text-transform:uppercase; letter-spacing:0.05em; }
        .learner-row { display:grid; grid-template-columns:1fr 150px 120px 160px 150px; padding:12px 20px; border-bottom:1px solid #F8F8F6; align-items:center; transition:background 0.15s; }
        .learner-row:last-child { border-bottom:none; }
        .learner-row:hover { background:#FAFAF8; }
        .learner-info { display:flex; align-items:center; gap:10px; }
        .learner-avatar { width:32px; height:32px; border-radius:50%; background:#F0F9FF; color:#0369A1; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:600; flex-shrink:0; }
        .learner-avatar.inactive { background:#F5F5F3; color:#AAA; }
        .learner-name { font-size:13px; font-weight:500; color:#1A1A1A; }
        .learner-sub { font-size:11px; color:#AAA; margin-top:1px; }
        .class-badges { display:flex; flex-direction:column; gap:3px; }
        .class-badge { font-size:10px; padding:2px 7px; border-radius:7px; display:inline-flex; align-items:center; gap:4px; width:fit-content; font-weight:500; }
        .class-badge.islamic { background:#F0FDF4; color:#15803D; }
        .class-badge.secular { background:#EFF6FF; color:#1D4ED8; }
        .att-wrap { display:flex; align-items:center; gap:8px; }
        .att-track { flex:1; height:4px; background:#F0F0EE; border-radius:2px; overflow:hidden; }
        .att-fill { height:100%; border-radius:2px; }
        .att-pct { font-size:12px; font-weight:500; min-width:32px; }
        .issue-flags { display:flex; flex-direction:column; gap:4px; }
        .flag { font-size:10px; font-weight:500; padding:2px 7px; border-radius:6px; display:inline-flex; align-items:center; gap:3px; width:fit-content; }
        .flag-risk { background:#FEF2F2; color:#DC2626; }
        .flag-docs { background:#FFFBEB; color:#D97706; }
        .flag-incomplete { background:#F5F5F3; color:#777; }
        .flag-ok { background:#F0FDF4; color:#15803D; }
        .actions { display:flex; align-items:center; gap:5px; justify-content:flex-end; flex-wrap:wrap; }
        .action-btn { font-size:11px; padding:5px 10px; border-radius:7px; border:1px solid transparent; cursor:pointer; font-family:'DM Sans',sans-serif; transition:all 0.15s; font-weight:500; display:flex; align-items:center; gap:4px; white-space:nowrap; }
        .view-btn { background:#F0F9FF; color:#0369A1; border-color:#BFDBFE; }
        .view-btn:hover { background:#DBEAFE; }
        .deactivate-btn { background:#fff; color:#AAA; border-color:#EFEFED; }
        .deactivate-btn:hover { background:#FEF2F2; color:#DC2626; border-color:#FECACA; }
        .activate-btn { background:#F0FDF4; color:#15803D; border-color:#BBF7D0; }
        .activate-btn:hover { background:#DCFCE7; }
        .delete-btn { background:#FEF2F2; color:#DC2626; border-color:#FECACA; }
        .delete-btn:hover { background:#FEE2E2; }
        .empty-state { padding:48px 20px; text-align:center; }
        .empty-icon { width:44px; height:44px; background:#F5F5F3; border-radius:12px; display:flex; align-items:center; justify-content:center; margin:0 auto 12px; color:#CCC; }
        .empty-title { font-size:14px; font-weight:500; color:#555; margin-bottom:4px; }
        .empty-sub { font-size:12px; color:#AAA; }
        .form-card { background:#fff; border:1px solid #EFEFED; border-radius:14px; padding:24px; margin-bottom:20px; }
        .form-title { font-size:14px; font-weight:500; color:#1A1A1A; margin-bottom:16px; }
        .form-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
        .form-group { display:flex; flex-direction:column; gap:5px; }
        .form-group.col2 { grid-column:span 2; }
        .form-label { font-size:11px; font-weight:500; color:#888; text-transform:uppercase; letter-spacing:0.04em; }
        .form-input, .form-select { height:38px; border:1px solid #EFEFED; border-radius:9px; padding:0 12px; font-size:13px; font-family:'DM Sans',sans-serif; color:#1A1A1A; background:#fff; outline:none; transition:border-color 0.15s; }
        .form-input:focus, .form-select:focus { border-color:#1A1A1A; }
        .form-input::placeholder { color:#CCC; }
        .class-section { grid-column:span 2; display:grid; grid-template-columns:1fr 1fr; gap:12px; padding:14px; background:#FAFAF8; border-radius:10px; border:1px solid #F0F0EE; }
        .class-section-title { grid-column:span 2; font-size:11px; font-weight:500; color:#888; text-transform:uppercase; letter-spacing:0.04em; }
        .form-actions { display:flex; justify-content:flex-end; gap:8px; margin-top:16px; }
        .save-btn { background:#1A1A1A; color:white; border:none; border-radius:9px; padding:9px 20px; font-size:13px; font-weight:500; cursor:pointer; font-family:'DM Sans',sans-serif; }
        .save-btn:disabled { opacity:0.5; cursor:not-allowed; }
        .cancel-form-btn { background:#F5F5F3; color:#666; border:none; border-radius:9px; padding:9px 16px; font-size:13px; cursor:pointer; font-family:'DM Sans',sans-serif; }
        .error-msg { font-size:12px; color:#DC2626; margin-top:8px; }
        .divider { color:#DDD; }

        /* ── Delete modal ── */
        .modal-overlay {
          position: fixed; inset: 0; z-index: 100;
          background: rgba(0,0,0,0.4);
          backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center;
          padding: 20px;
        }
        .modal {
          background: #fff; border-radius: 16px;
          width: 100%; max-width: 440px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.15);
          overflow: hidden;
        }
        .modal-head {
          padding: 20px 24px 16px;
          border-bottom: 1px solid #F5F5F3;
          display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;
        }
        .modal-icon {
          width: 40px; height: 40px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .modal-title { font-size: 15px; font-weight: 600; color: #1A1A1A; margin-bottom: 3px; }
        .modal-sub { font-size: 12px; color: #AAA; line-height: 1.5; }
        .modal-close { background: none; border: none; cursor: pointer; color: #CCC; padding: 2px; }
        .modal-close:hover { color: #888; }
        .modal-body { padding: 20px 24px; }
        .modal-step { font-size: 11px; font-weight: 600; color: #AAA; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 10px; }
        .modal-warning {
          background: #FEF2F2; border: 1px solid #FECACA; border-radius: 10px;
          padding: 12px 14px; margin-bottom: 14px;
        }
        .modal-warning-title { font-size: 13px; font-weight: 600; color: #DC2626; margin-bottom: 6px; display: flex; align-items: center; gap: 6px; }
        .modal-warning-list { font-size: 12px; color: #991B1B; line-height: 1.7; margin: 0; padding-left: 14px; }
        .modal-info { font-size: 13px; color: #555; line-height: 1.6; margin-bottom: 14px; }
        .modal-name-box {
          background: #F8F7F4; border-radius: 8px;
          padding: 10px 14px; margin-bottom: 14px;
          font-size: 14px; font-weight: 600; color: #1A1A1A;
          text-align: center; letter-spacing: 0.02em;
        }
        .modal-confirm-input {
          width: 100%; height: 40px;
          border: 1.5px solid #EFEFED; border-radius: 9px;
          padding: 0 12px; font-size: 13px;
          font-family: 'DM Sans', sans-serif;
          color: #1A1A1A; background: #fff; outline: none;
          transition: border-color 0.15s;
          margin-bottom: 10px;
        }
        .modal-confirm-input:focus { border-color: #DC2626; }
        .modal-confirm-input.match { border-color: #22C55E; }
        .modal-confirm-input::placeholder { color: #CCC; }
        .modal-footer { display: flex; gap: 8px; justify-content: flex-end; padding: 0 24px 20px; }
        .modal-cancel-btn { background: #F5F5F3; color: #666; border: none; border-radius: 9px; padding: 9px 16px; font-size: 13px; cursor: pointer; font-family: 'DM Sans', sans-serif; }
        .modal-cancel-btn:hover { background: #EBEBEB; }
        .modal-next-btn { background: #1A1A1A; color: white; border: none; border-radius: 9px; padding: 9px 18px; font-size: 13px; font-weight: 500; cursor: pointer; font-family: 'DM Sans', sans-serif; }
        .modal-next-btn:hover { background: #333; }
        .modal-delete-btn { background: #DC2626; color: white; border: none; border-radius: 9px; padding: 9px 18px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: 'DM Sans', sans-serif; }
        .modal-delete-btn:hover:not(:disabled) { background: #B91C1C; }
        .modal-delete-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .modal-error { font-size: 12px; color: #DC2626; margin-bottom: 10px; }

        @media (max-width: 768px) {
          .wrap { padding: 16px; }
          .table-head { display: none; }
          .learner-row { grid-template-columns: 1fr; gap: 6px; padding: 12px 16px; }
          .form-grid { grid-template-columns: 1fr; }
          .form-group.col2, .class-section { grid-column: span 1; }
          .class-section { grid-template-columns: 1fr; }
          .topbar { padding: 0 16px; }
        }
      `}</style>

      {/* ── Topbar ── */}
      <div className="topbar">
        <div className="topbar-left">
          <button className="back-btn" onClick={() => router.push('/admin')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            Back
          </button>
          <span className="divider">|</span>
          <span className="page-title">Manage Learners</span>
        </div>
        {activeListTab === 'active' && (
          <button className={`add-btn ${showForm ? 'cancel' : ''}`} onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancel' : (
              <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add Learner</>
            )}
          </button>
        )}
      </div>

      <div className="wrap">
        {/* Tabs */}
        <div className="list-tabs">
          <button className={`list-tab ${activeListTab === 'active' ? 'active' : ''}`} onClick={() => setActiveListTab('active')}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
            Active Learners <span className="tab-count">{activeCount}</span>
          </button>
          <button className={`list-tab ${activeListTab === 'archived' ? 'active' : ''}`} onClick={() => setActiveListTab('archived')}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>
            Archived <span className="tab-count">{archivedCount}</span>
          </button>
        </div>

        {/* ── ACTIVE TAB ── */}
        {activeListTab === 'active' && (
          <>
            <div className="report-row">
              {[
                { key: 'all',         label: 'All active',        dot: '#22C55E', n: activeCount,      nColor: undefined },
                { key: 'atrisk',      label: 'At risk',           dot: '#EF4444', n: atRiskCount,      nColor: '#EF4444' },
                { key: 'missingdocs', label: 'Missing docs',      dot: '#EAB308', n: missingDocsCount, nColor: '#D97706' },
                { key: 'incomplete',  label: 'Incomplete profile', dot: '#AAA',    n: incompleteCount,  nColor: '#777' },
              ].filter(c => c.key !== 'missingdocs' || docTypes.length > 0).map(c => (
                <div key={c.key} className={`report-chip ${filterIssues === c.key ? 'selected' : ''}`} onClick={() => setFilterIssues(c.key)}>
                  <span className="rc-dot" style={{ background: c.dot }} />
                  {c.label} <span className="rc-n" style={{ color: filterIssues === c.key ? 'inherit' : c.nColor }}>{c.n}</span>
                </div>
              ))}
            </div>

            {showForm && (
              <div className="form-card">
                <div className="form-title">New Learner</div>
                <div className="form-grid">
                  <div className="form-group col2">
                    <label className="form-label">Full name *</label>
                    <input className="form-input" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Full name" />
                  </div>
                  <div className="form-group"><label className="form-label">Student ID</label><input className="form-input" value={studentId} onChange={e => setStudentId(e.target.value)} placeholder="e.g. STU001" /></div>
                  <div className="form-group"><label className="form-label">Join date</label><input className="form-input" type="date" value={joinDate} onChange={e => setJoinDate(e.target.value)} /></div>
                  <div className="form-group"><label className="form-label">Date of birth</label><input className="form-input" type="date" value={dob} onChange={e => setDob(e.target.value)} /></div>
                  <div className="form-group"><label className="form-label">Phone</label><input className="form-input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone number" /></div>
                  <div className="form-group"><label className="form-label">Home language</label><input className="form-input" value={homeLanguage} onChange={e => setHomeLanguage(e.target.value)} placeholder="e.g. Zulu, English" /></div>
                  <div className="form-group"><label className="form-label">Previous school</label><input className="form-input" value={previousSchool} onChange={e => setPreviousSchool(e.target.value)} placeholder="Previous school" /></div>
                  <div className="form-group col2"><label className="form-label">Address</label><input className="form-input" value={address} onChange={e => setAddress(e.target.value)} placeholder="Home address" /></div>
                  <div className="form-group col2"><label className="form-label">Medical notes</label><input className="form-input" value={medicalNotes} onChange={e => setMedicalNotes(e.target.value)} placeholder="Allergies, conditions..." /></div>
                  <div className="class-section">
                    <span className="class-section-title">Class assignment</span>
                    <div className="form-group">
                      <label className="form-label">Islamic class</label>
                      <select className="form-select" value={islamicClassId} onChange={e => setIslamicClassId(e.target.value)}>
                        <option value="">— None —</option>
                        {islamicClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Secular class</label>
                      <select className="form-select" value={secularClassId} onChange={e => setSecularClassId(e.target.value)}>
                        <option value="">— None —</option>
                        {secularClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
                {error && <p className="error-msg">{error}</p>}
                <div className="form-actions">
                  <button className="cancel-form-btn" onClick={() => setShowForm(false)}>Cancel</button>
                  <button className="save-btn" onClick={addLearner} disabled={adding}>{adding ? 'Adding...' : 'Add Learner'}</button>
                </div>
              </div>
            )}

            <div className="filters">
              <div className="search-wrap">
                <span className="search-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></span>
                <input className="search-input" placeholder="Search by name..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <select className="filter-select" value={filterClass} onChange={e => setFilterClass(e.target.value)}>
                <option value="all">All classes</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <p className="results-info">Showing {filtered.length} learner{filtered.length !== 1 ? 's' : ''}{search && ` matching "${search}"`}</p>

            <div className="learner-table">
              <div className="table-head">
                <span className="th">Learner</span>
                <span className="th">Classes</span>
                <span className="th">Attendance</span>
                <span className="th">Issues</span>
                <span className="th" style={{ textAlign: 'right' }}>Actions</span>
              </div>
              {loading ? (
                <div className="empty-state"><p className="empty-title">Loading...</p></div>
              ) : filtered.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg></div>
                  <p className="empty-title">No learners found</p>
                  <p className="empty-sub">Try adjusting your filters</p>
                </div>
              ) : (
                filtered.map((l: any) => {
                  const islamicClass = l.learner_classes?.find((lc: any) => lc.class_type === 'islamic')
                  const secularClass = l.learner_classes?.find((lc: any) => lc.class_type === 'secular')
                  const isAtRisk = l.attPct !== null && l.attPct < 70
                  const hasMissingDocs = l.totalDocs > 0 && l.docsSubmitted < l.totalDocs
                  const isIncomplete = l.missingFields > 0
                  const hasNoIssues = !isAtRisk && !hasMissingDocs && !isIncomplete
                  return (
                    <div key={l.id} className="learner-row">
                      <div className="learner-info">
                        <div className="learner-avatar">{l.full_name.charAt(0)}</div>
                        <div>
                          <div className="learner-name">{l.full_name}</div>
                          <div className="learner-sub">{l.student_id ? `ID: ${l.student_id}` : l.join_date ? `Joined: ${l.join_date}` : '—'}</div>
                        </div>
                      </div>
                      <div className="class-badges">
                        {islamicClass && <span className="class-badge islamic"><IslamicIcon /> {islamicClass.classes?.name}</span>}
                        {secularClass && <span className="class-badge secular"><SchoolIcon /> {secularClass.classes?.name}</span>}
                        {!islamicClass && !secularClass && <span style={{ fontSize: 11, color: '#CCC' }}>—</span>}
                      </div>
                      <div>
                        {l.attPct === null ? <span style={{ fontSize: 12, color: '#CCC' }}>No data</span> : (
                          <div className="att-wrap">
                            <div className="att-track"><div className="att-fill" style={{ width: `${l.attPct}%`, background: isAtRisk ? '#EF4444' : '#22C55E' }} /></div>
                            <span className="att-pct" style={{ color: isAtRisk ? '#EF4444' : '#22C55E' }}>{l.attPct}%</span>
                          </div>
                        )}
                      </div>
                      <div className="issue-flags">
                        {hasNoIssues && <span className="flag flag-ok">✓ All good</span>}
                        {isAtRisk && <span className="flag flag-risk">⚠ At risk</span>}
                        {hasMissingDocs && <span className="flag flag-docs">📄 {l.docsSubmitted}/{l.totalDocs} docs</span>}
                        {isIncomplete && <span className="flag flag-incomplete">✎ {l.missingFields} fields missing</span>}
                      </div>
                      <div className="actions">
                        <button className="action-btn view-btn" onClick={() => router.push(`/admin/learners/${l.id}`)}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                          View
                        </button>
                        <button className="action-btn deactivate-btn" onClick={() => toggleActive(l.id, true)}>Archive</button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </>
        )}

        {/* ── ARCHIVED TAB ── */}
        {activeListTab === 'archived' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
              <div className="search-wrap" style={{ maxWidth: 360 }}>
                <span className="search-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></span>
                <input className="search-input" placeholder="Search archived learners..." value={archiveSearch} onChange={e => setArchiveSearch(e.target.value)} />
              </div>
              <div style={{ fontSize: 12, color: '#AAA', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                <span style={{ color: '#DC2626', fontWeight: 500 }}>Deletion permanently removes all learner data</span>
              </div>
            </div>
            <p className="results-info">{archivedLearners.length} archived learner{archivedLearners.length !== 1 ? 's' : ''}</p>

            <div className="learner-table">
              <div className="table-head">
                <span className="th">Learner</span>
                <span className="th">Classes</span>
                <span className="th">Attendance</span>
                <span className="th">Status</span>
                <span className="th" style={{ textAlign: 'right' }}>Actions</span>
              </div>
              {loading ? (
                <div className="empty-state"><p className="empty-title">Loading...</p></div>
              ) : archivedLearners.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg></div>
                  <p className="empty-title">{archiveSearch ? `No results for "${archiveSearch}"` : 'No archived learners'}</p>
                </div>
              ) : (
                archivedLearners.map((l: any) => {
                  const islamicClass = l.learner_classes?.find((lc: any) => lc.class_type === 'islamic')
                  const secularClass = l.learner_classes?.find((lc: any) => lc.class_type === 'secular')
                  return (
                    <div key={l.id} className="learner-row" style={{ opacity: 0.8 }}>
                      <div className="learner-info">
                        <div className="learner-avatar inactive">{l.full_name.charAt(0)}</div>
                        <div>
                          <div className="learner-name" style={{ color: '#888' }}>{l.full_name}</div>
                          <div className="learner-sub">{l.student_id ? `ID: ${l.student_id}` : l.join_date ? `Joined: ${l.join_date}` : '—'}</div>
                        </div>
                      </div>
                      <div className="class-badges">
                        {islamicClass && <span className="class-badge islamic"><IslamicIcon /> {islamicClass.classes?.name}</span>}
                        {secularClass && <span className="class-badge secular"><SchoolIcon /> {secularClass.classes?.name}</span>}
                        {!islamicClass && !secularClass && <span style={{ fontSize: 11, color: '#CCC' }}>—</span>}
                      </div>
                      <div>
                        {l.attPct === null ? <span style={{ fontSize: 12, color: '#CCC' }}>No data</span> : (
                          <div className="att-wrap">
                            <div className="att-track"><div className="att-fill" style={{ width: `${l.attPct}%`, background: '#CCC' }} /></div>
                            <span className="att-pct" style={{ color: '#AAA' }}>{l.attPct}%</span>
                          </div>
                        )}
                      </div>
                      <div><span className="flag flag-incomplete">Archived</span></div>
                      <div className="actions">
                        <button className="action-btn view-btn" onClick={() => router.push(`/admin/learners/${l.id}`)}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                          View
                        </button>
                        <button className="action-btn activate-btn" onClick={() => toggleActive(l.id, false)}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
                          Reactivate
                        </button>
                        <button className="action-btn delete-btn" onClick={() => openDeleteModal(l)}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
                          Delete
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Delete modal ── */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) closeDeleteModal() }}>
          <div className="modal">
            <div className="modal-head">
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div className="modal-icon" style={{ background: '#FEF2F2' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                </div>
                <div>
                  <div className="modal-title">Permanently delete learner</div>
                  <div className="modal-sub">This cannot be undone. All data will be lost.</div>
                </div>
              </div>
              <button className="modal-close" onClick={closeDeleteModal}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div className="modal-body">
              {/* Step 1 — Warning */}
              {deleteStep === 1 && (
                <>
                  <div className="modal-step">Step 1 of 3 — Review what will be deleted</div>
                  <div className="modal-warning">
                    <div className="modal-warning-title">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                      The following will be permanently deleted:
                    </div>
                    <ul className="modal-warning-list">
                      <li>All attendance records ({deleteTarget.attCount || 0} records)</li>
                      <li>Class assignments & enrolment history</li>
                      <li>Submitted documents & document records</li>
                      <li>Topic progress & curriculum tracking</li>
                      <li>Homework submissions</li>
                      <li>Teacher notes</li>
                      <li>Learner profile & personal details</li>
                    </ul>
                  </div>
                  <p className="modal-info">
                    <strong>{deleteTarget.full_name}</strong> is currently archived. Deletion is permanent and cannot be reversed.
                  </p>
                </>
              )}

              {/* Step 2 — Second confirmation */}
              {deleteStep === 2 && (
                <>
                  <div className="modal-step">Step 2 of 3 — Confirm your intent</div>
                  <p className="modal-info">
                    You are about to permanently delete <strong>{deleteTarget.full_name}</strong> and all associated data. Are you absolutely sure?
                  </p>
                  <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                    <div style={{ flex: 1, background: '#FAFAF8', border: '1px solid #EFEFED', borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
                      <div style={{ fontSize: 20, fontWeight: 600, color: '#1A1A1A' }}>{deleteTarget.attCount || 0}</div>
                      <div style={{ fontSize: 11, color: '#AAA', marginTop: 2 }}>Attendance records</div>
                    </div>
                    <div style={{ flex: 1, background: '#FAFAF8', border: '1px solid #EFEFED', borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
                      <div style={{ fontSize: 20, fontWeight: 600, color: '#1A1A1A' }}>{deleteTarget.docsSubmitted || 0}</div>
                      <div style={{ fontSize: 11, color: '#AAA', marginTop: 2 }}>Documents</div>
                    </div>
                    <div style={{ flex: 1, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#DC2626' }}>Permanent</div>
                      <div style={{ fontSize: 11, color: '#DC2626', marginTop: 2 }}>Cannot undo</div>
                    </div>
                  </div>
                </>
              )}

              {/* Step 3 — Type name */}
              {deleteStep === 3 && (
                <>
                  <div className="modal-step">Step 3 of 3 — Type the learner's full name to confirm</div>
                  <p className="modal-info">To confirm deletion, type the learner's exact full name below:</p>
                  <div className="modal-name-box">{deleteTarget.full_name}</div>
                  <input
                    className={`modal-confirm-input ${deleteConfirmText === deleteTarget.full_name ? 'match' : ''}`}
                    placeholder="Type full name here..."
                    value={deleteConfirmText}
                    onChange={e => { setDeleteConfirmText(e.target.value); setDeleteError('') }}
                    autoFocus
                  />
                  {deleteError && <p className="modal-error">{deleteError}</p>}
                </>
              )}
            </div>

            <div className="modal-footer">
              <button className="modal-cancel-btn" onClick={closeDeleteModal}>Cancel</button>
              {deleteStep < 3 ? (
                <button className="modal-next-btn" onClick={() => setDeleteStep(s => (s + 1) as 1|2|3)}>
                  I understand, continue →
                </button>
              ) : (
                <button
                  className="modal-delete-btn"
                  onClick={performDelete}
                  disabled={deleting || deleteConfirmText !== deleteTarget.full_name}
                >
                  {deleting ? 'Deleting...' : 'Permanently delete'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}