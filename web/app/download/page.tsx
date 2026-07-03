'use client'

import { Suspense, useState, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { isExtensionInstalled } from '@/lib/extension'

const CHROME_STORE_URL = process.env.NEXT_PUBLIC_CHROME_STORE_URL
const DOWNLOAD_URL = '/nikkel-alpha.zip'

const steps = [
  {
    title: 'Download the ZIP',
    text: 'Get the latest build of the Nikkel extension for alpha testing.',
    badge: '1',
    placeholder: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: '#6366f1' }}>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    ),
  },
  {
    title: 'Open chrome://extensions',
    text: 'Type chrome://extensions in your address bar and press Enter. Developer mode controls will appear at the top.',
    badge: '2',
    placeholder: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: '#6366f1' }}>
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
  },
  {
    title: 'Enable Developer Mode',
    text: 'Toggle Developer Mode on in the top-right corner. A toolbar with new options will appear.',
    badge: '3',
    placeholder: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: '#6366f1' }}>
        <rect x="2" y="6" width="20" height="12" rx="2" />
        <circle cx="17" cy="12" r="2" fill="currentColor" />
        <rect x="2" y="2" width="20" height="4" rx="1" fill="currentColor" opacity="0.15" />
      </svg>
    ),
  },
  {
    title: 'Click Load Unpacked',
    text: 'A file picker will open. Select the extracted extension folder (not the ZIP file itself).',
    badge: '4',
    placeholder: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: '#6366f1' }}>
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        <line x1="12" y1="11" x2="12" y2="17" />
        <polyline points="9 14 12 11 15 14" />
      </svg>
    ),
  },
  {
    title: 'You\'re done!',
    text: 'The extension icon should appear in your toolbar. Click Continue below to verify the installation.',
    badge: '5',
    placeholder: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: '#22c55e' }}>
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
  },
]

const troubleshootingTips = [
  'Is Developer Mode enabled? The toggle is in the top-right corner of chrome://extensions.',
  'Did you select the extracted folder instead of the ZIP? Extract the ZIP first, then point Load Unpacked to the folder.',
  'Refresh this page after installation — then click Continue again.',
  'Reload the extension from chrome://extensions if the icon is greyed out (click the refresh icon on the Nikkel card).',
]

function DownloadContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const returnUrl = searchParams.get('return') || '/'
  const [checking, setChecking] = useState(false)
  const [showTroubleshooting, setShowTroubleshooting] = useState(false)
  const storeUrl = useMemo(() => CHROME_STORE_URL || '', [])

  const handleContinue = async () => {
    setChecking(true)
    setShowTroubleshooting(false)
    const installed = await isExtensionInstalled()
    if (installed) {
      router.push(returnUrl)
    } else {
      setChecking(false)
      setShowTroubleshooting(true)
    }
  }

  if (storeUrl) {
    return (
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-6 py-12 sm:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-[10px] font-bold tracking-tight text-white">
            N
          </div>
          <span className="text-sm font-semibold text-white">Nikkel</span>
        </div>

        <h1 className="mt-10 text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Install Nikkel
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Install the Nikkel extension from the Chrome Web Store to start reviewing.
        </p>

        <a
          href={storeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-8 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-brand px-8 text-sm font-semibold text-white shadow-lg shadow-brand/25 transition-all hover:bg-brand-hover active:scale-[0.97]"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Install from Chrome Web Store
        </a>

        <div className="mt-12 border-t border-surface-border pt-8">
          <button
            onClick={handleContinue}
            disabled={checking}
            className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-brand text-sm font-semibold text-white shadow-lg shadow-brand/25 transition-all hover:bg-brand-hover disabled:opacity-60 active:scale-[0.97]"
          >
            {checking ? 'Detecting…' : 'Continue'}
          </button>

          {showTroubleshooting && (
            <div className="mt-6 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
              <p className="mb-3 text-sm font-semibold text-amber-400">
                Extension not detected
              </p>
              <ul className="space-y-2">
                {troubleshootingTips.map((tip, i) => (
                  <li key={i} className="flex gap-2 text-sm text-amber-300/80">
                    <span className="mt-0.5 shrink-0 text-amber-400">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-6 py-12 sm:px-8">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-[10px] font-bold tracking-tight text-white">
          N
        </div>
        <span className="text-sm font-semibold text-white">Nikkel</span>
      </div>

      <h1 className="mt-10 text-2xl font-bold tracking-tight text-white sm:text-3xl">
        Install Nikkel Alpha
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Nikkel is currently in invite-only alpha. Follow the steps below to install the extension and start reviewing.
      </p>

      <a
        href={DOWNLOAD_URL}
        className="mt-8 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-brand px-8 text-sm font-semibold text-white shadow-lg shadow-brand/25 transition-all hover:bg-brand-hover active:scale-[0.97]"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        Download Extension
      </a>

      <div className="mt-12 space-y-8">
        {steps.map((step) => (
          <div key={step.badge} className="flex gap-5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-surface-card">
              {step.placeholder}
            </div>
            <div className="min-w-0 pt-1">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand/20 text-[11px] font-bold text-brand">
                  {step.badge}
                </span>
                <h3 className="text-sm font-semibold text-white">{step.title}</h3>
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{step.text}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 border-t border-surface-border pt-8">
        <button
          onClick={handleContinue}
          disabled={checking}
          className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-brand text-sm font-semibold text-white shadow-lg shadow-brand/25 transition-all hover:bg-brand-hover disabled:opacity-60 active:scale-[0.97]"
        >
          {checking ? 'Detecting…' : 'Continue'}
        </button>

        {showTroubleshooting && (
          <div className="mt-6 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
            <p className="mb-3 text-sm font-semibold text-amber-400">
              Extension not detected
            </p>
            <ul className="space-y-2">
              {troubleshootingTips.map((tip, i) => (
                <li key={i} className="flex gap-2 text-sm text-amber-300/80">
                  <span className="mt-0.5 shrink-0 text-amber-400">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

export default function DownloadPage() {
  return (
    <Suspense>
      <DownloadContent />
    </Suspense>
  )
}
