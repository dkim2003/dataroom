import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { isSafeStoragePath, topLevelPrefix } from '@/lib/pathSafety'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const ADMIN_EMAIL = 'contact@kimduhyun.com'
// Moves are only allowed inside the general/restricted/internal prefixes.
// private/ has its own rename endpoint (private-files PATCH) and trash/ is
// managed by the trash endpoints. Cross-prefix moves are explicitly rejected
// so an employee cannot move an internal doc into general/ (or vice-versa).
const MOVE_ALLOWED_PREFIXES = ['general', 'restricted', 'internal']

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

    const { oldPath, newPath } = await request.json()
    if (typeof oldPath !== 'string' || typeof newPath !== 'string') {
      return NextResponse.json({ error: 'Missing oldPath or newPath' }, { status: 400 })
    }
    if (oldPath === newPath) return NextResponse.json({ success: true })

    // Validate both paths are safe AND live under an allowed top-level prefix.
    if (!isSafeStoragePath(oldPath, MOVE_ALLOWED_PREFIXES) || !isSafeStoragePath(newPath, MOVE_ALLOWED_PREFIXES)) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
    }
    // Prevent cross-prefix moves — an employee must not be able to re-shelf
    // a restricted/internal file as general/, which would grant pre-NDA
    // investors read access to it.
    if (topLevelPrefix(oldPath) !== topLevelPrefix(newPath)) {
      return NextResponse.json({ error: 'Cannot move between top-level prefixes' }, { status: 400 })
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

    return NextResponse.json({ success: true, newPath })

  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
