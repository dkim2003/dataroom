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

    const [{ data, error }, { data: internalFolderData }] = await Promise.all([
      supabase.from('document_links').select('*').order('created_at', { ascending: true }),
      supabase.storage.from('documents').list('internal', { limit: 500 })
    ])

    if (error) return NextResponse.json({ error: 'Server error' }, { status: 500 })

    // Build set of top-level internal folder names from storage
    const internalFolderNames = new Set((internalFolderData || []).map(f => f.name))

    const filtered = data.filter(link => {
      // Private-tab links (root or in a private subfolder): only visible to creator or admin
      if (link.folder === '__private__' || link.folder?.startsWith('__private__/')) return link.created_by === user.id || isAdmin
      // A link is internal if flagged OR if its top-level folder name exists under internal/ in storage
      const isLinkInternal = link.internal || internalFolderNames.has(link.folder.split('/')[0])
      if (isLinkInternal && !isEmployee && !isAdmin) return false
      if (link.restricted && !isPostNda  && !isAdmin) return false
      return true
    })

    return NextResponse.json({ links: filtered })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// Only http(s) URLs are stored. javascript:, data:, vbscript:, file:, etc
// are blocked to prevent stored-XSS via the "Open" button on links.
function normalizeLinkUrl(raw) {
  if (typeof raw !== 'string') return null
  let url = raw.trim()
  if (!url) return null
  if (!/^[a-z][a-z0-9+.-]*:/i.test(url)) url = 'https://' + url
  try {
    const parsed = new URL(url)
    const proto = parsed.protocol.toLowerCase()
    if (proto !== 'http:' && proto !== 'https:') return null
    return parsed.href
  } catch {
    return null
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

    const safeUrl = normalizeLinkUrl(url)
    if (!safeUrl) return NextResponse.json({ error: 'Only http(s) URLs are allowed' }, { status: 400 })

    const { data, error } = await supabase
      .from('document_links')
      .insert({ name: name.trim(), url: safeUrl, folder, restricted: !!restricted, internal: !!internal, created_by: user.id })
      .select()
      .single()

    if (error) return NextResponse.json({ error: 'Server error' }, { status: 500 })
    return NextResponse.json({ link: data })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// PATCH /api/links — rename or move a link (creator or admin only)
// Accepts { id, name?, folder? }. When `folder` is provided, the link's
// restricted/internal flags are re-derived server-side from where the new
// folder lives in storage — client cannot self-classify a link.
export async function PATCH(request) {
  try {
    const auth = await verifyUser(request)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { user, profile } = auth
    const isEmployee = profile?.role === 'pre_nda_employee' || profile?.role === 'post_nda_employee'
    const isAdmin    = user.email === ADMIN_EMAIL || profile?.is_admin === true
    if (!isEmployee && !isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const { id, name, folder } = await request.json()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    if (name === undefined && folder === undefined)
      return NextResponse.json({ error: 'nothing to update' }, { status: 400 })

    const { data: existing } = await supabase.from('document_links').select('created_by, folder').eq('id', id).single()
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    // Permission model:
    //  - Rename (any change to `name`): creator or admin only.
    //  - Move (`folder` change, no `name` change) on a non-private link:
    //    allowed for any employee/admin, matching how file moves work
    //    (any employee can re-shelve any file regardless of who uploaded).
    //  - Move on a private link: creator or admin only — private links are
    //    user-scoped, so a non-owner moving one would relocate someone
    //    else's note out of their private workspace.
    const isOwner = existing.created_by === user.id
    const isMoveOnly = name === undefined && folder !== undefined
    const isPrivateLink = existing.folder === '__private__' || existing.folder?.startsWith('__private__/')
    const isTargetPrivate = folder !== undefined && (folder === '__private__' || folder?.startsWith('__private__/'))
    // Require owner or admin for: any rename, any move of a private link, or any
    // move that targets private (to prevent other employees claiming a link as their own private item).
    if (!isMoveOnly || isPrivateLink || isTargetPrivate) {
      if (!isOwner && !isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const updates = {}
    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) return NextResponse.json({ error: 'invalid name' }, { status: 400 })
      updates.name = name.trim()
    }
    if (folder !== undefined) {
      if (typeof folder !== 'string' || !folder.trim()) return NextResponse.json({ error: 'invalid folder' }, { status: 400 })
      const trimmedFolder = folder.trim()
      if (trimmedFolder === '__private__' || trimmedFolder.startsWith('__private__/')) {
        // Moving to private root or private subfolder: no storage lookup needed,
        // these links are only visible to the creator and admin.
        updates.folder = trimmedFolder
        updates.internal = false
        updates.restricted = false
      } else {
        // Moving to a non-private folder: re-derive restricted/internal from storage
        // so the client can't silently downgrade a link's visibility by moving it.
        const topFolder = trimmedFolder.split('/')[0]
        const [{ data: internalRoot }, { data: restrictedRoot }] = await Promise.all([
          supabase.storage.from('documents').list('internal', { limit: 500 }),
          supabase.storage.from('documents').list('restricted', { limit: 500 })
        ])
        const internalNames = new Set((internalRoot || []).map(f => f.name))
        const restrictedNames = new Set((restrictedRoot || []).map(f => f.name))
        updates.folder = trimmedFolder
        updates.internal = internalNames.has(topFolder)
        updates.restricted = restrictedNames.has(topFolder)
      }
    }

    const { data, error } = await supabase.from('document_links').update(updates).eq('id', id).select().single()
    if (error) return NextResponse.json({ error: 'Server error' }, { status: 500 })
    return NextResponse.json({ link: data })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// DELETE /api/links — delete a link by id (creator or admin only)
export async function DELETE(request) {
  try {
    const auth = await verifyUser(request)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { user, profile } = auth
    const isEmployee = profile?.role === 'pre_nda_employee' || profile?.role === 'post_nda_employee'
    const isAdmin    = user.email === ADMIN_EMAIL || profile?.is_admin === true
    if (!isEmployee && !isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await request.json()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const { data: existing } = await supabase.from('document_links').select('created_by').eq('id', id).single()
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (existing.created_by !== user.id && !isAdmin)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { error } = await supabase.from('document_links').delete().eq('id', id)
    if (error) return NextResponse.json({ error: 'Server error' }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
