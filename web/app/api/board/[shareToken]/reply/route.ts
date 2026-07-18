import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/server/supabase'
import { requireAuth } from '@/lib/server/auth'

export async function POST(request: NextRequest, { params }: { params: { shareToken: string } }) {
  const auth = await requireAuth(request)
  if ('error' in auth) return auth.error

  if (auth.user.is_anonymous || !auth.user.email) {
    return NextResponse.json({ error: 'Sign in to reply' }, { status: 403 })
  }

  try {
    const { nikkelId, text: body } = await request.json()
    if (!nikkelId || !body) {
      return NextResponse.json({ error: 'nikkelId and text are required' }, { status: 400 })
    }

    const { data: review, error: reviewError } = await db
      .from('reviews')
      .select('id, project_id')
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

    const { data: project } = await db
      .from('projects')
      .select('owner_id')
      .eq('id', review.project_id)
      .single()

    const isOwner = project?.owner_id === auth.user.id
    let isCollaborator = false
    if (!isOwner) {
      const { data: collab } = await db
        .from('project_collaborators')
        .select('user_id')
        .eq('project_id', review.project_id)
        .eq('user_id', auth.user.id)
        .maybeSingle()
      isCollaborator = !!collab
    }

    if (!isOwner && !isCollaborator) {
      return NextResponse.json({ error: 'not_a_collaborator', projectId: review.project_id }, { status: 403 })
    }

    const { data, error } = await db
      .from('replies')
      .insert({
        nikkel_id: nikkelId,
        user_id: auth.user.id,
        author_name: auth.profile?.name || auth.user.email || 'Anonymous',
        author_email: auth.profile?.email || auth.user.email,
        body,
        is_client: true
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
