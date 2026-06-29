import { db } from '../db/client.js'

export async function pushToAsana(nikkel) {
  const { data: integration } = await db
    .from('integrations')
    .select('credentials')
    .eq('org_id', nikkel.org_id)
    .eq('type', 'asana')
    .single()

  if (!integration) throw new Error('Asana integration not configured')

  const { accessToken, projectId } = integration.credentials

  const body = {
    data: {
      projects: [projectId],
      name: nikkel.ticket_title || nikkel.comment_text,
      notes: nikkel.ticket_description || nikkel.comment_text
    }
  }

  const response = await fetch('https://app.asana.com/api/1.0/tasks', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Asana push failed: ${text}`)
  }

  const data = await response.json()
  return data.data.gid
}
