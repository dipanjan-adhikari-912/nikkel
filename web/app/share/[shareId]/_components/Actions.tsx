'use client'

import { useEffect, useState } from 'react'
import { isExtensionInstalled, openProject } from '@/lib/extension'

import Link from 'next/link'

interface ActionsProps {
  shareId: string
  url: string
}

export function Actions({ shareId, url }: ActionsProps) {
  const [installed, setInstalled] = useState<boolean | null>(null)
  const [opening, setOpening] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    isExtensionInstalled().then(setInstalled)
  }, [])

  const handleOpen = async () => {
    setOpening(true)
    setError(null)
    const result = await openProject(shareId)
    setOpening(false)
    if (result.ok && result.targetUrl) {
      window.location.href = result.targetUrl
    } else {
      setError(result.error || 'Failed to open project. Please try again.')
    }
  }

  if (installed === null) {
    return (
      <div className="mt-8 flex justify-center">
        <div className="inline-flex h-11 items-center justify-center rounded-lg bg-surface-card px-8 text-sm font-medium text-muted opacity-60">
          Detecting extension…
        </div>
      </div>
    )
  }

  if (installed) {
    return (
      <div className="mt-8 flex flex-col items-center gap-3">
        {error && (
          <p className="text-sm text-red-400 text-center max-w-sm">{error}</p>
        )}
        <div className="flex justify-center">
          <button
            onClick={handleOpen}
            disabled={opening}
            className="inline-flex h-11 cursor-pointer items-center justify-center rounded-lg bg-brand px-8 text-sm font-semibold text-white shadow-lg shadow-brand/25 transition-all hover:bg-brand-hover active:scale-[0.97] disabled:opacity-60 disabled:cursor-default"
          >
            {opening ? 'Opening…' : 'Open in Nikkel'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-4">
      <Link
        href={`/download?return=/share/${shareId}`}
        className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-brand px-8 text-sm font-semibold text-white shadow-lg shadow-brand/25 transition-all hover:bg-brand-hover active:scale-[0.97] sm:w-auto"
      >
        Download Extension
      </Link>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex h-11 w-full items-center justify-center rounded-lg border border-surface-border bg-surface-card px-8 text-sm font-medium text-muted transition-all hover:border-muted-dark hover:text-white active:scale-[0.97] sm:w-auto"
      >
        Continue
      </a>
    </div>
  )
}
