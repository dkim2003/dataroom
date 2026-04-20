import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const ADMIN_EMAIL = 'contact@kimduhyun.com'

async function verifyAdmin(request) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return null
  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return null
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  const isAdmin = user.email === ADMIN_EMAIL || profile?.is_admin === true
  return isAdmin ? user : null
}

export async function GET(request) {
  try {
    const user = await verifyAdmin(request)
    if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: 'Server error' }, { status: 500 })
    return NextResponse.json({ profiles: data })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// Whitelist of columns admins can modify via this endpoint. Prevents an admin
// (or an attacker who has compromised an admin session) from writing to
// sensitive columns like docusign_envelope_id, id, created_at, etc.
const ALLOWED_PROFILE_FIELDS = new Set([
  'status',
  'role',
  'is_admin',
  'full_name',
  'email_verified',
  'has_seen_tutorial',
])

const ALLOWED_ROLES = new Set([
  'pre_nda_investor',
  'post_nda_investor',
  'pre_nda_employee',
  'post_nda_employee',
])

const ALLOWED_STATUSES = new Set(['pending', 'approved', 'rejected'])

export async function PATCH(request) {
  try {
    const user = await verifyAdmin(request)
    if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { userId, updates } = await request.json()
    if (!userId || !updates || typeof updates !== 'object') {
      return NextResponse.json({ error: 'userId and updates required' }, { status: 400 })
    }

    // Filter to only whitelisted fields
    const safeUpdates = {}
    for (const [key, value] of Object.entries(updates)) {
      if (!ALLOWED_PROFILE_FIELDS.has(key)) continue
      if (key === 'role' && !ALLOWED_ROLES.has(value)) {
        return NextResponse.json({ error: `Invalid role: ${value}` }, { status: 400 })
      }
      if (key === 'status' && !ALLOWED_STATUSES.has(value)) {
        return NextResponse.json({ error: `Invalid status: ${value}` }, { status: 400 })
      }
      if (key === 'is_admin' && typeof value !== 'boolean') {
        return NextResponse.json({ error: 'is_admin must be boolean' }, { status: 400 })
      }
      safeUpdates[key] = value
    }

    if (Object.keys(safeUpdates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const { error } = await supabase.from('profiles').update(safeUpdates).eq('id', userId)
    if (error) return NextResponse.json({ error: 'Server error' }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    const user = await verifyAdmin(request)
    if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { userId } = await request.json()
    const { error } = await supabase.auth.admin.deleteUser(userId)
    if (error) return NextResponse.json({ error: 'Server error' }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
