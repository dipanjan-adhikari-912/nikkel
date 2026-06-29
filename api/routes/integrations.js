import { Router } from 'express'
import { db } from '../db/client.js'
import { requireAuth } from '../middleware/auth.js'
import { pushToJira } from '../services/jira.js'
import { pushToAsana } from '../services/asana.js'

const router = Router()

router.post('/slack/connect', requireAuth, async (req, res) => {
  try {
    const { webhookUrl } = req.body
    if (!webhookUrl) return res.status(400).json({ error: 'webhookUrl is required' })

    const { data, error } = await db
      .from('integrations')
      .upsert({
        org_id: req.profile.org_id,
        type: 'slack',
        credentials: { webhookUrl }
      }, { onConflict: 'org_id, type' })
      .select()
      .single()
    if (error) return res.status(500).json({ error: error.message })
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/jira/connect', requireAuth, async (req, res) => {
  try {
    const { domain, email, apiToken, projectKey } = req.body
    if (!domain || !email || !apiToken || !projectKey) {
      return res.status(400).json({ error: 'domain, email, apiToken, and projectKey are required' })
    }

    const { data, error } = await db
      .from('integrations')
      .upsert({
        org_id: req.profile.org_id,
        type: 'jira',
        credentials: { domain, email, apiToken, projectKey }
      }, { onConflict: 'org_id, type' })
      .select()
      .single()
    if (error) return res.status(500).json({ error: error.message })
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/asana/connect', requireAuth, async (req, res) => {
  try {
    const { accessToken, projectId } = req.body
    if (!accessToken || !projectId) {
      return res.status(400).json({ error: 'accessToken and projectId are required' })
    }

    const { data, error } = await db
      .from('integrations')
      .upsert({
        org_id: req.profile.org_id,
        type: 'asana',
        credentials: { accessToken, projectId }
      }, { onConflict: 'org_id, type' })
      .select()
      .single()
    if (error) return res.status(500).json({ error: error.message })
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/jira/push/:nikkelId', requireAuth, async (req, res) => {
  try {
    const { data: nikkel, error } = await db
      .from('nikkels')
      .select('*, projects!inner(*)')
      .eq('id', req.params.nikkelId)
      .single()
    if (error) return res.status(404).json({ error: 'Nikkel not found' })

    const issueId = await pushToJira(nikkel)
    await db.from('nikkels').update({ jira_issue_id: issueId }).eq('id', nikkel.id)
    res.json({ jira_issue_id: issueId })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/asana/push/:nikkelId', requireAuth, async (req, res) => {
  try {
    const { data: nikkel, error } = await db
      .from('nikkels')
      .select('*, projects!inner(*)')
      .eq('id', req.params.nikkelId)
      .single()
    if (error) return res.status(404).json({ error: 'Nikkel not found' })

    const taskId = await pushToAsana(nikkel)
    await db.from('nikkels').update({ asana_task_id: taskId }).eq('id', nikkel.id)
    res.json({ asana_task_id: taskId })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
