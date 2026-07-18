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

  const all = [
    ...owned.map(p => ({ ...p, role: 'owner' })),
    ...(collabRows || []).map(r => ({ ...r.projects, role: 'collaborator' }))
  ]

  const enriched = await Promise.all(all.map(async (p) => {
    const { data: reviews } = await db.from('reviews').select('id').eq('project_id', p.id)
    const reviewIds = (reviews || []).map((r: any) => r.id)
    let nikkelCount = 0
    let lastActivityAt = p.created_at
    const pageBreakdown: { pageUrl: string; nikkelCount: number }[] = []
    if (reviewIds.length > 0) {
      const { data: nikkels } = await db
        .from('nikkels')
        .select('created_at, page_url')
        .in('review_id', reviewIds)
        .order('created_at', { ascending: false })
      nikkelCount = nikkels?.length || 0
      if (nikkels?.[0]?.created_at) lastActivityAt = nikkels[0].created_at
      const pageMap: Record<string, number> = {}
      for (const n of nikkels || []) {
        const key = n.page_url || 'unknown'
        pageMap[key] = (pageMap[key] || 0) + 1
      }
      for (const [pageUrl, count] of Object.entries(pageMap)) {
        pageBreakdown.push({ pageUrl, nikkelCount: count })
      }
    }
    return { ...p, nikkelCount, lastActivityAt, pageBreakdown }
  }))

  return NextResponse.json(enriched)
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
