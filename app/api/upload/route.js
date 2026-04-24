import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { isSafeSegment, isSafeRelativePath } from '@/lib/pathSafety'

// This route runs server-side only — the service role key is never exposed to the browser.
// We use the SERVICE ROLE key here (not the anon key) because we need to bypass RLS
// for admin uploads. This key must NEVER be used in any client-side file.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const ADMIN_EMAIL = 'contact@kimduhyun.com'
// Upload ceiling — anything bigger almost certainly isn't a real VDR artifact
// and is more likely a mistake or an attempt to exhaust storage. Matches
// typical investor-doc sizes (pitch decks, CIMs, financials) with headroom.
const MAX_UPLOAD_BYTES = 100 * 1024 * 1024 // 100 MB

// POST /api/upload
// Accepts a multipart form with: file, folder, isRestricted, isInternal, isPrivate, privateSubfolder
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

    const { data: profile } = await supabase.from('profiles').select('role, is_admin, status').eq('id', user.id).single()
    const isAdmin = user.email === ADMIN_EMAIL || profile?.is_admin === true
    const isEmployee = profile?.role === 'pre_nda_employee' || profile?.role === 'post_nda_employee'
    // Pending/rejected accounts are not allowed to write anything to storage,
    // including their own private folder. An admin still needs to approve them first.
    const isBlockedStatus = profile?.status === 'pending' || profile?.status === 'rejected'
    if (!isAdmin && isBlockedStatus) {
      return NextResponse.json({ error: 'Account not approved' }, { status: 403 })
    }

    // Step 2 — parse the uploaded file from the form
    const formData = await request.formData()
    const file = formData.get('file')
    const folder = formData.get('folder') // e.g. "03_Product_Technology/04 Patents & IP"
    const isRestricted = formData.get('isRestricted') === 'true'
    const isInternal = formData.get('isInternal') === 'true'
    const isPrivate = formData.get('isPrivate') === 'true'
    const privateSubfolder = formData.get('privateSubfolder') || ''

    if (!file || typeof file.name !== 'string') {
      return NextResponse.json({ error: 'Missing file' }, { status: 400 })
    }

    // File name becomes the final path segment — must be safe (no `/`, `\`,
    // `..`, null bytes, control chars). Rejects browser-supplied quirks like
    // an empty name, "../../etc/passwd", or "evil\x00.pdf".
    const safeFileName = file.name.trim()
    if (!isSafeSegment(safeFileName)) {
      return NextResponse.json({ error: 'Invalid file name' }, { status: 400 })
    }

    // Enforce a server-side size limit. Relying on the browser "max file size"
    // attribute is not a defense — clients can send whatever they want.
    if (typeof file.size === 'number' && file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: 'File exceeds 100 MB limit' }, { status: 413 })
    }

    // Private upload — approved users may upload to their own private folder.
    if (isPrivate) {
      if (privateSubfolder && !isSafeRelativePath(String(privateSubfolder))) {
        return NextResponse.json({ error: 'Invalid privateSubfolder' }, { status: 400 })
      }
      const bytes = await file.arrayBuffer()
      if (bytes.byteLength > MAX_UPLOAD_BYTES) {
        return NextResponse.json({ error: 'File exceeds 100 MB limit' }, { status: 413 })
      }
      const buffer = Buffer.from(bytes)
      const path = privateSubfolder
        ? `private/${user.id}/${privateSubfolder}/${safeFileName}`
        : `private/${user.id}/${safeFileName}`
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(path, buffer, { contentType: file.type, upsert: true })
      if (uploadError) return NextResponse.json({ error: 'Server error' }, { status: 500 })
      await supabase.from('audit_log').insert({
        user_id: user.id,
        user_email: user.email,
        action: 'file_uploaded',
        document_name: path
      })
      return NextResponse.json({ success: true, path })
    }

    // Non-private uploads require employee or admin.
    if (!isAdmin && !isEmployee) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!folder || typeof folder !== 'string' || !isSafeRelativePath(folder)) {
      return NextResponse.json({ error: 'Missing or invalid folder' }, { status: 400 })
    }

    // Step 3 — build the storage path.
    // isRestricted files go into restricted/ prefix so we can check access by path.
    const prefix = isInternal ? 'internal' : (isRestricted ? 'restricted' : 'general')
    const bytes = await file.arrayBuffer()
    if (bytes.byteLength > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: 'File exceeds 100 MB limit' }, { status: 413 })
    }
    const buffer = Buffer.from(bytes)
    const path = `${prefix}/${folder}/${safeFileName}`

    // Step 4 — upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(path, buffer, {
        contentType: file.type,
        upsert: false
      })

    if (uploadError) {
      if (uploadError.message?.includes('already exists')) {
        return NextResponse.json({ error: 'A file with that name already exists in this folder' }, { status: 409 })
      }
      return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }

    await supabase.from('audit_log').insert({
      user_id: user.id,
      user_email: user.email,
      action: 'file_uploaded',
      document_name: path
    })

    return NextResponse.json({ success: true, path })

  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
