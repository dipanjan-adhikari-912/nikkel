import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/server/supabase'

export async function GET(request: NextRequest, { params }: { params: { shareId: string } }) {
  try {
    const { data: project, error: projectError } = await db
      .from('projects')
      .select('*')
      .eq('share_token', params.shareId)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const { data: reviews } = await db
      .from('reviews')
      .select('id')
      .eq('project_id', project.id)

    const reviewIds = (reviews || []).map((r: any) => r.id)
    let pinCount = 0
    const collaboratorIds = new Set<string>()

    if (reviewIds.length > 0) {
      const { data: nikkels } = await db
        .from('nikkels')
        .select('id, owner_id')
        .in('review_id', reviewIds)

      if (nikkels) {
        pinCount = nikkels.length
        nikkels.forEach((n: any) => { if (n.owner_id) collaboratorIds.add(n.owner_id) })
      }
    }

    return NextResponse.json({
      id: project.id,
      name: project.title,
      url: project.base_url,
      shareToken: project.share_token,
      collaboratorCount: collaboratorIds.size + 1,
      pinCount,
      commentCount: pinCount,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
