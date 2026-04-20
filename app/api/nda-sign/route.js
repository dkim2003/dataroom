import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { getAccessToken, getAccountInfo } from '@/lib/docusign'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// POST /api/nda-sign
// Returns { signingUrl } — the DocuSign embedded signing URL.
// Also persists the envelopeId on the user's profile so /api/nda-complete
// can independently verify completion with DocuSign before upgrading the role.
export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Only pre-NDA roles need to sign
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('id', user.id)
      .single()

    const isPreNda = profile?.role === 'pre_nda_investor' || profile?.role === 'pre_nda_employee'
    if (!isPreNda) return NextResponse.json({ error: 'NDA not required for this account' }, { status: 400 })

    const accessToken = await getAccessToken()
    const signerName  = profile?.full_name || user.email.split('@')[0]

    const { accountId, baseUri } = await getAccountInfo(accessToken)
    const baseUrl = `${baseUri}/restapi/v2.1`

    // Step 1 — create envelope from template
    const envRes = await fetch(`${baseUrl}/accounts/${accountId}/envelopes`, {
      method: 'POST',
      headers: {
        Authorization:  `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        templateId: process.env.DOCUSIGN_TEMPLATE_ID,
        templateRoles: [{
          email:        user.email,
          name:         signerName,
          roleName:     'Signer',   // Must match the role name in the DocuSign template
          clientUserId: user.id     // Required for embedded signing + used for later verification
        }],
        status: 'sent'
      })
    })
    const envelope = await envRes.json()
    if (!envRes.ok) throw new Error(envelope.message || JSON.stringify(envelope))

    // Persist envelopeId so nda-complete can verify status with DocuSign
    await supabase
      .from('profiles')
      .update({ docusign_envelope_id: envelope.envelopeId })
      .eq('id', user.id)

    // Step 2 — create recipient view (embedded signing URL)
    const origin     = new URL(request.url).origin
    const returnUrl  = `${origin}/nda`

    const viewRes = await fetch(
      `${baseUrl}/accounts/${accountId}/envelopes/${envelope.envelopeId}/views/recipient`,
      {
        method: 'POST',
        headers: {
          Authorization:  `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          authenticationMethod: 'none',
          email:        user.email,
          userName:     signerName,
          clientUserId: user.id,
          returnUrl
        })
      }
    )
    const view = await viewRes.json()
    if (!viewRes.ok) throw new Error(view.message || JSON.stringify(view))

    return NextResponse.json({ signingUrl: view.url })

  } catch (err) {
    console.error('nda-sign error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
