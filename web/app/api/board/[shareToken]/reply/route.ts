import { NextRequest, NextResponse } from 'next/server'
import { userDb } from '@/lib/server/supabase'
import { requireAuth } from '@/lib/server/auth'
import { rateLimit } from '@/lib/server/rate-limit'

export async function POST(request: NextRequest, { params }: { params: { shareToken: string } }) {
  const limited = rateLimit(request, { key: 'board-reply', limit: 20, windowMs: 60_000 })
  if (limited) return limited

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

    const sdb = userDb(auth.token)
    const { data: review, error: reviewError } = await sdb
      .from('reviews')
      .select('id, project_id')
      .eq('share_token', params.shareToken)
      .single()

    if (reviewError || !review) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 })
    }

    const { data: nikkel, error: nikkelError } = await sdb
      .from('nikkels')
      .select('id, review_id')
      .eq('id', nikkelId)
      .single()

    if (nikkelError || nikkel.review_id !== review.id) {
      return NextResponse.json({ error: 'Nikkel not found in this review' }, { status: 404 })
    }

    const { data: project } = await sdb
      .from('projects')
      .select('owner_id')
      .eq('id', review.project_id)
      .single()

    const isOwner = project?.owner_id === auth.user.id
    if (!isOwner) {
      await sdb
        .from('project_collaborators')
        .upsert(
          { project_id: review.project_id, user_id: auth.user.id, role: 'collaborator' },
          { onConflict: 'project_id,user_id', ignoreDuplicates: true }
        )
    }

    const { data, error } = await sdb
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
