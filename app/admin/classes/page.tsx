'use client'
import { useEffect, useState } from 'react'
import { createClient } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

export default function ManageClasses() {
  const [classes, setClasses] = useState<any[]>([])
  const [classTypes, setClassTypes] = useState<any[]>([])
  const [newClassName, setNewClassName] = useState('')
  const [newClassType, setNewClassType] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Class type management
  const [showTypeForm, setShowTypeForm] = useState(false)
  const [newTypeName, setNewTypeName] = useState('')
  const [newTypeLabel, setNewTypeLabel] = useState('')
  const [newTypeColor, setNewTypeColor] = useState('#888888')
  const [typeLoading, setTypeLoading] = useState(false)
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null)
  const [editingTypeLabel, setEditingTypeLabel] = useState('')
  const [editingTypeColor, setEditingTypeColor] = useState('')

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const [{ data: typeData }, { data: classData }] = await Promise.all([
      supabase.from('class_types').select('*').eq('is_active', true).order('order_num'),
      supabase.from('classes').select('*').order('name'),
    ])
    const types = typeData || []
    setClassTypes(types)
    if (types.length > 0 && !newClassType) setNewClassType(types[0].name)

    const enriched = await Promise.all((classData || []).map(async (c) => {
      const [{ count: learnerCount }, { count: sessionCount }] = await Promise.all([
        supabase.from('learner_classes').select('*', { count: 'exact', head: true }).eq('class_id', c.id),
        supabase.from('timetable').select('*', { count: 'exact', head: true }).eq('class_id', c.id),
      ])
      const type = types.find(t => t.name === c.class_type)
      return { ...c, learner_count: learnerCount || 0, session_count: sessionCount || 0, typeInfo: type }
    }))
    setClasses(enriched)
  }

  async function addClass() {
    if (!newClassName.trim() || !newClassType) return
    setLoading(true)
    setError('')
    const { error } = await supabase.from('classes').insert({ name: newClassName.trim(), class_type: newClassType })
    if (error) setError(error.message)
    else { setNewClassName(''); loadData() }
    setLoading(false)
  }

  async function renameClass(id: string) {
    if (!editingName.trim()) return
    await supabase.from('classes').update({ name: editingName.trim() }).eq('id', id)
    setEditingId(null)
    loadData()
  }

  async function deleteClass(id: string) {
    if (!confirm('Delete this class? Learners will be unassigned.')) return
    await supabase.from('classes').delete().eq('id', id)
    loadData()
  }

  async function addClassType() {
    if (!newTypeName.trim() || !newTypeLabel.trim()) return
    setTypeLoading(true)
    const name = newTypeName.trim().toLowerCase().replace(/\s+/g, '_')
    const maxOrder = classTypes.length > 0 ? Math.max(...classTypes.map(t => t.order_num)) : 0
    const { error } = await supabase.from('class_types').insert({
      name, label: newTypeLabel.trim(), color: newTypeColor, order_num: maxOrder + 1,
    })
    if (!error) {
      setNewTypeName(''); setNewTypeLabel(''); setNewTypeColor('#888888')
      setShowTypeForm(false)
      loadData()
    }
    setTypeLoading(false)
  }

  async function saveTypeEdit(id: string) {
    await supabase.from('class_types').update({ label: editingTypeLabel, color: editingTypeColor }).eq('id', id)
    setEditingTypeId(null)
    loadData()
  }

  async function deleteClassType(id: string, name: string) {
    const used = classes.filter(c => c.class_type === name).length
    if (used > 0) {
      alert(`Cannot delete — ${used} class(es) are using this type. Change their type first.`)
      return
    }
    if (!confirm('Delete this class type?')) return
    await supabase.from('class_types').update({ is_active: false }).eq('id', id)
    loadData()
  }

  // Group classes by type
  const grouped = classTypes.map(type => ({
    type,
    list: classes.filter(c => c.class_type === type.name),
  }))

  // Classes with unknown types
  const knownTypeNames = classTypes.map(t => t.name)
  const ungrouped = classes.filter(c => !knownTypeNames.includes(c.class_type))

  return (
    <main style={{ minHeight: '100vh', background: '#F8F7F4', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&family=DM+Serif+Display&display=swap');
        * { box-sizing: border-box; }
        .topbar { background:#fff; border-bottom:1px solid #EFEFED; padding:0 32px; height:56px; display:flex; align-items:center; justify-content:space-between; position:sticky; top:0; z-index:10; }
        .topbar-left { display:flex; align-items:center; gap:12px; }
        .back-btn { display:flex; align-items:center; gap:6px; font-size:13px; color:#999; background:none; border:none; cursor:pointer; padding:6px 10px; border-radius:8px; font-family:'DM Sans',sans-serif; }
        .back-btn:hover { background:#F5F5F3; color:#333; }
        .page-title { font-size:15px; font-weight:500; color:#1A1A1A; }
        .divider { color:#DDD; }
        .wrap { max-width:800px; margin:0 auto; padding:28px 32px; }
        .section { margin-bottom:28px; }
        .section-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; }
        .section-title { font-size:11px; font-weight:500; color:#AAA; text-transform:uppercase; letter-spacing:0.06em; display:flex; align-items:center; gap:8px; }
        .count-badge { background:#F5F5F3; color:#888; font-size:10px; padding:2px 7px; border-radius:8px; }
        .add-type-btn { display:flex; align-items:center; gap:5px; font-size:12px; font-weight:500; color:#555; background:#F5F5F3; border:1px solid #EFEFED; border-radius:8px; padding:5px 10px; cursor:pointer; font-family:'DM Sans',sans-serif; transition:all 0.15s; }
        .add-type-btn:hover { background:#EBEBEB; }
        .add-class-card { background:#fff; border:1px solid #EFEFED; border-radius:14px; padding:18px; margin-bottom:20px; }
        .add-class-title { font-size:13px; font-weight:500; color:#1A1A1A; margin-bottom:12px; }
        .form-row { display:flex; gap:8px; flex-wrap:wrap; }
        .form-input { flex:1; min-width:160px; height:38px; border:1px solid #EFEFED; border-radius:9px; padding:0 12px; font-size:13px; font-family:'DM Sans',sans-serif; color:#1A1A1A; background:#fff; outline:none; }
        .form-input:focus { border-color:#1A1A1A; }
        .form-input::placeholder { color:#CCC; }
        .form-select { height:38px; border:1px solid #EFEFED; border-radius:9px; padding:0 12px; font-size:13px; font-family:'DM Sans',sans-serif; color:#1A1A1A; background:#fff; outline:none; min-width:140px; }
        .form-select:focus { border-color:#1A1A1A; }
        .add-btn { height:38px; background:#1A1A1A; color:white; border:none; border-radius:9px; padding:0 18px; font-size:13px; font-weight:500; cursor:pointer; font-family:'DM Sans',sans-serif; flex-shrink:0; }
        .add-btn:disabled { opacity:0.5; }
        .error-msg { font-size:12px; color:#DC2626; margin-top:8px; }
        .type-group { margin-bottom:20px; }
        .type-header { display:flex; align-items:center; justify-content:space-between; padding:8px 0; margin-bottom:8px; border-bottom:2px solid; }
        .type-label { font-size:12px; font-weight:500; display:flex; align-items:center; gap:8px; }
        .type-dot { width:10px; height:10px; border-radius:50%; flex-shrink:0; }
        .type-actions { display:flex; gap:6px; }
        .type-action-btn { font-size:11px; padding:3px 8px; border-radius:6px; border:1px solid #EFEFED; background:#fff; cursor:pointer; font-family:'DM Sans',sans-serif; color:#666; transition:all 0.15s; }
        .type-action-btn:hover { background:#F5F5F3; }
        .type-action-btn.del:hover { background:#FEF2F2; color:#DC2626; border-color:#FECACA; }
        .classes-card { background:#fff; border:1px solid #EFEFED; border-radius:12px; overflow:hidden; }
        .class-row { display:flex; align-items:center; justify-content:space-between; padding:12px 16px; border-bottom:1px solid #F8F8F6; transition:background 0.15s; }
        .class-row:last-child { border-bottom:none; }
        .class-row:hover { background:#FAFAF8; }
        .class-name { font-size:13px; font-weight:500; color:#1A1A1A; cursor:pointer; }
        .class-name:hover { color:#0369A1; }
        .class-meta { font-size:11px; color:#AAA; margin-top:2px; display:flex; gap:10px; }
        .class-actions { display:flex; gap:6px; align-items:center; }
        .action-btn { font-size:11px; padding:4px 9px; border-radius:7px; border:1px solid #EFEFED; background:#fff; cursor:pointer; font-family:'DM Sans',sans-serif; color:#666; transition:all 0.15s; }
        .action-btn:hover { background:#F5F5F3; }
        .action-btn.del:hover { background:#FEF2F2; color:#DC2626; border-color:#FECACA; }
        .edit-row { display:flex; gap:8px; align-items:center; padding:8px 16px; background:#F8F8F6; border-bottom:1px solid #F0F0EE; }
        .edit-input { flex:1; height:32px; border:1px solid #DDD; border-radius:7px; padding:0 10px; font-size:12px; font-family:'DM Sans',sans-serif; color:#1A1A1A; background:#fff; outline:none; }
        .edit-input:focus { border-color:#1A1A1A; }
        .save-edit-btn { background:#1A1A1A; color:white; border:none; border-radius:7px; padding:5px 12px; font-size:12px; font-weight:500; cursor:pointer; font-family:'DM Sans',sans-serif; }
        .cancel-edit-btn { background:#F5F5F3; color:#666; border:none; border-radius:7px; padding:5px 10px; font-size:12px; cursor:pointer; font-family:'DM Sans',sans-serif; }
        .empty-class { padding:20px 16px; text-align:center; color:#CCC; font-size:13px; }
        .type-form { background:#F8F8F6; border:1px solid #EFEFED; border-radius:12px; padding:16px; margin-bottom:20px; }
        .type-form-title { font-size:12px; font-weight:500; color:#555; margin-bottom:12px; }
        .color-input { width:40px; height:38px; border:1px solid #EFEFED; border-radius:9px; padding:3px; cursor:pointer; background:#fff; }
        .type-edit-row { display:flex; gap:8px; align-items:center; background:#F8F8F6; padding:8px 0; border-radius:8px; }
        .type-label-input { height:32px; border:1px solid #DDD; border-radius:7px; padding:0 10px; font-size:12px; font-family:'DM Sans',sans-serif; color:#1A1A1A; background:#fff; outline:none; min-width:120px; }
        .stats-summary { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin-bottom:24px; }
        .stat-card { background:#fff; border:1px solid #EFEFED; border-radius:12px; padding:14px; text-align:center; }
        .stat-n { font-size:22px; font-weight:500; }
        .stat-l { font-size:10px; color:#AAA; margin-top:3px; text-transform:uppercase; letter-spacing:0.04em; }
      `}</style>

      <div className="topbar">
        <div className="topbar-left">
          <button className="back-btn" onClick={() => router.push('/admin')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            Back
          </button>
          <span className="divider">|</span>
          <span className="page-title">Manage Classes</span>
        </div>
        <button className="add-type-btn" onClick={() => setShowTypeForm(f => !f)}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          {showTypeForm ? 'Cancel' : 'New category'}
        </button>
      </div>

      <div className="wrap">

        {/* Stats */}
        <div className="stats-summary">
          <div className="stat-card">
            <div className="stat-n" style={{ color: '#1A1A1A' }}>{classes.length}</div>
            <div className="stat-l">Total classes</div>
          </div>
          <div className="stat-card">
            <div className="stat-n" style={{ color: '#1A1A1A' }}>{classTypes.length}</div>
            <div className="stat-l">Categories</div>
          </div>
          <div className="stat-card">
            <div className="stat-n" style={{ color: '#1A1A1A' }}>{classes.reduce((a, c) => a + (c.learner_count || 0), 0)}</div>
            <div className="stat-l">Total enrollments</div>
          </div>
        </div>

        {/* New category form */}
        {showTypeForm && (
          <div className="type-form">
            <div className="type-form-title">Add new class category</div>
            <div className="form-row">
              <input className="form-input" value={newTypeLabel} onChange={e => setNewTypeLabel(e.target.value)} placeholder="Label (e.g. Certificate)" />
              <input className="form-input" style={{ maxWidth: 160 }} value={newTypeName} onChange={e => setNewTypeName(e.target.value)} placeholder="ID (e.g. certificate)" />
              <input type="color" className="color-input" value={newTypeColor} onChange={e => setNewTypeColor(e.target.value)} title="Pick color" />
              <button className="add-btn" onClick={addClassType} disabled={typeLoading || !newTypeName.trim() || !newTypeLabel.trim()}>
                {typeLoading ? 'Adding...' : '+ Add'}
              </button>
            </div>
            <p style={{ fontSize: 11, color: '#AAA', marginTop: 8 }}>ID: lowercase, no spaces (e.g. <code>certificate</code>, <code>hifz</code>). Label is what users see.</p>
          </div>
        )}

        {/* Add class */}
        <div className="add-class-card">
          <div className="add-class-title">Add new class</div>
          <div className="form-row">
            <input className="form-input" value={newClassName} onChange={e => setNewClassName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addClass()} placeholder="Class name (e.g. Ibtidai A, Grade 8)" />
            <select className="form-select" value={newClassType} onChange={e => setNewClassType(e.target.value)}>
              {classTypes.map(t => <option key={t.id} value={t.name}>{t.label}</option>)}
            </select>
            <button className="add-btn" onClick={addClass} disabled={loading || !newClassName.trim()}>
              {loading ? 'Adding...' : '+ Add'}
            </button>
          </div>
          {error && <p className="error-msg">{error}</p>}
        </div>

        {/* Classes grouped by type */}
        {grouped.map(({ type, list }) => (
          <div key={type.id} className="type-group">
            <div className="type-header" style={{ borderColor: type.color + '40' }}>
              <div className="type-label" style={{ color: type.color }}>
                <div className="type-dot" style={{ background: type.color }} />
                {editingTypeId === type.id ? (
                  <div className="type-edit-row">
                    <input className="type-label-input" value={editingTypeLabel} onChange={e => setEditingTypeLabel(e.target.value)} autoFocus />
                    <input type="color" className="color-input" style={{ width: 32, height: 32 }} value={editingTypeColor} onChange={e => setEditingTypeColor(e.target.value)} />
                    <button className="save-edit-btn" onClick={() => saveTypeEdit(type.id)}>Save</button>
                    <button className="cancel-edit-btn" onClick={() => setEditingTypeId(null)}>Cancel</button>
                  </div>
                ) : (
                  <>
                    {type.label}
                    <span className="count-badge">{list.length}</span>
                  </>
                )}
              </div>
              {editingTypeId !== type.id && (
                <div className="type-actions">
                  <button className="type-action-btn" onClick={() => { setEditingTypeId(type.id); setEditingTypeLabel(type.label); setEditingTypeColor(type.color) }}>
                    Edit label
                  </button>
                  <button className="type-action-btn del" onClick={() => deleteClassType(type.id, type.name)}>
                    Delete
                  </button>
                </div>
              )}
            </div>

            <div className="classes-card">
              {list.length === 0 ? (
                <div className="empty-class">No {type.label} classes yet</div>
              ) : (
                list.map(c => (
                  <div key={c.id}>
                    <div className="class-row">
                      <div style={{ flex: 1 }}>
                        <div className="class-name" onClick={() => router.push(`/admin/classes/${c.id}`)}>{c.name}</div>
                        <div className="class-meta">
                          <span>{c.learner_count} learners</span>
                          <span>{c.session_count} sessions</span>
                        </div>
                      </div>
                      <div className="class-actions">
                        <button className="action-btn" onClick={() => router.push(`/admin/classes/${c.id}`)}>Overview</button>
                        <button className="action-btn" onClick={() => { setEditingId(c.id); setEditingName(c.name) }}>Rename</button>
                        <button className="action-btn del" onClick={() => deleteClass(c.id)}>Delete</button>
                      </div>
                    </div>
                    {editingId === c.id && (
                      <div className="edit-row">
                        <input className="edit-input" value={editingName} onChange={e => setEditingName(e.target.value)} onKeyDown={e => e.key === 'Enter' && renameClass(c.id)} placeholder="New name..." autoFocus />
                        <button className="save-edit-btn" onClick={() => renameClass(c.id)}>Save</button>
                        <button className="cancel-edit-btn" onClick={() => setEditingId(null)}>Cancel</button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        ))}

        {/* Ungrouped */}
        {ungrouped.length > 0 && (
          <div className="type-group">
            <div className="type-header" style={{ borderColor: '#EFEFED' }}>
              <div className="type-label" style={{ color: '#AAA' }}>
                <div className="type-dot" style={{ background: '#DDD' }} />
                Uncategorized
                <span className="count-badge">{ungrouped.length}</span>
              </div>
            </div>
            <div className="classes-card">
              {ungrouped.map(c => (
                <div key={c.id} className="class-row">
                  <div style={{ flex: 1 }}>
                    <div className="class-name" onClick={() => router.push(`/admin/classes/${c.id}`)}>{c.name}</div>
                    <div className="class-meta"><span>{c.learner_count} learners</span></div>
                  </div>
                  <div className="class-actions">
                    <button className="action-btn" onClick={() => router.push(`/admin/classes/${c.id}`)}>Overview</button>
                    <button className="action-btn del" onClick={() => deleteClass(c.id)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}