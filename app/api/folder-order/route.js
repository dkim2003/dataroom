import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const ADMIN_EMAIL = 'contact@kimduhyun.com'

// GET /api/folder-order — returns { order: [...folderNames] }
// Now requires authentication so unauthenticated visitors cannot enumerate folder names.
export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'folder_order')
      .single()
    return NextResponse.json({ order: data?.value || [] })
  } catch {
    return NextResponse.json({ order: [] })
  }
}

// POST /api/folder-order — saves { order: [...folderNames] }
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

    const { order } = await request.json()
    // order must be an array of strings. Cap at 200 entries to prevent
    // abuse that bloats the settings row.
    if (!Array.isArray(order) || order.length > 200 || !order.every(v => typeof v === 'string')) {
      return NextResponse.json({ error: 'order must be an array of strings' }, { status: 400 })
    }

    await supabase.from('settings').upsert({ key: 'folder_order', value: order })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
