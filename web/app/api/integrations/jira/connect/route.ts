import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/server/supabase'
import { requireAuth } from '@/lib/server/auth'

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if ('error' in auth) return auth.error

  try {
    const { domain, email, apiToken, projectKey } = await request.json()
    if (!domain || !email || !apiToken || !projectKey) {
      return NextResponse.json({ error: 'domain, email, apiToken, and projectKey are required' }, { status: 400 })
    }

    const { data, error } = await db
      .from('integrations')
      .upsert({ org_id: auth.profile?.org_id, type: 'jira', credentials: { domain, email, apiToken, projectKey } }, { onConflict: 'org_id, type' })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
