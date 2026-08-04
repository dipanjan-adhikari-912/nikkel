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
    .select('id, project_id, screenshot_url')
    .in('project_id', projectIds)
  const reviewIds = (reviews || []).map((r: any) => r.id)
  const reviewProjectMap: Record<string, string> = {}
  for (const r of reviews || []) { reviewProjectMap[r.id] = r.project_id }

  let allNikkels: any[] = []
  if (reviewIds.length > 0) {
    const { data: n } = await db
      .from('nikkels')
      .select('created_at, page_url, screenshot_url, review_id')
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
    const screenshot_url = (reviews || []).find(r => r.project_id === p.id)?.screenshot_url || data.nikkels[0]?.screenshot_url || null
    const pageMap: Record<string, number> = {}
    for (const n of data.nikkels) {
      const key = n.page_url || 'unknown'
      pageMap[key] = (pageMap[key] || 0) + 1
    }
    const pageBreakdown = Object.entries(pageMap).map(([pageUrl, count]) => ({ pageUrl, nikkelCount: count }))
    return { ...p, nikkelCount, lastActivityAt, pageBreakdown, screenshot_url }
  })

  // Batch collaborator details in one query
  const { data: collabDetailRows } = await db
    .from('project_collaborators')
    .select('project_id, user_id')
    .in('project_id', projectIds)
  const collabMap: Record<string, number> = {}
  const collabUsers: Record<string, string[]> = {}
  const userIds = new Set<string>()
  for (const c of collabDetailRows || []) {
    collabMap[c.project_id] = (collabMap[c.project_id] || 0) + 1
    if (!collabUsers[c.project_id]) collabUsers[c.project_id] = []
    collabUsers[c.project_id].push(c.user_id)
    userIds.add(c.user_id)
  }

  let profilesById: Record<string, any> = {}
  if (userIds.size > 0) {
    const { data: profiles } = await db
      .from('profiles')
      .select('id, name, email, avatar_url')
      .in('id', [...userIds])
    profilesById = Object.fromEntries((profiles || []).map((p: any) => [p.id, p]))
  }

  const collaboratorsByProject: Record<string, any[]> = {}
  for (const pid of Object.keys(collabUsers)) {
    collaboratorsByProject[pid] = (collabUsers[pid] || []).map(uid => profilesById[uid]).filter(Boolean)
  }

  return NextResponse.json(enriched.map(p => ({ ...p, collaboratorCount: collabMap[p.id] || 0, collaborators: collaboratorsByProject[p.id] || [] })))
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
