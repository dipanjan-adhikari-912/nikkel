// Free-tier limits. Annotations are UNLIMITED on every tier (not gated anywhere). The only
// paywalled resource is project count. A "project" is one website being reviewed
// (a row in the `projects` table). Plan limits say nothing about annotations.

import type { BillingPlan, BillingStatus } from './billing/types'

const LIMITS: Record<BillingPlan, { projects: number; collaboration: boolean }> = {
  free: { projects: 1, collaboration: false },
  pro: { projects: Infinity, collaboration: false },
  team: { projects: Infinity, collaboration: true },
}

// past_due / paused subscriptions drop to the free tier until resolved.
export function effectivePlan(plan: BillingPlan, subscriptionStatus: BillingStatus | null | undefined): BillingPlan {
  if (plan === 'free') return 'free'
  if (subscriptionStatus === 'past_due' || subscriptionStatus === 'paused') return 'free'
  return plan
}

export function canCreateProject(plan: BillingPlan, currentProjectCount: number): boolean {
  return currentProjectCount < LIMITS[plan].projects
}

export function canCollaborate(plan: BillingPlan): boolean {
  return LIMITS[plan].collaboration
}