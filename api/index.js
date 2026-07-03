import 'dotenv/config'
import express from 'express'
import cors from 'cors'

import authRoutes from './routes/auth.js'
import projectRoutes from './routes/projects.js'
import nikkelRoutes from './routes/nikkels.js'
import boardRoutes from './routes/board.js'
import integrationRoutes from './routes/integrations.js'
import commentRoutes from './routes/comments.js'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json({ limit: '10mb' }))

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.use('/auth', authRoutes)
app.use('/projects', projectRoutes)
app.use('/', nikkelRoutes)
app.use('/board', boardRoutes)
app.use('/integrations', integrationRoutes)
app.use('/comments', commentRoutes)

app.listen(PORT, () => {
  console.log(`Nikkel API running on port ${PORT}`)
})
