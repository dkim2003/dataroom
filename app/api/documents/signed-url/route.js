import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const ADMIN_EMAIL = 'contact@kimduhyun.com'

// POST /api/documents/signed-url
// Accepts: { path, fileName } in the request body
// Returns: { signedUrl } if the user is allowed to access the file
export async function POST(request) {
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

    // Step 3 — parse the request body
    const { path, fileName } = await request.json()

    // Step 4 — check if the file is restricted
    // Restricted files start with 'restricted/' in their path
    const isRestricted = path.startsWith('restricted/')

    if (isRestricted && !isPostNda && !isAdmin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Step 5 — generate the signed URL (expires in 60 seconds)
    const { data, error: urlError } = await supabase.storage
      .from('documents')
      .createSignedUrl(path, 60)

    if (urlError) {
      return NextResponse.json({ error: urlError.message }, { status: 500 })
    }

    // Step 6 — log the access to audit_log
    await supabase
      .from('audit_log')
      .insert({
        user_id: user.id,
        user_email: user.email,
        action: 'document_viewed',
        document_name: fileName
      })

    return NextResponse.json({ signedUrl: data.signedUrl })

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}