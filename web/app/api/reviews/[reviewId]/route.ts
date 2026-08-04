import { NextRequest, NextResponse } from 'next/server'
import { userDb } from '@/lib/server/supabase'
import { requireAuth } from '@/lib/server/auth'

export async function POST(request: NextRequest, { params }: { params: { reviewId: string } }) {
  const auth = await requireAuth(request)
  if ('error' in auth) return auth.error

  const { newOwnerId } = await request.json()
  if (!newOwnerId) {
    return NextResponse.json({ error: 'newOwnerId is required' }, { status: 400 })
  }

  const sdb = userDb(auth.token)
  const { data: review, error: findError } = await sdb
    .from('reviews')
    .select('owner_id')
    .eq('id', params.reviewId)
    .single()

  if (findError || !review) {
    return NextResponse.json({ error: 'Review not found' }, { status: 404 })
  }

  if (review.owner_id !== auth.user.id) {
    return NextResponse.json({ error: 'You do not own this review' }, { status: 403 })
  }

  const { error: updateError } = await sdb
    .from('reviews')
    .update({ owner_id: newOwnerId })
    .eq('id', params.reviewId)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
