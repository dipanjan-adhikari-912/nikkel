import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/server/supabase'

export async function POST(request: NextRequest, { params }: { params: { shareToken: string } }) {
  try {
    const { nikkelId, authorName, authorEmail, text: body } = await request.json()
    if (!nikkelId || !authorName || !body) {
      return NextResponse.json({ error: 'nikkelId, authorName, and text are required' }, { status: 400 })
    }

    const { data: review, error: reviewError } = await db
      .from('reviews')
      .select('id')
      .eq('share_token', params.shareToken)
      .single()

    if (reviewError || !review) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 })
    }

    const { data: nikkel, error: nikkelError } = await db
      .from('nikkels')
      .select('id, review_id')
      .eq('id', nikkelId)
      .single()

    if (nikkelError || nikkel.review_id !== review.id) {
      return NextResponse.json({ error: 'Nikkel not found in this review' }, { status: 404 })
    }

    const { data, error } = await db
      .from('replies')
      .insert({ nikkel_id: nikkelId, author_name: authorName, author_email: authorEmail, body, is_client: true })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
