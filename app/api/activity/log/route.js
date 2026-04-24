import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const ADMIN_EMAIL = 'contact@kimduhyun.com'
// Whitelist of action types the client may emit. Other actions (file_uploaded,
// document_viewed, etc.) are emitted server-side from their owning routes and
// must not be forgeable by the client.
const ALLOWED_ACTIONS = new Set(['folder_deleted', 'folder_renamed'])
const MAX_DETAIL_LENGTH = 500

// POST /api/activity/log
// Body: { action: string, document_name: string }
// Used by the dashboard to emit summary events for multi-step bulk operations
// (subfolder delete, bulk folder rename) where logging from individual routes
// would flood the audit log with N near-duplicate entries.
export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('role, is_admin').eq('id', user.id).single()
    const isAdmin = user.email === ADMIN_EMAIL || profile?.is_admin === true
    const isEmployee = profile?.role === 'pre_nda_employee' || profile?.role === 'post_nda_employee'
    if (!isAdmin && !isEmployee) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { action, document_name } = await request.json()
    if (!ALLOWED_ACTIONS.has(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
    if (typeof document_name !== 'string' || !document_name || document_name.length > MAX_DETAIL_LENGTH) {
      return NextResponse.json({ error: 'Invalid document_name' }, { status: 400 })
    }

    await supabase.from('audit_log').insert({
      user_id: user.id,
      user_email: user.email,
      action,
      document_name
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
