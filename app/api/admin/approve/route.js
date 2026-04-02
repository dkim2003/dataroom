import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
const resend = new Resend(process.env.RESEND_API_KEY)
const ADMIN_EMAIL = 'contact@kimduhyun.com'

export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { data: callerProfile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
    const isAdmin = user.email === ADMIN_EMAIL || callerProfile?.is_admin === true
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { userId, email, fullName } = await request.json()

    // Update profile status to approved
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ status: 'approved' })
      .eq('id', userId)
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

    // Generate a magic link — this confirms their email AND logs them in when clicked
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: { redirectTo: `${appUrl}/dashboard` }
    })
    if (linkError) {
      console.error('Magic link generation failed:', linkError)
      return NextResponse.json({ error: linkError.message }, { status: 500 })
    }

    const actionLink = linkData.properties.action_link

    // Send approval email via Resend
    const { error: emailError } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'SpaceLaunch VDR <onboarding@resend.dev>',
      to: email,
      subject: 'Your access to the SpaceLaunch VDR has been approved',
      html: `
        <!DOCTYPE html>
        <html>
        <body style="margin:0;padding:0;background:#f4f4f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:48px 24px;">
            <tr>
              <td align="center">
                <table width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:#ffffff;border-radius:12px;padding:40px;">
                  <tr>
                    <td style="padding-bottom:28px;">
                      <p style="margin:0;font-size:11px;letter-spacing:0.12em;color:#999999;text-transform:uppercase;">Space Launch Technologies</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-bottom:16px;">
                      <h1 style="margin:0;font-size:24px;font-weight:300;color:#111111;line-height:1.3;">Access Approved</h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-bottom:32px;">
                      <p style="margin:0;font-size:15px;color:#444444;line-height:1.7;">
                        Hi${fullName ? ` ${fullName}` : ''},<br><br>
                        Your request to access the Space Launch Technologies Virtual Data Room has been approved. Click the button below to confirm your email and get started.
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-bottom:40px;">
                      <a href="${actionLink}" style="display:inline-block;padding:13px 32px;background:#111111;color:#ffffff;text-decoration:none;border-radius:8px;font-size:15px;font-weight:600;letter-spacing:0.01em;">
                        Access Data Room
                      </a>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <p style="margin:0;font-size:12px;color:#999999;line-height:1.6;">
                        This link expires in 24 hours and can only be used once.<br>
                        If you did not request access, you can safely ignore this email.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `
    })

    if (emailError) {
      // Approval is saved — just log the email failure, don't roll back
      console.error('Approval email failed to send:', emailError)
      return NextResponse.json({ success: true, emailSent: false, emailError: emailError.message })
    }

    return NextResponse.json({ success: true, emailSent: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
