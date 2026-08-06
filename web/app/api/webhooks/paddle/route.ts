import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { activeProvider } from '@/lib/billing'

// Paddle webhook handler. Reads the RAW text body before any JSON parsing (frameworks that
// parse first break Paddle's signature check). Calls only the active provider's methods —
// no Paddle field names appear in this file.

export async function POST(request: NextRequest) {
  let raw: string
  try {
    raw = await request.text()
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }

  const headers: Record<string, string | undefined> = {}
  request.headers.forEach((value, key) => { headers[key.toLowerCase()] = value })

  if (!activeProvider.verifyWebhook(raw, headers)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let payload: unknown
  try {
    payload = JSON.parse(raw)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const event = activeProvider.parseEvent(payload)
  // Unknown / unhandled event (e.g. transaction.*) or no attributable user: acknowledge so
  // Paddle stops retrying, but write nothing.
  if (!event) {
    return NextResponse.json({ received: true })
  }

  const now = new Date().toISOString()
  const { error } = await supabaseAdmin.from('subscriptions').upsert(
    {
      user_id: event.userId,
      plan: event.plan,
      provider: 'paddle',
      provider_customer_id: event.customerId,
      provider_subscription_id: event.subscriptionId,
      subscription_status: event.status,
      current_period_end: event.currentPeriodEnd,
      seats: event.seats,
      updated_at: now,
    },
    { onConflict: 'user_id' }
  )

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ received: true })
}