import { Router } from 'express'
import { db } from '../db/client.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// Get project by share token (public, no auth required)
router.get('/share/:shareId', async (req, res) => {
  try {
    const { data: project, error: projectError } = await db
      .from('projects')
      .select('*')
      .eq('share_token', req.params.shareId)
      .single()

    if (projectError || !project) {
      return res.status(404).json({ error: 'Project not found' })
    }

    const { data: reviews, error: reviewsError } = await db
      .from('reviews')
      .select('id')
      .eq('project_id', project.id)

    if (reviewsError) {
      return res.status(500).json({ error: reviewsError.message })
    }

    const reviewIds = (reviews || []).map(r => r.id)
    let pinCount = 0
    let collaboratorIds = new Set()

    if (reviewIds.length > 0) {
      const { data: nikkels, error: nikkelError } = await db
        .from('nikkels')
        .select('id, owner_id')
        .in('review_id', reviewIds)

      if (!nikkelError && nikkels) {
        pinCount = nikkels.length
        nikkels.forEach(n => { if (n.owner_id) collaboratorIds.add(n.owner_id) })
      }
    }

    res.json({
      id: project.id,
      name: project.title,
      url: project.base_url,
      shareToken: project.share_token,
      collaboratorCount: collaboratorIds.size + 1,
      pinCount,
      commentCount: pinCount,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/', requireAuth, async (req, res) => {
  try {
    const { data, error } = await db
      .from('projects')
      .select('*')
      .eq('org_id', req.profile.org_id)
      .order('created_at', { ascending: false })
    if (error) return res.status(500).json({ error: error.message })
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/', requireAuth, async (req, res) => {
  try {
    const { name, url } = req.body
    if (!name || !url) {
      return res.status(400).json({ error: 'name and url are required' })
    }

    const { data, error } = await db
      .from('projects')
      .insert({ org_id: req.profile.org_id, name, url })
      .select()
      .single()
    if (error) return res.status(500).json({ error: error.message })
    res.status(201).json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { data: project, error } = await db
      .from('projects')
      .select('*')
      .eq('id', req.params.id)
      .eq('org_id', req.profile.org_id)
      .single()
    if (error) return res.status(404).json({ error: 'Project not found' })

    const { data: reviews, error: reviewsError } = await db
      .from('reviews')
      .select('id')
      .eq('project_id', req.params.id)

    if (reviewsError) return res.status(500).json({ error: reviewsError.message })

    const reviewIds = (reviews || []).map(r => r.id)
    let summary = { total: 0, open: 0, in_progress: 0, resolved: 0 }

    if (reviewIds.length > 0) {
      const { data: nikkels, error: nikkelError } = await db
        .from('nikkels')
        .select('status')
        .in('review_id', reviewIds)

      if (!nikkelError) {
        summary = {
          total: nikkels.length,
          open: nikkels.filter(n => n.status === 'open').length,
          in_progress: nikkels.filter(n => n.status === 'in_progress').length,
          resolved: nikkels.filter(n => n.status === 'resolved').length
        }
      }
    }

    res.json({ ...project, summary })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { error } = await db
      .from('projects')
      .delete()
      .eq('id', req.params.id)
      .eq('org_id', req.profile.org_id)
    if (error) return res.status(500).json({ error: error.message })
    res.json({ message: 'Project deleted' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
