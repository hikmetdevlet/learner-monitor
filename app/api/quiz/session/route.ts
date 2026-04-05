import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '../../../lib/supabase-server'

// GET: quiz session listesi
export async function GET(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { searchParams } = new URL(req.url)
  const class_id = searchParams.get('class_id')
  const status   = searchParams.get('status')

  let query = supabase
    .from('quiz_sessions')
    .select('*, curriculum_topics(title), classes(name), users(full_name)')
    .order('created_at', { ascending: false })

  if (class_id) query = query.eq('class_id', class_id)
  if (status)   query = query.eq('status', status)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ sessions: data })
}

// POST: yeni quiz session oluştur + etütçülere bildirim gönder
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
  const { title, topic_id, class_id, difficulty_mix, question_count = 5 } = body

  if (!title || !topic_id || !class_id) {
    return NextResponse.json({ error: 'title, topic_id, class_id required' }, { status: 400 })
  }

  // Havuzdan soru seç
  let questionIds: string[] = []

  if (difficulty_mix && Object.keys(difficulty_mix).length > 0) {
    for (const [diff, count] of Object.entries(difficulty_mix)) {
      if ((count as number) <= 0) continue
      const { data } = await supabase
        .from('quiz_questions')
        .select('id')
        .eq('topic_id', topic_id)
        .eq('difficulty', diff)
        .eq('is_active', true)
        .limit(count as number)
      questionIds.push(...(data?.map((q: any) => q.id) || []))
    }
  } else {
    const { data } = await supabase
      .from('quiz_questions')
      .select('id')
      .eq('topic_id', topic_id)
      .eq('is_active', true)
      .limit(question_count)
    questionIds = data?.map((q: any) => q.id) || []
  }

  if (questionIds.length === 0) {
    return NextResponse.json({
      error: 'Bu konu için soru havuzunda soru bulunamadı. Önce soru ekleyin veya AI ile üretin.'
    }, { status: 400 })
  }

  // Active academic year
  const { data: yearSetting } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'active_academic_year_id')
    .single()

  // Session oluştur
  const { data: session, error: sessionErr } = await supabase
    .from('quiz_sessions')
    .insert({
      title,
      topic_id,
      class_id,
      created_by:       dbUser.id,
      question_ids:     questionIds,
      difficulty_mix:   difficulty_mix || null,
      status:           'sent',
      academic_year_id: yearSetting?.value || null,
      sent_at:          new Date().toISOString(),
    })
    .select()
    .single()

  if (sessionErr) return NextResponse.json({ error: sessionErr.message }, { status: 500 })

  // Bu sınıfa atanmış etütçüleri bul + head etütçüler
  const { data: assignedEtutors } = await supabase
    .from('etutor_classes')
    .select('etutor_id')
    .eq('class_id', class_id)

  const { data: headEtutors } = await supabase
    .from('users')
    .select('id')
    .eq('role', 'etutor')
    .eq('is_head_etutor', true)

  const etutorSet = new Set<string>()
  ;(assignedEtutors || []).forEach((e: any) => etutorSet.add(e.etutor_id))
  ;(headEtutors    || []).forEach((e: any) => etutorSet.add(e.id))

  if (etutorSet.size > 0) {
    const notifications = Array.from(etutorSet).map(guardian_id => ({
      quiz_session_id: session.id,
      guardian_id,
      class_id,
    }))
    await supabase.from('guardian_notifications').insert(notifications)
  }

  return NextResponse.json({ session, question_count: questionIds.length })
}