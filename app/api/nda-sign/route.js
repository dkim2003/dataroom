import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const DS_AUTH = 'https://account-d.docusign.com'

// Build a DocuSign JWT (RS256) and exchange it for an access token.
// Docs: https://developers.docusign.com/platform/auth/jwt/jwt-get-token/
function b64url(str) {
  return Buffer.from(str).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function makeJwt() {
  const header  = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const now     = Math.floor(Date.now() / 1000)
  const payload = b64url(JSON.stringify({
    iss:   process.env.DOCUSIGN_INTEGRATION_KEY,
    sub:   process.env.DOCUSIGN_USER_ID,
    aud:   'account-d.docusign.com',
    iat:   now,
    exp:   now + 3600,
    scope: 'signature impersonation'
  }))

  const signingInput = `${header}.${payload}`
  const signer = crypto.createSign('RSA-SHA256')
  signer.update(signingInput)
  signer.end()

  const rawPem = process.env.DOCUSIGN_PRIVATE_KEY.replace(/\\n/g, '\n').trim()
  console.log('DS key header:', rawPem.split('\n')[0])
  console.log('DS key length:', rawPem.length, 'lines:', rawPem.split('\n').length)

  // Let OpenSSL auto-detect the key format from the PEM header
  const privateKey = crypto.createPrivateKey(rawPem)

  const sig = signer.sign(privateKey, 'base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')

  return `${signingInput}.${sig}`
}

async function getAccessToken() {
  const res = await fetch(`${DS_AUTH}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion:  makeJwt()
    })
  })
  const data = await res.json()
  console.log('DS token response status:', res.status)
  if (data.error) console.log('DS token error:', data.error, data.error_description)
  if (!res.ok) throw new Error(data.error_description || data.error || 'DocuSign auth failed')
  if (!data.access_token) throw new Error('DocuSign returned no access_token: ' + JSON.stringify(data))
  return data.access_token.trim()
}

// Get the correct base_uri and account_id for this account from userinfo.
// Retries up to 3 times since the sandbox endpoint is intermittently flaky.
// Falls back to env vars if all attempts fail.
async function getAccountInfo(accessToken) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`${DS_AUTH}/oauth/userinfo`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      if (res.ok) {
        const data = await res.json()
        const account = data.accounts?.find(a => a.is_default) || data.accounts?.[0]
        if (account?.base_uri && account?.account_id) {
          console.log('DS userinfo account_id:', account.account_id, 'base_uri:', account.base_uri)
          return { accountId: account.account_id, baseUri: account.base_uri }
        }
      } else {
        console.log(`DS userinfo attempt ${attempt + 1} failed: ${res.status}`)
      }
    } catch (e) {
      console.log(`DS userinfo attempt ${attempt + 1} error:`, e.message)
    }
    if (attempt < 2) await new Promise(r => setTimeout(r, 600))
  }
  // Fall back to env vars
  console.log('DS userinfo failed after 3 attempts — falling back to env vars')
  return {
    accountId: process.env.DOCUSIGN_ACCOUNT_ID,
    baseUri: 'https://demo.docusign.net'
  }
}

// POST /api/nda-sign
// Returns { signingUrl } — the DocuSign embedded signing URL
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
    console.log('DS accountId:', accountId, 'baseUrl:', baseUrl)

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
          roleName:     'Signer',   // Must match the role name in your DocuSign template
          clientUserId: user.id     // Required for embedded signing
        }],
        status: 'sent'
      })
    })
    const envelope = await envRes.json()
    console.log('DS envelope response:', JSON.stringify(envelope))
    if (!envRes.ok) throw new Error(envelope.message || JSON.stringify(envelope))

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
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
