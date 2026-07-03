import { Router } from 'express'
import { db } from '../db/client.js'

const router = Router()

// Get review by share token (public)
router.get('/:shareToken', async (req, res) => {
  try {
    const { data: review, error: reviewError } = await db
      .from('reviews')
      .select('*, projects(*)')
      .eq('share_token', req.params.shareToken)
      .single()

    if (reviewError || !review) {
      return res.status(404).json({ error: 'Review not found' })
    }

    if (review.visibility === 'private') {
      // Could add auth check here later
      return res.status(403).json({ error: 'Review is private' })
    }

    // Get nikkels for the review
    const { data: nikkels, error: nikkelError } = await db
      .from('nikkels')
      .select('*')
      .eq('review_id', review.id)
      .order('created_at', { ascending: true })

    if (nikkelError) {
      return res.status(500).json({ error: nikkelError.message })
    }

    res.json({ 
      review,
      project: review.projects,
      nikkels: nikkels || []
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Create review (authenticated)
router.post('/', async (req, res) => {
  try {
    const { project_id, visibility = 'public' } = req.body
    
    if (!project_id) {
      return res.status(400).json({ error: 'project_id is required' })
    }

    // Get user from auth header
    const authHeader = req.headers.authorization
    if (!authHeader) {
      return res.status(401).json({ error: 'Authorization required' })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await db.auth.getUser(token)
    
    if (userError || !user) {
      return res.status(401).json({ error: 'Invalid token' })
    }

    // Check if review already exists for this project
    const { data: existingReview } = await db
      .from('reviews')
      .select('*')
      .eq('project_id', project_id)
      .single()

    if (existingReview) {
      return res.json({ review: existingReview })
    }

    // Create new review
    const { data: review, error } = await db
      .from('reviews')
      .insert({
        project_id,
        owner_id: user.id,
        visibility
      })
      .select()
      .single()

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    res.status(201).json({ review })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Update review visibility (authenticated owner)
router.patch('/:shareToken', async (req, res) => {
  try {
    const { visibility } = req.body
    const { shareToken } = req.params

    const authHeader = req.headers.authorization
    if (!authHeader) {
      return res.status(401).json({ error: 'Authorization required' })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await db.auth.getUser(token)
    
    if (userError || !user) {
      return res.status(401).json({ error: 'Invalid token' })
    }

    const { data: review, error } = await db
      .from('reviews')
      .update({ visibility })
      .eq('share_token', shareToken)
      .eq('owner_id', user.id)
      .select()
      .single()

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    if (!review) {
      return res.status(404).json({ error: 'Review not found or not authorized' })
    }

    res.json({ review })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router