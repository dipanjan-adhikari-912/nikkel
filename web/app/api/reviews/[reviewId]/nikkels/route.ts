import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/server/supabase'
import { requireAuth } from '@/lib/server/auth'

export async function GET(request: NextRequest, { params }: { params: { reviewId: string } }) {
  const auth = await requireAuth(request)
  if ('error' in auth) return auth.error

  const { data, error } = await db
    .from('nikkels')
    .select('*, replies(*)')
    .eq('review_id', params.reviewId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest, { params }: { params: { reviewId: string } }) {
  const auth = await requireAuth(request)
  if ('error' in auth) return auth.error

  const { pageUrl, selector, coordX, coordY, elementTag, elementText, commentText } = await request.json()
  if (!pageUrl || !commentText) {
    return NextResponse.json({ error: 'pageUrl and commentText are required' }, { status: 400 })
  }

  const { count } = await db
    .from('nikkels')
    .select('id', { count: 'exact', head: true })
    .eq('review_id', params.reviewId)

  const { data, error } = await db
    .from('nikkels')
    .insert({
      review_id: params.reviewId,
      owner_id: auth.user.id,
      page_url: pageUrl,
      dom_selector: selector,
      x: coordX,
      y: coordY,
      tag: elementTag,
      element_text: elementText,
      comment: commentText,
      idx: (count ?? 0) + 1,
      screenshot_url: null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  try {
    await db.rpc('pg_notify', {
      channel: 'nikkel_created',
      payload: JSON.stringify({ nikkelId: data.id })
    })
  } catch { /* notify failure non-fatal */ }

  return NextResponse.json(data, { status: 201 })
}
