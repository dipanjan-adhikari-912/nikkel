import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/server/supabase'

export async function POST(request: NextRequest) {
  try {
    const { nikkelId, text: body, authorName, authorEmail } = await request.json()
    if (!nikkelId || !body || !authorName) {
      return NextResponse.json({ error: 'nikkelId, text, and authorName are required' }, { status: 400 })
    }

    const { data, error } = await db
      .from('replies')
      .insert({ nikkel_id: nikkelId, body, author_name: authorName, author_email: authorEmail || null, is_client: true })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
