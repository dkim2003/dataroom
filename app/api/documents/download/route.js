import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { isSafeRelativePath } from '@/lib/pathSafety'

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

    const { data: profile } = await supabase.from('profiles').select('role, is_admin').eq('id', user.id).single()
    const isAdmin = user.email === ADMIN_EMAIL || profile?.is_admin === true
    const isEmployee = profile?.role === 'pre_nda_employee' || profile?.role === 'post_nda_employee'
    const hasRestrictedAccess = isAdmin ||
      profile?.role === 'post_nda_investor' ||
      profile?.role === 'post_nda_employee'

    const { path, fileName } = await request.json()
    if (typeof path !== 'string' || !isSafeRelativePath(path)) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
    }

    // Private file — owner or admin only
    if (path.startsWith('private/')) {
      const pathUserId = path.split('/')[1]
      if (pathUserId !== user.id && !isAdmin)
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Internal file — employees and admin only
    if (path.startsWith('internal/') && !isEmployee && !isAdmin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Trash — employees and admin only (used by restore flows and direct links)
    if (path.startsWith('trash/') && !isEmployee && !isAdmin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const isRestricted = path.startsWith('restricted/')
    if (isRestricted && !hasRestrictedAccess) {
      return NextResponse.json({ requiresNda: true }, { status: 403 })
    }

    const { data, error } = await supabase.storage
      .from('documents')
      .createSignedUrl(path, 60, { download: fileName })

    if (error) return NextResponse.json({ error: 'Server error' }, { status: 500 })
    return NextResponse.json({ signedUrl: data.signedUrl })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
