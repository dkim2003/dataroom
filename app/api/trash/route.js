import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const ADMIN_EMAIL = 'contact@kimduhyun.com'

async function getAuthedUser(request) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return null
  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return null
  return user
}

// GET — list trash items, auto-purge expired ones
export async function GET(request) {
  try {
    const user = await getAuthedUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('role, is_admin').eq('id', user.id).single()
    const isAdmin = user.email === ADMIN_EMAIL || profile?.is_admin === true
    const isEmployee = profile?.role === 'pre_nda_employee' || profile?.role === 'post_nda_employee'
    if (!isAdmin && !isEmployee) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Auto-purge expired items
    const { data: expired } = await supabase
      .from('trash')
      .select('id, file_name')
      .lt('expires_at', new Date().toISOString())

    if (expired?.length) {
      for (const item of expired) {
        await supabase.storage.from('documents').remove([`trash/${item.id}/${item.file_name}`])
      }
      await supabase.from('trash').delete().lt('expires_at', new Date().toISOString())
    }

    const { data, error } = await supabase
      .from('trash')
      .select('*')
      .order('trashed_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ items: data })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST — move a file to trash
export async function POST(request) {
  try {
    const user = await getAuthedUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('role, is_admin').eq('id', user.id).single()
    const isAdmin = user.email === ADMIN_EMAIL || profile?.is_admin === true
    const isEmployee = profile?.role === 'pre_nda_employee' || profile?.role === 'post_nda_employee'
    if (!isAdmin && !isEmployee) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { path, fileName } = await request.json()

    // Insert trash record to get an ID
    const { data: trashRecord, error: insertError } = await supabase
      .from('trash')
      .insert({ original_path: path, file_name: fileName, trashed_by: user.id, trashed_by_email: user.email })
      .select()
      .single()

    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

    const trashPath = `trash/${trashRecord.id}/${fileName}`

    // Download original file
    const { data: fileData, error: downloadError } = await supabase.storage.from('documents').download(path)
    if (downloadError) {
      await supabase.from('trash').delete().eq('id', trashRecord.id)
      return NextResponse.json({ error: downloadError.message }, { status: 500 })
    }

    // Upload to trash location
    const buffer = Buffer.from(await fileData.arrayBuffer())
    const { error: uploadError } = await supabase.storage.from('documents').upload(trashPath, buffer, {
      contentType: fileData.type || 'application/octet-stream',
      upsert: false
    })

    if (uploadError) {
      await supabase.from('trash').delete().eq('id', trashRecord.id)
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    // Delete from original location
    await supabase.storage.from('documents').remove([path])

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
