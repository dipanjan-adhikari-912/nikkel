import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/server/supabase'
import { requireAuth } from '@/lib/server/auth'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(request)
  if ('error' in auth) return auth.error

  const { data, error } = await db
    .from('nikkels')
    .select('*, replies(*)')
    .eq('id', params.id)
    .single()

  if (error) return NextResponse.json({ error: 'Nikkel not found' }, { status: 404 })
  return NextResponse.json(data)
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(request)
  if ('error' in auth) return auth.error

  const body = await request.json()
  const patch: Record<string, unknown> = {}
  if ('status' in body) {
    if (!['under_review', 'in_progress', 'resolved', 'not_considered'].includes(body.status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }
    patch.status = body.status
  }
  if ('severity' in body) {
    if (!['low', 'medium', 'high'].includes(body.severity)) {
      return NextResponse.json({ error: 'Invalid severity' }, { status: 400 })
    }
    patch.severity = body.severity
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const { data, error } = await db
    .from('nikkels')
    .update(patch)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(request)
  if ('error' in auth) return auth.error

  const { error } = await db.from('nikkels').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ message: 'Nikkel deleted' })
}
