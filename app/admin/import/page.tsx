'use client'
import { useEffect, useState } from 'react'
import { createClient } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

export default function BulkImport() {
  const [classes, setClasses] = useState<any[]>([])
  const [currSubjects, setCurrSubjects] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState('learners')
  const router = useRouter()
  const supabase = createClient()

  // Learners
  const [learnerText, setLearnerText] = useState('')
  const [islamicClassId, setIslamicClassId] = useState('')
  const [secularClassId, setSecularClassId] = useState('')
  const [learnerLoading, setLearnerLoading] = useState(false)
  const [learnerResult, setLearnerResult] = useState<any>(null)

  // Curriculum subjects
  const [currSubjectText, setCurrSubjectText] = useState('')
  const [currSubjectClassId, setCurrSubjectClassId] = useState('')
  const [currSubjectLoading, setCurrSubjectLoading] = useState(false)
  const [currSubjectResult, setCurrSubjectResult] = useState<any>(null)

  // Curriculum topics
  const [currTopicText, setCurrTopicText] = useState('')
  const [selectedCurrSubjectId, setSelectedCurrSubjectId] = useState('')
  const [currTopicLoading, setCurrTopicLoading] = useState(false)
  const [currTopicResult, setCurrTopicResult] = useState<any>(null)

  // Classes
  const [newClassName, setNewClassName] = useState('')
  const [newClassType, setNewClassType] = useState<'islamic' | 'secular'>('islamic')
  const [classLoading, setClassLoading] = useState(false)
  const [classResult, setClassResult] = useState<any>(null)
  const [classText, setClassText] = useState('')

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const [{ data: classData }, { data: subjData }] = await Promise.all([
      supabase.from('classes').select('*').order('class_type').order('name'),
      supabase.from('curriculum_subjects').select('*, classes(name, class_type)').eq('is_active', true).order('order_num'),
    ])
    setClasses(classData || [])
    setCurrSubjects(subjData || [])
    if (classData && classData.length > 0) {
      setCurrSubjectClassId(classData[0].id)
    }
    if (subjData && subjData.length > 0) {
      setSelectedCurrSubjectId(subjData[0].id)
    }
  }

  async function importLearners() {
    const names = learnerText.split('\n').map(n => n.trim()).filter(n => n.length > 0)
    if (names.length === 0) return
    setLearnerLoading(true)
    setLearnerResult(null)
    let success = 0, failed = 0
    const errors: string[] = []
    for (const name of names) {
      const { data: newLearner, error } = await supabase.from('learners')
        .insert({ full_name: name, join_date: new Date().toISOString().split('T')[0] })
        .select().single()
      if (error) { failed++; errors.push(name); continue }
      const inserts = []
      if (islamicClassId) inserts.push({ learner_id: newLearner.id, class_id: islamicClassId, class_type: 'islamic' })
      if (secularClassId) inserts.push({ learner_id: newLearner.id, class_id: secularClassId, class_type: 'secular' })
      if (inserts.length > 0) await supabase.from('learner_classes').insert(inserts)
      success++
    }
    setLearnerResult({ success, failed, errors })
    if (success > 0) setLearnerText('')
    setLearnerLoading(false)
  }

  async function importClasses() {
    const names = classText.split('\n').map(n => n.trim()).filter(n => n.length > 0)
    if (names.length === 0) return
    setClassLoading(true)
    setClassResult(null)
    let success = 0, failed = 0
    for (const name of names) {
      const { error } = await supabase.from('classes').insert({ name, class_type: newClassType })
      if (error) failed++
      else success++
    }
    setClassResult({ success, failed })
    if (success > 0) { setClassText(''); loadData() }
    setClassLoading(false)
  }

  async function importCurriculumSubjects() {
    const names = currSubjectText.split('\n').map(n => n.trim()).filter(n => n.length > 0)
    if (names.length === 0 || !currSubjectClassId) return
    setCurrSubjectLoading(true)
    setCurrSubjectResult(null)
    const cls = classes.find(c => c.id === currSubjectClassId)
    const existing = currSubjects.filter(s => s.class_id === currSubjectClassId)
    let success = 0, failed = 0
    for (let i = 0; i < names.length; i++) {
      const { error } = await supabase.from('curriculum_subjects').insert({
        name: names[i],
        class_id: currSubjectClassId,
        class_type: cls?.class_type || 'secular',
        order_num: existing.length + i + 1,
      })
      if (error) failed++
      else success++
    }
    setCurrSubjectResult({ success, failed })
    if (success > 0) { setCurrSubjectText(''); loadData() }
    setCurrSubjectLoading(false)
  }

  async function importCurriculumTopics() {
    if (!selectedCurrSubjectId) return
    const names = currTopicText.split('\n').map(n => n.trim()).filter(n => n.length > 0)
    if (names.length === 0) return
    setCurrTopicLoading(true)
    setCurrTopicResult(null)
    const { count } = await supabase.from('curriculum_topics')
      .select('*', { count: 'exact', head: true }).eq('subject_id', selectedCurrSubjectId)
    let success = 0, failed = 0
    for (let i = 0; i < names.length; i++) {
      const { error } = await supabase.from('curriculum_topics').insert({
        subject_id: selectedCurrSubjectId,
        title: names[i],
        order_num: (count || 0) + i + 1,
      })
      if (error) failed++
      else success++
    }
    setCurrTopicResult({ success, failed })
    if (success > 0) setCurrTopicText('')
    setCurrTopicLoading(false)
  }

  const islamicClasses = classes.filter(c => c.class_type === 'islamic')
  const secularClasses = classes.filter(c => c.class_type === 'secular')

  const tabs = [
    { key: 'learners', label: 'Learners', icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg> },
    { key: 'classes', label: 'Classes', icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg> },
    { key: 'subjects', label: 'Curriculum Subjects', icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg> },
    { key: 'topics', label: 'Curriculum Topics', icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/></svg> },
  ]

  return (
    <main style={{ minHeight: '100vh', background: '#F8F7F4', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&display=swap');
        * { box-sizing: border-box; }
        .topbar { background:#fff; border-bottom:1px solid #EFEFED; padding:0 32px; height:56px; display:flex; align-items:center; gap:12px; position:sticky; top:0; z-index:10; }
        .back-btn { display:flex; align-items:center; gap:6px; font-size:13px; color:#999; background:none; border:none; cursor:pointer; padding:6px 10px; border-radius:8px; font-family:'DM Sans',sans-serif; transition:all 0.15s; }
        .back-btn:hover { background:#F5F5F3; color:#333; }
        .page-title { font-size:15px; font-weight:500; color:#1A1A1A; }
        .divider { color:#DDD; }
        .layout { display:grid; grid-template-columns:220px 1fr; min-height:calc(100vh - 56px); }
        .sidebar { background:#fff; border-right:1px solid #EFEFED; padding:16px 0; }
        .sidebar-label { font-size:10px; font-weight:500; color:#AAA; text-transform:uppercase; letter-spacing:0.06em; padding:0 16px; margin-bottom:8px; }
        .nav-btn { width:100%; display:flex; align-items:center; gap:9px; padding:9px 16px; font-size:13px; font-weight:500; color:#666; background:none; border:none; cursor:pointer; font-family:'DM Sans',sans-serif; transition:all 0.15s; text-align:left; }
        .nav-btn:hover { background:#F5F5F3; color:#1A1A1A; }
        .nav-btn.active { background:#F0F9FF; color:#0369A1; }
        .nav-btn.active svg { stroke:#0369A1; }
        .main { padding:28px 32px; max-width:680px; }
        .section-title { font-size:15px; font-weight:500; color:#1A1A1A; margin-bottom:4px; }
        .section-desc { font-size:12px; color:#AAA; margin-bottom:20px; line-height:1.5; }
        .card { background:#fff; border:1px solid #EFEFED; border-radius:14px; padding:22px; margin-bottom:16px; }
        .field { display:flex; flex-direction:column; gap:5px; margin-bottom:14px; }
        .field-label { font-size:11px; font-weight:500; color:#888; text-transform:uppercase; letter-spacing:0.04em; }
        .textarea { width:100%; border:1px solid #EFEFED; border-radius:9px; padding:10px 12px; font-size:13px; font-family:'DM Sans',sans-serif; color:#1A1A1A; background:#fff; outline:none; resize:none; line-height:1.6; }
        .textarea:focus { border-color:#1A1A1A; }
        .textarea::placeholder { color:#CCC; }
        .select { width:100%; height:38px; border:1px solid #EFEFED; border-radius:9px; padding:0 12px; font-size:13px; font-family:'DM Sans',sans-serif; color:#1A1A1A; background:#fff; outline:none; }
        .select:focus { border-color:#1A1A1A; }
        .input { width:100%; height:38px; border:1px solid #EFEFED; border-radius:9px; padding:0 12px; font-size:13px; font-family:'DM Sans',sans-serif; color:#1A1A1A; background:#fff; outline:none; }
        .input:focus { border-color:#1A1A1A; }
        .input::placeholder { color:#CCC; }
        .grid2 { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:14px; }
        .import-footer { display:flex; align-items:center; justify-content:space-between; margin-top:4px; }
        .count-text { font-size:12px; color:#AAA; }
        .import-btn { background:#1A1A1A; color:white; border:none; border-radius:9px; padding:9px 20px; font-size:13px; font-weight:500; cursor:pointer; font-family:'DM Sans',sans-serif; display:flex; align-items:center; gap:6px; }
        .import-btn:disabled { opacity:0.5; cursor:not-allowed; }
        .result { margin-top:12px; padding:10px 14px; border-radius:8px; font-size:13px; }
        .result.success { background:#F0FDF4; color:#15803D; }
        .result.partial { background:#FEFCE8; color:#A16207; }
        .existing-list { margin-top:16px; padding-top:16px; border-top:1px solid #F5F5F3; }
        .existing-label { font-size:10px; font-weight:500; color:#AAA; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:8px; }
        .chip-wrap { display:flex; flex-wrap:wrap; gap:6px; }
        .chip { font-size:12px; padding:3px 10px; border-radius:8px; font-weight:500; }
        .chip-islamic { background:#F0FDF4; color:#15803D; border:1px solid #BBF7D0; }
        .chip-secular { background:#EFF6FF; color:#1D4ED8; border:1px solid #BFDBFE; }
        .chip-neutral { background:#F5F5F3; color:#555; border:1px solid #EFEFED; }
        .type-toggle { display:flex; border-radius:9px; overflow:hidden; border:1px solid #EFEFED; height:38px; }
        .type-btn { flex:1; font-size:13px; font-weight:500; cursor:pointer; font-family:'DM Sans',sans-serif; border:none; transition:all 0.15s; }
        .type-btn.active-islamic { background:#F0FDF4; color:#15803D; }
        .type-btn.active-secular { background:#EFF6FF; color:#1D4ED8; }
        .type-btn:not(.active-islamic):not(.active-secular) { background:#fff; color:#AAA; }
        .hint { font-size:11px; color:#AAA; margin-top:4px; line-height:1.5; }
        .subj-group-label { font-size:11px; font-weight:500; color:#888; padding:4px 0; margin-top:8px; }
      `}</style>

      <div className="topbar">
        <button className="back-btn" onClick={() => router.push('/admin')}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          Back
        </button>
        <span className="divider">|</span>
        <span className="page-title">⚡ Quick Import</span>
      </div>

      <div className="layout">
        {/* Sidebar nav */}
        <div className="sidebar">
          <div className="sidebar-label">Import type</div>
          {tabs.map(t => (
            <button key={t.key} className={`nav-btn ${activeTab === t.key ? 'active' : ''}`} onClick={() => setActiveTab(t.key)}>
              {t.icon}
              {t.label}
            </button>
          ))}

          <div style={{ borderTop: '1px solid #F5F5F3', margin: '16px 0' }} />
          <div className="sidebar-label">Quick links</div>
          <button className="nav-btn" onClick={() => router.push('/admin/curriculum')}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
            Curriculum
          </button>
          <button className="nav-btn" onClick={() => router.push('/admin/learners')}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
            Learners
          </button>
          <button className="nav-btn" onClick={() => router.push('/admin/classes')}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
            Classes
          </button>
        </div>

        {/* Main content */}
        <div className="main">

          {/* LEARNERS */}
          {activeTab === 'learners' && (
            <div>
              <div className="section-title">Bulk add learners</div>
              <div className="section-desc">Paste a list of names — one per line. Assign them to classes optionally. Profile details can be filled in later.</div>
              <div className="card">
                <div className="field">
                  <label className="field-label">Names (one per line) *</label>
                  <textarea className="textarea" rows={10} value={learnerText} onChange={e => setLearnerText(e.target.value)}
                    placeholder={'Ahmed Ali\nFatima Hassan\nMohamed Omar\nAisha Ibrahim'} />
                </div>
                <div className="grid2">
                  <div className="field" style={{ margin: 0 }}>
                    <label className="field-label">Islamic class (optional)</label>
                    <select className="select" value={islamicClassId} onChange={e => setIslamicClassId(e.target.value)}>
                      <option value="">— None —</option>
                      {islamicClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="field" style={{ margin: 0 }}>
                    <label className="field-label">Secular class (optional)</label>
                    <select className="select" value={secularClassId} onChange={e => setSecularClassId(e.target.value)}>
                      <option value="">— None —</option>
                      {secularClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="import-footer">
                  <span className="count-text">{learnerText.split('\n').filter(n => n.trim()).length} learners ready</span>
                  <button className="import-btn" onClick={importLearners} disabled={learnerLoading || !learnerText.trim()}>
                    {learnerLoading ? 'Importing...' : (
                      <>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>
                        Import Learners
                      </>
                    )}
                  </button>
                </div>
                {learnerResult && (
                  <div className={`result ${learnerResult.failed === 0 ? 'success' : 'partial'}`}>
                    ✅ {learnerResult.success} added
                    {learnerResult.failed > 0 && ` · ❌ ${learnerResult.failed} failed: ${learnerResult.errors.slice(0, 3).join(', ')}${learnerResult.errors.length > 3 ? '...' : ''}`}
                  </div>
                )}
              </div>

              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ background: '#fff', border: '1px solid #EFEFED', borderRadius: 12, padding: '14px 16px' }}>
                  <div style={{ fontSize: 22, fontWeight: 500, color: '#15803D' }}>{islamicClasses.reduce((a, _) => a, 0)} → {islamicClasses.length}</div>
                  <div style={{ fontSize: 11, color: '#AAA', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 3 }}>Islamic classes available</div>
                </div>
                <div style={{ background: '#fff', border: '1px solid #EFEFED', borderRadius: 12, padding: '14px 16px' }}>
                  <div style={{ fontSize: 22, fontWeight: 500, color: '#1D4ED8' }}>{secularClasses.length}</div>
                  <div style={{ fontSize: 11, color: '#AAA', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 3 }}>Secular classes available</div>
                </div>
              </div>
            </div>
          )}

          {/* CLASSES */}
          {activeTab === 'classes' && (
            <div>
              <div className="section-title">Bulk add classes</div>
              <div className="section-desc">Add multiple classes at once. Select the type first — Islamic or Secular. One class per line.</div>
              <div className="card">
                <div className="field">
                  <label className="field-label">Class type *</label>
                  <div className="type-toggle">
                    <button className={`type-btn ${newClassType === 'islamic' ? 'active-islamic' : ''}`} onClick={() => setNewClassType('islamic')}>
                      🕌 Islamic
                    </button>
                    <button className={`type-btn ${newClassType === 'secular' ? 'active-secular' : ''}`} onClick={() => setNewClassType('secular')}>
                      🏫 Secular
                    </button>
                  </div>
                </div>
                <div className="field">
                  <label className="field-label">Class names (one per line) *</label>
                  <textarea className="textarea" rows={8} value={classText} onChange={e => setClassText(e.target.value)}
                    placeholder={newClassType === 'islamic' ? 'Ibtidai A\nIbtidai B\nHifz Class\nHazirlik A' : 'Grade 8\nGrade 9\nGrade 10'} />
                </div>
                <div className="import-footer">
                  <span className="count-text">{classText.split('\n').filter(n => n.trim()).length} classes ready</span>
                  <button className="import-btn" onClick={importClasses} disabled={classLoading || !classText.trim()}>
                    {classLoading ? 'Adding...' : 'Add Classes'}
                  </button>
                </div>
                {classResult && (
                  <div className={`result ${classResult.failed === 0 ? 'success' : 'partial'}`}>
                    ✅ {classResult.success} classes added
                    {classResult.failed > 0 && ` · ❌ ${classResult.failed} failed`}
                  </div>
                )}

                {/* Existing */}
                {classes.length > 0 && (
                  <div className="existing-list">
                    <div className="existing-label">Existing classes ({classes.length})</div>
                    {islamicClasses.length > 0 && (
                      <>
                        <div className="subj-group-label">Islamic ({islamicClasses.length})</div>
                        <div className="chip-wrap" style={{ marginBottom: 8 }}>
                          {islamicClasses.map(c => <span key={c.id} className="chip chip-islamic">{c.name}</span>)}
                        </div>
                      </>
                    )}
                    {secularClasses.length > 0 && (
                      <>
                        <div className="subj-group-label">Secular ({secularClasses.length})</div>
                        <div className="chip-wrap">
                          {secularClasses.map(c => <span key={c.id} className="chip chip-secular">{c.name}</span>)}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* CURRICULUM SUBJECTS */}
          {activeTab === 'subjects' && (
            <div>
              <div className="section-title">Curriculum subjects</div>
              <div className="section-desc">Add subjects to a class curriculum. Subjects appear in Islamic Teacher's topic tracking and lesson planning. One per line.</div>
              <div className="card">
                <div className="field">
                  <label className="field-label">Class *</label>
                  <select className="select" value={currSubjectClassId} onChange={e => setCurrSubjectClassId(e.target.value)}>
                    <option value="">— Select class —</option>
                    {islamicClasses.length > 0 && <optgroup label="Islamic">
                      {islamicClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </optgroup>}
                    {secularClasses.length > 0 && <optgroup label="Secular">
                      {secularClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </optgroup>}
                  </select>
                  <p className="hint">Select the class this subject belongs to. Islamic classes → Quran, Ilmihal etc. Secular → Maths, English etc.</p>
                </div>
                <div className="field">
                  <label className="field-label">Subjects (one per line) *</label>
                  <textarea className="textarea" rows={8} value={currSubjectText} onChange={e => setCurrSubjectText(e.target.value)}
                    placeholder={'Kuran-ı Kerim\nİlmihal\nSiyer-i Nebi\nArapça'} />
                </div>
                <div className="import-footer">
                  <span className="count-text">{currSubjectText.split('\n').filter(n => n.trim()).length} subjects ready</span>
                  <button className="import-btn" onClick={importCurriculumSubjects} disabled={currSubjectLoading || !currSubjectText.trim() || !currSubjectClassId}>
                    {currSubjectLoading ? 'Importing...' : 'Import Subjects'}
                  </button>
                </div>
                {currSubjectResult && (
                  <div className={`result ${currSubjectResult.failed === 0 ? 'success' : 'partial'}`}>
                    ✅ {currSubjectResult.success} subjects added
                    {currSubjectResult.failed > 0 && ` · ❌ ${currSubjectResult.failed} failed`}
                  </div>
                )}

                {currSubjects.length > 0 && (
                  <div className="existing-list">
                    <div className="existing-label">Existing subjects ({currSubjects.length})</div>
                    {(['islamic', 'secular'] as const).map(type => {
                      const typeSubjects = currSubjects.filter(s => s.classes?.class_type === type)
                      if (typeSubjects.length === 0) return null
                      return (
                        <div key={type}>
                          <div className="subj-group-label">{type === 'islamic' ? 'Islamic' : 'Secular'} ({typeSubjects.length})</div>
                          <div className="chip-wrap" style={{ marginBottom: 8 }}>
                            {typeSubjects.map(s => (
                              <span key={s.id} className={`chip ${type === 'islamic' ? 'chip-islamic' : 'chip-secular'}`}>
                                {s.name} <span style={{ opacity: 0.6, fontSize: 10 }}>· {s.classes?.name}</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* CURRICULUM TOPICS */}
          {activeTab === 'topics' && (
            <div>
              <div className="section-title">Curriculum topics</div>
              <div className="section-desc">Add topics to a curriculum subject. These are the individual lessons or chapters. Topics with "Track per learner" enabled appear in Islamic Teacher's tracking.</div>
              <div className="card">
                <div className="field">
                  <label className="field-label">Subject *</label>
                  {currSubjects.length === 0 ? (
                    <div style={{ padding: '10px 12px', background: '#FEFCE8', border: '1px solid #FDE68A', borderRadius: 9, fontSize: 12, color: '#A16207' }}>
                      No subjects yet — add subjects first in the Curriculum Subjects tab
                    </div>
                  ) : (
                    <select className="select" value={selectedCurrSubjectId} onChange={e => setSelectedCurrSubjectId(e.target.value)}>
                      <option value="">— Select subject —</option>
                      {(['islamic', 'secular'] as const).map(type => {
                        const typeSubjects = currSubjects.filter(s => s.classes?.class_type === type)
                        if (typeSubjects.length === 0) return null
                        return (
                          <optgroup key={type} label={type === 'islamic' ? '🕌 Islamic' : '🏫 Secular'}>
                            {typeSubjects.map(s => (
                              <option key={s.id} value={s.id}>{s.name} — {s.classes?.name}</option>
                            ))}
                          </optgroup>
                        )
                      })}
                    </select>
                  )}
                </div>
                <div className="field">
                  <label className="field-label">Topics (one per line) *</label>
                  <textarea className="textarea" rows={12} value={currTopicText} onChange={e => setCurrTopicText(e.target.value)}
                    placeholder={'Fatiha Suresi\nBakara Suresi 1-5\nİhlas Suresi\nFelak Suresi\nNas Suresi'} />
                  <p className="hint">Topics will be added in order. After importing, go to Curriculum Management to enable "Track per learner" on specific topics.</p>
                </div>
                <div className="import-footer">
                  <span className="count-text">{currTopicText.split('\n').filter(n => n.trim()).length} topics ready</span>
                  <button className="import-btn" onClick={importCurriculumTopics} disabled={currTopicLoading || !currTopicText.trim() || !selectedCurrSubjectId}>
                    {currTopicLoading ? 'Importing...' : 'Import Topics'}
                  </button>
                </div>
                {currTopicResult && (
                  <div className={`result ${currTopicResult.failed === 0 ? 'success' : 'partial'}`}>
                    ✅ {currTopicResult.success} topics added
                    {currTopicResult.failed > 0 && ` · ❌ ${currTopicResult.failed} failed`}
                  </div>
                )}
              </div>

              {/* Tip */}
              <div style={{ background: '#F0F9FF', border: '1px solid #BFDBFE', borderRadius: 12, padding: '14px 16px', fontSize: 12, color: '#1D4ED8', display: 'flex', gap: 10 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <div>
                  <strong>After importing:</strong> Go to <button onClick={() => router.push('/admin/curriculum')} style={{ background: 'none', border: 'none', color: '#1D4ED8', cursor: 'pointer', textDecoration: 'underline', fontFamily: "'DM Sans',sans-serif", fontSize: 12, padding: 0 }}>Curriculum Management</button> to enable "Track per learner" on specific topics. Only tracked topics appear in Islamic Teacher's progress grid.
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </main>
  )
}