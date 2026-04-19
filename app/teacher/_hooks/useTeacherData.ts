'use client'
import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { attStreak } from '../_types/constants'

export function useTeacherData() {
  const supabase = createClient()

  // ── Auth ───────────────────────────────────────────────────────────────────
  const [teacher,       setTeacher]       = useState<any>(null)
  const [isHead,        setIsHead]        = useState(false)
  const [activeYearId,  setActiveYearId]  = useState<string | null>(null)
  const [activeYearName,setActiveYearName]= useState<string | null>(null)

  // ── Dashboard ──────────────────────────────────────────────────────────────
  const [todaySessions, setTodaySessions] = useState<any[]>([])
  const [myClasses,     setMyClasses]     = useState<any[]>([])
  const [allClasses,    setAllClasses]    = useState<any[]>([])
  const [attStats,      setAttStats]      = useState<any[]>([])
  const [upcomingExams, setUpcomingExams] = useState<any[]>([])
  const [calEvents,     setCalEvents]     = useState<any[]>([])
  const [allCalEvents,  setAllCalEvents]  = useState<any[]>([])
  const [notifications, setNotifications] = useState<any[]>([])

  // ── Curriculum ────────────────────────────────────────────────────────────
  const [subjects,      setSubjects]      = useState<any[]>([])
  const [topics,        setTopics]        = useState<any[]>([])
  const [progress,      setProgress]      = useState<any[]>([])
  const [materials,     setMaterials]     = useState<any[]>([])
  const [terms,         setTerms]         = useState<any[]>([])
  const [topicTerms,    setTopicTerms]    = useState<any[]>([])
  const [lessonPlans,   setLessonPlans]   = useState<any[]>([])

  // ── Behaviour ─────────────────────────────────────────────────────────────
  const [allLearners,   setAllLearners]   = useState<any[]>([])
  const [classLearners, setClassLearners] = useState<Record<string, any[]>>({})
  const [incidents,     setIncidents]     = useState<any[]>([])
  const [praises,       setPraises]       = useState<any[]>([])

  // ── Raw attendance for report ──────────────────────────────────────────────
  const [rawAttData,    setRawAttData]    = useState<Record<string, any[]>>({})

  // ── Homework ──────────────────────────────────────────────────────────────
  const [hwAssignments, setHwAssignments] = useState<any[]>([])
  const [hwSessions,    setHwSessions]    = useState<any[]>([])

  // ── Exams ─────────────────────────────────────────────────────────────────
  const [exams,         setExams]         = useState<any[]>([])
  const [quizSessions,  setQuizSessions]  = useState<any[]>([])
  const [quizResults,   setQuizResults]   = useState<any[]>([])

  // ─────────────────────────────────────────────────────────────────────────
  // INIT
  // ─────────────────────────────────────────────────────────────────────────
  async function init(router: any) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return null }
    const { data: u } = await supabase.from('users').select('*').eq('auth_id', user.id).single()
    if (!u || u.role !== 'teacher') { router.push('/'); return null }
    setTeacher(u); setIsHead(u.is_head_teacher || false)

    const { data: yr } = await supabase.from('academic_years').select('*').eq('is_active', true).single()
    if (yr) { setActiveYearId(yr.id); setActiveYearName(yr.name) }

    await Promise.all([
      loadDashboard(u, yr?.id),
      loadCurriculum(u),
      loadBehaviourData(u),
      loadCalendar(yr?.id),
      loadNotifications(u.id),
      loadHomework(u.id),
    ])
    return u
  }

  // ─────────────────────────────────────────────────────────────────────────
  // NOTIFICATIONS
  // ─────────────────────────────────────────────────────────────────────────
  async function loadNotifications(teacherId: string) {
    const { data } = await supabase.from('teacher_notifications')
      .select('*').eq('teacher_id', teacherId).eq('is_read', false)
      .order('created_at', { ascending: false }).limit(20)
    setNotifications(data || [])
  }

  async function markNotifsRead(teacherId: string) {
    await supabase.from('teacher_notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('teacher_id', teacherId).eq('is_read', false)
    setNotifications([])
  }

  // ─────────────────────────────────────────────────────────────────────────
  // DASHBOARD
  // ─────────────────────────────────────────────────────────────────────────
  async function loadDashboard(t: any, yearId?: string) {
    const day = new Date().getDay() === 0 ? 7 : new Date().getDay()
    const { data: secularClasses } = await supabase.from('classes').select('id,name').eq('class_type', 'secular')
    const secIds = (secularClasses || []).map((c: any) => c.id)

    const [{ data: sess }, { data: cls }, { data: exms }] = await Promise.all([
      t.is_head_teacher
        ? supabase.from('timetable').select('*, classes(name,id), users(full_name,display_name)').eq('day_of_week', day).in('class_id', secIds).eq('is_active', true).order('start_time')
        : supabase.from('timetable').select('*, classes(name,id), users(full_name,display_name)').eq('teacher_id', t.id).eq('day_of_week', day).in('class_id', secIds).eq('is_active', true).order('start_time'),
      t.is_head_teacher
        ? supabase.from('classes').select('*').eq('class_type', 'secular').order('name')
        : supabase.from('timetable').select('classes(id,name)').eq('teacher_id', t.id).in('class_id', secIds).eq('is_active', true),
      supabase.from('exams').select('*, classes(name)').eq('is_active', true).gte('exam_date', new Date().toISOString().split('T')[0]).order('exam_date').limit(5),
    ])
    setTodaySessions(sess || [])
    setUpcomingExams(exms || [])

    const classes = t.is_head_teacher
      ? (cls || [])
      : [...new Map<string, any>((cls || []).filter((s: any) => s?.classes?.id).map((s: any) => [s.classes.id, s.classes] as [string, any])).values()]
    setMyClasses(classes); setAllClasses(classes)

    const { data: ae } = await (t.is_head_teacher
      ? supabase.from('exams').select('*, classes(name)').eq('is_active', true).order('exam_date')
      : supabase.from('exams').select('*, classes(name)').eq('teacher_id', t.id).eq('is_active', true).order('exam_date'))
    setExams(ae || [])

    const { data: qs } = await supabase.from('quiz_sessions')
      .select('*, classes(name), curriculum_topics(title, curriculum_subjects(name))')
      .eq('created_by', t.id).order('created_at', { ascending: false })
    setQuizSessions(qs || [])
    if (qs?.length) {
      const { data: qr } = await supabase.from('quiz_results')
        .select('quiz_session_id, score, total, percentage').in('quiz_session_id', qs.map((s: any) => s.id))
      setQuizResults(qr || [])
    }

    // Attendance stats per class
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

    const today = new Date().toISOString().split('T')[0]
    const inTwo = new Date(); inTwo.setDate(inTwo.getDate() + 14)
    const { data: events } = await supabase.from('department_activities')
      .select('*, departments(name,color)').eq('is_all_school', true)
      .gte('planned_date', today).lte('planned_date', inTwo.toISOString().split('T')[0])
      .order('planned_date').limit(5)
    setCalEvents(events || [])
  }

  async function loadCalendar(yearId?: string) {
    const q = yearId
      ? supabase.from('department_activities').select('*, departments(name,color)').eq('is_all_school', true).eq('academic_year_id', yearId).order('planned_date')
      : supabase.from('department_activities').select('*, departments(name,color)').eq('is_all_school', true).order('planned_date')
    const { data } = await q
    setAllCalEvents(data || [])
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CURRICULUM
  // ─────────────────────────────────────────────────────────────────────────
  async function loadCurriculum(t: any) {
    const { data: secCls } = await supabase.from('classes').select('id').eq('class_type', 'secular')
    const secIds = (secCls || []).map((c: any) => c.id)
    const { data: tt } = await supabase.from('timetable').select('class_id').eq('teacher_id', t.id).in('class_id', secIds).eq('is_active', true)
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
      const [{ data: prog }, { data: ttMap }, { data: lp }] = await Promise.all([
        supabase.from('curriculum_progress').select('*').in('topic_id', tids),
        supabase.from('curriculum_topic_terms').select('*').in('topic_id', tids),
        supabase.from('lesson_plans').select('*').in('topic_id', tids).eq('teacher_id', t.id),
      ])
      setProgress(prog || []); setTopicTerms(ttMap || []); setLessonPlans(lp || [])
    }
    const { data: trms } = await supabase.from('curriculum_terms').select('*').in('class_id', cids).eq('is_active', true).order('order_num')
    setTerms(trms || [])
  }

  async function loadMaterials(topicId: string) {
    const { data } = await supabase.from('curriculum_materials').select('*').eq('topic_id', topicId).order('order_num')
    setMaterials(data || [])
    return data || []
  }

  async function saveLessonPlan(
    topic: any, teacherId: string, status: 'draft' | 'submitted',
    fields: { objectives: string; activities: string; resources: string; assessment: string; notes: string; plan_date: string }
  ) {
    const existing = lessonPlans.find(lp => lp.topic_id === topic.id)
    const payload: any = {
      topic_id: topic.id, teacher_id: teacherId,
      class_id: topic.curriculum_subjects?.class_id,
      ...fields, status,
    }
    if (status === 'submitted') payload.submitted_at = new Date().toISOString()
    if (existing) {
      const { data } = await supabase.from('lesson_plans').update(payload).eq('id', existing.id).select().single()
      if (data) setLessonPlans(p => p.map(x => x.id === existing.id ? data : x))
    } else {
      const { data } = await supabase.from('lesson_plans').insert(payload).select().single()
      if (data) setLessonPlans(p => [...p, data])
    }
    if (status === 'submitted') {
      await supabase.from('teacher_notifications').insert({
        teacher_id: teacherId, type: 'lesson_plan_submitted',
        title: 'Lesson plan submitted', body: `Lesson plan for "${topic.title}" has been submitted.`,
        reference_id: topic.id, reference_type: 'topic'
      })
      await loadNotifications(teacherId)
    }
  }

  async function markTopicDone(topic: any, teacherId: string, understanding: string, note: string) {
    const ex = progress.find(p => p.topic_id === topic.id)
    const payload = {
      topic_id: topic.id, teacher_id: teacherId, is_completed: true,
      completed_at: new Date().toISOString(), feedback_note: note.trim() || null,
      understanding, taught_date: new Date().toISOString().split('T')[0]
    }
    if (ex) {
      await supabase.from('curriculum_progress').update(payload).eq('id', ex.id)
      setProgress(p => p.map(x => x.id === ex.id ? { ...x, ...payload } : x))
    } else {
      const { data } = await supabase.from('curriculum_progress').insert(payload).select().single()
      if (data) setProgress(p => [...p, data])
    }
  }

  async function unmarkTopic(topicId: string) {
    const ex = progress.find(p => p.topic_id === topicId)
    if (!ex) return
    await supabase.from('curriculum_progress').update({ is_completed: false, completed_at: null }).eq('id', ex.id)
    setProgress(p => p.map(x => x.id === ex.id ? { ...x, is_completed: false } : x))
  }

  // ─────────────────────────────────────────────────────────────────────────
  // BEHAVIOUR
  // ─────────────────────────────────────────────────────────────────────────
  async function loadBehaviourData(t: any) {
    const { data: secCls } = await supabase.from('classes').select('id').eq('class_type', 'secular')
    const secIds = (secCls || []).map((c: any) => c.id)
    const { data: tt } = await supabase.from('timetable').select('class_id').eq('teacher_id', t.id).in('class_id', secIds).eq('is_active', true)
    const cids = [...new Set((tt || []).map((r: any) => r.class_id))]
    if (!cids.length) return
    const { data: lc } = await supabase.from('learner_classes').select('learner_id,class_id,learners(id,full_name),classes(name)').in('class_id', cids)
    const ll = (lc || []).map((x: any) => ({ id: x.learners?.id, full_name: x.learners?.full_name, class_id: x.class_id, class_name: x.classes?.name })).filter((l: any) => l.id)
    setAllLearners(ll)

    // Build classLearners map
    const clMap: Record<string, any[]> = {}
    cids.forEach((cid: string) => { clMap[cid] = [] })
    ll.forEach((l: any) => { if (clMap[l.class_id]) clMap[l.class_id].push(l) })
    setClassLearners(clMap)

    const ids = ll.map((l: any) => l.id)
    if (!ids.length) return

    const [{ data: inc }, { data: pr }, { data: att }] = await Promise.all([
      supabase.from('behaviour_logs').select('*, learners(full_name)').in('learner_id', ids).eq('type', 'incident').order('created_at', { ascending: false }),
      supabase.from('behaviour_logs').select('*, learners(full_name)').in('learner_id', ids).eq('type', 'praise').order('created_at', { ascending: false }),
      supabase.from('attendance').select('learner_id,status,attendance_date').in('learner_id', ids),
    ])
    setIncidents(inc || []); setPraises(pr || [])

    // Build raw att data for report
    const rawMap: Record<string, any[]> = {}
    ids.forEach((id: string) => { rawMap[id] = [] })
    ;(att || []).forEach((row: any) => { if (rawMap[row.learner_id]) rawMap[row.learner_id].push(row) })
    setRawAttData(rawMap)
  }

  async function saveBehaviour(t: any, learnerId: string, type: 'incident' | 'praise', category: string, note: string) {
    const lrn = allLearners.find(l => l.id === learnerId)
    await supabase.from('behaviour_logs').insert({
      learner_id: learnerId, teacher_id: t.id, class_id: lrn?.class_id,
      type, category, description: note.trim() || null,
      log_date: new Date().toISOString().split('T')[0]
    })
    await loadBehaviourData(t)
  }

  async function deleteBehaviour(id: string) {
    await supabase.from('behaviour_logs').delete().eq('id', id)
    setIncidents(p => p.filter(r => r.id !== id))
    setPraises(p => p.filter(r => r.id !== id))
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ATTENDANCE
  // ─────────────────────────────────────────────────────────────────────────
  async function loadSessionAttendance(sessionId: string, date: string, classId: string) {
    const learnerList = classLearners[classId] || []
    const { data } = await supabase.from('attendance').select('learner_id, status, note')
      .eq('timetable_id', sessionId).eq('attendance_date', date)
    const [{ data: hw }, { data: notes }] = await Promise.all([
      supabase.from('homework').select('learner_id, submitted').eq('timetable_id', sessionId).eq('attendance_date', date),
      supabase.from('notes').select('learner_id, content').eq('timetable_id', sessionId),
    ])
    const am: Record<string, string> = {}, nm: Record<string, string> = {}, hm: Record<string, boolean> = {}
    learnerList.forEach((l: any) => { am[l.id] = 'absent' })
    ;(data || []).forEach((a: any) => { am[a.learner_id] = a.status; if (a.note) nm[a.learner_id] = a.note })
    ;(hw || []).forEach((h: any) => { hm[h.learner_id] = h.submitted })
    ;(notes || []).forEach((n: any) => { nm[n.learner_id] = n.content })
    return { attMap: am, noteMap: nm, hwMap: hm }
  }

  async function saveSessionAttendance(
    sessionId: string, classId: string, date: string,
    attMap: Record<string, string>, noteMap: Record<string, string>, hwMap: Record<string, boolean>,
    teacherId: string
  ) {
    const learnerList = classLearners[classId] || []
    await Promise.all(learnerList.map(async (l: any) => {
      await supabase.from('attendance').upsert(
        { timetable_id: sessionId, learner_id: l.id, attendance_date: date, status: attMap[l.id] || 'absent' },
        { onConflict: 'timetable_id,learner_id,attendance_date' }
      )
      await supabase.from('homework').upsert(
        { timetable_id: sessionId, learner_id: l.id, attendance_date: date, submitted: hwMap[l.id] || false },
        { onConflict: 'timetable_id,learner_id,attendance_date' }
      )
      if (noteMap[l.id]?.trim()) {
        await supabase.from('notes').upsert(
          { timetable_id: sessionId, learner_id: l.id, teacher_id: teacherId, content: noteMap[l.id].trim() },
          { onConflict: 'timetable_id,learner_id' }
        )
      }
    }))
  }

  // ─────────────────────────────────────────────────────────────────────────
  // HOMEWORK ASSIGNMENTS (structured)
  // ─────────────────────────────────────────────────────────────────────────
  async function loadHomework(teacherId: string) {
    const [{ data: assigns }, { data: sess }] = await Promise.all([
      supabase.from('homework_assignments')
        .select('*, classes(name), timetable(name), learners(full_name)')
        .eq('teacher_id', teacherId).order('due_date', { ascending: false }),
      supabase.from('timetable').select('*, classes(name)').eq('teacher_id', teacherId).order('name'),
    ])
    setHwAssignments(assigns || [])
    setHwSessions(sess || [])
  }

  async function createHwAssignment(teacherId: string, payload: any, learnerList: any[]) {
    const { data: assignment, error } = await supabase.from('homework_assignments')
      .insert({ ...payload, teacher_id: teacherId }).select().single()
    if (!error && assignment && learnerList.length > 0) {
      await supabase.from('homework_submissions').insert(
        learnerList.map((l: any) => ({ assignment_id: assignment.id, learner_id: l.id, status: 'not_submitted' }))
      )
    }
    await loadHomework(teacherId)
    return assignment
  }

  async function deleteHwAssignment(id: string, teacherId: string) {
    await supabase.from('homework_assignments').delete().eq('id', id)
    await loadHomework(teacherId)
  }

  async function loadHwSubmissions(assignmentId: string) {
    const { data } = await supabase.from('homework_submissions')
      .select('*, learners(id, full_name)').eq('assignment_id', assignmentId)
    return data || []
  }

  async function saveHwSubmissions(submissions: any[]) {
    await Promise.all(submissions.map(sub =>
      supabase.from('homework_submissions').update({
        status: sub.status, marks: sub.marks || null,
        feedback: sub.feedback || null, marked_at: new Date().toISOString(),
      }).eq('id', sub.id)
    ))
  }

  // ─────────────────────────────────────────────────────────────────────────
  // EXAMS
  // ─────────────────────────────────────────────────────────────────────────
  async function addExam(teacherId: string, title: string, date: string, classId: string, desc: string) {
    await supabase.from('exams').insert({ title, exam_date: date, class_id: classId, description: desc || null, teacher_id: teacherId })
    const { data } = await supabase.from('exams').select('*, classes(name)').eq('teacher_id', teacherId).eq('is_active', true).order('exam_date')
    setExams(data || [])
  }

  // ─────────────────────────────────────────────────────────────────────────
  // REPORT DATA
  // ─────────────────────────────────────────────────────────────────────────
  async function buildReport(classId: string) {
    const learnerList = classLearners[classId] || []
    if (!learnerList.length) return []
    const ids = learnerList.map((l: any) => l.id)
    const className = myClasses.find((c: any) => c.id === classId)?.name || ''

    // All homework submissions for these learners
    const { data: hwSubs } = await supabase.from('homework_submissions')
      .select('learner_id, status, marks').in('learner_id', ids)

    const rows = learnerList.map((l: any) => {
      const attRecs = rawAttData[l.id] || []
      const attPresent = attRecs.filter((a: any) => a.status === 'present' || a.status === 'late').length
      const attTotal   = attRecs.length
      const attPct     = attTotal > 0 ? Math.round(attPresent / attTotal * 100) : null

      const subs      = (hwSubs || []).filter((s: any) => s.learner_id === l.id)
      const hwDone    = subs.filter((s: any) => s.status === 'submitted_on_time' || s.status === 'submitted_late').length
      const hwTotal   = subs.length
      const hwPct     = hwTotal > 0 ? Math.round(hwDone / hwTotal * 100) : null

      const markedSubs = subs.filter((s: any) => s.marks != null)
      const avgMarks   = markedSubs.length > 0 ? Math.round(markedSubs.reduce((s: number, x: any) => s + x.marks, 0) / markedSubs.length) : null

      const incCount  = incidents.filter((i: any) => i.learner_id === l.id).length
      const prCount   = praises.filter((p: any) => p.learner_id === l.id).length
      const streak    = attStreak(attRecs)

      return {
        learner: l, classId, className,
        attPct, attPresent, attTotal,
        hwCompleted: hwDone, hwTotal, hwPct,
        avgMarks, incidentCount: incCount, praiseCount: prCount, streak,
      }
    })
    return rows.sort((a: any, b: any) => (b.attPct ?? -1) - (a.attPct ?? -1))
  }

  return {
    // state
    teacher, isHead, activeYearId, activeYearName,
    todaySessions, myClasses, allClasses, attStats, upcomingExams, calEvents, allCalEvents, notifications,
    subjects, topics, progress, materials, terms, topicTerms, lessonPlans,
    allLearners, classLearners, incidents, praises, rawAttData,
    hwAssignments, hwSessions, exams, quizSessions, quizResults,
    // setters needed by components
    setMaterials, setNotifications,
    // actions
    init, loadNotifications, markNotifsRead,
    loadDashboard, loadCalendar,
    loadCurriculum, loadMaterials, saveLessonPlan, markTopicDone, unmarkTopic,
    loadBehaviourData, saveBehaviour, deleteBehaviour,
    loadSessionAttendance, saveSessionAttendance,
    loadHomework, createHwAssignment, deleteHwAssignment, loadHwSubmissions, saveHwSubmissions,
    addExam, buildReport,
  }
}
