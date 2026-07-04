import { NextResponse } from 'next/server'
import { db } from './supabase'

export async function requireAuth(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: NextResponse.json({ error: 'Missing or invalid authorization header' }, { status: 401 }) }
  }

  const token = authHeader.slice(7)
  const { data: { user }, error } = await db.auth.getUser(token)

  if (error || !user) {
    return { error: NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 }) }
  }

  const { data: profile } = await db
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return { user, profile }
}
