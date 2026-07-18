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

    const targetReview = (reviewError || !review) ? null : review

    if (!targetReview) {
      const { data: project } = await db
        .from('projects')
        .select('*')
        .eq('share_token', params.shareToken)
        .single()

      if (!project) return NextResponse.json({ error: 'Board not found' }, { status: 404 })

      const { data: fallbackReview } = await db
        .from('reviews')
        .select('*, projects(*)')
        .eq('project_id', project.id)
        .limit(1)
        .single()

      if (!fallbackReview) return NextResponse.json({ error: 'No review found for this project' }, { status: 404 })

      const { data: fullReview, error: fullError } = await db
        .from('reviews')
        .select('*, projects(*)')
        .eq('id', fallbackReview.id)
        .single()

      if (fullError || !fullReview) return NextResponse.json({ error: 'Review not found' }, { status: 404 })

      const reviewData = fullReview
      const { data: nikkels, error: nikkelError } = await db
        .from('nikkels')
        .select('*')
        .eq('review_id', reviewData.id)
        .order('created_at', { ascending: true })
        if (nikkelError) return NextResponse.json({ error: nikkelError.message }, { status: 500 })

      const nikkelIds = (nikkels || []).map((n: any) => n.id)
      let replies: any[] = []
      if (nikkelIds.length > 0) {
        const { data: r } = await db.from('replies').select('*').in('nikkel_id', nikkelIds).order('created_at', { ascending: true })
        replies = r || []
      }

      const nikkelsWithReplies = (nikkels || []).map((n: any) => ({ ...n, replies: replies.filter((r: any) => r.nikkel_id === n.id) }))
      const owner = await getProfile(reviewData.owner_id)
      return NextResponse.json({ review: reviewData, project: reviewData.projects, owner, nikkels: nikkelsWithReplies })
    }

    const { data: nikkels, error: nikkelError } = await db
      .from('nikkels')
      .select('*')
      .eq('review_id', targetReview.id)
      .order('created_at', { ascending: true })

    if (nikkelError) return NextResponse.json({ error: nikkelError.message }, { status: 500 })

    const nikkelIds = (nikkels || []).map((n: any) => n.id)
    let replies: any[] = []
    if (nikkelIds.length > 0) {
      const { data: r } = await db.from('replies').select('*').in('nikkel_id', nikkelIds).order('created_at', { ascending: true })
      replies = r || []
    }

    const nikkelsWithReplies = (nikkels || []).map((n: any) => ({ ...n, replies: replies.filter((r: any) => r.nikkel_id === n.id) }))
    const owner = await getProfile(targetReview.owner_id)
    return NextResponse.json({ review: targetReview, project: targetReview.projects, owner, nikkels: nikkelsWithReplies })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
