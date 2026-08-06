import { NextRequest, NextResponse } from 'next/server'
import { activeProvider } from '@/lib/billing'
import type { BillingInterval, BillingPlan } from '@/lib/billing'

const PLANS: BillingPlan[] = ['pro', 'team']
const INTERVALS: BillingInterval[] = ['monthly', 'yearly']

// Resolves a plan + interval to a provider price ID server-side, keeping price IDs out of
// client code. The checkout button fetches this rather than hardcoding price IDs.
export async function GET(request: NextRequest) {
  const plan = request.nextUrl.searchParams.get('plan') as BillingPlan | null
  const interval = request.nextUrl.searchParams.get('interval') as BillingInterval | null

  if (!plan || !PLANS.includes(plan)) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
  }
  if (!interval || !INTERVALS.includes(interval)) {
    return NextResponse.json({ error: 'Invalid interval' }, { status: 400 })
  }

  const priceId = activeProvider.getPriceId(plan, interval)
  if (!priceId) {
    return NextResponse.json({ error: 'Price not configured' }, { status: 404 })
  }
  return NextResponse.json({ priceId })
}