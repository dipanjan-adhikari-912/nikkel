import { NextRequest, NextResponse } from 'next/server'

// In-memory sliding-window limiter. Fine for single Vercel instance; once
// deployed to multiple regions, move to Upstash/Vercel KV.
const buckets = new Map<string, { count: number; resetAt: number }>()

export function rateLimit(
  request: NextRequest,
  opts: { limit?: number; windowMs?: number; key?: string } = {}
): NextResponse | null {
  const { limit = 20, windowMs = 60_000, key = 'rl' } = opts
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  const k = `${key}:${ip}`

  const now = Date.now()
  let bucket = buckets.get(k)
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + windowMs }
    buckets.set(k, bucket)
  }
  bucket.count++
  if (bucket.count > limit) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }
  return null
}
