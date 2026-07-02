import { Router } from 'express'
import { db } from '../db/client.js'

const router = Router()

router.get('/:shareToken', async (req, res) => {
  try {
    const { data: project, error: projectError } = await db
      .from('projects')
      .select('*')
      .eq('share_token', req.params.shareToken)
      .single()
    if (projectError) return res.status(404).json({ error: 'Board not found' })

    const { data: nikkels, error: nikkelError } = await db
      .from('nikkels')
      .select('*, replies(*)')
      .eq('project_id', project.id)
      .order('created_at', { ascending: false })
    if (nikkelError) return res.status(500).json({ error: nikkelError.message })

    res.json({ project, nikkels })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/:shareToken/reply', async (req, res) => {
  try {
    const { nikkelId, authorName, authorEmail, text } = req.body
    if (!nikkelId || !authorName || !text) {
      return res.status(400).json({ error: 'nikkelId, authorName, and text are required' })
    }

    const { data: project, error: projectError } = await db
      .from('projects')
      .select('id')
      .eq('share_token', req.params.shareToken)
      .single()
    if (projectError) return res.status(404).json({ error: 'Board not found' })

    const { data: nikkel, error: nikkelError } = await db
      .from('nikkels')
      .select('id, project_id')
      .eq('id', nikkelId)
      .single()
    if (nikkelError || nikkel.project_id !== project.id) {
      return res.status(404).json({ error: 'Nikkel not found in this project' })
    }

    const { data, error } = await db
      .from('replies')
      .insert({
        nikkel_id: nikkelId,
        author_name: authorName,
        author_email: authorEmail,
        text,
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
