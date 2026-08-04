import { NextRequest, NextResponse } from 'next/server'
import { userDb } from '@/lib/server/supabase'
import { requireAuth } from '@/lib/server/auth'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(request)
  if ('error' in auth) return auth.error

  const { data, error } = await userDb(auth.token)
    .from('nikkels')
    .select('*, replies(*)')
    .eq('id', params.id)
    .single()

  if (error) return NextResponse.json({ error: 'Nikkel not found' }, { status: 404 })
  return NextResponse.json(data)
}

// Only the review's owner or a collaborator on the project may modify a nikkel.
// RLS enforces this when we act as the user (service-role client would bypass it).
async function canModifyNikkel(request: NextRequest, nikkelId: string) {
  const auth = await requireAuth(request)
  if ('error' in auth) return auth
  const sdb = userDb(auth.token)

  const { data: nikkel } = await sdb.from('nikkels').select('review_id').eq('id', nikkelId).single()
  if (!nikkel) return { error: NextResponse.json({ error: 'Nikkel not found' }, { status: 404 }) }

  const { data: review } = await sdb.from('reviews').select('project_id').eq('id', nikkel.review_id).single()
  if (!review) return { error: NextResponse.json({ error: 'Nikkel not found' }, { status: 404 }) }

  const { data: project } = await sdb.from('projects').select('owner_id').eq('id', review.project_id).single()
  if (!project) return { error: NextResponse.json({ error: 'Project not found' }, { status: 404 }) }

  const isOwner = project.owner_id === auth.user.id
  if (isOwner) return auth
  const { data: collab } = await sdb
    .from('project_collaborators')
    .select('user_id')
    .eq('project_id', review.project_id)
    .eq('user_id', auth.user.id)
    .maybeSingle()
  if (collab) return auth

  return { error: NextResponse.json({ error: 'Not authorized' }, { status: 403 }) }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await canModifyNikkel(request, params.id)
  if ('error' in auth) return auth.error

  const body = await request.json()
  const patch: Record<string, unknown> = {}
  if ('status' in body) {
    if (!['under_review', 'in_progress', 'resolved', 'not_considered'].includes(body.status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }
    patch.status = body.status
  }
  if ('severity' in body) {
    if (!['low', 'medium', 'high'].includes(body.severity)) {
      return NextResponse.json({ error: 'Invalid severity' }, { status: 400 })
    }
    patch.severity = body.severity
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const { data, error } = await userDb(auth.token)
    .from('nikkels')
    .update(patch)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await canModifyNikkel(request, params.id)
  if ('error' in auth) return auth.error

  const { error } = await userDb(auth.token).from('nikkels').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ message: 'Nikkel deleted' })
}
