'use client'
import { useEffect, useState } from 'react'
import { createClient } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

const supabase = createClient()

type Subject  = { id: string; name: string; class_type: string; class_id: string }
type Topic    = { id: string; title: string; subject_id: string }
type Material = { id: string; title: string; type: string; content: string | null; url: string | null }
type Question = {
  id: string; topic_id: string; question_text: string; question_type: string
  difficulty: string; options: string[] | null; correct_answer: string
  explanation: string | null; source: string; created_at: string
}
type Class = { id: string; name: string; class_type: string }
type SentSession = {
  id: string; title: string; status: string; sent_at: string; question_ids: string[]
  curriculum_topics: { title: string } | null
  classes: { name: string } | null
  users: { full_name: string } | null
}

const DIFF_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  easy:   { label: 'Easy',   bg: '#F0FDF4', color: '#15803D' },
  medium: { label: 'Medium', bg: '#FFF7ED', color: '#C2410C' },
  hard:   { label: 'Hard',   bg: '#FEF2F2', color: '#DC2626' },
}

const CAT_CONFIG = {
  secular: { label: 'Secular', color: '#1D4ED8', bg: '#EFF6FF', dot: '#3B82F6' },
  islamic: { label: 'Islamic', color: '#7E22CE', bg: '#FDF4FF', dot: '#A855F7' },
}

