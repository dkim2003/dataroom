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
      .select('role, is_admin')
      .eq('id', user.id)
      .single()

    const isAdmin = user.email === ADMIN_EMAIL || profile?.is_admin === true
    const isEmployee = profile?.role === 'pre_nda_employee' || profile?.role === 'post_nda_employee'
    const hasRestrictedAccess = isAdmin ||
      profile?.role === 'post_nda_investor' ||
      profile?.role === 'post_nda_employee'
    const hasInternalAccess = isAdmin || isEmployee

    const { path, fileName } = await request.json()
    const isRestricted = path.startsWith('restricted/')
    const isInternal = path.startsWith('internal/')

    // Private file — owner or admin only
    if (path.startsWith('private/')) {
      const pathUserId = path.split('/')[1]
      if (pathUserId !== user.id && !isAdmin)
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Restricted file — no access → return NDA flag instead of URL
    if (isRestricted && !hasRestrictedAccess) {
      return NextResponse.json({ requiresNda: true }, { status: 403 })
    }

    // Internal file — employees and admin only
    if (isInternal && !hasInternalAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const { data, error: urlError } = await supabase.storage
      .from('documents')
      .createSignedUrl(path, 60)

    if (urlError) return NextResponse.json({ error: urlError.message }, { status: 500 })

    await supabase.from('audit_log').insert({
      user_id: user.id,
      user_email: user.email,
      action: 'document_viewed',
      document_name: fileName
    })

    return NextResponse.json({ signedUrl: data.signedUrl })

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}