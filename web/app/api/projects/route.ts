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

  // Batch all nikkels in one query (was N+1 per project)
  const projectIds = all.map((p: any) => p.id)
  const { data: reviews } = await db
    .from('reviews')
    .select('id, project_id')
    .in('project_id', projectIds)
  const reviewIds = (reviews || []).map((r: any) => r.id)
  const reviewProjectMap: Record<string, string> = {}
  for (const r of reviews || []) { reviewProjectMap[r.id] = r.project_id }

  let allNikkels: any[] = []
  if (reviewIds.length > 0) {
    const { data: n } = await db
      .from('nikkels')
      .select('created_at, page_url, review_id')
      .in('review_id', reviewIds)
      .order('created_at', { ascending: false })
    allNikkels = n || []
  }

  const projectData: Record<string, { nikkels: any[] }> = {}
  for (const n of allNikkels) {
    const pid = reviewProjectMap[n.review_id]
    if (!pid) continue
    if (!projectData[pid]) projectData[pid] = { nikkels: [] }
    projectData[pid].nikkels.push(n)
  }

  const enriched = all.map((p: any) => {
    const data = projectData[p.id] || { nikkels: [] }
    const nikkelCount = data.nikkels.length
    const lastActivityAt = data.nikkels[0]?.created_at || p.created_at
    const pageMap: Record<string, number> = {}
    for (const n of data.nikkels) {
      const key = n.page_url || 'unknown'
      pageMap[key] = (pageMap[key] || 0) + 1
    }
    const pageBreakdown = Object.entries(pageMap).map(([pageUrl, count]) => ({ pageUrl, nikkelCount: count }))
    return { ...p, nikkelCount, lastActivityAt, pageBreakdown }
  })

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
