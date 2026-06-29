import { db } from '../db/client.js'

export async function pushToJira(nikkel) {
  const { data: integration } = await db
    .from('integrations')
    .select('credentials')
    .eq('org_id', nikkel.org_id)
    .eq('type', 'jira')
    .single()

  if (!integration) throw new Error('Jira integration not configured')

  const { domain, email, apiToken, projectKey } = integration.credentials
  const auth = Buffer.from(`${email}:${apiToken}`).toString('base64')

  const body = {
    fields: {
      project: { key: projectKey },
      summary: nikkel.ticket_title || nikkel.comment_text,
      description: nikkel.ticket_description || nikkel.comment_text,
      issuetype: { name: 'Task' }
    }
  }

  const response = await fetch(`https://${domain}/rest/api/3/issue`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Jira push failed: ${text}`)
  }

  const data = await response.json()
  return data.id
}
