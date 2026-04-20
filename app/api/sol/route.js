import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

const ADMIN_EMAIL = 'contact@kimduhyun.com'
const MAX_LIST_DEPTH = 8

// Keywords that suggest the user wants Sol to read actual documents
const DOCUMENT_KEYWORDS = [
  'document', 'file', 'uploaded', 'available', 'summary', 'summarize',
  'what does', 'according to', 'in the', 'show me', 'tell me about',
  'contain', 'what is in', 'read', 'review', 'analyze', 'analyse',
  'what do you have', 'what files', 'data room', 'investor guide',
  'patent', 'white paper', 'financials', 'pitch deck', 'contracts'
]

function isDocumentRelated(message) {
  const lower = message.toLowerCase()
  return DOCUMENT_KEYWORDS.some(keyword => lower.includes(keyword))
}

// Recursively list all files the user can access
async function listAccessibleFiles(hasRestrictedAccess, isAdmin) {
  async function listFolder(prefix, depth = 0) {
    if (depth > MAX_LIST_DEPTH) return []
    const { data, error } = await supabase.storage
      .from('documents')
      .list(prefix, { limit: 1000 })

    if (error || !data) return []

    const files = []
    for (const item of data) {
      if (item.id === null) {
        const subFiles = await listFolder(`${prefix}/${item.name}`, depth + 1)
        files.push(...subFiles)
      } else if (item.name !== '.emptyFolderPlaceholder') {
        files.push({ name: item.name, path: `${prefix}/${item.name}` })
      }
    }
    return files
  }

  const generalFiles = await listFolder('general')
  const restrictedFiles = (hasRestrictedAccess || isAdmin) ? await listFolder('restricted') : []

  return [...generalFiles, ...restrictedFiles]
}

// Download a file from Supabase Storage and return it as base64
async function downloadFile(path) {
  const { data, error } = await supabase.storage
    .from('documents')
    .download(path)

  if (error || !data) return null

  // Convert the blob to a base64 string
  const arrayBuffer = await data.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  return buffer.toString('base64')
}

