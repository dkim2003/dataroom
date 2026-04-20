import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const ADMIN_EMAIL = 'contact@kimduhyun.com'

const SUBFOLDERS = [
  { path: '01_Pitch_and_Overview/Executive Summary', restricted: false },
  { path: '01_Pitch_and_Overview/Company Overview', restricted: false },
  { path: '02_Market_Opportunity/Market Research', restricted: false },
  { path: '02_Market_Opportunity/Competitive Analysis', restricted: false },
  { path: '02_Market_Opportunity/Customer Discovery', restricted: false },
  { path: '03_Product_Technology/Technical Overview', restricted: false },
  { path: '03_Product_Technology/Patent Portfolio', restricted: false },
  { path: '03_Product_Technology/Development Roadmap', restricted: false },
  { path: '04_Traction/Key Metrics', restricted: false },
  { path: '04_Traction/Milestones', restricted: false },
  { path: '04_Traction/Customer Testimonials', restricted: false },
  { path: '05_Financials/P&L Statements', restricted: false },
  { path: '05_Financials/Financial Projections', restricted: false },
  { path: '05_Financials/Cap Table', restricted: false },
  { path: '06_Legal/Incorporation', restricted: false },
  { path: '06_Legal/IP and Patents', restricted: false },
  { path: '06_Legal/Key Contracts', restricted: false },
  { path: '07_Team/Leadership Bios', restricted: false },
  { path: '07_Team/Org Chart', restricted: false },
  { path: '07_Team/Advisors', restricted: false },
  { path: '08_Fundraising/Current Round', restricted: false },
  { path: '08_Fundraising/Use of Funds', restricted: false },
  { path: '08_Fundraising/Previous Rounds', restricted: false },
  { path: '09_Investor_Updates/Monthly Updates', restricted: false },
  { path: '09_Investor_Updates/Annual Reports', restricted: false },
  { path: '10_Appendix/Technical Appendix', restricted: false },
  { path: '10_Appendix/Third-Party Reports', restricted: false },
]

export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
    const isAdmin = user.email === ADMIN_EMAIL || profile?.is_admin === true
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const results = []
    for (const { path, restricted } of SUBFOLDERS) {
      const prefix = restricted ? 'restricted' : 'general'
      const keepPath = `${prefix}/${path}/.keep`
      const { error } = await supabase.storage
        .from('documents')
        .upload(keepPath, new Blob([''], { type: 'text/plain' }), { upsert: false })
      results.push({ path: keepPath, ok: !error || error.message.includes('already exists') })
    }

    return NextResponse.json({ results })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
