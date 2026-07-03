import { Router } from 'express'
import { db } from '../db/client.js'

const router = Router()

// Get board data by review share token (public)
router.get('/:shareToken', async (req, res) => {
  try {
    // Try to find a review by share_token
    const { data: review, error: reviewError } = await db
      .from('reviews')
      .select('*, projects(*)')
      .eq('share_token', req.params.shareToken)
      .single()

    if (reviewError || !review) {
      // Fallback: try project share_token, use its first review
      const { data: project } = await db
        .from('projects')
        .select('*')
        .eq('share_token', req.params.shareToken)
        .single()

      if (!project) return res.status(404).json({ error: 'Board not found' })

      const { data: fallbackReview } = await db
        .from('reviews')
        .select('*')
        .eq('project_id', project.id)
        .limit(1)
        .single()

      if (!fallbackReview) return res.status(404).json({ error: 'No review found for this project' })

      // Re-fetch with full data
      const { data: fullReview } = await db
        .from('reviews')
        .select('*, projects(*)')
        .eq('id', fallbackReview.id)
        .single()

      if (!fullReview) return res.status(404).json({ error: 'Review not found' })

      const { data: nikkels, error: nikkelError } = await db
        .from('nikkels')
        .select('*')
        .eq('review_id', fullReview.id)
        .order('created_at', { ascending: true })

      if (nikkelError) return res.status(500).json({ error: nikkelError.message })

      return res.json({ review: fullReview, project: fullReview.projects, nikkels: nikkels || [] })
    }

    const { data: nikkels, error: nikkelError } = await db
      .from('nikkels')
      .select('*')
      .eq('review_id', review.id)
      .order('created_at', { ascending: true })

    if (nikkelError) return res.status(500).json({ error: nikkelError.message })

    res.json({ review, project: review.projects, nikkels: nikkels || [] })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/:shareToken/reply', async (req, res) => {
  try {
    const { nikkelId, authorName, authorEmail, text: body } = req.body
    if (!nikkelId || !authorName || !body) {
      return res.status(400).json({ error: 'nikkelId, authorName, and text are required' })
    }

    const { data: review, error: reviewError } = await db
      .from('reviews')
      .select('id')
      .eq('share_token', req.params.shareToken)
      .single()

    if (reviewError || !review) {
      return res.status(404).json({ error: 'Board not found' })
    }

    const { data: nikkel, error: nikkelError } = await db
      .from('nikkels')
      .select('id, review_id')
      .eq('id', nikkelId)
      .single()

    if (nikkelError || nikkel.review_id !== review.id) {
      return res.status(404).json({ error: 'Nikkel not found in this review' })
    }

    const { data, error } = await db
      .from('replies')
      .insert({
        nikkel_id: nikkelId,
        author_name: authorName,
        author_email: authorEmail,
        body,
        is_client: true
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
