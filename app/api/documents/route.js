import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const ADMIN_EMAIL = 'contact@kimduhyun.com'

async function listAllFiles(prefix) {
  const { data, error } = await supabase.storage
    .from('documents')
    .list(prefix, { limit: 1000 })

  if (error || !data) return []

  const files = []
  for (const item of data) {
    if (item.id === null) {
      const subFiles = await listAllFiles(`${prefix}/${item.name}`)
      files.push(...subFiles)
    } else if (item.name !== '.emptyFolderPlaceholder') {
      files.push({ name: item.name, path: `${prefix}/${item.name}` })
    }
  }
  return files
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
      .select('role')
      .eq('id', user.id)
      .single()

    const isAdmin = user.email === ADMIN_EMAIL
    const hasRestrictedAccess = isAdmin ||
      profile?.role === 'post_nda_investor' ||
      profile?.role === 'post_nda_employee'

    const generalFiles = await listAllFiles('general')
    const restrictedFiles = await listAllFiles('restricted')

    const documents = []

    generalFiles.forEach(file => {
      documents.push({ name: file.name, path: file.path, restricted: false })
    })

    if (hasRestrictedAccess) {
      restrictedFiles.forEach(file => {
        documents.push({ name: file.name, path: file.path, restricted: true })
      })
    } else {
      // Pre-NDA users see restricted files listed but cannot open them
      restrictedFiles.forEach(file => {
        documents.push({ name: file.name, path: file.path, restricted: true })
      })
    }

    return NextResponse.json({ documents })

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}