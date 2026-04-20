import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabase
      .from('audit_log')
      .select('document_name, created_at')
      .eq('user_id', user.id)
      .eq('action', 'document_viewed')
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Collapse to most recent open per document
    const recents = {}
    for (const row of data) {
      if (row.document_name && !recents[row.document_name]) {
        recents[row.document_name] = row.created_at
      }
    }

    return NextResponse.json({ recents })

  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
