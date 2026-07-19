import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/server/supabase'
import { requireAuth, requireAuthOnly } from '@/lib/server/auth'

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

  const { count: collaboratorCount } = await db
    .from('project_collaborators')
    .select('user_id', { count: 'exact', head: true })
    .eq('project_id', params.id)

  return NextResponse.json({ ...project, role: isOwner ? 'owner' : 'collaborator', nikkelCount, collaboratorCount: collaboratorCount || 0 })
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuthOnly(request)
  if ('error' in auth) return auth.error

  const { data, error } = await db.rpc('delete_project', { pid: params.id, uid: auth.user.id })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (data?.error) return NextResponse.json({ error: data.error }, { status: 404 })
  return NextResponse.json({ message: 'Project deleted' })
}
