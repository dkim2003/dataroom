import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const ADMIN_EMAIL = 'contact@kimduhyun.com'

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

    const isAdmin = user.email === ADMIN_EMAIL
    if (!isAdmin) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      const isEmployee = profile?.role === 'pre_nda_employee' || profile?.role === 'post_nda_employee'
      if (!isEmployee) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { oldPath, newPath } = await request.json()
    if (!oldPath || !newPath) return NextResponse.json({ error: 'Missing oldPath or newPath' }, { status: 400 })
    if (oldPath === newPath) return NextResponse.json({ success: true })

    // Step 1 — download from old path
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('documents')
      .download(oldPath)

    if (downloadError || !fileData) {
      return NextResponse.json({ error: 'Failed to download: ' + (downloadError?.message || 'file not found') }, { status: 500 })
    }

    // Step 2 — re-upload to new path
    const arrayBuffer = await fileData.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(newPath, buffer, {
        contentType: fileData.type || 'application/octet-stream',
        upsert: true
      })

    if (uploadError) {
      return NextResponse.json({ error: 'Failed to upload to new path: ' + uploadError.message }, { status: 500 })
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

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
