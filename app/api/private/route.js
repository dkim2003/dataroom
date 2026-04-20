import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function verifyUser(request) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return null
  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return null
  return user
}

// GET — fetch current user's private items
export async function GET(request) {
  try {
    const user = await verifyUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabase
      .from('private_items')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: 'Server error' }, { status: 500 })
    return NextResponse.json({ items: data })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// POST — create a new private item
export async function POST(request) {
  try {
    const user = await verifyUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { type, title, content } = await request.json()
    if (!type || !title?.trim() || !content?.trim())
      return NextResponse.json({ error: 'type, title, and content are required' }, { status: 400 })

    const { data, error } = await supabase
      .from('private_items')
      .insert({ user_id: user.id, type, title: title.trim(), content: content.trim() })
      .select()
      .single()

    if (error) return NextResponse.json({ error: 'Server error' }, { status: 500 })
    return NextResponse.json({ item: data })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// PATCH — rename a private item title
export async function PATCH(request) {
  try {
    const user = await verifyUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id, title } = await request.json()
    if (!id || !title?.trim()) return NextResponse.json({ error: 'id and title required' }, { status: 400 })
    const { data, error } = await supabase
      .from('private_items')
      .update({ title: title.trim() })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()
    if (error) return NextResponse.json({ error: 'Server error' }, { status: 500 })
    return NextResponse.json({ item: data })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// DELETE — delete a private item (verified to belong to the user)
export async function DELETE(request) {
  try {
    const user = await verifyUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await request.json()
    const { error } = await supabase
      .from('private_items')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id) // extra safety: only delete own items

    if (error) return NextResponse.json({ error: 'Server error' }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
