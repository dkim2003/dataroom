import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { isSafeRelativePath, isSafeStoragePath, topLevelPrefix } from '@/lib/pathSafety'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const ADMIN_EMAIL = 'contact@kimduhyun.com'
// Moves are allowed inside general/restricted/internal and across private/.
// private/ is a special case outside the normal restriction hierarchy — moves
// between private and general/internal are allowed in both directions, except
// private → restricted which is blocked. trash/ is managed separately.
const MOVE_ALLOWED_PREFIXES = ['general', 'restricted', 'internal', 'private']
const RESTRICTION_LEVEL = { general: 0, restricted: 1, internal: 2 }

// POST /api/documents/move
// Body: { oldPath: string, newPath: string }
// Handles both move (different folder) and rename (same folder, different filename).
// Supabase Storage has no native move — we download, re-upload, then delete.
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
    if (!isAdmin && !isEmployee) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { oldPath, newPath, skipLog } = await request.json()
    if (typeof oldPath !== 'string' || typeof newPath !== 'string') {
      return NextResponse.json({ error: 'Missing oldPath or newPath' }, { status: 400 })
    }
    if (oldPath === newPath) return NextResponse.json({ success: true })

    // Validate both paths are safe and under an allowed top-level prefix.
    if (!isSafeRelativePath(oldPath) || !isSafeRelativePath(newPath)) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
    }
    const oldPrefix = topLevelPrefix(oldPath)
    const newPrefix = topLevelPrefix(newPath)
    if (!MOVE_ALLOWED_PREFIXES.includes(oldPrefix) || !MOVE_ALLOWED_PREFIXES.includes(newPrefix)) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
    }
    // Ownership checks for private paths: only the owning user (or admin) may
    // move files into or out of their own private/ prefix.
    if (oldPrefix === 'private') {
      const pathUserId = oldPath.split('/')[1]
      if (pathUserId !== user.id && !isAdmin)
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (newPrefix === 'private') {
      const pathUserId = newPath.split('/')[1]
      if (pathUserId !== user.id && !isAdmin)
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    // Cross-prefix rules:
    // • private → restricted is blocked (use general or internal instead).
    // • Within general/restricted/internal, demotion moves are blocked.
    // • All other moves involving private/ are allowed in either direction.
    if (oldPrefix === 'private' && newPrefix === 'restricted') {
      return NextResponse.json({ error: 'Cannot move a private file to restricted — use general or internal instead' }, { status: 400 })
    }
    if (oldPrefix !== 'private' && newPrefix !== 'private' && oldPrefix !== newPrefix) {
      if ((RESTRICTION_LEVEL[oldPrefix] ?? 0) > (RESTRICTION_LEVEL[newPrefix] ?? 0)) {
        return NextResponse.json({ error: 'Cannot move to a less restricted prefix' }, { status: 400 })
      }
    }

    // Step 1 — download from old path
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('documents')
      .download(oldPath)

    if (downloadError || !fileData) {
      return NextResponse.json({ error: 'Failed to download file' }, { status: 500 })
    }

    // Step 2 — re-upload to new path.
    // upsert:false — refuse to overwrite an existing file at the destination.
    // This prevents a rename from silently clobbering another document at the
    // target path (intentional or otherwise).
    const arrayBuffer = await fileData.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(newPath, buffer, {
        contentType: fileData.type || 'application/octet-stream',
        upsert: false
      })

    if (uploadError) {
      return NextResponse.json({ error: 'Destination already exists or upload failed' }, { status: 409 })
    }

    // Step 3 — delete old path
    const { error: deleteError } = await supabase.storage
      .from('documents')
      .remove([oldPath])

    if (deleteError) {
      // File was copied successfully — log the delete failure but don't surface it as an error
      console.error('Move: copied to new path but failed to delete old path:', deleteError.message)
    }

    if (!skipLog) {
      await supabase.from('audit_log').insert({
        user_id: user.id,
        user_email: user.email,
        action: 'file_renamed',
        document_name: `${oldPath} → ${newPath}`
      })
    }

    return NextResponse.json({ success: true, newPath })

  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
