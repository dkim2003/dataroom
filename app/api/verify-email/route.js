import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// POST /api/verify-email
// Sets profiles.email_verified = true ONLY if Supabase auth has already
// confirmed the email (i.e. the user actually clicked the magic link).
// Without this check, any authenticated user could self-confirm by calling
// this endpoint directly.
export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Supabase sets email_confirmed_at when a magic link / confirmation link is clicked.
    // If it's not set, the email hasn't actually been verified yet.
    if (!user.email_confirmed_at) {
      return NextResponse.json(
        { error: 'Email not confirmed by Supabase yet' },
        { status: 400 }
      )
    }

    await supabase.from('profiles').update({ email_verified: true }).eq('id', user.id)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
