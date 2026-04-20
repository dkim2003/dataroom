import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { checkRateLimit } from '@/lib/rateLimit'
import { isSafeRelativePath } from '@/lib/pathSafety'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const ADMIN_EMAIL = 'contact@kimduhyun.com'
const STORAGE_PREFIXES = ['general', 'restricted', 'internal']

// Strip the leading storage prefix (general/, restricted/, internal/) from a
// stored folder path so Claude sees only the logical folder structure.
// Returns null if the path has no prefix segment.
function stripPrefix(fp) {
  const parts = fp.split('/')
  if (parts.length < 2) return null
  if (!STORAGE_PREFIXES.includes(parts[0])) return null
  return parts.slice(1).join('/')
}

// POST /api/sort
// Accepts a multipart form with: file (PDF), folderPaths (JSON-stringified array of current folder paths)
// Returns: { folder: string, isRestricted: boolean, diligenceChecked: number[] }
export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Allow admin or employees only
    const { data: profile } = await supabase.from('profiles').select('role, is_admin').eq('id', user.id).single()
    const isAdmin = user.email === ADMIN_EMAIL || profile?.is_admin === true
    const isEmployee = profile?.role === 'pre_nda_employee' || profile?.role === 'post_nda_employee'
    if (!isAdmin && !isEmployee) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    if (!checkRateLimit(`sort:${user.id}`, 20, 5 * 60 * 1000)) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
    }

    const formData = await request.formData()
    const file = formData.get('file')
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    // Enforce a size limit to prevent memory exhaustion — the entire file is
    // loaded into memory and base64-encoded before sending to Claude.
    const MAX_SORT_BYTES = 100 * 1024 * 1024 // 100 MB
    if (typeof file.size === 'number' && file.size > MAX_SORT_BYTES) {
      return NextResponse.json({ error: 'File exceeds 100 MB limit' }, { status: 413 })
    }

    // Parse folderPaths (sent from the client so Claude sees the CURRENT folder
    // structure, not a stale hardcoded list). Expected: JSON array of strings
    // like "general/01_X", "general/01_X/SubFolder", etc.
    let rawFolderPaths = []
    try {
      const raw = formData.get('folderPaths')
      if (typeof raw === 'string' && raw.length > 0) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) rawFolderPaths = parsed
      }
    } catch {
      rawFolderPaths = []
    }

    // Strip storage prefixes, keep only safe subpaths, dedupe. Cap at 500 to
    // keep the prompt sized reasonably.
    const folderSet = new Set()
    for (const fp of rawFolderPaths) {
      if (typeof fp !== 'string') continue
      const stripped = stripPrefix(fp)
      if (!stripped) continue
      if (!isSafeRelativePath(stripped)) continue
      folderSet.add(stripped)
    }
    const availableFolders = Array.from(folderSet).slice(0, 500)

    if (availableFolders.length === 0) {
      return NextResponse.json({ error: 'No folders available — create a folder before uploading' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    if (bytes.byteLength > MAX_SORT_BYTES) {
      return NextResponse.json({ error: 'File exceeds 100 MB limit' }, { status: 413 })
    }
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

    const folderList = availableFolders.join('\n')

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

1. Choose the single best-matching folder from the list below. You MUST return an exact string from the list.
2. Decide if this document should be restricted (post-NDA only). Set isRestricted to true ONLY for patents, white papers, detailed technical IP, or highly confidential content.
3. Check off any due diligence items that this document satisfies. Return their position numbers as an array.

Folders:
${folderList}

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

1. Choose the single best-matching folder from the list below. You MUST return an exact string from the list.
2. Decide if this file should be restricted (post-NDA only). Set isRestricted to true ONLY for patents, technical IP, or highly confidential content.
3. Return an empty array for diligenceToCheck since the file content is unavailable.

Folders:
${folderList}

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
      result = { folder: availableFolders[0], isRestricted: false, diligenceToCheck: [] }
    }

    // Validate the returned folder is in our dynamic list; otherwise fall back
    // to the first available folder so the client always receives a valid path.
    if (!availableFolders.includes(result.folder)) {
      result.folder = availableFolders[0]
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

  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
