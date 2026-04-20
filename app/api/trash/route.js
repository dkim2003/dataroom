import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { isSafeRelativePath, isSafeSegment } from '@/lib/pathSafety'

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

    if (error) return NextResponse.json({ error: 'Server error' }, { status: 500 })

    // Non-admin employees must not see other users' private items in trash —
    // it would leak the existence of those files.
    const visible = isAdmin
      ? data
      : data.filter(item => {
          const p = item.original_path || ''
          if (!p.startsWith('private/')) return true
          return p.split('/')[1] === user.id
        })

    return NextResponse.json({ items: visible })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
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
    const hasRestrictedAccess = isAdmin || profile?.role === 'post_nda_investor' || profile?.role === 'post_nda_employee'
    if (!isAdmin && !isEmployee) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { path, fileName } = await request.json()
    if (typeof path !== 'string' || !isSafeRelativePath(path)) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
    }
    if (typeof fileName !== 'string' || !isSafeSegment(fileName)) {
      return NextResponse.json({ error: 'Invalid fileName' }, { status: 400 })
    }

    // A private file can only be trashed by its owner or an admin.
    if (path.startsWith('private/')) {
      const pathUserId = path.split('/')[1]
      if (pathUserId !== user.id && !isAdmin)
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Pre-NDA employees cannot trash restricted files
    if (path.startsWith('restricted/') && !hasRestrictedAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Don't let arbitrary trash/ or non-storage paths get re-trashed.
    if (path.startsWith('trash/')) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
    }

    // Insert trash record to get an ID
    const { data: trashRecord, error: insertError } = await supabase
      .from('trash')
      .insert({ original_path: path, file_name: fileName, trashed_by: user.id, trashed_by_email: user.email })
      .select()
      .single()

    if (insertError) return NextResponse.json({ error: 'Server error' }, { status: 500 })

    const trashPath = `trash/${trashRecord.id}/${fileName}`

    // Download original file
    const { data: fileData, error: downloadError } = await supabase.storage.from('documents').download(path)
    if (downloadError) {
      await supabase.from('trash').delete().eq('id', trashRecord.id)
      return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }

    // Upload to trash location
    const buffer = Buffer.from(await fileData.arrayBuffer())
    const { error: uploadError } = await supabase.storage.from('documents').upload(trashPath, buffer, {
      contentType: fileData.type || 'application/octet-stream',
      upsert: false
    })

    if (uploadError) {
      await supabase.from('trash').delete().eq('id', trashRecord.id)
      return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }

    // Delete from original location
    await supabase.storage.from('documents').remove([path])

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
