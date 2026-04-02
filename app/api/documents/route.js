import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const ADMIN_EMAIL = 'contact@kimduhyun.com'

// Returns { files, folderPaths } — folderPaths includes ALL subdirectories, even empty ones
async function listAll(prefix) {
  const { data, error } = await supabase.storage
    .from('documents')
    .list(prefix, { limit: 1000 })

  if (error || !data) return { files: [], folderPaths: [] }

  const files = []
  const folderPaths = []

  for (const item of data) {
    if (item.id === null) {
      const subPath = `${prefix}/${item.name}`
      folderPaths.push(subPath)
      const sub = await listAll(subPath)
      files.push(...sub.files)
      folderPaths.push(...sub.folderPaths)
    } else if (item.name !== '.emptyFolderPlaceholder' && item.name !== '.keep') {
      files.push({ name: item.name, path: `${prefix}/${item.name}`, mimeType: item.metadata?.mimetype || '' })
    }
  }
  return { files, folderPaths }
}

export async function GET(request) {
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
    const hasRestrictedAccess = isAdmin ||
      profile?.role === 'post_nda_investor' ||
      profile?.role === 'post_nda_employee'
    const isEmployee = profile?.role === 'pre_nda_employee' || profile?.role === 'post_nda_employee'
    const hasInternalAccess = isAdmin || isEmployee

    const general = await listAll('general')
    const restricted = await listAll('restricted')
    const internal = hasInternalAccess ? await listAll('internal') : { files: [], folderPaths: [] }

    const documents = []

    general.files.forEach(file => {
      documents.push({ name: file.name, path: file.path, mimeType: file.mimeType, restricted: false, internal: false })
    })

    restricted.files.forEach(file => {
      documents.push({ name: file.name, path: file.path, mimeType: file.mimeType, restricted: true, internal: false })
    })

    internal.files.forEach(file => {
      documents.push({ name: file.name, path: file.path, mimeType: file.mimeType, restricted: false, internal: true })
    })

    // All known folder paths (for sidebar, including empty folders)
    const allFolderPaths = [...general.folderPaths, ...restricted.folderPaths, ...internal.folderPaths]

    return NextResponse.json({ documents, folderPaths: allFolderPaths })

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
