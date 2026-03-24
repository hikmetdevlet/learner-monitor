'use client'
import { useEffect, useState } from 'react'
import { createClient } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

export default function CleaningAdmin() {
  const [locations, setLocations] = useState<any[]>([])
  const [learners, setLearners] = useState<any[]>([])
  const [activeLocation, setActiveLocation] = useState<any>(null)
  const [checklistItems, setChecklistItems] = useState<any[]>([])
  const [globalItems, setGlobalItems] = useState<any[]>([])
  const [assignments, setAssignments] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'checklist' | 'assign'>('checklist')
  const [allLocationData, setAllLocationData] = useState<any[]>([])
  const [editingLocation, setEditingLocation] = useState<any>(null)
  const [editLocName, setEditLocName] = useState('')
  const [editLocFloor, setEditLocFloor] = useState('')
  const [editLocDesc, setEditLocDesc] = useState('')

  const [newLocation, setNewLocation] = useState('')
  const [newLocationDesc, setNewLocationDesc] = useState('')
  const [newLocationFloor, setNewLocationFloor] = useState('')
  const [newQuestion, setNewQuestion] = useState('')
  const [newIsGlobal, setNewIsGlobal] = useState(false)
  const [selectedLearners, setSelectedLearners] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [showPrint, setShowPrint] = useState(false)
  const [printType, setPrintType] = useState<'instruction' | 'master'>('instruction')
  const [printTarget, setPrintTarget] = useState('all')

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const [{ data: locs }, { data: lrns }, { data: globals }] = await Promise.all([
      supabase.from('cleaning_locations').select('*').eq('is_active', true).order('floor').order('name'),
      supabase.from('learners').select('*').eq('is_active', true).order('full_name'),
      supabase.from('cleaning_checklist_items').select('*').eq('is_global', true).eq('is_active', true).order('order_num'),
    ])
    setLocations(locs || [])
    setLearners(lrns || [])
    setGlobalItems(globals || [])
    await loadAllLocationData(locs || [], globals || [])
  }

  async function loadAllLocationData(locs: any[], globals: any[]) {
    const result = []
    for (const loc of locs) {
      const [{ data: items }, { data: assigns }] = await Promise.all([
        supabase.from('cleaning_checklist_items').select('*').eq('location_id', loc.id).eq('is_active', true).order('order_num'),
        supabase.from('cleaning_assignments').select('*, learners(full_name)').eq('location_id', loc.id).eq('is_active', true),
      ])
      result.push({
        location: loc,
        items: [...(globals || []), ...(items || [])],
        assignments: assigns || [],
      })
    }
    setAllLocationData(result)
  }

  async function loadLocationDetails(loc: any) {
    setActiveLocation(loc)
    setActiveTab('checklist')
    const [{ data: items }, { data: assigns }] = await Promise.all([
      supabase.from('cleaning_checklist_items').select('*').eq('location_id', loc.id).eq('is_active', true).order('order_num'),
      supabase.from('cleaning_assignments').select('*, learners(id, full_name)').eq('location_id', loc.id).eq('is_active', true),
    ])
    setChecklistItems(items || [])
    setAssignments(assigns || [])
    setSelectedLearners(assigns?.map((a: any) => a.learner_id) || [])
  }

  async function addLocation() {
    if (!newLocation.trim()) return
    setSaving(true)
    await supabase.from('cleaning_locations').insert({
      name: newLocation.trim(),
      description: newLocationDesc.trim() || null,
      floor: newLocationFloor.trim() || null,
    })
    setNewLocation(''); setNewLocationDesc(''); setNewLocationFloor('')
    loadData()
    setSaving(false)
  }

  async function saveEditLocation() {
    if (!editingLocation || !editLocName.trim()) return
    setSaving(true)
    await supabase.from('cleaning_locations').update({
      name: editLocName.trim(),
      floor: editLocFloor.trim() || null,
      description: editLocDesc.trim() || null,
    }).eq('id', editingLocation.id)
    setEditingLocation(null)
    await loadData()
    if (activeLocation?.id === editingLocation.id) {
      setActiveLocation((prev: any) => ({ ...prev, name: editLocName.trim(), floor: editLocFloor.trim() || null, description: editLocDesc.trim() || null }))
    }
    setSaving(false)
  }

  async function deleteLocation(id: string) {
    if (!confirm('Delete this location?')) return
    await supabase.from('cleaning_locations').update({ is_active: false }).eq('id', id)
    loadData()
    if (activeLocation?.id === id) setActiveLocation(null)
  }

  async function addQuestion() {
    if (!newQuestion.trim()) return
    setSaving(true)
    if (newIsGlobal) {
      const maxOrder = globalItems.length > 0 ? Math.max(...globalItems.map(i => i.order_num)) : 0
      await supabase.from('cleaning_checklist_items').insert({ location_id: null, question: newQuestion.trim(), is_global: true, order_num: maxOrder + 1 })
    } else {
      if (!activeLocation) { setSaving(false); return }
      const maxOrder = checklistItems.length > 0 ? Math.max(...checklistItems.map(i => i.order_num)) : 0
      await supabase.from('cleaning_checklist_items').insert({ location_id: activeLocation.id, question: newQuestion.trim(), is_global: false, order_num: maxOrder + 1 })
    }
    setNewQuestion('')
    await loadData()
    if (activeLocation) await loadLocationDetails(activeLocation)
    setSaving(false)
  }

  async function deleteQuestion(id: string, isGlobal: boolean) {
    await supabase.from('cleaning_checklist_items').update({ is_active: false }).eq('id', id)
    await loadData()
    if (activeLocation && !isGlobal) await loadLocationDetails(activeLocation)
  }

  async function saveAssignments() {
    if (!activeLocation) return
    setSaving(true)
    await supabase.from('cleaning_assignments').update({ is_active: false }).eq('location_id', activeLocation.id)
    if (selectedLearners.length > 0) {
      await supabase.from('cleaning_assignments').insert(
        selectedLearners.map(lid => ({ location_id: activeLocation.id, learner_id: lid, assigned_date: new Date().toISOString().split('T')[0], is_active: true }))
      )
    }
    setSaving(false)
    await loadLocationDetails(activeLocation)
    await loadData()
  }

  function toggleLearner(id: string) {
    setSelectedLearners(prev => prev.includes(id) ? prev.filter(l => l !== id) : [...prev, id])
  }

  function doPrint() {
    setShowPrint(false)
    setTimeout(() => window.print(), 150)
  }

  const floors = [...new Set(locations.map(l => l.floor || 'No floor assigned'))].sort()
  const printInstructionData = printTarget === 'all' ? allLocationData : allLocationData.filter(d => d.location.id === printTarget)
  const combinedItems = activeLocation ? [...globalItems, ...checklistItems] : []

  return (
    <main style={{ minHeight: '100vh', background: '#F8F7F4', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&family=DM+Serif+Display&display=swap');
        * { box-sizing: border-box; }
        .topbar { background:#fff; border-bottom:1px solid #EFEFED; padding:0 32px; height:56px; display:flex; align-items:center; justify-content:space-between; position:sticky; top:0; z-index:10; }
        .topbar-left { display:flex; align-items:center; gap:12px; }
        .back-btn { display:flex; align-items:center; gap:6px; font-size:13px; color:#999; background:none; border:none; cursor:pointer; padding:6px 10px; border-radius:8px; transition:all 0.15s; font-family:'DM Sans',sans-serif; }
        .back-btn:hover { background:#F5F5F3; color:#333; }
        .page-title { font-size:15px; font-weight:500; color:#1A1A1A; }
        .divider-bar { color:#DDD; }
        .print-btn { display:flex; align-items:center; gap:6px; background:#F5F5F3; color:#444; border:none; border-radius:9px; padding:7px 14px; font-size:13px; font-weight:500; cursor:pointer; font-family:'DM Sans',sans-serif; transition:all 0.15s; }
        .print-btn:hover { background:#EBEBEB; }
        .wrap { max-width:1060px; margin:0 auto; padding:28px 32px; display:grid; grid-template-columns:300px 1fr; gap:20px; }
        .panel { background:#fff; border:1px solid #EFEFED; border-radius:14px; overflow:hidden; height:fit-content; }
        .panel-head { padding:14px 16px; border-bottom:1px solid #F5F5F3; display:flex; align-items:center; justify-content:space-between; }
        .panel-title { font-size:13px; font-weight:500; color:#1A1A1A; }
        .panel-count { font-size:11px; color:#AAA; background:#F5F5F3; padding:2px 7px; border-radius:8px; }
        .floor-label { padding:8px 16px 6px; font-size:10px; font-weight:500; color:#AAA; text-transform:uppercase; letter-spacing:0.06em; background:#FAFAF8; border-bottom:1px solid #F5F5F3; border-top:1px solid #F5F5F3; display:flex; align-items:center; gap:6px; }
        .loc-row { display:flex; align-items:center; justify-content:space-between; padding:10px 14px; border-bottom:1px solid #F8F8F6; cursor:pointer; transition:background 0.15s; }
        .loc-row:last-child { border-bottom:none; }
        .loc-row:hover { background:#FAFAF8; }
        .loc-row.active-loc { background:#F0F9FF; border-left:3px solid #0369A1; }
        .loc-name { font-size:13px; font-weight:500; color:#1A1A1A; }
        .loc-meta { font-size:10px; color:#AAA; margin-top:2px; display:flex; align-items:center; gap:6px; }
        .loc-floor-tag { font-size:10px; color:#0369A1; font-weight:500; }
        .loc-actions { display:flex; gap:4px; flex-shrink:0; }
        .icon-btn { width:26px; height:26px; border-radius:6px; border:1px solid #EFEFED; background:#fff; cursor:pointer; display:flex; align-items:center; justify-content:center; color:#CCC; transition:all 0.15s; }
        .icon-btn:hover { background:#FEF2F2; color:#DC2626; border-color:#FECACA; }
        .icon-btn.edit-icon:hover { background:#F0F9FF; color:#0369A1; border-color:#BFDBFE; }
        .add-loc-form { padding:12px 14px; border-top:1px solid #F5F5F3; display:flex; flex-direction:column; gap:7px; }
        .mini-input { width:100%; height:34px; border:1px solid #EFEFED; border-radius:8px; padding:0 10px; font-size:12px; font-family:'DM Sans',sans-serif; color:#1A1A1A; background:#fff; outline:none; }
        .mini-input:focus { border-color:#1A1A1A; }
        .mini-input::placeholder { color:#CCC; }
        .mini-btn { height:34px; background:#1A1A1A; color:white; border:none; border-radius:8px; padding:0 14px; font-size:12px; font-weight:500; cursor:pointer; font-family:'DM Sans',sans-serif; }
        .mini-btn:disabled { opacity:0.5; }
        .global-panel { background:#fff; border:1px solid #EFEFED; border-radius:14px; overflow:hidden; margin-bottom:16px; }
        .global-head { padding:12px 16px; border-bottom:1px solid #F5F5F3; background:#FAFAF8; display:flex; align-items:center; gap:8px; }
        .global-title { font-size:12px; font-weight:500; color:#7E22CE; }
        .global-badge { font-size:10px; background:#FDF4FF; color:#7E22CE; padding:2px 7px; border-radius:6px; margin-left:auto; }
        .global-item-row { display:flex; align-items:center; justify-content:space-between; padding:8px 16px; border-bottom:1px solid #F8F8F6; }
        .global-item-row:last-child { border-bottom:none; }
        .g-text { font-size:13px; color:#555; }
        .detail-panel { background:#fff; border:1px solid #EFEFED; border-radius:14px; overflow:hidden; }
        .detail-loc-header { padding:14px 20px; border-bottom:1px solid #F5F5F3; background:#FAFAF8; }
        .detail-loc-name { font-size:16px; font-weight:500; color:#1A1A1A; font-family:'DM Serif Display',serif; }
        .detail-loc-sub { font-size:12px; color:#AAA; margin-top:3px; display:flex; align-items:center; gap:12px; }
        .detail-tabs { display:flex; border-bottom:1px solid #EFEFED; }
        .detail-tab { flex:1; padding:12px; font-size:13px; font-weight:500; color:#999; background:none; border:none; border-bottom:2px solid transparent; cursor:pointer; font-family:'DM Sans',sans-serif; transition:all 0.15s; }
        .detail-tab.active { color:#1A1A1A; border-bottom-color:#1A1A1A; }
        .detail-body { padding:20px; }
        .section-label { font-size:10px; font-weight:500; color:#AAA; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:8px; margin-top:14px; display:flex; align-items:center; gap:6px; }
        .section-label:first-child { margin-top:0; }
        .question-row { display:flex; align-items:center; justify-content:space-between; padding:9px 12px; border-radius:9px; background:#FAFAF8; margin-bottom:6px; }
        .q-left { display:flex; align-items:center; gap:8px; flex:1; }
        .q-num { width:20px; height:20px; border-radius:5px; background:#F0F0EE; display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:500; color:#888; flex-shrink:0; }
        .q-num.gnum { background:#FDF4FF; color:#7E22CE; }
        .q-text { font-size:13px; color:#1A1A1A; flex:1; }
        .add-q-row { display:flex; gap:8px; margin-top:16px; padding-top:16px; border-top:1px solid #F5F5F3; flex-wrap:wrap; }
        .q-input { flex:1; min-width:180px; height:36px; border:1px solid #EFEFED; border-radius:8px; padding:0 10px; font-size:13px; font-family:'DM Sans',sans-serif; color:#1A1A1A; background:#fff; outline:none; }
        .q-input:focus { border-color:#1A1A1A; }
        .q-input::placeholder { color:#CCC; }
        .type-toggle { display:flex; border-radius:8px; overflow:hidden; border:1px solid #EFEFED; flex-shrink:0; height:36px; }
        .type-btn { padding:0 12px; font-size:11px; font-weight:500; cursor:pointer; font-family:'DM Sans',sans-serif; border:none; transition:all 0.15s; white-space:nowrap; height:36px; }
        .type-btn.active-type { background:#1A1A1A; color:white; }
        .type-btn:not(.active-type) { background:#fff; color:#AAA; }
        .add-q-btn { height:36px; background:#1A1A1A; color:white; border:none; border-radius:8px; padding:0 16px; font-size:13px; font-weight:500; cursor:pointer; font-family:'DM Sans',sans-serif; }
        .add-q-btn:disabled { opacity:0.5; }
        .assign-intro { font-size:12px; color:#AAA; margin-bottom:16px; }
        .current-row { display:flex; flex-wrap:wrap; gap:6px; padding:12px; background:#F8F8F6; border-radius:10px; margin-bottom:16px; }
        .assign-chip { font-size:11px; font-weight:500; background:#fff; border:1px solid #EFEFED; color:#555; padding:4px 10px; border-radius:8px; }
        .learner-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
        .learner-check { display:flex; align-items:center; gap:8px; padding:8px 10px; border-radius:9px; border:1px solid #EFEFED; cursor:pointer; transition:all 0.15s; }
        .learner-check:hover { border-color:#DDD; background:#FAFAF8; }
        .learner-check.selected { border-color:#1A1A1A; background:#F8F8F6; }
        .check-box { width:16px; height:16px; border-radius:4px; border:1.5px solid #DDD; display:flex; align-items:center; justify-content:center; flex-shrink:0; transition:all 0.15s; }
        .learner-check.selected .check-box { background:#1A1A1A; border-color:#1A1A1A; }
        .check-name { font-size:12px; font-weight:500; color:#1A1A1A; }
        .save-assign-btn { background:#1A1A1A; color:white; border:none; border-radius:9px; padding:10px 20px; font-size:13px; font-weight:500; cursor:pointer; font-family:'DM Sans',sans-serif; margin-top:16px; width:100%; }
        .save-assign-btn:disabled { opacity:0.5; }
        .empty-detail { padding:64px 20px; text-align:center; }
        .empty-icon { width:44px; height:44px; background:#F5F5F3; border-radius:12px; display:flex; align-items:center; justify-content:center; margin:0 auto 12px; color:#CCC; }
        .empty-title { font-size:14px; font-weight:500; color:#555; margin-bottom:4px; }
        .empty-sub { font-size:12px; color:#AAA; }
        .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.4); z-index:100; display:flex; align-items:center; justify-content:center; }
        .modal { background:#fff; border-radius:16px; padding:28px; width:440px; max-width:90vw; }
        .modal-title { font-size:15px; font-weight:500; color:#1A1A1A; margin-bottom:16px; }
        .modal-field { display:flex; flex-direction:column; gap:5px; margin-bottom:12px; }
        .modal-label { font-size:11px; font-weight:500; color:#888; text-transform:uppercase; letter-spacing:0.04em; }
        .modal-input { width:100%; height:40px; border:1px solid #EFEFED; border-radius:9px; padding:0 12px; font-size:13px; font-family:'DM Sans',sans-serif; color:#1A1A1A; background:#fff; outline:none; transition:border-color 0.15s; }
        .modal-input:focus { border-color:#1A1A1A; }
        .modal-input::placeholder { color:#CCC; }
        .modal-hint { font-size:11px; color:#AAA; margin-bottom:16px; }
        .modal-actions { display:flex; gap:8px; justify-content:flex-end; margin-top:4px; }
        .modal-primary-btn { background:#1A1A1A; color:white; border:none; border-radius:9px; padding:10px 20px; font-size:13px; font-weight:500; cursor:pointer; font-family:'DM Sans',sans-serif; display:flex; align-items:center; gap:6px; }
        .modal-primary-btn:disabled { opacity:0.5; }
        .modal-cancel-btn { background:#F5F5F3; color:#666; border:none; border-radius:9px; padding:10px 16px; font-size:13px; cursor:pointer; font-family:'DM Sans',sans-serif; }
        .print-type-tabs { display:flex; gap:6px; margin-bottom:16px; }
        .print-type-tab { flex:1; padding:10px; border-radius:9px; border:1px solid #EFEFED; background:#fff; font-size:13px; color:#666; cursor:pointer; font-family:'DM Sans',sans-serif; font-weight:500; text-align:center; transition:all 0.15s; }
        .print-type-tab.active { background:#1A1A1A; color:white; border-color:#1A1A1A; }
        .modal-select { width:100%; height:40px; border:1px solid #EFEFED; border-radius:9px; padding:0 12px; font-size:13px; font-family:'DM Sans',sans-serif; color:#1A1A1A; background:#fff; outline:none; margin-bottom:4px; }

        /* ===== PRINT ===== */
        @media screen { .print-area { display:none; } }
        @media print {
          * { box-sizing:border-box; }
          .topbar, .wrap, .modal-overlay { display:none !important; }
          .print-area { display:block !important; }
          body { background:white; font-family:'DM Sans',sans-serif; margin:0; padding:0; }
          .instr-page { page-break-after:always; padding:32px 36px; min-height:97vh; display:flex; flex-direction:column; }
          .instr-page:last-child { page-break-after:auto; }
          .instr-top { border-bottom:3px solid #1A1A1A; padding-bottom:16px; margin-bottom:24px; }
          .instr-floor-tag { font-size:11px; font-weight:500; color:#888; text-transform:uppercase; letter-spacing:0.08em; margin-bottom:6px; }
          .instr-loc-name { font-family:'DM Serif Display',serif; font-size:32px; color:#1A1A1A; line-height:1.1; }
          .instr-desc { font-size:14px; color:#888; margin-top:4px; }
          .instr-section-label { font-size:11px; font-weight:500; color:#AAA; text-transform:uppercase; letter-spacing:0.06em; margin-bottom:10px; }
          .instr-names { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:24px; }
          .instr-name-badge { font-size:14px; font-weight:500; background:#F5F5F3; padding:6px 14px; border-radius:8px; color:#1A1A1A; }
          .instr-task-list { list-style:none; padding:0; margin:0; }
          .instr-task-item { display:flex; align-items:flex-start; gap:12px; padding:12px 0; border-bottom:1px solid #F0F0EE; }
          .instr-task-item:last-child { border-bottom:none; }
          .instr-task-num { width:28px; height:28px; border-radius:8px; background:#1A1A1A; color:white; display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:500; flex-shrink:0; }
          .instr-task-text { font-size:16px; color:#1A1A1A; line-height:1.4; padding-top:4px; }
          .master-page { page-break-after:auto; padding:32px 36px; }
          .master-header { border-bottom:3px solid #1A1A1A; padding-bottom:14px; margin-bottom:24px; display:flex; align-items:flex-end; justify-content:space-between; }
          .master-title { font-family:'DM Serif Display',serif; font-size:26px; color:#1A1A1A; }
          .master-date { font-size:12px; color:#888; }
          .master-floor-group { margin-bottom:24px; }
          .master-floor-label { font-size:11px; font-weight:500; color:#555; text-transform:uppercase; letter-spacing:0.08em; padding:8px 0; border-bottom:2px solid #1A1A1A; margin-bottom:12px; }
          .master-table { width:100%; border-collapse:collapse; }
          .master-table th { background:#1A1A1A; color:white; padding:8px 12px; text-align:left; font-size:11px; font-weight:500; }
          .master-table td { border:1px solid #E5E5E5; padding:10px 12px; font-size:13px; vertical-align:top; }
          .master-table tr:nth-child(even) td { background:#FAFAFA; }
        }
      `}</style>

      {/* Edit location modal */}
      {editingLocation && (
        <div className="modal-overlay" onClick={() => setEditingLocation(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">Edit Location</div>
            <div className="modal-field">
              <label className="modal-label">Location name *</label>
              <input className="modal-input" value={editLocName} onChange={e => setEditLocName(e.target.value)} placeholder="Location name" autoFocus />
            </div>
            <div className="modal-field">
              <label className="modal-label">Floor</label>
              <input className="modal-input" value={editLocFloor} onChange={e => setEditLocFloor(e.target.value)} placeholder="e.g. Ground Floor, 1st Floor, 2nd Floor" />
            </div>
            <div className="modal-field">
              <label className="modal-label">Description (optional)</label>
              <input className="modal-input" value={editLocDesc} onChange={e => setEditLocDesc(e.target.value)} placeholder="Optional description" />
            </div>
            <div className="modal-actions">
              <button className="modal-cancel-btn" onClick={() => setEditingLocation(null)}>Cancel</button>
              <button className="modal-primary-btn" onClick={saveEditLocation} disabled={saving}>
                {saving ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print modal */}
      {showPrint && (
        <div className="modal-overlay" onClick={() => setShowPrint(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">Print</div>
            <div className="print-type-tabs">
              <button className={`print-type-tab ${printType === 'instruction' ? 'active' : ''}`} onClick={() => setPrintType('instruction')}>Instruction Sheet</button>
              <button className={`print-type-tab ${printType === 'master' ? 'active' : ''}`} onClick={() => setPrintType('master')}>Master List</button>
            </div>
            {printType === 'instruction' ? (
              <>
                <div className="modal-field">
                  <label className="modal-label">Select location</label>
                  <select className="modal-select" value={printTarget} onChange={e => setPrintTarget(e.target.value)}>
                    <option value="all">All locations (one page each)</option>
                    {locations.map(l => <option key={l.id} value={l.id}>{l.name}{l.floor ? ` — ${l.floor}` : ''}</option>)}
                  </select>
                </div>
                <p className="modal-hint">Each location on its own page with task list and assigned learners. Ready to hang on the wall.</p>
              </>
            ) : (
              <p className="modal-hint" style={{ marginTop: 8 }}>Master list of all locations grouped by floor showing assigned learners.</p>
            )}
            <div className="modal-actions">
              <button className="modal-cancel-btn" onClick={() => setShowPrint(false)}>Cancel</button>
              <button className="modal-primary-btn" onClick={doPrint}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                Print / PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print area */}
      <div className="print-area">
        {printType === 'instruction' ? (
          printInstructionData.map((d, idx) => (
            <div key={idx} className="instr-page">
              <div className="instr-top">
                {d.location.floor && <div className="instr-floor-tag">{d.location.floor}</div>}
                <div className="instr-loc-name">{d.location.name}</div>
                {d.location.description && <div className="instr-desc">{d.location.description}</div>}
              </div>
              {d.assignments.length > 0 && (
                <div>
                  <div className="instr-section-label">Responsible</div>
                  <div className="instr-names">
                    {d.assignments.map((a: any, i: number) => (
                      <span key={i} className="instr-name-badge">{a.learners?.full_name}</span>
                    ))}
                  </div>
                </div>
              )}
              {d.items.length > 0 && (
                <div>
                  <div className="instr-section-label">Daily tasks</div>
                  <ul className="instr-task-list">
                    {d.items.map((item: any, i: number) => (
                      <li key={`${d.location.id}-${item.id}-${i}`} className="instr-task-item">
                        <div className="instr-task-num">{i + 1}</div>
                        <div className="instr-task-text">{item.question}</div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="master-page">
            <div className="master-header">
              <div className="master-title">Cleaning Schedule</div>
              <div className="master-date">{new Date().toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
            </div>
            {floors.map(floor => {
              const floorData = allLocationData.filter(d => (d.location.floor || 'No floor assigned') === floor)
              if (floorData.length === 0) return null
              return (
                <div key={floor} className="master-floor-group">
                  <div className="master-floor-label">{floor}</div>
                  <table className="master-table">
                    <thead>
                      <tr>
                        <th style={{ width: 36 }}>#</th>
                        <th>Location</th>
                        <th>Assigned to</th>
                      </tr>
                    </thead>
                    <tbody>
                      {floorData.map((d, i) => (
                        <tr key={d.location.id}>
                          <td style={{ textAlign: 'center', color: '#888', fontSize: 12 }}>{i + 1}</td>
                          <td>
                            <div style={{ fontWeight: 500, color: '#1A1A1A' }}>{d.location.name}</div>
                            {d.location.description && <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{d.location.description}</div>}
                          </td>
                          <td style={{ fontSize: 13 }}>
                            {d.assignments.length > 0
                              ? d.assignments.map((a: any) => a.learners?.full_name).join(', ')
                              : <span style={{ color: '#CCC', fontSize: 11 }}>Not assigned</span>
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Topbar */}
      <div className="topbar">
        <div className="topbar-left">
          <button className="back-btn" onClick={() => router.push('/admin')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            Back
          </button>
          <span className="divider-bar">|</span>
          <span className="page-title">Cleaning Management</span>
        </div>
        <button className="print-btn" onClick={() => router.push('/admin/cleaning/report')} style={{ marginRight: 4 }}>
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
  Reports
</button>
        <button className="print-btn" onClick={() => setShowPrint(true)}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
          Print / PDF
        </button>
      </div>

      <div className="wrap">
        <div>
          {/* Global items */}
          {globalItems.length > 0 && (
            <div className="global-panel">
              <div className="global-head">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#7E22CE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                <span className="global-title">Global items</span>
                <span className="global-badge">All locations</span>
              </div>
              {globalItems.map(item => (
                <div key={item.id} className="global-item-row">
                  <span className="g-text">{item.question}</span>
                  <button className="icon-btn" onClick={() => deleteQuestion(item.id, true)}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Locations */}
          <div className="panel">
            <div className="panel-head">
              <span className="panel-title">Locations</span>
              <span className="panel-count">{locations.length}</span>
            </div>
            {floors.map(floor => {
              const floorLocs = locations.filter(l => (l.floor || 'No floor assigned') === floor)
              return (
                <div key={floor}>
                  <div className="floor-label">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/></svg>
                    {floor}
                  </div>
                  {floorLocs.map(loc => {
                    const locData = allLocationData.find(d => d.location.id === loc.id)
                    return (
                      <div key={loc.id} className={`loc-row ${activeLocation?.id === loc.id ? 'active-loc' : ''}`} onClick={() => loadLocationDetails(loc)}>
                        <div style={{ flex: 1 }}>
                          <div className="loc-name">{loc.name}</div>
                          <div className="loc-meta">
                            {locData ? `${locData.items.length} tasks · ${locData.assignments.length} assigned` : ''}
                          </div>
                        </div>
                        <div className="loc-actions" onClick={e => e.stopPropagation()}>
                          <button
                            className="icon-btn edit-icon"
                            onClick={() => { setEditingLocation(loc); setEditLocName(loc.name); setEditLocFloor(loc.floor || ''); setEditLocDesc(loc.description || '') }}
                          >
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          </button>
                          <button className="icon-btn" onClick={() => deleteLocation(loc.id)}>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })}
            <div className="add-loc-form">
              <input className="mini-input" value={newLocation} onChange={e => setNewLocation(e.target.value)} placeholder="Location name *" />
              <input className="mini-input" value={newLocationFloor} onChange={e => setNewLocationFloor(e.target.value)} placeholder="Floor (e.g. Ground Floor, 1st Floor)" />
              <input className="mini-input" value={newLocationDesc} onChange={e => setNewLocationDesc(e.target.value)} placeholder="Description (optional)" />
              <button className="mini-btn" onClick={addLocation} disabled={saving}>+ Add location</button>
            </div>
          </div>
        </div>

        {/* Right panel */}
        {!activeLocation ? (
          <div className="detail-panel">
            <div className="empty-detail">
              <div className="empty-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
              </div>
              <div className="empty-title">Select a location</div>
              <div className="empty-sub">Manage checklist and assignments</div>
            </div>
          </div>
        ) : (
          <div className="detail-panel">
            <div className="detail-loc-header">
              <div className="detail-loc-name">{activeLocation.name}</div>
              <div className="detail-loc-sub">
                {activeLocation.floor && <span style={{ color: '#0369A1', fontWeight: 500 }}>{activeLocation.floor}</span>}
                {activeLocation.description && <span>{activeLocation.description}</span>}
                <span style={{ color: '#CCC' }}>{combinedItems.length} tasks · {assignments.length} assigned</span>
              </div>
            </div>

            <div className="detail-tabs">
              {[
                { key: 'checklist', label: `Checklist (${combinedItems.length})` },
                { key: 'assign', label: `Assignments (${assignments.length})` },
              ].map(t => (
                <button key={t.key} className={`detail-tab ${activeTab === t.key ? 'active' : ''}`} onClick={() => setActiveTab(t.key as any)}>
                  {t.label}
                </button>
              ))}
            </div>

            {activeTab === 'checklist' && (
              <div className="detail-body">
                {globalItems.length > 0 && (
                  <>
                    <div className="section-label">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#7E22CE" strokeWidth="2"><circle cx="12" cy="12" r="10"/></svg>
                      Global items
                    </div>
                    {globalItems.map((item, i) => (
                      <div key={item.id} className="question-row">
                        <div className="q-left">
                          <div className="q-num gnum">{i + 1}</div>
                          <span className="q-text">{item.question}</span>
                        </div>
                      </div>
                    ))}
                  </>
                )}
                {checklistItems.length > 0 && (
                  <>
                    <div className="section-label" style={{ marginTop: globalItems.length > 0 ? 14 : 0 }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#0369A1" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
                      {activeLocation.name} specific
                    </div>
                    {checklistItems.map((item, i) => (
                      <div key={item.id} className="question-row">
                        <div className="q-left">
                          <div className="q-num">{globalItems.length + i + 1}</div>
                          <span className="q-text">{item.question}</span>
                        </div>
                        <button className="icon-btn" onClick={() => deleteQuestion(item.id, false)}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                        </button>
                      </div>
                    ))}
                  </>
                )}
                {combinedItems.length === 0 && (
                  <p style={{ fontSize: 13, color: '#CCC', marginBottom: 16 }}>No items yet. Add one below.</p>
                )}
                <div className="add-q-row">
                  <input className="q-input" value={newQuestion} onChange={e => setNewQuestion(e.target.value)} onKeyDown={e => e.key === 'Enter' && addQuestion()} placeholder="e.g. Süpürüldü mü?" />
                  <div className="type-toggle">
                    <button className={`type-btn ${!newIsGlobal ? 'active-type' : ''}`} onClick={() => setNewIsGlobal(false)}>This location</button>
                    <button className={`type-btn ${newIsGlobal ? 'active-type' : ''}`} onClick={() => setNewIsGlobal(true)}>Global</button>
                  </div>
                  <button className="add-q-btn" onClick={addQuestion} disabled={saving}>+ Add</button>
                </div>
              </div>
            )}

            {activeTab === 'assign' && (
              <div className="detail-body">
                <p className="assign-intro">Select learners responsible for <strong>{activeLocation.name}</strong>.</p>
                {assignments.length > 0 && (
                  <div>
                    <p style={{ fontSize: '11px', color: '#AAA', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Currently assigned</p>
                    <div className="current-row">
                      {assignments.map((a: any) => <span key={a.id} className="assign-chip">{a.learners?.full_name}</span>)}
                    </div>
                  </div>
                )}
                <p style={{ fontSize: '11px', color: '#AAA', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Select learners</p>
                <div className="learner-grid">
                  {learners.map(l => (
                    <div key={l.id} className={`learner-check ${selectedLearners.includes(l.id) ? 'selected' : ''}`} onClick={() => toggleLearner(l.id)}>
                      <div className="check-box">
                        {selectedLearners.includes(l.id) && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                      </div>
                      <span className="check-name">{l.full_name}</span>
                    </div>
                  ))}
                </div>
                <button className="save-assign-btn" onClick={saveAssignments} disabled={saving}>
                  {saving ? 'Saving...' : 'Save assignments'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}