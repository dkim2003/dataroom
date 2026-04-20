import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const ADMIN_EMAIL = 'contact@kimduhyun.com'
// Single fixed storage path. Uploading a new pitch deck overwrites this file,
// so there is always at most one pitch deck. Using a dedicated top-level
// prefix (pitch_deck/) keeps it out of the document library listing.
const PITCH_DECK_PATH = 'pitch_deck/current.pdf'
const MAX_SIZE = 100 * 1024 * 1024 // 100 MB

async function getUserAndProfile(request) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return null
  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return null
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_admin, status')
    .eq('id', user.id)
    .single()
  return { user, profile }
}

// GET /api/pitch-deck — returns { signedUrl } for the current pitch deck,
// or { error: 'no_file' } if none is uploaded.
export async function GET(request) {
  try {
    const auth = await getUserAndProfile(request)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { profile } = auth
    if (profile?.status && profile.status !== 'approved') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check that the file exists before generating a signed URL.
    const { data: listData } = await supabase.storage
      .from('documents')
      .list('pitch_deck', { limit: 10 })
    const exists = listData?.some(item => item.name === 'current.pdf')
    if (!exists) return NextResponse.json({ error: 'no_file' }, { status: 404 })

    const { data, error } = await supabase.storage
      .from('documents')
      .createSignedUrl(PITCH_DECK_PATH, 60)

    if (error || !data?.signedUrl) {
      return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
    return NextResponse.json({ signedUrl: data.signedUrl })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// POST /api/pitch-deck — admin/employee only. multipart/form-data with a single `file` field.
// Overwrites the existing pitch deck.
export async function POST(request) {
  try {
    const auth = await getUserAndProfile(request)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { user, profile } = auth
    const isAdmin = user.email === ADMIN_EMAIL || profile?.is_admin === true
    const isEmployee = profile?.role === 'pre_nda_employee' || profile?.role === 'post_nda_employee'
    if (!isAdmin && !isEmployee) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (profile?.status && profile.status !== 'approved') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file')
    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'Missing file' }, { status: 400 })
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File too large' }, { status: 413 })
    }
    const isPdf = file.type === 'application/pdf' || file.name?.toLowerCase().endsWith('.pdf')
    if (!isPdf) {
      return NextResponse.json({ error: 'Pitch deck must be a PDF' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // upsert: true — replace any existing pitch deck with the new upload.
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(PITCH_DECK_PATH, buffer, {
        contentType: 'application/pdf',
        upsert: true
      })

    if (uploadError) {
      return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// DELETE /api/pitch-deck — admin/employee only. Removes the current pitch deck.
export async function DELETE(request) {
  try {
    const auth = await getUserAndProfile(request)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { user, profile } = auth
    const isAdmin = user.email === ADMIN_EMAIL || profile?.is_admin === true
    const isEmployee = profile?.role === 'pre_nda_employee' || profile?.role === 'post_nda_employee'
    if (!isAdmin && !isEmployee) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    await supabase.storage.from('documents').remove([PITCH_DECK_PATH])
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
