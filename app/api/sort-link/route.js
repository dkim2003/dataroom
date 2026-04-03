import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const FOLDERS = [
  '00_START_HERE', '01_Pitch_and_Overview', '02_Market_Opportunity',
  '03_Product_Technology', '04_Traction', '05_Financials',
  '06_Legal', '07_Team', '08_Fundraising', '09_Investor_Updates', '10_Appendix'
]

export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { name, url } = await request.json()
    if (!name || !url) return NextResponse.json({ error: 'name and url required' }, { status: 400 })

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 256,
      messages: [{
        role: 'user',
        content: `You are organizing links for a startup data room called Space Launch Technologies.

Link name: "${name}"
URL: "${url}"

Pick the most appropriate folder from this list:
${FOLDERS.map(f => `- ${f}`).join('\n')}

Also decide if this link should be restricted (post-NDA only). Mark as restricted if it relates to financials, patents, legal agreements, technical architecture, or any sensitive business information.

Reply with JSON only, no markdown: {"folder": "exact_folder_name", "isRestricted": true_or_false}`
      }]
    })

    const text = message.content[0].text.trim().replace(/```json\n?|\n?```/g, '')
    const result = JSON.parse(text)
    const folder = FOLDERS.includes(result.folder) ? result.folder : '10_Appendix'

    return NextResponse.json({ folder, isRestricted: !!result.isRestricted })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
