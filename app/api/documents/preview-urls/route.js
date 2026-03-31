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

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isAdmin = user.email === ADMIN_EMAIL
    const hasRestrictedAccess = isAdmin ||
      profile?.role === 'post_nda_investor' ||
      profile?.role === 'post_nda_employee'

    const { docs } = await request.json()
    if (!Array.isArray(docs)) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

    const urls = {}
    await Promise.all(docs.map(async ({ path }) => {
      const isRestricted = path.startsWith('restricted/')
      if (isRestricted && !hasRestrictedAccess) {
        urls[path] = null
        return
      }
      const { data } = await supabase.storage
        .from('documents')
        .createSignedUrl(path, 300) // 5 min expiry for previews
      urls[path] = data?.signedUrl || null
    }))

    return NextResponse.json({ urls })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
