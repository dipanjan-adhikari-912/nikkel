import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/server/supabase'
import { requireAuth } from '@/lib/server/auth'

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if ('error' in auth) return auth.error

  const { data, error } = await db
    .from('projects')
    .select('*')
    .eq('owner_id', auth.user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if ('error' in auth) return auth.error

  const { title, baseUrl } = await request.json()
  if (!title || !baseUrl) {
    return NextResponse.json({ error: 'title and baseUrl are required' }, { status: 400 })
  }

  const { data, error } = await db
    .from('projects')
    .insert({ owner_id: auth.user.id, title, base_url: baseUrl })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
