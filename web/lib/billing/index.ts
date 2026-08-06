// Single switch point for billing providers. To migrate (e.g. Paddle → Lemon Squeezy),
// change this one line and nothing else.

import { paddleProvider } from './providers/paddle'
import { lemonSqueezyProvider } from './providers/lemonsqueezy'

export const activeProvider = paddleProvider

export type { BillingProvider, NormalizedSubscriptionEvent, BillingPlan, BillingInterval, BillingStatus } from './types'
export { lemonSqueezyProvider }
