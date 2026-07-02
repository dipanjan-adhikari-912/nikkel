import { Router } from 'express'
import { db } from '../db/client.js'
import { requireAuth } from '../middleware/auth.js'
import { enqueueNikkel } from '../services/queue.js'
import { uploadScreenshot } from '../services/storage.js'

const router = Router()

router.get('/reviews/:reviewId/nikkels', requireAuth, async (req, res) => {
  try {
    const { data, error } = await db
      .from('nikkels')
      .select('*, replies(*)')
      .eq('review_id', req.params.reviewId)
      .order('created_at', { ascending: false })
    if (error) return res.status(500).json({ error: error.message })
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/reviews/:reviewId/nikkels', requireAuth, async (req, res) => {
  try {
    const { pageUrl, selector, coordX, coordY, elementTag, elementText, commentText, screenshotBase64 } = req.body
    if (!pageUrl || !commentText) {
      return res.status(400).json({ error: 'pageUrl and commentText are required' })
    }

    let screenshotUrl = null
    if (screenshotBase64) {
      screenshotUrl = await uploadScreenshot(screenshotBase64)
    }

    const { data, error } = await db
      .from('nikkels')
      .insert({
        review_id: req.params.reviewId,
        page_url: pageUrl,
        selector,
        coord_x: coordX,
        coord_y: coordY,
        element_tag: elementTag,
        element_text: elementText,
        comment_text: commentText,
        screenshot_url: screenshotUrl,
        author_id: req.user.id,
        author_name: req.profile?.full_name || 'Anonymous'
      })
      .select()
      .single()
    if (error) return res.status(500).json({ error: error.message })

    enqueueNikkel(data.id).catch(console.error)

    res.status(201).json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Backward-compatible: get nikkels for a project (resolves through reviews)
router.get('/projects/:projectId/nikkels', requireAuth, async (req, res) => {
  try {
    const { data: reviews } = await db
      .from('reviews')
      .select('id')
      .eq('project_id', req.params.projectId)

    if (!reviews || reviews.length === 0) return res.json([])

    const reviewIds = reviews.map(r => r.id)
    const { data, error } = await db
      .from('nikkels')
      .select('*, replies(*)')
      .in('review_id', reviewIds)
      .order('created_at', { ascending: false })

    if (error) return res.status(500).json({ error: error.message })
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/nikkels/:id', requireAuth, async (req, res) => {
  try {
    const { data, error } = await db
      .from('nikkels')
      .select('*, replies(*)')
      .eq('id', req.params.id)
      .single()
    if (error) return res.status(404).json({ error: 'Nikkel not found' })
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.patch('/nikkels/:id', requireAuth, async (req, res) => {
  try {
    const { status } = req.body
    if (!status) return res.status(400).json({ error: 'status is required' })
    if (!['open', 'in_progress', 'resolved'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' })
    }

    const { data, error } = await db
      .from('nikkels')
      .update({ status })
      .eq('id', req.params.id)
      .select()
      .single()
    if (error) return res.status(500).json({ error: error.message })
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.delete('/nikkels/:id', requireAuth, async (req, res) => {
  try {
    const { error } = await db
      .from('nikkels')
      .delete()
      .eq('id', req.params.id)
    if (error) return res.status(500).json({ error: error.message })
    res.json({ message: 'Nikkel deleted' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/nikkels/:id/replies', requireAuth, async (req, res) => {
  try {
    const { data, error } = await db
      .from('replies')
      .select('*')
      .eq('nikkel_id', req.params.id)
      .order('created_at', { ascending: true })
    if (error) return res.status(500).json({ error: error.message })
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/nikkels/:id/replies', requireAuth, async (req, res) => {
  try {
    const { authorName, authorEmail, text } = req.body
    if (!authorName || !text) {
      return res.status(400).json({ error: 'authorName and text are required' })
    }

    const { data, error } = await db
      .from('replies')
      .insert({
        nikkel_id: req.params.id,
        author_name: authorName,
        author_email: authorEmail,
        text,
        is_client: false
      })
      .select()
      .single()
    if (error) return res.status(500).json({ error: error.message })
    res.status(201).json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
