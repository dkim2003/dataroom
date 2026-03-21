import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const ADMIN_EMAIL = 'contact@kimduhyun.com'

// Recursively lists all files inside a folder in Supabase Storage
async function listAllFiles(prefix) {
  const { data, error } = await supabase.storage
    .from('documents')
    .list(prefix, { limit: 1000 })

  if (error || !data) return []

  const files = []

  for (const item of data) {
    if (item.id === null) {
      // item.id is null when it's a folder, not a file
      // So we go deeper into that folder recursively
      const subFiles = await listAllFiles(`${prefix}/${item.name}`)
      files.push(...subFiles)
    } else {
      // item.id exists — this is an actual file
      files.push({
        name: item.name,
        path: `${prefix}/${item.name}`
      })
    }
  }

  return files
}

export async function GET(request) {
  try {
    // Step 1 — verify the user is logged in
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Step 2 — get the user's role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isAdmin = user.email === ADMIN_EMAIL
    const isPostNda = profile?.role === 'post_nda'

    // Step 3 — recursively list all files in general/ and restricted/
    const generalFiles = await listAllFiles('general')
    const restrictedFiles = await listAllFiles('restricted')

    // Step 4 — build the response based on role
    const documents = []

    generalFiles.forEach(file => {
      documents.push({
        name: file.name,
        path: file.path,
        restricted: false
      })
    })

    // Only include restricted files for post-NDA and admin
    if (isPostNda || isAdmin) {
      restrictedFiles.forEach(file => {
        documents.push({
          name: file.name,
          path: file.path,
          restricted: true
        })
      })
    }

    return NextResponse.json({ documents })

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}