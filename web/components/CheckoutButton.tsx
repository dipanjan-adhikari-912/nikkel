'use client'

// Paddle checkout button. Loads Paddle's overlay script exactly once (guarded so React
// rerenders/remounts don't inject the tag repeatedly), fetches the price ID from the server
// (not hardcoded), and opens checkout with the Supabase user id in customData so the webhook
// can attribute the subscription back to the user.

import { useCallback, useState } from 'react'

const PADDLE_SCRIPT = 'https://cdn.paddle.com/paddle/v2/paddle.js'

let scriptPromise: Promise<void> | null = null

function loadPaddle(): Promise<void> {
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const existing = document.getElementById('paddle-js')
      if (existing) { resolve(); return }
      const script = document.createElement('script')
      script.id = 'paddle-js'
      script.src = PADDLE_SCRIPT
      script.async = true
      script.onload = () => resolve()
      script.onerror = () => { scriptPromise = null; reject(new Error('Failed to load Paddle')) }
      document.head.appendChild(script)
    })
  }
  return scriptPromise
}

interface CheckoutButtonProps {
  plan: 'pro' | 'team'
  interval: 'monthly' | 'yearly'
  supabaseUserId: string
  quantity?: number
  successUrl?: string
  children?: React.ReactNode
}

export default function CheckoutButton({
  plan,
  interval,
  supabaseUserId,
  quantity,
  successUrl,
  children,
}: CheckoutButtonProps) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const checkout = useCallback(async () => {
    setBusy(true)
    setError(null)
    try {
      await loadPaddle()
      const res = await fetch(`/api/billing/price-id?plan=${plan}&interval=${interval}`)
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)
      const { priceId } = body as { priceId: string }
      const paddle = (window as unknown as { Paddle?: any }).Paddle
      if (!paddle?.Checkout?.open) throw new Error('Paddle not ready')

      const items = [{ priceId, quantity }]
      paddle.Checkout.open({
        items,
        customData: { supabase_user_id: supabaseUserId },
        settings: successUrl ? { successUrl } : undefined,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Checkout unavailable')
    } finally {
      setBusy(false)
    }
  }, [plan, interval, supabaseUserId, quantity, successUrl])

  return (
    <div>
      <button type="button" onClick={checkout} disabled={busy}>
        {children ?? 'Upgrade'}
      </button>
      {error && <p role="alert">{error}</p>}
    </div>
  )
}