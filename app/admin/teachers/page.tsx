'use client'
import { useEffect, useState } from 'react'
import { createClient } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

type User = { id: string; full_name: string; display_name: string; email: string; role: string; is_head_teacher: boolean; is_head_etutor: boolean; auth_id: string }
type Class = { id: string; name: string }
type EtutorClass = { etutor_id: string; class_id: string }

export default function ManageTeachers() {
  const [users, setUsers] = useState<User[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [etutorClasses, setEtutorClasses] = useState<EtutorClass[]>([])
  const [name, setName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('teacher')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showForm, setShowForm] = useState(false)

  // Edit modal
  const [editUser, setEditUser] = useState<User | null>(null)
  const [editFullName, setEditFullName] = useState('')
  const [editDisplayName, setEditDisplayName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editRole, setEditRole] = useState('')
  const [editPassword, setEditPassword] = useState('')
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState('')
  const [editSuccess, setEditSuccess] = useState('')

  // Class assignment modal
  const [assignUser, setAssignUser] = useState<User | null>(null)
  const [assignSaving, setAssignSaving] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const [{ data: u }, { data: cls }, { data: ec }] = await Promise.all([
      supabase.from('users').select('*').in('role', ['teacher', 'baskan', 'islamic_teacher', 'etutor']).order('role').order('full_name'),
      supabase.from('classes').select('id, name').order('name'),
      supabase.from('etutor_classes').select('etutor_id, class_id'),
    ])
    setUsers(u || [])
    setClasses(cls || [])
    setEtutorClasses(ec || [])
  }

  async function addUser() {
    if (!name.trim() || !email.trim() || !password.trim()) return
    setLoading(true); setError(''); setSuccess('')
    const { data: authData, error: authError } = await supabase.auth.signUp({ email: email.trim(), password: password.trim() })
    if (authError) { setError(authError.message); setLoading(false); return }
    await supabase.rpc('confirm_user_email', { user_id: authData.user?.id })
    const { error: dbError } = await supabase.from('users').insert({
      auth_id: authData.user?.id, full_name: name.trim(),
      display_name: displayName.trim() || null, email: email.trim(), role,
    })
    if (dbError) { setError(dbError.message); setLoading(false); return }
    const roleLabels: Record<string, string> = { teacher: 'Teacher', islamic_teacher: 'Islamic Teacher', baskan: 'Baskan', etutor: 'Etütçü' }
    setSuccess(`${roleLabels[role] || role} added!`)
    setName(''); setDisplayName(''); setEmail(''); setPassword('')
    setShowForm(false); loadAll(); setLoading(false)
  }

  function openEdit(u: User) {
    setEditUser(u); setEditFullName(u.full_name); setEditDisplayName(u.display_name || '')
    setEditEmail(u.email); setEditRole(u.role); setEditPassword(''); setEditError(''); setEditSuccess('')
  }

  function closeEdit() { setEditUser(null); setEditPassword(''); setEditError(''); setEditSuccess('') }

  async function saveEdit() {
    if (!editUser) return
    setEditLoading(true); setEditError(''); setEditSuccess('')
    const { error: dbErr } = await supabase.from('users').update({
      full_name: editFullName.trim(), display_name: editDisplayName.trim() || null,
      email: editEmail.trim(), role: editRole,
    }).eq('id', editUser.id)
    if (dbErr) { setEditError(dbErr.message); setEditLoading(false); return }
    if (editEmail.trim() !== editUser.email) {
      const { error: emailErr } = await supabase.auth.admin.updateUserById(editUser.auth_id, { email: editEmail.trim(), email_confirm: true })
      if (emailErr) { setEditError('Profile saved but email update failed: ' + emailErr.message); setEditLoading(false); loadAll(); return }
    }
    if (editPassword.trim()) {
      const { error: pwErr } = await supabase.auth.admin.updateUserById(editUser.auth_id, { password: editPassword.trim() })
      if (pwErr) { setEditError('Profile saved but password update failed: ' + pwErr.message); setEditLoading(false); loadAll(); return }
    }
    setEditSuccess('Changes saved successfully!')
    loadAll(); setEditLoading(false)
    setTimeout(() => closeEdit(), 1200)
  }

  async function toggleHeadTeacher(id: string, current: boolean) {
    await supabase.from('users').update({ is_head_teacher: !current }).eq('id', id)
    loadAll()
  }

  async function toggleHeadEtutor(id: string, current: boolean) {
    await supabase.from('users').update({ is_head_etutor: !current }).eq('id', id)
    loadAll()
  }

  async function deleteUser(id: string) {
    if (!confirm('Delete this user?')) return
    await supabase.from('users').delete().eq('id', id)
    loadAll()
  }

  // Class assignment
  function openAssign(u: User) { setAssignUser(u) }
  function closeAssign() { setAssignUser(null) }

  function getAssignedClasses(etutorId: string) {
    return etutorClasses.filter(ec => ec.etutor_id === etutorId).map(ec => ec.class_id)
  }

  async function toggleClass(etutorId: string, classId: string) {
    const assigned = getAssignedClasses(etutorId)
    setAssignSaving(true)
    if (assigned.includes(classId)) {
      await supabase.from('etutor_classes').delete().eq('etutor_id', etutorId).eq('class_id', classId)
    } else {
      await supabase.from('etutor_classes').insert({ etutor_id: etutorId, class_id: classId })
    }
    const { data: ec } = await supabase.from('etutor_classes').select('etutor_id, class_id')
    setEtutorClasses(ec || [])
    setAssignSaving(false)
  }

  const roleConfig: Record<string, { label: string; bg: string; color: string }> = {
    teacher:         { label: 'Teacher',        bg: '#EFF6FF', color: '#1D4ED8' },
    baskan:          { label: 'Baskan',          bg: '#F0FDF4', color: '#15803D' },
    islamic_teacher: { label: 'Islamic Teacher', bg: '#FDF4FF', color: '#7E22CE' },
    etutor:          { label: 'Etütçü',          bg: '#FFF7ED', color: '#C2410C' },
  }

  const grouped = {
    teacher:         users.filter(u => u.role === 'teacher'),
    islamic_teacher: users.filter(u => u.role === 'islamic_teacher'),
    baskan:          users.filter(u => u.role === 'baskan'),
    etutor:          users.filter(u => u.role === 'etutor'),
  }

  return (
    <main style={{ minHeight: '100vh', background: '#F8F7F4', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        .topbar { background:#fff; border-bottom:1px solid #EFEFED; padding:0 32px; height:56px; display:flex; align-items:center; justify-content:space-between; position:sticky; top:0; z-index:30; }
        .topbar-left { display:flex; align-items:center; gap:12px; }
        .back-btn { display:flex; align-items:center; gap:6px; font-size:13px; color:#999; background:none; border:none; cursor:pointer; padding:6px 10px; border-radius:8px; transition:all 0.15s; font-family:'DM Sans',sans-serif; }
        .back-btn:hover { background:#F5F5F3; color:#333; }
        .page-title { font-size:15px; font-weight:500; color:#1A1A1A; }
        .divider { color:#DDD; }
        .add-btn { display:flex; align-items:center; gap:6px; background:#1A1A1A; color:white; border:none; border-radius:9px; padding:8px 16px; font-size:13px; font-weight:500; cursor:pointer; font-family:'DM Sans',sans-serif; }
        .add-btn:hover { background:#333; }
        .add-btn.cancel { background:#F5F5F3; color:#666; }
        .wrap { max-width:800px; margin:0 auto; padding:28px 32px; }
        .form-card { background:#fff; border:1px solid #EFEFED; border-radius:14px; padding:22px; margin-bottom:20px; }
        .form-title { font-size:14px; font-weight:500; color:#1A1A1A; margin-bottom:16px; }
        .form-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
        .form-group { display:flex; flex-direction:column; gap:5px; }
        .form-group.col2 { grid-column:span 2; }
        .form-label { font-size:11px; font-weight:500; color:#888; text-transform:uppercase; letter-spacing:0.04em; }
        .form-input, .form-select { height:38px; border:1px solid #EFEFED; border-radius:9px; padding:0 12px; font-size:13px; font-family:'DM Sans',sans-serif; color:#1A1A1A; background:#fff; outline:none; transition:border-color 0.15s; }
        .form-input:focus, .form-select:focus { border-color:#1A1A1A; }
        .form-input::placeholder { color:#CCC; }
        .form-hint { font-size:11px; color:#AAA; margin-top:2px; }
        .form-actions { display:flex; justify-content:flex-end; gap:8px; margin-top:14px; }
        .save-btn { background:#1A1A1A; color:white; border:none; border-radius:9px; padding:9px 20px; font-size:13px; font-weight:500; cursor:pointer; font-family:'DM Sans',sans-serif; }
        .save-btn:disabled { opacity:0.5; }
        .cancel-btn { background:#F5F5F3; color:#666; border:none; border-radius:9px; padding:9px 16px; font-size:13px; cursor:pointer; font-family:'DM Sans',sans-serif; }
        .error-msg { font-size:12px; color:#DC2626; margin-top:8px; }
        .success-msg { font-size:12px; color:#15803D; background:#F0FDF4; padding:8px 12px; border-radius:8px; margin-top:8px; }
        .group-section { margin-bottom:20px; }
        .group-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; }
        .group-label { font-size:11px; font-weight:500; color:#AAA; text-transform:uppercase; letter-spacing:0.06em; display:flex; align-items:center; gap:8px; }
        .group-count { background:#F5F5F3; color:#AAA; font-size:10px; padding:2px 7px; border-radius:8px; }
        .head-count { background:#FFF7ED; color:#C2410C; font-size:10px; padding:2px 7px; border-radius:8px; }
        .users-card { background:#fff; border:1px solid #EFEFED; border-radius:12px; overflow:hidden; }
        .user-row { display:flex; align-items:center; justify-content:space-between; padding:12px 16px; border-bottom:1px solid #F8F8F6; transition:background 0.15s; gap:8px; }
        .user-row:last-child { border-bottom:none; }
        .user-row:hover { background:#FAFAF8; }
        .user-row.head { background:#FFFBEB; }
        .user-row.head-etutor { background:#FFF7ED; }
        .user-left { display:flex; align-items:center; gap:10px; flex:1; min-width:0; }
        .user-avatar { width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:500; flex-shrink:0; }
        .user-info { flex:1; min-width:0; }
        .user-name { font-size:13px; font-weight:500; color:#1A1A1A; display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
        .head-badge { font-size:9px; font-weight:600; background:#FFF7ED; color:#C2410C; border:1px solid #FED7AA; padding:1px 6px; border-radius:6px; text-transform:uppercase; letter-spacing:0.05em; }
        .user-display { font-size:11px; color:#888; margin-top:1px; }
        .user-email { font-size:11px; color:#AAA; }
        .class-tags { display:flex; gap:4px; flex-wrap:wrap; margin-top:3px; }
        .class-tag { font-size:10px; color:#C2410C; background:#FFF7ED; border:1px solid #FED7AA; padding:1px 6px; border-radius:5px; }
        .role-badge { font-size:10px; padding:3px 8px; border-radius:7px; font-weight:500; white-space:nowrap; flex-shrink:0; }
        .user-actions { display:flex; align-items:center; gap:5px; flex-shrink:0; }
        .action-btn { font-size:11px; padding:4px 9px; border-radius:7px; border:1px solid transparent; cursor:pointer; font-family:'DM Sans',sans-serif; font-weight:500; display:flex; align-items:center; gap:3px; transition:all 0.15s; white-space:nowrap; }
        .edit-btn { background:#F5F5F3; color:#555; border-color:#EFEFED; }
        .edit-btn:hover { background:#EBEBEB; color:#1A1A1A; }
        .head-btn { background:#FFF7ED; color:#C2410C; border-color:#FED7AA; }
        .head-btn:hover { background:#FFEDD5; }
        .head-btn.active { background:#C2410C; color:white; border-color:#C2410C; }
        .assign-btn { background:#FFF7ED; color:#C2410C; border-color:#FED7AA; }
        .assign-btn:hover { background:#FFEDD5; }
        .del-btn { background:#fff; color:#CCC; border-color:#EFEFED; }
        .del-btn:hover { background:#FEF2F2; color:#DC2626; border-color:#FECACA; }
        .empty-group { padding:20px 16px; text-align:center; color:#CCC; font-size:13px; }
        .info-box { background:#F0F9FF; border:1px solid #BFDBFE; border-radius:10px; padding:12px 16px; margin-bottom:20px; font-size:12px; color:#1D4ED8; display:flex; align-items:flex-start; gap:8px; }
        .etutor-info-box { background:#FFF7ED; border:1px solid #FED7AA; border-radius:10px; padding:12px 16px; margin-bottom:20px; font-size:12px; color:#92400E; display:flex; align-items:flex-start; gap:8px; }

        /* Edit modal */
        .modal-overlay { position:fixed; inset:0; z-index:100; background:rgba(0,0,0,0.4); backdrop-filter:blur(4px); display:flex; align-items:center; justify-content:center; padding:20px; }
        .modal { background:#fff; border-radius:16px; width:100%; max-width:480px; box-shadow:0 20px 60px rgba(0,0,0,0.15); overflow:hidden; }
        .modal-head { padding:18px 24px; border-bottom:1px solid #F5F5F3; display:flex; align-items:center; justify-content:space-between; }
        .modal-title { font-size:15px; font-weight:600; color:#1A1A1A; }
        .modal-sub { font-size:12px; color:#AAA; margin-top:2px; }
        .modal-close { background:none; border:none; cursor:pointer; color:#CCC; padding:2px; }
        .modal-close:hover { color:#888; }
        .modal-body { padding:20px 24px; display:flex; flex-direction:column; gap:14px; }
        .modal-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
        .modal-label { font-size:11px; font-weight:500; color:#888; text-transform:uppercase; letter-spacing:0.04em; margin-bottom:5px; display:block; }
        .modal-input, .modal-select { width:100%; height:38px; border:1px solid #EFEFED; border-radius:9px; padding:0 12px; font-size:13px; font-family:'DM Sans',sans-serif; color:#1A1A1A; background:#fff; outline:none; transition:border-color 0.15s; }
        .modal-input:focus, .modal-select:focus { border-color:#1A1A1A; }
        .modal-input::placeholder { color:#CCC; }
        .modal-section-title { font-size:11px; font-weight:600; color:#AAA; text-transform:uppercase; letter-spacing:0.06em; padding-bottom:6px; border-bottom:1px solid #F5F5F3; }
        .modal-hint { font-size:11px; color:#AAA; margin-top:3px; }
        .modal-footer { display:flex; gap:8px; justify-content:flex-end; padding:0 24px 20px; }
        .modal-cancel { background:#F5F5F3; color:#666; border:none; border-radius:9px; padding:9px 16px; font-size:13px; cursor:pointer; font-family:'DM Sans',sans-serif; }
        .modal-save { background:#1A1A1A; color:white; border:none; border-radius:9px; padding:9px 20px; font-size:13px; font-weight:500; cursor:pointer; font-family:'DM Sans',sans-serif; }
        .modal-save:disabled { opacity:0.5; cursor:not-allowed; }
        .modal-error { font-size:12px; color:#DC2626; padding:0 24px 4px; }
        .modal-success { font-size:12px; color:#15803D; background:#F0FDF4; padding:8px 12px; border-radius:8px; margin:0 24px 4px; }

        /* Class assign modal */
        .assign-modal { background:#fff; border-radius:16px; width:100%; max-width:420px; box-shadow:0 20px 60px rgba(0,0,0,0.15); overflow:hidden; }
        .assign-body { padding:16px 20px; display:flex; flex-direction:column; gap:8px; max-height:400px; overflow-y:auto; }
        .class-row { display:flex; align-items:center; justify-content:space-between; padding:10px 12px; border:1px solid #EFEFED; border-radius:10px; cursor:pointer; transition:all 0.15s; }
        .class-row:hover { background:#FAFAF8; }
        .class-row.assigned { background:#FFF7ED; border-color:#FED7AA; }
        .class-row-name { font-size:13px; font-weight:500; color:#1A1A1A; }
        .class-row-check { width:20px; height:20px; border-radius:5px; border:1.5px solid #DDD; display:flex; align-items:center; justify-content:center; flex-shrink:0; transition:all 0.15s; }
        .class-row.assigned .class-row-check { background:#C2410C; border-color:#C2410C; }

        @media (max-width:768px) {
          .wrap { padding:16px; }
          .form-grid, .modal-grid { grid-template-columns:1fr; }
          .topbar { padding:0 16px; }
          .user-actions { gap:4px; }
          .action-btn { padding:4px 7px; font-size:10px; }
        }
      `}</style>

      {/* Topbar */}
      <div className="topbar">
        <div className="topbar-left">
          <button className="back-btn" onClick={() => router.push('/admin')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            Back
          </button>
          <span className="divider">|</span>
          <span className="page-title">Manage Staff</span>
        </div>
        <button className={`add-btn ${showForm ? 'cancel' : ''}`} onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : (
            <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add Staff</>
          )}
        </button>
      </div>

      <div className="wrap">

        <div className="info-box">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink:0, marginTop:1 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <span><strong>Head Teacher</strong> can view all classes, all students' attendance, all homework performance and all teacher activity. Regular teachers only see their own classes.</span>
        </div>

        {/* Add form */}
        {showForm && (
          <div className="form-card">
            <div className="form-title">Add New Staff Member</div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Full name *</label>
                <input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="Full name" />
              </div>
              <div className="form-group">
                <label className="form-label">Role *</label>
                <select className="form-select" value={role} onChange={e => setRole(e.target.value)}>
                  <option value="teacher">Teacher</option>
                  <option value="islamic_teacher">Islamic Teacher</option>
                  <option value="baskan">Baskan</option>
                  <option value="etutor">Etütçü</option>
                </select>
              </div>
              <div className="form-group col2">
                <label className="form-label">Display name / Nickname (optional)</label>
                <input className="form-input" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="e.g. Hoca, Mr Smith..." />
                <span className="form-hint">Shown in timetable and dashboards instead of full name</span>
              </div>
              <div className="form-group">
                <label className="form-label">Email *</label>
                <input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" />
              </div>
              <div className="form-group">
                <label className="form-label">Password *</label>
                <input className="form-input" type="text" value={password} onChange={e => setPassword(e.target.value)} placeholder="Temporary password" />
              </div>
            </div>
            {error && <p className="error-msg">{error}</p>}
            {success && <p className="success-msg">{success}</p>}
            <div className="form-actions">
              <button className="cancel-btn" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="save-btn" onClick={addUser} disabled={loading}>{loading ? 'Adding...' : 'Add Staff Member'}</button>
            </div>
          </div>
        )}

        {/* Staff groups — Teachers, Islamic Teachers, Baskans (unchanged) */}
        {([
          { key: 'teacher',         label: 'Teachers' },
          { key: 'islamic_teacher', label: 'Islamic Teachers' },
          { key: 'baskan',          label: 'Baskans' },
        ] as const).map(group => {
          const list = grouped[group.key]
          const cfg  = roleConfig[group.key]
          const headCount = list.filter(u => u.is_head_teacher).length
          return (
            <div key={group.key} className="group-section">
              <div className="group-header">
                <div className="group-label">
                  {group.label}
                  <span className="group-count">{list.length}</span>
                  {headCount > 0 && group.key === 'teacher' && (
                    <span className="head-count">{headCount} head teacher{headCount > 1 ? 's' : ''}</span>
                  )}
                </div>
              </div>
              <div className="users-card">
                {list.length === 0 ? (
                  <div className="empty-group">No {group.label.toLowerCase()} yet</div>
                ) : list.map(u => (
                  <div key={u.id} className={`user-row ${u.is_head_teacher ? 'head' : ''}`}>
                    <div className="user-left">
                      <div className="user-avatar" style={{ background: u.is_head_teacher ? '#FFF7ED' : cfg.bg, color: u.is_head_teacher ? '#C2410C' : cfg.color }}>
                        {(u.display_name || u.full_name).charAt(0).toUpperCase()}
                      </div>
                      <div className="user-info">
                        <div className="user-name">
                          {u.full_name}
                          {u.is_head_teacher && <span className="head-badge">Head Teacher</span>}
                        </div>
                        {u.display_name && <div className="user-display">Display: {u.display_name}</div>}
                        <div className="user-email">{u.email}</div>
                      </div>
                    </div>
                    <div className="user-actions">
                      <span className="role-badge" style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                      {group.key === 'teacher' && (
                        <button className={`action-btn head-btn ${u.is_head_teacher ? 'active' : ''}`} onClick={() => toggleHeadTeacher(u.id, u.is_head_teacher)}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                          {u.is_head_teacher ? 'Head' : 'Set Head'}
                        </button>
                      )}
                      <button className="action-btn edit-btn" onClick={() => openEdit(u)}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        Edit
                      </button>
                      <button className="action-btn del-btn" onClick={() => deleteUser(u.id)}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}

        {/* ── Etütçü Section ── */}
        <div className="etutor-info-box">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink:0, marginTop:1 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <span><strong>Head Etütçü</strong> tüm sınıfların verilerini görebilir ve haftalık raporları çekebilir. Normal etütçü sadece atandığı sınıfları görür. Sınıf atamak için "Classes" butonunu kullan.</span>
        </div>

        <div className="group-section">
          <div className="group-header">
            <div className="group-label">
              Etütçüler
              <span className="group-count">{grouped.etutor.length}</span>
              {grouped.etutor.filter(u => u.is_head_etutor).length > 0 && (
                <span className="head-count">{grouped.etutor.filter(u => u.is_head_etutor).length} head</span>
              )}
            </div>
          </div>
          <div className="users-card">
            {grouped.etutor.length === 0 ? (
              <div className="empty-group">No etütçü yet — add one with the button above</div>
            ) : grouped.etutor.map(u => {
              const assignedClassIds = getAssignedClasses(u.id)
              const assignedClassNames = assignedClassIds.map(cid => classes.find(c => c.id === cid)?.name).filter(Boolean)
              return (
                <div key={u.id} className={`user-row ${u.is_head_etutor ? 'head-etutor' : ''}`}>
                  <div className="user-left">
                    <div className="user-avatar" style={{ background: u.is_head_etutor ? '#FFF7ED' : '#FFF7ED', color: '#C2410C' }}>
                      {(u.display_name || u.full_name).charAt(0).toUpperCase()}
                    </div>
                    <div className="user-info">
                      <div className="user-name">
                        {u.full_name}
                        {u.is_head_etutor && <span className="head-badge">Head Etütçü</span>}
                      </div>
                      {u.display_name && <div className="user-display">Display: {u.display_name}</div>}
                      <div className="user-email">{u.email}</div>
                      {u.is_head_etutor ? (
                        <div className="user-display" style={{ color:'#C2410C' }}>Tüm sınıflar</div>
                      ) : assignedClassNames.length > 0 ? (
                        <div className="class-tags">
                          {assignedClassNames.map(n => <span key={n} className="class-tag">{n}</span>)}
                        </div>
                      ) : (
                        <div className="user-display" style={{ color:'#EF4444' }}>⚠ Sınıf atanmamış</div>
                      )}
                    </div>
                  </div>
                  <div className="user-actions">
                    <span className="role-badge" style={{ background:'#FFF7ED', color:'#C2410C' }}>Etütçü</span>
                    <button className={`action-btn head-btn ${u.is_head_etutor ? 'active' : ''}`} onClick={() => toggleHeadEtutor(u.id, u.is_head_etutor)}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                      {u.is_head_etutor ? 'Head' : 'Set Head'}
                    </button>
                    {!u.is_head_etutor && (
                      <button className="action-btn assign-btn" onClick={() => openAssign(u)}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                        Classes
                      </button>
                    )}
                    <button className="action-btn edit-btn" onClick={() => openEdit(u)}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      Edit
                    </button>
                    <button className="action-btn del-btn" onClick={() => deleteUser(u.id)}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Edit modal */}
      {editUser && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) closeEdit() }}>
          <div className="modal">
            <div className="modal-head">
              <div>
                <div className="modal-title">Edit staff member</div>
                <div className="modal-sub">{editUser.full_name}</div>
              </div>
              <button className="modal-close" onClick={closeEdit}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="modal-section-title">Profile</div>
              <div className="modal-grid">
                <div>
                  <label className="modal-label">Full name *</label>
                  <input className="modal-input" value={editFullName} onChange={e => setEditFullName(e.target.value)} />
                </div>
                <div>
                  <label className="modal-label">Display name</label>
                  <input className="modal-input" value={editDisplayName} onChange={e => setEditDisplayName(e.target.value)} placeholder="Nickname" />
                </div>
                <div>
                  <label className="modal-label">Role *</label>
                  <select className="modal-select" value={editRole} onChange={e => setEditRole(e.target.value)}>
                    <option value="teacher">Teacher</option>
                    <option value="islamic_teacher">Islamic Teacher</option>
                    <option value="baskan">Baskan</option>
                    <option value="etutor">Etütçü</option>
                  </select>
                </div>
              </div>
              <div className="modal-section-title">Login credentials</div>
              <div className="modal-grid">
                <div>
                  <label className="modal-label">Email</label>
                  <input className="modal-input" type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} />
                </div>
                <div>
                  <label className="modal-label">New password</label>
                  <input className="modal-input" type="text" value={editPassword} onChange={e => setEditPassword(e.target.value)} placeholder="Leave blank to keep current" />
                  <div className="modal-hint">Only fill in if you want to change the password</div>
                </div>
              </div>
            </div>
            {editError && <p className="modal-error">{editError}</p>}
            {editSuccess && <p className="modal-success">{editSuccess}</p>}
            <div className="modal-footer">
              <button className="modal-cancel" onClick={closeEdit}>Cancel</button>
              <button className="modal-save" onClick={saveEdit} disabled={editLoading}>{editLoading ? 'Saving...' : 'Save changes'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Class assignment modal */}
      {assignUser && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) closeAssign() }}>
          <div className="assign-modal">
            <div className="modal-head">
              <div>
                <div className="modal-title">Assign Classes</div>
                <div className="modal-sub">{assignUser.full_name}</div>
              </div>
              <button className="modal-close" onClick={closeAssign}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="assign-body">
              {classes.length === 0 ? (
                <div style={{ textAlign:'center', color:'#CCC', fontSize:13, padding:20 }}>No classes found</div>
              ) : classes.map(cls => {
                const assigned = getAssignedClasses(assignUser.id).includes(cls.id)
                return (
                  <div key={cls.id} className={`class-row ${assigned ? 'assigned' : ''}`} onClick={() => toggleClass(assignUser.id, cls.id)}>
                    <span className="class-row-name">{cls.name}</span>
                    <div className="class-row-check">
                      {assigned && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                    </div>
                  </div>
                )
              })}
            </div>
            <div style={{ padding:'12px 20px', borderTop:'1px solid #F5F5F3', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontSize:12, color:'#AAA' }}>
                {assignSaving ? 'Saving...' : `${getAssignedClasses(assignUser.id).length} class${getAssignedClasses(assignUser.id).length !== 1 ? 'es' : ''} assigned`}
              </span>
              <button className="modal-save" onClick={closeAssign}>Done</button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}