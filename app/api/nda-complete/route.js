import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { getEnvelopeStatus } from '@/lib/docusign'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// POST /api/nda-complete
// Upgrades the caller from pre_nda_* to post_nda_* ONLY after DocuSign confirms
// the envelope was actually signed by this user.
//
// Security: we do NOT trust the browser's return-URL "event=signing_complete"
// query param — that is user-controlled. We re-fetch the envelope from DocuSign
// using the envelopeId we stored on the profile at /api/nda-sign time.
export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, docusign_envelope_id')
      .eq('id', user.id)
      .single()

    const roleUpgrades = {
      pre_nda_investor: 'post_nda_investor',
      pre_nda_employee: 'post_nda_employee'
    }

    const newRole = roleUpgrades[profile?.role]
    if (!newRole) {
      return NextResponse.json({ error: 'No upgrade needed for this role' }, { status: 400 })
    }

    const envelopeId = profile?.docusign_envelope_id
    if (!envelopeId) {
      return NextResponse.json({ error: 'No NDA envelope on file. Start the signing flow first.' }, { status: 400 })
    }

    // Verify the envelope with DocuSign — this is the authoritative source of truth.
    let envelope
    try {
      envelope = await getEnvelopeStatus(envelopeId)
    } catch (e) {
      return NextResponse.json({ error: 'Could not verify NDA status with DocuSign' }, { status: 502 })
    }

    if (envelope.status !== 'completed') {
      return NextResponse.json(
        { error: `NDA not complete (status: ${envelope.status})` },
        { status: 400 }
      )
    }

    // Confirm the signer on the envelope matches the calling user.
    // clientUserId was set to user.id when the envelope was created.
    const signers = envelope.recipients?.signers || []
    const mySigner = signers.find(s => s.clientUserId === user.id)
    if (!mySigner) {
      return NextResponse.json({ error: 'Envelope does not belong to this user' }, { status: 403 })
    }
    if (mySigner.status !== 'completed') {
      return NextResponse.json(
        { error: `Signer status is ${mySigner.status}, not completed` },
        { status: 400 }
      )
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', user.id)

    if (updateError) return NextResponse.json({ error: 'Server error' }, { status: 500 })

    return NextResponse.json({ success: true, newRole })

  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
