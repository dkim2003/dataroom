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

    // Guarantee a complete profile row regardless of whether the
    // on_auth_user_created DB trigger fired. upsert inserts the row when the
    // trigger is missing/broken, or updates it (sanitizing the role) when the
    // trigger already created it. Previously this was a plain .update(), which
    // silently matched zero rows if the trigger hadn't run — leaving the user
    // authenticated but profile-less: unable to log in and invisible to the
    // admin approval list. status stays 'pending' until an admin approves.
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: data.user.id,
        email: email.trim(),
        full_name: fullName.trim(),
        role,
        status: 'pending',
        email_verified: false,
      }, { onConflict: 'id' })

    if (profileError) {
      // The profile row could not be created, so don't report success. Roll
      // back the orphaned auth user so the email isn't left half-registered
      // (which would block a clean retry), then surface a real error.
      await supabase.auth.admin.deleteUser(data.user.id)
      return NextResponse.json({ error: 'Account creation failed' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
