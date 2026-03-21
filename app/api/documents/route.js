import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Server-side only — uses service role key to list all files in the bucket
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const ADMIN_EMAIL = 'contact@kimduhyun.com'

// GET /api/documents
// Returns list of documents the user is allowed to see based on their role
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

    // Step 2 — get the user's role from the profiles table
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isAdmin = user.email === ADMIN_EMAIL
    const isPostNda = profile?.role === 'post_nda'

    // Step 3 — list all files in the bucket
    // We list both general/ and restricted/ folders
    const { data: generalFiles, error: generalError } = await supabase.storage
      .from('documents')
      .list('general', { recursive: true })

    const { data: restrictedFiles, error: restrictedError } = await supabase.storage
      .from('documents')
      .list('restricted', { recursive: true })

    if (generalError) {
      return NextResponse.json({ error: generalError.message }, { status: 500 })
    }

    // Step 4 — build the response
    // Pre-NDA users only get general files
    // Post-NDA and admin get both general and restricted files
    const documents = []

    if (generalFiles) {
      generalFiles.forEach(file => {
        documents.push({
          name: file.name,
          path: `general/${file.name}`,
          restricted: false
        })
      })
    }

    if ((isPostNda || isAdmin) && restrictedFiles) {
      restrictedFiles.forEach(file => {
        documents.push({
          name: file.name,
          path: `restricted/${file.name}`,
          restricted: true
        })
      })
    }

    return NextResponse.json({ documents })

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
