import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '../../../lib/supabase-server'

// GET: topic_id'ye göre soruları getir
export async function GET(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { searchParams } = new URL(req.url)
  const topic_id   = searchParams.get('topic_id')
  const difficulty = searchParams.get('difficulty')
  const source     = searchParams.get('source')

  let query = supabase
    .from('quiz_questions')
    .select('*, curriculum_topics(title)')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (topic_id)                         query = query.eq('topic_id', topic_id)
  if (difficulty && difficulty !== 'all') query = query.eq('difficulty', difficulty)
  if (source && source !== 'all')        query = query.eq('source', source)
  if (!topic_id)                        query = query.limit(100)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ questions: data })
}

// POST: manuel soru ekle
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: dbUser } = await supabase
    .from('users')
    .select('id, role')
    .eq('auth_id', user.id)
    .single()

  if (!dbUser || !['admin', 'teacher'].includes(dbUser.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { topic_id, question_text, question_type, difficulty, options, correct_answer, explanation } = body

  if (!topic_id || !question_text || !correct_answer) {
    return NextResponse.json({ error: 'Missing required fields: topic_id, question_text, correct_answer' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('quiz_questions')
    .insert({
      topic_id,
      question_text:  question_text.trim(),
      question_type:  question_type  || 'multiple_choice',
      difficulty:     difficulty     || 'medium',
      options:        options        || null,
      correct_answer: correct_answer.trim(),
      explanation:    explanation    || null,
      source:         'manual',
      created_by:     dbUser.id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ question: data })
}

// DELETE: soruyu pasife al
export async function DELETE(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error } = await supabase
    .from('quiz_questions')
    .update({ is_active: false })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}