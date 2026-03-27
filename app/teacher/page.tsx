'use client'
import { useEffect, useState, useMemo } from 'react'
import { createClient } from '../lib/supabase'
import { useRouter } from 'next/navigation'

const DAYS = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const BOTTOM_TABS = [
  { key: 'dashboard',  label: 'Home',      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
  { key: 'attendance', label: 'Attend',    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg> },
  { key: 'curriculum', label: 'Lessons',   icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg> },
  { key: 'behaviour',  label: 'Behaviour', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
  { key: 'exams',      label: 'Exams',     icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
]

const MAT_ICONS: Record<string, any> = {
  video: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>,
  pdf:   <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
  link:  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
  note:  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
}
const MAT_COLORS: Record<string, { bg: string; c: string }> = {
  video: { bg: '#FEF2F2', c: '#DC2626' },
  pdf:   { bg: '#EFF6FF', c: '#1D4ED8' },
  link:  { bg: '#F0FDF4', c: '#15803D' },
  note:  { bg: '#FDF4FF', c: '#7E22CE' },
}
const UNDERSTAND = {
  good:      { bg: '#F0FDF4', c: '#15803D', label: 'İyi anladı', e: '✓' },
  mixed:     { bg: '#FEFCE8', c: '#A16207', label: 'Karışık',    e: '~' },
  difficult: { bg: '#FEF2F2', c: '#DC2626', label: 'Zorlandı',   e: '✗' },
}
const INCIDENT_TYPES = [
  { key: 'disruptive', label: 'Dersi Bölme',   c: '#DC2626', bg: '#FEF2F2' },
  { key: 'disrespect', label: 'Saygısızlık',   c: '#B45309', bg: '#FFF7ED' },
  { key: 'bullying',   label: 'Zorbalık',       c: '#7C3AED', bg: '#F5F3FF' },
  { key: 'phone',      label: 'Telefon/Cihaz',  c: '#0369A1', bg: '#EFF6FF' },
  { key: 'late',       label: 'Geç Gelme',      c: '#6B7280', bg: '#F9FAFB' },
  { key: 'homework',   label: 'Ödev Yapmama',   c: '#92400E', bg: '#FFFBEB' },
  { key: 'other',      label: 'Diğer',          c: '#374151', bg: '#F3F4F6' },
]
const PRAISE_TYPES = [
  { key: 'outstanding', label: 'Üstün Başarı',   c: '#15803D', bg: '#F0FDF4' },
  { key: 'helpful',     label: 'Yardımseverlik', c: '#0369A1', bg: '#EFF6FF' },
  { key: 'improvement', label: 'Gelişim',         c: '#7E22CE', bg: '#FDF4FF' },
  { key: 'leadership',  label: 'Liderlik',        c: '#B45309', bg: '#FFFBEB' },
  { key: 'creativity',  label: 'Yaratıcılık',     c: '#0E7490', bg: '#ECFEFF' },
  { key: 'other',       label: 'Diğer',           c: '#374151', bg: '#F3F4F6' },
]

function fmt(d: string) { return d ? new Date(d).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }) : '' }
function fmtDT(d: string) { return d ? new Date(d).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '' }

function weekBounds() {
  const now = new Date()
  const s = new Date(now); s.setDate(now.getDate() - ((now.getDay() + 6) % 7)); s.setHours(0, 0, 0, 0)
  const e = new Date(s); e.setDate(s.getDate() + 6); e.setHours(23, 59, 59, 999)
  return { ws: s, we: e }
}

function topicStatus(t: any): 'this-week' | 'overdue' | 'upcoming' | 'no-date' {
  if (!t.planned_start) return 'no-date'
  const { ws, we } = weekBounds()
  const s = new Date(t.planned_start), e = t.planned_end ? new Date(t.planned_end) : s
  if (e < ws) return 'overdue'
  if (s <= we && e >= ws) return 'this-week'
  return 'upcoming'
}

export default function TeacherDashboard() {
  const [teacher, setTeacher]         = useState<any>(null)
  const [isHead, setIsHead]           = useState(false)
  const [activeTab, setActiveTab]     = useState('dashboard')
  const [activeYearName, setActiveYearName] = useState<string | null>(null)

  // dashboard
  const [todaySessions, setTodaySessions] = useState<any[]>([])
  const [myClasses, setMyClasses]         = useState<any[]>([])
  const [attStats, setAttStats]           = useState<any[]>([])
  const [upcomingExams, setUpcomingExams] = useState<any[]>([])

  // attendance
  const [selSession, setSelSession] = useState<any>(null)
  const [learners, setLearners]     = useState<any[]>([])
  const [att, setAtt]               = useState<Record<string, string>>({})
  const [hw, setHw]                 = useState<Record<string, boolean>>({})
  const [noteMap, setNoteMap]       = useState<Record<string, string>>({})
  const [saving, setSaving]         = useState(false)
  const [saved, setSaved]           = useState(false)

  // exams
  const [exams, setExams]           = useState<any[]>([])
  const [allClasses, setAllClasses] = useState<any[]>([])
  const [showExamForm, setShowExamForm] = useState(false)
  const [eTitle, setETitle] = useState('')
  const [eDate, setEDate]   = useState('')
  const [eClass, setEClass] = useState('')
  const [eDesc, setEDesc]   = useState('')
  const [eSaving, setESaving] = useState(false)

  // curriculum
  const [subjects, setSubjects]       = useState<any[]>([])
  const [topics, setTopics]           = useState<any[]>([])
  const [progress, setProgress]       = useState<any[]>([])
  const [materials, setMaterials]     = useState<any[]>([])
  const [terms, setTerms]             = useState<any[]>([])
  const [topicTerms, setTopicTerms]   = useState<any[]>([])
  const [currView, setCurrView]       = useState<'list' | 'detail'>('list')
  const [currFilter, setCurrFilter]   = useState<'week' | 'term' | 'all'>('week')
  const [activeTerm, setActiveTerm]   = useState<any>(null)
  const [activeGrade, setActiveGrade] = useState<string | null>(null)
  const [activeSub, setActiveSub]     = useState<string | null>(null)
  const [selTopic, setSelTopic]       = useState<any>(null)
  const [fbModal, setFbModal]         = useState<any>(null)
  const [fbNote, setFbNote]           = useState('')
  const [fbU, setFbU]                 = useState<'good' | 'mixed' | 'difficult'>('good')
  const [fbSaving, setFbSaving]       = useState(false)

  // behaviour
  const [behTab, setBehTab]               = useState<'incidents' | 'praise'>('incidents')
  const [allLearners, setAllLearners]     = useState<any[]>([])
  const [incidents, setIncidents]         = useState<any[]>([])
  const [praises, setPraises]             = useState<any[]>([])
  const [behClassFilter, setBehClassFilter] = useState<string | null>(null)
  const [behModal, setBehModal]           = useState<'incident' | 'praise' | null>(null)
  const [behLearner, setBehLearner]       = useState('')
  const [behType, setBehType]             = useState('')
  const [behNote, setBehNote]             = useState('')
  const [behSaving, setBehSaving]         = useState(false)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }
    const { data: u } = await supabase.from('users').select('*').eq('auth_id', user.id).single()
    if (!u || u.role !== 'teacher') { router.push('/'); return }
    setTeacher(u); setIsHead(u.is_head_teacher || false)
    // Load active year name
    const { data: yr } = await supabase.from('academic_years').select('name').eq('is_active', true).single()
    if (yr) setActiveYearName(yr.name)
    await Promise.all([loadDashboard(u), loadCurriculum(u), loadBehaviour(u)])
  }

  async function loadDashboard(t: any) {
    const day = new Date().getDay() === 0 ? 7 : new Date().getDay()
    const [{ data: sess }, { data: cls }, { data: exms }] = await Promise.all([
      t.is_head_teacher
        ? supabase.from('timetable').select('*, classes(name,id), users(full_name,display_name)').eq('day_of_week', day).order('start_time')
        : supabase.from('timetable').select('*, classes(name,id), users(full_name,display_name)').eq('teacher_id', t.id).eq('day_of_week', day).order('start_time'),
      t.is_head_teacher
        ? supabase.from('classes').select('*').eq('class_type', 'secular').order('name')
        : supabase.from('timetable').select('classes(id,name)').eq('teacher_id', t.id),
      supabase.from('exams').select('*, classes(name)').eq('is_active', true).gte('exam_date', new Date().toISOString().split('T')[0]).order('exam_date').limit(5),
    ])
    setTodaySessions(sess || []); setUpcomingExams(exms || [])
    const classes = t.is_head_teacher
      ? (cls || [])
      : [...new Map((cls || []).map((s: any) => [s.classes?.id, s.classes]).filter(([k]: any) => k)).values()]
    setMyClasses(classes); setAllClasses(classes)
    if (classes.length > 0) setEClass((classes[0] as any).id)
    const eq = t.is_head_teacher
      ? supabase.from('exams').select('*, classes(name)').eq('is_active', true).order('exam_date')
      : supabase.from('exams').select('*, classes(name)').eq('teacher_id', t.id).eq('is_active', true).order('exam_date')
    const { data: ae } = await eq; setExams(ae || [])
    const stats: any[] = []
    for (const c of classes) {
      const { data: lc } = await supabase.from('learner_classes').select('learner_id').eq('class_id', (c as any).id)
      const ids = lc?.map((l: any) => l.learner_id) || []
      if (!ids.length) { stats.push({ cls: c, pct: 0, n: 0 }); continue }
      const { data: a } = await supabase.from('attendance').select('status').in('learner_id', ids)
      const tot = a?.length || 0, pr = a?.filter((x: any) => x.status === 'present' || x.status === 'late').length || 0
      stats.push({ cls: c, pct: tot > 0 ? Math.round((pr / tot) * 100) : 0, n: ids.length })
    }
    setAttStats(stats)
  }

  async function loadCurriculum(t: any) {
    const { data: tt } = await supabase.from('timetable').select('class_id').eq('teacher_id', t.id)
    const cids = [...new Set((tt || []).map((r: any) => r.class_id))]
    if (!cids.length) return
    const { data: subs } = await supabase.from('curriculum_subjects').select('*, classes(id,name)').in('class_id', cids).eq('is_active', true).order('order_num')
    setSubjects(subs || [])
    if (!subs?.length) return
    const sids = subs.map((s: any) => s.id)
    const { data: tops } = await supabase.from('curriculum_topics').select('*, curriculum_subjects(id,name,class_id,classes(id,name))').in('subject_id', sids).eq('is_active', true).order('order_num')
    setTopics(tops || [])
    if (tops?.length) {
      const tids = tops.map((tp: any) => tp.id)
      const [{ data: prog }, { data: ttMap }] = await Promise.all([
        supabase.from('curriculum_progress').select('*').in('topic_id', tids),
        supabase.from('curriculum_topic_terms').select('*').in('topic_id', tids),
      ])
      setProgress(prog || []); setTopicTerms(ttMap || [])
    }
    const { data: trms } = await supabase.from('curriculum_terms').select('*').in('class_id', cids).eq('is_active', true).order('order_num')
    setTerms(trms || []); if (trms?.length) setActiveTerm(trms[0])
  }

  async function loadBehaviour(t: any) {
    const { data: tt } = await supabase.from('timetable').select('class_id').eq('teacher_id', t.id)
    const cids = [...new Set((tt || []).map((r: any) => r.class_id))]
    if (!cids.length) return
    const { data: lc } = await supabase.from('learner_classes').select('learner_id,class_id,learners(id,full_name),classes(name)').in('class_id', cids)
    const ll = (lc || []).map((x: any) => ({ id: x.learners?.id, full_name: x.learners?.full_name, class_id: x.class_id, class_name: x.classes?.name })).filter((l: any) => l.id)
    setAllLearners(ll)
    const ids = ll.map((l: any) => l.id)
    if (!ids.length) return
    const [{ data: inc }, { data: pr }] = await Promise.all([
      supabase.from('behaviour_incidents').select('*, learners(full_name)').in('learner_id', ids).order('created_at', { ascending: false }),
      supabase.from('behaviour_praise').select('*, learners(full_name)').in('learner_id', ids).order('created_at', { ascending: false }),
    ])
    setIncidents(inc || []); setPraises(pr || [])
  }

  async function saveBeh() {
    if (!behLearner || !behType || !teacher) return
    setBehSaving(true)
    await supabase.from(behModal === 'incident' ? 'behaviour_incidents' : 'behaviour_praise')
      .insert({ learner_id: behLearner, teacher_id: teacher.id, type: behType, note: behNote.trim() || null })
    await loadBehaviour(teacher)
    setBehModal(null); setBehLearner(''); setBehType(''); setBehNote(''); setBehSaving(false)
  }

  async function delRec(table: string, id: string) {
    if (!confirm('Silmek istiyor musunuz?')) return
    await supabase.from(table).delete().eq('id', id)
    if (table === 'behaviour_incidents') setIncidents(p => p.filter(r => r.id !== id))
    else setPraises(p => p.filter(r => r.id !== id))
  }

  const grades = useMemo(() => {
    const m = new Map<string, any>()
    subjects.forEach(s => { if (s.classes) m.set(s.classes.id, s.classes) })
    return [...m.values()]
  }, [subjects])

  const gradeSubjects = useMemo(() =>
    activeGrade ? subjects.filter(s => s.class_id === activeGrade) : [], [subjects, activeGrade])

  function filteredTopics() {
    let t = topics
    if (activeGrade) t = t.filter(x => x.curriculum_subjects?.class_id === activeGrade)
    if (activeSub) t = t.filter(x => x.subject_id === activeSub)
    if (currFilter === 'week') {
      const { ws, we } = weekBounds()
      t = t.filter(x => {
        if (!x.planned_start) return false
        const s = new Date(x.planned_start), e = x.planned_end ? new Date(x.planned_end) : s
        return s <= we && e >= ws
      })
    } else if (currFilter === 'term' && activeTerm) {
      const ids = new Set(topicTerms.filter(tt => tt.term_id === activeTerm.id).map(tt => tt.topic_id))
      t = t.filter(x => ids.has(x.id))
    }
    return t
  }

  const ft       = filteredTopics()
  const thisWk   = topics.filter(t => topicStatus(t) === 'this-week').length
  const done     = progress.filter(p => p.is_completed).length
  const overdue  = topics.filter(t => topicStatus(t) === 'overdue' && !progress.find(p => p.topic_id === t.id && p.is_completed)).length

  async function openDetail(topic: any) {
    setSelTopic(topic); setCurrView('detail')
    const { data } = await supabase.from('curriculum_materials').select('*').eq('topic_id', topic.id).order('order_num')
    setMaterials(data || [])
  }

  function openFb(topic: any) {
    const ex = progress.find(p => p.topic_id === topic.id)
    setFbU(ex?.understanding || 'good'); setFbNote(ex?.feedback_note || ''); setFbModal(topic)
  }

  async function saveFb() {
    if (!fbModal || !teacher) return
    setFbSaving(true)
    const ex = progress.find(p => p.topic_id === fbModal.id)
    const payload = { topic_id: fbModal.id, teacher_id: teacher.id, is_completed: true, completed_at: new Date().toISOString(), feedback_note: fbNote.trim() || null, understanding: fbU, taught_date: new Date().toISOString().split('T')[0] }
    if (ex) { await supabase.from('curriculum_progress').update(payload).eq('id', ex.id); setProgress(p => p.map(x => x.id === ex.id ? { ...x, ...payload } : x)) }
    else { const { data } = await supabase.from('curriculum_progress').insert(payload).select().single(); if (data) setProgress(p => [...p, data]) }
    setFbModal(null); setFbSaving(false)
  }

  async function unmark(topicId: string) {
    const ex = progress.find(p => p.topic_id === topicId); if (!ex) return
    await supabase.from('curriculum_progress').update({ is_completed: false, completed_at: null }).eq('id', ex.id)
    setProgress(p => p.map(x => x.id === ex.id ? { ...x, is_completed: false } : x))
  }

  async function selSess(s: any) {
    setSelSession(s); setSaved(false)
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase.from('learner_classes').select('*, learners(id,full_name)').eq('class_id', s.classes.id)
    const list = data?.map((lc: any) => lc.learners).filter(Boolean) || []; setLearners(list)
    const [{ data: a }, { data: h }, { data: n }] = await Promise.all([
      supabase.from('attendance').select('*').eq('timetable_id', s.id).eq('attendance_date', today),
      supabase.from('homework').select('*').eq('timetable_id', s.id).eq('attendance_date', today),
      supabase.from('notes').select('*').eq('timetable_id', s.id),
    ])
    const am: any = {}, hm: any = {}, nm: any = {}
    list.forEach((l: any) => { am[l.id] = 'absent' })
    a?.forEach((x: any) => { am[x.learner_id] = x.status })
    h?.forEach((x: any) => { hm[x.learner_id] = x.submitted })
    n?.forEach((x: any) => { nm[x.learner_id] = x.content })
    setAtt(am); setHw(hm); setNoteMap(nm)
  }

  async function saveAtt() {
    if (!selSession || !teacher) return
    setSaving(true)
    const today = new Date().toISOString().split('T')[0]
    for (const l of learners) {
      await supabase.from('attendance').upsert({ timetable_id: selSession.id, learner_id: l.id, attendance_date: today, status: att[l.id] || 'absent' }, { onConflict: 'timetable_id,learner_id,attendance_date' })
      await supabase.from('homework').upsert({ timetable_id: selSession.id, learner_id: l.id, attendance_date: today, submitted: hw[l.id] || false }, { onConflict: 'timetable_id,learner_id,attendance_date' })
      if (noteMap[l.id]?.trim()) await supabase.from('notes').upsert({ timetable_id: selSession.id, learner_id: l.id, teacher_id: teacher.id, content: noteMap[l.id].trim() }, { onConflict: 'timetable_id,learner_id' })
    }
    setSaving(false); setSaved(true)
  }

  async function addExam() {
    if (!eTitle.trim() || !eDate || !eClass) return
    setESaving(true)
    await supabase.from('exams').insert({ title: eTitle.trim(), exam_date: eDate, class_id: eClass, teacher_id: teacher?.id, description: eDesc.trim() || null })
    setETitle(''); setEDate(''); setEDesc(''); setShowExamForm(false)
    const q = isHead ? supabase.from('exams').select('*, classes(name)').eq('is_active', true).order('exam_date') : supabase.from('exams').select('*, classes(name)').eq('teacher_id', teacher?.id).eq('is_active', true).order('exam_date')
    const { data } = await q; setExams(data || []); setESaving(false)
  }

  function switchTab(k: string) { setActiveTab(k); setSelSession(null); setSaved(false); setCurrView('list') }

  const todayName = DAYS[new Date().getDay() === 0 ? 7 : new Date().getDay()]
  const dateFmt   = new Date().toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const todayStr  = new Date().toISOString().split('T')[0]
  const SC: any   = { present: { bg: '#22C55E', t: 'white' }, late: { bg: '#EAB308', t: 'white' }, absent: { bg: '#EF4444', t: 'white' } }

  const behClasses = useMemo(() => [...new Map(allLearners.map(l => [l.class_id, { id: l.class_id, name: l.class_name }])).values()], [allLearners])
  const filtL   = useMemo(() => behClassFilter ? allLearners.filter(l => l.class_id === behClassFilter) : allLearners, [allLearners, behClassFilter])
  const filtInc = useMemo(() => behClassFilter ? incidents.filter(i => allLearners.find(l => l.id === i.learner_id && l.class_id === behClassFilter)) : incidents, [incidents, behClassFilter, allLearners])
  const filtPr  = useMemo(() => behClassFilter ? praises.filter(i => allLearners.find(l => l.id === i.learner_id && l.class_id === behClassFilter)) : praises, [praises, behClassFilter, allLearners])

  return (
    <main style={{ minHeight: '100vh', background: '#F8F7F4', fontFamily: "'DM Sans',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Serif+Display&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        .topbar{background:#fff;border-bottom:1px solid #EFEFED;padding:0 20px;height:50px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:30;}
        .brand{display:flex;align-items:center;gap:8px;}
        .brand-icon{width:26px;height:26px;background:#1D4ED8;border-radius:6px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
        .brand-name{font-size:14px;font-weight:600;color:#1A1A1A;}
        .tbar-r{display:flex;align-items:center;gap:6px;}
        .yr-chip{display:inline-flex;align-items:center;gap:4px;background:#FFF7ED;border:1px solid #FED7AA;border-radius:7px;padding:3px 9px;font-size:10px;font-weight:700;color:#C2410C;white-space:nowrap;}
        .uchip{display:flex;align-items:center;gap:6px;background:#F5F5F3;border-radius:100px;padding:2px 9px 2px 2px;}
        .av{width:22px;height:22px;background:#1D4ED8;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:9px;font-weight:700;flex-shrink:0;}
        .uname{font-size:11px;color:#444;font-weight:500;}
        .hchip{font-size:8px;font-weight:700;background:#FFF7ED;color:#C2410C;border:1px solid #FED7AA;padding:2px 5px;border-radius:4px;text-transform:uppercase;letter-spacing:.05em;}
        .logout{font-size:11px;color:#999;background:none;border:none;cursor:pointer;padding:4px 7px;border-radius:6px;display:flex;align-items:center;gap:3px;font-family:'DM Sans',sans-serif;}
        .logout:hover{background:#FEE2E2;color:#DC2626;}
        .tab-bar{background:#fff;border-bottom:1px solid #EFEFED;padding:0 20px;display:flex;gap:0;overflow-x:auto;scrollbar-width:none;}
        .tab-bar::-webkit-scrollbar{display:none;}
        .tab-btn{padding:12px 13px;font-size:12px;font-weight:500;color:#999;background:none;border:none;border-bottom:2px solid transparent;cursor:pointer;font-family:'DM Sans',sans-serif;display:flex;align-items:center;gap:5px;white-space:nowrap;transition:all .12s;}
        .tab-btn.active{color:#1D4ED8;border-bottom-color:#1D4ED8;}
        .bnav{display:none;position:fixed;bottom:0;left:0;right:0;z-index:40;background:rgba(255,255,255,.97);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border-top:1px solid #EFEFED;padding:4px 0 calc(env(safe-area-inset-bottom,0px) + 4px);}
        .bnav-inner{display:flex;max-width:500px;margin:0 auto;}
        .bnav-btn{flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;padding:5px 2px;border:none;background:none;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:8px;font-weight:700;color:#C0BDB8;text-transform:uppercase;letter-spacing:.03em;position:relative;}
        .bnav-btn.active{color:#1D4ED8;}
        .bnav-btn.active svg{stroke:#1D4ED8;}
        .bnav-btn.active::after{content:'';position:absolute;bottom:-4px;left:50%;transform:translateX(-50%);width:16px;height:2px;background:#1D4ED8;border-radius:2px 2px 0 0;}
        .wrap{max-width:860px;margin:0 auto;padding:18px 16px 28px;}
        .h1{font-family:'DM Serif Display',serif;font-size:19px;color:#1A1A1A;margin-bottom:2px;}
        .sub{font-size:11px;color:#AAA;}
        .hrow{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:16px;flex-wrap:wrap;}
        .s3{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin-bottom:16px;}
        .scard{background:#fff;border:1px solid #EFEFED;border-radius:11px;padding:12px;}
        .sicon{width:28px;height:28px;border-radius:7px;display:flex;align-items:center;justify-content:center;margin-bottom:8px;}
        .sn{font-size:22px;font-weight:500;color:#1A1A1A;line-height:1;}
        .sl{font-size:9px;color:#AAA;margin-top:3px;text-transform:uppercase;letter-spacing:.05em;}
        .card{background:#fff;border:1px solid #EFEFED;border-radius:11px;overflow:hidden;margin-bottom:12px;}
        .ch{padding:11px 14px;border-bottom:1px solid #F5F5F3;display:flex;align-items:center;justify-content:space-between;gap:6px;}
        .ct{font-size:11px;font-weight:700;color:#1A1A1A;text-transform:uppercase;letter-spacing:.04em;}
        .lr{display:flex;align-items:center;justify-content:space-between;padding:9px 14px;border-bottom:1px solid #F8F8F6;transition:background .1s;gap:8px;}
        .lr:last-child{border-bottom:none;}
        .lr:hover{background:#FAFAF8;}
        .rn{font-size:13px;font-weight:500;color:#1A1A1A;}
        .rs{font-size:11px;color:#AAA;margin-top:1px;}
        .pbar{display:flex;align-items:center;gap:5px;}
        .btrack{width:55px;height:3px;background:#F0F0EE;border-radius:2px;overflow:hidden;}
        .bfill{height:100%;border-radius:2px;}
        .pt{font-size:10px;font-weight:700;min-width:26px;text-align:right;}
        .bdg{font-size:9px;font-weight:700;padding:2px 6px;border-radius:5px;}
        .go{font-size:10px;font-weight:600;background:#EFF6FF;color:#1D4ED8;border:1px solid #BFDBFE;border-radius:5px;padding:3px 8px;cursor:pointer;font-family:'DM Sans',sans-serif;white-space:nowrap;}
        .sess-btn{width:100%;background:#fff;border:1px solid #EFEFED;border-radius:9px;padding:12px 14px;text-align:left;cursor:pointer;display:flex;align-items:center;justify-content:space-between;margin-bottom:7px;font-family:'DM Sans',sans-serif;transition:all .12s;}
        .sess-btn:hover{border-color:#BFDBFE;background:#EFF6FF;}
        .bk{font-size:11px;color:#AAA;background:none;border:none;cursor:pointer;font-family:'DM Sans',sans-serif;display:flex;align-items:center;gap:3px;margin-bottom:9px;}
        .bk:hover{color:#555;}
        .atthr{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:16px;}
        .svbtn{background:#1D4ED8;color:#fff;border:none;border-radius:7px;padding:7px 16px;font-size:12px;font-weight:700;cursor:pointer;font-family:'DM Sans',sans-serif;white-space:nowrap;flex-shrink:0;}
        .svbtn:disabled{opacity:.5;}
        .lcard{background:#fff;border:1.5px solid #EFEFED;border-radius:9px;padding:11px 12px;margin-bottom:6px;}
        .ltop{display:flex;align-items:center;justify-content:space-between;margin-bottom:7px;gap:5px;flex-wrap:wrap;}
        .lname{font-size:12px;font-weight:600;color:#1A1A1A;display:flex;align-items:center;gap:6px;}
        .sdot{width:7px;height:7px;border-radius:50%;flex-shrink:0;}
        .sbtns{display:flex;gap:3px;}
        .sbtn{padding:4px 9px;border-radius:6px;border:1.5px solid transparent;cursor:pointer;font-size:10px;font-weight:700;font-family:'DM Sans',sans-serif;transition:all .1s;}
        .brow2{display:flex;gap:8px;margin-top:6px;align-items:center;flex-wrap:wrap;}
        .hwck{display:flex;align-items:center;gap:4px;font-size:11px;color:#666;cursor:pointer;white-space:nowrap;}
        .ni{flex:1;min-width:80px;height:28px;border:1px solid #F0F0EE;border-radius:6px;padding:0 8px;font-size:11px;font-family:'DM Sans',sans-serif;color:#555;background:#FAFAF8;outline:none;}
        .ni:focus{border-color:#1D4ED8;background:#fff;}
        .ni::placeholder{color:#CCC;}
        .cfrow{display:flex;gap:4px;flex-wrap:wrap;align-items:center;margin-bottom:12px;}
        .flbl{font-size:9px;font-weight:700;color:#AAA;text-transform:uppercase;letter-spacing:.05em;margin-right:2px;}
        .fp{padding:4px 10px;border-radius:7px;border:1px solid #EFEFED;background:#fff;font-size:11px;font-weight:600;color:#666;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all .1s;}
        .fp:hover{border-color:#1D4ED8;color:#1D4ED8;}
        .fp.on{background:#1D4ED8;color:#fff;border-color:#1D4ED8;}
        .fp.term{background:#EFF6FF;color:#0369A1;border-color:#BFDBFE;}
        .fp.term.on{background:#0369A1;border-color:#0369A1;}
        .gtabs{display:flex;gap:0;overflow-x:auto;scrollbar-width:none;border-bottom:1px solid #EFEFED;background:#fff;border-radius:10px 10px 0 0;}
        .gtabs::-webkit-scrollbar{display:none;}
        .gtab{padding:8px 13px;font-size:11px;font-weight:600;color:#AAA;background:none;border:none;border-bottom:2px solid transparent;cursor:pointer;font-family:'DM Sans',sans-serif;white-space:nowrap;transition:all .12s;}
        .gtab.on{color:#1A1A1A;border-bottom-color:#1A1A1A;}
        .spills{display:flex;gap:4px;flex-wrap:wrap;padding:8px 12px;background:#FAFAF8;border-bottom:1px solid #EFEFED;}
        .sp{padding:3px 9px;border-radius:5px;border:1px solid #EFEFED;background:#fff;font-size:10px;font-weight:600;color:#888;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all .1s;}
        .sp:hover{color:#1A1A1A;border-color:#CCC;}
        .sp.on{background:#1A1A1A;color:#fff;border-color:#1A1A1A;}
        .tcard{background:#fff;border:1px solid #EFEFED;border-radius:9px;margin-bottom:7px;overflow:hidden;cursor:pointer;transition:all .12s;}
        .tcard:hover{box-shadow:0 2px 8px rgba(0,0,0,.06);transform:translateY(-1px);}
        .tcard.tw{border-left:3px solid #0284C7;}
        .tcard.ov{border-left:3px solid #DC2626;}
        .tcard.dn{border-left:3px solid #16A34A;background:#FDFFFE;}
        .tcin{padding:11px 13px;display:flex;align-items:center;gap:9px;}
        .tcdot{width:8px;height:8px;border-radius:50%;flex-shrink:0;}
        .tci{flex:1;min-width:0;}
        .tctit{font-size:13px;font-weight:500;color:#1A1A1A;}
        .tcmeta{font-size:10px;color:#AAA;margin-top:3px;display:flex;gap:5px;flex-wrap:wrap;align-items:center;}
        .sc{font-size:8px;font-weight:800;padding:2px 6px;border-radius:4px;text-transform:uppercase;letter-spacing:.04em;flex-shrink:0;}
        .sc-tw{background:#E0F2FE;color:#0284C7;}
        .sc-ov{background:#FEE2E2;color:#DC2626;}
        .sc-dn{background:#DCFCE7;color:#16A34A;}
        .sc-up{background:#F5F5F3;color:#888;}
        .dtit{font-family:'DM Serif Display',serif;font-size:17px;color:#1A1A1A;margin-bottom:2px;}
        .dsub{font-size:11px;color:#AAA;margin-bottom:12px;}
        .dban{display:flex;align-items:center;gap:6px;background:#EFF6FF;border:1px solid #BFDBFE;border-radius:8px;padding:8px 11px;margin-bottom:14px;font-size:11px;color:#1D4ED8;font-weight:600;flex-wrap:wrap;}
        .mitem{background:#fff;border:1px solid #EFEFED;border-radius:8px;padding:9px 11px;display:flex;align-items:center;gap:7px;margin-bottom:6px;}
        .mico{width:28px;height:28px;border-radius:6px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
        .mname{font-size:12px;font-weight:500;color:#1A1A1A;}
        .mlink{font-size:10px;color:#0369A1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:200px;}
        .olink{font-size:10px;font-weight:700;background:#EFF6FF;color:#0369A1;border:1px solid #BFDBFE;border-radius:5px;padding:3px 7px;text-decoration:none;white-space:nowrap;flex-shrink:0;}
        .fbox{background:#F0FDF4;border:1px solid #BBF7D0;border-radius:9px;padding:11px 13px;margin-top:12px;}
        .fbtit{font-size:10px;font-weight:700;color:#15803D;margin-bottom:6px;display:flex;align-items:center;gap:4px;}
        .dacts{display:flex;gap:6px;flex-wrap:wrap;margin-top:12px;}
        .act{display:flex;align-items:center;gap:4px;border:none;border-radius:7px;padding:8px 14px;font-size:11px;font-weight:700;cursor:pointer;font-family:'DM Sans',sans-serif;}
        .bseg{display:flex;background:#F5F5F3;border-radius:9px;padding:3px;gap:2px;margin-bottom:14px;}
        .bseg-btn{flex:1;padding:6px;border:none;border-radius:7px;font-size:11px;font-weight:700;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all .1s;background:transparent;color:#888;}
        .bseg-btn.on{background:#fff;color:#1A1A1A;box-shadow:0 1px 3px rgba(0,0,0,.08);}
        .bcf{display:flex;gap:4px;flex-wrap:wrap;margin-bottom:12px;}
        .bab{display:flex;align-items:center;gap:4px;border:none;border-radius:7px;padding:7px 12px;font-size:11px;font-weight:700;cursor:pointer;font-family:'DM Sans',sans-serif;}
        .brec{background:#fff;border:1px solid #EFEFED;border-radius:9px;padding:11px 13px;margin-bottom:7px;}
        .brh{display:flex;align-items:flex-start;justify-content:space-between;gap:6px;margin-bottom:4px;}
        .blrn{font-size:13px;font-weight:500;color:#1A1A1A;}
        .bctag{font-size:9px;background:#F5F5F3;color:#888;padding:1px 5px;border-radius:3px;font-weight:600;}
        .btyp{font-size:9px;font-weight:800;padding:2px 7px;border-radius:5px;}
        .bnote{font-size:11px;color:#666;margin-top:3px;line-height:1.5;}
        .btime{font-size:9px;color:#CCC;margin-top:2px;}
        .delb{background:none;border:none;cursor:pointer;color:#DDD;padding:2px;}
        .delb:hover{color:#DC2626;}
        .mov{position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:100;display:flex;align-items:flex-end;justify-content:center;}
        .mo{background:#fff;border-radius:18px 18px 0 0;padding:22px 18px calc(env(safe-area-inset-bottom,0px) + 22px);width:100%;max-width:480px;}
        @media(min-width:600px){.mov{align-items:center;padding:20px}.mo{border-radius:14px;max-width:420px}}
        .mtit{font-size:14px;font-weight:700;color:#1A1A1A;margin-bottom:1px;}
        .msub{font-size:11px;color:#AAA;margin-bottom:16px;}
        .mlbl{font-size:9px;font-weight:800;color:#555;margin-bottom:5px;text-transform:uppercase;letter-spacing:.05em;}
        .msel{width:100%;height:36px;border:1px solid #EFEFED;border-radius:8px;padding:0 9px;font-size:12px;font-family:'DM Sans',sans-serif;color:#1A1A1A;background:#fff;outline:none;margin-bottom:12px;}
        .msel:focus{border-color:#1A1A1A;}
        .tgrid{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:12px;}
        .tpill{padding:7px 8px;border-radius:8px;border:1.5px solid #EFEFED;cursor:pointer;font-size:11px;font-weight:600;font-family:'DM Sans',sans-serif;text-align:center;transition:all .1s;background:#fff;color:#555;}
        .tpill.sel{border-width:2px;font-weight:800;}
        .mta{width:100%;border:1px solid #EFEFED;border-radius:8px;padding:9px 10px;font-size:12px;font-family:'DM Sans',sans-serif;color:#1A1A1A;resize:none;min-height:72px;outline:none;line-height:1.5;}
        .mta:focus{border-color:#1A1A1A;}
        .mta::placeholder{color:#CCC;}
        .macts{display:flex;gap:7px;justify-content:flex-end;margin-top:14px;}
        .mcan{padding:7px 12px;border:1px solid #EFEFED;border-radius:7px;background:#fff;font-size:11px;cursor:pointer;font-family:'DM Sans',sans-serif;color:#666;}
        .msave{padding:7px 18px;border:none;border-radius:7px;font-size:11px;font-weight:800;cursor:pointer;font-family:'DM Sans',sans-serif;color:#fff;}
        .msave:disabled{opacity:.5;}
        .upills{display:flex;gap:6px;margin-bottom:14px;}
        .upill{flex:1;padding:8px 5px;border-radius:8px;border:1.5px solid #EFEFED;cursor:pointer;text-align:center;font-size:11px;font-weight:700;font-family:'DM Sans',sans-serif;color:#AAA;transition:all .1s;}
        .upill.good.sel{background:#F0FDF4;border-color:#16A34A;color:#15803D;}
        .upill.mixed.sel{background:#FEFCE8;border-color:#A16207;color:#A16207;}
        .upill.diff.sel{background:#FEF2F2;border-color:#DC2626;color:#DC2626;}
        .fcard{background:#fff;border:1px solid #EFEFED;border-radius:11px;padding:14px;margin-bottom:12px;}
        .fgrid{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
        .fg{display:flex;flex-direction:column;gap:3px;}
        .flb{font-size:9px;font-weight:800;color:#888;text-transform:uppercase;letter-spacing:.04em;}
        .fin,.fse{height:34px;border:1px solid #EFEFED;border-radius:7px;padding:0 9px;font-size:12px;font-family:'DM Sans',sans-serif;color:#1A1A1A;background:#fff;outline:none;}
        .fin:focus,.fse:focus{border-color:#1D4ED8;}
        .fin::placeholder{color:#CCC;}
        .fas2{display:flex;justify-content:flex-end;gap:6px;margin-top:8px;}
        .abtn{display:flex;align-items:center;gap:4px;background:#1A1A1A;color:#fff;border:none;border-radius:7px;padding:6px 11px;font-size:10px;font-weight:800;cursor:pointer;font-family:'DM Sans',sans-serif;white-space:nowrap;}
        .ecd{font-size:11px;font-weight:800;}
        .db2{background:none;border:none;cursor:pointer;color:#DDD;padding:2px;}
        .db2:hover{color:#DC2626;}
        .empty{padding:24px;text-align:center;color:#CCC;font-size:12px;}
        @media(min-width:769px){.bnav{display:none!important}.tab-bar{display:flex}}
        @media(max-width:768px){
          .tab-bar{display:none}.bnav{display:block}
          .wrap{padding:12px 12px 76px}
          .s3{gap:6px}.scard{padding:10px 8px}.sn{font-size:18px}
          .sicon{width:24px;height:24px;margin-bottom:6px}
          .lr{padding:8px 11px}.ch{padding:9px 11px}
          .uname{display:none}.hchip{display:none}
          .fgrid{grid-template-columns:1fr}
          .atthr{flex-direction:column}
          .tgrid{grid-template-columns:1fr 1fr}
        }
      `}</style>

      {/* Feedback modal */}
      {fbModal && (
        <div className="mov" onClick={e => { if (e.target === e.currentTarget) setFbModal(null) }}>
          <div className="mo">
            <div className="mtit">Ders Geri Bildirimi</div>
            <div className="msub">{fbModal.title}</div>
            <div className="mlbl">Sınıfın Genel Anlayışı</div>
            <div className="upills">
              {(['good', 'mixed', 'difficult'] as const).map(u => (
                <button key={u} className={`upill ${u === 'difficult' ? 'diff' : u} ${fbU === u ? 'sel' : ''}`} onClick={() => setFbU(u)}>
                  {u === 'good' ? '✓ İyi' : u === 'mixed' ? '~ Karışık' : '✗ Zor'}
                </button>
              ))}
            </div>
            <div className="mlbl" style={{ marginBottom: 5 }}>Not</div>
            <textarea className="mta" placeholder="Bu derste neler öğrenildi..." value={fbNote} onChange={e => setFbNote(e.target.value)} rows={3} />
            <div className="macts">
              <button className="mcan" onClick={() => setFbModal(null)}>İptal</button>
              <button className="msave" style={{ background: '#15803D' }} onClick={saveFb} disabled={fbSaving}>{fbSaving ? '...' : 'Tamamlandı Kaydet'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Behaviour modal */}
      {behModal && (
        <div className="mov" onClick={e => { if (e.target === e.currentTarget) setBehModal(null) }}>
          <div className="mo">
            <div className="mtit">{behModal === 'incident' ? 'Disiplin Kaydı' : 'Takdir Kaydı'}</div>
            <div className="msub">{behModal === 'incident' ? 'Olumsuz davranış' : 'Olumlu davranış'}</div>
            <div className="mlbl">Öğrenci</div>
            <select className="msel" value={behLearner} onChange={e => setBehLearner(e.target.value)}>
              <option value="">— Öğrenci seçin —</option>
              {behClasses.map(c => (
                <optgroup key={c.id} label={c.name}>
                  {filtL.filter(l => l.class_id === c.id).map(l => <option key={l.id} value={l.id}>{l.full_name}</option>)}
                </optgroup>
              ))}
            </select>
            <div className="mlbl">Kategori</div>
            <div className="tgrid">
              {(behModal === 'incident' ? INCIDENT_TYPES : PRAISE_TYPES).map(t => (
                <button key={t.key} className={`tpill ${behType === t.key ? 'sel' : ''}`}
                  style={behType === t.key ? { background: t.bg, borderColor: t.c, color: t.c } : {}}
                  onClick={() => setBehType(t.key)}>{t.label}</button>
              ))}
            </div>
            <div className="mlbl" style={{ marginBottom: 5 }}>Açıklama</div>
            <textarea className="mta" placeholder={behModal === 'incident' ? 'Ne oldu?' : 'Neden takdir edildi?'} value={behNote} onChange={e => setBehNote(e.target.value)} rows={2} />
            <div className="macts">
              <button className="mcan" onClick={() => { setBehModal(null); setBehLearner(''); setBehType(''); setBehNote('') }}>İptal</button>
              <button className="msave" style={{ background: behModal === 'incident' ? '#DC2626' : '#15803D' }}
                onClick={saveBeh} disabled={behSaving || !behLearner || !behType}>{behSaving ? '...' : 'Kaydet'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Topbar */}
      <div className="topbar">
        <div className="brand">
          <div className="brand-icon">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
            </svg>
          </div>
          <span className="brand-name">Teacher</span>
        </div>
        <div className="tbar-r">
          {activeYearName && (
            <div className="yr-chip">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              {activeYearName}
            </div>
          )}
          <div className="uchip">
            <div className="av">{teacher?.full_name?.charAt(0)}</div>
            <span className="uname">{teacher?.display_name || teacher?.full_name}</span>
          </div>
          {isHead && <span className="hchip">Head</span>}
          <button className="logout" onClick={async () => { await supabase.auth.signOut(); router.push('/') }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Out
          </button>
        </div>
      </div>

      {/* Desktop tabs */}
      <div className="tab-bar">
        {BOTTOM_TABS.map(t => (
          <button key={t.key} className={`tab-btn ${activeTab === t.key ? 'active' : ''}`} onClick={() => switchTab(t.key)}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div className="wrap">

        {/* DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <div className="h1">Günaydın, {teacher?.display_name?.split(' ')[0] || teacher?.full_name?.split(' ')[0]}</div>
              <div className="sub">{dateFmt}</div>
            </div>
            <div className="s3">
              <div className="scard">
                <div className="sicon" style={{ background: '#EFF6FF' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#1D4ED8" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
                </div>
                <div className="sn">{myClasses.length}</div><div className="sl">Sınıf</div>
              </div>
              <div className="scard">
                <div className="sicon" style={{ background: '#ECFEFF' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0E7490" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                </div>
                <div className="sn" style={{ color: thisWk > 0 ? '#0E7490' : undefined }}>{thisWk}</div><div className="sl">Bu Hafta</div>
              </div>
              <div className="scard">
                <div className="sicon" style={{ background: '#FFF7ED' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#C2410C" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                </div>
                <div className="sn">{upcomingExams.length}</div><div className="sl">Sınav</div>
              </div>
            </div>
            {overdue > 0 && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 9, padding: '9px 13px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 7 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <span style={{ fontSize: 12, color: '#DC2626', fontWeight: 600 }}>{overdue} gecikmeli konu</span>
                <button className="go" style={{ marginLeft: 'auto', background: '#FEF2F2', color: '#DC2626', borderColor: '#FCA5A5' }} onClick={() => switchTab('curriculum')}>İncele →</button>
              </div>
            )}
            {thisWk > 0 && (
              <div className="card">
                <div className="ch"><span className="ct">Bu Haftanın Konuları</span><button className="go" onClick={() => switchTab('curriculum')}>Tümü →</button></div>
                {topics.filter(t => topicStatus(t) === 'this-week').slice(0, 4).map(t => {
                  const p = progress.find(x => x.topic_id === t.id)
                  return (
                    <div key={t.id} className="lr">
                      <div>
                        <div className="rn" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          {p?.is_completed && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                          {t.title}
                        </div>
                        <div className="rs">{t.curriculum_subjects?.name} · {t.curriculum_subjects?.classes?.name}</div>
                      </div>
                      <span className="bdg" style={{ background: p?.is_completed ? '#DCFCE7' : '#E0F2FE', color: p?.is_completed ? '#16A34A' : '#0284C7' }}>{p?.is_completed ? '✓' : 'Bu Hafta'}</span>
                    </div>
                  )
                })}
              </div>
            )}
            <div className="card">
              <div className="ch"><span className="ct">Bugün — {todayName}</span><button className="go" onClick={() => switchTab('attendance')}>Yoklama →</button></div>
              {todaySessions.length === 0 ? <div className="empty">Bugün ders yok</div> : todaySessions.map(s => (
                <div key={s.id} className="lr">
                  <div><div className="rn">{s.name}</div><div className="rs">{s.classes?.name} · {s.start_time?.slice(0,5)}–{s.end_time?.slice(0,5)}</div></div>
                  <span className="bdg" style={{ background: '#EFF6FF', color: '#1D4ED8' }}>{s.start_time?.slice(0,5)}</span>
                </div>
              ))}
            </div>
            <div className="card">
              <div className="ch"><span className="ct">Yoklama Oranı</span></div>
              {attStats.map(s => (
                <div key={s.cls.id} className="lr">
                  <div><div className="rn">{s.cls.name}</div><div className="rs">{s.n} öğrenci</div></div>
                  <div className="pbar">
                    <div className="btrack"><div className="bfill" style={{ width: `${s.pct}%`, background: s.pct >= 70 ? '#22C55E' : '#EF4444' }} /></div>
                    <span className="pt" style={{ color: s.pct >= 70 ? '#15803D' : '#DC2626' }}>{s.pct}%</span>
                  </div>
                </div>
              ))}
            </div>
            {incidents.slice(0, 3).length > 0 && (
              <div className="card">
                <div className="ch"><span className="ct">Son Disiplin</span><button className="go" onClick={() => switchTab('behaviour')}>Tümü →</button></div>
                {incidents.slice(0, 3).map(i => {
                  const cfg = INCIDENT_TYPES.find(t => t.key === i.type) || INCIDENT_TYPES[6]
                  return (
                    <div key={i.id} className="lr">
                      <div><div className="rn">{i.learners?.full_name}</div><div className="rs">{cfg.label} · {fmt(i.created_at)}</div></div>
                      <span className="bdg" style={{ background: cfg.bg, color: cfg.c }}>{cfg.label}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ATTENDANCE */}
        {activeTab === 'attendance' && (
          <div>
            {!selSession ? (
              <div>
                <div style={{ marginBottom: 16 }}><div className="h1">Yoklama Al</div><div className="sub">{dateFmt}</div></div>
                {todaySessions.length === 0 ? <div className="card"><div className="empty">Bugün ders yok</div></div> : todaySessions.map(s => (
                  <button key={s.id} className="sess-btn" onClick={() => selSess(s)}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A1A' }}>{s.name}</div>
                      <div style={{ fontSize: 11, color: '#AAA', marginTop: 1 }}>{s.classes?.name} · {s.start_time?.slice(0,5)}–{s.end_time?.slice(0,5)}</div>
                    </div>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#1D4ED8" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                  </button>
                ))}
              </div>
            ) : (
              <div>
                <div className="atthr">
                  <div>
                    <button className="bk" onClick={() => { setSelSession(null); setSaved(false) }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg> Geri
                    </button>
                    <div className="h1">{selSession.name}</div>
                    <div className="sub">{selSession.classes?.name} · {selSession.start_time?.slice(0,5)}–{selSession.end_time?.slice(0,5)}</div>
                  </div>
                  <button className="svbtn" onClick={saveAtt} disabled={saving}>{saving ? '...' : saved ? '✓ Kaydedildi' : 'Kaydet'}</button>
                </div>
                {learners.map(l => {
                  const status = att[l.id] || 'absent'
                  return (
                    <div key={l.id} className="lcard" style={{ borderColor: status === 'present' ? '#BBF7D0' : status === 'late' ? '#FDE68A' : '#EFEFED' }}>
                      <div className="ltop">
                        <div className="lname">
                          <div className="sdot" style={{ background: status === 'present' ? '#22C55E' : status === 'late' ? '#EAB308' : '#E5E5E5' }} />
                          {l.full_name}
                        </div>
                        <div className="sbtns">
                          {(['present', 'late', 'absent'] as const).map(s => (
                            <button key={s} className="sbtn" onClick={() => { setAtt(p => ({ ...p, [l.id]: s })); setSaved(false) }}
                              style={{ background: status === s ? SC[s].bg : '#F8F8F6', color: status === s ? SC[s].t : '#AAA', borderColor: status === s ? SC[s].bg : 'transparent' }}>
                              {s === 'present' ? 'Var' : s === 'late' ? 'Geç' : 'Yok'}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="brow2">
                        <label className="hwck">
                          <input type="checkbox" checked={hw[l.id] || false} onChange={e => { setHw(p => ({ ...p, [l.id]: e.target.checked })); setSaved(false) }} />
                          Ödev teslim
                        </label>
                        <input className="ni" value={noteMap[l.id] || ''} placeholder="Not..." onChange={e => { setNoteMap(p => ({ ...p, [l.id]: e.target.value })); setSaved(false) }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* CURRICULUM */}
        {activeTab === 'curriculum' && (
          <div>
            {currView === 'list' ? (
              <div>
                <div style={{ marginBottom: 14 }}><div className="h1">Müfredat Takibi</div><div className="sub">Konu planı ve ilerleme</div></div>
                <div className="s3" style={{ marginBottom: 14 }}>
                  <div className="scard"><div className="sn" style={{ color: '#0284C7', fontSize: 18 }}>{thisWk}</div><div className="sl">Bu Hafta</div></div>
                  <div className="scard"><div className="sn" style={{ color: '#16A34A', fontSize: 18 }}>{done}</div><div className="sl">Tamamlandı</div></div>
                  <div className="scard"><div className="sn" style={{ color: overdue > 0 ? '#DC2626' : '#AAA', fontSize: 18 }}>{overdue}</div><div className="sl">Gecikmeli</div></div>
                </div>
                <div className="cfrow">
                  <span className="flbl">Göster:</span>
                  <button className={`fp ${currFilter === 'week' ? 'on' : ''}`} onClick={() => setCurrFilter('week')}>Bu Hafta</button>
                  <button className={`fp ${currFilter === 'all' ? 'on' : ''}`} onClick={() => setCurrFilter('all')}>Tümü</button>
                  {terms.map(t => <button key={t.id} className={`fp term ${currFilter === 'term' && activeTerm?.id === t.id ? 'on' : ''}`} onClick={() => { setCurrFilter('term'); setActiveTerm(t) }}>{t.name}</button>)}
                </div>
                {grades.length > 0 && (
                  <div className="card" style={{ marginBottom: 10 }}>
                    <div className="gtabs">
                      <button className={`gtab ${!activeGrade ? 'on' : ''}`} onClick={() => { setActiveGrade(null); setActiveSub(null) }}>Tüm Sınıflar</button>
                      {grades.map(g => <button key={g.id} className={`gtab ${activeGrade === g.id ? 'on' : ''}`} onClick={() => { setActiveGrade(g.id); setActiveSub(null) }}>{g.name}</button>)}
                    </div>
                    {activeGrade && gradeSubjects.length > 0 && (
                      <div className="spills">
                        <button className={`sp ${!activeSub ? 'on' : ''}`} onClick={() => setActiveSub(null)}>Tüm Dersler</button>
                        {gradeSubjects.map(s => <button key={s.id} className={`sp ${activeSub === s.id ? 'on' : ''}`} onClick={() => setActiveSub(s.id)}>{s.name}</button>)}
                      </div>
                    )}
                  </div>
                )}
                {ft.length === 0 ? (
                  <div style={{ background: '#fff', border: '1px solid #EFEFED', borderRadius: 11, padding: 36, textAlign: 'center' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>{currFilter === 'week' ? 'Bu hafta planlanmış konu yok' : 'Konu bulunamadı'}</div>
                    <div style={{ fontSize: 10, color: '#AAA' }}>{currFilter === 'week' ? '"Tümü"ne geçerek tüm konuları görün' : ''}</div>
                  </div>
                ) : ft.map(t => {
                  const p = progress.find(x => x.topic_id === t.id)
                  const isd = p?.is_completed
                  const st = isd ? 'done' : topicStatus(t)
                  return (
                    <div key={t.id} className={`tcard ${st === 'this-week' ? 'tw' : st === 'overdue' ? 'ov' : st === 'done' ? 'dn' : ''}`} onClick={() => openDetail(t)}>
                      <div className="tcin">
                        <div className="tcdot" style={{ background: isd ? '#16A34A' : st === 'this-week' ? '#0284C7' : st === 'overdue' ? '#DC2626' : '#D1D5DB' }} />
                        <div className="tci">
                          <div className="tctit">{t.title}</div>
                          <div className="tcmeta">
                            <span>{t.curriculum_subjects?.name}</span>
                            {!activeGrade && <span style={{ background: '#F5F5F3', padding: '1px 5px', borderRadius: 3, fontSize: 9 }}>{t.curriculum_subjects?.classes?.name}</span>}
                            {t.planned_start && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                                {fmt(t.planned_start)}{t.planned_end ? ` → ${fmt(t.planned_end)}` : ''}
                              </span>
                            )}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          {isd && <span className="sc sc-dn">✓ Done</span>}
                          {!isd && st === 'this-week' && <span className="sc sc-tw">Bu Hafta</span>}
                          {!isd && st === 'overdue' && <span className="sc sc-ov">Gecikti</span>}
                          {!isd && st === 'upcoming' && <span className="sc sc-up">Planlandı</span>}
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#DDD" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : selTopic && (
              <div>
                <button className="bk" onClick={() => { setCurrView('list'); setSelTopic(null) }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg> Müfredada Dön
                </button>
                <div className="dtit">{selTopic.title}</div>
                <div className="dsub">{selTopic.curriculum_subjects?.name} · {selTopic.curriculum_subjects?.classes?.name}{selTopic.description && ` — ${selTopic.description}`}</div>
                {selTopic.planned_start && (
                  <div className="dban">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    <strong>{fmt(selTopic.planned_start)}</strong>
                    {selTopic.planned_end && <> → <strong>{fmt(selTopic.planned_end)}</strong></>}
                    {(() => {
                      const s = topicStatus(selTopic), p = progress.find(x => x.topic_id === selTopic.id)
                      if (p?.is_completed) return <span className="sc sc-dn" style={{ marginLeft: 4 }}>Done</span>
                      if (s === 'this-week') return <span className="sc sc-tw" style={{ marginLeft: 4 }}>Bu Hafta</span>
                      if (s === 'overdue') return <span className="sc sc-ov" style={{ marginLeft: 4 }}>Gecikti</span>
                      return null
                    })()}
                  </div>
                )}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 9, fontWeight: 800, color: '#AAA', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 9 }}>Materyaller {materials.length > 0 && `(${materials.length})`}</div>
                  {materials.length === 0
                    ? <div style={{ background: '#FAFAF8', border: '1px solid #F0F0EE', borderRadius: 8, padding: 16, textAlign: 'center', color: '#CCC', fontSize: 11 }}>Materyal eklenmemiş</div>
                    : materials.map(m => {
                        const cfg = MAT_COLORS[m.type] || MAT_COLORS.link
                        return (
                          <div key={m.id} className="mitem">
                            <div className="mico" style={{ background: cfg.bg, color: cfg.c }}>{MAT_ICONS[m.type]}</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div className="mname">{m.title}</div>
                              {m.url && <div className="mlink">{m.url}</div>}
                              {m.content && <div style={{ fontSize: 10, color: '#888', marginTop: 1 }}>{m.content}</div>}
                            </div>
                            {m.url && <a href={m.url} target="_blank" rel="noreferrer" className="olink">Aç ↗</a>}
                          </div>
                        )
                      })}
                </div>
                {(() => {
                  const p = progress.find(x => x.topic_id === selTopic.id)
                  const isc = p?.is_completed
                  const ucfg = UNDERSTAND[p?.understanding as keyof typeof UNDERSTAND]
                  return (
                    <div>
                      {isc && (
                        <div className="fbox">
                          <div className="fbtit"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>Tamamlandı — {fmt(p.taught_date)}</div>
                          {ucfg && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 5, background: ucfg.bg, color: ucfg.c }}>{ucfg.e} {ucfg.label}</span>}
                          {p.feedback_note && <div style={{ fontSize: 11, color: '#555', marginTop: 6, lineHeight: 1.5 }}>{p.feedback_note}</div>}
                        </div>
                      )}
                      <div className="dacts">
                        {!isc
                          ? <button className="act" style={{ background: '#15803D', color: '#fff' }} onClick={() => openFb(selTopic)}>
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                              Tamamlandı İşaretle
                            </button>
                          : <>
                              <button className="act" style={{ background: '#7E22CE', color: '#fff' }} onClick={() => openFb(selTopic)}>Güncelle</button>
                              <button className="act" style={{ background: '#F5F5F3', color: '#666', border: '1px solid #EFEFED' }} onClick={() => unmark(selTopic.id)}>Geri Al</button>
                            </>}
                      </div>
                    </div>
                  )
                })()}
              </div>
            )}
          </div>
        )}

        {/* BEHAVIOUR */}
        {activeTab === 'behaviour' && (
          <div>
            <div className="hrow" style={{ marginBottom: 12 }}>
              <div><div className="h1">Davranış Takibi</div><div className="sub">Disiplin ve takdir kayıtları</div></div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="bab" style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }} onClick={() => { setBehModal('incident'); setBehType('') }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Disiplin
                </button>
                <button className="bab" style={{ background: '#F0FDF4', color: '#15803D', border: '1px solid #BBF7D0' }} onClick={() => { setBehModal('praise'); setBehType('') }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Takdir
                </button>
              </div>
            </div>
            <div className="bseg">
              <button className={`bseg-btn ${behTab === 'incidents' ? 'on' : ''}`} onClick={() => setBehTab('incidents')}>Disiplin ({filtInc.length})</button>
              <button className={`bseg-btn ${behTab === 'praise' ? 'on' : ''}`} onClick={() => setBehTab('praise')}>Takdir ({filtPr.length})</button>
            </div>
            {behClasses.length > 1 && (
              <div className="bcf">
                <button className={`fp ${!behClassFilter ? 'on' : ''}`} onClick={() => setBehClassFilter(null)}>Tüm Sınıflar</button>
                {behClasses.map(c => <button key={c.id} className={`fp ${behClassFilter === c.id ? 'on' : ''}`} onClick={() => setBehClassFilter(c.id)}>{c.name}</button>)}
              </div>
            )}
            {behTab === 'incidents' && (
              filtInc.length === 0
                ? <div style={{ background: '#fff', border: '1px solid #EFEFED', borderRadius: 11, padding: 36, textAlign: 'center' }}><div style={{ fontSize: 12, fontWeight: 600, color: '#555' }}>Disiplin kaydı yok</div></div>
                : filtInc.map(i => {
                    const cfg = INCIDENT_TYPES.find(t => t.key === i.type) || INCIDENT_TYPES[6]
                    const lrn = allLearners.find(l => l.id === i.learner_id)
                    return (
                      <div key={i.id} className="brec" style={{ borderLeft: `3px solid ${cfg.c}` }}>
                        <div className="brh">
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                              <div className="blrn">{i.learners?.full_name}</div>
                              {lrn?.class_name && <span className="bctag">{lrn.class_name}</span>}
                            </div>
                            <span className="btyp" style={{ background: cfg.bg, color: cfg.c }}>{cfg.label}</span>
                          </div>
                          <button className="delb" onClick={() => delRec('behaviour_incidents', i.id)}>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                          </button>
                        </div>
                        {i.note && <div className="bnote">{i.note}</div>}
                        <div className="btime">{fmtDT(i.created_at)}</div>
                      </div>
                    )
                  })
            )}
            {behTab === 'praise' && (
              filtPr.length === 0
                ? <div style={{ background: '#fff', border: '1px solid #EFEFED', borderRadius: 11, padding: 36, textAlign: 'center' }}><div style={{ fontSize: 12, fontWeight: 600, color: '#555' }}>Takdir kaydı yok</div></div>
                : filtPr.map(i => {
                    const cfg = PRAISE_TYPES.find(t => t.key === i.type) || PRAISE_TYPES[5]
                    const lrn = allLearners.find(l => l.id === i.learner_id)
                    return (
                      <div key={i.id} className="brec" style={{ borderLeft: `3px solid ${cfg.c}` }}>
                        <div className="brh">
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                              <div className="blrn">{i.learners?.full_name}</div>
                              {lrn?.class_name && <span className="bctag">{lrn.class_name}</span>}
                            </div>
                            <span className="btyp" style={{ background: cfg.bg, color: cfg.c }}>{cfg.label}</span>
                          </div>
                          <button className="delb" onClick={() => delRec('behaviour_praise', i.id)}>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                          </button>
                        </div>
                        {i.note && <div className="bnote">{i.note}</div>}
                        <div className="btime">{fmtDT(i.created_at)}</div>
                      </div>
                    )
                  })
            )}
          </div>
        )}

        {/* EXAMS */}
        {activeTab === 'exams' && (
          <div>
            <div className="hrow">
              <div><div className="h1">Exams</div><div className="sub">Exam's Calendar</div></div>
              <button className="abtn" onClick={() => setShowExamForm(!showExamForm)}>
                {showExamForm ? 'İptal' : <><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Sınav Ekle</>}
              </button>
            </div>
            {showExamForm && (
              <div className="fcard">
                <div className="fgrid">
                  <div className="fg"><label className="flb">Title *</label><input className="fin" value={eTitle} onChange={e => setETitle(e.target.value)} placeholder="ör. Matematik 1. Dönem" /></div>
                  <div className="fg"><label className="flb">Date *</label><input className="fin" type="date" value={eDate} onChange={e => setEDate(e.target.value)} /></div>
                  <div className="fg"><label className="flb">Class *</label><select className="fse" value={eClass} onChange={e => setEClass(e.target.value)}>{allClasses.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                  <div className="fg"><label className="flb">Description</label><input className="fin" value={eDesc} onChange={e => setEDesc(e.target.value)} placeholder="Kapsam, format..." /></div>
                </div>
                <div className="fas2">
                  <button style={{ background: '#F5F5F3', color: '#666', border: 'none', borderRadius: 7, padding: '6px 11px', fontSize: 11, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }} onClick={() => setShowExamForm(false)}>İptal</button>
                  <button style={{ background: '#1A1A1A', color: '#fff', border: 'none', borderRadius: 7, padding: '6px 13px', fontSize: 11, fontWeight: 800, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }} onClick={addExam} disabled={eSaving}>{eSaving ? '...' : 'Ekle'}</button>
                </div>
              </div>
            )}
            {exams.filter(e => e.exam_date < todayStr).length > 0 && (
              <div className="card" style={{ marginBottom: 10 }}>
                <div className="ch"><span className="ct">Past</span></div>
                {exams.filter(e => e.exam_date < todayStr).map(e => (
                  <div key={e.id} className="lr">
                    <div><div className="rn">{e.title}</div><div className="rs">{e.classes?.name} · {e.exam_date}</div></div>
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      <span className="bdg" style={{ background: '#F5F5F3', color: '#888' }}>Bitti</span>
                      <button className="db2" onClick={() => { supabase.from('exams').update({ is_active: false }).eq('id', e.id); setExams(p => p.filter(x => x.id !== e.id)) }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="card">
              <div className="ch"><span className="ct">Upcoming Exams</span></div>
              {exams.filter(e => e.exam_date >= todayStr).length === 0
                ? <div className="empty">No upcoming exams</div>
                : exams.filter(e => e.exam_date >= todayStr).map(e => {
                    const d = Math.ceil((new Date(e.exam_date).getTime() - new Date().getTime()) / 86400000)
                    return (
                      <div key={e.id} className="lr">
                        <div><div className="rn">{e.title}</div><div className="rs">{e.classes?.name} · {e.exam_date}{e.description && ` · ${e.description}`}</div></div>
                        <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                          <span className="ecd" style={{ color: d <= 3 ? '#DC2626' : d <= 7 ? '#A16207' : '#15803D' }}>
                            {d === 0 ? 'Today!' : d === 1 ? 'Tomorrow!' : `${d}g`}
                          </span>
                          <button className="db2" onClick={() => { supabase.from('exams').update({ is_active: false }).eq('id', e.id); setExams(p => p.filter(x => x.id !== e.id)) }}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                          </button>
                        </div>
                      </div>
                    )
                  })}
            </div>
          </div>
        )}

      </div>

      {/* Mobile bottom nav */}
      <nav className="bnav">
        <div className="bnav-inner">
          {BOTTOM_TABS.map(t => (
            <button key={t.key} className={`bnav-btn ${activeTab === t.key ? 'active' : ''}`} onClick={() => switchTab(t.key)}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>
      </nav>
    </main>
  )
}