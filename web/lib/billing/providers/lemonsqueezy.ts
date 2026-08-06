// Lemon Squeezy provider — STUB, not active. Exists only to prove BillingProvider generalizes.
// TODO when migrating: set the variant IDs for pro/team (monthly/yearly) as env vars, e.g.
//   LEMON_VARIANT_PRO_MONTHLY, LEMON_VARIANT_PRO_YEARLY, LEMON_VARIANT_TEAM_MONTHLY, LEMON_VARIANT_TEAM_YEARLY
// and resolve them in getPriceId below. Signature is the raw-body HMAC in the `x-signature` header.

import type { BillingProvider, NormalizedSubscriptionEvent, BillingPlan, BillingInterval } from '../types'

const VARIANT_ENV: Record<string, string> = {
  'pro:monthly': 'LEMON_VARIANT_PRO_MONTHLY',
  'pro:yearly': 'LEMON_VARIANT_PRO_YEARLY',
  'team:monthly': 'LEMON_VARIANT_TEAM_MONTHLY',
  'team:yearly': 'LEMON_VARIANT_TEAM_YEARLY',
}

export const lemonSqueezyProvider: BillingProvider = {
  verifyWebhook(rawBody: string, headers: Record<string, string | undefined>): boolean {
    // TODO: verify HMAC-SHA256 over rawBody with process.env.LEMON_SQUEEZY_SIGNING_SECRET,
    // comparing against headers['x-signature'].
    void rawBody
    void headers
    return false
  },

  parseEvent(payload: unknown): NormalizedSubscriptionEvent | null {
    // TODO: handle subscription_created / subscription_updated / subscription_cancelled / subscription_paused.
    void payload
    return null
  },

  getPriceId(plan: BillingPlan, interval: BillingInterval): string | null {
    const envName = VARIANT_ENV[`${plan}:${interval}`]
    return envName ? process.env[envName] || null : null
  },
}
