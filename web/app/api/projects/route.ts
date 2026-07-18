import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/server/supabase'
import { requireAuth } from '@/lib/server/auth'

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if ('error' in auth) return auth.error

  const { data: owned, error: ownedError } = await db
    .from('projects')
    .select('*')
    .eq('owner_id', auth.user.id)
    .order('created_at', { ascending: false })

  if (ownedError) return NextResponse.json({ error: ownedError.message }, { status: 500 })

  const { data: collabRows, error: collabError } = await db
    .from('project_collaborators')
    .select('projects(*)')
    .eq('user_id', auth.user.id)

  if (collabError) return NextResponse.json({ error: collabError.message }, { status: 500 })

  const result = [
    ...(owned || []).map(p => ({ ...p, role: 'owner' })),
    ...(collabRows || []).map(r => ({ ...r.projects, role: 'collaborator' }))
  ]

  return NextResponse.json(result)
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if ('error' in auth) return auth.error

  const { title, baseUrl } = await request.json()
  if (!title || !baseUrl) {
    return NextResponse.json({ error: 'title and baseUrl are required' }, { status: 400 })
  }

  const { data, error } = await db
    .from('projects')
    .insert({ owner_id: auth.user.id, title, base_url: baseUrl })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
