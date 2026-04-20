import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { isSafeRelativePath, isSafeStoragePath, topLevelPrefix } from '@/lib/pathSafety'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const ADMIN_EMAIL = 'contact@kimduhyun.com'
const ALLOWED_PREFIXES = ['general', 'restricted', 'internal']

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

    const { folderPath, isRestricted, isInternal } = await request.json()
    // folderPath is relative, e.g. "01_Pitch_and_Overview/My New Folder"
    // Must be a safe relative path — no `..`, no leading/trailing slash, no control chars.
    if (!isSafeRelativePath(folderPath)) {
      return NextResponse.json({ error: 'Invalid folderPath' }, { status: 400 })
    }
    const prefix = isInternal ? 'internal' : (isRestricted ? 'restricted' : 'general')
    const keepPath = `${prefix}/${folderPath}/.keep`

    const { error } = await supabase.storage
      .from('documents')
      .upload(keepPath, new Blob([''], { type: 'text/plain' }), { upsert: false })

    if (error && !error.message.includes('already exists')) {
      return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// DELETE /api/folders — removes the .keep placeholder for a folder.
//
// Previously accepted an arbitrary `keepPath` and called storage.remove on it,
// so any authenticated employee could delete ANY file in the bucket by passing
// e.g. `general/pitch_deck.pdf`. Now: path must be a safe relative path under
// one of the allowed prefixes AND must end in `/.keep`.
export async function DELETE(request) {
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

    const { keepPath } = await request.json()
    if (!isSafeStoragePath(keepPath, ALLOWED_PREFIXES)) {
      return NextResponse.json({ error: 'Invalid keepPath' }, { status: 400 })
    }
    // Only the sentinel .keep file may be removed via this endpoint.
    const segs = keepPath.split('/')
    if (segs[segs.length - 1] !== '.keep') {
      return NextResponse.json({ error: 'keepPath must end with /.keep' }, { status: 400 })
    }
    // Must be inside a folder (at least prefix/folder/.keep), never at the root.
    if (segs.length < 3) {
      return NextResponse.json({ error: 'Invalid keepPath depth' }, { status: 400 })
    }

    await supabase.storage.from('documents').remove([keepPath])
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
