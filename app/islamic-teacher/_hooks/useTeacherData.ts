'use client'
// ─── useTeacherData ────────────────────────────────────────────────────────
// Central data hook. All Supabase calls live here.
// Uses BULK queries — one call per data type, not one per learner.
// Components call this hook and get data + actions back.

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import {
  dedup, weekBounds, attendanceStreak,
} from '../_types/constants'
import type {
  Learner, ClassRecord, AttendanceRecord, BehaviourRecord,
  CurriculumTopic, CurriculumProgress, QuizSession, QuizResult,
  ReportRow, SubjectBreakdown,
} from '../_types/index'

export function useTeacherData() {
  const router   = useRouter()
  const supabase = useMemo(() => createClient(), [])

  // ── Identity ────────────────────────────────────────────────
  const [teacherId, setTeacherId]       = useState('')
  const [teacherName, setTeacherName]   = useState('')
  const [activeYearId, setActiveYearId] = useState<string | null>(null)
  const [activeYearName, setActiveYearName] = useState<string | null>(null)
  const [ready, setReady]               = useState(false)

  // ── Classes & learners ──────────────────────────────────────
  const [myClasses, setMyClasses]         = useState<ClassRecord[]>([])
  const [classLearners, setClassLearners] = useState<Record<string, Learner[]>>({})

  // ── Raw attendance (bulk loaded once) ──────────────────────
  const [rawAttData, setRawAttData]     = useState<Record<string, AttendanceRecord[]>>({})
  const [attStats, setAttStats]         = useState<any[]>([])
  const [weeklyAtt, setWeeklyAtt]       = useState<any[]>([])

  // ── Curriculum ──────────────────────────────────────────────
  const [currSubjects, setCurrSubjects] = useState<any[]>([])
  const [currTopics, setCurrTopics]     = useState<CurriculumTopic[]>([])
  const [currProgress, setCurrProgress] = useState<CurriculumProgress[]>([])
  const [currTerms, setCurrTerms]       = useState<any[]>([])
  const [topicTerms, setTopicTerms]     = useState<any[]>([])

  // ── Today sessions ──────────────────────────────────────────
  const [todaySessions, setTodaySessions] = useState<any[]>([])

  // ── Behaviour ───────────────────────────────────────────────
  const [incidents, setIncidents] = useState<BehaviourRecord[]>([])
  const [praises, setPraises]     = useState<BehaviourRecord[]>([])

  // ── Quizzes ─────────────────────────────────────────────────
  const [quizSessions, setQuizSessions] = useState<QuizSession[]>([])
  const [quizResults, setQuizResults]   = useState<QuizResult[]>([])

  // ── Derived ─────────────────────────────────────────────────
  const allLearners = useMemo(
    () => dedup(Object.values(classLearners).flat()),
    [classLearners]
  )
  const learnerClassMap = useMemo(() => {
    const m: Record<string, string> = {}
    myClasses.forEach(cls => {
      ;(classLearners[cls.id] || []).forEach(l => { m[l.id] = cls.name })
    })
    return m
  }, [classLearners, myClasses])

  // ────────────────────────────────────────────────────────────
  // INIT
  // ────────────────────────────────────────────────────────────
  useEffect(() => { init() }, [])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }

    const { data: u } = await supabase
      .from('users').select('*').eq('auth_id', user.id).single()
    if (!u || u.role !== 'islamic_teacher') { router.push('/'); return }

    setTeacherName(u.full_name)
    setTeacherId(u.id)

    const { data: yr } = await supabase
      .from('academic_years').select('id,name').eq('is_active', true).single()
    const yId = yr?.id || null
    if (yr) { setActiveYearName(yr.name); setActiveYearId(yId) }

    // Load assigned classes
    const { data: itc } = await supabase
      .from('islamic_teacher_classes')
      .select('*, classes(id,name,class_type)')
      .eq('teacher_id', u.id)
    const classList: ClassRecord[] = (itc || []).map((a: any) => a.classes).filter(Boolean)
    setMyClasses(classList)
    if (!classList.length) { setReady(true); return }

    // ── BULK: load all learner-class memberships in one query ──
    const classIds = classList.map(c => c.id)
    let lcQuery = supabase
      .from('learner_classes')
      .select('learner_id, class_id, learners(id,full_name)')
      .in('class_id', classIds)
    if (yId) lcQuery = lcQuery.eq('academic_year_id', yId)
    const { data: lcData } = await lcQuery

    const lcMap: Record<string, Learner[]> = {}
    classList.forEach(c => { lcMap[c.id] = [] })
    ;(lcData || []).forEach((row: any) => {
      if (row.learners?.id && lcMap[row.class_id]) {
        // only add if not already present
        if (!lcMap[row.class_id].find((l: Learner) => l.id === row.learners.id)) {
          lcMap[row.class_id].push({ id: row.learners.id, full_name: row.learners.full_name })
        }
      }
    })
    setClassLearners(lcMap)

    const allLearnerIds = [...new Set((lcData || []).map((r: any) => r.learners?.id).filter(Boolean))]

    // ── Run all data loads in PARALLEL ────────────────────────
    await Promise.all([
      loadTodaySessions(u.id),
      loadAttendanceBulk(allLearnerIds, lcMap, classList),
      loadCurriculum(classIds),
      loadBehaviourBulk(allLearnerIds),
      loadQuizzes(u.id),
    ])

    setReady(true)
  }

  // ────────────────────────────────────────────────────────────
  // ATTENDANCE — one query for ALL learners
  // ────────────────────────────────────────────────────────────
  async function loadAttendanceBulk(
    allIds: string[],
    lcMap: Record<string, Learner[]>,
    classList: ClassRecord[]
  ) {
    if (!allIds.length) return

    // Single query — all learners, all time
    const { data: attData } = await supabase
      .from('attendance')
      .select('learner_id, status, attendance_date')
      .in('learner_id', allIds)

    // Group by learner_id
    const byLearner: Record<string, AttendanceRecord[]> = {}
    allIds.forEach(id => { byLearner[id] = [] })
    ;(attData || []).forEach((row: any) => {
      if (byLearner[row.learner_id]) byLearner[row.learner_id].push(row)
    })
    setRawAttData(byLearner)

    // Build stats per learner
    const stats: any[] = []
    classList.forEach(cls => {
      ;(lcMap[cls.id] || []).forEach(learner => {
        const d = byLearner[learner.id] || []
        const total   = d.length
        const present = d.filter(a => a.status === 'present' || a.status === 'late').length
        stats.push({
          learner, cls,
          total, present,
          pct:    total > 0 ? Math.round((present / total) * 100) : 0,
          attData: d,
          streak: attendanceStreak(d),
        })
      })
    })
    setAttStats(stats)

    // Weekly bar chart
    const days = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i)
      const ds = d.toISOString().split('T')[0]
      const recs = stats.flatMap(s => s.attData.filter((a: any) => a.attendance_date === ds))
      const tot = recs.length
      const pr  = recs.filter((a: any) => a.status === 'present' || a.status === 'late').length
      days.push({
        day:     d.toLocaleDateString('en-ZA', { weekday: 'short' }),
        pct:     tot > 0 ? Math.round((pr / tot) * 100) : 0,
        hasData: tot > 0,
      })
    }
    setWeeklyAtt(days)
  }

  // ────────────────────────────────────────────────────────────
  // CURRICULUM — bulk
  // ────────────────────────────────────────────────────────────
  async function loadCurriculum(classIds: string[]) {
    const { data: subs } = await supabase
      .from('curriculum_subjects')
      .select('*, classes(id,name)')
      .in('class_id', classIds)
      .eq('is_active', true)
      .order('order_num')
    setCurrSubjects(subs || [])
    if (!subs?.length) return

    const subIds = subs.map((s: any) => s.id)
    const { data: tops } = await supabase
      .from('curriculum_topics')
      .select('*, curriculum_subjects(id,name,class_id,classes(id,name))')
      .in('subject_id', subIds)
      .eq('is_active', true)
      .is('parent_topic_id', null)
      .order('order_num')
    setCurrTopics((tops || []) as CurriculumTopic[])

    if (tops?.length) {
      const tids = tops.map((t: any) => t.id)
      const [{ data: prog }, { data: ttMap }] = await Promise.all([
        supabase.from('curriculum_progress').select('*').in('topic_id', tids),
        supabase.from('curriculum_topic_terms').select('*').in('topic_id', tids),
      ])
      setCurrProgress((prog || []) as CurriculumProgress[])
      setTopicTerms(ttMap || [])
    }

    const { data: trms } = await supabase
      .from('curriculum_terms')
      .select('*')
      .in('class_id', classIds)
      .eq('is_active', true)
      .order('order_num')
    setCurrTerms(trms || [])
  }

  // ────────────────────────────────────────────────────────────
  // BEHAVIOUR — one query for ALL learners
  // ────────────────────────────────────────────────────────────
  async function loadBehaviourBulk(allIds: string[]) {
    if (!allIds.length) return
    const [{ data: inc }, { data: pr }] = await Promise.all([
      supabase.from('behaviour_logs')
        .select('*, learners(full_name)')
        .in('learner_id', allIds)
        .eq('type', 'incident')
        .order('created_at', { ascending: false }),
      supabase.from('behaviour_logs')
        .select('*, learners(full_name)')
        .in('learner_id', allIds)
        .eq('type', 'praise')
        .order('created_at', { ascending: false }),
    ])
    setIncidents((inc || []) as BehaviourRecord[])
    setPraises((pr || []) as BehaviourRecord[])
  }

  // ────────────────────────────────────────────────────────────
  // TODAY SESSIONS
  // ────────────────────────────────────────────────────────────
  async function loadTodaySessions(tId: string) {
    const dayNum = new Date().getDay() === 0 ? 7 : new Date().getDay()
    const { data } = await supabase
      .from('timetable')
      .select('*, classes(name,id,class_type)')
      .eq('teacher_id', tId)
      .eq('day_of_week', dayNum)
      .order('start_time')
    setTodaySessions(data || [])
  }

  // ────────────────────────────────────────────────────────────
  // QUIZZES — bulk
  // ────────────────────────────────────────────────────────────
  async function loadQuizzes(tId: string) {
    const { data: qs } = await supabase
      .from('quiz_sessions')
      .select('*, classes(name), curriculum_topics(title, curriculum_subjects(name))')
      .eq('created_by', tId)
      .order('created_at', { ascending: false })
    setQuizSessions((qs || []) as QuizSession[])

    if (qs?.length) {
      const { data: qr } = await supabase
        .from('quiz_results')
        .select('quiz_session_id, score, total, percentage')
        .in('quiz_session_id', qs.map((s: any) => s.id))
      setQuizResults((qr || []) as QuizResult[])
    }
  }

  // ────────────────────────────────────────────────────────────
  // REPORT — bulk, all data already loaded
  // ────────────────────────────────────────────────────────────
  async function buildReport(cls: ClassRecord): Promise<ReportRow[]> {
    const learners = classLearners[cls.id] || []
    if (!learners.length) return []

    const { data: subs } = await supabase
      .from('curriculum_subjects')
      .select('id,name')
      .eq('class_id', cls.id)
      .eq('is_active', true)

    const { data: tops } = await supabase
      .from('curriculum_topics')
      .select('id,title,subject_id')
      .in('subject_id', (subs || []).map((s: any) => s.id))
      .eq('is_active', true)
      .eq('track_per_learner', true)
    const tIds = (tops || []).map((t: any) => t.id)
    const lIds = learners.map(l => l.id)

    const { wsStr, weStr }            = weekBounds(0)
    const { wsStr: prevWsStr, weStr: prevWeStr } = weekBounds(-1)

    // Single bulk query for topic progress
    const { data: progAll } = tIds.length
      ? await supabase.from('learner_topic_progress').select('*').in('learner_id', lIds).in('topic_id', tIds)
      : { data: [] }

    const progThisWeek = (progAll || []).filter((p: any) => p.completed_date >= wsStr && p.completed_date <= weStr)
    const progLastWeek = (progAll || []).filter((p: any) => p.completed_date >= prevWsStr && p.completed_date <= prevWeStr)
    const progCompleted = (progAll || []).filter((p: any) => p.completed)

    const result = learners.map(l => {
      const lAtt      = rawAttData[l.id] || []
      const attCurr   = lAtt.filter(a => a.attendance_date >= wsStr && a.attendance_date <= weStr)
      const attPrev   = lAtt.filter(a => a.attendance_date >= prevWsStr && a.attendance_date <= prevWeStr)
      const calcPct   = (arr: AttendanceRecord[]) => arr.length > 0
        ? Math.round(arr.filter(a => a.status === 'present' || a.status === 'late').length / arr.length * 100)
        : null

      const attPctCurr = calcPct(attCurr)
      const attPctPrev = calcPct(attPrev)
      const topicsThisWeek = progThisWeek.filter((p: any) => p.learner_id === l.id).length
      const topicsLastWeek = progLastWeek.filter((p: any) => p.learner_id === l.id).length
      const topicsTotal    = progCompleted.filter((p: any) => p.learner_id === l.id).length
      const overallAtt     = lAtt.length > 0
        ? Math.round(lAtt.filter(a => a.status === 'present' || a.status === 'late').length / lAtt.length * 100)
        : 0

      const subBreakdown: SubjectBreakdown[] = (subs || []).map((s: any) => {
        const subTops    = (tops || []).filter((t: any) => t.subject_id === s.id)
        const completed  = subTops.filter((t: any) => progCompleted.find((p: any) => p.learner_id === l.id && p.topic_id === t.id)).length
        return {
          subjectId: s.id, subjectName: s.name, completed,
          total: subTops.length,
          pct:   subTops.length > 0 ? Math.round(completed / subTops.length * 100) : 0,
        }
      })

      // Consecutive absent — count backwards from most recent
      const sortedAtt = [...lAtt].sort((a, b) => b.attendance_date.localeCompare(a.attendance_date))
      let consecutiveAbsent = 0
      for (const a of sortedAtt) {
        if (a.status === 'absent') consecutiveAbsent++
        else break
      }

      return {
        learner: l,
        classId: cls.id,
        className: cls.name,
        attPctCurr, attPctPrev,
        attChange:       attPctCurr != null && attPctPrev != null ? attPctCurr - attPctPrev : null,
        topicsThisWeek, topicsLastWeek,
        topicChange:     topicsThisWeek - topicsLastWeek,
        topicsTotal, topicsPossible: tIds.length,
        effortScore:     tIds.length > 0 ? Math.round(topicsThisWeek / Math.max(tIds.length, 1) * 100) : 0,
        overallAtt, streak: attendanceStreak(lAtt),
        consecutiveAbsent,
        classRank: 0, // filled below
        incidentCount:   incidents.filter(i => i.learner_id === l.id).length,
        praiseCount:     praises.filter(i => i.learner_id === l.id).length,
        subBreakdown,
      }
    })

    // Assign in-class rank by effortScore
    const ranked = [...result].sort((a, b) => b.effortScore - a.effortScore)
    ranked.forEach((r, i) => { r.classRank = i + 1 })
    return result
  }

  // ────────────────────────────────────────────────────────────
  // CURRICULUM ACTIONS
  // ────────────────────────────────────────────────────────────
  async function saveCurrProgress(topicId: string, payload: Partial<CurriculumProgress>) {
    const ex = currProgress.find(p => p.topic_id === topicId)
    if (ex) {
      await supabase.from('curriculum_progress').update(payload).eq('id', ex.id)
      setCurrProgress(p => p.map(x => x.id === ex.id ? { ...x, ...payload } : x))
    } else {
      const full = { topic_id: topicId, teacher_id: teacherId, ...payload }
      const { data } = await supabase.from('curriculum_progress').insert(full).select().single()
      if (data) setCurrProgress(p => [...p, data as CurriculumProgress])
    }
  }

  async function unmarkCurrProgress(topicId: string) {
    const ex = currProgress.find(p => p.topic_id === topicId)
    if (!ex) return
    await supabase.from('curriculum_progress').update({ is_completed: false, completed_at: null }).eq('id', ex.id)
    setCurrProgress(p => p.map(x => x.id === ex.id ? { ...x, is_completed: false, completed_at: undefined } : x))
  }

  // ────────────────────────────────────────────────────────────
  // ATTENDANCE ACTIONS
  // ────────────────────────────────────────────────────────────
  async function loadSessionAttendance(sessionId: string, date: string, classId: string) {
    const learnerList = classLearners[classId] || []
    const { data } = await supabase
      .from('attendance')
      .select('learner_id, status, note')
      .eq('timetable_id', sessionId)
      .eq('attendance_date', date)

    const am: Record<string, string> = {}
    const nm: Record<string, string> = {}
    learnerList.forEach(l => { am[l.id] = 'absent' })
    ;(data || []).forEach((a: any) => {
      am[a.learner_id] = a.status
      if (a.note) nm[a.learner_id] = a.note
    })
    return { attMap: am, noteMap: nm }
  }

  async function saveSessionAttendance(
    sessionId: string, classId: string, date: string,
    attMap: Record<string, string>, noteMap: Record<string, string>
  ) {
    const learnerList = classLearners[classId] || []
    // Bulk upsert — one call per learner but all in parallel
    await Promise.all(learnerList.map(l =>
      supabase.from('attendance').upsert({
        timetable_id: sessionId, learner_id: l.id,
        attendance_date: date, status: attMap[l.id] || 'absent',
        excused: attMap[l.id] === 'excused', note: noteMap[l.id] || null,
      }, { onConflict: 'timetable_id,learner_id,attendance_date' })
    ))
    // Refresh raw att data for updated learners
    const ids = learnerList.map(l => l.id)
    const { data: fresh } = await supabase
      .from('attendance').select('learner_id,status,attendance_date').in('learner_id', ids)
    setRawAttData(prev => {
      const updated = { ...prev }
      learnerList.forEach(l => { updated[l.id] = [] })
      ;(fresh || []).forEach((row: any) => {
        if (updated[row.learner_id]) updated[row.learner_id].push(row)
      })
      return updated
    })
  }

  // ────────────────────────────────────────────────────────────
  // BEHAVIOUR ACTIONS
  // ────────────────────────────────────────────────────────────
  async function addBehaviourRecord(
    type: 'incident' | 'praise', learnerId: string,
    category: string, description: string
  ) {
    const cls = myClasses.find(c => (classLearners[c.id] || []).some(l => l.id === learnerId))
    await supabase.from('behaviour_logs').insert({
      learner_id: learnerId, teacher_id: teacherId, class_id: cls?.id,
      type, category, description: description.trim() || null,
      log_date: new Date().toISOString().split('T')[0],
    })
    // Refresh behaviour
    const allIds = allLearners.map(l => l.id)
    await loadBehaviourBulk(allIds)
  }

  async function deleteBehaviourRecord(id: string) {
    await supabase.from('behaviour_logs').delete().eq('id', id)
    setIncidents(p => p.filter(r => r.id !== id))
    setPraises(p => p.filter(r => r.id !== id))
  }

  return {
    // State
    teacherId, teacherName, activeYearId, activeYearName,
    ready, myClasses, classLearners, allLearners, learnerClassMap,
    attStats, weeklyAtt, rawAttData,
    currSubjects, currTopics, currProgress, currTerms, topicTerms,
    todaySessions, incidents, praises, quizSessions, quizResults,
    // Actions
    buildReport,
    saveCurrProgress, unmarkCurrProgress,
    loadSessionAttendance, saveSessionAttendance,
    addBehaviourRecord, deleteBehaviourRecord,
    loadCurriculum,
    supabase,
  }
}