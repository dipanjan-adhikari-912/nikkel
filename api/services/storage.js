import { db } from '../db/client.js'

const BUCKET_NAME = 'screenshots'

export async function uploadScreenshot(base64Data) {
  try {
    const base64String = base64Data.replace(/^data:image\/\w+;base64,/, '')
    const buffer = Buffer.from(base64String, 'base64')
    const filename = `screenshots/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`

    const { data, error } = await db.storage
      .from(BUCKET_NAME)
      .upload(filename, buffer, {
        contentType: 'image/jpeg',
        upsert: false
      })

    if (error) {
      if (error.message?.includes('not configured')) return null
      throw error
    }

    const { data: { publicUrl } } = db.storage
      .from(BUCKET_NAME)
      .getPublicUrl(data.path)

    return publicUrl
  } catch (err) {
    if (err.message?.includes('not configured')) return null
    console.error('Screenshot upload failed:', err.message)
    return null
  }
}
