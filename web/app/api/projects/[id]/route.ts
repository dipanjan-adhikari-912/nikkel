import { NextRequest, NextResponse } from 'next/server'
import { userDb } from '@/lib/server/supabase'
import { requireAuth, requireAuthOnly } from '@/lib/server/auth'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(request)
  if ('error' in auth) return auth.error

  const sdb = userDb(auth.token)
  const { data: project, error } = await sdb
    .from('projects')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error || !project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const isOwner = project.owner_id === auth.user.id
  if (!isOwner) {
    const { data: collab } = await sdb
      .from('project_collaborators')
      .select('user_id')
      .eq('project_id', params.id)
      .eq('user_id', auth.user.id)
      .maybeSingle()
    if (!collab) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  const { data: reviews } = await sdb.from('reviews').select('id').eq('project_id', params.id)
  const reviewIds = (reviews || []).map((r: any) => r.id)
  let nikkelCount = 0

  if (reviewIds.length > 0) {
    const { count } = await sdb
      .from('nikkels')
      .select('id', { count: 'exact', head: true })
      .in('review_id', reviewIds)
    nikkelCount = count || 0
  }

  const { count: collaboratorCount } = await sdb
    .from('project_collaborators')
    .select('user_id', { count: 'exact', head: true })
    .eq('project_id', params.id)

  return NextResponse.json({ ...project, role: isOwner ? 'owner' : 'collaborator', nikkelCount, collaboratorCount: collaboratorCount || 0 })
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuthOnly(request)
  if ('error' in auth) return auth.error

  const sdb = userDb(auth.token)
  const { data, error } = await sdb.rpc('delete_project', { pid: params.id })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (data?.error) {
    // Not the owner — just remove this user's access so the project leaves their dashboard
    const { error: leaveError } = await sdb.rpc('leave_project', { pid: params.id })
    if (leaveError) return NextResponse.json({ error: leaveError.message }, { status: 500 })
    return NextResponse.json({ message: 'Removed from your view' })
  }
  return NextResponse.json({ message: 'Project deleted' })
}
