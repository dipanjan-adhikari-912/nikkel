// Provider-agnostic billing contract. App code depends ONLY on this interface (and on the
// normalized shape it returns) — never on a provider SDK directly. To migrate providers,
// change the single export in lib/billing/index.ts.

export type BillingPlan = 'free' | 'pro' | 'team'
export type BillingInterval = 'monthly' | 'yearly'

export type BillingStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'paused'
  | 'cancelled'
  | 'expired'

export interface NormalizedSubscriptionEvent {
  userId: string
  plan: BillingPlan
  status: BillingStatus
  customerId: string | null
  subscriptionId: string | null
  currentPeriodEnd: string | null
  seats: number
}

export interface BillingProvider {
  /** Verify an incoming webhook. rawBody is the pre-parse text body; computed against the
   *  provider's signature header. Returns true when authentic. */
  verifyWebhook(rawBody: string, headers: Record<string, string | undefined>): boolean
  /** Turn a provider webhook payload into the normalized shape. Returns null for events we
   *  don't care about (e.g. transaction.* or unknown event types). */
  parseEvent(payload: unknown): NormalizedSubscriptionEvent | null
  /** Resolve a plan + billing interval to a provider price ID. Reads from env, never hardcodes. */
  getPriceId(plan: BillingPlan, interval: BillingInterval): string | null
}