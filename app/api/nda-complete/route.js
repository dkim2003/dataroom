import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// POST /api/nda-complete
// Upgrades the calling user's role from pre_nda_* to post_nda_*
export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const roleUpgrades = {
      pre_nda_investor: 'post_nda_investor',
      pre_nda_employee: 'post_nda_employee'
    }

    const newRole = roleUpgrades[profile?.role]
    if (!newRole) {
      return NextResponse.json({ error: 'No upgrade needed for this role' }, { status: 400 })
    }

    await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', user.id)

    return NextResponse.json({ success: true, newRole })

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
