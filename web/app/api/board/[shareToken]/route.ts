import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/server/supabase'

async function getProfile(userId: string | null) {
  if (!userId) return null
  const { data } = await db.from('profiles').select('name, email, avatar_url').eq('id', userId).single()
  return data || null
}

export async function GET(request: NextRequest, { params }: { params: { shareToken: string } }) {
  try {
    const { data: review, error: reviewError } = await db
      .from('reviews')
      .select('*, projects(*)')
      .eq('share_token', params.shareToken)
      .single()

    if (reviewError || !review) {
      const { data: project } = await db
        .from('projects')
        .select('*')
        .eq('share_token', params.shareToken)
        .single()

      if (!project) return NextResponse.json({ error: 'Board not found' }, { status: 404 })

      const { data: fallbackReview } = await db
        .from('reviews')
        .select('*')
        .eq('project_id', project.id)
        .limit(1)
        .single()

      if (!fallbackReview) return NextResponse.json({ error: 'No review found for this project' }, { status: 404 })

      const { data: fullReview } = await db
        .from('reviews')
        .select('*, projects(*)')
        .eq('id', fallbackReview.id)
        .single()

      if (!fullReview) return NextResponse.json({ error: 'Review not found' }, { status: 404 })

      const { data: nikkels, error: nikkelError } = await db
        .from('nikkels')
        .select('*')
        .eq('review_id', fullReview.id)
        .order('created_at', { ascending: true })

      if (nikkelError) return NextResponse.json({ error: nikkelError.message }, { status: 500 })

      const owner = await getProfile(fullReview.owner_id)
      return NextResponse.json({ review: fullReview, project: fullReview.projects, owner, nikkels: nikkels || [] })
    }

    const { data: nikkels, error: nikkelError } = await db
      .from('nikkels')
      .select('*')
      .eq('review_id', review.id)
      .order('created_at', { ascending: true })

    if (nikkelError) return NextResponse.json({ error: nikkelError.message }, { status: 500 })

    const owner = await getProfile(review.owner_id)
    return NextResponse.json({ review, project: review.projects, owner, nikkels: nikkels || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
