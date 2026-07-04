import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/server/supabase'
import { requireAuth } from '@/lib/server/auth'

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if ('error' in auth) return auth.error

  try {
    const { accessToken, projectId } = await request.json()
    if (!accessToken || !projectId) {
      return NextResponse.json({ error: 'accessToken and projectId are required' }, { status: 400 })
    }

    const { data, error } = await db
      .from('integrations')
      .upsert({ org_id: auth.profile?.org_id, type: 'asana', credentials: { accessToken, projectId } }, { onConflict: 'org_id, type' })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
