import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const ADMIN_EMAIL = 'contact@kimduhyun.com'

const FOLDERS = [
  '00_START_HERE/Investor Guide',
  '01_Pitch_and_Overview/01 Pitch Deck',
  '01_Pitch_and_Overview/02 Executive Summary',
  '01_Pitch_and_Overview/03 Company Overview',
  '02_Market_Opportunity/01 Industrial Research',
  '02_Market_Opportunity/02 Competitor Analysis',
  '02_Market_Opportunity/03 Customer Segments',
  '03_Product_Technology/01 Product Overview',
  '03_Product_Technology/02 Engineering Architecture',
  '03_Product_Technology/03 R&D Roadmap',
  '03_Product_Technology/04 Patents & IP',
  '04_Traction/01 Revenue Growth',
  '04_Traction/02 Users & Customers',
  '04_Traction/03 Contracts',
  '04_Traction/04 Partnerships',
  '04_Traction/05 Testimonials',
  '05_Financials/01 3-5 Year Financial Model',
  '05_Financials/02 Revenue Projections',
  '05_Financials/03 Cost Structure',
  '05_Financials/04 Burn Rate',
  '05_Financials/Break-Even Analysis',
  '06_Legal/01 Articles of Incorporation',
  '06_Legal/02 Shareholder Agreements',
  '06_Legal/03 IP Assignments',
  '06_Legal/04 NDAs',
  '06_Legal/05 Employment Agreements',
  '07_Team/01 Founder Bios',
  '07_Team/02 Advisor List',
  '07_Team/03 Org Chart',
  '07_Team/04 Hiring Plan',
  '08_Fundraising/01 Cap Table',
  '08_Fundraising/02 Investment Structure',
  '08_Fundraising/03 Valuation',
  '08_Fundraising/04 Investor Rights',
  '08_Fundraising/05 Funding Timeline',
  '09_Investor_Updates/01 Monthly Updates',
  '09_Investor_Updates/02 Milestones',
  '09_Investor_Updates/03 Achievements',
  '10_Appendix/01 Research Papers',
  '10_Appendix/02 Technical Drawings',
  '10_Appendix/03 Legal References',
]

// POST /api/sort
// Accepts a multipart form with: file (PDF)
// Returns: { folder: string, isRestricted: boolean }
export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Allow admin or employees only
    const isAdmin = user.email === ADMIN_EMAIL
    if (!isAdmin) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      const isEmployee = profile?.role === 'pre_nda_employee' || profile?.role === 'post_nda_employee'
      if (!isEmployee) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file')
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const bytes = await file.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')

    const isPdf = base64.startsWith('JVBERi')

    // Fetch current due diligence items so Claude can check them off
    const { data: diligenceItems } = await supabase
      .from('due_diligence')
      .select('id, item, position')
      .order('position')

    const diligenceList = (diligenceItems || [])
      .map(d => `${d.position}: ${d.item}`)
      .join('\n')

    const userContent = isPdf
      ? [
          {
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: base64 },
            title: file.name
          },
          {
            type: 'text',
            text: `You are sorting a document into a data room for Space Launch Technologies.

Based on the content of this document:

1. Choose the single best-matching folder from the list below.
2. Decide if this document should be restricted (post-NDA only). Set isRestricted to true ONLY for patents, white papers, detailed technical IP, or highly confidential content.
3. Check off any due diligence items that this document satisfies. Return their position numbers as an array.

Folders:
${FOLDERS.join('\n')}

Due diligence checklist (position: item):
${diligenceList}

Respond with ONLY a valid JSON object in this exact format, no explanation, no other text:
{"folder": "FOLDER_PATH_HERE", "isRestricted": false, "diligenceToCheck": []}`
          }
        ]
      : [
          {
            type: 'text',
            text: `You are sorting a file into a data room for Space Launch Technologies.

The file is not a PDF, so you only have its filename to go on: "${file.name}"

Based on the filename:

1. Choose the single best-matching folder from the list below.
2. Decide if this file should be restricted (post-NDA only). Set isRestricted to true ONLY for patents, technical IP, or highly confidential content.
3. Return an empty array for diligenceToCheck since the file content is unavailable.

Folders:
${FOLDERS.join('\n')}

Respond with ONLY a valid JSON object in this exact format, no explanation, no other text:
{"folder": "FOLDER_PATH_HERE", "isRestricted": false, "diligenceToCheck": []}`
          }
        ]

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 512,
      messages: [{ role: 'user', content: userContent }]
    })

    const text = response.content.find(b => b.type === 'text')?.text?.trim()

    let result
    try {
      result = JSON.parse(text)
    } catch {
      result = { folder: '10_Appendix/01 Research Papers', isRestricted: false, diligenceToCheck: [] }
    }

    // Validate the returned folder is in our list
    if (!FOLDERS.includes(result.folder)) {
      result.folder = '10_Appendix/01 Research Papers'
    }

    const diligenceToCheck = Array.isArray(result.diligenceToCheck) ? result.diligenceToCheck : []

    // Mark matching due diligence items as checked
    if (diligenceToCheck.length > 0 && diligenceItems?.length > 0) {
      const idsToCheck = diligenceItems
        .filter(d => diligenceToCheck.includes(d.position))
        .map(d => d.id)

      if (idsToCheck.length > 0) {
        await supabase
          .from('due_diligence')
          .update({ checked: true })
          .in('id', idsToCheck)
      }
    }

    return NextResponse.json({
      folder: result.folder,
      isRestricted: result.isRestricted === true,
      diligenceChecked: diligenceToCheck
    })

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
