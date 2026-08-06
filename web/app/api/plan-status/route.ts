import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/server/auth'
import { userDb } from '@/lib/server/supabase'

// Resolve the caller's current subscription. Never trusts a plan value from the client — the
// caller is authenticated from their Supabase JWT and the row is read from the DB (RLS-scoped).
// This is what the extension calls to check limits; it never talks to Paddle directly.

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if ('error' in auth) return auth.error

  const { data, error } = await userDb(auth.token)
    .from('subscriptions')
    .select('plan, subscription_status, current_period_end, seats')
    .eq('user_id', auth.user.id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (!data) {
    return NextResponse.json({ plan: 'free', subscription_status: null, current_period_end: null, seats: null })
  }

  return NextResponse.json({
    plan: data.plan,
    subscription_status: data.subscription_status,
    current_period_end: data.current_period_end,
    seats: data.seats,
  })
}