export async function POST(request) {
  try {
    // Step 1 — verify the user is logged in
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Step 2 — get the user's role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_admin, full_name, status')
      .eq('id', user.id)
      .single()

      const isAdmin = user.email === ADMIN_EMAIL || profile?.is_admin === true
      const isEmployee = profile?.role === 'pre_nda_employee' || profile?.role === 'post_nda_employee'
      const hasRestrictedAccess = isAdmin || profile?.role === 'post_nda_investor' || profile?.role === 'post_nda_employee'

    // Block pending/rejected users — they can't reach the dashboard normally,
    // but a saved token or direct API call could still hit this endpoint.
    if (profile?.status === 'pending' || profile?.status === 'rejected') {
      return NextResponse.json({ error: 'Account not approved' }, { status: 403 })
    }

    // Step 3 — get the user's message
    const { message, history: rawHistory = [] } = await request.json()
    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'No message provided' }, { status: 400 })
    }

    // Validate history structure to prevent prompt injection via crafted messages.
    // Only allow role:'user' and role:'assistant' with string content.
    const history = Array.isArray(rawHistory)
      ? rawHistory.filter(msg =>
          msg && typeof msg === 'object' &&
          (msg.role === 'user' || msg.role === 'assistant') &&
          typeof msg.content === 'string'
        )
      : []

    // Step 4 — decide whether to fetch documents
    const needsDocs = isDocumentRelated(message)
    const messageContent = []

    if (needsDocs) {
      // Fetch the list of files this user can access
      const files = await listAccessibleFiles(hasRestrictedAccess, isAdmin)

      if (files.length === 0) {
        // No files uploaded yet — tell Sol so it can inform the user
        messageContent.push({
          type: 'text',
          text: `Note: There are currently no documents uploaded in the data room. Let the user know politely. The user's question follows in the next message.`
        })
      } else {
        // Download each file and add to the message as a document block
        // We limit to 5 files to keep response times reasonable
        const filesToRead = files.slice(0, 10)
        const documentBlocks = []

        for (const file of filesToRead) {
            if (!file.name.toLowerCase().endsWith('.pdf')) continue

            try {
                const base64 = await downloadFile(file.path)
                if (!base64) continue

    // Validate it's actually a PDF by checking the magic bytes
    // PDF files always start with "%PDF" which is "JVBERi" in base64
    if (!base64.startsWith('JVBERi')) {
      console.log(`Skipping ${file.name} — not a valid PDF`)
      continue
    }

    documentBlocks.push({
      type: 'document',
      source: {
        type: 'base64',
        media_type: 'application/pdf',
        data: base64
      },
      title: file.name
    })
  } catch (fileErr) {
    console.log(`Skipping ${file.name} due to error:`, fileErr.message)
    continue
  }
}


if (documentBlocks.length === 0) {
    // Files exist but none are readable PDFs
    messageContent.push({
        type: 'text',
        text: `Note: There are files in the data room but none could be read. This may be because they are not valid PDF files. Let the user know politely that you can currently only read PDF files, and that the files in the data room may not be in a supported format yet. The user's question follows in the next message.`
    })
} else {
    // Add all document blocks first, then instruction context
    messageContent.push(...documentBlocks)
    messageContent.push({
        type: 'text',
        text: `Use the documents above to answer the user's question. Available documents: ${files.map(f => f.name).join(', ')}. The user's question follows in the next message.`
    })
}
}
} else {
    // No document fetching needed — just answer from system prompt knowledge
    messageContent.push({
        type: 'text',
        text: message
      })
    }

    // Step 5 — build Sol's system prompt
    const systemPrompt = `You are Sol, the AI data room assistant for Space Launch Technologies. You help investors, team members, and partners navigate the data room, understand the company, and get accurate answers quickly.

    The user you are speaking with is: ${profile?.full_name || 'Unknown'} (${user.email})
    User type: ${isAdmin ? 'Admin' : isEmployee ? 'Employee' : 'Investor'}

    Respond the way a sharp, well-informed colleague would — not a customer service bot. Match the length of your response to what the question actually requires. A one-line question gets a one-line answer if that's all it needs. A detailed technical question gets a thorough response. Never pad responses with filler, enthusiasm, or unnecessary context.

    When the user says something casual — "okay", "thanks", "haha", "got it", "interesting" — respond briefly and naturally, like a human would. Don't repeat yourself or summarize what you just said.

    If you need clarification before answering, ask one focused question and wait. Don't give examples of possible answers while asking.

    Write in plain prose by default. Never use asterisks or markdown syntax of any kind — no **bold**, no *italic*, no ## headers. When the user explicitly asks for bullet points, use the • character followed by a space, with each bullet on its own line. Never mix bold or asterisks inside bullet points. Punctuate correctly and use paragraph breaks when responses are long enough to need them.

    When you use web search, report the single most relevant result. Don't aggregate multiple sources or cities or data points unless the user explicitly asked for a comparison.

    If you don't know something, say so plainly. Don't guess or fill the gap with general knowledge that wasn't asked for.

    If asked to generate a prompt for another AI tool like ChatGPT or Claude, write a complete, self-contained prompt that includes all relevant context from the data room. Label it "Prompt for [tool name]:" so the user can copy it directly.

    About Space Launch Technologies: The company is developing the Orbital Launch Air Cannon (OLAC), a ground-based compressed air system that propels rockets to approximately 3km altitude and Mach 2+ before engines ignite. This increases payload capacity by over 50% and cuts launch costs by 41%. The founder is Carl F. Mazur PhD. The current raise is $1.16M at a $4.76M valuation, with a pre-seed of $400K already targeted. The business model is a $250K per quarter technology licensing fee plus a 20% profit share on launch cost savings. Key partners include UBC, NRC Canada, IBM, Fasken Law, KPMG, and Perpetual Motion Patents. A provisional U.S. patent is secured.

    ${hasRestrictedAccess || isAdmin
        ? 'This user has signed the NDA and has full access to all documents including patent and white paper details.'
        : 'This user has Pre-NDA access. You can discuss the technology, business model, team, market, and financials freely. Do not reveal specific patent claims or white paper technical details.'}`


    // Step 6 — call Claude
    const response = await anthropic.messages.create({

        model: 'claude-sonnet-4-20250514',
        max_tokens: needsDocs ? 1024 : 800,
        system: systemPrompt,
        tools: [
            {
                type: 'web_search_20250305',
                name: 'web_search'
            }
        ],
        messages: [
            // Include previous conversation history, excluding the initial greeting
            ...history
            .slice(1) // skip Sol's opening greeting
            .slice(-10) // keep last 10 messages to avoid hitting token limits
            .map(msg => ({
                role: msg.role,
                content: msg.content
            })),
            // Add context (documents + instructions) as one user message,
            // then the user's actual question as a separate user message
            // so the raw question is never embedded inside instruction text.
            ...(needsDocs
              ? [
                  { role: 'user', content: messageContent },
                  { role: 'user', content: message }
                ]
              : [{ role: 'user', content: messageContent }]
            )
        ]
    })

    // When web search is used, Claude returns multiple content blocks
    // // We extract only the text blocks for the final reply
    const reply = response.content
    .filter(block => block.type === 'text')
    .map(block => block.text)
    .join(' ')
    .trim() || 'Sorry, I encountered an error. Please try again.'

    // Step 7 — log to audit trail
    await supabase
      .from('audit_log')
      .insert({
        user_id: user.id,
        user_email: user.email,
        action: needsDocs ? 'sol_document_query' : 'sol_query',
        document_name: [...message].slice(0, 100).join('')
      })

    return NextResponse.json({ reply })

  } catch (err) {
    console.error('Sol API error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}