import { NextRequest, NextResponse } from 'next/server'
import { userDb } from '@/lib/server/supabase'
import { requireAuth } from '@/lib/server/auth'
import { rateLimit } from '@/lib/server/rate-limit'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const limited = rateLimit(request, { key: 'claim-seat', limit: 20, windowMs: 60_000 })
  if (limited) return limited

  const auth = await requireAuth(request)
  if ('error' in auth) return auth.error

  if (auth.user.is_anonymous || !auth.user.email) {
    return NextResponse.json({ error: 'Sign in to join this project' }, { status: 403 })
  }

  const sdb = userDb(auth.token)
  const { data: project } = await sdb
    .from('projects')
    .select('id, owner_id')
    .eq('id', params.id)
    .single()

  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  // Owner or existing collaborator — return success, no-op
  if (project.owner_id === auth.user.id) {
    return NextResponse.json({ ok: true })
  }

  const { error } = await sdb
    .from('project_collaborators')
    .upsert({ project_id: params.id, user_id: auth.user.id, role: 'collaborator' }, { onConflict: 'project_id,user_id', ignoreDuplicates: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}