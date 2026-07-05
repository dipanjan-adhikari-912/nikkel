import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/server/supabase'

async function fetchOwner(userId) {
  if (!userId) return { id: null, name: null, email: null, avatar_url: '' };
  try {
    const res = await fetch(`${process.env.SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
      headers: {
        apikey: process.env.SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
      },
    });
    if (!res.ok) return { id: userId, name: null, email: null, avatar_url: '' };
    const data = await res.json();
    const meta = data.user_metadata || {};
    return {
      id: data.id,
      name: meta.full_name || meta.name || null,
      email: data.email || null,
      avatar_url: meta.avatar_url || meta.picture || meta.avatar || '',
    };
  } catch {
    return { id: userId, name: null, email: null, avatar_url: '' };
  }
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

      const owner = await fetchOwner(fullReview.owner_id)
      return NextResponse.json({ review: fullReview, project: fullReview.projects, owner, nikkels: nikkels || [] })
    }

    const { data: nikkels, error: nikkelError } = await db
      .from('nikkels')
      .select('*')
      .eq('review_id', review.id)
      .order('created_at', { ascending: true })

    if (nikkelError) return NextResponse.json({ error: nikkelError.message }, { status: 500 })

    const owner = await fetchOwner(review.owner_id)
    return NextResponse.json({ review, project: review.projects, owner, nikkels: nikkels || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
