import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '../../../lib/supabase'

export async function POST(req: NextRequest) {
  const supabase = createClient()

  // Auth + admin check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: dbUser } = await supabase
    .from('users').select('role').eq('auth_id', user.id).single()
  if (dbUser?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { provider, model, apiKey } = await req.json()

  if (!apiKey?.trim()) {
    return NextResponse.json({ error: 'API key is required' }, { status: 400 })
  }

  try {
    if (provider === 'anthropic') {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Say OK' }],
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        return NextResponse.json({ error: err.error?.message || 'Anthropic connection failed' }, { status: 400 })
      }
      return NextResponse.json({ ok: true })
    }

    if (provider === 'openai') {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Say OK' }],
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        return NextResponse.json({ error: err.error?.message || 'OpenAI connection failed' }, { status: 400 })
      }
      return NextResponse.json({ ok: true })
    }

    if (provider === 'google') {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'Say OK' }] }],
            generationConfig: { maxOutputTokens: 10 },
          }),
        }
      )
      if (!res.ok) {
        const err = await res.json()
        return NextResponse.json({ error: err.error?.message || 'Google connection failed' }, { status: 400 })
      }
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Unknown provider' }, { status: 400 })

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}