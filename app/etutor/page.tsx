'use client'
import { useEffect, useState } from 'react'
import { createClient } from '../lib/supabase'
import { useRouter } from 'next/navigation'

const supabase = createClient()

type DbUser      = { id: string; full_name: string; role: string; is_head_etutor: boolean }
type Class       = { id: string; name: string; class_type: string }
type Learner     = { id: string; full_name: string }
type QuizSession = {
  id: string; title: string; status: string; sent_at: string; question_ids: string[]
  curriculum_topics: { title: string } | null
  classes: { name: string } | null
  users: { full_name: string } | null
}
type Question = {
  id: string; question_text: string; question_type: string; difficulty: string
  options: string[] | null; correct_answer: string; explanation: string | null
}
type HwByTeacher = {
  teacher_name: string
  assignments: { id: string; title: string; due_date: string; submitted: number; total: number }[]
}
type WeeklyReport = {
  weekLabel: string
  weekStart: string
  weekEnd: string
  attPct: number
  hwSummary: { title: string; teacher: string; due: string; submitted: number; total: number }[]
  quizSummary: { title: string; topic: string; status: string; avgScore: number | null }[]
  progressList: any[]
  learnerTotal: number
}

function toDateStr(d: Date) { return d.toISOString().split('T')[0] }
function today() { return toDateStr(new Date()) }
function fmtDate(d: string) { return new Date(d + 'T12:00:00').toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' }) }
function fmtWeek(start: string, end: string) {
  return `${fmtDate(start)} – ${fmtDate(end)}`
}
function getWeekBounds(offsetWeeks: number = 0) {
  const now = new Date()
  const day = now.getDay() === 0 ? 7 : now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - day + 1 - offsetWeeks * 7)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return { start: toDateStr(monday), end: toDateStr(sunday) }
}

export default function EtutorPanel() {
  const router = useRouter()

  const [dbUser,    setDbUser]    = useState<DbUser | null>(null)
  const [myClasses, setMyClasses] = useState<Class[]>([])
  const [selClass,  setSelClass]  = useState<Class | null>(null)
  const [learners,  setLearners]  = useState<Learner[]>([])
  const [tab,       setTab]       = useState<'dashboard' | 'attendance' | 'homework' | 'curriculum' | 'quizzes' | 'report'>('dashboard')
  const [loading,   setLoading]   = useState(true)

  // Dashboard stats
  const [dashStats,  setDashStats]  = useState({ attPct: 0, currPct: 0, hwPct: 0, pendingQuiz: 0 })
  const [attHistory, setAttHistory] = useState<{ date: string; present: number; total: number }[]>([])

  // Attendance tab
  const [attDate,   setAttDate]   = useState(today())
  const [attData,   setAttData]   = useState<Record<string, string>>({})
  const [attSaving, setAttSaving] = useState(false)
  const [attSaved,  setAttSaved]  = useState(false)

  // Homework
  const [hwByTeacher, setHwByTeacher] = useState<HwByTeacher[]>([])
  const [hwLoading,   setHwLoading]   = useState(false)

  // Curriculum
  const [currStats, setCurrStats] = useState<{ subject: string; total: number; completed: number }[]>([])

  // Quizzes
  const [sessions,   setSessions]   = useState<QuizSession[]>([])
  const [selSession, setSelSession] = useState<QuizSession | null>(null)
  const [questions,  setQuestions]  = useState<Question[]>([])
  const [results,    setResults]    = useState<Record<string, number>>({})
  const [qView,      setQView]      = useState<'list' | 'questions' | 'enter'>('list')
  const [qSaving,    setQSaving]    = useState(false)
  const [qSaved,     setQSaved]     = useState(false)

  // Report — multi-week
  const [reportWeekOffset, setReportWeekOffset] = useState(0)  // 0 = this week, 1 = last week, etc.
  const [weeklyReports,    setWeeklyReports]    = useState<Record<number, WeeklyReport>>({})
  const [reportLoading,    setReportLoading]    = useState(false)

  // Notifications
  const [notifs,     setNotifs]     = useState<any[]>([])
  const [showNotifs, setShowNotifs] = useState(false)

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }
    const { data: u } = await supabase.from('users').select('id, full_name, role, is_head_etutor').eq('auth_id', user.id).single()
    if (!u || !['etutor', 'admin'].includes(u.role)) { router.push('/'); return }
    setDbUser(u)

    let classes: Class[] = []
    if (u.is_head_etutor || u.role === 'admin') {
      const { data } = await supabase.from('classes').select('id, name, class_type').order('name')
      classes = data || []
    } else {
      const { data: ec } = await supabase.from('etutor_classes').select('class_id').eq('etutor_id', u.id)
      if (ec && ec.length > 0) {
        const ids = ec.map((r: any) => r.class_id)
        const { data } = await supabase.from('classes').select('id, name, class_type').in('id', ids).order('name')
        classes = data || []
      }
    }
    setMyClasses(classes)

    const { data: nd } = await supabase
      .from('guardian_notifications')
      .select('id, quiz_session_id, is_read, created_at, quiz_sessions(id, title, status, sent_at, question_ids, curriculum_topics(title), classes(name), users(full_name))')
      .eq('guardian_id', u.id)
      .order('created_at', { ascending: false })
      .limit(10)
    setNotifs((nd || []) as any)

    if (classes.length > 0) {
      setSelClass(classes[0])
      await loadAll(classes[0].id)
    }
    setLoading(false)
  }

  async function loadAll(classId: string) {
    const learnerIds = await loadLearners(classId)
    await Promise.all([
      loadDashboard(classId, learnerIds),
      loadAttHistory(classId, learnerIds),
      loadCurrStats(classId),
      loadSessions(classId),
    ])
  }

  async function switchClass(cls: Class) {
    setSelClass(cls)
    setQView('list'); setSelSession(null)
    setHwByTeacher([])
    setWeeklyReports({})
    await loadAll(cls.id)
  }

  async function loadLearners(classId: string): Promise<string[]> {
    const { data } = await supabase
      .from('learner_classes')
      .select('learners(id, full_name)')
      .eq('class_id', classId)
      .eq('enrollment_status', 'active')
    const ls = (data || []).map((r: any) => r.learners).filter(Boolean)
    setLearners(ls)
    const init: Record<string, string> = {}
    ls.forEach((l: Learner) => { init[l.id] = 'present' })
    setAttData(init)
    return ls.map((l: Learner) => l.id)
  }

  async function loadDashboard(classId: string, learnerIds: string[] = []) {
    const t = today()
    const d30 = new Date(); d30.setDate(d30.getDate() - 30)
    const thirtyAgo = toDateStr(d30)

    const [
      { count: totalL },
      { data: attRows },
      { data: subjects },
      { count: pendingQ },
      { data: hwList },
    ] = await Promise.all([
      supabase.from('learner_classes').select('*', { count:'exact', head:true }).eq('class_id', classId).eq('enrollment_status', 'active'),
      learnerIds.length > 0
        ? supabase.from('attendance').select('learner_id, status').eq('attendance_date', t).in('learner_id', learnerIds)
        : Promise.resolve({ data: [] as any[], count: null, error: null, status: 200, statusText: 'OK' }),
      supabase.from('curriculum_subjects').select('id').eq('class_id', classId).eq('is_active', true),
      supabase.from('quiz_sessions').select('*', { count:'exact', head:true }).eq('class_id', classId).eq('status', 'sent'),
      supabase.from('homework_assignments').select('id').eq('class_id', classId).gte('due_date', thirtyAgo),
    ])

    const present = (attRows || []).filter((a: any) => a.status === 'present').length
    const attPct  = (totalL || 0) > 0 ? Math.round(present / (totalL || 1) * 100) : 0

    let currPct = 0
    if (subjects && subjects.length > 0) {
      const sids = subjects.map((s: any) => s.id)
      const [{ count: totalT }, { count: doneT }] = await Promise.all([
        supabase.from('curriculum_topics').select('*', { count:'exact', head:true }).in('subject_id', sids).eq('is_active', true),
        supabase.from('curriculum_progress').select('*', { count:'exact', head:true }).eq('class_id', classId).eq('is_completed', true),
      ])
      currPct = (totalT || 0) > 0 ? Math.round((doneT || 0) / (totalT || 1) * 100) : 0
    }

    let hwPct = 0
    if (hwList && hwList.length > 0) {
      const hwIds = hwList.map((h: any) => h.id)
      const [{ count: submitted }, { count: totalSub }] = await Promise.all([
        supabase.from('homework_submissions').select('*', { count:'exact', head:true }).in('assignment_id', hwIds).eq('status', 'submitted'),
        supabase.from('homework_submissions').select('*', { count:'exact', head:true }).in('assignment_id', hwIds),
      ])
      hwPct = (totalSub || 0) > 0 ? Math.round((submitted || 0) / (totalSub || 1) * 100) : 0
    }

    setDashStats({ attPct, currPct, hwPct, pendingQuiz: pendingQ || 0 })
  }

  async function loadAttHistory(classId: string, learnerIds: string[] = []) {
    const days: string[] = []
    for (let i = 13; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i)
      days.push(toDateStr(d))
    }
    const attQuery = learnerIds.length > 0
      ? supabase.from('attendance').select('attendance_date, status').in('attendance_date', days).in('learner_id', learnerIds)
      : supabase.from('attendance').select('attendance_date, status').in('attendance_date', days)
    const { data: attRows } = await attQuery
    const { count: total }  = await supabase.from('learner_classes').select('*', { count:'exact', head:true }).eq('class_id', classId).eq('enrollment_status', 'active')
    const map: Record<string, number> = {}
    days.forEach(d => { map[d] = 0 })
    ;(attRows || []).forEach((r: any) => { if (r.status === 'present' && map[r.attendance_date] !== undefined) map[r.attendance_date]++ })
    setAttHistory(days.map(d => ({ date: d, present: map[d], total: total || 0 })))
  }

  // ── ATTENDANCE SAVE ───────────────────────────────────────────────────────────
  async function saveAttendance() {
    if (!selClass || !dbUser || learners.length === 0) return
    setAttSaving(true); setAttSaved(false)

    // Find timetable_id for today if exists, else use null
    const dayNum = new Date(attDate + 'T12:00:00').getDay() === 0 ? 7 : new Date(attDate + 'T12:00:00').getDay()
    const { data: ttRows } = await supabase
      .from('timetable')
      .select('id')
      .eq('class_id', selClass.id)
      .eq('day_of_week', dayNum)
      .eq('is_active', true)
      .limit(1)
    const timetableId = ttRows?.[0]?.id || null

    // Get active academic year
    const { data: yearSetting } = await supabase.from('settings').select('value').eq('key', 'active_academic_year_id').single()
    const academicYearId = yearSetting?.value || null

    // Upsert attendance rows — one per learner
    const rows = Object.entries(attData).map(([learner_id, status]) => ({
      learner_id,
      attendance_date: attDate,
      status,
      timetable_id: timetableId,
      academic_year_id: academicYearId,
      note: 'Etütçü yoklaması',
    }))

    // Delete existing for this date + class learners, then insert
    const learnerIds = learners.map(l => l.id)
    await supabase.from('attendance').delete()
      .eq('attendance_date', attDate)
      .in('learner_id', learnerIds)

    const { error } = await supabase.from('attendance').insert(rows)
    if (!error) {
      setAttSaved(true)
      loadAttHistory(selClass.id)
      setTimeout(() => setAttSaved(false), 3000)
    }
    setAttSaving(false)
  }

  async function loadAttForDate(date: string) {
    if (!selClass) return
    const learnerIds = learners.map(l => l.id)
    if (learnerIds.length === 0) return
    const { data } = await supabase.from('attendance').select('learner_id, status').eq('attendance_date', date).in('learner_id', learnerIds)
    const map: Record<string, string> = {}
    learners.forEach(l => { map[l.id] = 'present' })
    ;(data || []).forEach((r: any) => { map[r.learner_id] = r.status })
    setAttData(map)
  }

  async function loadHwByTeacher(classId: string) {
    setHwLoading(true)
    const { data: hw } = await supabase
      .from('homework_assignments')
      .select('id, title, due_date, teacher_id, users(full_name)')
      .eq('class_id', classId)
      .order('due_date', { ascending: false })
      .limit(60)

    if (!hw) { setHwLoading(false); return }
    const { count: learnerTotal } = await supabase.from('learner_classes').select('*', { count:'exact', head:true }).eq('class_id', classId).eq('enrollment_status', 'active')

    const teacherMap: Record<string, HwByTeacher> = {}
    for (const h of hw) {
      const teacherName = (h.users as any)?.full_name || 'Unknown'
      if (!teacherMap[teacherName]) teacherMap[teacherName] = { teacher_name: teacherName, assignments: [] }
      const { count: submitted } = await supabase.from('homework_submissions').select('*', { count:'exact', head:true }).eq('assignment_id', h.id).eq('status', 'submitted')
      teacherMap[teacherName].assignments.push({ id: h.id, title: h.title, due_date: h.due_date, submitted: submitted || 0, total: learnerTotal || 0 })
    }
    setHwByTeacher(Object.values(teacherMap))
    setHwLoading(false)
  }

  async function loadCurrStats(classId: string) {
    const { data: subjects } = await supabase.from('curriculum_subjects').select('id, name').eq('class_id', classId).eq('is_active', true).order('order_num')
    if (!subjects) return
    const stats = await Promise.all(subjects.map(async s => {
      const [{ count: total }, { count: done }] = await Promise.all([
        supabase.from('curriculum_topics').select('*', { count:'exact', head:true }).eq('subject_id', s.id).eq('is_active', true),
        supabase.from('curriculum_progress').select('*', { count:'exact', head:true }).eq('class_id', classId).eq('is_completed', true),
      ])
      return { subject: s.name, total: total || 0, completed: done || 0 }
    }))
    setCurrStats(stats)
  }

