import { db } from '../db/client.js'

export async function enqueueNikkel(nikkelId) {
  const { error } = await db.rpc('pg_notify', {
    channel: 'nikkel_created',
    payload: JSON.stringify({ nikkelId })
  })
  if (error) console.error('Failed to enqueue nikkel:', error.message)
}

export async function startAgentWorker() {
  console.log('Agent worker: pg_notify listener mode active')
  console.log('Note: For production, use a dedicated worker process with LISTEN/NOTIFY via pg connection')
}
