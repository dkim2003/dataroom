import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { fullName } = await request.json()

    // Only allow if current status is rejected
    const { data: profile } = await supabase.from('profiles').select('status').eq('id', user.id).single()
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    if (profile.status !== 'rejected') return NextResponse.json({ error: 'Account is not in rejected state' }, { status: 400 })

    const updates = { status: 'pending', has_seen_tutorial: false, email_verified: false }
    if (fullName) updates.full_name = fullName

    const { error: updateError } = await supabase.from('profiles').update(updates).eq('id', user.id)
    if (updateError) return NextResponse.json({ error: 'Server error' }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
