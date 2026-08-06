'use client'

import { Suspense, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useExtensionInstalled } from '@/hooks/use-extension-installed'
import ChromeWebStoreLink from '@/components/ChromeWebStoreLink'

const IS_DEV = process.env.NODE_ENV === 'development'

const steps = [
  {
    title: 'Click Add to Chrome',
    text: 'The Microsoft Chrome Web Store opens in a new tab. Click Add to Chrome on the listing.',
    badge: '1',
  },
  {
    title: 'Install the extension',
    text: 'Confirm the install so the Nikkel icon appears in your toolbar.',
    badge: '2',
  },
  {
    title: 'Sign in with Google',
    text: 'Open the extension and sign in to sync your projects.',
    badge: '3',
  },
  {
    title: 'Return here',
    text: 'Come back to this page and you\u2019ll be ready to start reviewing.',
    badge: '4',
  },
]

const consumerTips = [
  'Refresh this page — sometimes Chrome just needs a nudge to notice a new install.',
  'Ensure the extension is enabled in chrome://extensions (toggle is on).',
  'Reinstall from the Chrome Web Store and select "Nikkel" from your installed apps.',
]

const devTips = [
  'Set NEXT_PUBLIC_CHROME_WEB_STORE_URL to your store listing URL.',
  'Or, for local development only: download the ZIP, open chrome://extensions, enable Developer Mode, and Load unpacked the extracted folder.',
]

function InstallContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnUrl = searchParams.get('return') || '/dashboard'
  const [openTrouble, setOpenTrouble] = useState(false)
  const { status, recheck } = useExtensionInstalled()

  const tips = IS_DEV ? devTips : consumerTips

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-6 py-12 sm:px-8">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-[10px] font-bold tracking-tight text-white">
          N
        </div>
        <span className="text-sm font-semibold text-white">Nikkel</span>
      </div>

      <h1 className="mt-10 text-2xl font-bold tracking-tight text-white sm:text-3xl">
        Install Nikkel for Chrome
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Add Nikkel to Chrome to review websites, leave contextual feedback, and collaborate with your team.
      </p>

      <div
        aria-live="polite"
        className="mt-8"
      >
        {status === 'installed' ? (
          <button
            onClick={() => router.push(returnUrl)}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand text-sm font-semibold text-white shadow-lg shadow-brand/25 transition-all hover:bg-brand-hover active:scale-[0.97]"
          >
            Open Dashboard
          </button>
        ) : (
          <ChromeWebStoreLink
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand text-sm font-semibold text-white shadow-lg shadow-brand/25 transition-all hover:bg-brand-hover active:scale-[0.97]"
          >
            Add to Chrome
          </ChromeWebStoreLink>
        )}
      </div>

      {status === 'missing' && (
        <div className="mt-4 flex items-center justify-center gap-3 text-sm text-muted">
          <span>Already installed?</span>
          <button
            onClick={recheck}
            className="rounded-md border border-surface-border px-3 py-1.5 font-medium text-white transition-colors hover:bg-surface-card"
          >
            Check Again
          </button>
        </div>
      )}
      {status === 'checking' && (
        <p className="mt-4 text-center text-sm text-muted" aria-hidden="true">
          Detecting extension&hellip;
        </p>
      )}

      <div className="mt-12 space-y-8">
        {steps.map((step) => (
          <div key={step.badge} className="flex gap-5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-surface-card">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand/20 text-[11px] font-bold text-brand">
                {step.badge}
              </span>
            </div>
            <div className="min-w-0 pt-1">
              <h3 className="text-sm font-semibold text-white">{step.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{step.text}</p>
            </div>
          </div>
        ))}
      </div>

      <details
        className="mt-12 border-t border-surface-border pt-8"
        open={openTrouble}
        onToggle={(e) => setOpenTrouble((e.target as HTMLDetailsElement).open)}
      >
        <summary className="cursor-pointer text-sm font-semibold text-white">Having trouble?</summary>
        <ul className="mt-4 space-y-2">
          {tips.map((tip, i) => (
            <li key={i} className="flex gap-2 text-sm text-muted">
              <span className="mt-0.5 shrink-0 text-brand">•</span>
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </details>
    </div>
  )
}

export default function DownloadPage() {
  return (
    <Suspense>
      <InstallContent />
    </Suspense>
  )
}