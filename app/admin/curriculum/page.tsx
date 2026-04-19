'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function CurriculumAdmin() {
  const [classes, setClasses]           = useState<any[]>([])
  const [subjects, setSubjects]         = useState<any[]>([])
  const [topics, setTopics]             = useState<any[]>([])
  const [materials, setMaterials]       = useState<any[]>([])
  const [terms, setTerms]               = useState<any[]>([])
  const [topicTerms, setTopicTerms]     = useState<any[]>([])
  const [progressData, setProgressData] = useState<any[]>([])
  const [lessonPlans, setLessonPlans]   = useState<any[]>([])
  const [allTeachers, setAllTeachers]   = useState<any[]>([])
  const [lpFilter, setLpFilter]         = useState<'all' | 'submitted' | 'missing'>('all')
  const [lpTeacherFilter, setLpTeacherFilter] = useState<string | null>(null)

  const [activeClass,   setActiveClass]   = useState<any>(null)
  const [activeSubject, setActiveSubject] = useState<any>(null)
  const [activeTopic,   setActiveTopic]   = useState<any>(null)  // parent topic (for materials tab)
  const [activeSubtopic, setActiveSubtopic] = useState<any>(null) // subtopic (for materials tab)
  const [activeTerm,    setActiveTerm]    = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'subjects' | 'topics' | 'materials' | 'terms' | 'lessonplans'>('subjects')
  const [view, setView] = useState<'list' | 'progress'>('list')

  // ── Per-topic subtopics map: topicId → subtopic[] ──────────────────────────
  const [subtopicsMap, setSubtopicsMap] = useState<Record<string, any[]>>({})

  // ── Subtopic form state ────────────────────────────────────────────────────
  const [showSubtopicForm, setShowSubtopicForm] = useState<string | null>(null) // topicId
  const [stTitle, setStTitle] = useState('')
  const [stDesc,  setStDesc]  = useState('')
  const [stStart, setStStart] = useState('')
  const [stEnd,   setStEnd]   = useState('')

  // ── Edit state ─────────────────────────────────────────────────────────────
  const [editingTopic,    setEditingTopic]    = useState<string | null>(null) // id
  const [editTopicTitle,  setEditTopicTitle]  = useState('')
  const [editTopicDesc,   setEditTopicDesc]   = useState('')
  const [editingSubtopic, setEditingSubtopic] = useState<string | null>(null)
  const [editStTitle,     setEditStTitle]     = useState('')
  const [editStDesc,      setEditStDesc]      = useState('')

  // ── Date edit state ────────────────────────────────────────────────────────
  const [editingTopicDates, setEditingTopicDates] = useState<string | null>(null)
  const [editStart, setEditStart] = useState('')
  const [editEnd,   setEditEnd]   = useState('')

  // ── Add form state ─────────────────────────────────────────────────────────
  const [newSubject,       setNewSubject]       = useState('')
  const [newSubjectOrder,  setNewSubjectOrder]  = useState('1')
  const [newTopic,         setNewTopic]         = useState('')
  const [newTopicDesc,     setNewTopicDesc]     = useState('')
  const [newTopicTrack,    setNewTopicTrack]    = useState(false)
  const [newTopicStart,    setNewTopicStart]    = useState('')
  const [newTopicEnd,      setNewTopicEnd]      = useState('')
  const [newMaterialTitle, setNewMaterialTitle] = useState('')
  const [newMaterialType,  setNewMaterialType]  = useState('link')
  const [newMaterialUrl,   setNewMaterialUrl]   = useState('')
  const [newMaterialContent, setNewMaterialContent] = useState('')
  const [newTermName,  setNewTermName]  = useState('')
  const [newTermStart, setNewTermStart] = useState('')
  const [newTermEnd,   setNewTermEnd]   = useState('')

  const [saving, setSaving] = useState(false)

  const router   = useRouter()
  const supabase = createClient()

  useEffect(() => { loadClasses(); loadAllTeachers() }, [])

  async function loadAllTeachers() {
    const { data } = await supabase.from('users').select('id,full_name,display_name').eq('role', 'teacher').order('full_name')
    setAllTeachers(data || [])
  }
  async function loadClasses() {
    const { data } = await supabase.from('classes').select('*').order('class_type').order('name')
    setClasses(data || [])
  }
  async function selectClass(cls: any) {
    setActiveClass(cls); setActiveSubject(null); setActiveTopic(null); setActiveSubtopic(null)
    setActiveTerm(null); setActiveTab('subjects'); setView('list'); setSubtopicsMap({})
    loadSubjects(cls.id); loadTerms(cls.id)
  }
  async function loadSubjects(classId: string) {
    const { data } = await supabase.from('curriculum_subjects').select('*').eq('class_id', classId).eq('is_active', true).order('order_num')
    setSubjects(data || [])
  }
  async function loadTerms(classId: string) {
    const { data } = await supabase.from('curriculum_terms').select('*').eq('class_id', classId).eq('is_active', true).order('order_num')
    setTerms(data || [])
  }
  async function selectSubject(subject: any) {
    setActiveSubject(subject); setActiveTopic(null); setActiveSubtopic(null)
    setActiveTab('topics'); setView('list'); setSubtopicsMap({})
    await loadTopics(subject.id)
  }

  // ── Load topics AND their subtopics in one go ──────────────────────────────
  async function loadTopics(subjectId: string) {
    const { data: parentTopics } = await supabase
      .from('curriculum_topics').select('*')
      .eq('subject_id', subjectId).eq('is_active', true).is('parent_topic_id', null).order('order_num')
    setTopics(parentTopics || [])
    if (parentTopics?.length) {
      loadTopicTerms(parentTopics.map((t: any) => t.id))
      // Load ALL subtopics for ALL parent topics in one bulk query
      const parentIds = parentTopics.map((t: any) => t.id)
      const { data: allSubs } = await supabase
        .from('curriculum_topics').select('*')
        .in('parent_topic_id', parentIds).eq('is_active', true).order('order_num')
      // Group into map
      const map: Record<string, any[]> = {}
      parentIds.forEach((id: string) => { map[id] = [] })
      ;(allSubs || []).forEach((s: any) => {
        if (map[s.parent_topic_id]) map[s.parent_topic_id].push(s)
      })
      setSubtopicsMap(map)
    }
  }

  async function loadTopicTerms(topicIds: string[]) {
    const { data } = await supabase.from('curriculum_topic_terms').select('*').in('topic_id', topicIds)
    setTopicTerms(data || [])
  }

  // ── Select topic or subtopic for materials ─────────────────────────────────
  function openTopicMaterials(t: any) {
    setActiveTopic(t); setActiveSubtopic(null)
    setActiveTab('materials')
    loadMaterials(t.id)
  }
  function openSubtopicMaterials(st: any, parentTopic: any) {
    setActiveTopic(parentTopic); setActiveSubtopic(st)
    setActiveTab('materials')
    loadMaterials(st.id)
  }

  async function loadMaterials(topicId: string) {
    const { data } = await supabase.from('curriculum_materials').select('*').eq('topic_id', topicId).order('order_num')
    setMaterials(data || [])
  }
  async function loadProgress(subjectId: string) {
    const topicIds = topics.map(t => t.id)
    if (!topicIds.length) return
    const { data } = await supabase.from('curriculum_progress')
      .select('*, users(full_name,display_name), curriculum_terms(name)').in('topic_id', topicIds)
    setProgressData(data || [])
  }
  async function loadLessonPlans() {
    if (!activeClass) return
    const subIds = subjects.map(s => s.id)
    if (!subIds.length) return
    const { data: topData } = await supabase.from('curriculum_topics')
      .select('id,title,subject_id,planned_start,planned_end').in('subject_id', subIds).eq('is_active', true).is('parent_topic_id', null)
    if (!topData?.length) return
    const topIds = topData.map(t => t.id)
    const { data: lps } = await supabase.from('lesson_plans').select('*, users(full_name,display_name)').in('topic_id', topIds)
    setLessonPlans(lps || [])
    setTopics(topData)
  }

  // ── TERMS ──────────────────────────────────────────────────────────────────
  async function addTerm() {
    if (!newTermName.trim() || !activeClass) return
    setSaving(true)
    const maxOrder = terms.length > 0 ? Math.max(...terms.map(t => t.order_num)) : 0
    await supabase.from('curriculum_terms').insert({ class_id: activeClass.id, name: newTermName.trim(), order_num: maxOrder + 1, start_date: newTermStart || null, end_date: newTermEnd || null })
    setNewTermName(''); setNewTermStart(''); setNewTermEnd('')
    loadTerms(activeClass.id); setSaving(false)
  }
  async function deleteTerm(id: string) {
    if (!confirm('Delete this term?')) return
    await supabase.from('curriculum_terms').update({ is_active: false }).eq('id', id)
    if (activeTerm?.id === id) setActiveTerm(null)
    loadTerms(activeClass.id)
  }
  async function toggleTopicTerm(topicId: string, termId: string) {
    const exists = topicTerms.find(tt => tt.topic_id === topicId && tt.term_id === termId)
    if (exists) await supabase.from('curriculum_topic_terms').delete().eq('id', exists.id)
    else await supabase.from('curriculum_topic_terms').insert({ topic_id: topicId, term_id: termId })
    loadTopicTerms(topics.map(t => t.id))
  }

  // ── SUBJECTS ───────────────────────────────────────────────────────────────
  async function addSubject() {
    if (!newSubject.trim() || !activeClass) return
    setSaving(true)
    await supabase.from('curriculum_subjects').insert({ name: newSubject.trim(), class_id: activeClass.id, class_type: activeClass.class_type, order_num: parseInt(newSubjectOrder) || subjects.length + 1 })
    setNewSubject(''); setNewSubjectOrder('1')
    loadSubjects(activeClass.id); setSaving(false)
  }
  async function deleteSubject(id: string) {
    if (!confirm('Delete this subject and all its topics?')) return
    await supabase.from('curriculum_subjects').update({ is_active: false }).eq('id', id)
    loadSubjects(activeClass.id)
    if (activeSubject?.id === id) { setActiveSubject(null); setActiveTab('subjects') }
  }

  // ── TOPICS ─────────────────────────────────────────────────────────────────
  async function addTopic() {
    if (!newTopic.trim() || !activeSubject) return
    setSaving(true)
    const maxOrder = topics.length > 0 ? Math.max(...topics.map(t => t.order_num)) : 0
    await supabase.from('curriculum_topics').insert({ subject_id: activeSubject.id, title: newTopic.trim(), description: newTopicDesc.trim() || null, order_num: maxOrder + 1, track_per_learner: newTopicTrack, planned_start: newTopicStart || null, planned_end: newTopicEnd || null, parent_topic_id: null })
    setNewTopic(''); setNewTopicDesc(''); setNewTopicTrack(false); setNewTopicStart(''); setNewTopicEnd('')
    loadTopics(activeSubject.id); setSaving(false)
  }

  async function saveTopic(id: string) {
    await supabase.from('curriculum_topics').update({ title: editTopicTitle.trim(), description: editTopicDesc.trim() || null }).eq('id', id)
    setEditingTopic(null)
    loadTopics(activeSubject.id)
  }

  async function addSubtopic(parentId: string) {
    if (!stTitle.trim() || !activeSubject) return
    setSaving(true)
    const { data } = await supabase.from('curriculum_topics').insert({
      subject_id: activeSubject.id, parent_topic_id: parentId,
      title: stTitle.trim(), description: stDesc.trim() || null,
      planned_start: stStart || null, planned_end: stEnd || null,
      order_num: (subtopicsMap[parentId]?.length ?? 0) + 1,
    }).select().single()
    if (data) {
      setSubtopicsMap(prev => ({ ...prev, [parentId]: [...(prev[parentId] || []), data] }))
    }
    setStTitle(''); setStDesc(''); setStStart(''); setStEnd('')
    setShowSubtopicForm(null); setSaving(false)
  }

  async function saveSubtopic(id: string, parentId: string) {
    await supabase.from('curriculum_topics').update({ title: editStTitle.trim(), description: editStDesc.trim() || null }).eq('id', id)
    setEditingSubtopic(null)
    // Refresh subtopics for this parent
    const { data } = await supabase.from('curriculum_topics').select('*').eq('parent_topic_id', parentId).eq('is_active', true).order('order_num')
    setSubtopicsMap(prev => ({ ...prev, [parentId]: data || [] }))
  }

  async function deleteSubtopic(id: string, parentId: string) {
    if (!confirm('Delete this subtopic?')) return
    await supabase.from('curriculum_topics').update({ is_active: false }).eq('id', id)
    setSubtopicsMap(prev => ({ ...prev, [parentId]: (prev[parentId] || []).filter((s: any) => s.id !== id) }))
  }

  async function toggleTrackPerLearner(topic: any) {
    await supabase.from('curriculum_topics').update({ track_per_learner: !topic.track_per_learner }).eq('id', topic.id)
    loadTopics(activeSubject.id)
  }
  async function saveTopicDates(topicId: string) {
    await supabase.from('curriculum_topics').update({ planned_start: editStart || null, planned_end: editEnd || null }).eq('id', topicId)
    setEditingTopicDates(null)
    loadTopics(activeSubject.id)
  }
  async function deleteTopic(id: string) {
    if (!confirm('Delete this topic?')) return
    await supabase.from('curriculum_topics').update({ is_active: false }).eq('id', id)
    loadTopics(activeSubject.id)
    if (activeTopic?.id === id) { setActiveTopic(null); setActiveTab('topics') }
  }

  // ── MATERIALS ──────────────────────────────────────────────────────────────
  // The current material target: activeSubtopic if set, else activeTopic
  const materialTargetId = activeSubtopic?.id ?? activeTopic?.id

  async function addMaterial() {
    if (!newMaterialTitle.trim() || !materialTargetId) return
    setSaving(true)
    const maxOrder = materials.length > 0 ? Math.max(...materials.map(m => m.order_num)) : 0
    await supabase.from('curriculum_materials').insert({ topic_id: materialTargetId, title: newMaterialTitle.trim(), type: newMaterialType, url: newMaterialUrl.trim() || null, content: newMaterialContent.trim() || null, order_num: maxOrder + 1 })
    setNewMaterialTitle(''); setNewMaterialUrl(''); setNewMaterialContent('')
    loadMaterials(materialTargetId); setSaving(false)
  }
  async function deleteMaterial(id: string) {
    await supabase.from('curriculum_materials').delete().eq('id', id)
    loadMaterials(materialTargetId!)
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  function getWeekLabel(topic: any) {
    if (!topic.planned_start) return null
    const start = new Date(topic.planned_start), end = topic.planned_end ? new Date(topic.planned_end) : null
    const now = new Date()
    const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay() + 1)
    const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 6)
    if (start <= weekEnd && (!end || end >= weekStart)) return 'this-week'
    if (start < weekStart) return 'overdue'
    return 'upcoming'
  }
  function fmtDate(d: string) {
    if (!d) return ''
    return new Date(d).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })
  }

  const lpStats = (() => {
    const total = topics.length
    const submitted = topics.filter(t => lessonPlans.find(lp => lp.topic_id === t.id && lp.status === 'submitted')).length
    const draft = topics.filter(t => lessonPlans.find(lp => lp.topic_id === t.id && lp.status === 'draft')).length
    const missing = total - submitted - draft
    return { total, submitted, draft, missing, pct: total > 0 ? Math.round(submitted / total * 100) : 0 }
  })()

  const lpTopics = topics.filter(t => {
    const lp = lessonPlans.find(x => x.topic_id === t.id)
    if (lpFilter === 'submitted') return lp?.status === 'submitted'
    if (lpFilter === 'missing') return !lp || lp.status === 'draft'
    return true
  }).filter(t => !lpTeacherFilter || lessonPlans.find(x => x.topic_id === t.id)?.teacher_id === lpTeacherFilter)

  const islamicClasses = classes.filter(c => c.class_type === 'islamic')
  const secularClasses = classes.filter(c => c.class_type === 'secular')

  const MATERIAL_ICONS: Record<string, any> = {
    video: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>,
    pdf:   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
    link:  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
    note:  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  }
  const MATERIAL_COLORS: Record<string, { bg: string; color: string }> = {
    video: { bg: '#FEF2F2', color: '#DC2626' }, pdf: { bg: '#EFF6FF', color: '#1D4ED8' },
    link:  { bg: '#F0FDF4', color: '#15803D' }, note: { bg: '#FDF4FF', color: '#7E22CE' },
  }
  const UNDERSTANDING_CFG: Record<string, { bg: string; color: string; label: string }> = {
    good:      { bg: '#F0FDF4', color: '#15803D', label: 'Understood well' },
    mixed:     { bg: '#FEFCE8', color: '#A16207', label: 'Mixed' },
    difficult: { bg: '#FEF2F2', color: '#DC2626', label: 'Had difficulty' },
  }

  return (
    <main style={{ minHeight: '100vh', background: '#F8F7F4', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&family=DM+Serif+Display&display=swap');
        * { box-sizing: border-box; }
        .topbar { background:#fff; border-bottom:1px solid #EFEFED; padding:0 32px; height:56px; display:flex; align-items:center; justify-content:space-between; position:sticky; top:0; z-index:20; }
        .back-btn { display:flex; align-items:center; gap:6px; font-size:13px; color:#999; background:none; border:none; cursor:pointer; padding:6px 10px; border-radius:8px; font-family:'DM Sans',sans-serif; }
        .back-btn:hover { background:#F5F5F3; color:#333; }
        .page-title { font-size:15px; font-weight:500; color:#1A1A1A; }
        .layout { display:grid; grid-template-columns:260px 1fr; height:calc(100vh - 56px); }
        .sidebar { background:#fff; border-right:1px solid #EFEFED; overflow-y:auto; }
        .sidebar-head { padding:16px; border-bottom:1px solid #EFEFED; }
        .sidebar-title { font-size:11px; font-weight:500; color:#AAA; text-transform:uppercase; letter-spacing:.06em; }
        .class-group-label { padding:10px 16px 6px; font-size:10px; font-weight:500; color:#AAA; text-transform:uppercase; letter-spacing:.06em; background:#FAFAF8; border-top:1px solid #F5F5F3; }
        .class-row { display:flex; align-items:center; justify-content:space-between; padding:9px 16px; cursor:pointer; border-bottom:1px solid #F8F8F6; }
        .class-row:hover { background:#FAFAF8; }
        .class-row.active { background:#F0F9FF; border-left:3px solid #0369A1; }
        .class-name { font-size:13px; font-weight:500; color:#1A1A1A; }
        .class-meta { font-size:10px; color:#AAA; margin-top:1px; }
        .main { overflow-y:auto; padding:24px; }
        .breadcrumb { display:flex; align-items:center; gap:6px; margin-bottom:20px; font-size:12px; color:#AAA; flex-wrap:wrap; }
        .breadcrumb-item { cursor:pointer; }
        .breadcrumb-item:hover { color:#1A1A1A; }
        .breadcrumb-item.active { color:#1A1A1A; font-weight:500; }
        .tabs { display:flex; gap:6px; margin-bottom:20px; flex-wrap:wrap; }
        .tab { padding:7px 16px; border-radius:9px; border:1px solid #EFEFED; background:#fff; font-size:13px; color:#666; cursor:pointer; font-family:'DM Sans',sans-serif; font-weight:500; }
        .tab.active { background:#1A1A1A; color:white; border-color:#1A1A1A; }
        .tab.terms-tab.active { background:#0369A1; border-color:#0369A1; }
        .tab.lp-tab.active { background:#7E22CE; border-color:#7E22CE; }
        .item-card { background:#fff; border:1px solid #EFEFED; border-radius:12px; overflow:hidden; margin-bottom:12px; }
        .item-card.tracked { border-color:#E9D5FF; }
        .item-card.completed { border-color:#BBF7D0; }
        .item-card.this-week { border-color:#93C5FD; }
        .item-card.overdue-card { border-color:#FCA5A5; }
        .item-head { display:flex; align-items:center; justify-content:space-between; padding:12px 16px; gap:10px; }
        .item-head:hover { background:#FAFAF8; }
        .item-title { font-size:13px; font-weight:500; color:#1A1A1A; display:flex; align-items:center; gap:8px; flex:1; flex-wrap:wrap; }
        .item-sub { font-size:11px; color:#AAA; margin-top:2px; }
        .item-actions { display:flex; gap:4px; align-items:center; flex-shrink:0; flex-wrap:wrap; }
        .icon-btn { width:26px; height:26px; border-radius:6px; border:1px solid #EFEFED; background:#fff; cursor:pointer; display:flex; align-items:center; justify-content:center; color:#CCC; }
        .icon-btn:hover { background:#FEF2F2; color:#DC2626; border-color:#FECACA; }
        .icon-btn.edit:hover { background:#EFF6FF; color:#0369A1; border-color:#BFDBFE; }
        .open-btn { display:flex; align-items:center; gap:4px; font-size:11px; font-weight:500; background:#F0F9FF; color:#0369A1; border:1px solid #BFDBFE; border-radius:7px; padding:4px 10px; cursor:pointer; font-family:'DM Sans',sans-serif; white-space:nowrap; }
        .open-btn.green { background:#F0FDF4; color:#15803D; border-color:#BBF7D0; }
        .open-btn:hover { opacity:.8; }
        .track-toggle { display:flex; align-items:center; gap:5px; font-size:11px; font-weight:500; padding:4px 10px; border-radius:7px; border:1px solid #EFEFED; cursor:pointer; font-family:'DM Sans',sans-serif; white-space:nowrap; }
        .track-toggle.on { background:#FDF4FF; color:#7E22CE; border-color:#E9D5FF; }
        .track-toggle.off { background:#F5F5F3; color:#AAA; }
        .order-badge { font-size:10px; background:#F5F5F3; color:#888; padding:2px 6px; border-radius:5px; font-weight:500; flex-shrink:0; }
        .per-learner-badge { font-size:10px; background:#FDF4FF; color:#7E22CE; border:1px solid #E9D5FF; padding:1px 7px; border-radius:6px; font-weight:500; }
        .done-badge { font-size:10px; background:#F0FDF4; color:#15803D; border:1px solid #BBF7D0; padding:1px 7px; border-radius:6px; font-weight:500; display:flex; align-items:center; gap:3px; }
        .date-range-badge { display:inline-flex; align-items:center; gap:5px; font-size:11px; font-weight:500; padding:3px 8px; border-radius:6px; cursor:pointer; border:1px dashed #DDD; color:#AAA; background:#FAFAF8; white-space:nowrap; }
        .date-range-badge:hover { border-color:#0369A1; color:#0369A1; background:#EFF6FF; }
        .date-range-badge.has-date { border-style:solid; border-color:#BFDBFE; background:#EFF6FF; color:#0369A1; }
        .date-range-badge.this-week-badge { border-color:#22D3EE; background:#ECFEFF; color:#0E7490; }
        .date-range-badge.overdue-badge { border-color:#FCA5A5; background:#FEF2F2; color:#DC2626; }
        .date-edit-row { display:flex; align-items:center; gap:6px; padding:8px 16px 12px; flex-wrap:wrap; background:#FAFAF8; border-top:1px solid #F0F0EE; }
        .date-input-sm { height:30px; border:1px solid #EFEFED; border-radius:7px; padding:0 8px; font-size:12px; font-family:'DM Sans',sans-serif; color:#1A1A1A; background:#fff; outline:none; }
        .date-input-sm:focus { border-color:#0369A1; }
        .date-save-btn { height:30px; background:#0369A1; color:#fff; border:none; border-radius:7px; padding:0 12px; font-size:12px; font-weight:500; cursor:pointer; font-family:'DM Sans',sans-serif; }
        .date-cancel-btn { height:30px; background:#F5F5F3; color:#666; border:none; border-radius:7px; padding:0 10px; font-size:12px; cursor:pointer; font-family:'DM Sans',sans-serif; }
        .add-form { background:#fff; border:1px solid #EFEFED; border-radius:12px; padding:16px; margin-bottom:12px; }
        .add-form-title { font-size:12px; font-weight:500; color:#1A1A1A; margin-bottom:12px; }
        .form-row { display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
        .form-input { flex:1; min-width:150px; height:36px; border:1px solid #EFEFED; border-radius:8px; padding:0 10px; font-size:13px; font-family:'DM Sans',sans-serif; color:#1A1A1A; background:#fff; outline:none; }
        .form-input:focus { border-color:#1A1A1A; }
        .form-input::placeholder { color:#CCC; }
        .form-input-sm { width:130px; min-width:unset; flex:none; }
        .form-select { height:36px; border:1px solid #EFEFED; border-radius:8px; padding:0 10px; font-size:13px; font-family:'DM Sans',sans-serif; color:#1A1A1A; background:#fff; outline:none; }
        .add-btn { height:36px; background:#1A1A1A; color:white; border:none; border-radius:8px; padding:0 16px; font-size:13px; font-weight:500; cursor:pointer; font-family:'DM Sans',sans-serif; flex-shrink:0; }
        .add-btn:disabled { opacity:.5; }
        .track-checkbox-row { display:flex; align-items:center; gap:8px; margin-top:8px; font-size:12px; color:#666; cursor:pointer; }
        .track-checkbox-row input { accent-color:#7E22CE; width:15px; height:15px; cursor:pointer; }
        .term-card { background:#fff; border:1px solid #EFEFED; border-radius:12px; padding:14px 16px; margin-bottom:10px; display:flex; align-items:center; justify-content:space-between; gap:10px; }
        .topic-terms-row { display:flex; gap:6px; flex-wrap:wrap; padding:0 16px 12px; }
        .term-assign-pill { font-size:11px; font-weight:500; padding:3px 10px; border-radius:6px; border:1px solid #EFEFED; cursor:pointer; font-family:'DM Sans',sans-serif; background:#fff; color:#AAA; }
        .term-assign-pill.assigned { background:#0369A1; color:#fff; border-color:#0369A1; }
        .term-filter { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:16px; align-items:center; }
        .term-filter-pill { font-size:11px; font-weight:500; padding:4px 12px; border-radius:7px; border:1px solid #EFEFED; cursor:pointer; font-family:'DM Sans',sans-serif; background:#fff; color:#666; }
        .term-filter-pill.active { background:#0369A1; color:#fff; border-color:#0369A1; }
        .material-row { display:flex; align-items:center; justify-content:space-between; padding:10px 16px; border-bottom:1px solid #F8F8F6; }
        .material-row:last-child { border-bottom:none; }
        .material-icon { width:28px; height:28px; border-radius:7px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .material-title { font-size:13px; font-weight:500; color:#1A1A1A; }
        .material-url { font-size:11px; color:#0369A1; margin-top:1px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:300px; }
        .progress-table { background:#fff; border:1px solid #EFEFED; border-radius:12px; overflow:hidden; }
        .progress-table-head { display:grid; grid-template-columns:1fr 120px 90px 80px; padding:8px 16px; background:#FAFAF8; border-bottom:1px solid #EFEFED; }
        .th { font-size:10px; font-weight:500; color:#AAA; text-transform:uppercase; letter-spacing:.05em; }
        .progress-row { display:grid; grid-template-columns:1fr 120px 90px 80px; padding:10px 16px; border-bottom:1px solid #F8F8F6; align-items:center; }
        .understanding-badge { font-size:10px; font-weight:500; padding:3px 8px; border-radius:8px; }
        .stats-row { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-bottom:20px; }
        .stat-mini { background:#fff; border:1px solid #EFEFED; border-radius:12px; padding:14px; text-align:center; }
        .stat-n { font-size:22px; font-weight:500; color:#1A1A1A; }
        .stat-l { font-size:10px; color:#AAA; margin-top:3px; text-transform:uppercase; letter-spacing:.04em; }
        .empty-block { background:#fff; border:1px solid #EFEFED; border-radius:12px; padding:40px; text-align:center; color:#CCC; font-size:13px; }

        /* Subtopics */
        .subtopic-section { background:#FAFAF8; border-top:1px solid #F0F0EE; padding:10px 16px 12px; }
        .subtopic-section-title { font-size:10px; font-weight:700; color:#AAA; text-transform:uppercase; letter-spacing:.05em; margin-bottom:8px; }
        .subtopic-item { display:flex; align-items:center; gap:8px; padding:7px 10px; background:#fff; border:1px solid #EFEFED; border-radius:7px; margin-bottom:5px; }
        .st-dot { width:6px; height:6px; border-radius:50%; background:#D1D5DB; flex-shrink:0; }
        .st-title { font-size:12px; font-weight:500; color:#1A1A1A; flex:1; }
        .st-meta { font-size:10px; color:#AAA; }
        .st-add-btn { display:flex; align-items:center; gap:4px; font-size:11px; color:#AAA; background:none; border:1px dashed #DDD; border-radius:6px; padding:4px 10px; cursor:pointer; font-family:'DM Sans',sans-serif; }
        .st-add-btn:hover { color:#1A1A1A; border-color:#AAA; }
        .st-form { background:#F0F9FF; border:1px solid #BFDBFE; border-radius:8px; padding:10px 12px; margin-top:6px; }
        .st-fin { height:32px; border:1px solid #EFEFED; border-radius:6px; padding:0 8px; font-size:12px; font-family:'DM Sans',sans-serif; color:#1A1A1A; background:#fff; outline:none; }
        .st-fin:focus { border-color:#0369A1; }

        /* Edit inline */
        .edit-inline { background:#EFF6FF; border:1px solid #BFDBFE; border-radius:8px; padding:8px 10px; margin:0 16px 10px; display:flex; gap:6px; align-items:center; flex-wrap:wrap; }
        .edit-inline input { flex:1; min-width:120px; height:30px; border:1px solid #BFDBFE; border-radius:6px; padding:0 8px; font-size:12px; font-family:'DM Sans',sans-serif; color:#1A1A1A; background:#fff; outline:none; }
        .edit-inline input:focus { border-color:#0369A1; }

        /* Lesson plans */
        .lp-stats { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-bottom:20px; }
        .lp-stat { background:#fff; border:1px solid #EFEFED; border-radius:12px; padding:14px; text-align:center; }
        .lp-stat.submitted { border-color:#BBF7D0; background:#F0FDF4; }
        .lp-stat.draft { border-color:#FDE68A; background:#FEFCE8; }
        .lp-stat.missing { border-color:#FCA5A5; background:#FEF2F2; }
        .lp-n { font-size:24px; font-weight:500; }
        .lp-l { font-size:10px; color:#AAA; margin-top:3px; text-transform:uppercase; letter-spacing:.04em; }
        .lp-pbar-wrap { background:#FAFAF8; border:1px solid #EFEFED; border-radius:10px; padding:12px 16px; margin-bottom:16px; }
        .lp-filters { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:16px; align-items:center; }
        .lp-filter-pill { font-size:11px; font-weight:500; padding:4px 12px; border-radius:7px; border:1px solid #EFEFED; cursor:pointer; font-family:'DM Sans',sans-serif; background:#fff; color:#666; }
        .lp-filter-pill.on { background:#7E22CE; color:#fff; border-color:#7E22CE; }
        .lp-filter-pill.all.on { background:#1A1A1A; border-color:#1A1A1A; }
        .lp-filter-pill.missing.on { background:#DC2626; border-color:#DC2626; }
        .lp-row { background:#fff; border:1px solid #EFEFED; border-radius:10px; padding:12px 16px; margin-bottom:8px; }
        .lp-row.submitted { border-left:3px solid #16A34A; }
        .lp-row.draft { border-left:3px solid #EAB308; }
        .lp-row.missing { border-left:3px solid #EF4444; }
        .lp-status-badge { font-size:9px; font-weight:800; padding:2px 8px; border-radius:5px; flex-shrink:0; }
        @media (max-width:768px) {
          .layout { grid-template-columns:1fr; }
          .sidebar { height:auto; border-right:none; border-bottom:1px solid #EFEFED; }
          .stats-row,.lp-stats { grid-template-columns:1fr 1fr; }
          .topbar { padding:0 16px; }
          .main { padding:16px; }
        }
      `}</style>

      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="back-btn" onClick={() => router.back()}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>Back
          </button>
          <span style={{ color: '#DDD' }}>|</span>
          <span className="page-title">Curriculum Management</span>
        </div>
      </div>

      <div className="layout">
        {/* ── Sidebar ── */}
        <div className="sidebar">
          <div className="sidebar-head"><div className="sidebar-title">Select class</div></div>
          {islamicClasses.length > 0 && (
            <div>
              <div className="class-group-label">Islamic</div>
              {islamicClasses.map(cls => (
                <div key={cls.id} className={`class-row ${activeClass?.id === cls.id ? 'active' : ''}`} onClick={() => selectClass(cls)}>
                  <div><div className="class-name">{cls.name}</div><div className="class-meta">Islamic education</div></div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#AAA" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                </div>
              ))}
            </div>
          )}
          {secularClasses.length > 0 && (
            <div>
              <div className="class-group-label">Secular</div>
              {secularClasses.map(cls => (
                <div key={cls.id} className={`class-row ${activeClass?.id === cls.id ? 'active' : ''}`} onClick={() => selectClass(cls)}>
                  <div><div className="class-name">{cls.name}</div><div className="class-meta">Secular education</div></div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#AAA" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="main">
          {!activeClass ? (
            <div style={{ padding: '80px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#555', marginBottom: 4 }}>Select a class</div>
              <div style={{ fontSize: 12, color: '#AAA' }}>Choose a class from the left to manage its curriculum</div>
            </div>
          ) : (
            <div>
              {/* Breadcrumb */}
              <div className="breadcrumb">
                <span className="breadcrumb-item" onClick={() => { setActiveSubject(null); setActiveTopic(null); setActiveSubtopic(null); setActiveTab('subjects') }}>{activeClass.name}</span>
                {activeSubject && <><span style={{ color: '#DDD' }}>›</span><span className="breadcrumb-item" onClick={() => { setActiveTopic(null); setActiveSubtopic(null); setActiveTab('topics'); setView('list') }}>{activeSubject.name}</span></>}
                {activeTopic && <><span style={{ color: '#DDD' }}>›</span><span className="breadcrumb-item active">{activeSubtopic ? `${activeTopic.title} / ${activeSubtopic.title}` : activeTopic.title}</span></>}
              </div>

              {/* Tabs */}
              <div className="tabs">
                <button className={`tab ${activeTab === 'subjects' ? 'active' : ''}`} onClick={() => { setActiveTab('subjects'); setActiveSubject(null); setActiveTopic(null); setActiveSubtopic(null) }}>
                  Subjects ({subjects.length})
                </button>
                <button className={`tab terms-tab ${activeTab === 'terms' ? 'active' : ''}`} onClick={() => { setActiveTab('terms'); setActiveTopic(null) }}>
                  Terms ({terms.length})
                </button>
                {activeSubject && (
                  <button className={`tab ${activeTab === 'topics' && view === 'list' ? 'active' : ''}`} onClick={() => { setActiveTab('topics'); setActiveTopic(null); setActiveSubtopic(null); setView('list') }}>
                    Topics ({topics.length})
                  </button>
                )}
                {activeTopic && (
                  <button className={`tab ${activeTab === 'materials' ? 'active' : ''}`} onClick={() => setActiveTab('materials')}>
                    Materials {activeSubtopic ? `(${activeSubtopic.title})` : ''} ({materials.length})
                  </button>
                )}
                {activeSubject && topics.length > 0 && (
                  <button className={`tab ${view === 'progress' ? 'active' : ''}`} onClick={() => { setView(v => v === 'progress' ? 'list' : 'progress'); setActiveTab('topics'); loadProgress(activeSubject.id) }}>
                    Progress
                  </button>
                )}
                <button className={`tab lp-tab ${activeTab === 'lessonplans' ? 'active' : ''}`} onClick={() => { setActiveTab('lessonplans'); loadLessonPlans() }}>
                  Lesson Plans
                </button>
              </div>

              {/* ══ TERMS ══ */}
              {activeTab === 'terms' && (
                <div>
                  <div className="add-form">
                    <div className="add-form-title">New Term — {activeClass.name}</div>
                    <div className="form-row">
                      <input className="form-input" value={newTermName} onChange={e => setNewTermName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTerm()} placeholder="Term name..." />
                      <input className="form-input form-input-sm" type="date" value={newTermStart} onChange={e => setNewTermStart(e.target.value)} />
                      <input className="form-input form-input-sm" type="date" value={newTermEnd} onChange={e => setNewTermEnd(e.target.value)} />
                      <button className="add-btn" onClick={addTerm} disabled={saving || !newTermName.trim()}>+ Add</button>
                    </div>
                  </div>
                  {terms.length === 0 ? <div className="empty-block">No terms yet</div> : terms.map((term, i) => (
                    <div key={term.id} className="term-card">
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 500 }}><span className="order-badge" style={{ marginRight: 6 }}>{i + 1}</span>{term.name}</div>
                        {(term.start_date || term.end_date) && <div style={{ fontSize: 11, color: '#AAA', marginTop: 2 }}>{fmtDate(term.start_date)} → {fmtDate(term.end_date)}</div>}
                      </div>
                      <button className="icon-btn" onClick={() => deleteTerm(term.id)}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* ══ SUBJECTS ══ */}
              {activeTab === 'subjects' && (
                <div>
                  <div className="stats-row">
                    <div className="stat-mini"><div className="stat-n">{subjects.length}</div><div className="stat-l">Subjects</div></div>
                    <div className="stat-mini"><div className="stat-n">{terms.length}</div><div className="stat-l">Terms</div></div>
                    <div className="stat-mini"><div className="stat-n">{topics.length}</div><div className="stat-l">Topics</div></div>
                    <div className="stat-mini"><div className="stat-n" style={{ fontSize: 14, color: activeClass.class_type === 'islamic' ? '#15803D' : '#1D4ED8' }}>{activeClass.class_type === 'islamic' ? 'Islamic' : 'Secular'}</div><div className="stat-l">Type</div></div>
                  </div>
                  <div className="add-form">
                    <div className="add-form-title">Add subject to {activeClass.name}</div>
                    <div className="form-row">
                      <input className="form-input" value={newSubject} onChange={e => setNewSubject(e.target.value)} onKeyDown={e => e.key === 'Enter' && addSubject()} placeholder="e.g. Maths, Quran..." />
                      <input className="form-input" style={{ maxWidth: 80 }} type="number" value={newSubjectOrder} onChange={e => setNewSubjectOrder(e.target.value)} placeholder="Order" />
                      <button className="add-btn" onClick={addSubject} disabled={saving}>+ Add</button>
                    </div>
                  </div>
                  {subjects.length === 0 ? <div className="empty-block">No subjects yet</div> : subjects.map(s => (
                    <div key={s.id} className="item-card">
                      <div className="item-head">
                        <div className="item-title"><span className="order-badge">{s.order_num}</span>{s.name}</div>
                        <div className="item-actions">
                          <button className="open-btn" onClick={() => selectSubject(s)}>Topics <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg></button>
                          <button className="icon-btn" onClick={() => deleteSubject(s.id)}>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ══ TOPICS ══ */}
              {activeTab === 'topics' && activeSubject && view === 'list' && (
                <div>
                  {terms.length > 0 && (
                    <div className="term-filter">
                      <span style={{ fontSize: 11, color: '#AAA', fontWeight: 500 }}>Term:</span>
                      <button className={`term-filter-pill ${!activeTerm ? 'active' : ''}`} onClick={() => setActiveTerm(null)}>All</button>
                      {terms.map(term => <button key={term.id} className={`term-filter-pill ${activeTerm?.id === term.id ? 'active' : ''}`} onClick={() => setActiveTerm(term)}>{term.name}</button>)}
                    </div>
                  )}
                  <div className="add-form">
                    <div className="add-form-title">Add topic to {activeSubject.name}</div>
                    <div className="form-row" style={{ marginBottom: 8 }}>
                      <input className="form-input" value={newTopic} onChange={e => setNewTopic(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTopic()} placeholder="Topic title..." />
                      <input className="form-input" value={newTopicDesc} onChange={e => setNewTopicDesc(e.target.value)} placeholder="Description (optional)" />
                    </div>
                    <div className="form-row">
                      <span style={{ fontSize: 11, color: '#AAA' }}>Dates:</span>
                      <input className="form-input form-input-sm" type="date" value={newTopicStart} onChange={e => setNewTopicStart(e.target.value)} />
                      <span style={{ fontSize: 11, color: '#AAA' }}>→</span>
                      <input className="form-input form-input-sm" type="date" value={newTopicEnd} onChange={e => setNewTopicEnd(e.target.value)} />
                      <button className="add-btn" onClick={addTopic} disabled={saving}>+ Add</button>
                    </div>
                    <label className="track-checkbox-row">
                      <input type="checkbox" checked={newTopicTrack} onChange={e => setNewTopicTrack(e.target.checked)} />
                      Track per learner individually
                    </label>
                  </div>

                  {topics
                    .filter(t => !activeTerm || topicTerms.some(tt => tt.topic_id === t.id && tt.term_id === activeTerm.id))
                    .length === 0
                    ? <div className="empty-block">{activeTerm ? `No topics in ${activeTerm.name}` : 'No topics yet'}</div>
                    : topics
                      .filter(t => !activeTerm || topicTerms.some(tt => tt.topic_id === t.id && tt.term_id === activeTerm.id))
                      .map((t, i) => {
                        const weekStatus = getWeekLabel(t)
                        const assignedTermIds = topicTerms.filter(tt => tt.topic_id === t.id).map(tt => tt.term_id)
                        const prog = progressData.find(p => p.topic_id === t.id)
                        const isComplete = prog?.is_completed
                        const isEditing = editingTopicDates === t.id
                        const isEditingTitle = editingTopic === t.id
                        const topicSubs = subtopicsMap[t.id] || []

                        return (
                          <div key={t.id} className={`item-card ${t.track_per_learner ? 'tracked' : ''} ${isComplete ? 'completed' : ''} ${weekStatus === 'this-week' && !isComplete ? 'this-week' : ''} ${weekStatus === 'overdue' && !isComplete ? 'overdue-card' : ''}`}>
                            <div className="item-head">
                              <div style={{ flex: 1 }}>
                                <div className="item-title">
                                  <span className="order-badge">{i + 1}</span>
                                  {t.title}
                                  {t.track_per_learner && <span className="per-learner-badge">Per learner</span>}
                                  {isComplete && <span className="done-badge"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>Done</span>}
                                </div>
                                {t.description && <div className="item-sub">{t.description}</div>}
                                <div style={{ marginTop: 6 }}>
                                  <button className={`date-range-badge ${t.planned_start ? (weekStatus === 'this-week' ? 'this-week-badge' : weekStatus === 'overdue' ? 'overdue-badge' : 'has-date') : ''}`}
                                    onClick={() => { setEditingTopicDates(isEditing ? null : t.id); setEditStart(t.planned_start || ''); setEditEnd(t.planned_end || '') }}>
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                                    {t.planned_start
                                      ? <>{fmtDate(t.planned_start)}{t.planned_end ? ` → ${fmtDate(t.planned_end)}` : ''}{weekStatus === 'this-week' && !isComplete && <> · <strong>This Week</strong></>}{weekStatus === 'overdue' && !isComplete && <> · <strong>Overdue</strong></>}</>
                                      : 'Add date'}
                                  </button>
                                </div>
                              </div>
                              <div className="item-actions">
                                {/* Edit title button */}
                                <button className="icon-btn edit" title="Edit title" onClick={() => { setEditingTopic(isEditingTitle ? null : t.id); setEditTopicTitle(t.title); setEditTopicDesc(t.description || '') }}>
                                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                </button>
                                <button className={`track-toggle ${t.track_per_learner ? 'on' : 'off'}`} onClick={() => toggleTrackPerLearner(t)}>
                                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                                  {t.track_per_learner ? 'Track: On' : 'Track'}
                                </button>
                                <button className="open-btn" onClick={() => openTopicMaterials(t)}>
                                  Materials <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                                </button>
                                <button className="icon-btn" onClick={() => deleteTopic(t.id)}>
                                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                                </button>
                              </div>
                            </div>

                            {/* ── Inline title edit ── */}
                            {isEditingTitle && (
                              <div className="edit-inline">
                                <input value={editTopicTitle} onChange={e => setEditTopicTitle(e.target.value)} placeholder="Title" onKeyDown={e => e.key === 'Enter' && saveTopic(t.id)} />
                                <input value={editTopicDesc} onChange={e => setEditTopicDesc(e.target.value)} placeholder="Description (optional)" style={{ minWidth: 160 }} />
                                <button className="date-save-btn" onClick={() => saveTopic(t.id)}>Save</button>
                                <button className="date-cancel-btn" onClick={() => setEditingTopic(null)}>Cancel</button>
                              </div>
                            )}

                            {/* ── Date edit ── */}
                            {isEditing && (
                              <div className="date-edit-row">
                                <span style={{ fontSize: 11, color: '#555', fontWeight: 500 }}>Planned:</span>
                                <input className="date-input-sm" type="date" value={editStart} onChange={e => setEditStart(e.target.value)} />
                                <span style={{ fontSize: 11, color: '#AAA' }}>→</span>
                                <input className="date-input-sm" type="date" value={editEnd} onChange={e => setEditEnd(e.target.value)} />
                                <button className="date-save-btn" onClick={() => saveTopicDates(t.id)}>Save</button>
                                <button className="date-cancel-btn" onClick={() => setEditingTopicDates(null)}>Cancel</button>
                              </div>
                            )}

                            {/* ── Subtopics ── */}
                            <div className="subtopic-section">
                              <div className="subtopic-section-title">
                                Subtopics {topicSubs.length > 0 && `(${topicSubs.length})`}
                              </div>

                              {topicSubs.map((st: any) => (
                                <div key={st.id}>
                                  {editingSubtopic === st.id ? (
                                    <div className="edit-inline" style={{ margin: '0 0 5px' }}>
                                      <input value={editStTitle} onChange={e => setEditStTitle(e.target.value)} placeholder="Title" onKeyDown={e => e.key === 'Enter' && saveSubtopic(st.id, t.id)} />
                                      <input value={editStDesc} onChange={e => setEditStDesc(e.target.value)} placeholder="Description (optional)" />
                                      <button className="date-save-btn" onClick={() => saveSubtopic(st.id, t.id)}>Save</button>
                                      <button className="date-cancel-btn" onClick={() => setEditingSubtopic(null)}>Cancel</button>
                                    </div>
                                  ) : (
                                    <div className="subtopic-item">
                                      <div className="st-dot" />
                                      <div style={{ flex: 1 }}>
                                        <div className="st-title">{st.title}</div>
                                        {st.description && <div className="st-meta">{st.description}</div>}
                                        {st.planned_start && <div className="st-meta">{fmtDate(st.planned_start)}{st.planned_end ? ` → ${fmtDate(st.planned_end)}` : ''}</div>}
                                      </div>
                                      {/* Materials button for subtopic */}
                                      <button className="open-btn green" style={{ fontSize: 10, padding: '3px 8px' }} onClick={() => openSubtopicMaterials(st, t)}>
                                        Materials
                                      </button>
                                      {/* Edit subtopic */}
                                      <button className="icon-btn edit" style={{ width: 22, height: 22 }} title="Edit" onClick={() => { setEditingSubtopic(st.id); setEditStTitle(st.title); setEditStDesc(st.description || '') }}>
                                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                      </button>
                                      <button className="icon-btn" style={{ width: 22, height: 22 }} onClick={() => deleteSubtopic(st.id, t.id)}>
                                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                                      </button>
                                    </div>
                                  )}
                                </div>
                              ))}

                              {/* Add subtopic form */}
                              {showSubtopicForm === t.id ? (
                                <div className="st-form">
                                  <div style={{ display: 'flex', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
                                    <input className="st-fin" style={{ flex: 1, minWidth: 140 }} placeholder="Subtopic title *" value={stTitle} onChange={e => setStTitle(e.target.value)} autoFocus />
                                    <input className="st-fin" style={{ flex: 1, minWidth: 120 }} placeholder="Description" value={stDesc} onChange={e => setStDesc(e.target.value)} />
                                  </div>
                                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                                    <input className="st-fin" type="date" value={stStart} onChange={e => setStStart(e.target.value)} />
                                    <span style={{ fontSize: 11, color: '#AAA' }}>→</span>
                                    <input className="st-fin" type="date" value={stEnd} onChange={e => setStEnd(e.target.value)} />
                                    <button className="date-save-btn" onClick={() => addSubtopic(t.id)} disabled={saving || !stTitle.trim()}>Add</button>
                                    <button className="date-cancel-btn" onClick={() => { setShowSubtopicForm(null); setStTitle(''); setStDesc('') }}>Cancel</button>
                                  </div>
                                </div>
                              ) : (
                                <button className="st-add-btn" onClick={() => { setShowSubtopicForm(t.id); setStTitle(''); setStDesc('') }}>
                                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                                  Add subtopic
                                </button>
                              )}
                            </div>

                            {/* Term assignment */}
                            {terms.length > 0 && (
                              <div className="topic-terms-row">
                                <span style={{ fontSize: 10, color: '#AAA', marginRight: 4, alignSelf: 'center' }}>Term:</span>
                                {terms.map(term => (
                                  <button key={term.id} className={`term-assign-pill ${assignedTermIds.includes(term.id) ? 'assigned' : ''}`} onClick={() => toggleTopicTerm(t.id, term.id)}>
                                    {term.name}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                </div>
              )}

              {/* ══ PROGRESS ══ */}
              {activeTab === 'topics' && activeSubject && view === 'progress' && (
                <div>
                  <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: 13, color: '#AAA' }}>{activeSubject.name} — Teacher Feedback</div>
                    <button onClick={() => setView('list')} style={{ fontSize: 12, color: '#0369A1', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>← Back to Topics</button>
                  </div>
                  <div className="progress-table">
                    <div className="progress-table-head">
                      <span className="th">Topic</span><span className="th">Planned</span><span className="th">Taught</span><span className="th">Status</span>
                    </div>
                    {topics.map(t => {
                      const prog = progressData.find(p => p.topic_id === t.id)
                      const ucfg = UNDERSTANDING_CFG[prog?.understanding] || UNDERSTANDING_CFG.good
                      const weekStatus = getWeekLabel(t)
                      return (
                        <div key={t.id} className="progress-row">
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 500 }}>{t.title}</div>
                            {prog?.feedback_note && <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{prog.feedback_note}</div>}
                          </div>
                          <div style={{ fontSize: 11, color: '#AAA' }}>{t.planned_start ? <>{fmtDate(t.planned_start)}{t.planned_end ? `→${fmtDate(t.planned_end)}` : ''}</> : '—'}</div>
                          <div style={{ fontSize: 12, color: '#AAA' }}>{prog?.taught_date || '—'}</div>
                          <div>
                            {prog?.is_completed ? (
                              <span className="understanding-badge" style={{ background: ucfg.bg, color: ucfg.color }}>{ucfg.label}</span>
                            ) : weekStatus === 'this-week' ? (
                              <span style={{ fontSize: 10, fontWeight: 500, background: '#ECFEFF', color: '#0E7490', border: '1px solid #22D3EE', padding: '2px 7px', borderRadius: 6 }}>This Week</span>
                            ) : weekStatus === 'overdue' ? (
                              <span style={{ fontSize: 10, fontWeight: 500, background: '#FEF2F2', color: '#DC2626', border: '1px solid #FCA5A5', padding: '2px 7px', borderRadius: 6 }}>Overdue</span>
                            ) : <span style={{ fontSize: 11, color: '#CCC' }}>Pending</span>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* ══ MATERIALS ══ */}
              {activeTab === 'materials' && activeTopic && (
                <div>
                  {/* Context banner */}
                  <div style={{ marginBottom: 12, padding: '10px 14px', background: activeSubtopic ? '#FDF4FF' : '#F0F9FF', border: `1px solid ${activeSubtopic ? '#E9D5FF' : '#BFDBFE'}`, borderRadius: 10, fontSize: 12, color: activeSubtopic ? '#7E22CE' : '#1D4ED8', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <div>
                      <strong>{activeTopic.title}</strong>
                      {activeSubtopic && <> <span style={{ opacity: .5 }}>›</span> <strong>{activeSubtopic.title}</strong></>}
                    </div>
                    {activeSubtopic && (
                      <button onClick={() => { setActiveSubtopic(null); loadMaterials(activeTopic.id) }}
                        style={{ marginLeft: 'auto', fontSize: 11, background: '#F0F9FF', color: '#0369A1', border: '1px solid #BFDBFE', borderRadius: 6, padding: '2px 8px', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
                        ← Back to topic materials
                      </button>
                    )}
                  </div>

                  {/* Subtopic switcher — if viewing parent, show subtopics as quick links */}
                  {!activeSubtopic && (subtopicsMap[activeTopic.id] || []).length > 0 && (
                    <div style={{ marginBottom: 12, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: '#AAA' }}>Also view materials for subtopic:</span>
                      {(subtopicsMap[activeTopic.id] || []).map((st: any) => (
                        <button key={st.id} onClick={() => { setActiveSubtopic(st); loadMaterials(st.id) }}
                          style={{ fontSize: 11, fontWeight: 600, background: '#FDF4FF', color: '#7E22CE', border: '1px solid #E9D5FF', borderRadius: 6, padding: '3px 10px', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
                          {st.title}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="add-form">
                    <div className="add-form-title">Add Material {activeSubtopic ? `to ${activeSubtopic.title}` : `to ${activeTopic.title}`}</div>
                    <div className="form-row" style={{ marginBottom: 8 }}>
                      <input className="form-input" value={newMaterialTitle} onChange={e => setNewMaterialTitle(e.target.value)} placeholder="Material title..." />
                      <select className="form-select" value={newMaterialType} onChange={e => setNewMaterialType(e.target.value)}>
                        <option value="video">Video</option><option value="pdf">PDF</option><option value="link">Link</option><option value="note">Note</option>
                      </select>
                    </div>
                    <div className="form-row">
                      {newMaterialType !== 'note'
                        ? <input className="form-input" value={newMaterialUrl} onChange={e => setNewMaterialUrl(e.target.value)} placeholder="URL (https://...)" />
                        : <input className="form-input" value={newMaterialContent} onChange={e => setNewMaterialContent(e.target.value)} placeholder="Note content..." />}
                      <button className="add-btn" onClick={addMaterial} disabled={saving}>+ Add</button>
                    </div>
                  </div>

                  {materials.length === 0 ? (
                    <div className="empty-block">No materials yet — add a video, PDF, link or note</div>
                  ) : (
                    <div style={{ background: '#fff', border: '1px solid #EFEFED', borderRadius: 12, overflow: 'hidden' }}>
                      {materials.map(m => {
                        const cfg = MATERIAL_COLORS[m.type] || MATERIAL_COLORS.link
                        return (
                          <div key={m.id} className="material-row">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                              <div className="material-icon" style={{ background: cfg.bg, color: cfg.color }}>{MATERIAL_ICONS[m.type]}</div>
                              <div style={{ flex: 1 }}>
                                <div className="material-title">{m.title}</div>
                                {m.url && <a href={m.url} target="_blank" rel="noreferrer" className="material-url">{m.url}</a>}
                                {m.content && <div style={{ fontSize: 11, color: '#888', marginTop: 1 }}>{m.content}</div>}
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                              <span style={{ fontSize: 10, fontWeight: 500, padding: '2px 7px', borderRadius: 6, background: cfg.bg, color: cfg.color }}>{m.type}</span>
                              {m.url && <a href={m.url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: '#0369A1', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 6, padding: '3px 8px', textDecoration: 'none', fontWeight: 500 }}>Open</a>}
                              <button className="icon-btn" onClick={() => deleteMaterial(m.id)}>
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ══ LESSON PLANS ══ */}
              {activeTab === 'lessonplans' && (
                <div>
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: '#1A1A1A', marginBottom: 2 }}>Lesson Plan Submissions</div>
                    <div style={{ fontSize: 12, color: '#AAA' }}>{activeClass.name}</div>
                  </div>
                  <div className="lp-stats">
                    <div className="lp-stat"><div className="lp-n">{lpStats.total}</div><div className="lp-l">Total Topics</div></div>
                    <div className="lp-stat submitted"><div className="lp-n" style={{ color: '#15803D' }}>{lpStats.submitted}</div><div className="lp-l">Submitted</div></div>
                    <div className="lp-stat draft"><div className="lp-n" style={{ color: '#A16207' }}>{lpStats.draft}</div><div className="lp-l">Draft</div></div>
                    <div className="lp-stat missing"><div className="lp-n" style={{ color: '#DC2626' }}>{lpStats.missing}</div><div className="lp-l">Missing</div></div>
                  </div>
                  <div className="lp-pbar-wrap">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: '#555', marginBottom: 8, fontWeight: 500 }}>
                      <span>Submission rate</span>
                      <span style={{ fontWeight: 700, color: lpStats.pct >= 80 ? '#15803D' : lpStats.pct >= 50 ? '#A16207' : '#DC2626' }}>{lpStats.pct}%</span>
                    </div>
                    <div style={{ height: 8, background: '#F0F0EE', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 4, background: 'linear-gradient(90deg,#15803D,#22C55E)', width: `${lpStats.pct}%`, transition: 'width .4s' }} />
                    </div>
                  </div>
                  <div className="lp-filters">
                    <span style={{ fontSize: 11, color: '#AAA', fontWeight: 500 }}>Filter:</span>
                    <button className={`lp-filter-pill all ${lpFilter === 'all' ? 'on' : ''}`} onClick={() => setLpFilter('all')}>All ({lpStats.total})</button>
                    <button className={`lp-filter-pill ${lpFilter === 'submitted' ? 'on' : ''}`} onClick={() => setLpFilter('submitted')}>Submitted ({lpStats.submitted})</button>
                    <button className={`lp-filter-pill missing ${lpFilter === 'missing' ? 'on' : ''}`} onClick={() => setLpFilter('missing')}>Missing/Draft ({lpStats.missing + lpStats.draft})</button>
                  </div>
                  {lpTopics.length === 0 ? <div className="empty-block">No topics match the filter</div> : lpTopics.map((t, i) => {
                    const lp = lessonPlans.find(x => x.topic_id === t.id)
                    const status = lp?.status === 'submitted' ? 'submitted' : lp?.status === 'draft' ? 'draft' : 'missing'
                    const weekStatus = getWeekLabel(t)
                    return (
                      <div key={t.id} className={`lp-row ${status}`}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 10, color: '#AAA', fontWeight: 600 }}>#{i + 1}</span>
                          <div style={{ fontSize: 13, fontWeight: 500, color: '#1A1A1A' }}>{t.title}</div>
                          <span className="lp-status-badge" style={{ background: status === 'submitted' ? '#F0FDF4' : status === 'draft' ? '#FEFCE8' : '#FEF2F2', color: status === 'submitted' ? '#15803D' : status === 'draft' ? '#A16207' : '#DC2626', border: `1px solid ${status === 'submitted' ? '#BBF7D0' : status === 'draft' ? '#FDE68A' : '#FCA5A5'}` }}>
                            {status === 'submitted' ? '✓ Submitted' : status === 'draft' ? '~ Draft' : '✗ Missing'}
                          </span>
                          {weekStatus === 'this-week' && <span style={{ fontSize: 9, fontWeight: 700, background: '#E0F2FE', color: '#0284C7', padding: '1px 6px', borderRadius: 4 }}>This Week</span>}
                          {weekStatus === 'overdue' && <span style={{ fontSize: 9, fontWeight: 700, background: '#FEE2E2', color: '#DC2626', padding: '1px 6px', borderRadius: 4 }}>Overdue</span>}
                        </div>
                        <div style={{ fontSize: 11, color: '#AAA', display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: lp ? 4 : 0 }}>
                          {t.planned_start && <span>📅 {fmtDate(t.planned_start)}{t.planned_end ? ` → ${fmtDate(t.planned_end)}` : ''}</span>}
                          {subjects.find(s => s.id === t.subject_id)?.name && <span>{subjects.find(s => s.id === t.subject_id)?.name}</span>}
                        </div>
                        {lp && (
                          <div style={{ fontSize: 11, color: '#555', marginTop: 4 }}>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 4 }}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                            {lp.users?.display_name || lp.users?.full_name}
                            {lp.submitted_at && <span style={{ color: '#AAA', marginLeft: 6 }}>— {new Date(lp.submitted_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
                          </div>
                        )}
                        {lp && (lp.objectives || lp.activities) && (
                          <div style={{ fontSize: 11, color: '#666', marginTop: 6, background: '#FAFAF8', borderRadius: 6, padding: '8px 10px' }}>
                            {lp.objectives && <div style={{ marginBottom: 2 }}><strong>Objectives:</strong> {lp.objectives}</div>}
                            {lp.activities && <div style={{ marginBottom: 2 }}><strong>Activities:</strong> {lp.activities}</div>}
                            {lp.assessment && <div><strong>Assessment:</strong> {lp.assessment}</div>}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}