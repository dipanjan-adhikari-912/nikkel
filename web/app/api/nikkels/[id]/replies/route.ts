import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/server/supabase'
import { requireAuth } from '@/lib/server/auth'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(request)
  if ('error' in auth) return auth.error

  const { data, error } = await db
    .from('replies')
    .select('*')
    .eq('nikkel_id', params.id)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(request)
  if ('error' in auth) return auth.error

  const { authorName, authorEmail, text: body } = await request.json()
  if (!authorName || !body) {
    return NextResponse.json({ error: 'authorName and text are required' }, { status: 400 })
  }

  const { data, error } = await db
    .from('replies')
    .insert({ nikkel_id: params.id, author_name: authorName, author_email: authorEmail, body, is_client: false })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
