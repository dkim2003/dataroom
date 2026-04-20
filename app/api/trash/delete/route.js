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

    const { data: profile } = await supabase.from('profiles').select('role, is_admin').eq('id', user.id).single()
    const isAdmin = user.email === ADMIN_EMAIL || profile?.is_admin === true
    const isEmployee = profile?.role === 'pre_nda_employee' || profile?.role === 'post_nda_employee'
    if (!isAdmin && !isEmployee) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { trashId } = await request.json()

    const { data: trashRecord } = await supabase.from('trash').select('*').eq('id', trashId).single()
    if (!trashRecord) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // A private file in trash can only be permanently deleted by its owner or an admin.
    if (trashRecord.original_path?.startsWith('private/')) {
      const pathUserId = trashRecord.original_path.split('/')[1]
      if (pathUserId !== user.id && !isAdmin)
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await supabase.storage.from('documents').remove([`trash/${trashRecord.id}/${trashRecord.file_name}`])
    await supabase.from('trash').delete().eq('id', trashId)

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
