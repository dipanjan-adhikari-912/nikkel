import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/server/supabase'
import { requireAuth } from '@/lib/server/auth'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(request)
  if ('error' in auth) return auth.error

  const { data: reviews } = await db
    .from('reviews')
    .select('id')
    .eq('project_id', params.id)

  if (!reviews || reviews.length === 0) return NextResponse.json([])

  const reviewIds = reviews.map((r: any) => r.id)
  const { data, error } = await db
    .from('nikkels')
    .select('*, replies(*)')
    .in('review_id', reviewIds)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
