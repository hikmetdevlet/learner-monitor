import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '../../../lib/supabase-server'

// ─── Types ────────────────────────────────────────────────────────────────────

type GeneratedQuestion = {
  question_text:  string
  question_type:  string
  difficulty:     string
  options?:       string[]
  correct_answer: string
  explanation?:   string
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase()

  // Auth
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: dbUser } = await supabase
    .from('users').select('id, role').eq('auth_id', user.id).single()
  if (!dbUser || !['admin', 'teacher'].includes(dbUser.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const {
    topic_id,
    difficulty    = 'mixed',
    question_type = 'multiple_choice',
  } = body

  if (!topic_id) return NextResponse.json({ error: 'topic_id required' }, { status: 400 })

  // Fetch topic
  const { data: topic } = await supabase
    .from('curriculum_topics')
    .select('id, title, description, curriculum_subjects(name)')
    .eq('id', topic_id)
    .single()

  if (!topic) return NextResponse.json({ error: 'Topic not found' }, { status: 404 })

  // Fetch AI settings from DB
  const { data: settingsRows } = await supabase
    .from('settings')
    .select('key, value')
    .in('key', ['ai_enabled', 'ai_provider', 'ai_model', 'ai_api_key', 'ai_question_count'])

  const cfg: Record<string, string> = {}
  settingsRows?.forEach(s => { cfg[s.key] = s.value })

  if (cfg.ai_enabled === 'false') {
    return NextResponse.json({ error: 'AI generation is disabled' }, { status: 403 })
  }

  const provider      = cfg.ai_provider      || 'anthropic'
  const model         = cfg.ai_model         || 'claude-sonnet-4-20250514'
  const apiKey        = cfg.ai_api_key       || ''
  const questionCount = parseInt(cfg.ai_question_count || '5')

  if (!apiKey) {
    return NextResponse.json({ error: 'API key not configured — go to Settings → AI Question Generator' }, { status: 400 })
  }

  const subjectName = (topic.curriculum_subjects as any)?.name || 'English'

  // Optional: fetch materials for this topic to use as context
  const { use_materials, materials: clientMaterials } = body
  let materialContext: { title: string; content: string }[] = []

  if (use_materials !== false) {
    // If client sent materials directly (already fetched), use those
    if (clientMaterials && Array.isArray(clientMaterials)) {
      materialContext = clientMaterials.filter((m: any) => m.content)
    } else {
      // Otherwise fetch from DB
      const { data: mats } = await supabase
        .from('curriculum_materials')
        .select('title, content')
        .eq('topic_id', topic_id)
        .not('content', 'is', null)
        .order('order_num')
      materialContext = (mats || []).filter(m => m.content)
    }
  }

  const prompt = buildPrompt({ topicTitle: topic.title, topicDescription: topic.description, subjectName, questionCount, difficulty, question_type, materials: materialContext })

  // Call AI
  let questions: GeneratedQuestion[] = []
  try {
    if      (provider === 'anthropic') questions = await callAnthropic(model, apiKey, prompt)
    else if (provider === 'openai')    questions = await callOpenAI(model, apiKey, prompt)
    else if (provider === 'google')    questions = await callGoogle(model, apiKey, prompt)
    else return NextResponse.json({ error: `Unknown provider: ${provider}` }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: 'AI call failed: ' + e.message }, { status: 500 })
  }

  if (!questions.length) {
    return NextResponse.json({ error: 'AI returned no questions — try again' }, { status: 500 })
  }

  // Save to question bank
  const rows = questions.map(q => ({
    topic_id,
    question_text:  q.question_text,
    question_type:  q.question_type  || question_type,
    difficulty:     q.difficulty     || 'medium',
    options:        q.options        ?? null,
    correct_answer: q.correct_answer,
    explanation:    q.explanation    ?? null,
    source:        'ai',
    created_by:     dbUser.id,
  }))

  const { data: saved, error: saveErr } = await supabase
    .from('quiz_questions').insert(rows).select()

  if (saveErr) return NextResponse.json({ error: saveErr.message }, { status: 500 })

  return NextResponse.json({ questions: saved, count: saved?.length })
}

// ─── Prompt Builder ───────────────────────────────────────────────────────────

function buildPrompt({ topicTitle, topicDescription, subjectName, questionCount, difficulty, question_type, materials }: {
  topicTitle:       string
  topicDescription: string | null
  subjectName:      string
  questionCount:    number
  difficulty:       string
  question_type:    string
  materials:        { title: string; content: string }[]
}) {
  const diffNote = difficulty === 'mixed'
    ? `Mix difficulties evenly: roughly one-third easy, one-third medium, one-third hard.`
    : `All questions must be ${difficulty} difficulty.`

  const typeNote = question_type === 'multiple_choice'
    ? `All questions must be multiple choice with exactly 4 options labelled A, B, C, D.`
    : `All questions must be short answer (expect a 1–3 sentence response).`

  const materialSection = materials.length > 0
    ? `\n\nTopic Materials (use as primary source for questions):\n${materials.map(m => `--- ${m.title} ---\n${m.content}`).join('\n\n')}`
    : ''

  return `You are an expert question writer for South African CAPS Grade 8 ${subjectName}.

Topic: ${topicTitle}${topicDescription ? `\nDescription: ${topicDescription}` : ''}${materialSection}

Generate exactly ${questionCount} questions about this topic.

Rules:
- ${typeNote}
- ${diffNote}
- Questions must be age-appropriate for Grade 8 learners
- Questions must align with CAPS curriculum learning outcomes
- For multiple choice: one clearly correct answer, three plausible distractors
- Keep language clear and unambiguous
${materials.length > 0 ? '- Base questions on the provided topic materials above' : ''}

Return ONLY a valid JSON array — no markdown fences, no explanation, just the raw array:
[
  {
    "question_text": "...",
    "question_type": "multiple_choice",
    "difficulty": "easy",
    "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
    "correct_answer": "A",
    "explanation": "Brief reason why this answer is correct."
  }
]`
}

// ─── AI Callers ───────────────────────────────────────────────────────────────

async function callAnthropic(model: string, apiKey: string, prompt: string): Promise<GeneratedQuestion[]> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type':    'application/json',
      'x-api-key':       apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error?.message || `Anthropic ${res.status}`)
  }
  const data = await res.json()
  return parseJSON(data.content?.[0]?.text || '')
}

async function callOpenAI(model: string, apiKey: string, prompt: string): Promise<GeneratedQuestion[]> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error?.message || `OpenAI ${res.status}`)
  }
  const data = await res.json()
  return parseJSON(data.choices?.[0]?.message?.content || '')
}

async function callGoogle(model: string, apiKey: string, prompt: string): Promise<GeneratedQuestion[]> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 2048, temperature: 0.7 },
      }),
    }
  )
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error?.message || `Google ${res.status}`)
  }
  const data = await res.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
  return parseJSON(text)
}

// ─── JSON Parser ──────────────────────────────────────────────────────────────

function parseJSON(raw: string): GeneratedQuestion[] {
  const clean = raw.replace(/```json|```/g, '').trim()

  // Find the JSON array even if there's extra text around it
  const start = clean.indexOf('[')
  const end   = clean.lastIndexOf(']')
  if (start === -1 || end === -1) throw new Error('No JSON array found in AI response')

  const parsed = JSON.parse(clean.slice(start, end + 1))
  if (Array.isArray(parsed)) return parsed

  // OpenAI sometimes wraps: { "questions": [...] }
  if (parsed.questions && Array.isArray(parsed.questions)) return parsed.questions

  throw new Error('Unexpected JSON shape from AI')
}