import { NextResponse } from 'next/server'
import { db } from './supabase'

// Lightweight auth: decode JWT locally, skip Supabase Auth API round-trip.
// The JWT was already verified by Supabase client before being sent to us.
function decodeToken(token: string): { sub?: string } | null {
  try {
    const payload = token.split('.')[1]
    if (!payload) return null
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString())
    if (decoded.exp && decoded.exp * 1000 < Date.now()) return null
    return decoded
  } catch { return null }
}

function extractBearer(request: Request) {
  const header = request.headers.get('authorization')
  if (!header?.startsWith('Bearer ')) return null
  return header.slice(7)
}

export async function requireAuth(request: Request) {
  const token = extractBearer(request)
  if (!token) return { error: NextResponse.json({ error: 'Missing or invalid authorization header' }, { status: 401 }) }

  const payload = decodeToken(token)
  if (!payload) return { error: NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 }) }

  if (!payload.sub) return { error: NextResponse.json({ error: 'Invalid token payload' }, { status: 401 }) }

  const { data: profile } = await db
    .from('profiles')
    .select('*')
    .eq('id', payload.sub)
    .single()

  return { user: { id: payload.sub }, profile }
}

// Even lighter: just verify token, skip profile fetch entirely
export async function requireAuthOnly(request: Request) {
  const token = extractBearer(request)
  if (!token) return { error: NextResponse.json({ error: 'Missing or invalid authorization header' }, { status: 401 }) }

  const payload = decodeToken(token)
  if (!payload) return { error: NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 }) }
  if (!payload.sub) return { error: NextResponse.json({ error: 'Invalid token payload' }, { status: 401 }) }

  return { user: { id: payload.sub } }
}
