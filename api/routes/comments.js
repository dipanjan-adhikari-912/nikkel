import { Router } from 'express'
import { db } from '../db/client.js'

const router = Router()

router.post('/', async (req, res) => {
  try {
    const { nikkelId, text: body, authorName, authorEmail } = req.body
    if (!nikkelId || !body || !authorName) {
      return res.status(400).json({ error: 'nikkelId, text, and authorName are required' })
    }

    const { data, error } = await db
      .from('replies')
      .insert({ nikkel_id: nikkelId, body, author_name: authorName, author_email: authorEmail || null, is_client: true })
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })
    res.status(201).json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
