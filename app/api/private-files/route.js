import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { isSafeRelativePath, isSafeSegment } from '@/lib/pathSafety'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const ADMIN_EMAIL = 'contact@kimduhyun.com'
// Cap recursion depth on listAllFolders to prevent a pathological folder tree
// (user-created via many subfolders) from blowing the event loop or running up
// a Supabase bill.
const MAX_LIST_DEPTH = 8

async function listAllFolders(prefix, depth = 0) {
  if (depth > MAX_LIST_DEPTH) return []
  const { data, error } = await supabase.storage.from('documents').list(prefix, { limit: 1000 })
  if (error || !data) return []
  const paths = []
  for (const item of data) {
    if (item.id === null && item.name !== '.keep') {
      const subPath = `${prefix}/${item.name}`
      paths.push(subPath)
      const nested = await listAllFolders(subPath, depth + 1)
      paths.push(...nested)
    }
  }
  return paths
}

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

    // targetUserId comes from the query string — validate it's a safe segment
    // (no `..`, no `/`) before interpolating into a storage path. Callers
    // supplying their own id already pass this check, but admins can supply
    // any id via ?userId=.
    if (!isSafeSegment(targetUserId)) {
      return NextResponse.json({ error: 'Invalid userId' }, { status: 400 })
    }
    if (subfolder && !isSafeRelativePath(subfolder)) {
      return NextResponse.json({ error: 'Invalid subfolder' }, { status: 400 })
    }

    const recursive = searchParams.get('recursive') === 'true'
    if (recursive) {
      const allPaths = await listAllFolders(`private/${targetUserId}`)
      const prefix = `private/${targetUserId}/`
      const folderPaths = allPaths.map(p => p.startsWith(prefix) ? p.slice(prefix.length) : p)
      return NextResponse.json({ folderPaths })
    }

    const prefix = subfolder
      ? `private/${targetUserId}/${subfolder}`
      : `private/${targetUserId}`

    const { data, error } = await supabase.storage
      .from('documents')
      .list(prefix, { sortBy: { column: 'created_at', order: 'desc' } })

    if (error) return NextResponse.json({ error: 'Server error' }, { status: 500 })

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
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
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
    if (!isSafeSegment(targetUserId)) {
      return NextResponse.json({ error: 'Invalid userId' }, { status: 400 })
    }

    if (typeof folderName !== 'string' || !folderName.trim()) {
      return NextResponse.json({ error: 'folderName required' }, { status: 400 })
    }
    const name = folderName.trim()
    // folderName can be a multi-segment relative path (e.g. "Deals/Q1") but
    // every segment must be safe — no `..`, no leading slash, no null bytes.
    if (!isSafeRelativePath(name)) {
      return NextResponse.json({ error: 'Invalid folderName' }, { status: 400 })
    }

    const keepPath = `private/${targetUserId}/${name}/.keep`
    const { error } = await supabase.storage
      .from('documents')
      .upload(keepPath, new Uint8Array(0), { contentType: 'text/plain', upsert: true })

    if (error) return NextResponse.json({ error: 'Server error' }, { status: 500 })
    return NextResponse.json({ success: true, folderName: name })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// PATCH /api/private-files — rename a private file (owner only).
//
// Previously accepted an arbitrary `newPath` and piped it straight into
// storage.upload(). A caller could rename their own private file to a
// `general/...` path (promoting it to a publicly readable location) or use
// `..` to escape the private/{userId}/ prefix. Now: `newPath` is validated
// against the caller's private prefix.
export async function PATCH(request) {
  try {
    const auth = await verifyUser(request)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { path, newName, newPath: explicitNewPath } = await request.json()
    if (typeof path !== 'string' || (!newName?.trim?.() && !explicitNewPath)) {
      return NextResponse.json({ error: 'path and newName or newPath required' }, { status: 400 })
    }

    // Source must be the caller's own private file (or admin override).
    if (!path.startsWith('private/')) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
    }
    if (!isSafeRelativePath(path)) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
    }
    const pathSegs = path.split('/')
    const pathUserId = pathSegs[1]
    if (pathUserId !== auth.user.id && !auth.isAdmin)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Derive or validate the destination. Either way, the result MUST stay
    // inside private/{pathUserId}/ — we never let the caller redirect the file
    // into general/, restricted/, internal/, trash/, or someone else's private/.
    let newPath
    if (explicitNewPath) {
      if (typeof explicitNewPath !== 'string' || !isSafeRelativePath(explicitNewPath)) {
        return NextResponse.json({ error: 'Invalid newPath' }, { status: 400 })
      }
      newPath = explicitNewPath
    } else {
      if (!isSafeSegment(newName.trim())) {
        return NextResponse.json({ error: 'Invalid newName' }, { status: 400 })
      }
      const parts = [...pathSegs]
      parts[parts.length - 1] = newName.trim()
      newPath = parts.join('/')
    }

    const requiredPrefix = `private/${pathUserId}/`
    if (!newPath.startsWith(requiredPrefix)) {
      return NextResponse.json({ error: 'newPath must stay under the same private/ prefix' }, { status: 400 })
    }
    if (newPath === path) return NextResponse.json({ success: true, newPath })

    const { data: fileData, error: downloadError } = await supabase.storage.from('documents').download(path)
    if (downloadError || !fileData) return NextResponse.json({ error: 'Failed to download file' }, { status: 500 })

    const buffer = Buffer.from(await fileData.arrayBuffer())
    // upsert:false so a rename can't silently overwrite another private file.
    const { error: uploadError } = await supabase.storage.from('documents').upload(newPath, buffer, {
      contentType: fileData.type || 'application/octet-stream',
      upsert: false
    })
    if (uploadError) return NextResponse.json({ error: 'Destination already exists or upload failed' }, { status: 409 })

    await supabase.storage.from('documents').remove([path])
    return NextResponse.json({ success: true, newPath })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// DELETE /api/private-files — delete a private file
export async function DELETE(request) {
  try {
    const auth = await verifyUser(request)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { path } = await request.json()
    if (typeof path !== 'string' || !isSafeRelativePath(path) || !path.startsWith('private/')) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
    }
    const pathUserId = path.split('/')[1]

    if (pathUserId !== auth.user.id && !auth.isAdmin)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { error } = await supabase.storage.from('documents').remove([path])
    if (error) return NextResponse.json({ error: 'Server error' }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
