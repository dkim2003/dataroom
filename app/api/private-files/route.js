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
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  const isAdmin = user.email === ADMIN_EMAIL || profile?.is_admin === true
  return { user, isAdmin }
}

// GET /api/private-files?userId=xxx&subfolder=xxx
export async function GET(request) {
  try {
    const auth = await verifyUser(request)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const targetUserId = searchParams.get('userId') || auth.user.id
    const subfolder = searchParams.get('subfolder') || ''

    if (targetUserId !== auth.user.id && !auth.isAdmin)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const prefix = subfolder
      ? `private/${targetUserId}/${subfolder}`
      : `private/${targetUserId}`

    const { data, error } = await supabase.storage
      .from('documents')
      .list(prefix, { sortBy: { column: 'created_at', order: 'desc' } })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const items = data || []
    // Virtual folders have null metadata; files have metadata
    const subfolders = items
      .filter(f => f.name !== '.keep' && (f.metadata === null || f.id === null))
      .map(f => ({ name: f.name, createdAt: f.created_at || null }))
    const files = items
      .filter(f => f.name !== '.keep' && f.metadata !== null && f.id !== null)
      .map(f => ({
        name: f.name,
        path: `${prefix}/${f.name}`,
        size: f.metadata?.size,
        mimeType: f.metadata?.mimetype,
        createdAt: f.created_at
      }))

    return NextResponse.json({ files, subfolders })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST /api/private-files — create a subfolder (.keep placeholder)
export async function POST(request) {
  try {
    const auth = await verifyUser(request)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { folderName, userId } = await request.json()
    const targetUserId = userId || auth.user.id
    if (targetUserId !== auth.user.id && !auth.isAdmin)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    if (!folderName?.trim()) return NextResponse.json({ error: 'folderName required' }, { status: 400 })

    const keepPath = `private/${targetUserId}/${folderName.trim()}/.keep`
    const { error } = await supabase.storage
      .from('documents')
      .upload(keepPath, new Uint8Array(0), { contentType: 'text/plain', upsert: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, folderName: folderName.trim() })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// PATCH /api/private-files — rename a private file (owner only)
export async function PATCH(request) {
  try {
    const auth = await verifyUser(request)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { path, newName } = await request.json()
    if (!path || !newName?.trim()) return NextResponse.json({ error: 'path and newName required' }, { status: 400 })

    const pathUserId = path.split('/')[1]
    if (pathUserId !== auth.user.id && !auth.isAdmin)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Keep the same subfolder prefix, just change filename
    const parts = path.split('/')
    parts[parts.length - 1] = newName.trim()
    const newPath = parts.join('/')
    if (newPath === path) return NextResponse.json({ success: true, newPath })

    const { data: fileData, error: downloadError } = await supabase.storage.from('documents').download(path)
    if (downloadError || !fileData) return NextResponse.json({ error: 'Failed to download file' }, { status: 500 })

    const buffer = Buffer.from(await fileData.arrayBuffer())
    const { error: uploadError } = await supabase.storage.from('documents').upload(newPath, buffer, { contentType: fileData.type || 'application/octet-stream', upsert: true })
    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

    await supabase.storage.from('documents').remove([path])
    return NextResponse.json({ success: true, newPath })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// DELETE /api/private-files — delete a private file
export async function DELETE(request) {
  try {
    const auth = await verifyUser(request)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { path } = await request.json()
    const pathUserId = path.split('/')[1]

    if (pathUserId !== auth.user.id && !auth.isAdmin)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { error } = await supabase.storage.from('documents').remove([path])
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
