import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// POST /api/signup
// Server-side signup that prevents users from self-assigning a role.
// Body: { email, password, fullName, userType }   userType ∈ { 'investor', 'employee' }
//
// Security: the user_metadata role is written by the server, not the client.
// A malicious client cannot forge `role: 'post_nda_employee'` or `admin` here.
// Any DB trigger that copies raw_user_meta_data.role into profiles will only
// ever see one of the two pre-NDA values below.
export async function POST(request) {
  try {
    const { email, password, fullName, userType } = await request.json()

    if (!email?.trim() || !password?.trim() || !fullName?.trim()) {
      return NextResponse.json({ error: 'email, password, and full name are required' }, { status: 400 })
    }
    if (typeof password !== 'string' || password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }
    if (userType !== 'investor' && userType !== 'employee') {
      return NextResponse.json({ error: 'Invalid user type' }, { status: 400 })
    }

    const role = userType === 'investor' ? 'pre_nda_investor' : 'pre_nda_employee'

    const { data, error } = await supabase.auth.admin.createUser({
      email: email.trim(),
      password,
      email_confirm: false,
      user_metadata: { full_name: fullName.trim(), role }
    })

    if (error) {
      return NextResponse.json({ error: 'Account creation failed' }, { status: 400 })
    }

    // Defense-in-depth: if the DB trigger happens to copy a different role
    // (or no role at all), overwrite the profile here with the sanitized value.
    // status stays 'pending' until an admin approves.
    await supabase
      .from('profiles')
      .update({ role, full_name: fullName.trim() })
      .eq('id', data.user.id)

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
