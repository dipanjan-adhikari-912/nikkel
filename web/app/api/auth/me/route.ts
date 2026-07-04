import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/server/auth'

export async function GET(request: Request) {
  const auth = await requireAuth(request)
  if ('error' in auth) return auth.error

  return NextResponse.json({ user: { id: auth.user.id, email: auth.user.email }, profile: auth.profile })
}
