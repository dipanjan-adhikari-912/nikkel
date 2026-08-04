import { NextResponse } from 'next/server'
import { db } from './supabase'

const SUPABASE_URL = process.env.SUPABASE_URL || ''
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || ''

// Verify the JWT against Supabase Auth instead of trusting an unverified base64 decode.
// The /auth/v1/user endpoint rejects expired, tampered, or forged tokens.
async function verifyToken(token: string): Promise<Record<string, any> | null> {
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${token}`,
      },
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

function extractBearer(request: Request) {
  const header = request.headers.get('authorization')
  if (!header?.startsWith('Bearer ')) return null
  return header.slice(7)
}

export async function requireAuth(request: Request) {
  const token = extractBearer(request)
  if (!token) return { error: NextResponse.json({ error: 'Missing or invalid authorization header' }, { status: 401 }) }

  const user = await verifyToken(token)
  if (!user?.id) return { error: NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 }) }

  const { data: profile } = await db
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return {
    token,
    user: { id: user.id, email: user.email || '', is_anonymous: !!user.app_metadata?.is_anonymous },
    profile,
  }
}

// Even lighter: just verify the token, skip profile fetch entirely
export async function requireAuthOnly(request: Request) {
  const token = extractBearer(request)
  if (!token) return { error: NextResponse.json({ error: 'Missing or invalid authorization header' }, { status: 401 }) }

  const user = await verifyToken(token)
  if (!user?.id) return { error: NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 }) }

  return { token, user: { id: user.id, email: user.email || '', is_anonymous: !!user.app_metadata?.is_anonymous } }
}
