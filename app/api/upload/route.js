import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// This route runs server-side only — the service role key is never exposed to the browser.
// We use the SERVICE ROLE key here (not the anon key) because we need to bypass RLS
// for admin uploads. This key must NEVER be used in any client-side file.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const ADMIN_EMAIL = 'contact@kimduhyun.com'

// POST /api/upload
// Accepts a multipart form with: file, folder, isRestricted
export async function POST(request) {
  try {
    // Step 1 — verify the user is logged in and is admin
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase.from('profiles').select('role, is_admin').eq('id', user.id).single()
    const isAdmin = user.email === ADMIN_EMAIL || profile?.is_admin === true
    if (!isAdmin) {
      const isEmployee = profile?.role === 'pre_nda_employee' || profile?.role === 'post_nda_employee'
      if (!isEmployee) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Step 2 — parse the uploaded file from the form
    const formData = await request.formData()
    const file = formData.get('file')
    const folder = formData.get('folder') // e.g. "03_Product_Technology/04 Patents & IP"
    const isRestricted = formData.get('isRestricted') === 'true'
    const isInternal = formData.get('isInternal') === 'true'

    if (!file || !folder) {
      return NextResponse.json({ error: 'Missing file or folder' }, { status: 400 })
    }

    // Step 3 — build the storage path
    // isRestricted files go into restricted/ prefix so we can check access by path
    const prefix = isInternal ? 'internal' : (isRestricted ? 'restricted' : 'general')
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const path = `${prefix}/${folder}/${file.name}`

    // Step 4 — upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(path, buffer, {
        contentType: file.type,
        upsert: true // overwrite if file already exists
      })

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, path })

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}