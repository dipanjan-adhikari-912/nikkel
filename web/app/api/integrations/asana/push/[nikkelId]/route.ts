import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/server/supabase'
import { requireAuth } from '@/lib/server/auth'

export async function POST(request: NextRequest, { params }: { params: { nikkelId: string } }) {
  const auth = await requireAuth(request)
  if ('error' in auth) return auth.error

  try {
    const { data: nikkel, error } = await db
      .from('nikkels')
      .select('*, projects!inner(*)')
      .eq('id', params.nikkelId)
      .single()

    if (error) return NextResponse.json({ error: 'Nikkel not found' }, { status: 404 })

    const { data: integration } = await db
      .from('integrations')
      .select('credentials')
      .eq('org_id', (nikkel as any).org_id)
      .eq('type', 'asana')
      .single()

    if (!integration) return NextResponse.json({ error: 'Asana integration not configured' }, { status: 400 })

    const { accessToken, projectId } = integration.credentials as any

    const response = await fetch('https://app.asana.com/api/1.0/tasks', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: {
          projects: [projectId],
          name: (nikkel as any).ticket_title || (nikkel as any).comment_text,
          notes: (nikkel as any).ticket_description || (nikkel as any).comment_text
        }
      })
    })

    if (!response.ok) {
      const text = await response.text()
      return NextResponse.json({ error: `Asana push failed: ${text}` }, { status: 500 })
    }

    const data = await response.json()
    await db.from('nikkels').update({ asana_task_id: data.data.gid }).eq('id', params.nikkelId)
    return NextResponse.json({ asana_task_id: data.data.gid })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
