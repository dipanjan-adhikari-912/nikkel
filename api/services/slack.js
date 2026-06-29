import { db } from '../db/client.js'

export async function notifySlack(nikkel, agentResult) {
  try {
    const { data: integration } = await db
      .from('integrations')
      .select('credentials')
      .eq('org_id', nikkel.org_id)
      .eq('type', 'slack')
      .single()

    if (!integration) return

    const webhookUrl = integration.credentials.webhookUrl
    if (!webhookUrl) return

    const payload = {
      text: `*New Nikkel: ${agentResult?.ticket_title || nikkel.comment_text}*\n` +
            `Page: ${nikkel.page_url}\n` +
            `Severity: ${agentResult?.severity || 'pending'}\n` +
            `Classification: ${agentResult?.classification || 'pending'}`
    }

    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
  } catch (err) {
    console.error('Slack notification failed:', err.message)
  }
}
