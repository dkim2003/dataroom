import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const ADMIN_EMAIL = 'contact@kimduhyun.com'

export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    const isAdmin = user.email === ADMIN_EMAIL
    const isEmployee = profile?.role === 'pre_nda_employee' || profile?.role === 'post_nda_employee'
    if (!isAdmin && !isEmployee) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { trashId } = await request.json()

    const { data: trashRecord, error: fetchError } = await supabase
      .from('trash').select('*').eq('id', trashId).single()
    if (fetchError || !trashRecord) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const trashPath = `trash/${trashRecord.id}/${trashRecord.file_name}`

    // Download from trash
    const { data: fileData, error: downloadError } = await supabase.storage.from('documents').download(trashPath)
    if (downloadError) return NextResponse.json({ error: downloadError.message }, { status: 500 })

    // Restore to original path (add suffix if conflict)
    let restorePath = trashRecord.original_path
    const { data: existing } = await supabase.storage.from('documents').list(
      restorePath.split('/').slice(0, -1).join('/')
    )
    const fileExists = existing?.some(f => f.name === trashRecord.file_name)
    if (fileExists) {
      const ext = trashRecord.file_name.includes('.') ? '.' + trashRecord.file_name.split('.').pop() : ''
      const base = trashRecord.file_name.replace(ext, '')
      const parts = restorePath.split('/')
      parts[parts.length - 1] = `${base} (restored)${ext}`
      restorePath = parts.join('/')
    }

    const buffer = Buffer.from(await fileData.arrayBuffer())
    const { error: uploadError } = await supabase.storage.from('documents').upload(restorePath, buffer, {
      contentType: fileData.type || 'application/octet-stream',
      upsert: false
    })
    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

    // Remove from trash storage and DB
    await supabase.storage.from('documents').remove([trashPath])
    await supabase.from('trash').delete().eq('id', trashId)

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
