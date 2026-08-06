'use client'

// Shared extension-detection hook. Polls isExtensionInstalled() while mounted so pages can
// react the moment the extension shows up (e.g. after an install), without manual refreshes.
// Reuses the existing detection protocol in lib/extension.ts — no protocol changes.

import { useCallback, useEffect, useRef, useState } from 'react'
import { isExtensionInstalled } from '@/lib/extension'

export type ExtensionStatus = 'checking' | 'installed' | 'missing'

const POLL_MS = 1500

export function useExtensionInstalled(poll = true): { status: ExtensionStatus; recheck: () => void } {
  const [status, setStatus] = useState<ExtensionStatus>('checking')
  const running = useRef(false)

  const check = useCallback(async () => {
    if (running.current) return
    running.current = true
    try {
      const installed = await isExtensionInstalled()
      setStatus(installed ? 'installed' : 'missing')
    } finally {
      running.current = false
    }
  }, [])

  useEffect(() => {
    check()
    if (!poll) return

    const id = setInterval(() => {
      // Skip polling while the tab is hidden — detection is meaningless there.
      if (document.visibilityState !== 'visible') return
      check()
    }, POLL_MS)

    const onVisible = () => { if (document.visibilityState === 'visible') check() }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [check, poll])

  const recheck = useCallback(() => { setStatus('checking'); check() }, [check])

  return { status, recheck }
}
