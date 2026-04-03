import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const ADMIN_EMAIL = 'contact@kimduhyun.com'

async function verifyUser(request) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return null
  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return null
  const { data: profile } = await supabase.from('profiles').select('role, is_admin').eq('id', user.id).single()
  return { user, profile }
}

// GET /api/links — returns all links the user is allowed to see
export async function GET(request) {
  try {
    const auth = await verifyUser(request)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { user, profile } = auth
    const isPostNda  = profile?.role === 'post_nda_investor' || profile?.role === 'post_nda_employee'
    const isEmployee = profile?.role === 'pre_nda_employee'  || profile?.role === 'post_nda_employee'
    const isAdmin    = user.email === ADMIN_EMAIL || profile?.is_admin === true

    const { data, error } = await supabase
      .from('document_links')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const filtered = data.filter(link => {
      // Private-tab links: only visible to creator, or to admin
      if (link.folder === '__private__') return link.created_by === user.id || isAdmin
      if (link.internal  && !isEmployee && !isAdmin) return false
      if (link.restricted && !isPostNda  && !isAdmin) return false
      return true
    })

    return NextResponse.json({ links: filtered })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST /api/links — create a new link
export async function POST(request) {
  try {
    const auth = await verifyUser(request)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { user, profile } = auth
    const isEmployee = profile?.role === 'pre_nda_employee' || profile?.role === 'post_nda_employee'
    const isAdmin    = user.email === ADMIN_EMAIL || profile?.is_admin === true
    if (!isEmployee && !isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { name, url, folder, restricted, internal } = await request.json()
    if (!name?.trim() || !url?.trim() || !folder?.trim())
      return NextResponse.json({ error: 'name, url and folder are required' }, { status: 400 })

    const { data, error } = await supabase
      .from('document_links')
      .insert({ name: name.trim(), url: url.trim(), folder, restricted: !!restricted, internal: !!internal, created_by: user.id })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ link: data })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// PATCH /api/links — rename a link
export async function PATCH(request) {
  try {
    const auth = await verifyUser(request)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { user, profile } = auth
    const isEmployee = profile?.role === 'pre_nda_employee' || profile?.role === 'post_nda_employee'
    const isAdmin    = user.email === ADMIN_EMAIL || profile?.is_admin === true
    if (!isEmployee && !isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const { id, name } = await request.json()
    if (!id || !name?.trim()) return NextResponse.json({ error: 'id and name required' }, { status: 400 })
    const { data, error } = await supabase.from('document_links').update({ name: name.trim() }).eq('id', id).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ link: data })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// DELETE /api/links — delete a link by id
export async function DELETE(request) {
  try {
    const auth = await verifyUser(request)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { user, profile } = auth
    const isEmployee = profile?.role === 'pre_nda_employee' || profile?.role === 'post_nda_employee'
    const isAdmin    = user.email === ADMIN_EMAIL || profile?.is_admin === true
    if (!isEmployee && !isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await request.json()
    const { error } = await supabase.from('document_links').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
