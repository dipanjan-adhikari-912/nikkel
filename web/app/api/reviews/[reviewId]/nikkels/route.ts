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

  const { pageUrl, selector, coordX, coordY, elementTag, elementText, commentText, screenshotBase64 } = await request.json()
  if (!pageUrl || !commentText) {
    return NextResponse.json({ error: 'pageUrl and commentText are required' }, { status: 400 })
  }

  let screenshotUrl = null
  if (screenshotBase64) {
    try {
      const base64String = screenshotBase64.replace(/^data:image\/\w+;base64,/, '')
      const buffer = Buffer.from(base64String, 'base64')
      const filename = `screenshots/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`
      const { data: uploadData, error: uploadError } = await db.storage
        .from('screenshots')
        .upload(filename, buffer, { contentType: 'image/jpeg', upsert: false })

      if (!uploadError) {
        const { data: { publicUrl } } = db.storage.from('screenshots').getPublicUrl(uploadData.path)
        screenshotUrl = publicUrl
      }
    } catch { /* screenshot upload failed silently */ }
  }

  const { data, error } = await db
    .from('nikkels')
    .insert({
      review_id: params.reviewId,
      page_url: pageUrl,
      selector,
      coord_x: coordX,
      coord_y: coordY,
      element_tag: elementTag,
      element_text: elementText,
      comment_text: commentText,
      screenshot_url: screenshotUrl,
      author_id: auth.user.id,
      author_name: auth.profile?.full_name || 'Anonymous'
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
