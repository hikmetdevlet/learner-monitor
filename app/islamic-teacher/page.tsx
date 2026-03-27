'use client'
import { useEffect, useState, useMemo } from 'react'
import { createClient } from '../lib/supabase'
import { useRouter } from 'next/navigation'

const DAYS = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const BOTTOM_TABS = [
  { key: 'dashboard',  label: 'Home',       icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
  { key: 'attendance', label: 'Attend',     icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg> },
  { key: 'curriculum', label: 'Lessons',    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg> },
  { key: 'topics',     label: 'Topics',     icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg> },
  { key: 'behaviour',  label: 'Behaviour',  icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
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
  good:      { bg: '#F0FDF4', c: '#15803D', label: 'İyi Anladı', e: '✓' },
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
const STATUS_OPTIONS = [
  { key: 'present', label: 'Present', bg: '#22C55E', light: '#F0FDF4', text: '#15803D' },
  { key: 'late',    label: 'Late',    bg: '#EAB308', light: '#FEFCE8', text: '#A16207' },
  { key: 'absent',  label: 'Absent',  bg: '#EF4444', light: '#FEF2F2', text: '#B91C1C' },
  { key: 'excused', label: 'Excused', bg: '#3B82F6', light: '#EFF6FF', text: '#1D4ED8' },
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

// ── Deduplicate learners by id ────────────────────────────────
function dedup(list: any[]): any[] {
  const seen = new Set<string>()
  return list.filter(l => { if (seen.has(l.id)) return false; seen.add(l.id); return true })
}

export default function IslamicTeacherDashboard() {
  const [teacherName, setTeacherName]       = useState('')
  const [teacherId, setTeacherId]           = useState('')
  const [activeTab, setActiveTab]           = useState('dashboard')
  const [activeYearName, setActiveYearName] = useState<string | null>(null)
  const [activeYearId, setActiveYearId]     = useState<string | null>(null)

  // My classes (from islamic_teacher_classes)
  const [myClasses, setMyClasses] = useState<any[]>([])

  // Unified learner list per class — SOURCE OF TRUTH for attendance & topics
  // key: classId → learner[]
  const [classLearners, setClassLearners] = useState<Record<string, any[]>>({})

  // Dashboard
  const [attStats, setAttStats]       = useState<any[]>([])
  const [topicStats, setTopicStats]   = useState<any[]>([])
  const [weeklyAtt, setWeeklyAtt]     = useState<any[]>([])

  // Attendance
  const [todaySessions, setTodaySessions]     = useState<any[]>([])
  const [selectedSession, setSelectedSession] = useState<any>(null)
  const [attendance, setAttendance]           = useState<Record<string, string>>({})
  const [attNotes, setAttNotes]               = useState<Record<string, string>>({})
  const [saving, setSaving]                   = useState(false)
  const [saved, setSaved]                     = useState(false)
  const [attDate, setAttDate]                 = useState(new Date().toISOString().split('T')[0])

  // Curriculum (teacher-style: list → detail with feedback)
  const [currSubjects, setCurrSubjects]   = useState<any[]>([])
  const [currTopics, setCurrTopics]       = useState<any[]>([])
  const [currProgress, setCurrProgress]   = useState<any[]>([])
  const [currMaterials, setCurrMaterials] = useState<any[]>([])
  const [currTerms, setCurrTerms]         = useState<any[]>([])
  const [topicTerms, setTopicTerms]       = useState<any[]>([])
  const [currView, setCurrView]           = useState<'list' | 'detail'>('list')
  const [currFilter, setCurrFilter]       = useState<'week' | 'term' | 'all'>('week')
  const [activeTerm, setActiveTerm]       = useState<any>(null)
  const [activeGrade, setActiveGrade]     = useState<string | null>(null)
  const [activeSub, setActiveSub]         = useState<string | null>(null)
  const [selTopic, setSelTopic]           = useState<any>(null)
  const [fbModal, setFbModal]             = useState<any>(null)
  const [fbNote, setFbNote]               = useState('')
  const [fbU, setFbU]                     = useState<'good' | 'mixed' | 'difficult'>('good')
  const [fbSaving, setFbSaving]           = useState(false)

  // Topics (per-learner progress table — unchanged)
  const [topicClass, setTopicClass]       = useState<any>(null)
  const [topicSubjects, setTopicSubjects] = useState<any[]>([])
  const [topicSubject, setTopicSubject]   = useState<any>(null)
  const [topicList, setTopicList]         = useState<any[]>([])
  const [topicProgress, setTopicProgress] = useState<Record<string, Record<string, boolean>>>({})
  const [savingProg, setSavingProg]       = useState(false)
  const [savedProg, setSavedProg]         = useState(false)

  // Behaviour
  const [behTab, setBehTab]                 = useState<'incidents' | 'praise'>('incidents')
  const [incidents, setIncidents]           = useState<any[]>([])
  const [praises, setPraises]               = useState<any[]>([])
  const [behClassFilter, setBehClassFilter] = useState<string | null>(null)
  const [behModal, setBehModal]             = useState<'incident' | 'praise' | null>(null)
  const [behLearner, setBehLearner]         = useState('')
  const [behType, setBehType]               = useState('')
  const [behNote, setBehNote]               = useState('')
  const [behSaving, setBehSaving]           = useState(false)

  const router   = useRouter()
  const supabase = createClient()

  useEffect(() => { init() }, [])

  // ── Init ─────────────────────────────────────────────────────
  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }
    const { data: u } = await supabase.from('users').select('*').eq('auth_id', user.id).single()
    if (!u || u.role !== 'islamic_teacher') { router.push('/'); return }
    setTeacherName(u.full_name); setTeacherId(u.id)

    const { data: yr } = await supabase.from('academic_years').select('id,name').eq('is_active', true).single()
    const yId = yr?.id || null
    if (yr) { setActiveYearName(yr.name); setActiveYearId(yId) }

    // Load assigned classes
    const { data: itc } = await supabase.from('islamic_teacher_classes').select('*, classes(id,name,class_type)').eq('teacher_id', u.id)
    const classList = (itc || []).map((a: any) => a.classes).filter(Boolean)
    setMyClasses(classList)

    if (!classList.length) return

    // Load learners per class — single source of truth
    const lcMap: Record<string, any[]> = {}
    for (const cls of classList) {
      let q = supabase.from('learner_classes').select('*, learners(id,full_name)').eq('class_id', cls.id)
      if (yId) q = q.eq('academic_year_id', yId)
      const { data } = await q
      const learnerList = dedup((data || []).map((lc: any) => lc.learners).filter(Boolean))
      lcMap[cls.id] = learnerList
    }
    setClassLearners(lcMap)

    await Promise.all([
      loadTodaySessions(u.id),
      loadCurriculum(classList, yId),
      loadBehaviourRecords(lcMap),
      loadDashboardStats(classList, lcMap),
    ])
  }

  // ── Learners for a given class (from unified map) ─────────────
  function learnersForClass(classId: string) {
    return classLearners[classId] || []
  }

  // All learners across all my classes (deduped)
  const allLearners = useMemo(() => dedup(Object.values(classLearners).flat()), [classLearners])

  // For behaviour class tag lookup
  const learnerClassMap = useMemo(() => {
    const m: Record<string, string> = {}
    myClasses.forEach(cls => {
      (classLearners[cls.id] || []).forEach(l => { m[l.id] = cls.name })
    })
    return m
  }, [classLearners, myClasses])

  // ── Dashboard stats ───────────────────────────────────────────
  async function loadDashboardStats(classList: any[], lcMap: Record<string, any[]>) {
    const allStats: any[] = []
    for (const cls of classList) {
      for (const learner of (lcMap[cls.id] || [])) {
        const { data: attData } = await supabase.from('attendance').select('status,attendance_date').eq('learner_id', learner.id)
        const total   = attData?.length || 0
        const present = attData?.filter((a: any) => a.status === 'present' || a.status === 'late').length || 0
        allStats.push({ learner, cls, total, present, pct: total > 0 ? Math.round((present / total) * 100) : 0, attData: attData || [] })
      }
    }
    setAttStats(allStats)

    const days = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i)
      const ds = d.toISOString().split('T')[0]
      const recs = allStats.flatMap(s => s.attData.filter((a: any) => a.attendance_date === ds))
      const tot = recs.length, pr = recs.filter((a: any) => a.status === 'present' || a.status === 'late').length
      days.push({ day: d.toLocaleDateString('en-US', { weekday: 'short' }), pct: tot > 0 ? Math.round((pr / tot) * 100) : 0, hasData: tot > 0 })
    }
    setWeeklyAtt(days)
  }

  // ── Curriculum (teacher-style) ────────────────────────────────
  async function loadCurriculum(classList: any[], yId: string | null) {
    const cids = classList.map((c: any) => c.id)
    const { data: subs } = await supabase.from('curriculum_subjects').select('*, classes(id,name)').in('class_id', cids).eq('is_active', true).order('order_num')
    setCurrSubjects(subs || [])
    if (!subs?.length) return

    const sids = subs.map((s: any) => s.id)
    const { data: tops } = await supabase.from('curriculum_topics').select('*, curriculum_subjects(id,name,class_id,classes(id,name))').in('subject_id', sids).eq('is_active', true).order('order_num')
    setCurrTopics(tops || [])

    if (tops?.length) {
      const tids = tops.map((t: any) => t.id)
      const [{ data: prog }, { data: ttMap }] = await Promise.all([
        supabase.from('curriculum_progress').select('*').in('topic_id', tids),
        supabase.from('curriculum_topic_terms').select('*').in('topic_id', tids),
      ])
      setCurrProgress(prog || [])
      setTopicTerms(ttMap || [])
    }

    const { data: trms } = await supabase.from('curriculum_terms').select('*').in('class_id', cids).eq('is_active', true).order('order_num')
    setCurrTerms(trms || [])
    if (trms?.length) setActiveTerm(trms[0])
  }

  // ── Today sessions ────────────────────────────────────────────
  async function loadTodaySessions(tId: string) {
    const dayNum = new Date().getDay() === 0 ? 7 : new Date().getDay()
    const { data } = await supabase.from('timetable').select('*, classes(name,id,class_type)').eq('teacher_id', tId).eq('day_of_week', dayNum).order('start_time')
    setTodaySessions(data || [])
  }

  // ── Attendance ────────────────────────────────────────────────
  async function selectSession(session: any) {
    setSelectedSession(session); setSaved(false)
    // Use unified learner source for this class
    const list = learnersForClass(session.classes.id)
    await loadAttForDate(session.id, attDate, list)
  }

  async function loadAttForDate(sessionId: string, date: string, learnerList: any[]) {
    const { data } = await supabase.from('attendance').select('*').eq('timetable_id', sessionId).eq('attendance_date', date)
    const am: Record<string, string> = {}
    const nm: Record<string, string> = {}
    learnerList.forEach(l => { am[l.id] = 'absent' })
    data?.forEach((a: any) => { am[a.learner_id] = a.status; if (a.note) nm[a.learner_id] = a.note })
    setAttendance(am); setAttNotes(nm)
  }

  async function changeDate(d: string) {
    setAttDate(d); setSaved(false)
    if (selectedSession) await loadAttForDate(selectedSession.id, d, learnersForClass(selectedSession.classes.id))
  }

  function markAll(status: string) {
    const list = learnersForClass(selectedSession?.classes?.id || '')
    const m: Record<string, string> = {}
    list.forEach(l => { m[l.id] = status })
    setAttendance(m); setSaved(false)
  }

  async function saveAttendance() {
    if (!selectedSession) return
    setSaving(true)
    const list = learnersForClass(selectedSession.classes.id)
    for (const learner of list) {
      await supabase.from('attendance').upsert({
        timetable_id: selectedSession.id, learner_id: learner.id,
        attendance_date: attDate, status: attendance[learner.id] || 'absent',
        excused: attendance[learner.id] === 'excused', note: attNotes[learner.id] || null,
      }, { onConflict: 'timetable_id,learner_id,attendance_date' })
    }
    setSaving(false); setSaved(true)
  }

  // ── Curriculum: detail & feedback ────────────────────────────
  async function openDetail(topic: any) {
    setSelTopic(topic); setCurrView('detail')
    const { data } = await supabase.from('curriculum_materials').select('*').eq('topic_id', topic.id).order('order_num')
    setCurrMaterials(data || [])
  }

  function openFb(topic: any) {
    const ex = currProgress.find(p => p.topic_id === topic.id)
    setFbU(ex?.understanding || 'good'); setFbNote(ex?.feedback_note || ''); setFbModal(topic)
  }

  async function saveFb() {
    if (!fbModal || !teacherId) return
    setFbSaving(true)
    const ex = currProgress.find(p => p.topic_id === fbModal.id)
    const payload = { topic_id: fbModal.id, teacher_id: teacherId, is_completed: true, completed_at: new Date().toISOString(), feedback_note: fbNote.trim() || null, understanding: fbU, taught_date: new Date().toISOString().split('T')[0] }
    if (ex) { await supabase.from('curriculum_progress').update(payload).eq('id', ex.id); setCurrProgress(p => p.map(x => x.id === ex.id ? { ...x, ...payload } : x)) }
    else { const { data } = await supabase.from('curriculum_progress').insert(payload).select().single(); if (data) setCurrProgress(p => [...p, data]) }
    setFbModal(null); setFbSaving(false)
  }

  async function unmark(topicId: string) {
    const ex = currProgress.find(p => p.topic_id === topicId); if (!ex) return
    await supabase.from('curriculum_progress').update({ is_completed: false, completed_at: null }).eq('id', ex.id)
    setCurrProgress(p => p.map(x => x.id === ex.id ? { ...x, is_completed: false } : x))
  }

  // ── Topics (per-learner table) ────────────────────────────────
  async function selectTopicClass(cls: any) {
    setTopicClass(cls); setTopicSubject(null); setTopicList([]); setTopicProgress({})
    const { data: subs } = await supabase.from('curriculum_subjects').select('*').eq('class_id', cls.id).eq('is_active', true).order('order_num')
    setTopicSubjects(subs || [])
  }

  async function selectTopicSubject(subject: any) {
    setTopicSubject(subject); setSavedProg(false)
    const { data: tops } = await supabase.from('curriculum_topics').select('*').eq('subject_id', subject.id).eq('is_active', true).eq('track_per_learner', true).order('order_num')
    setTopicList(tops || [])
    const learners = learnersForClass(topicClass?.id || '')
    if (learners.length && tops?.length) {
      const { data: prog } = await supabase.from('learner_topic_progress').select('*')
        .in('learner_id', learners.map((l: any) => l.id))
        .in('topic_id', tops.map((t: any) => t.id))
      const map: Record<string, Record<string, boolean>> = {}
      prog?.forEach((p: any) => { if (!map[p.learner_id]) map[p.learner_id] = {}; map[p.learner_id][p.topic_id] = p.completed })
      setTopicProgress(map)
    }
  }

  function toggleTopicProg(learnerId: string, topicId: string) {
    setTopicProgress(prev => ({ ...prev, [learnerId]: { ...prev[learnerId], [topicId]: !prev[learnerId]?.[topicId] } }))
    setSavedProg(false)
  }

  async function saveTopicProgress() {
    setSavingProg(true)
    const today = new Date().toISOString().split('T')[0]
    const learners = learnersForClass(topicClass?.id || '')
    for (const l of learners) {
      for (const t of topicList) {
        const completed = topicProgress[l.id]?.[t.id] || false
        await supabase.from('learner_topic_progress').upsert({
          learner_id: l.id, topic_id: t.id, completed,
          completed_date: completed ? today : null, marked_by: teacherId,
        }, { onConflict: 'learner_id,topic_id' })
      }
    }
    setSavingProg(false); setSavedProg(true)
  }

  // ── Behaviour ─────────────────────────────────────────────────
  async function loadBehaviourRecords(lcMap: Record<string, any[]>) {
    const ids = dedup(Object.values(lcMap).flat()).map((l: any) => l.id)
    if (!ids.length) return
    const [{ data: inc }, { data: pr }] = await Promise.all([
      supabase.from('behaviour_incidents').select('*, learners(full_name)').in('learner_id', ids).order('created_at', { ascending: false }),
      supabase.from('behaviour_praise').select('*, learners(full_name)').in('learner_id', ids).order('created_at', { ascending: false }),
    ])
    setIncidents(inc || []); setPraises(pr || [])
  }

  async function saveBeh() {
    if (!behLearner || !behType || !teacherId) return
    setBehSaving(true)
    await supabase.from(behModal === 'incident' ? 'behaviour_incidents' : 'behaviour_praise')
      .insert({ learner_id: behLearner, teacher_id: teacherId, type: behType, note: behNote.trim() || null })
    await loadBehaviourRecords(classLearners)
    setBehModal(null); setBehLearner(''); setBehType(''); setBehNote(''); setBehSaving(false)
  }

  async function delRec(table: string, id: string) {
    if (!confirm('Silmek istiyor musunuz?')) return
    await supabase.from(table).delete().eq('id', id)
    if (table === 'behaviour_incidents') setIncidents(p => p.filter(r => r.id !== id))
    else setPraises(p => p.filter(r => r.id !== id))
  }

  function switchTab(key: string) {
    setActiveTab(key); setSelectedSession(null); setTopicClass(null); setTopicSubject(null)
    setCurrView('list'); setSelTopic(null); setSaved(false)
  }

  // ── Derived: curriculum ───────────────────────────────────────
  const currGrades = useMemo(() => {
    const m = new Map<string, any>()
    currSubjects.forEach(s => { if (s.classes) m.set(s.classes.id, s.classes) })
    return [...m.values()]
  }, [currSubjects])

  const gradeSubjects = useMemo(() =>
    activeGrade ? currSubjects.filter(s => s.class_id === activeGrade) : [], [currSubjects, activeGrade])

  function filteredCurrTopics() {
    let t = currTopics
    if (activeGrade) t = t.filter(x => x.curriculum_subjects?.class_id === activeGrade)
    if (activeSub)   t = t.filter(x => x.subject_id === activeSub)
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

  const ft      = filteredCurrTopics()
  const thisWk  = currTopics.filter(t => topicStatus(t) === 'this-week').length
  const done    = currProgress.filter(p => p.is_completed).length
  const overdue = currTopics.filter(t => topicStatus(t) === 'overdue' && !currProgress.find(p => p.topic_id === t.id && p.is_completed)).length

  // ── Derived: behaviour ────────────────────────────────────────
  const behClasses = useMemo(() => myClasses.map(c => ({ id: c.id, name: c.name })), [myClasses])
  const filtBehLearners = useMemo(() => behClassFilter ? (classLearners[behClassFilter] || []) : allLearners, [allLearners, classLearners, behClassFilter])
  const filtInc = useMemo(() => behClassFilter ? incidents.filter(i => (classLearners[behClassFilter] || []).some(l => l.id === i.learner_id)) : incidents, [incidents, behClassFilter, classLearners])
  const filtPr  = useMemo(() => behClassFilter ? praises.filter(i => (classLearners[behClassFilter] || []).some(l => l.id === i.learner_id)) : praises, [praises, behClassFilter, classLearners])

  // Attendance counts for selected session
  const sessLearners   = selectedSession ? learnersForClass(selectedSession.classes?.id || '') : []
  const presentCount   = sessLearners.filter(l => attendance[l.id] === 'present').length
  const lateCount      = sessLearners.filter(l => attendance[l.id] === 'late').length
  const absentCount    = sessLearners.filter(l => attendance[l.id] === 'absent' || !attendance[l.id]).length
  const excusedCount   = sessLearners.filter(l => attendance[l.id] === 'excused').length

  const todayName     = DAYS[new Date().getDay() === 0 ? 7 : new Date().getDay()]
  const dateFormatted = new Date().toLocaleDateString('en-ZA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const SC: any       = { present: { bg: '#22C55E', t: 'white' }, late: { bg: '#EAB308', t: 'white' }, absent: { bg: '#EF4444', t: 'white' } }

  return (
    <main style={{ minHeight: '100vh', background: '#F8F7F4', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Serif+Display&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin:0; padding:0; }
        .topbar { background:#fff; border-bottom:1px solid #EFEFED; padding:0 20px; height:50px; display:flex; align-items:center; justify-content:space-between; position:sticky; top:0; z-index:30; }
        .brand { display:flex; align-items:center; gap:8px; }
        .brand-icon { width:26px; height:26px; background:#15803D; border-radius:6px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .brand-name { font-size:14px; font-weight:600; color:#1A1A1A; }
        .tbar-r { display:flex; align-items:center; gap:6px; }
        .yr-chip { display:inline-flex; align-items:center; gap:4px; background:#F0FDF4; border:1px solid #BBF7D0; border-radius:7px; padding:3px 9px; font-size:10px; font-weight:700; color:#15803D; white-space:nowrap; }
        .uchip { display:flex; align-items:center; gap:6px; background:#F5F5F3; border-radius:100px; padding:2px 9px 2px 2px; }
        .av { width:22px; height:22px; background:#15803D; border-radius:50%; display:flex; align-items:center; justify-content:center; color:#fff; font-size:9px; font-weight:700; flex-shrink:0; }
        .uname { font-size:11px; color:#444; font-weight:500; }
        .logout { font-size:11px; color:#999; background:none; border:none; cursor:pointer; padding:4px 7px; border-radius:6px; display:flex; align-items:center; gap:3px; font-family:'DM Sans',sans-serif; }
        .logout:hover { background:#FEE2E2; color:#DC2626; }
        .tab-bar { background:#fff; border-bottom:1px solid #EFEFED; padding:0 20px; display:flex; overflow-x:auto; scrollbar-width:none; }
        .tab-bar::-webkit-scrollbar { display:none; }
        .tab-btn { padding:12px 13px; font-size:12px; font-weight:500; color:#999; background:none; border:none; border-bottom:2px solid transparent; cursor:pointer; font-family:'DM Sans',sans-serif; display:flex; align-items:center; gap:5px; white-space:nowrap; transition:all .12s; }
        .tab-btn.active { color:#15803D; border-bottom-color:#15803D; }
        .tab-btn.active svg { stroke:#15803D; }
        .bnav { display:none; position:fixed; bottom:0; left:0; right:0; z-index:40; background:rgba(255,255,255,.97); backdrop-filter:blur(20px); border-top:1px solid #EFEFED; padding:4px 0 calc(env(safe-area-inset-bottom,0px) + 4px); }
        .bnav-inner { display:flex; max-width:500px; margin:0 auto; }
        .bnav-btn { flex:1; display:flex; flex-direction:column; align-items:center; gap:2px; padding:5px 2px; border:none; background:none; cursor:pointer; font-family:'DM Sans',sans-serif; font-size:7px; font-weight:700; color:#C0BDB8; text-transform:uppercase; letter-spacing:.03em; position:relative; }
        .bnav-btn.active { color:#15803D; }
        .bnav-btn.active svg { stroke:#15803D; }
        .bnav-btn.active::after { content:''; position:absolute; bottom:-4px; left:50%; transform:translateX(-50%); width:16px; height:2px; background:#15803D; border-radius:2px 2px 0 0; }
        .wrap { max-width:900px; margin:0 auto; padding:20px 16px 28px; }
        .h1 { font-family:'DM Serif Display',serif; font-size:20px; color:#1A1A1A; margin-bottom:2px; }
        .sub { font-size:11px; color:#AAA; }
        .hrow { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:14px; flex-wrap:wrap; }
        .s3 { display:grid; grid-template-columns:repeat(3,1fr); gap:9px; margin-bottom:16px; }
        .scard { background:#fff; border:1px solid #EFEFED; border-radius:11px; padding:14px; }
        .sn { font-size:24px; font-weight:500; color:#1A1A1A; line-height:1; }
        .sl { font-size:9px; color:#AAA; margin-top:4px; text-transform:uppercase; letter-spacing:.05em; }
        .card { background:#fff; border:1px solid #EFEFED; border-radius:11px; overflow:hidden; margin-bottom:12px; }
        .ch { padding:11px 14px; border-bottom:1px solid #F5F5F3; display:flex; align-items:center; justify-content:space-between; }
        .ct { font-size:11px; font-weight:700; color:#1A1A1A; text-transform:uppercase; letter-spacing:.04em; }
        .lr { display:flex; align-items:center; justify-content:space-between; padding:9px 14px; border-bottom:1px solid #F8F8F6; gap:8px; }
        .lr:last-child { border-bottom:none; }
        .lr:hover { background:#FAFAF8; }
        .rn { font-size:13px; font-weight:500; color:#1A1A1A; }
        .rs { font-size:11px; color:#AAA; margin-top:1px; }
        .pbar { display:flex; align-items:center; gap:5px; }
        .btrack { width:55px; height:3px; background:#F0F0EE; border-radius:2px; overflow:hidden; }
        .bfill { height:100%; border-radius:2px; }
        .pt { font-size:10px; font-weight:700; min-width:26px; text-align:right; }
        .bdg { font-size:9px; font-weight:700; padding:2px 6px; border-radius:5px; }
        .go { font-size:10px; font-weight:600; background:#F0FDF4; color:#15803D; border:1px solid #BBF7D0; border-radius:5px; padding:3px 8px; cursor:pointer; font-family:'DM Sans',sans-serif; white-space:nowrap; }
        .week-chart { display:flex; align-items:flex-end; gap:6px; padding:16px; height:90px; }
        .wbw { flex:1; display:flex; flex-direction:column; align-items:center; gap:4px; height:100%; justify-content:flex-end; }
        .wbt { width:100%; flex:1; background:#F5F5F3; border-radius:4px; overflow:hidden; display:flex; flex-direction:column; justify-content:flex-end; }
        .wbf { width:100%; border-radius:4px; }
        .wday { font-size:9px; color:#AAA; font-weight:500; }
        .wpct { font-size:9px; color:#555; font-weight:500; }
        .tbrow { padding:10px 14px; border-bottom:1px solid #F5F5F3; }
        .tbrow:last-child { border-bottom:none; }
        .tbh { display:flex; justify-content:space-between; margin-bottom:5px; }
        .tbname { font-size:13px; font-weight:500; color:#1A1A1A; }
        .tbpct { font-size:13px; font-weight:500; color:#15803D; }
        .ttrack { width:100%; height:5px; background:#F0F0EE; border-radius:3px; overflow:hidden; }
        .tfill { height:100%; border-radius:3px; background:#22C55E; }
        .tsubm { font-size:11px; color:#AAA; margin-top:3px; }
        .nav-btn { background:#fff; border:1px solid #EFEFED; border-radius:11px; padding:14px 16px; margin-bottom:9px; cursor:pointer; display:flex; align-items:center; justify-content:space-between; width:100%; text-align:left; font-family:'DM Sans',sans-serif; transition:all .12s; }
        .nav-btn:hover { border-color:#BBF7D0; background:#F0FDF4; }
        .bk { font-size:11px; color:#AAA; background:none; border:none; cursor:pointer; font-family:'DM Sans',sans-serif; display:flex; align-items:center; gap:3px; margin-bottom:8px; }
        .bk:hover { color:#555; }
        .atthr { display:flex; align-items:flex-start; justify-content:space-between; gap:8px; margin-bottom:16px; flex-wrap:wrap; }
        .svbtn { background:#15803D; color:#fff; border:none; border-radius:7px; padding:8px 18px; font-size:12px; font-weight:600; cursor:pointer; font-family:'DM Sans',sans-serif; white-space:nowrap; }
        .svbtn:disabled { opacity:.5; }
        .date-input { height:34px; border:1px solid #EFEFED; border-radius:8px; padding:0 10px; font-size:12px; font-family:'DM Sans',sans-serif; color:#1A1A1A; background:#fff; outline:none; }
        .date-input:focus { border-color:#15803D; }
        .att-sum { display:grid; grid-template-columns:repeat(4,1fr); gap:7px; margin-bottom:14px; }
        .asc { border-radius:9px; padding:9px 8px; text-align:center; }
        .asn { font-size:18px; font-weight:500; }
        .asl { font-size:9px; margin-top:2px; text-transform:uppercase; letter-spacing:.04em; }
        .mark-row { display:flex; gap:5px; margin-bottom:12px; align-items:center; flex-wrap:wrap; }
        .mark-lbl { font-size:11px; color:#AAA; }
        .mark-btn { font-size:11px; padding:4px 10px; border-radius:7px; border:1px solid transparent; cursor:pointer; font-family:'DM Sans',sans-serif; font-weight:500; }
        .lcard { background:#fff; border:1.5px solid #EFEFED; border-radius:9px; padding:10px 12px; margin-bottom:6px; }
        .ltop { display:flex; align-items:center; justify-content:space-between; margin-bottom:7px; gap:5px; flex-wrap:wrap; }
        .lname { font-size:13px; font-weight:500; color:#1A1A1A; display:flex; align-items:center; gap:7px; }
        .sdot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
        .sbtns { display:flex; gap:4px; flex-wrap:wrap; }
        .sbtn { padding:4px 9px; border-radius:7px; border:2px solid transparent; cursor:pointer; font-size:10px; font-weight:600; font-family:'DM Sans',sans-serif; transition:all .1s; }
        .ni { width:100%; height:30px; border:1px solid #F0F0EE; border-radius:6px; padding:0 8px; font-size:11px; font-family:'DM Sans',sans-serif; color:#555; background:#FAFAF8; outline:none; margin-top:6px; }
        .ni:focus { border-color:#15803D; background:#fff; }
        .ni::placeholder { color:#CCC; }
        /* curriculum */
        .cfrow { display:flex; gap:4px; flex-wrap:wrap; align-items:center; margin-bottom:12px; }
        .flbl { font-size:9px; font-weight:700; color:#AAA; text-transform:uppercase; letter-spacing:.05em; margin-right:2px; }
        .fp { padding:4px 10px; border-radius:7px; border:1px solid #EFEFED; background:#fff; font-size:11px; font-weight:600; color:#666; cursor:pointer; font-family:'DM Sans',sans-serif; transition:all .1s; }
        .fp:hover { border-color:#15803D; color:#15803D; }
        .fp.on { background:#15803D; color:#fff; border-color:#15803D; }
        .fp.term { background:#F0FDF4; color:#15803D; border-color:#BBF7D0; }
        .fp.term.on { background:#15803D; border-color:#15803D; color:#fff; }
        .gtabs { display:flex; gap:0; overflow-x:auto; scrollbar-width:none; border-bottom:1px solid #EFEFED; background:#fff; border-radius:10px 10px 0 0; }
        .gtabs::-webkit-scrollbar { display:none; }
        .gtab { padding:8px 13px; font-size:11px; font-weight:600; color:#AAA; background:none; border:none; border-bottom:2px solid transparent; cursor:pointer; font-family:'DM Sans',sans-serif; white-space:nowrap; transition:all .12s; }
        .gtab.on { color:#1A1A1A; border-bottom-color:#1A1A1A; }
        .spills { display:flex; gap:4px; flex-wrap:wrap; padding:8px 12px; background:#FAFAF8; border-bottom:1px solid #EFEFED; }
        .sp { padding:3px 9px; border-radius:5px; border:1px solid #EFEFED; background:#fff; font-size:10px; font-weight:600; color:#888; cursor:pointer; font-family:'DM Sans',sans-serif; transition:all .1s; }
        .sp:hover { color:#1A1A1A; border-color:#CCC; }
        .sp.on { background:#1A1A1A; color:#fff; border-color:#1A1A1A; }
        .tcard { background:#fff; border:1px solid #EFEFED; border-radius:9px; margin-bottom:7px; overflow:hidden; cursor:pointer; transition:all .12s; }
        .tcard:hover { box-shadow:0 2px 8px rgba(0,0,0,.06); transform:translateY(-1px); }
        .tcard.tw { border-left:3px solid #0284C7; }
        .tcard.ov { border-left:3px solid #DC2626; }
        .tcard.dn { border-left:3px solid #16A34A; background:#FDFFFE; }
        .tcin { padding:11px 13px; display:flex; align-items:center; gap:9px; }
        .tcdot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
        .tci { flex:1; min-width:0; }
        .tctit { font-size:13px; font-weight:500; color:#1A1A1A; }
        .tcmeta { font-size:10px; color:#AAA; margin-top:3px; display:flex; gap:5px; flex-wrap:wrap; align-items:center; }
        .sc { font-size:8px; font-weight:800; padding:2px 6px; border-radius:4px; text-transform:uppercase; letter-spacing:.04em; flex-shrink:0; }
        .sc-tw { background:#E0F2FE; color:#0284C7; }
        .sc-ov { background:#FEE2E2; color:#DC2626; }
        .sc-dn { background:#DCFCE7; color:#16A34A; }
        .sc-up { background:#F5F5F3; color:#888; }
        .dtit { font-family:'DM Serif Display',serif; font-size:17px; color:#1A1A1A; margin-bottom:2px; }
        .dsub { font-size:11px; color:#AAA; margin-bottom:12px; }
        .dban { display:flex; align-items:center; gap:6px; background:#F0FDF4; border:1px solid #BBF7D0; border-radius:8px; padding:8px 11px; margin-bottom:14px; font-size:11px; color:#15803D; font-weight:600; flex-wrap:wrap; }
        .mitem { background:#fff; border:1px solid #EFEFED; border-radius:8px; padding:9px 11px; display:flex; align-items:center; gap:7px; margin-bottom:6px; }
        .mico { width:28px; height:28px; border-radius:6px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .mname { font-size:12px; font-weight:500; color:#1A1A1A; }
        .mlink { font-size:10px; color:#0369A1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:200px; }
        .olink { font-size:10px; font-weight:700; background:#F0FDF4; color:#15803D; border:1px solid #BBF7D0; border-radius:5px; padding:3px 7px; text-decoration:none; white-space:nowrap; flex-shrink:0; }
        .fbox { background:#F0FDF4; border:1px solid #BBF7D0; border-radius:9px; padding:11px 13px; margin-top:12px; }
        .fbtit { font-size:10px; font-weight:700; color:#15803D; margin-bottom:6px; display:flex; align-items:center; gap:4px; }
        .dacts { display:flex; gap:6px; flex-wrap:wrap; margin-top:12px; }
        .act { display:flex; align-items:center; gap:4px; border:none; border-radius:7px; padding:8px 14px; font-size:11px; font-weight:700; cursor:pointer; font-family:'DM Sans',sans-serif; }
        /* topic table */
        .prog-table { background:#fff; border:1px solid #EFEFED; border-radius:11px; overflow:hidden; }
        .prog-inner { overflow-x:auto; -webkit-overflow-scrolling:touch; }
        table { width:100%; border-collapse:collapse; }
        thead tr { background:#FAFAF8; border-bottom:1px solid #EFEFED; }
        th { padding:8px 6px; font-size:10px; font-weight:600; color:#AAA; text-align:center; letter-spacing:.03em; }
        th:first-child { text-align:left; min-width:130px; padding:8px 12px; }
        th:last-child { min-width:50px; }
        .th-topic { display:block; writing-mode:vertical-rl; text-orientation:mixed; transform:rotate(180deg); max-height:90px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:10px; font-weight:600; color:#555; }
        td { padding:8px 6px; border-bottom:1px solid #FAFAF8; text-align:center; vertical-align:middle; }
        td:first-child { text-align:left; padding:8px 12px; }
        tr:last-child td { border-bottom:none; }
        tr:hover td { background:#FAFAF8; }
        .lncell { font-size:13px; font-weight:500; color:#1A1A1A; }
        .lsub { font-size:10px; color:#AAA; margin-top:1px; }
        .tick-btn { width:30px; height:30px; border-radius:8px; border:2px solid #EFEFED; background:#fff; cursor:pointer; display:flex; align-items:center; justify-content:center; margin:0 auto; transition:all .12s; }
        .tick-btn.done { background:#22C55E; border-color:#22C55E; }
        .tick-btn:not(.done):hover { border-color:#BBF7D0; background:#F0FDF4; }
        .pct-badge { font-size:11px; font-weight:500; padding:3px 7px; border-radius:7px; display:inline-block; }
        /* behaviour */
        .bseg { display:flex; background:#F5F5F3; border-radius:9px; padding:3px; gap:2px; margin-bottom:12px; }
        .bseg-btn { flex:1; padding:6px; border:none; border-radius:7px; font-size:11px; font-weight:700; cursor:pointer; font-family:'DM Sans',sans-serif; transition:all .1s; background:transparent; color:#888; }
        .bseg-btn.on { background:#fff; color:#1A1A1A; box-shadow:0 1px 3px rgba(0,0,0,.08); }
        .bcf { display:flex; gap:4px; flex-wrap:wrap; margin-bottom:12px; }
        .bab { display:flex; align-items:center; gap:4px; border:none; border-radius:7px; padding:7px 12px; font-size:11px; font-weight:700; cursor:pointer; font-family:'DM Sans',sans-serif; }
        .brec { background:#fff; border:1px solid #EFEFED; border-radius:9px; padding:11px 13px; margin-bottom:7px; }
        .brh { display:flex; align-items:flex-start; justify-content:space-between; gap:6px; margin-bottom:3px; }
        .blrn { font-size:13px; font-weight:500; color:#1A1A1A; }
        .bctag { font-size:9px; background:#F5F5F3; color:#888; padding:1px 5px; border-radius:3px; font-weight:600; }
        .btyp { font-size:9px; font-weight:800; padding:2px 7px; border-radius:5px; }
        .bnote { font-size:11px; color:#666; margin-top:3px; line-height:1.5; }
        .btime { font-size:9px; color:#CCC; margin-top:2px; }
        .delb { background:none; border:none; cursor:pointer; color:#DDD; padding:2px; }
        .delb:hover { color:#DC2626; }
        /* modals */
        .mov { position:fixed; inset:0; background:rgba(0,0,0,.4); z-index:100; display:flex; align-items:flex-end; justify-content:center; }
        .mo { background:#fff; border-radius:18px 18px 0 0; padding:22px 18px calc(env(safe-area-inset-bottom,0px) + 22px); width:100%; max-width:480px; }
        @media(min-width:600px) { .mov { align-items:center; padding:20px; } .mo { border-radius:14px; max-width:420px; } }
        .mtit { font-size:14px; font-weight:700; color:#1A1A1A; margin-bottom:2px; }
        .msub { font-size:11px; color:#AAA; margin-bottom:16px; }
        .mlbl { font-size:9px; font-weight:800; color:#555; margin-bottom:5px; text-transform:uppercase; letter-spacing:.05em; }
        .msel { width:100%; height:36px; border:1px solid #EFEFED; border-radius:8px; padding:0 9px; font-size:12px; font-family:'DM Sans',sans-serif; color:#1A1A1A; background:#fff; outline:none; margin-bottom:12px; }
        .tgrid { display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-bottom:12px; }
        .tpill { padding:7px 8px; border-radius:8px; border:1.5px solid #EFEFED; cursor:pointer; font-size:11px; font-weight:600; font-family:'DM Sans',sans-serif; text-align:center; transition:all .1s; background:#fff; color:#555; }
        .tpill.sel { border-width:2px; font-weight:800; }
        .mta { width:100%; border:1px solid #EFEFED; border-radius:8px; padding:9px 10px; font-size:12px; font-family:'DM Sans',sans-serif; color:#1A1A1A; resize:none; min-height:64px; outline:none; line-height:1.5; }
        .mta::placeholder { color:#CCC; }
        .upills { display:flex; gap:6px; margin-bottom:14px; }
        .upill { flex:1; padding:8px 5px; border-radius:8px; border:1.5px solid #EFEFED; cursor:pointer; text-align:center; font-size:11px; font-weight:700; font-family:'DM Sans',sans-serif; color:#AAA; transition:all .1s; }
        .upill.good.sel { background:#F0FDF4; border-color:#16A34A; color:#15803D; }
        .upill.mixed.sel { background:#FEFCE8; border-color:#A16207; color:#A16207; }
        .upill.diff.sel { background:#FEF2F2; border-color:#DC2626; color:#DC2626; }
        .macts { display:flex; gap:7px; justify-content:flex-end; margin-top:14px; }
        .mcan { padding:7px 12px; border:1px solid #EFEFED; border-radius:7px; background:#fff; font-size:11px; cursor:pointer; font-family:'DM Sans',sans-serif; color:#666; }
        .msave { padding:7px 18px; border:none; border-radius:7px; font-size:11px; font-weight:800; cursor:pointer; font-family:'DM Sans',sans-serif; color:#fff; }
        .msave:disabled { opacity:.5; }
        .empty { padding:32px; text-align:center; color:#CCC; font-size:12px; }
        @media(min-width:769px) { .bnav { display:none!important } .tab-bar { display:flex } }
        @media(max-width:768px) {
          .tab-bar { display:none } .bnav { display:block }
          .wrap { padding:12px 12px 76px }
          .s3 { gap:7px }
          .uname { display:none }
          .atthr { flex-direction:column }
          .att-sum { gap:5px }
          .hrow { gap:6px }
        }
      `}</style>

      {/* ── Feedback modal ── */}
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

      {/* ── Behaviour modal ── */}
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
                  {(classLearners[c.id] || []).map(l => <option key={l.id} value={l.id}>{l.full_name}</option>)}
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
                onClick={saveBeh} disabled={behSaving || !behLearner || !behType}>
                {behSaving ? '...' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Topbar ── */}
      <div className="topbar">
        <div className="brand">
          <div className="brand-icon">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7z"/></svg>
          </div>
          <span className="brand-name">Islamic Teacher</span>
        </div>
        <div className="tbar-r">
          {activeYearName && (
            <div className="yr-chip">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              {activeYearName}
            </div>
          )}
          <div className="uchip">
            <div className="av">{teacherName.charAt(0)}</div>
            <span className="uname">{teacherName}</span>
          </div>
          <button className="logout" onClick={async () => { await supabase.auth.signOut(); router.push('/') }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Out
          </button>
        </div>
      </div>

      {/* ── Desktop tabs ── */}
      <div className="tab-bar">
        {BOTTOM_TABS.map(t => (
          <button key={t.key} className={`tab-btn ${activeTab === t.key ? 'active' : ''}`} onClick={() => switchTab(t.key)}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div className="wrap">

        {/* ════ DASHBOARD ════ */}
        {activeTab === 'dashboard' && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <div className="h1">Good morning, {teacherName.split(' ')[0]}</div>
              <div className="sub">{dateFormatted}</div>
            </div>
            <div className="s3">
              <div className="scard"><div className="sn" style={{ color: '#15803D' }}>{myClasses.length}</div><div className="sl">Classes</div></div>
              <div className="scard"><div className="sn" style={{ color: '#1D4ED8' }}>{allLearners.length}</div><div className="sl">Learners</div></div>
              <div className="scard">
                <div className="sn" style={{ color: attStats.length > 0 && Math.round(attStats.reduce((a, s) => a + s.pct, 0) / attStats.length) < 70 ? '#EF4444' : '#15803D' }}>
                  {attStats.length > 0 ? Math.round(attStats.reduce((a, s) => a + s.pct, 0) / attStats.length) : 0}%
                </div>
                <div className="sl">Avg Att.</div>
              </div>
            </div>

            {overdue > 0 && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 9, padding: '9px 13px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 7 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <span style={{ fontSize: 12, color: '#DC2626', fontWeight: 600 }}>{overdue} gecikmeli konu</span>
                <button className="go" style={{ marginLeft: 'auto', background: '#FEF2F2', color: '#DC2626', borderColor: '#FCA5A5' }} onClick={() => switchTab('curriculum')}>İncele →</button>
              </div>
            )}

            {weeklyAtt.length > 0 && (
              <div className="card">
                <div className="ch"><span className="ct">Attendance This Week</span></div>
                <div className="week-chart">
                  {weeklyAtt.map((d, i) => (
                    <div key={i} className="wbw">
                      <span className="wpct" style={{ color: d.hasData ? (d.pct >= 70 ? '#15803D' : '#EF4444') : '#CCC' }}>{d.hasData ? `${d.pct}%` : '—'}</span>
                      <div className="wbt"><div className="wbf" style={{ height: `${d.hasData ? Math.max(d.pct, 4) : 4}%`, background: d.hasData ? (d.pct >= 70 ? '#22C55E' : '#EF4444') : '#E5E5E5' }} /></div>
                      <span className="wday">{d.day}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {thisWk > 0 && (
              <div className="card">
                <div className="ch"><span className="ct">This Week's Topics</span><button className="go" onClick={() => switchTab('curriculum')}>All →</button></div>
                {currTopics.filter(t => topicStatus(t) === 'this-week').slice(0, 4).map(t => {
                  const p = currProgress.find(x => x.topic_id === t.id)
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
              <div className="ch"><span className="ct">Learner Attendance</span><span style={{ fontSize: 11, color: '#AAA' }}>{allLearners.length} learners</span></div>
              {attStats.length === 0 ? <div className="empty">No data yet</div> : attStats.map((s: any) => (
                <div key={`${s.learner.id}-${s.cls.id}`} className="lr">
                  <div style={{ minWidth: 110 }}><div className="rn">{s.learner.full_name}</div><div className="rs">{s.cls.name}</div></div>
                  <div className="pbar">
                    <div className="btrack"><div className="bfill" style={{ width: `${s.pct}%`, background: s.pct >= 70 ? '#22C55E' : '#EF4444' }} /></div>
                    <span className="pt" style={{ color: s.pct >= 70 ? '#15803D' : '#DC2626' }}>{s.pct}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ════ ATTENDANCE ════ */}
        {activeTab === 'attendance' && (
          <div>
            {!selectedSession ? (
              <div>
                <div style={{ marginBottom: 14 }}><div className="h1">Attendance</div><div className="sub">Select a session</div></div>
                {todaySessions.length === 0
                  ? <div className="card"><div className="empty">{todayName} has no scheduled sessions</div></div>
                  : todaySessions.map(s => (
                    <button key={s.id} className="nav-btn" onClick={() => selectSession(s)}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A1A' }}>{s.name}</div>
                        <div style={{ fontSize: 11, color: '#AAA', marginTop: 2 }}>{s.classes?.name} · {s.start_time?.slice(0,5)} – {s.end_time?.slice(0,5)} · {learnersForClass(s.classes?.id || '').length} learners</div>
                      </div>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#15803D" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                    </button>
                  ))}
              </div>
            ) : (
              <div>
                <div className="atthr">
                  <div>
                    <button className="bk" onClick={() => { setSelectedSession(null); setSaved(false) }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg> Back
                    </button>
                    <div className="h1">{selectedSession.name}</div>
                    <div className="sub">{selectedSession.classes?.name} · {selectedSession.start_time?.slice(0,5)} – {selectedSession.end_time?.slice(0,5)}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <input type="date" value={attDate} onChange={e => changeDate(e.target.value)} className="date-input" />
                    <button className="svbtn" onClick={saveAttendance} disabled={saving}>{saving ? 'Saving...' : saved ? '✓ Saved' : 'Save'}</button>
                  </div>
                </div>

                <div className="att-sum">
                  {[{ l: 'Present', n: presentCount, bg: '#F0FDF4', c: '#15803D' },
                    { l: 'Late',    n: lateCount,    bg: '#FEFCE8', c: '#A16207' },
                    { l: 'Absent',  n: absentCount,  bg: '#FEF2F2', c: '#B91C1C' },
                    { l: 'Excused', n: excusedCount, bg: '#EFF6FF', c: '#1D4ED8' }].map(s => (
                    <div key={s.l} className="asc" style={{ background: s.bg }}>
                      <div className="asn" style={{ color: s.c }}>{s.n}</div>
                      <div className="asl" style={{ color: s.c }}>{s.l}</div>
                    </div>
                  ))}
                </div>

                <div className="mark-row">
                  <span className="mark-lbl">Mark all:</span>
                  {STATUS_OPTIONS.map(s => (
                    <button key={s.key} className="mark-btn" onClick={() => markAll(s.key)} style={{ background: s.light, color: s.text }}>{s.label}</button>
                  ))}
                </div>

                {sessLearners.map(l => {
                  const status = attendance[l.id] || 'absent'
                  const cfg = STATUS_OPTIONS.find(s => s.key === status)
                  return (
                    <div key={l.id} className="lcard" style={{ borderColor: cfg?.light || '#EFEFED' }}>
                      <div className="ltop">
                        <div className="lname">
                          <div className="sdot" style={{ background: cfg?.bg || '#EF4444' }} />
                          {l.full_name}
                        </div>
                        <div className="sbtns">
                          {STATUS_OPTIONS.map(s => (
                            <button key={s.key} className="sbtn"
                              onClick={() => { setAttendance(prev => ({ ...prev, [l.id]: s.key })); setSaved(false) }}
                              style={{ background: status === s.key ? s.bg : '#F8F8F6', color: status === s.key ? 'white' : '#AAA', borderColor: status === s.key ? s.bg : 'transparent' }}>
                              {s.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <input className="ni" value={attNotes[l.id] || ''} placeholder="Note..."
                        onChange={e => { setAttNotes(prev => ({ ...prev, [l.id]: e.target.value })); setSaved(false) }} />
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ════ CURRICULUM ════ */}
        {activeTab === 'curriculum' && (
          <div>
            {currView === 'list' ? (
              <div>
                <div style={{ marginBottom: 14 }}>
                  <div className="h1">Islamic Curriculum</div>
                  <div className="sub">Konu planı ve ilerleme</div>
                </div>
                <div className="s3" style={{ marginBottom: 14 }}>
                  <div className="scard"><div className="sn" style={{ color: '#0284C7', fontSize: 18 }}>{thisWk}</div><div className="sl">Bu Hafta</div></div>
                  <div className="scard"><div className="sn" style={{ color: '#16A34A', fontSize: 18 }}>{done}</div><div className="sl">Tamamlandı</div></div>
                  <div className="scard"><div className="sn" style={{ color: overdue > 0 ? '#DC2626' : '#AAA', fontSize: 18 }}>{overdue}</div><div className="sl">Gecikmeli</div></div>
                </div>

                <div className="cfrow">
                  <span className="flbl">Göster:</span>
                  <button className={`fp ${currFilter === 'week' ? 'on' : ''}`} onClick={() => setCurrFilter('week')}>Bu Hafta</button>
                  <button className={`fp ${currFilter === 'all' ? 'on' : ''}`} onClick={() => setCurrFilter('all')}>Tümü</button>
                  {currTerms.map(t => <button key={t.id} className={`fp term ${currFilter === 'term' && activeTerm?.id === t.id ? 'on' : ''}`} onClick={() => { setCurrFilter('term'); setActiveTerm(t) }}>{t.name}</button>)}
                </div>

                {currGrades.length > 0 && (
                  <div className="card" style={{ marginBottom: 10 }}>
                    <div className="gtabs">
                      <button className={`gtab ${!activeGrade ? 'on' : ''}`} onClick={() => { setActiveGrade(null); setActiveSub(null) }}>Tüm Sınıflar</button>
                      {currGrades.map(g => <button key={g.id} className={`gtab ${activeGrade === g.id ? 'on' : ''}`} onClick={() => { setActiveGrade(g.id); setActiveSub(null) }}>{g.name}</button>)}
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
                  const p = currProgress.find(x => x.topic_id === t.id)
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
                      const s = topicStatus(selTopic), p = currProgress.find(x => x.topic_id === selTopic.id)
                      if (p?.is_completed) return <span className="sc sc-dn" style={{ marginLeft: 4 }}>Done</span>
                      if (s === 'this-week') return <span className="sc sc-tw" style={{ marginLeft: 4 }}>Bu Hafta</span>
                      if (s === 'overdue') return <span className="sc sc-ov" style={{ marginLeft: 4 }}>Gecikti</span>
                      return null
                    })()}
                  </div>
                )}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 9, fontWeight: 800, color: '#AAA', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 9 }}>Materyaller {currMaterials.length > 0 && `(${currMaterials.length})`}</div>
                  {currMaterials.length === 0
                    ? <div style={{ background: '#FAFAF8', border: '1px solid #F0F0EE', borderRadius: 8, padding: 16, textAlign: 'center', color: '#CCC', fontSize: 11 }}>Materyal eklenmemiş</div>
                    : currMaterials.map(m => {
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
                  const p = currProgress.find(x => x.topic_id === selTopic.id)
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

        {/* ════ TOPICS (per-learner table) ════ */}
        {activeTab === 'topics' && (
          <div>
            {!topicClass ? (
              <div>
                <div style={{ marginBottom: 14 }}><div className="h1">Topic Tracking</div><div className="sub">Per-learner progress table</div></div>
                {myClasses.length === 0
                  ? <div className="empty">No classes assigned</div>
                  : myClasses.map(cls => (
                    <button key={cls.id} className="nav-btn" onClick={() => selectTopicClass(cls)}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A1A' }}>{cls.name}</div>
                        <div style={{ fontSize: 11, color: '#AAA', marginTop: 2 }}>{learnersForClass(cls.id).length} learners</div>
                      </div>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#15803D" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                    </button>
                  ))}
              </div>
            ) : !topicSubject ? (
              <div>
                <button className="bk" onClick={() => setTopicClass(null)}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg> Back
                </button>
                <div style={{ marginBottom: 14 }}><div className="h1">{topicClass.name}</div><div className="sub">Select a subject</div></div>
                {topicSubjects.length === 0
                  ? <div className="empty">No subjects — admin needs to add curriculum for this class</div>
                  : topicSubjects.map(s => (
                    <button key={s.id} className="nav-btn" onClick={() => selectTopicSubject(s)}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A1A' }}>{s.name}</div>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#15803D" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                    </button>
                  ))}
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <button className="bk" onClick={() => setTopicSubject(null)}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg> Back
                    </button>
                    <div className="h1">{topicSubject.name}</div>
                    <div style={{ fontSize: 11, color: '#AAA' }}>{topicClass.name} · {topicList.length} topics · {learnersForClass(topicClass.id).length} learners</div>
                  </div>
                  <button className="svbtn" onClick={saveTopicProgress} disabled={savingProg}>
                    {savingProg ? 'Saving...' : savedProg ? '✓ Saved' : 'Save progress'}
                  </button>
                </div>

                {topicList.length === 0 ? (
                  <div className="empty">No tracked topics — admin must enable "Track per learner"</div>
                ) : learnersForClass(topicClass.id).length === 0 ? (
                  <div className="empty">No learners in this class</div>
                ) : (
                  <div className="prog-table">
                    <div className="prog-inner">
                      <table>
                        <thead>
                          <tr>
                            <th>Learner</th>
                            {topicList.map(t => (
                              <th key={t.id} title={t.title}>
                                <span className="th-topic">{t.title}</span>
                              </th>
                            ))}
                            <th>%</th>
                          </tr>
                        </thead>
                        <tbody>
                          {learnersForClass(topicClass.id).map((l: any) => {
                            const cc = topicList.filter(t => topicProgress[l.id]?.[t.id]).length
                            const pct = topicList.length > 0 ? Math.round((cc / topicList.length) * 100) : 0
                            return (
                              <tr key={`${l.id}-${topicSubject.id}`}>
                                <td>
                                  <div className="lncell">{l.full_name}</div>
                                  <div className="lsub">{cc}/{topicList.length}</div>
                                </td>
                                {topicList.map(t => (
                                  <td key={`${l.id}-${t.id}`}>
                                    <button className={`tick-btn ${topicProgress[l.id]?.[t.id] ? 'done' : ''}`} onClick={() => toggleTopicProg(l.id, t.id)}>
                                      {topicProgress[l.id]?.[t.id]
                                        ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                                        : <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#E5E5E5' }} />}
                                    </button>
                                  </td>
                                ))}
                                <td>
                                  <span className="pct-badge" style={{ background: pct >= 70 ? '#F0FDF4' : pct >= 40 ? '#FEFCE8' : '#FEF2F2', color: pct >= 70 ? '#15803D' : pct >= 40 ? '#A16207' : '#B91C1C' }}>{pct}%</span>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ════ BEHAVIOUR ════ */}
        {activeTab === 'behaviour' && (
          <div>
            <div className="hrow" style={{ marginBottom: 12 }}>
              <div><div className="h1">Behaviour</div><div className="sub">Incidents & praise</div></div>
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
                <button className={`fp ${!behClassFilter ? 'on' : ''}`} onClick={() => setBehClassFilter(null)}>All Classes</button>
                {behClasses.map(c => <button key={c.id} className={`fp ${behClassFilter === c.id ? 'on' : ''}`} onClick={() => setBehClassFilter(c.id)}>{c.name}</button>)}
              </div>
            )}
            {behTab === 'incidents' && (
              filtInc.length === 0
                ? <div className="card"><div className="empty">No incidents recorded</div></div>
                : filtInc.map(i => {
                    const cfg = INCIDENT_TYPES.find(t => t.key === i.type) || INCIDENT_TYPES[6]
                    return (
                      <div key={i.id} className="brec" style={{ borderLeft: `3px solid ${cfg.c}` }}>
                        <div className="brh">
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                              <div className="blrn">{i.learners?.full_name}</div>
                              {learnerClassMap[i.learner_id] && <span className="bctag">{learnerClassMap[i.learner_id]}</span>}
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
                ? <div className="card"><div className="empty">No praise records yet</div></div>
                : filtPr.map(i => {
                    const cfg = PRAISE_TYPES.find(t => t.key === i.type) || PRAISE_TYPES[5]
                    return (
                      <div key={i.id} className="brec" style={{ borderLeft: `3px solid ${cfg.c}` }}>
                        <div className="brh">
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                              <div className="blrn">{i.learners?.full_name}</div>
                              {learnerClassMap[i.learner_id] && <span className="bctag">{learnerClassMap[i.learner_id]}</span>}
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

      </div>

      {/* ── Mobile nav ── */}
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