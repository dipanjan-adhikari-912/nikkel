// Paddle provider — implements BillingProvider using only Node's built-in crypto module.
// v2 webhooks: Paddle-Signature header is `ts=<unix>;h1=<hex>`, computed over `<ts>:<raw body>`
// with the webhook secret. Signature must be verified against the RAW body (before JSON parsing).

import { createHmac, timingSafeEqual } from 'crypto'
import type { BillingProvider, NormalizedSubscriptionEvent, BillingPlan, BillingInterval } from '../types'

const PRICE_ID_ENV: Record<string, string> = {
  'pro:monthly': 'PADDLE_PRICE_PRO_MONTHLY',
  'pro:yearly': 'PADDLE_PRICE_PRO_YEARLY',
  'team:monthly': 'PADDLE_PRICE_TEAM_MONTHLY',
  'team:yearly': 'PADDLE_PRICE_TEAM_YEARLY',
}

const PADDLE_STATUS_MAP: Record<string, NormalizedSubscriptionEvent['status']> = {
  active: 'active',
  trialing: 'trialing',
  past_due: 'past_due',
  paused: 'paused',
  canceled: 'cancelled',
  expired: 'expired',
}

export const paddleProvider: BillingProvider = {
  verifyWebhook(rawBody: string, headers: Record<string, string | undefined>): boolean {
    const signature = headers['paddle-signature']
    if (!signature) return false
    const parts: Record<string, string> = {}
    for (const pair of signature.split(';')) {
      const [k, ...rest] = pair.split('=')
      if (k) parts[k] = rest.join('=')
    }
    const ts = parts['ts']
    const h1 = parts['h1']
    if (!ts || !h1) return false

    const secret = process.env.PADDLE_WEBHOOK_SECRET
    if (!secret) return false

    const expected = createHmac('sha256', secret).update(`${ts}:${rawBody}`).digest('hex')
    const a = Buffer.from(expected, 'hex')
    const b = Buffer.from(h1, 'hex')
    // timingSafeEqual requires equal length; pad both to a fixed buffer so a length mismatch
    // can't short-circuit the comparison.
    const len = Math.max(a.length, b.length)
    const ab = Buffer.alloc(len, a)
    const bb = Buffer.alloc(len, b)
    return timingSafeEqual(ab, bb)
  },

  parseEvent(payload: unknown): NormalizedSubscriptionEvent | null {
    const event = payload as {
      event_type?: string
      data?: {
        id?: string
        status?: string
        custom_data?: { supabase_user_id?: string }
        items?: { price?: { id?: string } | null; quantity?: number }[]
        current_billing_period?: { ends_at?: string } | null
      }
    }
    const type = event?.event_type || ''
    if (!type.startsWith('subscription.')) return null

    const data = event.data
    if (!data) return null

    const status = PADDLE_STATUS_MAP[data.status || '']
    if (!status) return null

    const userId = data.custom_data?.supabase_user_id
    // No way to attribute the subscription to a user — skip the write (webhook route responds 2xx).
    if (!userId) return null

    const priceId = data.items?.[0]?.price?.id || null
    const plan = priceIdToPlan(priceId)
    if (!plan) return null

    return {
      userId,
      plan,
      status,
      customerId: null, // Paddle has no customer object in subscription events; not tracked
      subscriptionId: data.id || null,
      currentPeriodEnd: data.current_billing_period?.ends_at || null,
      seats: Math.max(1, data.items?.[0]?.quantity || 1),
    }
  },

  getPriceId(plan: BillingPlan, interval: BillingInterval): string | null {
    const envName = PRICE_ID_ENV[`${plan}:${interval}`]
    return envName ? process.env[envName] || null : null
  },
}

function priceIdToPlan(priceId: string | null): BillingPlan | null {
  if (!priceId) return null
  for (const [key, envName] of Object.entries(PRICE_ID_ENV)) {
    if (process.env[envName] === priceId) return key.split(':')[0] as BillingPlan
  }
  return null
}
