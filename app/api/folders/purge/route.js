import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { isSafeSegment } from '@/lib/pathSafety'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const ADMIN_EMAIL = 'contact@kimduhyun.com'
const ALLOWED_PREFIXES = ['general', 'restricted', 'internal']
const MAX_DEPTH = 8
// Sentinel files used to keep an otherwise-empty Storage folder alive.
// `.keep` is created by the app; `.emptyFolderPlaceholder` is created by
// Supabase's dashboard UI when you make a folder there.
const SENTINELS = new Set(['.keep', '.emptyFolderPlaceholder'])

// Recursively collect every storage path under `prefix` that is a sentinel
// placeholder file. Real user files are NOT collected here — callers are
// expected to move them to trash first via the normal trash flow.
async function collectSentinels(prefix, depth = 0) {
  if (depth > MAX_DEPTH) return []
  const { data, error } = await supabase.storage
    .from('documents')
    .list(prefix, { limit: 1000 })
  if (error || !data) return []

  const out = []
  for (const item of data) {
    if (item.id === null) {
      const sub = await collectSentinels(`${prefix}/${item.name}`, depth + 1)
      out.push(...sub)
    } else if (SENTINELS.has(item.name)) {
      out.push(`${prefix}/${item.name}`)
    }
  }
  return out
}

// POST /api/folders/purge
// Body: { folderName: string } — top-level folder name (no prefix, no slashes).
// Sweeps `.keep` and `.emptyFolderPlaceholder` placeholders recursively across
// every storage prefix (general/, restricted/, internal/) under that folder.
// Used after moveTopFolderToTrash/deleteTopLevelFolder so a top-level folder
// with only Supabase-dashboard-created placeholders can actually disappear.
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

    const { folderName } = await request.json()
    if (!isSafeSegment(folderName)) {
      return NextResponse.json({ error: 'Invalid folderName' }, { status: 400 })
    }

    const allPaths = []
    for (const prefix of ALLOWED_PREFIXES) {
      const paths = await collectSentinels(`${prefix}/${folderName}`)
      allPaths.push(...paths)
    }

    if (allPaths.length > 0) {
      await supabase.storage.from('documents').remove(allPaths)
    }

    await supabase.from('audit_log').insert({
      user_id: user.id,
      user_email: user.email,
      action: 'folder_deleted',
      document_name: folderName
    })

    return NextResponse.json({ success: true, removed: allPaths.length })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
