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
      .eq('type', 'jira')
      .single()

    if (!integration) return NextResponse.json({ error: 'Jira integration not configured' }, { status: 400 })

    const { domain, email, apiToken, projectKey } = integration.credentials as any
    const auth64 = Buffer.from(`${email}:${apiToken}`).toString('base64')

    const response = await fetch(`https://${domain}/rest/api/3/issue`, {
      method: 'POST',
      headers: { 'Authorization': `Basic ${auth64}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          project: { key: projectKey },
          summary: (nikkel as any).ticket_title || (nikkel as any).comment_text,
          description: (nikkel as any).ticket_description || (nikkel as any).comment_text,
          issuetype: { name: 'Task' }
        }
      })
    })

    if (!response.ok) {
      const text = await response.text()
      return NextResponse.json({ error: `Jira push failed: ${text}` }, { status: 500 })
    }

    const data = await response.json()
    await db.from('nikkels').update({ jira_issue_id: data.id }).eq('id', params.nikkelId)
    return NextResponse.json({ jira_issue_id: data.id })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