async function loadSessions(classId: string) {
  const { data } = await supabase
    .from('quiz_sessions')
    .select('id, title, status, sent_at, question_ids, curriculum_topics(title), classes(name), users(full_name)')
    .eq('class_id', classId)
    .order('sent_at', { ascending: false })
  setSessions((data || []) as any)
}
  async function openSession(s: QuizSession) {
    setTab('quizzes')
    setSelSession(s)
    setQView('questions')
    const { data: qs } = await supabase.from('quiz_questions').select('*').in('id', s.question_ids || [])
    setQuestions(qs || [])
    const { data: res } = await supabase.from('quiz_results').select('learner_id, score').eq('quiz_session_id', s.id)
    const resMap: Record<string, number> = {}
    learners.forEach(l => { resMap[l.id] = 0 })
    ;(res || []).forEach((r: any) => { resMap[r.learner_id] = r.score })
    setResults(resMap)
    await supabase.from('guardian_notifications').update({ is_read: true, read_at: new Date().toISOString() }).eq('quiz_session_id', s.id)
    setNotifs(prev => prev.map(n => n.quiz_session_id === s.id ? { ...n, is_read: true } : n))
  }

  async function saveQuizResults() {
    if (!selSession || !dbUser) return
    setQSaving(true)
    const rows = Object.entries(results).map(([learner_id, score]) => ({
      quiz_session_id: selSession.id, learner_id, score, total: questions.length, entered_by: dbUser.id,
    }))
    await supabase.from('quiz_results').upsert(rows, { onConflict: 'quiz_session_id,learner_id' })
    await supabase.from('quiz_sessions').update({ status: 'completed' }).eq('id', selSession.id)
    setQSaved(true); setQSaving(false)
    if (selClass) loadSessions(selClass.id)
    setTimeout(() => setQSaved(false), 2500)
  }

  // ── WEEKLY REPORT ─────────────────────────────────────────────────────────────
  async function generateWeekReport(offset: number) {
    if (!selClass) return
    if (weeklyReports[offset]) return // already loaded
    setReportLoading(true)
    const { start, end } = getWeekBounds(offset)

    const [
      { data: attRows },
      { count: learnerTotal },
      { data: hwList },
      { data: quizList },
      { data: progressList },
    ] = await Promise.all([
      supabase.from('attendance').select('learner_id, status').gte('attendance_date', start).lte('attendance_date', end),
      supabase.from('learner_classes').select('*', { count:'exact', head:true }).eq('class_id', selClass.id).eq('enrollment_status', 'active'),
      supabase.from('homework_assignments').select('id, title, due_date, users(full_name)').eq('class_id', selClass.id).gte('due_date', start).lte('due_date', end),
      supabase.from('quiz_sessions').select('id, title, status, curriculum_topics(title)').eq('class_id', selClass.id).gte('created_at', start).lte('created_at', end),
      supabase.from('curriculum_progress').select('topic_id, taught_date, understanding, curriculum_topics(title), users(full_name)').eq('class_id', selClass.id).gte('taught_date', start).lte('taught_date', end).eq('is_completed', true),
    ])

    const presentCount = (attRows || []).filter((r: any) => r.status === 'present').length
    const totalAtt     = (attRows || []).length
    const attPct       = totalAtt > 0 ? Math.round(presentCount / totalAtt * 100) : 0

    const hwSummary = []
    for (const h of (hwList || [])) {
      const { count: submitted } = await supabase.from('homework_submissions').select('*', { count:'exact', head:true }).eq('assignment_id', h.id).eq('status', 'submitted')
      hwSummary.push({ title: h.title, teacher: (h.users as any)?.full_name || '—', due: h.due_date, submitted: submitted || 0, total: learnerTotal || 0 })
    }

    const quizSummary = []
    for (const q of (quizList || [])) {
      const { data: qRes } = await supabase.from('quiz_results').select('score, total').eq('quiz_session_id', q.id)
      const avg = (qRes && qRes.length > 0) ? Math.round((qRes as any[]).reduce((a, r) => a + (r.total > 0 ? r.score / r.total * 100 : 0), 0) / qRes.length) : null
      quizSummary.push({ title: q.title, topic: (q.curriculum_topics as any)?.title || '—', status: q.status, avgScore: avg })
    }

    const weekLabel = offset === 0 ? 'Bu Hafta' : offset === 1 ? 'Geçen Hafta' : `${offset} Hafta Önce`

    setWeeklyReports(prev => ({
      ...prev,
      [offset]: { weekLabel, weekStart: start, weekEnd: end, attPct, hwSummary, quizSummary, progressList: progressList || [], learnerTotal: learnerTotal || 0 }
    }))
    setReportLoading(false)
  }

  function printReport(report: WeeklyReport) {
    if (!selClass) return
    const w = window.open('', '_blank')
    if (!w) return
    const hwRows = report.hwSummary.map(h => {
      const pct = h.total > 0 ? Math.round(h.submitted/h.total*100) : 0
      return `<tr><td>${h.title}</td><td>${h.teacher}</td><td>${fmtDate(h.due)}</td><td style="font-weight:600;color:${pct>=80?'#15803D':pct>=50?'#C2410C':'#DC2626'}">${h.submitted}/${h.total} (${pct}%)</td></tr>`
    }).join('')
    const quizRows = report.quizSummary.map(q => `<tr><td>${q.title}</td><td>${q.topic}</td><td>${q.status === 'completed' ? '✓ Tamamlandı' : 'Bekliyor'}</td><td>${q.avgScore !== null ? q.avgScore + '%' : '—'}</td></tr>`).join('')
    const progRows = report.progressList.map((p: any) => `<tr><td>${(p.curriculum_topics as any)?.title || '—'}</td><td>${(p.users as any)?.full_name || '—'}</td><td>${fmtDate(p.taught_date)}</td><td>${p.understanding || '—'}</td></tr>`).join('')
    w.document.write(`<!DOCTYPE html><html><head>
      <title>${report.weekLabel} — ${selClass.name}</title>
      <style>body{font-family:Arial,sans-serif;margin:0;padding:32px 40px;font-size:13px;color:#1A1A1A;}h1{font-size:20px;margin:0 0 4px;}h2{font-size:14px;margin:20px 0 8px;border-bottom:2px solid #1A1A1A;padding-bottom:4px;}table{width:100%;border-collapse:collapse;margin-bottom:12px;}th{background:#F5F5F3;padding:7px 10px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;}td{padding:8px 10px;border-bottom:1px solid #EFEFED;}.sg{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px;}.sc{background:#F8F7F4;border-radius:8px;padding:12px 16px;}.sn{font-size:24px;font-weight:700;}.sl{font-size:11px;color:#888;margin-top:2px;}@media print{body{padding:20px;}}</style>
    </head><body>
      <h1>Haftalık Rapor — ${selClass.name}</h1>
      <div style="font-size:12px;color:#888;margin-bottom:16px;">${report.weekLabel} · ${fmtWeek(report.weekStart, report.weekEnd)} · ${report.learnerTotal} öğrenci</div>
      <div class="sg">
        <div class="sc"><div class="sn" style="color:${report.attPct>=80?'#15803D':'#DC2626'}">${report.attPct}%</div><div class="sl">Devam Oranı</div></div>
        <div class="sc"><div class="sn">${report.hwSummary.length}</div><div class="sl">Verilen Ödev</div></div>
        <div class="sc"><div class="sn">${report.quizSummary.length}</div><div class="sl">Quiz Sayısı</div></div>
      </div>
      <h2>İşlenen Konular</h2>
      <table><thead><tr><th>Konu</th><th>Öğretmen</th><th>Tarih</th><th>Anlama</th></tr></thead><tbody>${progRows || '<tr><td colspan="4" style="color:#CCC;text-align:center;padding:16px;">Bu hafta tamamlanan konu yok</td></tr>'}</tbody></table>
      <h2>Ödevler</h2>
      <table><thead><tr><th>Ödev</th><th>Öğretmen</th><th>Son Tarih</th><th>Teslim Oranı</th></tr></thead><tbody>${hwRows || '<tr><td colspan="4" style="color:#CCC;text-align:center;padding:16px;">Bu hafta ödev verilmedi</td></tr>'}</tbody></table>
      <h2>Quizler</h2>
      <table><thead><tr><th>Quiz</th><th>Konu</th><th>Durum</th><th>Ortalama</th></tr></thead><tbody>${quizRows || '<tr><td colspan="4" style="color:#CCC;text-align:center;padding:16px;">Bu hafta quiz yapılmadı</td></tr>'}</tbody></table>
    </body></html>`)
    w.document.close()
    setTimeout(() => { w.focus(); w.print() }, 400)
  }

  function printQuiz(withAnswers: boolean) {
    if (!selSession) return
    const w = window.open('', '_blank')
    if (!w) return
    const qHTML = questions.map((q, i) => {
      const optsHTML = q.options
        ? q.options.map(opt => { const l = opt.charAt(0); const ok = withAnswers && l === q.correct_answer; return `<div style="padding:4px 0;${ok?'color:#15803D;font-weight:600;':''}">${opt}${ok?' ✓':''}</div>` }).join('')
        : withAnswers ? `<div style="margin-top:6px;padding:6px 10px;background:#F0FDF4;border-radius:6px;font-size:12px;color:#15803D;"><b>Cevap:</b> ${q.correct_answer}</div>`
          : `<div style="margin-top:10px;border-bottom:1px solid #E5E5E5;padding-bottom:20px;"></div>`
      return `<div style="margin-bottom:18px;padding:12px 14px;border:1px solid #E5E5E5;border-radius:8px;page-break-inside:avoid;">
        <div style="display:flex;gap:10px;margin-bottom:8px;"><b style="min-width:20px;">${i+1}.</b><span style="font-size:13px;line-height:1.6;">${q.question_text}</span></div>
        <div style="padding-left:30px;font-size:13px;">${optsHTML}</div>
        ${withAnswers && q.explanation ? `<div style="padding-left:30px;margin-top:6px;font-size:11px;color:#666;font-style:italic;">${q.explanation}</div>` : ''}
      </div>`
    }).join('')
    w.document.write(`<!DOCTYPE html><html><head><title>${selSession.title}</title>
      <style>body{font-family:Arial,sans-serif;margin:0;padding:32px 40px;font-size:13px;}@media print{body{padding:20px;}}</style>
    </head><body>
      <h1 style="font-size:18px;margin:0 0 4px;">${selSession.title}</h1>
      <div style="font-size:12px;color:#888;margin-bottom:16px;">${(selSession.curriculum_topics as any)?.title || ''}</div>
      ${withAnswers ? '<div style="background:#1A1A1A;color:#fff;padding:8px 16px;border-radius:8px;margin-bottom:16px;font-weight:600;text-align:center;">🔑 CEVAP ANAHTARI — Sadece Etütçü İçin</div>'
        : `<div style="display:flex;gap:32px;margin-bottom:16px;font-size:13px;"><span>Öğrenci: <span style="display:inline-block;width:140px;border-bottom:1px solid #999;"></span></span><span>Puan: <span style="display:inline-block;width:60px;border-bottom:1px solid #999;"></span>/${questions.length}</span></div>`}
      ${qHTML}
    </body></html>`)
    w.document.close()
    setTimeout(() => { w.focus(); w.print() }, 400)
  }

  const unread = notifs.filter(n => !n.is_read).length
  const currentReport = weeklyReports[reportWeekOffset]

  if (loading) return (
    <main style={{ minHeight:'100vh', background:'#F8F7F4', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'DM Sans',sans-serif", color:'#AAA', fontSize:13 }}>
      Yükleniyor...
    </main>
  )

  if (myClasses.length === 0) return (
    <main style={{ minHeight:'100vh', background:'#F8F7F4', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'DM Sans',sans-serif" }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:15, fontWeight:500, color:'#1A1A1A', marginBottom:8 }}>Sınıf atanmamış</div>
        <div style={{ fontSize:13, color:'#AAA' }}>Admin sizin için bir sınıf atamalı.</div>
      </div>
    </main>
  )

  return (
    <main style={{ minHeight:'100vh', background:'#F8F7F4', fontFamily:"'DM Sans',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        .topbar { background:#fff; border-bottom:1px solid #EFEFED; padding:0 28px; height:56px; display:flex; align-items:center; justify-content:space-between; position:sticky; top:0; z-index:30; }
        .brand { font-size:15px; font-weight:600; color:#1A1A1A; display:flex; align-items:center; gap:8px; }
        .brand-dot { width:8px; height:8px; background:#C2410C; border-radius:50%; }
        .topbar-right { display:flex; align-items:center; gap:8px; }
        .user-chip { font-size:13px; color:#666; background:#F5F5F3; padding:5px 12px; border-radius:8px; }
        .signout-btn { display:flex; align-items:center; gap:5px; font-size:13px; color:#888; background:none; border:none; cursor:pointer; padding:5px 10px; border-radius:8px; font-family:'DM Sans',sans-serif; transition:all 0.15s; }
        .signout-btn:hover { background:#FEF2F2; color:#DC2626; }
        .notif-btn { position:relative; width:34px; height:34px; display:flex; align-items:center; justify-content:center; background:none; border:none; cursor:pointer; border-radius:8px; color:#888; transition:all 0.15s; }
        .notif-btn:hover { background:#F5F5F3; }
        .notif-badge { position:absolute; top:4px; right:4px; min-width:16px; height:16px; background:#EF4444; border-radius:8px; font-size:10px; font-weight:700; color:#fff; display:flex; align-items:center; justify-content:center; padding:0 3px; }

        .layout { display:grid; grid-template-columns:210px 1fr; min-height:calc(100vh - 56px); }
        .sidebar { background:#fff; border-right:1px solid #EFEFED; padding:16px; display:flex; flex-direction:column; gap:4px; }
        .sidebar-label { font-size:10px; font-weight:600; color:#BBB; text-transform:uppercase; letter-spacing:0.06em; padding:8px 8px 4px; }
        .class-btn { display:flex; align-items:center; gap:8px; padding:9px 10px; border-radius:9px; border:none; background:none; cursor:pointer; font-family:'DM Sans',sans-serif; font-size:13px; color:#555; width:100%; text-align:left; transition:all 0.15s; }
        .class-btn:hover { background:#F5F5F3; }
        .class-btn.on { background:#FFF7ED; color:#C2410C; font-weight:500; }
        .class-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }

        .main { display:flex; flex-direction:column; min-width:0; }
        .tabs { display:flex; padding:0 22px; border-bottom:1px solid #EFEFED; background:#fff; overflow-x:auto; scrollbar-width:none; }
        .tabs::-webkit-scrollbar { display:none; }
        .tab-btn { padding:12px 13px; border:none; background:none; font-size:13px; font-weight:500; color:#999; cursor:pointer; font-family:'DM Sans',sans-serif; border-bottom:2px solid transparent; transition:all 0.15s; white-space:nowrap; }
        .tab-btn:hover { color:#555; }
        .tab-btn.on { color:#1A1A1A; border-bottom-color:#1A1A1A; }
        .tab-badge { display:inline-flex; align-items:center; justify-content:center; background:#FEE2E2; color:#DC2626; font-size:10px; font-weight:700; min-width:16px; height:16px; border-radius:8px; padding:0 4px; margin-left:5px; }
        .content { padding:22px; flex:1; }

        .stat-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-bottom:18px; }
        .stat-card { background:#fff; border:1px solid #EFEFED; border-radius:12px; padding:15px 16px; }
        .stat-n { font-size:24px; font-weight:600; letter-spacing:-0.5px; }
        .stat-l { font-size:11px; color:#AAA; margin-top:3px; text-transform:uppercase; letter-spacing:0.04em; }
        .prog-bg { height:4px; background:#F0F0EE; border-radius:2px; margin-top:8px; overflow:hidden; }
        .prog-bar { height:100%; border-radius:2px; }

        .chart-wrap { background:#fff; border:1px solid #EFEFED; border-radius:12px; padding:16px 18px; margin-bottom:16px; }
        .chart-title { font-size:12px; font-weight:600; color:#1A1A1A; margin-bottom:10px; }
        .chart-bars { display:flex; align-items:flex-end; gap:4px; height:64px; }
        .chart-col { flex:1; display:flex; flex-direction:column; align-items:center; gap:2px; height:100%; justify-content:flex-end; }
        .chart-bar-item { width:100%; border-radius:3px 3px 0 0; min-height:3px; }
        .chart-day { font-size:9px; color:#BBB; }

        .learner-card { background:#fff; border:1px solid #EFEFED; border-radius:12px; overflow:hidden; }
        .learner-row { display:flex; align-items:center; gap:10px; padding:10px 16px; border-bottom:1px solid #F8F8F6; }
        .learner-row:last-child { border-bottom:none; }
        .l-avatar { width:28px; height:28px; border-radius:50%; background:#F0F0EE; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:600; color:#888; flex-shrink:0; }
        .l-name { font-size:13px; font-weight:500; color:#1A1A1A; flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .status-seg { display:flex; border:1px solid #EFEFED; border-radius:7px; overflow:hidden; flex-shrink:0; }
        .s-btn { padding:4px 10px; border:none; background:#fff; font-size:11px; font-weight:500; cursor:pointer; font-family:'DM Sans',sans-serif; color:#666; transition:all 0.15s; }
        .s-btn.p-on { background:#F0FDF4; color:#15803D; }
        .s-btn.l-on { background:#FFF7ED; color:#C2410C; }
        .s-btn.a-on { background:#FEF2F2; color:#DC2626; }

        .teacher-section { margin-bottom:18px; }
        .teacher-head { display:flex; align-items:center; gap:8px; margin-bottom:8px; }
        .t-name { font-size:13px; font-weight:600; color:#1A1A1A; }
        .hw-card { background:#fff; border:1px solid #EFEFED; border-radius:12px; overflow:hidden; }
        .hw-row { display:flex; align-items:center; gap:10px; padding:10px 16px; border-bottom:1px solid #F8F8F6; }
        .hw-row:last-child { border-bottom:none; }
        .hw-title { font-size:13px; font-weight:500; color:#1A1A1A; flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .hw-due { font-size:11px; color:#AAA; flex-shrink:0; }
        .hw-bar-bg { width:70px; height:5px; background:#F0F0EE; border-radius:3px; overflow:hidden; flex-shrink:0; }
        .hw-bar { height:100%; border-radius:3px; }
        .hw-rate { font-size:12px; font-weight:600; flex-shrink:0; min-width:55px; text-align:right; }

        .curr-card { background:#fff; border:1px solid #EFEFED; border-radius:12px; overflow:hidden; }
        .curr-row { display:flex; align-items:center; gap:10px; padding:12px 16px; border-bottom:1px solid #F8F8F6; }
        .curr-row:last-child { border-bottom:none; }
        .curr-sub { font-size:13px; font-weight:500; color:#1A1A1A; flex:1; }
        .curr-bar-bg { width:90px; height:6px; background:#F0F0EE; border-radius:3px; overflow:hidden; flex-shrink:0; }
        .curr-bar { height:100%; border-radius:3px; }
        .curr-pct { font-size:13px; font-weight:600; min-width:38px; text-align:right; flex-shrink:0; }

        .sess-card { background:#fff; border:1px solid #EFEFED; border-radius:12px; overflow:hidden; }
        .sess-row { display:flex; align-items:center; gap:10px; padding:12px 16px; border-bottom:1px solid #F8F8F6; cursor:pointer; transition:background 0.15s; }
        .sess-row:last-child { border-bottom:none; }
        .sess-row:hover { background:#FAFAF8; }
        .sess-dot { width:10px; height:10px; border-radius:50%; flex-shrink:0; }
        .sess-info { flex:1; min-width:0; }
        .sess-title { font-size:13px; font-weight:600; color:#1A1A1A; }
        .sess-meta { font-size:11px; color:#AAA; margin-top:2px; }

        .quiz-header { background:#fff; border:1px solid #EFEFED; border-radius:12px; padding:16px 18px; margin-bottom:14px; }
        .quiz-actions { display:flex; gap:8px; flex-wrap:wrap; margin-top:12px; }
        .print-btn { display:flex; align-items:center; gap:6px; border:1px solid #EFEFED; border-radius:9px; padding:7px 14px; font-size:12px; font-weight:500; cursor:pointer; font-family:'DM Sans',sans-serif; background:#fff; color:#555; transition:all 0.15s; }
        .print-btn:hover { background:#F5F5F3; }
        .print-btn.key { background:#FFF7ED; border-color:#FED7AA; color:#C2410C; }
        .q-card { background:#fff; border:1px solid #EFEFED; border-radius:12px; overflow:hidden; }
        .q-row { display:flex; align-items:flex-start; gap:10px; padding:12px 16px; border-bottom:1px solid #F8F8F6; }
        .q-row:last-child { border-bottom:none; }
        .q-num { font-size:11px; font-weight:700; color:#CCC; min-width:20px; padding-top:2px; }
        .q-text { font-size:13px; color:#1A1A1A; line-height:1.6; margin-bottom:5px; }
        .q-opt { font-size:12px; color:#555; padding:3px 8px; border-radius:6px; }
        .q-opt.correct { background:#F0FDF4; color:#15803D; font-weight:500; }
        .score-input { width:48px; height:32px; border:1px solid #EFEFED; border-radius:8px; text-align:center; font-size:14px; font-weight:600; color:#1A1A1A; font-family:'DM Sans',sans-serif; outline:none; transition:border-color 0.15s; }
        .score-input:focus { border-color:#1A1A1A; }
        .quick-fill { display:flex; align-items:center; gap:6px; padding:8px 16px; background:#F8F7F4; border-bottom:1px solid #EFEFED; flex-wrap:wrap; }
        .qf-btn { font-size:11px; padding:3px 9px; border-radius:6px; border:1px solid #EFEFED; background:#fff; color:#555; cursor:pointer; font-family:'DM Sans',sans-serif; transition:all 0.15s; }
        .qf-btn:hover { background:#F0F0EE; }
        .save-footer { padding:13px 16px; border-top:1px solid #F5F5F3; display:flex; align-items:center; justify-content:space-between; }

        /* Report week nav */
        .week-nav { display:flex; align-items:center; gap:8px; background:#fff; border:1px solid #EFEFED; border-radius:10px; padding:6px 10px; margin-bottom:14px; }
        .week-nav-btn { width:28px; height:28px; border:none; background:#F5F5F3; border-radius:7px; cursor:pointer; display:flex; align-items:center; justify-content:center; color:#555; transition:all 0.15s; }
        .week-nav-btn:hover { background:#EBEBEB; }
        .week-nav-btn:disabled { opacity:0.3; cursor:not-allowed; }
        .week-label { flex:1; text-align:center; font-size:13px; font-weight:600; color:#1A1A1A; }
        .week-dates { text-align:center; font-size:11px; color:#AAA; }

        .report-card { background:#fff; border:1px solid #EFEFED; border-radius:14px; overflow:hidden; }
        .report-section { padding:16px 18px; border-bottom:1px solid #F5F5F3; }
        .report-section:last-child { border-bottom:none; }
        .report-section-title { font-size:11px; font-weight:600; color:#AAA; text-transform:uppercase; letter-spacing:0.06em; margin-bottom:10px; }
        .report-table { width:100%; border-collapse:collapse; font-size:12px; }
        .report-table th { padding:6px 10px; text-align:left; font-size:10px; font-weight:600; color:#AAA; text-transform:uppercase; letter-spacing:0.05em; border-bottom:1px solid #EFEFED; }
        .report-table td { padding:8px 10px; border-bottom:1px solid #F5F5F3; color:#333; }
        .report-table tr:last-child td { border-bottom:none; }
        .empty-report { text-align:center; color:#CCC; font-size:12px; padding:14px 0; }
        .report-summary-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; padding:16px 18px; border-bottom:1px solid #F5F5F3; }

        .primary-btn { display:inline-flex; align-items:center; justify-content:center; gap:6px; background:#1A1A1A; color:#fff; border:none; border-radius:9px; padding:9px 20px; font-size:13px; font-weight:600; cursor:pointer; font-family:'DM Sans',sans-serif; transition:background 0.15s; }
        .primary-btn:hover:not(:disabled) { background:#333; }
        .primary-btn:disabled { opacity:0.5; cursor:not-allowed; }
        .primary-btn.ok { background:#15803D; }
        .ghost-btn { display:inline-flex; align-items:center; gap:6px; background:#F5F5F3; color:#555; border:none; border-radius:9px; padding:8px 16px; font-size:13px; cursor:pointer; font-family:'DM Sans',sans-serif; transition:all 0.15s; }
        .ghost-btn:hover { background:#EBEBEB; }
        .empty-state { text-align:center; color:#CCC; font-size:13px; padding:40px 20px; }
        .success-pill { font-size:12px; color:#15803D; background:#F0FDF4; padding:5px 12px; border-radius:8px; display:inline-flex; align-items:center; gap:5px; }
        .back-link { display:flex; align-items:center; gap:6px; font-size:13px; color:#888; background:none; border:none; cursor:pointer; font-family:'DM Sans',sans-serif; margin-bottom:14px; }
        .back-link:hover { color:#1A1A1A; }
        .badge { font-size:10px; font-weight:600; padding:2px 7px; border-radius:6px; }
        @keyframes spin { to { transform:rotate(360deg); } }
        .spin { width:13px; height:13px; border:2px solid rgba(255,255,255,0.3); border-top-color:#fff; border-radius:50%; animation:spin 0.8s linear infinite; }
        .spin-dark { width:13px; height:13px; border:2px solid #DDD; border-top-color:#555; border-radius:50%; animation:spin 0.8s linear infinite; }
        @media (max-width:768px) {
          .layout { grid-template-columns:1fr; }
          .stat-grid { grid-template-columns:1fr 1fr; }
          .topbar { padding:0 16px; }
          .content { padding:14px; }
        }
      `}</style>

      {/* ── Topbar ── */}
      <div className="topbar">
        <div className="brand"><div className="brand-dot" /> Etütçü Paneli</div>
        <div className="topbar-right">
          {/* Bell */}
          <div style={{ position:'relative' }}>
            <button className="notif-btn" onClick={() => setShowNotifs(v => !v)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              {unread > 0 && <span className="notif-badge">{unread}</span>}
            </button>
            {showNotifs && (
              <>
                <div style={{ position:'fixed', inset:0, zIndex:150 }} onClick={() => setShowNotifs(false)} />
                <div style={{ position:'absolute', top:'calc(100% + 8px)', right:0, width:290, background:'#fff', border:'1px solid #EFEFED', borderRadius:12, boxShadow:'0 8px 32px rgba(0,0,0,0.1)', zIndex:200, overflow:'hidden' }}>
                  <div style={{ padding:'11px 16px', borderBottom:'1px solid #F5F5F3', fontSize:13, fontWeight:600, color:'#1A1A1A' }}>Bildirimler {unread > 0 && `(${unread})`}</div>
                  {notifs.length === 0
                    ? <div style={{ padding:'20px 16px', textAlign:'center', fontSize:13, color:'#CCC' }}>Bildirim yok</div>
                    : notifs.slice(0, 6).map(n => {
                        const s = n.quiz_sessions; if (!s) return null
                        return (
                          <div key={n.id} style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'10px 16px', borderBottom:'1px solid #F9FAFB', cursor:'pointer', background: n.is_read ? '#fff' : '#FFFBF5' }}
                            onClick={() => { setShowNotifs(false); setTab('quizzes'); openSession(s) }}>
                            <div style={{ width:8, height:8, borderRadius:'50%', background: n.is_read ? '#E5E5E3' : '#F59E0B', flexShrink:0, marginTop:4 }} />
                            <div>
                              <div style={{ fontSize:12, color:'#333' }}><strong>{s.title}</strong></div>
                              <div style={{ fontSize:11, color:'#AAA', marginTop:2 }}>{(s.classes as any)?.name}</div>
                            </div>
                          </div>
                        )
                      })
                  }
                </div>
              </>
            )}
          </div>
          <span className="user-chip">{dbUser?.full_name?.split(' ')[0]}</span>
          <button className="signout-btn" onClick={async () => { await supabase.auth.signOut(); router.push('/') }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Çıkış
          </button>
        </div>
      </div>

      <div className="layout">
        {/* ── Sidebar ── */}
        <div className="sidebar">
          <div className="sidebar-label">Sınıflar</div>
          {myClasses.map(cls => (
            <button key={cls.id} className={`class-btn ${selClass?.id === cls.id ? 'on' : ''}`} onClick={() => switchClass(cls)}>
              <div className="class-dot" style={{ background: cls.class_type === 'islamic' ? '#7E22CE' : '#1D4ED8' }} />
              {cls.name}
            </button>
          ))}
          {dbUser?.is_head_etutor && (
            <div style={{ marginTop:10, fontSize:10, color:'#C2410C', background:'#FFF7ED', padding:'4px 10px', borderRadius:7, textAlign:'center' }}>Head Etütçü</div>
          )}
        </div>

        {/* ── Main ── */}
        <div className="main">
          <div className="tabs">
            {([
              ['dashboard', 'Dashboard'],
              ['attendance', 'Devam'],
              ['homework', 'Ödevler'],
              ['curriculum', 'Müfredat'],
              ['quizzes', 'Quizler'],
              ['report', 'Haftalık Rapor'],
            ] as const).map(([key, label]) => (
              <button key={key} className={`tab-btn ${tab === key ? 'on' : ''}`}
                onClick={() => {
                  setTab(key)
                  if (key === 'homework' && selClass && hwByTeacher.length === 0) loadHwByTeacher(selClass.id)
                  if (key === 'report' && selClass && !weeklyReports[reportWeekOffset]) generateWeekReport(reportWeekOffset)
                }}>
                {label}
                {key === 'quizzes' && dashStats.pendingQuiz > 0 && <span className="tab-badge">{dashStats.pendingQuiz}</span>}
              </button>
            ))}
          </div>

          <div className="content">

            {/* ── DASHBOARD ── */}
            {tab === 'dashboard' && (
              <>
                <div style={{ fontSize:17, fontWeight:600, color:'#1A1A1A', marginBottom:3 }}>
                  {selClass?.name}
                  <span style={{ fontSize:12, fontWeight:400, color:'#AAA', marginLeft:10 }}>{learners.length} öğrenci</span>
                </div>
                <div style={{ fontSize:12, color:'#AAA', marginBottom:16 }}>
                  {new Date().toLocaleDateString('en-ZA', { weekday:'long', day:'numeric', month:'long' })}
                </div>
                <div className="stat-grid">
                  {[
                    { label:'Bugün Devam', value: dashStats.attPct+'%', color: dashStats.attPct>=80?'#15803D':'#DC2626', pct: dashStats.attPct },
                    { label:'Müfredat', value: dashStats.currPct+'%', color:'#1D4ED8', pct: dashStats.currPct },
                    { label:'Ödev Teslim', value: dashStats.hwPct+'%', color:'#7E22CE', pct: dashStats.hwPct },
                    { label:'Bekleyen Quiz', value: String(dashStats.pendingQuiz), color: dashStats.pendingQuiz>0?'#DC2626':'#15803D', pct: null },
                  ].map(s => (
                    <div key={s.label} className="stat-card">
                      <div className="stat-n" style={{ color:s.color }}>{s.value}</div>
                      <div className="stat-l">{s.label}</div>
                      {s.pct !== null && <div className="prog-bg"><div className="prog-bar" style={{ width:s.pct+'%', background:s.color }} /></div>}
                    </div>
                  ))}
                </div>
                <div className="chart-wrap">
                  <div className="chart-title">14 Günlük Devam</div>
                  <div className="chart-bars">
                    {attHistory.map(d => {
                      const pct = d.total > 0 ? d.present/d.total*100 : 0
                      return (
                        <div key={d.date} className="chart-col">
                          <div className="chart-bar-item" style={{ height: pct>0?pct+'%':'3px', background: pct>=80?'#86EFAC':pct>=60?'#FCD34D':'#FCA5A5' }} />
                          <span className="chart-day">{new Date(d.date+'T12:00:00').getDate()}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </>
            )}

            {/* ── ATTENDANCE ── */}
            {tab === 'attendance' && (
              <>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14, flexWrap:'wrap' }}>
                  <input style={{ height:36, border:'1px solid #EFEFED', borderRadius:9, padding:'0 12px', fontSize:13, fontFamily:"'DM Sans',sans-serif", color:'#1A1A1A', background:'#fff', outline:'none' }}
                    type="date" value={attDate}
                    onChange={e => { setAttDate(e.target.value); loadAttForDate(e.target.value) }}
                  />
                  <span style={{ fontSize:12, color:'#AAA' }}>{learners.length} öğrenci</span>
                  <div style={{ display:'flex', gap:16, fontSize:12 }}>
                    <span style={{ color:'#15803D', fontWeight:600 }}>✓ {Object.values(attData).filter(s=>s==='present').length}</span>
                    <span style={{ color:'#C2410C', fontWeight:600 }}>⏱ {Object.values(attData).filter(s=>s==='late').length}</span>
                    <span style={{ color:'#DC2626', fontWeight:600 }}>✗ {Object.values(attData).filter(s=>s==='absent').length}</span>
                  </div>
                  <div style={{ flex:1 }} />
                  {attSaved && <span className="success-pill"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>Kaydedildi</span>}
                  <button className="primary-btn" style={{ padding:'7px 18px' }} onClick={saveAttendance} disabled={attSaving}>
                    {attSaving ? <><span className="spin" />Kaydediliyor...</> : 'Yoklamayı Kaydet'}
                  </button>
                </div>
                <div className="learner-card">
                  {learners.length === 0
                    ? <div className="empty-state">Bu sınıfta öğrenci bulunamadı.</div>
                    : learners.map(l => (
                      <div key={l.id} className="learner-row">
                        <div className="l-avatar">{l.full_name.charAt(0)}</div>
                        <span className="l-name">{l.full_name}</span>
                        <div className="status-seg">
                          <button className={`s-btn ${attData[l.id]==='present'?'p-on':''}`} onClick={() => setAttData(d=>({...d,[l.id]:'present'}))}>Hazır</button>
                          <button className={`s-btn ${attData[l.id]==='late'?'l-on':''}`} onClick={() => setAttData(d=>({...d,[l.id]:'late'}))}>Geç</button>
                          <button className={`s-btn ${attData[l.id]==='absent'?'a-on':''}`} onClick={() => setAttData(d=>({...d,[l.id]:'absent'}))}>Yok</button>
                        </div>
                      </div>
                    ))
                  }
                </div>
              </>
            )}

            {/* ── HOMEWORK ── */}
            {tab === 'homework' && (
              <>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
                  <div style={{ fontSize:14, fontWeight:600, color:'#1A1A1A' }}>Öğretmenlere Göre Ödevler</div>
                  <button className="ghost-btn" onClick={() => selClass && loadHwByTeacher(selClass.id)} disabled={hwLoading}>
                    {hwLoading ? <><span className="spin-dark" />Yükleniyor...</> : 'Yenile'}
                  </button>
                </div>
                {hwLoading ? <div className="empty-state">Yükleniyor...</div>
                : hwByTeacher.length === 0 ? <div className="empty-state">Bu sınıf için ödev bulunamadı.</div>
                : hwByTeacher.map(t => {
                  const avgPct = t.assignments.length > 0
                    ? Math.round(t.assignments.reduce((a,h) => a + (h.total>0?h.submitted/h.total*100:0), 0) / t.assignments.length) : 0
                  return (
                    <div key={t.teacher_name} className="teacher-section">
                      <div className="teacher-head">
                        <span className="t-name">👤 {t.teacher_name}</span>
                        <span className="badge" style={{ background:'#F5F5F3', color:'#666' }}>{t.assignments.length} ödev</span>
                        <span className="badge" style={{ background: avgPct>=80?'#F0FDF4':avgPct>=50?'#FFF7ED':'#FEF2F2', color: avgPct>=80?'#15803D':avgPct>=50?'#C2410C':'#DC2626' }}>
                          Ort. {avgPct}% teslim
                        </span>
                      </div>
                      <div className="hw-card">
                        {t.assignments.map(h => {
                          const pct = h.total > 0 ? Math.round(h.submitted/h.total*100) : 0
                          const color = pct>=80?'#15803D':pct>=50?'#C2410C':'#DC2626'
                          return (
                            <div key={h.id} className="hw-row">
                              <div style={{ flex:1, minWidth:0 }}>
                                <div className="hw-title">{h.title}</div>
                                <div className="hw-due">Son: {fmtDate(h.due_date)}</div>
                              </div>
                              <div className="hw-bar-bg"><div className="hw-bar" style={{ width:pct+'%', background:color }} /></div>
                              <div className="hw-rate" style={{ color }}>{h.submitted}/{h.total}<span style={{ fontSize:10, color:'#AAA', fontWeight:400, marginLeft:3 }}>({pct}%)</span></div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </>
            )}

            {/* ── CURRICULUM ── */}
            {tab === 'curriculum' && (
              <>
                <div style={{ fontSize:14, fontWeight:600, color:'#1A1A1A', marginBottom:14 }}>Müfredat Durumu — {selClass?.name}</div>
                <div className="curr-card">
                  {currStats.length === 0 ? <div className="empty-state">Müfredat verisi bulunamadı.</div>
                  : currStats.map(s => {
                    const pct = s.total > 0 ? Math.round(s.completed/s.total*100) : 0
                    const color = pct>=80?'#15803D':pct>=50?'#C2410C':'#DC2626'
                    return (
                      <div key={s.subject} className="curr-row">
                        <span className="curr-sub">{s.subject}</span>
                        <div className="curr-bar-bg"><div className="curr-bar" style={{ width:pct+'%', background:color }} /></div>
                        <span className="curr-pct" style={{ color }}>{pct}%</span>
                        <span style={{ fontSize:11, color:'#AAA', minWidth:58, textAlign:'right' }}>{s.completed}/{s.total}</span>
                      </div>
                    )
                  })}
                </div>
              </>
            )}

            {/* ── QUIZZES ── */}
            {tab === 'quizzes' && (
              <>
                {qView === 'list' && (
                  <>
                    <div style={{ fontSize:14, fontWeight:600, color:'#1A1A1A', marginBottom:14 }}>
                      Quizler
                      {dashStats.pendingQuiz > 0 && <span style={{ marginLeft:8, fontSize:12, color:'#DC2626', background:'#FEF2F2', padding:'2px 8px', borderRadius:6 }}>{dashStats.pendingQuiz} bekliyor</span>}
                    </div>
                    <div className="sess-card">
                      {sessions.length === 0 ? <div className="empty-state">Henüz quiz gönderilmedi.</div>
                      : sessions.map(s => (
                        <div key={s.id} className="sess-row" onClick={() => openSession(s)}>
                          <div className="sess-dot" style={{ background: s.status==='sent'?'#EF4444':s.status==='completed'?'#22C55E':'#E5E5E3' }} />
                          <div className="sess-info">
                            <div className="sess-title">
                              {s.title}
                              {s.status === 'sent' && <span style={{ marginLeft:8, fontSize:10, fontWeight:700, background:'#FEF2F2', color:'#EF4444', padding:'1px 6px', borderRadius:5 }}>YENİ</span>}
                              {s.status === 'completed' && <span style={{ marginLeft:8, fontSize:10, fontWeight:700, background:'#F0FDF4', color:'#15803D', padding:'1px 6px', borderRadius:5 }}>TAMAMLANDI</span>}
                            </div>
                            <div className="sess-meta">{(s.curriculum_topics as any)?.title} · {s.question_ids?.length||0} soru{s.sent_at && ` · ${fmtDate(s.sent_at)}`}</div>
                          </div>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#CCC" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {(qView === 'questions' || qView === 'enter') && selSession && (
                  <>
                    <button className="back-link" onClick={() => { setQView('list'); setSelSession(null) }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
                      Geri
                    </button>
                    <div className="quiz-header">
                      <div style={{ fontSize:15, fontWeight:600, color:'#1A1A1A' }}>{selSession.title}</div>
                      <div style={{ fontSize:12, color:'#AAA', marginTop:3 }}>{(selSession.curriculum_topics as any)?.title} · {questions.length} soru</div>
                      <div className="quiz-actions">
                        <button className="print-btn" onClick={() => printQuiz(false)}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                          Sınav Yazdır
                        </button>
                        <button className="print-btn key" onClick={() => printQuiz(true)}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                          Cevap Anahtarı
                        </button>
                        <button className="print-btn" style={{ borderColor:'#BFDBFE', background:'#EFF6FF', color:'#1D4ED8' }}
                          onClick={() => setQView(qView==='questions'?'enter':'questions')}>
                          {qView === 'questions' ? 'Sonuç Gir →' : '← Sorulara Dön'}
                        </button>
                      </div>
                    </div>

                    {qView === 'questions' && (
                      <div className="q-card">
                        {questions.map((q, i) => (
                          <div key={q.id} className="q-row">
                            <span className="q-num">{i+1}</span>
                            <div style={{ flex:1 }}>
                              <div className="q-text">{q.question_text}</div>
                              {q.options && (
                                <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
                                  {q.options.map((opt, oi) => {
                                    const letter = ['A','B','C','D'][oi]
                                    const correct = q.correct_answer===letter || opt.startsWith(q.correct_answer+'.')
                                    return <div key={oi} className={`q-opt ${correct?'correct':''}`}>{opt}{correct&&' ✓'}</div>
                                  })}
                                </div>
                              )}
                              {q.question_type==='short_answer' && (
                                <div style={{ marginTop:6, fontSize:12, color:'#15803D', background:'#F0FDF4', padding:'5px 10px', borderRadius:7 }}><b>Cevap:</b> {q.correct_answer}</div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {qView === 'enter' && (
                      <div className="learner-card">
                        <div className="quick-fill">
                          <span style={{ fontSize:11, color:'#AAA', fontWeight:500 }}>Hızlı:</span>
                          {[0, Math.round(questions.length*0.5), Math.round(questions.length*0.75), questions.length].map(v => (
                            <button key={v} className="qf-btn" onClick={() => { const a:Record<string,number>={}; learners.forEach(l=>{a[l.id]=v}); setResults(a) }}>Hepsi→{v}</button>
                          ))}
                        </div>
                        {learners.map(l => {
                          const score = results[l.id] ?? 0
                          const pct   = questions.length>0 ? Math.round(score/questions.length*100) : 0
                          const color = pct>=75?'#15803D':pct>=50?'#C2410C':'#DC2626'
                          return (
                            <div key={l.id} className="learner-row">
                              <div className="l-avatar">{l.full_name.charAt(0)}</div>
                              <span className="l-name">{l.full_name}</span>
                              <input className="score-input" type="number" min={0} max={questions.length} value={score}
                                onChange={e => { const v=Math.min(questions.length,Math.max(0,parseInt(e.target.value)||0)); setResults(r=>({...r,[l.id]:v})) }} />
                              <span style={{ fontSize:12, color:'#AAA', margin:'0 4px' }}>/{questions.length}</span>
                              <span style={{ fontSize:13, fontWeight:600, color, minWidth:34, textAlign:'right' }}>{pct}%</span>
                            </div>
                          )
                        })}
                        <div className="save-footer">
                          {qSaved ? <span className="success-pill"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>Kaydedildi!</span>
                            : <span style={{ fontSize:12, color:'#AAA' }}>{learners.length} öğrenci · {questions.length} soru</span>}
                          <button className={`primary-btn ${qSaved?'ok':''}`} onClick={saveQuizResults} disabled={qSaving||learners.length===0}>
                            {qSaving?<><span className="spin"/>Kaydediliyor...</>:qSaved?'✓ Kaydedildi':'Sonuçları Kaydet'}
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            {/* ── REPORT ── */}
            {tab === 'report' && (
              <>
                {/* Week navigation */}
                <div className="week-nav">
                  <button className="week-nav-btn" onClick={() => {
                    const next = reportWeekOffset + 1
                    setReportWeekOffset(next)
                    if (selClass && !weeklyReports[next]) generateWeekReport(next)
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
                  </button>
                  <div style={{ flex:1, textAlign:'center' }}>
                    <div className="week-label">{reportWeekOffset === 0 ? 'Bu Hafta' : reportWeekOffset === 1 ? 'Geçen Hafta' : `${reportWeekOffset} Hafta Önce`}</div>
                    {currentReport && <div className="week-dates">{fmtWeek(currentReport.weekStart, currentReport.weekEnd)}</div>}
                  </div>
                  <button className="week-nav-btn" disabled={reportWeekOffset === 0} onClick={() => {
                    const prev = reportWeekOffset - 1
                    setReportWeekOffset(prev)
                    if (selClass && !weeklyReports[prev]) generateWeekReport(prev)
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                  </button>
                  {currentReport && (
                    <button className="primary-btn" style={{ padding:'6px 14px', fontSize:12 }} onClick={() => printReport(currentReport)}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                      PDF
                    </button>
                  )}
                </div>

                {reportLoading ? <div className="empty-state">Rapor hazırlanıyor...</div>
                : !currentReport ? <div className="empty-state" style={{ color:'#AAA' }}>Yükleniyor...</div>
                : (
                  <div className="report-card">
                    {/* Summary */}
                    <div className="report-summary-grid">
                      {[
                        { label:'Devam', value: currentReport.attPct+'%', color: currentReport.attPct>=80?'#15803D':'#DC2626' },
                        { label:'Verilen Ödev', value: currentReport.hwSummary.length, color:'#7E22CE' },
                        { label:'Quiz', value: currentReport.quizSummary.length, color:'#1D4ED8' },
                      ].map(s => (
                        <div key={s.label} className="stat-card">
                          <div className="stat-n" style={{ color:s.color }}>{s.value}</div>
                          <div className="stat-l">{s.label}</div>
                        </div>
                      ))}
                    </div>

                    {/* Curriculum */}
                    <div className="report-section">
                      <div className="report-section-title">İşlenen Konular</div>
                      {currentReport.progressList.length === 0
                        ? <div className="empty-report">Bu hafta tamamlanan konu yok</div>
                        : <table className="report-table">
                            <thead><tr><th>Konu</th><th>Öğretmen</th><th>Tarih</th><th>Anlama</th></tr></thead>
                            <tbody>
                              {currentReport.progressList.map((p: any, i: number) => (
                                <tr key={i}>
                                  <td>{(p.curriculum_topics as any)?.title || '—'}</td>
                                  <td>{(p.users as any)?.full_name || '—'}</td>
                                  <td>{fmtDate(p.taught_date)}</td>
                                  <td><span style={{ fontSize:11, padding:'2px 7px', borderRadius:5, background: p.understanding==='good'?'#F0FDF4':p.understanding==='difficult'?'#FEF2F2':'#FFF7ED', color: p.understanding==='good'?'#15803D':p.understanding==='difficult'?'#DC2626':'#C2410C' }}>{p.understanding||'—'}</span></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                      }
                    </div>

                    {/* Homework */}
                    <div className="report-section">
                      <div className="report-section-title">Ödevler</div>
                      {currentReport.hwSummary.length === 0
                        ? <div className="empty-report">Bu hafta ödev verilmedi</div>
                        : <table className="report-table">
                            <thead><tr><th>Ödev</th><th>Öğretmen</th><th>Son Tarih</th><th>Teslim</th></tr></thead>
                            <tbody>
                              {currentReport.hwSummary.map((h: any, i: number) => {
                                const pct = h.total>0?Math.round(h.submitted/h.total*100):0
                                return (
                                  <tr key={i}>
                                    <td>{h.title}</td><td>{h.teacher}</td><td>{fmtDate(h.due)}</td>
                                    <td><span style={{ fontWeight:600, color:pct>=80?'#15803D':pct>=50?'#C2410C':'#DC2626' }}>{h.submitted}/{h.total} ({pct}%)</span></td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                      }
                    </div>

                    {/* Quizzes */}
                    <div className="report-section">
                      <div className="report-section-title">Quizler</div>
                      {currentReport.quizSummary.length === 0
                        ? <div className="empty-report">Bu hafta quiz yapılmadı</div>
                        : <table className="report-table">
                            <thead><tr><th>Quiz</th><th>Konu</th><th>Durum</th><th>Ortalama</th></tr></thead>
                            <tbody>
                              {currentReport.quizSummary.map((q: any, i: number) => (
                                <tr key={i}>
                                  <td>{q.title}</td><td>{q.topic}</td>
                                  <td><span style={{ fontSize:11, padding:'2px 7px', borderRadius:5, background:q.status==='completed'?'#F0FDF4':'#FFF7ED', color:q.status==='completed'?'#15803D':'#C2410C' }}>{q.status==='completed'?'✓ Tamamlandı':'Bekliyor'}</span></td>
                                  <td style={{ fontWeight:600, color:(q.avgScore??-1)>=75?'#15803D':(q.avgScore??-1)>=50?'#C2410C':'#888' }}>{q.avgScore !== null ? q.avgScore + '%' : '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                      }
                    </div>
                  </div>
                )}
              </>
            )}

          </div>
        </div>
      </div>
    </main>
  )
}