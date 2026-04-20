import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rateLimit'
import { isSafeSegment } from '@/lib/pathSafety'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const ADMIN_EMAIL = 'contact@kimduhyun.com'
const STORAGE_PREFIXES = ['general', 'restricted', 'internal']

export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Only employees and admins may trigger the AI sort.
    const { data: profile } = await supabase.from('profiles').select('role, is_admin').eq('id', user.id).single()
    const isAdmin = user.email === ADMIN_EMAIL || profile?.is_admin === true
    const isEmployee = profile?.role === 'pre_nda_employee' || profile?.role === 'post_nda_employee'
    if (!isAdmin && !isEmployee) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    if (!checkRateLimit(`sort-link:${user.id}`, 20, 5 * 60 * 1000)) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
    }

    const { name, url, folderPaths: rawFolderPaths } = await request.json()
    if (!name || !url) return NextResponse.json({ error: 'name and url required' }, { status: 400 })

    // Build the current top-level folder list from what the client sent.
    // Links live at the top level, so we only surface top-level folder names.
    const topLevelSet = new Set()
    if (Array.isArray(rawFolderPaths)) {
      for (const fp of rawFolderPaths) {
        if (typeof fp !== 'string') continue
        const parts = fp.split('/')
        if (parts.length < 2) continue
        if (!STORAGE_PREFIXES.includes(parts[0])) continue
        const top = parts[1]
        if (!isSafeSegment(top)) continue
        topLevelSet.add(top)
      }
    }
    const topFolders = Array.from(topLevelSet).slice(0, 200)

    if (topFolders.length === 0) {
      return NextResponse.json({ error: 'No folders available — create a folder before adding a link' }, { status: 400 })
    }

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 256,
      messages: [{
        role: 'user',
        content: `You are organizing links for a startup data room called Space Launch Technologies.

Link name: "${name}"
URL: "${url}"

Pick the most appropriate folder from this list. You MUST return one of these exact strings:
${topFolders.map(f => `- ${f}`).join('\n')}

Also decide if this link should be restricted (post-NDA only). Mark as restricted if it relates to financials, patents, legal agreements, technical architecture, or any sensitive business information.

Reply with JSON only, no markdown: {"folder": "exact_folder_name", "isRestricted": true_or_false}`
      }]
    })

    let result
    try {
      const text = message.content[0].text.trim().replace(/```json\n?|\n?```/g, '')
      result = JSON.parse(text)
    } catch {
      result = { folder: topFolders[0], isRestricted: false }
    }
    const folder = topFolders.includes(result.folder) ? result.folder : topFolders[0]

    return NextResponse.json({ folder, isRestricted: !!result.isRestricted })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
