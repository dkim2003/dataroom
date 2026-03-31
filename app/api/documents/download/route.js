import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const ADMIN_EMAIL = 'contact@kimduhyun.com'

export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    const isAdmin = user.email === ADMIN_EMAIL
    const hasRestrictedAccess = isAdmin ||
      profile?.role === 'post_nda_investor' ||
      profile?.role === 'post_nda_employee'

    const { path, fileName } = await request.json()
    const isRestricted = path.startsWith('restricted/')
    if (isRestricted && !hasRestrictedAccess) {
      return NextResponse.json({ requiresNda: true }, { status: 403 })
    }

    const { data, error } = await supabase.storage
      .from('documents')
      .createSignedUrl(path, 60, { download: fileName })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ signedUrl: data.signedUrl })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
