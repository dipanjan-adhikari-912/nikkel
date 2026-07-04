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
    .eq('org_id', auth.profile?.org_id)
    .single()

  if (error) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const { data: reviews } = await db
    .from('reviews')
    .select('id')
    .eq('project_id', params.id)

  const reviewIds = (reviews || []).map((r: any) => r.id)
  let summary = { total: 0, open: 0, in_progress: 0, resolved: 0 }

  if (reviewIds.length > 0) {
    const { data: nikkels } = await db
      .from('nikkels')
      .select('status')
      .in('review_id', reviewIds)

    if (nikkels) {
      summary = {
        total: nikkels.length,
        open: nikkels.filter((n: any) => n.status === 'open').length,
        in_progress: nikkels.filter((n: any) => n.status === 'in_progress').length,
        resolved: nikkels.filter((n: any) => n.status === 'resolved').length
      }
    }
  }

  return NextResponse.json({ ...project, summary })
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(request)
  if ('error' in auth) return auth.error

  const { error } = await db
    .from('projects')
    .delete()
    .eq('id', params.id)
    .eq('org_id', auth.profile?.org_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ message: 'Project deleted' })
}
