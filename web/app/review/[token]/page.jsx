'use client'

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'

const _RAW = process.env.NEXT_PUBLIC_API_URL
if (!_RAW) {
  throw new Error('NEXT_PUBLIC_API_URL is not configured. Create web/.env.local and set NEXT_PUBLIC_API_URL to your API server URL.')
}
const API_BASE = _RAW.replace(/\/+$/, '')
const CHROME_STORE_URL = process.env.NEXT_PUBLIC_CHROME_STORE_URL

export default function ReviewPage({ params }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [extensionDetected, setExtensionDetected] = useState(false)
  const [opening, setOpening] = useState(false)
  const [openingError, setOpeningError] = useState(null)
  const openTimeoutRef = useRef(null)

  useEffect(() => {
    fetch(`${API_BASE}/board/${params.token}`)
      .then(r => {
        if (r.status === 404) throw new Error('not-found')
        if (!r.ok) throw new Error('server-error')
        return r.json()
      })
      .then(d => setData(d))
      .catch(err => {
        if (err.message === 'not-found') setError('not-found')
        else if (err.message === 'server-error') setError('server-error')
        else setError('network')
      })
  }, [params.token])

  useEffect(() => {
    function pongHandler(event) {
      if (event.data?.type === 'PONG' && event.data?.source === 'nikkel-extension') {
        setExtensionDetected(true)
      }
    }
    window.addEventListener('message', pongHandler)
    window.postMessage({ type: 'PING' }, '*')
    const timer = setTimeout(() => window.removeEventListener('message', pongHandler), 1000)
    return () => {
      window.removeEventListener('message', pongHandler)
      clearTimeout(timer)
    }
  }, [])

  useEffect(() => {
    function resultHandler(event) {
      if (event.data?.type === 'LOAD_REVIEW_RESULT') {
        setOpening(false)
        if (!event.data?.payload?.ok) {
          setOpeningError(event.data?.payload?.error || 'Failed to open review')
        }
      }
    }
    window.addEventListener('message', resultHandler)
    return () => {
      window.removeEventListener('message', resultHandler)
      if (openTimeoutRef.current) clearTimeout(openTimeoutRef.current)
    }
  }, [])

  const handleOpen = useCallback(() => {
    setOpening(true)
    setOpeningError(null)
    window.postMessage({ action: 'LOAD_REVIEW', reviewToken: params.token }, '*')
    if (openTimeoutRef.current) clearTimeout(openTimeoutRef.current)
    openTimeoutRef.current = setTimeout(() => setOpening(s => { if (s) return false }), 10000)
  }, [params.token])

  if (error === 'not-found') {
    return (
      <PageShell>
        <Icon>🔗</Icon>
        <Title>Review not found</Title>
        <Text>This link may be invalid or the review was removed.</Text>
      </PageShell>
    )
  }

  if (error === 'server-error') {
    return (
      <PageShell>
        <Icon>⚠️</Icon>
        <Title>Something went wrong</Title>
        <Text>The server encountered an error. Please try again later.</Text>
      </PageShell>
    )
  }

  if (error === 'network') {
    return (
      <PageShell>
        <Icon>🌐</Icon>
        <Title>Connection error</Title>
        <Text>Could not reach the server. Check your internet connection and try again.</Text>
      </PageShell>
    )
  }

  if (!data) {
    return (
      <PageShell>
        <Spinner />
        <Title>Loading review...</Title>
        <Text style={{ color: '#64748b' }}>Fetching review details</Text>
      </PageShell>
    )
  }

  const { review, project, nikkels } = data
  const pinCount = nikkels?.length || 0
  const created = new Date(review.created_at).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  })
  const ownerDisplay = review.owner_id
    ? review.owner_id.slice(0, 8) + '...'
    : 'Anonymous'
  const pageUrl = project.url || project.base_url || ''

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0f172a',
      color: '#e2e8f0',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24
    }}>
      <div style={{
        maxWidth: 480,
        width: '100%',
        background: '#1e293b',
        border: '1px solid #334155',
        borderRadius: 12,
        padding: 32
      }}>
        <div style={{ marginBottom: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>📌</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>{project.name || project.title || 'Untitled Review'}</h1>
          {pageUrl && (
            <a href={pageUrl} target="_blank" rel="noopener noreferrer"
              style={{ color: '#6366f1', fontSize: 13, textDecoration: 'none' }}>
              {pageUrl}
            </a>
          )}
        </div>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          marginBottom: 24
        }}>
          <StatRow label="Number of Pins" value={pinCount.toString()} />
          <StatRow label="Owner" value={ownerDisplay} />
          <StatRow label="Created" value={created} />
        </div>

        {opening && (
          <div style={{ textAlign: 'center', marginBottom: 12 }}>
            <Spinner size={18} />
            <p style={{ color: '#94a3b8', fontSize: 13, margin: '8px 0 0' }}>Opening review...</p>
          </div>
        )}

        {openingError && (
          <p style={{ color: '#f87171', fontSize: 13, textAlign: 'center', margin: '0 0 12px' }}>{openingError}</p>
        )}

        {extensionDetected ? (
          <button
            onClick={handleOpen}
            disabled={opening}
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'center',
              background: opening ? '#4f46e5' : '#6366f1',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '12px 24px',
              fontSize: 15,
              fontWeight: 600,
              cursor: opening ? 'default' : 'pointer',
              textDecoration: 'none',
              transition: 'background 0.15s',
              opacity: opening ? 0.7 : 1
            }}
          >
            {opening ? 'Opening...' : 'Open Review'}
          </button>
        ) : (
          <div style={{ textAlign: 'center' }}>
            {CHROME_STORE_URL ? (
              <a
                href={CHROME_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  width: '100%',
                  background: '#6366f1',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '12px 24px',
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: 'pointer',
                  textDecoration: 'none',
                  transition: 'background 0.15s',
                  marginBottom: 12
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Get Nikkel from Chrome Web Store
              </a>
            ) : (
              <button
                onClick={() => {
                  const returnUrl = encodeURIComponent(`/review/${params.token}`)
                  window.location.href = `/download?return=${returnUrl}`
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  width: '100%',
                  background: '#6366f1',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '12px 24px',
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: 'pointer',
                  textDecoration: 'none',
                  transition: 'background 0.15s',
                  marginBottom: 12
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Download Extension
              </button>
            )}
            {!CHROME_STORE_URL && (
              <p style={{ color: '#94a3b8', fontSize: 12, margin: 0 }}>
                Nikkel is currently in invite-only alpha. The extension is not on the Chrome Web Store.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function PageShell({ children }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0f172a',
      color: '#e2e8f0',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      gap: 8
    }}>
      {children}
    </div>
  )
}

function Icon({ children }) {
  return <div style={{ fontSize: 36, marginBottom: 8 }}>{children}</div>
}

function Title({ children }) {
  return <h2 style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>{children}</h2>
}

function Text({ children, style }) {
  return <p style={{ color: '#94a3b8', fontSize: 14, margin: 0, textAlign: 'center', ...style }}>{children}</p>
}

function Spinner({ size }) {
  return (
    <div style={{
      width: size || 24,
      height: size || 24,
      border: '2px solid #334155',
      borderTopColor: '#6366f1',
      borderRadius: '50%',
      animation: 'nikkel-spin 0.6s linear infinite',
      marginBottom: 8
    }} />
  )
}

function StatRow({ label, value }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '12px 16px',
      background: '#0f172a',
      borderRadius: 8
    }}>
      <span style={{ color: '#94a3b8', fontSize: 13 }}>{label}</span>
      <span style={{ color: '#e2e8f0', fontSize: 14, fontWeight: 500 }}>{value}</span>
    </div>
  )
}
