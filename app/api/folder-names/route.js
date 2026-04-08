import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const ADMIN_EMAIL = 'contact@kimduhyun.com'

async function verifyAdmin(request) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return null
  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return null
  const { data: profile } = await supabase.from('profiles').select('role, is_admin').eq('id', user.id).single()
  const isEmployee = profile?.role === 'pre_nda_employee' || profile?.role === 'post_nda_employee'
  const isAdmin = user.email === ADMIN_EMAIL || profile?.is_admin === true
  if (!isEmployee && !isAdmin) return null
  return { user, isAdmin }
}

// GET /api/folder-names — returns { names: { originalName: displayName } }
export async function GET(request) {
  try {
    const auth = await verifyAdmin(request)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { data } = await supabase.from('settings').select('value').eq('key', 'folder_names').single()
    return NextResponse.json({ names: data?.value || {} })
  } catch {
    return NextResponse.json({ names: {} })
  }
}

// POST /api/folder-names — upsert a display name: { original, display }
export async function POST(request) {
  try {
    const auth = await verifyAdmin(request)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { original, display } = await request.json()
    if (!original) return NextResponse.json({ error: 'original required' }, { status: 400 })
    const { data: existing } = await supabase.from('settings').select('value').eq('key', 'folder_names').single()
    const names = existing?.value || {}
    if (display?.trim()) {
      names[original] = display.trim()
    } else {
      delete names[original]
    }
    let saveError
    if (existing) {
      const { error } = await supabase.from('settings').update({ value: names }).eq('key', 'folder_names')
      saveError = error
    } else {
      const { error } = await supabase.from('settings').insert({ key: 'folder_names', value: names })
      saveError = error
    }
    if (saveError) return NextResponse.json({ error: saveError.message }, { status: 500 })
    return NextResponse.json({ success: true, names })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// DELETE /api/folder-names — remove a display name override: { original }
export async function DELETE(request) {
  try {
    const auth = await verifyAdmin(request)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { original } = await request.json()
    if (!original) return NextResponse.json({ error: 'original required' }, { status: 400 })
    const { data: existing } = await supabase.from('settings').select('value').eq('key', 'folder_names').single()
    const names = existing?.value || {}
    delete names[original]
    await supabase.from('settings').upsert({ key: 'folder_names', value: names })
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
