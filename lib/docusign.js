import crypto from 'crypto'

const DS_AUTH    = 'https://account-d.docusign.com'
const DS_SANDBOX = DS_AUTH.includes('account-d')

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
  const privateKey = crypto.createPrivateKey(rawPem)

  const sig = signer.sign(privateKey, 'base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')

  return `${signingInput}.${sig}`
}

export async function getAccessToken() {
  const res = await fetch(`${DS_AUTH}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion:  makeJwt()
    })
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error_description || data.error || 'DocuSign auth failed')
  if (!data.access_token) throw new Error('DocuSign returned no access_token')
  return data.access_token.trim()
}

export async function getAccountInfo(accessToken) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`${DS_AUTH}/oauth/userinfo`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      if (res.ok) {
        const data = await res.json()
        const account = data.accounts?.find(a => a.is_default) || data.accounts?.[0]
        if (account?.base_uri && account?.account_id) {
          return { accountId: account.account_id, baseUri: account.base_uri }
        }
      }
    } catch {}
    if (attempt < 2) await new Promise(r => setTimeout(r, 600))
  }
  const fallbackBase = process.env.DOCUSIGN_BASE_URI || (DS_SANDBOX ? 'https://demo.docusign.net' : 'https://ca.docusign.net')
  return {
    accountId: process.env.DOCUSIGN_ACCOUNT_ID,
    baseUri: fallbackBase
  }
}

// Fetches envelope status + recipient list so we can verify:
//   1. envelope.status === 'completed'
//   2. the signer with clientUserId === <our user.id> actually signed it
export async function getEnvelopeStatus(envelopeId) {
  // Validate envelopeId is a UUID to prevent path injection against the DocuSign API
  if (typeof envelopeId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(envelopeId)) {
    throw new Error('Invalid envelope ID')
  }

  const accessToken = await getAccessToken()
  const { accountId, baseUri } = await getAccountInfo(accessToken)
  const baseUrl = `${baseUri}/restapi/v2.1`

  const envRes = await fetch(
    `${baseUrl}/accounts/${accountId}/envelopes/${envelopeId}?include=recipients`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  const envelope = await envRes.json()
  if (!envRes.ok) throw new Error(envelope.message || 'Failed to fetch envelope')
  return envelope
}
