import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/server/supabase'
import { requireAuth } from '@/lib/server/auth'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(request)
  if ('error' in auth) return auth.error

  const { data: project, error } = await db
    .from('projects')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error || !project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const isOwner = project.owner_id === auth.user.id
  if (!isOwner) {
    const { data: collab } = await db
      .from('project_collaborators')
      .select('user_id')
      .eq('project_id', params.id)
      .eq('user_id', auth.user.id)
      .maybeSingle()
    if (!collab) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  const { data: reviews } = await db.from('reviews').select('id').eq('project_id', params.id)
  const reviewIds = (reviews || []).map((r: any) => r.id)
  let nikkelCount = 0

  if (reviewIds.length > 0) {
    const { count } = await db
      .from('nikkels')
      .select('id', { count: 'exact', head: true })
      .in('review_id', reviewIds)
    nikkelCount = count || 0
  }

  return NextResponse.json({ ...project, role: isOwner ? 'owner' : 'collaborator', nikkelCount })
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(request)
  if ('error' in auth) return auth.error

  const { data: project } = await db.from('projects').select('owner_id').eq('id', params.id).single()
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  if (project.owner_id !== auth.user.id) {
    return NextResponse.json({ error: 'Only the owner can delete this project' }, { status: 403 })
  }

  // Bulk-delete bottom-up (much faster than relying on ON DELETE CASCADE)
  const { data: reviews } = await db.from('reviews').select('id').eq('project_id', params.id)
  const reviewIds = (reviews || []).map((r: any) => r.id)

  if (reviewIds.length > 0) {
    const { data: nikkels } = await db.from('nikkels').select('id').in('review_id', reviewIds)
    const nikkelIds = (nikkels || []).map((n: any) => n.id)
    if (nikkelIds.length > 0) {
      const { error: e1 } = await db.from('replies').delete().in('nikkel_id', nikkelIds)
      if (e1) return NextResponse.json({ error: e1.message }, { status: 500 })
    }
    const { error: e2 } = await db.from('nikkels').delete().in('review_id', reviewIds)
    if (e2) return NextResponse.json({ error: e2.message }, { status: 500 })
    const { error: e3 } = await db.from('reviews').delete().eq('project_id', params.id)
    if (e3) return NextResponse.json({ error: e3.message }, { status: 500 })
  }

  const { error: e4 } = await db.from('project_collaborators').delete().eq('project_id', params.id)
  if (e4) return NextResponse.json({ error: e4.message }, { status: 500 })

  const { error: e5 } = await db.from('projects').delete().eq('id', params.id)
  if (e5) return NextResponse.json({ error: e5.message }, { status: 500 })
  return NextResponse.json({ message: 'Project deleted' })
}
