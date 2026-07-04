import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/server/supabase'
import { requireAuth } from '@/lib/server/auth'

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if ('error' in auth) return auth.error

  try {
    const { webhookUrl } = await request.json()
    if (!webhookUrl) return NextResponse.json({ error: 'webhookUrl is required' }, { status: 400 })

    const { data, error } = await db
      .from('integrations')
      .upsert({ org_id: auth.profile?.org_id, type: 'slack', credentials: { webhookUrl } }, { onConflict: 'org_id, type' })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
