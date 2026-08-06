'use client'

// Shared "Add to Chrome" CTA. Always resolves the store URL from NEXT_PUBLIC_CHROME_WEB_STORE_URL
// (never hardcoded). If the env var is missing the button is disabled with a development-only
// warning — the page never crashes.

import type { AnchorHTMLAttributes, ReactNode } from 'react'

const STORE_URL = process.env.NEXT_PUBLIC_CHROME_WEB_STORE_URL || ''
const IS_DEV = process.env.NODE_ENV === 'development'

interface ChromeWebStoreLinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  children?: ReactNode
  style?: React.CSSProperties
  className?: string
}

export default function ChromeWebStoreLink({ children, style, className, ...rest }: ChromeWebStoreLinkProps) {
  if (!STORE_URL) {
    return (
      <span style={{ display: 'inline-block' }}>
        <span
          role="button"
          tabIndex={0}
          aria-disabled="true"
          style={{ ...style, cursor: 'not-allowed', opacity: 0.5, pointerEvents: 'none' }}
        >
          {children ?? 'Add to Chrome'}
        </span>
        {IS_DEV && (
          <span role="alert" style={{ display: 'block', fontSize: 12, marginTop: 6, color: '#f59e0b' }}>
            NEXT_PUBLIC_CHROME_WEB_STORE_URL is not set.
          </span>
        )}
      </span>
    )
  }

  return (
    <a
      href={STORE_URL}
      target="_blank"
      rel="noopener noreferrer"
      style={style}
      className={className}
      {...rest}
    >
      {children ?? 'Add to Chrome'}
    </a>
  )
}
