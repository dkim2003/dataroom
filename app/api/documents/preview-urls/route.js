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

    const { docs } = await request.json()
    if (!Array.isArray(docs)) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    if (docs.length > 50) return NextResponse.json({ error: 'Too many paths (max 50)' }, { status: 400 })

    const urls = {}
    await Promise.all(docs.map(async ({ path }) => {
      if (typeof path !== 'string' || !path || !isSafeRelativePath(path)) {
        return
      }

      // Private — owner or admin only
      if (path.startsWith('private/')) {
        const pathUserId = path.split('/')[1]
        if (pathUserId !== user.id && !isAdmin) {
          urls[path] = null
          return
        }
      }

      // Internal — employees + admin only
      if (path.startsWith('internal/') && !hasInternalAccess) {
        urls[path] = null
        return
      }

      // Restricted — post-NDA + admin only
      if (path.startsWith('restricted/') && !hasRestrictedAccess) {
        urls[path] = null
        return
      }

      // Never hand out preview URLs for trash paths
      if (path.startsWith('trash/')) {
        urls[path] = null
        return
      }

      const { data } = await supabase.storage
        .from('documents')
        .createSignedUrl(path, 300) // 5 min expiry for previews
      urls[path] = data?.signedUrl || null
    }))

    return NextResponse.json({ urls })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
