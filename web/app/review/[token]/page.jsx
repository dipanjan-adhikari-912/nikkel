'use client'

import { useEffect, useState } from 'react'
import { supabaseClient } from '@/lib/client/supabase'

function getToken() {
  const hash = window.location.hash
  const match = hash.match(/token=([^&]+)/)
  if (match) {
    const t = decodeURIComponent(match[1])
    window.location.hash = ''
    try { sessionStorage.setItem('nikkel_token', t) } catch {}
    return t
  }
  try { return sessionStorage.getItem('nikkel_token') } catch { return null }
}

async function api(token, path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...opts.headers }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(path, { ...opts, headers })
  const body = await res.json().catch(() => ({ error: 'Unexpected response' }))
  if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`)
  return body
}

export default function ReviewPage({ params }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [token, setToken] = useState(null)
  const [replyText, setReplyText] = useState({})
  const [submitting, setSubmitting] = useState({})
  const [extensionState, setExtensionState] = useState(null) // null=checking, true=installed, false=not installed
  const [opening, setOpening] = useState(false)
  const [openingError, setOpeningError] = useState(null)

  useEffect(() => {
    const t = getToken()
    if (t) { setToken(t); return }
    const dt = document.documentElement.dataset.nikkelToken
    if (dt) { setToken(dt); return }
    supabaseClient.auth.getSession().then(({ data }) => {
      if (data?.session?.access_token) setToken(data.session.access_token)
    })
  }, [])

  function signInWithGoogle() {
    supabaseClient.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.href },
    })
  }

  useEffect(() => {
    if (document.documentElement.dataset.nikkelInstalled) {
      setExtensionState(true)
      return
    }

    function onReady() { setExtensionState(true) }
    document.addEventListener('nikkel:extension-ready', onReady)

    const observer = new MutationObserver(() => {
      if (document.documentElement.dataset.nikkelInstalled) {
        setExtensionState(true)
        observer.disconnect()
        clearTimeout(timer)
        document.removeEventListener('nikkel:extension-ready', onReady)
      }
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-nikkel-installed'] })

    const timer = setTimeout(() => {
      observer.disconnect()
      document.removeEventListener('nikkel:extension-ready', onReady)
      setExtensionState(false)
    }, 300)

    return () => {
      observer.disconnect()
      clearTimeout(timer)
      document.removeEventListener('nikkel:extension-ready', onReady)
    }
  }, [])

  useEffect(() => {
    function resultHandler(event) {
      if (event.data?.type === 'LOAD_REVIEW_RESULT') {
        setOpening(false)
        if (!event.data?.payload?.ok) setOpeningError(event.data?.payload?.error || 'Failed to open review')
      }
    }
    window.addEventListener('message', resultHandler)
    return () => window.removeEventListener('message', resultHandler)
  }, [])

  const handleOpenReview = () => {
    setOpening(true); setOpeningError(null)
    window.postMessage({ action: 'LOAD_REVIEW', reviewToken: params.token }, '*')
  }

  useEffect(() => {
    fetch(`/api/board/${params.token}`)
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

  const submitReply = async (nikkelId) => {
    const text = replyText[nikkelId]?.trim()
    if (!text || !token) return
    setSubmitting(s => ({ ...s, [nikkelId]: true }))
    try {
      const result = await api(token, `/api/board/${params.token}/reply`, {
        method: 'POST',
        body: JSON.stringify({ nikkelId, text }),
      })
      setData(prev => {
        if (!prev) return prev
        const updated = (prev.nikkels || []).map(n =>
          n.id === nikkelId
            ? { ...n, replies: [...(n.replies || []), result] }
            : n
        )
        return { ...prev, nikkels: updated }
      })
      setReplyText(r => ({ ...r, [nikkelId]: '' }))
    } catch (e) {
      alert(e.message)
    }
    setSubmitting(s => ({ ...s, [nikkelId]: false }))
  }

  if (error === 'not-found') {
    return <Shell><Icon>🔗</Icon><Title>Review not found</Title><Text>This link may be invalid or the review was removed.</Text></Shell>
  }

  if (error === 'server-error') {
    return <Shell><Icon>⚠️</Icon><Title>Something went wrong</Title><Text>The server encountered an error. Please try again later.</Text></Shell>
  }

  if (error === 'network') {
    return <Shell><Icon>🌐</Icon><Title>Connection error</Title><Text>Could not reach the server. Check your internet connection and try again.</Text></Shell>
  }

  if (!data) {
    return (
      <Shell>
        <div style={{ width: 28, height: 28, border: '2px solid #334155', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'nikkel-spin 0.6s linear infinite' }} />
        <Title>Loading review...</Title>
      </Shell>
    )
  }

  const { review, project, nikkels, owner } = data
  const pinCount = nikkels?.length || 0
  const created = new Date(review.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const senderDisplay = owner?.name || owner?.email || 'Guest'
  const pageUrl = project.url || project.base_url || ''
  let domain = ''
  try { domain = pageUrl ? new URL(pageUrl).hostname : '' } catch {}

  const pages = {}
  for (const n of nikkels || []) {
    const key = n.page_url || 'unknown'
    if (!pages[key]) pages[key] = []
    pages[key].push(n)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#e2e8f0', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <style>{`@keyframes nikkel-spin { to { transform: rotate(360deg) } }`}</style>

      {/* Header */}
      <div style={{ borderBottom: '1px solid #1e293b', padding: '24px 32px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <img src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`} alt="" onError={e => e.target.style.display = 'none'} style={{ width: 32, height: 32, borderRadius: 6 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{project.title || project.name || 'Untitled'}</h1>
            {pageUrl && <a href={pageUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#6366f1', fontSize: 13, textDecoration: 'none' }}>{domain}</a>}
          </div>
          {extensionState === true ? (
            <button
              onClick={handleOpenReview}
              disabled={opening}
              style={{ padding: '8px 16px', background: opening ? '#4f46e5' : '#6366f1', color: '#fff', border: 'none', borderRadius: 6, cursor: opening ? 'default' : 'pointer', fontSize: 13, fontWeight: 600, flexShrink: 0 }}
            >
              {opening ? 'Opening...' : 'Open in Nikkel'}
            </button>
          ) : extensionState === false ? (
            <a href="/download" style={{ padding: '8px 16px', background: '#6366f1', color: '#fff', borderRadius: 6, fontSize: 13, fontWeight: 600, textDecoration: 'none', flexShrink: 0 }}>
              Install Nikkel
            </a>
          ) : null}
        </div>
        <div style={{ display: 'flex', gap: 16, fontSize: 13, color: '#64748b' }}>
          <span>{pinCount} {pinCount === 1 ? 'annotation' : 'annotations'}</span>
          <span>·</span>
          <span>by {senderDisplay}</span>
          <span>·</span>
          <span>{created}</span>
        </div>
        {openingError && <p style={{ color: '#f87171', fontSize: 13, margin: '8px 0 0' }}>{openingError}</p>}
      </div>

      {/* Nikkels grouped by page */}
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px 48px' }}>
        {Object.entries(pages).map(([pageUrl, pageNikkels]) => (
          <div key={pageUrl} style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, padding: '6px 8px', borderRadius: 6, color: '#94a3b8', background: '#1e293b' }}>
              <span style={{ fontSize: 14 }}>📄</span>
              <a href={pageUrl} target="_blank" rel="noopener noreferrer" style={{ flex: 1, minWidth: 0, fontSize: 13, fontFamily: 'monospace', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#94a3b8', textDecoration: 'none' }} onMouseEnter={e => e.currentTarget.style.color = '#e2e8f0'} onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}>{pageUrl}</a>
              <span style={{ padding: '1px 7px', borderRadius: 8, background: '#334155', color: '#94a3b8', fontSize: 11, fontWeight: 500, flexShrink: 0 }}>{pageNikkels.length}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {pageNikkels.map(nikkel => (
                  <NikkelCard
                    key={nikkel.id}
                    nikkel={nikkel}
                    token={token}
                    extensionDetected={extensionState === true}
                    replyText={replyText[nikkel.id] || ''}
                    submitting={submitting[nikkel.id]}
                    onReplyChange={v => setReplyText(r => ({ ...r, [nikkel.id]: v }))}
                    onSubmit={() => submitReply(nikkel.id)}
                    onSignIn={signInWithGoogle}
                  />
              ))}
            </div>
          </div>
        ))}

        {pinCount === 0 && (
          <div style={{ textAlign: 'center', marginTop: 48, color: '#64748b' }}>
            <p style={{ fontSize: 15 }}>No annotations yet</p>
          </div>
        )}
      </div>
    </div>
  )
}

function NikkelCard({ nikkel, token, extensionDetected, replyText, submitting, onReplyChange, onSubmit, onSignIn }) {
  const [showReplies, setShowReplies] = useState(false)
  const replies = nikkel.replies || []

  return (
    <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ padding: 14 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <span style={{ width: 24, height: 24, borderRadius: '50%', background: '#6366f1', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{nikkel.idx || '?'}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
              {nikkel.tag && <span style={{ padding: '1px 6px', borderRadius: 3, background: '#334155', color: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}>&lt;{nikkel.tag}&gt;</span>}
              {nikkel.element_text && <span style={{ color: '#94a3b8', fontSize: 12 }}>"{nikkel.element_text.slice(0, 80)}"</span>}
              {nikkel.dom_selector && <span style={{ color: '#475569', fontSize: 11, fontFamily: 'monospace' }}>{nikkel.dom_selector}</span>}
            </div>
            {nikkel.comment && <p style={{ margin: '6px 0 0', fontSize: 14, lineHeight: 1.5, color: '#e2e8f0', whiteSpace: 'pre-wrap' }}>{nikkel.comment}</p>}
          </div>
        </div>
      </div>

      {/* Replies toggle */}
      {replies.length > 0 && (
        <div style={{ borderTop: '1px solid #334155' }}>
          <button
            onClick={() => setShowReplies(!showReplies)}
            style={{ width: '100%', padding: '8px 14px', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 12, textAlign: 'left' }}
          >
            {showReplies ? '▾' : '▸'} {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
          </button>
          {showReplies && (
            <div style={{ padding: '0 14px 10px' }}>
              {replies.map(r => (
                <div key={r.id} style={{ padding: '8px 0', borderTop: '1px solid #0f172a', fontSize: 13 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <strong style={{ color: '#6366f1', fontSize: 12 }}>{r.author_name || 'Anonymous'}</strong>
                    {r.is_client && <span style={{ padding: '1px 5px', borderRadius: 3, background: '#312e81', color: '#a5b4fc', fontSize: 10 }}>Client</span>}
                    <span style={{ color: '#475569', fontSize: 11 }}>{r.created_at ? new Date(r.created_at).toLocaleDateString() : ''}</span>
                  </div>
                  <p style={{ margin: 0, color: '#cbd5e1' }}>{r.body}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ponytail: reply section gated on extension detection */}
      {extensionDetected ? (
        token ? (
          <div style={{ borderTop: '1px solid #334155', padding: 10 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={replyText}
                onChange={e => onReplyChange(e.target.value)}
                placeholder="Write a reply..."
                style={{ flex: 1, padding: '7px 10px', background: '#0f172a', border: '1px solid #334155', borderRadius: 4, color: '#e2e8f0', fontSize: 13, outline: 'none' }}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (replyText.trim()) onSubmit() } }}
              />
              <button
                onClick={onSubmit}
                disabled={submitting || !replyText.trim()}
                style={{ padding: '7px 14px', background: submitting || !replyText.trim() ? '#334155' : '#6366f1', color: '#fff', border: 'none', borderRadius: 4, cursor: submitting || !replyText.trim() ? 'default' : 'pointer', fontSize: 13, fontWeight: 500 }}
              >
                {submitting ? 'Sending...' : 'Reply'}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ borderTop: '1px solid #334155', padding: 10, textAlign: 'center' }}>
            <button onClick={onSignIn} style={{ padding: '7px 14px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 4, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
              Sign in to reply
            </button>
          </div>
        )
      ) : (
        <div style={{ borderTop: '1px solid #334155', padding: 10, textAlign: 'center' }}>
          <a href="/download" style={{ padding: '7px 14px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 4, fontSize: 13, fontWeight: 500, textDecoration: 'none', display: 'inline-block' }}>
            Get Nikkel to reply
          </a>
        </div>
      )}
    </div>
  )
}

function Shell({ children }) {
  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#e2e8f0', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 }}>
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