export default function TeacherQuiz() {
  const router = useRouter()

  const [allSubjects,  setAllSubjects]  = useState<Subject[]>([])
  const [allClasses,   setAllClasses]   = useState<Class[]>([])
  const [topics,       setTopics]       = useState<Topic[]>([])
  const [questions,    setQuestions]    = useState<Question[]>([])
  const [materials,    setMaterials]    = useState<Material[]>([])
  const [dbUser,       setDbUser]       = useState<{ id: string; role: string } | null>(null)

  // Filters
  const [category,   setCategory]   = useState<'secular' | 'islamic'>('secular')
  const [selClass,   setSelClass]   = useState('')   // ← YENİ: sınıf seçimi
  const [selSubject, setSelSubject]  = useState('')
  const [selTopic,   setSelTopic]    = useState('')
  const [selDiff,    setSelDiff]     = useState('all')
  const [selSource,  setSelSource]   = useState('all')

  // Tabs
  const [tab, setTab] = useState<'bank' | 'generate' | 'manual' | 'session' | 'sent'>('bank')

  // Generate
  const [genLoading,    setGenLoading]    = useState(false)
  const [genResult,     setGenResult]     = useState<{ count: number } | null>(null)
  const [genError,      setGenError]      = useState('')
  const [genDiff,       setGenDiff]       = useState('mixed')
  const [genType,       setGenType]       = useState('multiple_choice')
  const [useMaterials,  setUseMaterials]  = useState(true)

  // Manual add
  const [mText,    setMText]    = useState('')
  const [mType,    setMType]    = useState('multiple_choice')
  const [mDiff,    setMDiff]    = useState('medium')
  const [mOptions, setMOptions] = useState(['', '', '', ''])
  const [mAnswer,  setMAnswer]  = useState('A')
  const [mExpl,    setMExpl]    = useState('')
  const [mSaving,  setMSaving]  = useState(false)
  const [mSaved,   setMSaved]   = useState(false)
  const [mError,   setMError]   = useState('')

  // Create quiz session
  const [sesTitle,   setSesTitle]   = useState('')
  const [sesClass,   setSesClass]   = useState('')
  const [sesDiff,    setSesDiff]    = useState<Record<string, number>>({ easy: 2, medium: 2, hard: 1 })
  const [sesLoading, setSesLoading] = useState(false)
  const [sesResult,  setSesResult]  = useState<{ id: string; title: string; count: number } | null>(null)
  const [sesError,   setSesError]   = useState('')

  // Sent quizzes
  const [sentSessions,    setSentSessions]    = useState<SentSession[]>([])
  const [sentLoading,     setSentLoading]     = useState(false)
  const [sentFilterClass, setSentFilterClass] = useState('')

  // Question detail modal
  const [viewQ, setViewQ] = useState<Question | null>(null)

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }
    const { data: u } = await supabase.from('users').select('id, role').eq('auth_id', user.id).single()
    if (!u || !['admin', 'teacher'].includes(u.role)) { router.push('/'); return }
    setDbUser(u)

    const [{ data: subs }, { data: cls }] = await Promise.all([
      supabase.from('curriculum_subjects').select('id, name, class_type, class_id').eq('is_active', true).order('name'),
      supabase.from('classes').select('id, name, class_type').order('name'),
    ])
    setAllSubjects(subs || [])
    setAllClasses(cls || [])
  }

  // Category değişince sıfırla
  useEffect(() => {
    setSelClass(''); setSelSubject(''); setSelTopic('')
    setTopics([]); setMaterials([])
  }, [category])

  // Sınıf değişince subject sıfırla
  useEffect(() => {
    setSelSubject(''); setSelTopic('')
    setTopics([]); setMaterials([])
  }, [selClass])

  // Subject değişince topic yükle
  useEffect(() => {
    if (!selSubject) { setTopics([]); setSelTopic(''); setMaterials([]); return }
    supabase.from('curriculum_topics')
      .select('id, title, subject_id')
      .eq('subject_id', selSubject)
      .eq('is_active', true)
      .order('order_num')
      .then(({ data }) => { setTopics(data || []); setSelTopic('') })
  }, [selSubject])

  // Topic değişince material + sorular yükle
  useEffect(() => {
    if (!selTopic) { setMaterials([]); return }
    supabase.from('curriculum_materials')
      .select('id, title, type, content, url')
      .eq('topic_id', selTopic)
      .order('order_num')
      .then(({ data }) => setMaterials(data || []))
    loadQuestions()
  }, [selTopic])

  useEffect(() => { loadQuestions() }, [selDiff, selSource])

  async function loadQuestions() {
    let q = supabase.from('quiz_questions').select('*').eq('is_active', true).order('created_at', { ascending: false })
    if (selTopic)            q = q.eq('topic_id', selTopic)
    if (selDiff !== 'all')   q = q.eq('difficulty', selDiff)
    if (selSource !== 'all') q = q.eq('source', selSource)
    if (!selTopic)           q = q.limit(100)
    const { data } = await q
    setQuestions(data || [])
  }

  async function loadSentSessions() {
    setSentLoading(true)
    let q = supabase
      .from('quiz_sessions')
      .select('id, title, status, sent_at, question_ids, curriculum_topics(title), classes(name), users(full_name)')
      .order('created_at', { ascending: false })
    if (sentFilterClass) q = q.eq('class_id', sentFilterClass)
    const { data } = await q
    setSentSessions((data || []) as any)
    setSentLoading(false)
  }

  async function generateQuestions() {
    if (!selTopic) { setGenError('Önce bir konu seçin'); return }
    setGenLoading(true); setGenError(''); setGenResult(null)
    try {
      const res = await fetch('/api/quiz/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic_id: selTopic, difficulty: genDiff, question_type: genType,
          use_materials: useMaterials,
          materials: useMaterials ? materials.filter(m => m.content).map(m => ({ title: m.title, content: m.content })) : [],
        }),
      })
      const data = await res.json()
      if (!res.ok) { setGenError(data.error || 'Generation failed'); setGenLoading(false); return }
      setGenResult({ count: data.count })
      loadQuestions()
      setTimeout(() => setGenResult(null), 4000)
    } catch (e: any) { setGenError(e.message) }
    setGenLoading(false)
  }

  async function saveManual() {
    if (!selTopic)    { setMError('Konu seçin'); return }
    if (!mText.trim()) { setMError('Soru metni gerekli'); return }
    if (mType === 'multiple_choice' && mOptions.some(o => !o.trim())) { setMError('Tüm seçenekleri doldurun'); return }
    if (!mAnswer.trim()) { setMError('Doğru cevap gerekli'); return }
    setMSaving(true); setMError(''); setMSaved(false)

    const res = await fetch('/api/quiz/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic_id: selTopic,
        question_text: mText.trim(),
        question_type: mType,
        difficulty: mDiff,
        options: mType === 'multiple_choice' ? mOptions.map((o, i) => `${['A','B','C','D'][i]}. ${o}`) : null,
        correct_answer: mAnswer.trim(),
        explanation: mExpl.trim() || null,
      }),
    })

    if (res.ok) {
      setMSaved(true)
      setMText(''); setMOptions(['','','','']); setMAnswer('A'); setMExpl('')
      loadQuestions()
      setTimeout(() => setMSaved(false), 2500)
    } else {
      const d = await res.json()
      setMError(d.error || 'Save failed')
    }
    setMSaving(false)
  }

  async function deleteQuestion(id: string) {
    if (!confirm('Bu soruyu sil?')) return
    await supabase.from('quiz_questions').update({ is_active: false }).eq('id', id)
    loadQuestions()
  }

  async function createSession() {
    if (!selTopic)        { setSesError('Konu seçin'); return }
    if (!sesClass)        { setSesError('Sınıf seçin'); return }
    if (!sesTitle.trim()) { setSesError('Başlık girin'); return }
    const totalQ = Object.values(sesDiff).reduce((a, b) => a + b, 0)
    if (totalQ === 0)     { setSesError('En az 1 soru seçin'); return }
    if (questions.length < totalQ) { setSesError(`Havuzda ${questions.length} soru var, ${totalQ} isteniyor.`); return }

    setSesLoading(true); setSesError(''); setSesResult(null)
    const res = await fetch('/api/quiz/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: sesTitle.trim(), topic_id: selTopic, class_id: sesClass, difficulty_mix: sesDiff }),
    })
    const data = await res.json()
    if (!res.ok) { setSesError(data.error || 'Failed'); setSesLoading(false); return }
    setSesResult({ id: data.session.id, title: data.session.title, count: data.question_count })
    setSesLoading(false)
  }

  // Derived
  const filteredClasses  = allClasses.filter(c => c.class_type === category)
  const filteredSubjects = allSubjects.filter(s => s.class_type === category && (!selClass || s.class_id === selClass))
  const bankByDiff       = {
    easy:   questions.filter(q => q.difficulty === 'easy').length,
    medium: questions.filter(q => q.difficulty === 'medium').length,
    hard:   questions.filter(q => q.difficulty === 'hard').length,
  }
  const totalSesDiff = Object.values(sesDiff).reduce((a, b) => a + b, 0)
  const contentMats  = materials.filter(m => m.content && m.content.trim())
  const cat          = CAT_CONFIG[category]

  return (
    <main style={{ minHeight:'100vh', background:'#F8F7F4', fontFamily:"'DM Sans',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        .topbar { background:#fff; border-bottom:1px solid #EFEFED; padding:0 32px; height:56px; display:flex; align-items:center; gap:12px; position:sticky; top:0; z-index:30; }
        .back-btn { display:flex; align-items:center; gap:6px; font-size:13px; color:#999; background:none; border:none; cursor:pointer; padding:6px 10px; border-radius:8px; font-family:'DM Sans',sans-serif; transition:all 0.15s; }
        .back-btn:hover { background:#F5F5F3; color:#333; }
        .page-title { font-size:15px; font-weight:500; color:#1A1A1A; }
        .divider { color:#DDD; }
        .layout { display:grid; grid-template-columns:268px 1fr; min-height:calc(100vh - 56px); }
        .sidebar { background:#fff; border-right:1px solid #EFEFED; display:flex; flex-direction:column; }
        .cat-toggle { display:grid; grid-template-columns:1fr 1fr; border-bottom:1px solid #EFEFED; }
        .cat-btn { padding:13px 0; border:none; background:#fff; font-size:12px; font-weight:600; cursor:pointer; font-family:'DM Sans',sans-serif; color:#BBB; border-bottom:2px solid transparent; transition:all 0.15s; }
        .cat-btn:hover { color:#666; }
        .cat-btn.secular-on { color:#1D4ED8; border-bottom-color:#1D4ED8; background:#FAFCFF; }
        .cat-btn.islamic-on { color:#7E22CE; border-bottom-color:#7E22CE; background:#FDF8FF; }
        .sidebar-inner { padding:14px; display:flex; flex-direction:column; gap:12px; flex:1; overflow-y:auto; }
        .sidebar-label { font-size:10px; font-weight:600; color:#BBB; text-transform:uppercase; letter-spacing:0.06em; margin-bottom:4px; }
        .sel { height:36px; border:1px solid #EFEFED; border-radius:9px; padding:0 10px; font-size:13px; font-family:'DM Sans',sans-serif; color:#1A1A1A; background:#fff; outline:none; width:100%; cursor:pointer; transition:border-color 0.15s; }
        .sel:focus { border-color:#1A1A1A; }
        .sel:disabled { background:#FAFAF8; color:#CCC; cursor:not-allowed; }
        .chip-row { display:flex; gap:5px; flex-wrap:wrap; }
        .chip { padding:4px 9px; border-radius:7px; border:1px solid #EFEFED; background:#fff; font-size:11px; font-weight:500; cursor:pointer; font-family:'DM Sans',sans-serif; color:#666; transition:all 0.15s; }
        .chip.on { background:#1A1A1A; color:#fff; border-color:#1A1A1A; }
        .mat-box { background:#F8F7F4; border-radius:9px; padding:9px 12px; }
        .bank-stats { background:#F8F7F4; border-radius:9px; padding:10px 12px; display:flex; flex-direction:column; gap:7px; }
        .bank-stat-row { display:flex; align-items:center; justify-content:space-between; }
        .bank-stat-label { font-size:12px; color:#666; display:flex; align-items:center; gap:6px; }
        .bank-stat-dot { width:7px; height:7px; border-radius:50%; }
        .bank-stat-n { font-size:13px; font-weight:600; color:#1A1A1A; }
        .bank-total { font-size:11px; color:#AAA; border-top:1px solid #EFEFED; padding-top:7px; margin-top:2px; text-align:center; }
        .main { flex:1; display:flex; flex-direction:column; min-width:0; }
        .cat-strip { padding:7px 24px; display:flex; align-items:center; gap:8px; border-bottom:1px solid; }
        .tabs { display:flex; padding:0 24px; border-bottom:1px solid #EFEFED; background:#fff; overflow-x:auto; scrollbar-width:none; }
        .tabs::-webkit-scrollbar { display:none; }
        .tab-btn { padding:11px 15px; border:none; background:none; font-size:13px; font-weight:500; color:#999; cursor:pointer; font-family:'DM Sans',sans-serif; border-bottom:2px solid transparent; transition:all 0.15s; white-space:nowrap; }
        .tab-btn:hover { color:#555; }
        .tab-btn.on { color:#1A1A1A; border-bottom-color:#1A1A1A; }
        .tab-badge { display:inline-flex; align-items:center; justify-content:center; background:#F0F0EE; color:#888; font-size:10px; font-weight:600; min-width:17px; height:17px; border-radius:9px; padding:0 4px; margin-left:5px; }
        .content { padding:20px 22px; flex:1; }
        .q-card { background:#fff; border:1px solid #EFEFED; border-radius:12px; overflow:hidden; }
        .q-row { display:flex; align-items:flex-start; gap:12px; padding:12px 16px; border-bottom:1px solid #F8F8F6; transition:background 0.15s; cursor:pointer; }
        .q-row:last-child { border-bottom:none; }
        .q-row:hover { background:#FAFAF8; }
        .q-num { font-size:11px; color:#CCC; font-weight:600; min-width:20px; padding-top:2px; }
        .q-body { flex:1; min-width:0; }
        .q-text { font-size:13px; color:#1A1A1A; line-height:1.5; }
        .q-meta { display:flex; align-items:center; gap:5px; margin-top:5px; flex-wrap:wrap; }
        .diff-badge { font-size:10px; font-weight:600; padding:2px 7px; border-radius:6px; }
        .src-badge { font-size:10px; color:#AAA; background:#F5F5F3; padding:2px 7px; border-radius:6px; }
        .type-badge { font-size:10px; color:#6B7280; background:#F3F4F6; padding:2px 7px; border-radius:6px; }
        .q-del { background:none; border:none; cursor:pointer; color:#DDD; padding:4px; border-radius:6px; display:flex; transition:all 0.15s; flex-shrink:0; }
        .q-del:hover { background:#FEF2F2; color:#DC2626; }
        .empty-state { padding:40px 20px; text-align:center; color:#CCC; font-size:13px; }
        .panel-card { background:#fff; border:1px solid #EFEFED; border-radius:14px; padding:20px; max-width:520px; }
        .panel-title { font-size:14px; font-weight:600; color:#1A1A1A; margin-bottom:3px; }
        .panel-sub { font-size:12px; color:#AAA; margin-bottom:16px; line-height:1.5; }
        .field { display:flex; flex-direction:column; gap:5px; margin-bottom:13px; }
        .field-label { font-size:11px; font-weight:500; color:#888; text-transform:uppercase; letter-spacing:0.04em; }
        .field-hint { font-size:11px; color:#AAA; }
        .field-input { height:38px; border:1px solid #EFEFED; border-radius:9px; padding:0 12px; font-size:13px; font-family:'DM Sans',sans-serif; color:#1A1A1A; background:#fff; outline:none; width:100%; transition:border-color 0.15s; }
        .field-input:focus { border-color:#1A1A1A; }
        .field-input::placeholder { color:#CCC; }
        .seg { display:flex; border:1px solid #EFEFED; border-radius:9px; overflow:hidden; }
        .seg-btn { flex:1; padding:7px 8px; border:none; background:#fff; font-size:12px; font-weight:500; cursor:pointer; font-family:'DM Sans',sans-serif; color:#666; transition:all 0.15s; }
        .seg-btn.on { background:#1A1A1A; color:#fff; }
        .textarea { width:100%; border:1px solid #EFEFED; border-radius:9px; padding:10px 12px; font-size:13px; font-family:'DM Sans',sans-serif; color:#1A1A1A; outline:none; resize:vertical; min-height:76px; transition:border-color 0.15s; }
        .textarea:focus { border-color:#1A1A1A; }
        .textarea::placeholder { color:#CCC; }
        .warning-box { background:#FFF7ED; border:1px solid #FED7AA; border-radius:9px; padding:10px 14px; font-size:12px; color:#92400E; margin-bottom:14px; }
        .gen-success { background:#F0FDF4; border:1px solid #BBF7D0; border-radius:9px; padding:11px 14px; font-size:13px; color:#15803D; display:flex; align-items:center; gap:7px; margin-top:10px; }
        .gen-error { background:#FEF2F2; border:1px solid #FECACA; border-radius:9px; padding:11px 14px; font-size:12px; color:#DC2626; margin-top:10px; }
        .err-msg { font-size:12px; color:#DC2626; background:#FEF2F2; padding:7px 12px; border-radius:8px; margin-bottom:10px; }
        .toggle-row { display:flex; align-items:center; justify-content:space-between; background:#F8F7F4; border-radius:9px; padding:9px 13px; margin-bottom:13px; }
        .sw { position:relative; width:36px; height:20px; flex-shrink:0; }
        .sw input { opacity:0; width:0; height:0; position:absolute; }
        .sw-track { position:absolute; inset:0; background:#E5E5E3; border-radius:10px; cursor:pointer; transition:background 0.2s; }
        .sw input:checked + .sw-track { background:#1A1A1A; }
        .sw-thumb { position:absolute; top:2px; left:2px; width:16px; height:16px; border-radius:50%; background:#fff; box-shadow:0 1px 3px rgba(0,0,0,0.2); transition:transform 0.2s; pointer-events:none; }
        .sw input:checked ~ .sw-thumb { transform:translateX(16px); }
        .primary-btn { width:100%; padding:10px; background:#1A1A1A; color:#fff; border:none; border-radius:10px; font-size:13px; font-weight:600; cursor:pointer; font-family:'DM Sans',sans-serif; display:flex; align-items:center; justify-content:center; gap:7px; transition:background 0.15s; }
        .primary-btn:hover:not(:disabled) { background:#333; }
        .primary-btn:disabled { opacity:0.5; cursor:not-allowed; }
        .primary-btn.ok { background:#15803D; }
        .opt-grid { display:flex; flex-direction:column; gap:6px; }
        .opt-row { display:flex; align-items:center; gap:8px; }
        .opt-label { font-size:12px; font-weight:600; color:#888; width:18px; flex-shrink:0; }
        .opt-input { flex:1; height:36px; border:1px solid #EFEFED; border-radius:8px; padding:0 10px; font-size:13px; font-family:'DM Sans',sans-serif; color:#1A1A1A; outline:none; transition:border-color 0.15s; }
        .opt-input:focus { border-color:#1A1A1A; }
        .opt-input::placeholder { color:#CCC; }
        .ans-row { display:flex; gap:6px; }
        .ans-btn { width:36px; height:36px; border:1.5px solid #EFEFED; border-radius:8px; background:#fff; font-size:12px; font-weight:600; cursor:pointer; font-family:'DM Sans',sans-serif; color:#666; transition:all 0.15s; }
        .ans-btn.on { background:#1A1A1A; color:#fff; border-color:#1A1A1A; }
        .diff-step-grid { display:flex; flex-direction:column; gap:7px; }
        .diff-step-row { display:flex; align-items:center; justify-content:space-between; padding:9px 13px; border:1px solid #EFEFED; border-radius:10px; }
        .diff-step-left { display:flex; align-items:center; gap:8px; }
        .diff-step-name { font-size:13px; font-weight:500; color:#1A1A1A; }
        .diff-step-avail { font-size:11px; color:#AAA; }
        .mini-stepper { display:flex; align-items:center; border:1px solid #EFEFED; border-radius:8px; overflow:hidden; }
        .ms-btn { width:28px; height:28px; background:#FAFAF8; border:none; cursor:pointer; font-size:14px; color:#555; display:flex; align-items:center; justify-content:center; font-family:'DM Sans',sans-serif; transition:background 0.15s; }
        .ms-btn:hover { background:#F0F0EE; }
        .ms-val { width:34px; height:28px; text-align:center; font-size:13px; font-weight:600; color:#1A1A1A; border:none; border-left:1px solid #EFEFED; border-right:1px solid #EFEFED; font-family:'DM Sans',sans-serif; outline:none; background:#fff; }
        .total-row { display:flex; align-items:center; justify-content:space-between; padding:7px 0; font-size:13px; color:#666; border-top:1px solid #EFEFED; margin-top:3px; }
        .total-n { font-weight:600; color:#1A1A1A; }
        .ses-result { background:#F0FDF4; border:1px solid #BBF7D0; border-radius:12px; padding:14px; }
        .ses-result-title { font-size:14px; font-weight:600; color:#15803D; margin-bottom:5px; }
        .ses-result-sub { font-size:12px; color:#166534; line-height:1.5; }

        /* Sent sessions */
        .sent-controls { display:flex; align-items:center; gap:10px; margin-bottom:14px; flex-wrap:wrap; }
        .sent-card { background:#fff; border:1px solid #EFEFED; border-radius:12px; overflow:hidden; }
        .sent-row { display:flex; align-items:center; gap:12px; padding:12px 16px; border-bottom:1px solid #F8F8F6; }
        .sent-row:last-child { border-bottom:none; }
        .sent-dot { width:9px; height:9px; border-radius:50%; flex-shrink:0; }
        .sent-info { flex:1; min-width:0; }
        .sent-title { font-size:13px; font-weight:600; color:#1A1A1A; }
        .sent-meta { font-size:11px; color:#AAA; margin-top:2px; display:flex; gap:8px; flex-wrap:wrap; }
        .sent-meta-dot { width:3px; height:3px; border-radius:50%; background:#DDD; align-self:center; }
        .status-badge { font-size:10px; font-weight:600; padding:2px 8px; border-radius:6px; flex-shrink:0; }

        /* Modal */
        .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.4); z-index:100; display:flex; align-items:center; justify-content:center; padding:20px; backdrop-filter:blur(4px); }
        .modal { background:#fff; border-radius:16px; width:100%; max-width:500px; box-shadow:0 20px 60px rgba(0,0,0,0.15); overflow:hidden; max-height:90vh; overflow-y:auto; }
        .modal-head { padding:16px 20px; border-bottom:1px solid #F5F5F3; display:flex; align-items:center; justify-content:space-between; position:sticky; top:0; background:#fff; }
        .modal-title { font-size:14px; font-weight:600; color:#1A1A1A; }
        .modal-close { background:none; border:none; cursor:pointer; color:#CCC; padding:2px; }
        .modal-close:hover { color:#888; }
        .modal-body { padding:18px 20px; display:flex; flex-direction:column; gap:12px; }
        .modal-q { font-size:14px; color:#1A1A1A; line-height:1.6; font-weight:500; }
        .modal-opts { display:flex; flex-direction:column; gap:5px; }
        .modal-opt { font-size:13px; color:#444; padding:7px 12px; border-radius:8px; border:1px solid #EFEFED; }
        .modal-opt.correct { background:#F0FDF4; border-color:#BBF7D0; color:#15803D; font-weight:500; }
        .modal-expl-label { font-size:10px; font-weight:600; color:#AAA; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:3px; }
        .modal-expl { font-size:12px; color:#666; background:#F8F7F4; padding:9px 12px; border-radius:8px; line-height:1.6; }

        @keyframes spin { to { transform:rotate(360deg); } }
        .spin { width:13px; height:13px; border:2px solid rgba(255,255,255,0.3); border-top-color:#fff; border-radius:50%; animation:spin 0.8s linear infinite; }
        @media (max-width:768px) {
          .layout { grid-template-columns:1fr; }
          .sidebar { border-right:none; border-bottom:1px solid #EFEFED; }
          .topbar { padding:0 16px; }
          .content { padding:14px; }
        }
      `}</style>

      {/* Topbar */}
      <div className="topbar">
        <button className="back-btn" onClick={() => router.back()}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          Back
        </button>
        <span className="divider">|</span>
        <span className="page-title">Quiz & Question Bank</span>
      </div>

      <div className="layout">

        {/* ── Sidebar ── */}
        <div className="sidebar">
          <div className="cat-toggle">
            <button className={`cat-btn ${category==='secular'?'secular-on':''}`} onClick={() => setCategory('secular')}>
              📚 Secular
              <span style={{ display:'block', fontSize:10, fontWeight:400, color:category==='secular'?'#93C5FD':'#DDD', marginTop:1 }}>
                {allClasses.filter(c=>c.class_type==='secular').length} classes
              </span>
            </button>
            <button className={`cat-btn ${category==='islamic'?'islamic-on':''}`} onClick={() => setCategory('islamic')}>
              ☽ Islamic
              <span style={{ display:'block', fontSize:10, fontWeight:400, color:category==='islamic'?'#C4B5FD':'#DDD', marginTop:1 }}>
                {allClasses.filter(c=>c.class_type==='islamic').length} classes
              </span>
            </button>
          </div>

          <div className="sidebar-inner">

            {/* Class → Subject → Topic */}
            <div>
              <div className="sidebar-label">Class → Subject → Topic</div>
              <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                {/* Sınıf seçimi */}
                <select className="sel" value={selClass} onChange={e => setSelClass(e.target.value)}>
                  <option value="">All classes</option>
                  {filteredClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>

                {/* Subject — sınıfa göre filtreli, duplicate yok */}
                <select className="sel" value={selSubject} onChange={e => setSelSubject(e.target.value)}>
                  <option value="">Select subject...</option>
                  {filteredSubjects.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name}{!selClass && ` (${allClasses.find(c=>c.id===s.class_id)?.name || ''})`}
                    </option>
                  ))}
                </select>

                {/* Topic */}
                <select className="sel" value={selTopic} onChange={e => setSelTopic(e.target.value)} disabled={!selSubject}>
                  <option value="">{selSubject ? 'Select topic...' : '— select subject first —'}</option>
                  {topics.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                </select>
              </div>
            </div>

            {/* Materials */}
            {selTopic && (
              <div>
                <div className="sidebar-label">Topic Materials</div>
                <div className="mat-box">
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <span style={{ fontSize:12, color:'#666', display:'flex', alignItems:'center', gap:5 }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                      Content files
                    </span>
                    <span style={{ fontSize:12, fontWeight:600, color:'#1A1A1A' }}>{contentMats.length}</span>
                  </div>
                  <div style={{ fontSize:11, color: contentMats.length>0?'#15803D':'#CCC', marginTop:4 }}>
                    {contentMats.length > 0 ? '✓ AI will use this content' : 'No content — AI uses topic title only'}
                  </div>
                </div>
              </div>
            )}

            {/* Difficulty filter */}
            <div>
              <div className="sidebar-label">Difficulty</div>
              <div className="chip-row">
                {['all','easy','medium','hard'].map(d => (
                  <button key={d} className={`chip ${selDiff===d?'on':''}`} onClick={() => setSelDiff(d)}>
                    {d==='all'?'All':DIFF_CONFIG[d].label}
                  </button>
                ))}
              </div>
            </div>

            {/* Source filter */}
            <div>
              <div className="sidebar-label">Source</div>
              <div className="chip-row">
                {[['all','All'],['ai','AI'],['manual','Manual']].map(([k,l]) => (
                  <button key={k} className={`chip ${selSource===k?'on':''}`} onClick={() => setSelSource(k)}>{l}</button>
                ))}
              </div>
            </div>

            {/* Bank stats */}
            <div>
              <div className="sidebar-label">Bank Summary</div>
              <div className="bank-stats">
                {(['easy','medium','hard'] as const).map(diff => (
                  <div key={diff} className="bank-stat-row">
                    <span className="bank-stat-label">
                      <span className="bank-stat-dot" style={{ background:diff==='easy'?'#22C55E':diff==='medium'?'#F59E0B':'#EF4444' }} />
                      {DIFF_CONFIG[diff].label}
                    </span>
                    <span className="bank-stat-n">{bankByDiff[diff]}</span>
                  </div>
                ))}
                <div className="bank-total">{questions.length} question{questions.length!==1?'s':''}{selTopic?' for this topic':' total'}</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Main ── */}
        <div className="main">
          {/* Category breadcrumb strip */}
          <div className="cat-strip" style={{ background:cat.bg, borderBottomColor:category==='secular'?'#BFDBFE':'#E9D5FF' }}>
            <span style={{ width:8, height:8, borderRadius:'50%', background:cat.dot, display:'inline-block' }} />
            <span style={{ fontSize:12, fontWeight:600, color:cat.color }}>{cat.label} Education</span>
            {selClass && <><span style={{ color:cat.color, opacity:0.4 }}>›</span><span style={{ fontSize:12, color:cat.color, opacity:0.7 }}>{filteredClasses.find(c=>c.id===selClass)?.name}</span></>}
            {selSubject && <><span style={{ color:cat.color, opacity:0.4 }}>›</span><span style={{ fontSize:12, color:cat.color, opacity:0.7 }}>{filteredSubjects.find(s=>s.id===selSubject)?.name}</span></>}
            {selTopic && <><span style={{ color:cat.color, opacity:0.4 }}>›</span><span style={{ fontSize:12, color:cat.color }}>{topics.find(t=>t.id===selTopic)?.title}</span></>}
          </div>

          <div className="tabs">
            <button className={`tab-btn ${tab==='bank'?'on':''}`} onClick={() => setTab('bank')}>
              Question Bank <span className="tab-badge">{questions.length}</span>
            </button>
            <button className={`tab-btn ${tab==='generate'?'on':''}`} onClick={() => setTab('generate')}>AI Generate</button>
            <button className={`tab-btn ${tab==='manual'?'on':''}`} onClick={() => setTab('manual')}>Add Manually</button>
            <button className={`tab-btn ${tab==='session'?'on':''}`} onClick={() => setTab('session')}>Create Quiz</button>
            <button className={`tab-btn ${tab==='sent'?'on':''}`} onClick={() => { setTab('sent'); loadSentSessions() }}>Sent Quizzes</button>
          </div>

          <div className="content">

            {/* ── BANK ── */}
            {tab === 'bank' && (
              <div className="q-card">
                {questions.length === 0 ? (
                  <div className="empty-state">
                    {selTopic ? 'No questions for this topic yet.' : 'Select a class, subject and topic to see questions.'}
                  </div>
                ) : questions.map((q, i) => (
                  <div key={q.id} className="q-row" onClick={() => setViewQ(q)}>
                    <span className="q-num">{i+1}</span>
                    <div className="q-body">
                      <div className="q-text">{q.question_text.length>120?q.question_text.slice(0,120)+'…':q.question_text}</div>
                      <div className="q-meta">
                        <span className="diff-badge" style={{ background:DIFF_CONFIG[q.difficulty]?.bg, color:DIFF_CONFIG[q.difficulty]?.color }}>{DIFF_CONFIG[q.difficulty]?.label||q.difficulty}</span>
                        <span className="src-badge">{q.source==='ai'?'✦ AI':'✎ Manual'}</span>
                        <span className="type-badge">{q.question_type==='multiple_choice'?'MC':'Short'}</span>
                      </div>
                    </div>
                    <button className="q-del" onClick={e=>{e.stopPropagation();deleteQuestion(q.id)}}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* ── GENERATE ── */}
            {tab === 'generate' && (
              <div className="panel-card">
                <div className="panel-title">AI Question Generator</div>
                <div className="panel-sub">{category==='islamic'?'☽ Islamic':'📚 Secular'} — CAPS aligned questions for the selected topic.</div>
                {!selTopic && <div className="warning-box">← Select a class, subject and topic from the sidebar first</div>}
                {selTopic && contentMats.length > 0 && (
                  <div className="toggle-row">
                    <div>
                      <div style={{ fontSize:12, fontWeight:500, color:'#1A1A1A' }}>Use topic materials as context</div>
                      <div style={{ fontSize:11, color:'#AAA', marginTop:1 }}>{contentMats.length} content file{contentMats.length!==1?'s':''} available</div>
                    </div>
                    <label className="sw">
                      <input type="checkbox" checked={useMaterials} onChange={e=>setUseMaterials(e.target.checked)} />
                      <div className="sw-track" /><div className="sw-thumb" />
                    </label>
                  </div>
                )}
                <div className="field">
                  <label className="field-label">Difficulty</label>
                  <div className="seg">
                    {[['mixed','Mixed'],['easy','Easy'],['medium','Medium'],['hard','Hard']].map(([k,l]) => (
                      <button key={k} className={`seg-btn ${genDiff===k?'on':''}`} onClick={()=>setGenDiff(k)}>{l}</button>
                    ))}
                  </div>
                </div>
                <div className="field">
                  <label className="field-label">Question Type</label>
                  <div className="seg">
                    <button className={`seg-btn ${genType==='multiple_choice'?'on':''}`} onClick={()=>setGenType('multiple_choice')}>Multiple Choice</button>
                    <button className={`seg-btn ${genType==='short_answer'?'on':''}`} onClick={()=>setGenType('short_answer')}>Short Answer</button>
                  </div>
                </div>
                <button className="primary-btn" onClick={generateQuestions} disabled={genLoading||!selTopic}>
                  {genLoading?<><span className="spin"/>Generating...</>:<>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 0 2h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1 0-2h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/></svg>
                    Generate Questions
                  </>}
                </button>
                {genResult && <div className="gen-success"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>{genResult.count} questions added to bank!</div>}
                {genError  && <div className="gen-error">{genError}</div>}
              </div>
            )}

            {/* ── MANUAL ── */}
            {tab === 'manual' && (
              <div className="panel-card">
                <div className="panel-title">Add Question Manually</div>
                <div className="panel-sub">Saved straight to the question bank.</div>
                {!selTopic && <div className="warning-box">← Select a class, subject and topic from the sidebar first</div>}
                <div className="field">
                  <label className="field-label">Question *</label>
                  <textarea className="textarea" value={mText} onChange={e=>setMText(e.target.value)} placeholder="Write the question here..." />
                </div>
                <div className="field">
                  <label className="field-label">Type</label>
                  <div className="seg">
                    <button className={`seg-btn ${mType==='multiple_choice'?'on':''}`} onClick={()=>setMType('multiple_choice')}>Multiple Choice</button>
                    <button className={`seg-btn ${mType==='short_answer'?'on':''}`} onClick={()=>setMType('short_answer')}>Short Answer</button>
                  </div>
                </div>
                <div className="field">
                  <label className="field-label">Difficulty</label>
                  <div className="seg">
                    {[['easy','Easy'],['medium','Medium'],['hard','Hard']].map(([k,l])=>(
                      <button key={k} className={`seg-btn ${mDiff===k?'on':''}`} onClick={()=>setMDiff(k)}>{l}</button>
                    ))}
                  </div>
                </div>
                {mType==='multiple_choice' && (
                  <>
                    <div className="field">
                      <label className="field-label">Options *</label>
                      <div className="opt-grid">
                        {['A','B','C','D'].map((letter,i)=>(
                          <div key={letter} className="opt-row">
                            <span className="opt-label">{letter}</span>
                            <input className="opt-input" value={mOptions[i]} onChange={e=>{const o=[...mOptions];o[i]=e.target.value;setMOptions(o)}} placeholder={`Option ${letter}`} />
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="field">
                      <label className="field-label">Correct Answer *</label>
                      <div className="ans-row">
                        {['A','B','C','D'].map(l=>(
                          <button key={l} className={`ans-btn ${mAnswer===l?'on':''}`} onClick={()=>setMAnswer(l)}>{l}</button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
                {mType==='short_answer' && (
                  <div className="field">
                    <label className="field-label">Model Answer *</label>
                    <textarea className="textarea" style={{minHeight:56}} value={mAnswer} onChange={e=>setMAnswer(e.target.value)} placeholder="Expected answer..." />
                  </div>
                )}
                <div className="field">
                  <label className="field-label">Explanation (optional)</label>
                  <textarea className="textarea" style={{minHeight:52}} value={mExpl} onChange={e=>setMExpl(e.target.value)} placeholder="Why is this the correct answer?" />
                </div>
                {mError && <div className="err-msg">{mError}</div>}
                <button className={`primary-btn ${mSaved?'ok':''}`} onClick={saveManual} disabled={mSaving||!selTopic}>
                  {mSaving?'Saving...':mSaved?'✓ Question Added!':'Add to Bank'}
                </button>
              </div>
            )}

            {/* ── SESSION ── */}
            {tab === 'session' && (
              <div className="panel-card">
                <div className="panel-title">Create Quiz</div>
                <div className="panel-sub">Pick questions from the bank and send to Etütçü panel.</div>
                {!selTopic && <div className="warning-box">← Select a class, subject and topic from the sidebar first</div>}
                <div className="field">
                  <label className="field-label">Quiz Title *</label>
                  <input className="field-input" value={sesTitle} onChange={e=>setSesTitle(e.target.value)} placeholder="e.g. Term 1 Week 3 — Reading Comprehension" />
                </div>
                <div className="field">
                  <label className="field-label">Send to Class *</label>
                  <select className="sel" style={{height:38,borderRadius:9}} value={sesClass} onChange={e=>setSesClass(e.target.value)}>
                    <option value="">Select class...</option>
                    {allClasses.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label className="field-label">Questions per difficulty</label>
                  <span className="field-hint">Available in bank: {bankByDiff.easy} easy · {bankByDiff.medium} medium · {bankByDiff.hard} hard</span>
                  <div className="diff-step-grid" style={{marginTop:8}}>
                    {([['easy','Easy','#22C55E'],['medium','Medium','#F59E0B'],['hard','Hard','#EF4444']] as const).map(([key,label,color])=>(
                      <div key={key} className="diff-step-row">
                        <div className="diff-step-left">
                          <span style={{width:9,height:9,borderRadius:'50%',background:color,display:'inline-block',flexShrink:0}} />
                          <span className="diff-step-name">{label}</span>
                          <span className="diff-step-avail">({bankByDiff[key]} available)</span>
                        </div>
                        <div className="mini-stepper">
                          <button className="ms-btn" onClick={()=>setSesDiff(d=>({...d,[key]:Math.max(0,d[key]-1)}))}>−</button>
                          <input className="ms-val" type="number" value={sesDiff[key]} onChange={e=>setSesDiff(d=>({...d,[key]:parseInt(e.target.value)||0}))} min={0} />
                          <button className="ms-btn" onClick={()=>setSesDiff(d=>({...d,[key]:d[key]+1}))}>+</button>
                        </div>
                      </div>
                    ))}
                    <div className="total-row"><span>Total questions</span><span className="total-n">{totalSesDiff}</span></div>
                  </div>
                </div>
                {sesResult ? (
                  <div className="ses-result">
                    <div className="ses-result-title">✓ Quiz Created!</div>
                    <div className="ses-result-sub">"{sesResult.title}" — {sesResult.count} questions sent to Etütçü panel.</div>
                    <button style={{marginTop:10,background:'none',border:'1px solid #BBF7D0',borderRadius:8,padding:'6px 14px',fontSize:12,color:'#15803D',cursor:'pointer',fontFamily:"'DM Sans',sans-serif"}}
                      onClick={()=>{setSesResult(null);setSesTitle('');setSesClass('')}}>Create another</button>
                  </div>
                ) : (
                  <>
                    {sesError && <div className="err-msg">{sesError}</div>}
                    <button className="primary-btn" onClick={createSession} disabled={sesLoading||!selTopic||!sesClass}>
                      {sesLoading?<><span className="spin"/>Creating...</>:'Send Quiz to Etütçü →'}
                    </button>
                  </>
                )}
              </div>
            )}

            {/* ── SENT QUIZZES ── */}
            {tab === 'sent' && (
              <>
                <div className="sent-controls">
                  <select className="sel" style={{width:200}} value={sentFilterClass} onChange={e=>{setSentFilterClass(e.target.value);setTimeout(loadSentSessions,50)}}>
                    <option value="">All classes</option>
                    {allClasses.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <button style={{height:36,border:'1px solid #EFEFED',borderRadius:9,background:'#fff',padding:'0 14px',fontSize:13,cursor:'pointer',fontFamily:"'DM Sans',sans-serif",color:'#555'}}
                    onClick={loadSentSessions} disabled={sentLoading}>
                    {sentLoading?'Loading...':'Refresh'}
                  </button>
                  <span style={{fontSize:12,color:'#AAA'}}>{sentSessions.length} quiz{sentSessions.length!==1?'zes':''}</span>
                </div>
                <div className="sent-card">
                  {sentLoading ? <div className="empty-state">Loading...</div>
                  : sentSessions.length === 0 ? <div className="empty-state">No quizzes sent yet.</div>
                  : sentSessions.map(s => {
                    const statusCfg = s.status==='completed'
                      ? { bg:'#F0FDF4', color:'#15803D', label:'Completed', dot:'#22C55E' }
                      : s.status==='sent'
                      ? { bg:'#FEF2F2', color:'#DC2626', label:'Pending', dot:'#EF4444' }
                      : { bg:'#F5F5F3', color:'#666', label:s.status, dot:'#DDD' }
                    return (
                      <div key={s.id} className="sent-row">
                        <div className="sent-dot" style={{background:statusCfg.dot}} />
                        <div className="sent-info">
                          <div className="sent-title">{s.title}</div>
                          <div className="sent-meta">
                            {(s.curriculum_topics as any)?.title && <span>{(s.curriculum_topics as any).title}</span>}
                            {(s.classes as any)?.name && <><span className="sent-meta-dot"/><span>{(s.classes as any).name}</span></>}
                            {(s.users as any)?.full_name && <><span className="sent-meta-dot"/><span>by {(s.users as any).full_name}</span></>}
                            {s.sent_at && <><span className="sent-meta-dot"/><span>{new Date(s.sent_at).toLocaleDateString('en-ZA',{day:'numeric',month:'short'})}</span></>}
                            <><span className="sent-meta-dot"/><span>{s.question_ids?.length||0} questions</span></>
                          </div>
                        </div>
                        <span className="status-badge" style={{background:statusCfg.bg,color:statusCfg.color}}>{statusCfg.label}</span>
                      </div>
                    )
                  })}
                </div>
              </>
            )}

          </div>
        </div>
      </div>

      {/* Question Modal */}
      {viewQ && (
        <div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget)setViewQ(null)}}>
          <div className="modal">
            <div className="modal-head">
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <span className="diff-badge" style={{background:DIFF_CONFIG[viewQ.difficulty]?.bg,color:DIFF_CONFIG[viewQ.difficulty]?.color}}>{DIFF_CONFIG[viewQ.difficulty]?.label}</span>
                <span className="src-badge">{viewQ.source==='ai'?'✦ AI':'✎ Manual'}</span>
              </div>
              <button className="modal-close" onClick={()=>setViewQ(null)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="modal-q">{viewQ.question_text}</div>
              {viewQ.options && (
                <div className="modal-opts">
                  {viewQ.options.map((opt,i)=>{
                    const letter=['A','B','C','D'][i]
                    const isCorrect=viewQ.correct_answer===letter||opt.startsWith(viewQ.correct_answer+'.')
                    return <div key={i} className={`modal-opt ${isCorrect?'correct':''}`}>{opt}{isCorrect&&' ✓'}</div>
                  })}
                </div>
              )}
              {viewQ.question_type==='short_answer' && (
                <div><div className="modal-expl-label">Model Answer</div><div className="modal-expl">{viewQ.correct_answer}</div></div>
              )}
              {viewQ.explanation && (
                <div><div className="modal-expl-label">Explanation</div><div className="modal-expl">{viewQ.explanation}</div></div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}