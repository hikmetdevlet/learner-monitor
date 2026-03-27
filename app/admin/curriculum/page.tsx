'use client'
import { useEffect, useState } from 'react'
import { createClient } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

export default function CurriculumAdmin() {
  const [classes, setClasses] = useState<any[]>([])
  const [subjects, setSubjects] = useState<any[]>([])
  const [topics, setTopics] = useState<any[]>([])
  const [materials, setMaterials] = useState<any[]>([])
  const [terms, setTerms] = useState<any[]>([])
  const [topicTerms, setTopicTerms] = useState<any[]>([])
  const [progressData, setProgressData] = useState<any[]>([])

  const [activeClass, setActiveClass] = useState<any>(null)
  const [activeSubject, setActiveSubject] = useState<any>(null)
  const [activeTopic, setActiveTopic] = useState<any>(null)
  const [activeTerm, setActiveTerm] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'subjects' | 'topics' | 'materials' | 'terms'>('subjects')
  const [view, setView] = useState<'list' | 'progress'>('list')

  const [newSubject, setNewSubject] = useState('')
  const [newSubjectOrder, setNewSubjectOrder] = useState('1')
  const [newTopic, setNewTopic] = useState('')
  const [newTopicDesc, setNewTopicDesc] = useState('')
  const [newTopicTrack, setNewTopicTrack] = useState(false)
  const [newTopicStart, setNewTopicStart] = useState('')
  const [newTopicEnd, setNewTopicEnd] = useState('')
  const [newMaterialTitle, setNewMaterialTitle] = useState('')
  const [newMaterialType, setNewMaterialType] = useState('link')
  const [newMaterialUrl, setNewMaterialUrl] = useState('')
  const [newMaterialContent, setNewMaterialContent] = useState('')
  const [newTermName, setNewTermName] = useState('')
  const [newTermStart, setNewTermStart] = useState('')
  const [newTermEnd, setNewTermEnd] = useState('')

  // Inline date editing for topics
  const [editingTopicDates, setEditingTopicDates] = useState<string | null>(null)
  const [editStart, setEditStart] = useState('')
  const [editEnd, setEditEnd] = useState('')

  const [saving, setSaving] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => { loadClasses() }, [])

  async function loadClasses() {
    const { data } = await supabase.from('classes').select('*').order('class_type').order('name')
    setClasses(data || [])
  }

  async function selectClass(cls: any) {
    setActiveClass(cls); setActiveSubject(null); setActiveTopic(null)
    setActiveTerm(null); setActiveTab('subjects'); setView('list')
    loadSubjects(cls.id); loadTerms(cls.id)
  }

  async function loadSubjects(classId: string) {
    const { data } = await supabase.from('curriculum_subjects').select('*')
      .eq('class_id', classId).eq('is_active', true).order('order_num')
    setSubjects(data || [])
  }

  async function loadTerms(classId: string) {
    const { data } = await supabase.from('curriculum_terms').select('*')
      .eq('class_id', classId).eq('is_active', true).order('order_num')
    setTerms(data || [])
  }

  async function selectSubject(subject: any) {
    setActiveSubject(subject); setActiveTopic(null)
    setActiveTab('topics'); setView('list')
    loadTopics(subject.id)
  }

  async function loadTopics(subjectId: string) {
    const { data } = await supabase.from('curriculum_topics').select('*')
      .eq('subject_id', subjectId).eq('is_active', true).order('order_num')
    setTopics(data || [])
    if (data && data.length > 0) loadTopicTerms(data.map((t: any) => t.id))
  }

  async function loadTopicTerms(topicIds: string[]) {
    const { data } = await supabase.from('curriculum_topic_terms').select('*').in('topic_id', topicIds)
    setTopicTerms(data || [])
  }

  async function selectTopic(topic: any) {
    setActiveTopic(topic); setActiveTab('materials'); loadMaterials(topic.id)
  }

  async function loadMaterials(topicId: string) {
    const { data } = await supabase.from('curriculum_materials').select('*')
      .eq('topic_id', topicId).order('order_num')
    setMaterials(data || [])
  }

  async function loadProgress(subjectId: string) {
    const topicIds = topics.map(t => t.id)
    if (topicIds.length === 0) return
    const { data } = await supabase.from('curriculum_progress')
      .select('*, users(full_name, display_name), curriculum_terms(name)')
      .in('topic_id', topicIds)
    setProgressData(data || [])
  }

  // ── TERMS ──
  async function addTerm() {
    if (!newTermName.trim() || !activeClass) return
    setSaving(true)
    const maxOrder = terms.length > 0 ? Math.max(...terms.map(t => t.order_num)) : 0
    await supabase.from('curriculum_terms').insert({
      class_id: activeClass.id, name: newTermName.trim(),
      order_num: maxOrder + 1,
      start_date: newTermStart || null, end_date: newTermEnd || null,
    })
    setNewTermName(''); setNewTermStart(''); setNewTermEnd('')
    loadTerms(activeClass.id); setSaving(false)
  }

  async function deleteTerm(id: string) {
    if (!confirm('Bu dönemi silmek istiyor musunuz?')) return
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

  // ── SUBJECTS ──
  async function addSubject() {
    if (!newSubject.trim() || !activeClass) return
    setSaving(true)
    await supabase.from('curriculum_subjects').insert({
      name: newSubject.trim(), class_id: activeClass.id,
      class_type: activeClass.class_type,
      order_num: parseInt(newSubjectOrder) || subjects.length + 1,
    })
    setNewSubject(''); setNewSubjectOrder('1')
    loadSubjects(activeClass.id); setSaving(false)
  }

  async function deleteSubject(id: string) {
    if (!confirm('Bu konuyu ve tüm alt konularını silmek istiyor musunuz?')) return
    await supabase.from('curriculum_subjects').update({ is_active: false }).eq('id', id)
    loadSubjects(activeClass.id)
    if (activeSubject?.id === id) { setActiveSubject(null); setActiveTab('subjects') }
  }

  // ── TOPICS ──
  async function addTopic() {
    if (!newTopic.trim() || !activeSubject) return
    setSaving(true)
    const maxOrder = topics.length > 0 ? Math.max(...topics.map(t => t.order_num)) : 0
    await supabase.from('curriculum_topics').insert({
      subject_id: activeSubject.id, title: newTopic.trim(),
      description: newTopicDesc.trim() || null,
      order_num: maxOrder + 1, track_per_learner: newTopicTrack,
      planned_start: newTopicStart || null, planned_end: newTopicEnd || null,
    })
    setNewTopic(''); setNewTopicDesc(''); setNewTopicTrack(false)
    setNewTopicStart(''); setNewTopicEnd('')
    loadTopics(activeSubject.id); setSaving(false)
  }

  async function toggleTrackPerLearner(topic: any) {
    await supabase.from('curriculum_topics')
      .update({ track_per_learner: !topic.track_per_learner }).eq('id', topic.id)
    loadTopics(activeSubject.id)
  }

  async function saveTopicDates(topicId: string) {
    await supabase.from('curriculum_topics')
      .update({ planned_start: editStart || null, planned_end: editEnd || null })
      .eq('id', topicId)
    setEditingTopicDates(null)
    loadTopics(activeSubject.id)
  }

  async function deleteTopic(id: string) {
    if (!confirm('Bu alt konuyu silmek istiyor musunuz?')) return
    await supabase.from('curriculum_topics').update({ is_active: false }).eq('id', id)
    loadTopics(activeSubject.id)
    if (activeTopic?.id === id) { setActiveTopic(null); setActiveTab('topics') }
  }

  // ── MATERIALS ──
  async function addMaterial() {
    if (!newMaterialTitle.trim() || !activeTopic) return
    setSaving(true)
    const maxOrder = materials.length > 0 ? Math.max(...materials.map(m => m.order_num)) : 0
    await supabase.from('curriculum_materials').insert({
      topic_id: activeTopic.id, title: newMaterialTitle.trim(),
      type: newMaterialType, url: newMaterialUrl.trim() || null,
      content: newMaterialContent.trim() || null, order_num: maxOrder + 1,
    })
    setNewMaterialTitle(''); setNewMaterialUrl(''); setNewMaterialContent('')
    loadMaterials(activeTopic.id); setSaving(false)
  }

  async function deleteMaterial(id: string) {
    await supabase.from('curriculum_materials').delete().eq('id', id)
    loadMaterials(activeTopic.id)
  }

  // ── Helpers ──
  function getWeekLabel(topic: any) {
    if (!topic.planned_start) return null
    const start = new Date(topic.planned_start)
    const end = topic.planned_end ? new Date(topic.planned_end) : null
    const now = new Date()
    const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay() + 1)
    const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 6)
    if (start <= weekEnd && (!end || end >= weekStart)) return 'this-week'
    if (start < weekStart) return 'overdue'
    return 'upcoming'
  }

  const islamicClasses = classes.filter(c => c.class_type === 'islamic')
  const secularClasses = classes.filter(c => c.class_type === 'secular')

  const MATERIAL_ICONS: Record<string, any> = {
    video: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>,
    pdf: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
    link: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
    note: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  }
  const MATERIAL_COLORS: Record<string, { bg: string; color: string }> = {
    video: { bg: '#FEF2F2', color: '#DC2626' },
    pdf: { bg: '#EFF6FF', color: '#1D4ED8' },
    link: { bg: '#F0FDF4', color: '#15803D' },
    note: { bg: '#FDF4FF', color: '#7E22CE' },
  }
  const UNDERSTANDING_CFG: Record<string, { bg: string; color: string; label: string }> = {
    good:      { bg: '#F0FDF4', color: '#15803D', label: 'İyi anladı' },
    mixed:     { bg: '#FEFCE8', color: '#A16207', label: 'Karışık' },
    difficult: { bg: '#FEF2F2', color: '#DC2626', label: 'Zorlandı' },
  }

  function fmtDate(d: string) {
    if (!d) return ''
    return new Date(d).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
  }

  return (
    <main style={{ minHeight: '100vh', background: '#F8F7F4', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&family=DM+Serif+Display&display=swap');
        * { box-sizing: border-box; }
        .topbar { background:#fff; border-bottom:1px solid #EFEFED; padding:0 32px; height:56px; display:flex; align-items:center; justify-content:space-between; position:sticky; top:0; z-index:20; }
        .topbar-left { display:flex; align-items:center; gap:12px; }
        .back-btn { display:flex; align-items:center; gap:6px; font-size:13px; color:#999; background:none; border:none; cursor:pointer; padding:6px 10px; border-radius:8px; transition:all 0.15s; font-family:'DM Sans',sans-serif; }
        .back-btn:hover { background:#F5F5F3; color:#333; }
        .page-title { font-size:15px; font-weight:500; color:#1A1A1A; }
        .divider { color:#DDD; }
        .layout { display:grid; grid-template-columns:260px 1fr; gap:0; height:calc(100vh - 56px); }
        .sidebar { background:#fff; border-right:1px solid #EFEFED; overflow-y:auto; }
        .sidebar-head { padding:16px; border-bottom:1px solid #EFEFED; }
        .sidebar-title { font-size:11px; font-weight:500; color:#AAA; text-transform:uppercase; letter-spacing:0.06em; }
        .class-group-label { padding:10px 16px 6px; font-size:10px; font-weight:500; color:#AAA; text-transform:uppercase; letter-spacing:0.06em; display:flex; align-items:center; gap:6px; background:#FAFAF8; border-top:1px solid #F5F5F3; }
        .class-row { display:flex; align-items:center; justify-content:space-between; padding:9px 16px; cursor:pointer; transition:background 0.15s; border-bottom:1px solid #F8F8F6; }
        .class-row:hover { background:#FAFAF8; }
        .class-row.active { background:#F0F9FF; border-left:3px solid #0369A1; }
        .class-name { font-size:13px; font-weight:500; color:#1A1A1A; }
        .class-meta { font-size:10px; color:#AAA; margin-top:1px; }
        .main { overflow-y:auto; padding:24px; }
        .breadcrumb { display:flex; align-items:center; gap:6px; margin-bottom:20px; font-size:12px; color:#AAA; flex-wrap:wrap; }
        .breadcrumb-item { cursor:pointer; transition:color 0.15s; }
        .breadcrumb-item:hover { color:#1A1A1A; }
        .breadcrumb-item.active { color:#1A1A1A; font-weight:500; }
        .breadcrumb-sep { color:#DDD; }
        .tabs { display:flex; gap:6px; margin-bottom:20px; flex-wrap:wrap; }
        .tab { padding:7px 16px; border-radius:9px; border:1px solid #EFEFED; background:#fff; font-size:13px; color:#666; cursor:pointer; font-family:'DM Sans',sans-serif; font-weight:500; transition:all 0.15s; display:flex; align-items:center; gap:6px; }
        .tab:hover { border-color:#DDD; }
        .tab.active { background:#1A1A1A; color:white; border-color:#1A1A1A; }
        .tab.terms-tab.active { background:#0369A1; border-color:#0369A1; }
        .item-card { background:#fff; border:1px solid #EFEFED; border-radius:12px; overflow:hidden; margin-bottom:12px; }
        .item-card.tracked { border-color:#E9D5FF; }
        .item-card.completed { border-color:#BBF7D0; }
        .item-card.this-week { border-color:#93C5FD; }
        .item-card.overdue-card { border-color:#FCA5A5; }
        .item-head { display:flex; align-items:center; justify-content:space-between; padding:12px 16px; transition:background 0.15s; gap:10px; }
        .item-head:hover { background:#FAFAF8; }
        .item-title { font-size:13px; font-weight:500; color:#1A1A1A; display:flex; align-items:center; gap:8px; flex:1; flex-wrap:wrap; }
        .item-sub { font-size:11px; color:#AAA; margin-top:2px; }
        .item-actions { display:flex; gap:4px; align-items:center; flex-shrink:0; flex-wrap:wrap; }
        .icon-btn { width:26px; height:26px; border-radius:6px; border:1px solid #EFEFED; background:#fff; cursor:pointer; display:flex; align-items:center; justify-content:center; color:#CCC; transition:all 0.15s; }
        .icon-btn:hover { background:#FEF2F2; color:#DC2626; border-color:#FECACA; }
        .open-btn { display:flex; align-items:center; gap:4px; font-size:11px; font-weight:500; background:#F0F9FF; color:#0369A1; border:1px solid #BFDBFE; border-radius:7px; padding:4px 10px; cursor:pointer; font-family:'DM Sans',sans-serif; transition:all 0.15s; white-space:nowrap; }
        .open-btn:hover { background:#DBEAFE; }
        .track-toggle { display:flex; align-items:center; gap:5px; font-size:11px; font-weight:500; padding:4px 10px; border-radius:7px; border:1px solid #EFEFED; cursor:pointer; font-family:'DM Sans',sans-serif; transition:all 0.15s; white-space:nowrap; }
        .track-toggle.on { background:#FDF4FF; color:#7E22CE; border-color:#E9D5FF; }
        .track-toggle.off { background:#F5F5F3; color:#AAA; border-color:#EFEFED; }
        .track-toggle:hover { opacity:0.8; }
        .order-badge { font-size:10px; background:#F5F5F3; color:#888; padding:2px 6px; border-radius:5px; font-weight:500; flex-shrink:0; }
        .per-learner-badge { font-size:10px; background:#FDF4FF; color:#7E22CE; border:1px solid #E9D5FF; padding:1px 7px; border-radius:6px; font-weight:500; }
        .done-badge { font-size:10px; background:#F0FDF4; color:#15803D; border:1px solid #BBF7D0; padding:1px 7px; border-radius:6px; font-weight:500; display:flex; align-items:center; gap:3px; }

        /* ── Date range badges ── */
        .date-range-badge { display:inline-flex; align-items:center; gap:5px; font-size:11px; font-weight:500; padding:3px 8px; border-radius:6px; cursor:pointer; border:1px dashed #DDD; color:#AAA; background:#FAFAF8; transition:all 0.15s; white-space:nowrap; }
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
        .form-select:focus { border-color:#1A1A1A; }
        .add-btn { height:36px; background:#1A1A1A; color:white; border:none; border-radius:8px; padding:0 16px; font-size:13px; font-weight:500; cursor:pointer; font-family:'DM Sans',sans-serif; flex-shrink:0; }
        .add-btn:disabled { opacity:0.5; }
        .track-checkbox-row { display:flex; align-items:center; gap:8px; margin-top:8px; font-size:12px; color:#666; cursor:pointer; }
        .track-checkbox-row input { accent-color:#7E22CE; width:15px; height:15px; cursor:pointer; }
        .track-info { font-size:11px; color:#7E22CE; background:#FDF4FF; border:1px solid #E9D5FF; border-radius:8px; padding:8px 12px; margin-top:8px; display:flex; align-items:flex-start; gap:6px; }
        .term-card { background:#fff; border:1px solid #EFEFED; border-radius:12px; padding:14px 16px; margin-bottom:10px; display:flex; align-items:center; justify-content:space-between; gap:10px; }
        .term-name { font-size:13px; font-weight:500; color:#1A1A1A; }
        .term-dates { font-size:11px; color:#AAA; margin-top:2px; }
        .topic-terms-row { display:flex; gap:6px; flex-wrap:wrap; padding:0 16px 12px; }
        .term-assign-pill { font-size:11px; font-weight:500; padding:3px 10px; border-radius:6px; border:1px solid #EFEFED; cursor:pointer; font-family:'DM Sans',sans-serif; transition:all 0.15s; background:#fff; color:#AAA; }
        .term-assign-pill:hover { border-color:#0369A1; color:#0369A1; }
        .term-assign-pill.assigned { background:#0369A1; color:#fff; border-color:#0369A1; }
        .term-filter { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:16px; align-items:center; }
        .term-filter-label { font-size:11px; color:#AAA; font-weight:500; }
        .term-filter-pill { font-size:11px; font-weight:500; padding:4px 12px; border-radius:7px; border:1px solid #EFEFED; cursor:pointer; font-family:'DM Sans',sans-serif; background:#fff; color:#666; transition:all 0.15s; }
        .term-filter-pill:hover { border-color:#0369A1; color:#0369A1; }
        .term-filter-pill.active { background:#0369A1; color:#fff; border-color:#0369A1; }
        .material-row { display:flex; align-items:center; justify-content:space-between; padding:10px 16px; border-bottom:1px solid #F8F8F6; }
        .material-row:last-child { border-bottom:none; }
        .material-icon { width:28px; height:28px; border-radius:7px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .material-title { font-size:13px; font-weight:500; color:#1A1A1A; }
        .material-url { font-size:11px; color:#0369A1; margin-top:1px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:300px; }
        .progress-table { background:#fff; border:1px solid #EFEFED; border-radius:12px; overflow:hidden; }
        .progress-table-head { display:grid; grid-template-columns:1fr 120px 90px 80px; padding:8px 16px; background:#FAFAF8; border-bottom:1px solid #EFEFED; }
        .th { font-size:10px; font-weight:500; color:#AAA; text-transform:uppercase; letter-spacing:0.05em; }
        .progress-row { display:grid; grid-template-columns:1fr 120px 90px 80px; padding:10px 16px; border-bottom:1px solid #F8F8F6; align-items:center; }
        .progress-row:last-child { border-bottom:none; }
        .understanding-badge { font-size:10px; font-weight:500; padding:3px 8px; border-radius:8px; }
        .stats-row { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-bottom:20px; }
        .stat-mini { background:#fff; border:1px solid #EFEFED; border-radius:12px; padding:14px; text-align:center; }
        .stat-n { font-size:22px; font-weight:500; color:#1A1A1A; }
        .stat-l { font-size:10px; color:#AAA; margin-top:3px; text-transform:uppercase; letter-spacing:0.04em; }
        .empty-block { background:#fff; border:1px solid #EFEFED; border-radius:12px; padding:40px; text-align:center; color:#CCC; font-size:13px; }
        @media (max-width:768px) {
          .layout { grid-template-columns:1fr; }
          .sidebar { height:auto; border-right:none; border-bottom:1px solid #EFEFED; }
          .stats-row { grid-template-columns:1fr 1fr; }
          .topbar { padding:0 16px; }
          .main { padding:16px; }
        }
      `}</style>

      <div className="topbar">
        <div className="topbar-left">
          <button className="back-btn" onClick={() => router.back()}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            Geri
          </button>
          <span className="divider">|</span>
          <span className="page-title">Müfredat Yönetimi</span>
        </div>
      </div>

      <div className="layout">
        <div className="sidebar">
          <div className="sidebar-head"><div className="sidebar-title">Sınıf seçin</div></div>
          {islamicClasses.length > 0 && (
            <div>
              <div className="class-group-label">İslami</div>
              {islamicClasses.map(cls => (
                <div key={cls.id} className={`class-row ${activeClass?.id === cls.id ? 'active' : ''}`} onClick={() => selectClass(cls)}>
                  <div><div className="class-name">{cls.name}</div><div className="class-meta">İslami eğitim</div></div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#AAA" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                </div>
              ))}
            </div>
          )}
          {secularClasses.length > 0 && (
            <div>
              <div className="class-group-label">Genel</div>
              {secularClasses.map(cls => (
                <div key={cls.id} className={`class-row ${activeClass?.id === cls.id ? 'active' : ''}`} onClick={() => selectClass(cls)}>
                  <div><div className="class-name">{cls.name}</div><div className="class-meta">Genel eğitim</div></div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#AAA" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="main">
          {!activeClass ? (
            <div style={{ padding: '80px 20px', textAlign: 'center' }}>
              <div style={{ width: 44, height: 44, background: '#F5F5F3', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', color: '#CCC' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
              </div>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#555', marginBottom: 4 }}>Sınıf seçin</div>
              <div style={{ fontSize: 12, color: '#AAA' }}>Müfredatı yönetmek için soldan bir sınıf seçin</div>
            </div>
          ) : (
            <div>
              <div className="breadcrumb">
                <span className="breadcrumb-item" onClick={() => { setActiveSubject(null); setActiveTopic(null); setActiveTab('subjects') }}>{activeClass.name}</span>
                {activeSubject && <><span className="breadcrumb-sep">›</span><span className="breadcrumb-item" onClick={() => { setActiveTopic(null); setActiveTab('topics'); setView('list') }}>{activeSubject.name}</span></>}
                {activeTopic && <><span className="breadcrumb-sep">›</span><span className="breadcrumb-item active">{activeTopic.title}</span></>}
              </div>

              <div className="tabs">
                <button className={`tab ${activeTab === 'subjects' ? 'active' : ''}`} onClick={() => { setActiveTab('subjects'); setActiveSubject(null); setActiveTopic(null) }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                  Konular ({subjects.length})
                </button>
                <button className={`tab terms-tab ${activeTab === 'terms' ? 'active' : ''}`} onClick={() => { setActiveTab('terms'); setActiveTopic(null) }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  Dönemler ({terms.length})
                </button>
                {activeSubject && (
                  <button className={`tab ${activeTab === 'topics' && view === 'list' ? 'active' : ''}`} onClick={() => { setActiveTab('topics'); setActiveTopic(null); setView('list') }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/></svg>
                    Alt Konular ({topics.length})
                  </button>
                )}
                {activeTopic && (
                  <button className={`tab ${activeTab === 'materials' ? 'active' : ''}`} onClick={() => setActiveTab('materials')}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg>
                    Materyaller ({materials.length})
                  </button>
                )}
                {activeSubject && topics.length > 0 && (
                  <button className={`tab ${view === 'progress' ? 'active' : ''}`} onClick={() => { setView(v => v === 'progress' ? 'list' : 'progress'); setActiveTab('topics'); loadProgress(activeSubject.id) }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                    İlerleme
                  </button>
                )}
              </div>

              {/* ══ DÖNEMLER ══ */}
              {activeTab === 'terms' && (
                <div>
                  <div className="add-form">
                    <div className="add-form-title">Yeni Dönem — {activeClass.name}</div>
                    <div className="form-row">
                      <input className="form-input" value={newTermName} onChange={e => setNewTermName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTerm()} placeholder="Dönem adı (ör: 1. Dönem, Autumn Term...)" />
                      <input className="form-input form-input-sm" type="date" value={newTermStart} onChange={e => setNewTermStart(e.target.value)} title="Başlangıç" />
                      <input className="form-input form-input-sm" type="date" value={newTermEnd} onChange={e => setNewTermEnd(e.target.value)} title="Bitiş" />
                      <button className="add-btn" onClick={addTerm} disabled={saving || !newTermName.trim()}>+ Ekle</button>
                    </div>
                  </div>
                  {terms.length === 0 ? <div className="empty-block">Henüz dönem yok — yukarıdan ekleyin</div> : (
                    terms.map((term, i) => (
                      <div key={term.id} className="term-card">
                        <div style={{ flex: 1 }}>
                          <div className="term-name"><span className="order-badge" style={{ marginRight: 6 }}>{i + 1}</span>{term.name}</div>
                          {(term.start_date || term.end_date) && (
                            <div className="term-dates">{term.start_date ? fmtDate(term.start_date) : '—'} → {term.end_date ? fmtDate(term.end_date) : '—'}</div>
                          )}
                        </div>
                        <button className="icon-btn" onClick={() => deleteTerm(term.id)}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* ══ SUBJECTS ══ */}
              {activeTab === 'subjects' && (
                <div>
                  <div className="stats-row">
                    <div className="stat-mini"><div className="stat-n">{subjects.length}</div><div className="stat-l">Konu</div></div>
                    <div className="stat-mini"><div className="stat-n">{terms.length}</div><div className="stat-l">Dönem</div></div>
                    <div className="stat-mini"><div className="stat-n">{topics.length}</div><div className="stat-l">Alt Konu</div></div>
                    <div className="stat-mini"><div className="stat-n" style={{ color: activeClass.class_type === 'islamic' ? '#15803D' : '#1D4ED8', fontSize: 14 }}>{activeClass.class_type === 'islamic' ? 'İslami' : 'Genel'}</div><div className="stat-l">Tür</div></div>
                  </div>
                  <div className="add-form">
                    <div className="add-form-title">{activeClass.name} sınıfına konu ekle</div>
                    <div className="form-row">
                      <input className="form-input" value={newSubject} onChange={e => setNewSubject(e.target.value)} onKeyDown={e => e.key === 'Enter' && addSubject()} placeholder="ör. Kuran, Matematik, Türkçe..." />
                      <input className="form-input" style={{ maxWidth: 80 }} type="number" value={newSubjectOrder} onChange={e => setNewSubjectOrder(e.target.value)} placeholder="Sıra" />
                      <button className="add-btn" onClick={addSubject} disabled={saving}>+ Ekle</button>
                    </div>
                  </div>
                  {subjects.length === 0 ? <div className="empty-block">Henüz konu yok — yukarıdan ekleyin</div> : (
                    subjects.map(s => (
                      <div key={s.id} className="item-card">
                        <div className="item-head">
                          <div className="item-title"><span className="order-badge">{s.order_num}</span>{s.name}</div>
                          <div className="item-actions">
                            <button className="open-btn" onClick={() => selectSubject(s)}>
                              Alt Konular <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                            </button>
                            <button className="icon-btn" onClick={() => deleteSubject(s.id)}>
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* ══ TOPICS ══ */}
              {activeTab === 'topics' && activeSubject && view === 'list' && (
                <div>
                  {terms.length > 0 && (
                    <div className="term-filter">
                      <span className="term-filter-label">Dönem:</span>
                      <button className={`term-filter-pill ${!activeTerm ? 'active' : ''}`} onClick={() => setActiveTerm(null)}>Tümü</button>
                      {terms.map(term => (
                        <button key={term.id} className={`term-filter-pill ${activeTerm?.id === term.id ? 'active' : ''}`} onClick={() => setActiveTerm(term)}>{term.name}</button>
                      ))}
                    </div>
                  )}

                  <div className="add-form">
                    <div className="add-form-title">{activeSubject.name} konusuna alt konu ekle</div>
                    <div className="form-row" style={{ marginBottom: 8 }}>
                      <input className="form-input" value={newTopic} onChange={e => setNewTopic(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTopic()} placeholder="Alt konu başlığı..." />
                      <input className="form-input" value={newTopicDesc} onChange={e => setNewTopicDesc(e.target.value)} placeholder="Açıklama (isteğe bağlı)" />
                    </div>
                    <div className="form-row">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#AAA" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                        <span style={{ fontSize: 11, color: '#AAA' }}>Planlanan tarih:</span>
                      </div>
                      <input className="form-input form-input-sm" type="date" value={newTopicStart} onChange={e => setNewTopicStart(e.target.value)} title="Başlangıç tarihi" />
                      <span style={{ fontSize: 11, color: '#AAA' }}>→</span>
                      <input className="form-input form-input-sm" type="date" value={newTopicEnd} onChange={e => setNewTopicEnd(e.target.value)} title="Bitiş tarihi" />
                      <button className="add-btn" onClick={addTopic} disabled={saving}>+ Ekle</button>
                    </div>
                    <label className="track-checkbox-row">
                      <input type="checkbox" checked={newTopicTrack} onChange={e => setNewTopicTrack(e.target.checked)} />
                      Her öğrenci için ayrı takip et
                    </label>
                  </div>

                  {topics
                    .filter(t => !activeTerm || topicTerms.some(tt => tt.topic_id === t.id && tt.term_id === activeTerm.id))
                    .length === 0 ? (
                    <div className="empty-block">{activeTerm ? `${activeTerm.name} döneminde alt konu yok` : 'Henüz alt konu yok — yukarıdan ekleyin'}</div>
                  ) : (
                    topics
                      .filter(t => !activeTerm || topicTerms.some(tt => tt.topic_id === t.id && tt.term_id === activeTerm.id))
                      .map((t, i) => {
                        const weekStatus = getWeekLabel(t)
                        const assignedTermIds = topicTerms.filter(tt => tt.topic_id === t.id).map(tt => tt.term_id)
                        const prog = progressData.find(p => p.topic_id === t.id)
                        const isComplete = prog?.is_completed
                        const isEditing = editingTopicDates === t.id

                        return (
                          <div key={t.id} className={`item-card ${t.track_per_learner ? 'tracked' : ''} ${isComplete ? 'completed' : ''} ${weekStatus === 'this-week' && !isComplete ? 'this-week' : ''} ${weekStatus === 'overdue' && !isComplete ? 'overdue-card' : ''}`}>
                            <div className="item-head">
                              <div style={{ flex: 1 }}>
                                <div className="item-title">
                                  <span className="order-badge">{i + 1}</span>
                                  {t.title}
                                  {t.track_per_learner && <span className="per-learner-badge">Bireysel</span>}
                                  {isComplete && <span className="done-badge"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>Tamamlandı</span>}
                                </div>
                                {t.description && <div className="item-sub">{t.description}</div>}
                                {/* Date range badge — always visible, click to edit */}
                                <div style={{ marginTop: 6 }}>
                                  <button
                                    className={`date-range-badge ${t.planned_start ? (weekStatus === 'this-week' ? 'this-week-badge' : weekStatus === 'overdue' ? 'overdue-badge' : 'has-date') : ''}`}
                                    onClick={() => { setEditingTopicDates(isEditing ? null : t.id); setEditStart(t.planned_start || ''); setEditEnd(t.planned_end || '') }}
                                  >
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                                    {t.planned_start ? (
                                      <>{fmtDate(t.planned_start)}{t.planned_end ? ` → ${fmtDate(t.planned_end)}` : ''}
                                        {weekStatus === 'this-week' && !isComplete && <> · <strong>Bu Hafta</strong></>}
                                        {weekStatus === 'overdue' && !isComplete && <> · <strong>Gecikmeli</strong></>}
                                      </>
                                    ) : 'Tarih ekle'}
                                  </button>
                                </div>
                              </div>
                              <div className="item-actions">
                                <button className={`track-toggle ${t.track_per_learner ? 'on' : 'off'}`} onClick={() => toggleTrackPerLearner(t)}>
                                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                                  {t.track_per_learner ? 'Takip: Açık' : 'Takip Et'}
                                </button>
                                <button className="open-btn" onClick={() => selectTopic(t)}>
                                  Materyaller <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                                </button>
                                <button className="icon-btn" onClick={() => deleteTopic(t.id)}>
                                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                                </button>
                              </div>
                            </div>

                            {/* Inline date editor */}
                            {isEditing && (
                              <div className="date-edit-row">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0369A1" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                                <span style={{ fontSize: 11, color: '#555', fontWeight: 500 }}>Planlanan:</span>
                                <input className="date-input-sm" type="date" value={editStart} onChange={e => setEditStart(e.target.value)} />
                                <span style={{ fontSize: 11, color: '#AAA' }}>→</span>
                                <input className="date-input-sm" type="date" value={editEnd} onChange={e => setEditEnd(e.target.value)} />
                                <button className="date-save-btn" onClick={() => saveTopicDates(t.id)}>Kaydet</button>
                                <button className="date-cancel-btn" onClick={() => setEditingTopicDates(null)}>İptal</button>
                              </div>
                            )}

                            {/* Term assignment + done badge footer */}
                            {terms.length > 0 && (
                              <div className="topic-terms-row">
                                <span style={{ fontSize: 10, color: '#AAA', marginRight: 4, alignSelf: 'center' }}>Dönem:</span>
                                {terms.map(term => (
                                  <button key={term.id} className={`term-assign-pill ${assignedTermIds.includes(term.id) ? 'assigned' : ''}`} onClick={() => toggleTopicTerm(t.id, term.id)}>
                                    {term.name}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })
                  )}
                </div>
              )}

              {/* ══ PROGRESS ══ */}
              {activeTab === 'topics' && activeSubject && view === 'progress' && (
                <div>
                  <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: 13, color: '#AAA' }}>{activeSubject.name} — Öğretmen Geri Bildirimleri</div>
                    <button onClick={() => setView('list')} style={{ fontSize: 12, color: '#0369A1', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>← Alt Konulara Dön</button>
                  </div>
                  <div className="progress-table">
                    <div className="progress-table-head">
                      <span className="th">Alt Konu</span>
                      <span className="th">Planlanan</span>
                      <span className="th">İşlenme</span>
                      <span className="th">Durum</span>
                    </div>
                    {topics.map(t => {
                      const prog = progressData.find(p => p.topic_id === t.id)
                      const ucfg = UNDERSTANDING_CFG[prog?.understanding] || UNDERSTANDING_CFG.good
                      const weekStatus = getWeekLabel(t)
                      return (
                        <div key={t.id} className="progress-row">
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 500, color: '#1A1A1A' }}>{t.title}</div>
                            {prog?.feedback_note && <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{prog.feedback_note}</div>}
                          </div>
                          <div style={{ fontSize: 11, color: '#AAA' }}>
                            {t.planned_start ? <>{fmtDate(t.planned_start)}{t.planned_end ? `→${fmtDate(t.planned_end)}` : ''}</> : '—'}
                          </div>
                          <div style={{ fontSize: 12, color: '#AAA' }}>{prog?.taught_date || '—'}</div>
                          <div>
                            {prog?.is_completed ? (
                              <span className="understanding-badge" style={{ background: ucfg.bg, color: ucfg.color }}>{ucfg.label}</span>
                            ) : weekStatus === 'this-week' ? (
                              <span style={{ fontSize: 10, fontWeight: 500, background: '#ECFEFF', color: '#0E7490', border: '1px solid #22D3EE', padding: '2px 7px', borderRadius: 6 }}>Bu Hafta</span>
                            ) : weekStatus === 'overdue' ? (
                              <span style={{ fontSize: 10, fontWeight: 500, background: '#FEF2F2', color: '#DC2626', border: '1px solid #FCA5A5', padding: '2px 7px', borderRadius: 6 }}>Gecikmeli</span>
                            ) : (
                              <span style={{ fontSize: 11, color: '#CCC' }}>Bekliyor</span>
                            )}
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
                  <div style={{ marginBottom: 12, padding: '10px 14px', background: '#F0F9FF', border: '1px solid #BFDBFE', borderRadius: 10, fontSize: 12, color: '#1D4ED8', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <strong>{activeTopic.title}</strong>
                    {activeTopic.description && ` — ${activeTopic.description}`}
                    {activeTopic.planned_start && (
                      <span style={{ marginLeft: 'auto', fontSize: 11, background: '#EFF6FF', color: '#0369A1', border: '1px solid #BFDBFE', padding: '2px 8px', borderRadius: 6, fontWeight: 500 }}>
                        📅 {fmtDate(activeTopic.planned_start)}{activeTopic.planned_end ? ` → ${fmtDate(activeTopic.planned_end)}` : ''}
                      </span>
                    )}
                  </div>
                  <div className="add-form">
                    <div className="add-form-title">Materyal Ekle</div>
                    <div className="form-row" style={{ marginBottom: 8 }}>
                      <input className="form-input" value={newMaterialTitle} onChange={e => setNewMaterialTitle(e.target.value)} placeholder="Materyal başlığı..." />
                      <select className="form-select" value={newMaterialType} onChange={e => setNewMaterialType(e.target.value)}>
                        <option value="video">Video</option>
                        <option value="pdf">PDF</option>
                        <option value="link">Link</option>
                        <option value="note">Not</option>
                      </select>
                    </div>
                    <div className="form-row">
                      {newMaterialType !== 'note'
                        ? <input className="form-input" value={newMaterialUrl} onChange={e => setNewMaterialUrl(e.target.value)} placeholder="URL (https://...)" />
                        : <input className="form-input" value={newMaterialContent} onChange={e => setNewMaterialContent(e.target.value)} placeholder="Not içeriği..." />}
                      <button className="add-btn" onClick={addMaterial} disabled={saving}>+ Ekle</button>
                    </div>
                  </div>
                  {materials.length === 0 ? (
                    <div className="empty-block">Henüz materyal yok — video, PDF veya link ekleyin</div>
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
                              {m.url && <a href={m.url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: '#0369A1', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 6, padding: '3px 8px', textDecoration: 'none', fontWeight: 500 }}>Aç</a>}
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
            </div>
          )}
        </div>
      </div>
    </main>
  )
}