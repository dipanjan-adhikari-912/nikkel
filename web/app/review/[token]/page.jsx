'use client'

import { useEffect, useState } from 'react'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export default function ReviewPage({ params }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [extensionDetected, setExtensionDetected] = useState(false)

  useEffect(() => {
    fetch(`${API_BASE}/board/${params.token}`)
      .then(r => {
        if (!r.ok) throw new Error('Review not found')
        return r.json()
      })
      .then(d => setData(d))
      .catch(() => setError('Review not found'))
  }, [params.token])

  useEffect(() => {
    function handler(event) {
      if (event.data?.type === 'PONG' && event.data?.source === 'nikkel-extension') {
        setExtensionDetected(true)
      }
    }
    window.addEventListener('message', handler)
    window.postMessage({ type: 'PING' }, '*')
    const timer = setTimeout(() => window.removeEventListener('message', handler), 1000)
    return () => {
      window.removeEventListener('message', handler)
      clearTimeout(timer)
    }
  }, [])

  if (error) {
    return (
      <div style={{ textAlign: 'center', marginTop: 80, color: '#f87171', fontFamily: 'inherit' }}>
        <h2 style={{ fontSize: 22, fontWeight: 600 }}>Review not found</h2>
        <p style={{ color: '#64748b', fontSize: 14 }}>This link may be invalid or the review was removed.</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div style={{ textAlign: 'center', marginTop: 80, color: '#94a3b8', fontFamily: 'inherit' }}>
        <h2 style={{ fontSize: 22, fontWeight: 600 }}>Loading review...</h2>
      </div>
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
          <a href={project.url || project.base_url} target="_blank" rel="noopener noreferrer"
            style={{ color: '#6366f1', fontSize: 13, textDecoration: 'none' }}>
            {project.url || project.base_url || ''}
          </a>
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

        {extensionDetected ? (
          <a href={`/board/${params.token}`}
            onClick={e => {
              window.postMessage({ action: 'LOAD_REVIEW', reviewToken: params.token }, '*');
            }}
            style={{
              display: 'block',
              textAlign: 'center',
              background: '#6366f1',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '12px 24px',
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
              textDecoration: 'none',
              transition: 'background 0.15s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#4f46e5'}
            onMouseLeave={e => e.currentTarget.style.background = '#6366f1'}
          >
            Open Review
          </a>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <a href="#"
              onClick={e => e.preventDefault()}
              style={{
                display: 'block',
                textAlign: 'center',
                background: '#334155',
                color: '#64748b',
                border: 'none',
                borderRadius: 8,
                padding: '12px 24px',
                fontSize: 15,
                fontWeight: 600,
                cursor: 'not-allowed',
                textDecoration: 'none',
                marginBottom: 12
              }}
            >
              Open Review
            </a>
            <p style={{ color: '#94a3b8', fontSize: 12, margin: 0 }}>
              Install the Nikkel extension to open this review.
            </p>
          </div>
        )}
      </div>
    </div>
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
