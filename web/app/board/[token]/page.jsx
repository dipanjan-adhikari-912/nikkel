'use client'

import { useEffect, useState, useRef } from 'react'

export default function BoardPage({ params }) {
  const [project, setProject] = useState(null)
  const [nikkels, setNikkels] = useState([])
  const [activeNikkel, setActiveNikkel] = useState(null)
  const [replyText, setReplyText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [token, setToken] = useState(null)
  const [collaboratorPrompt, setCollaboratorPrompt] = useState(null)
  const [joining, setJoining] = useState(false)
  const iframeRef = useRef(null)

  useEffect(() => {
    const t = localStorage.getItem('nikkel_token')
    if (t) setToken(t)
  }, [])

  useEffect(() => {
    fetch(`/api/board/${params.token}`)
      .then(r => r.json())
      .then(data => {
        setProject(data.project)
        setNikkels(data.nikkels || [])
      })
      .catch(err => setError('Failed to load board'))
  }, [params.token])

  function getPinStyle(nikkel) {
    return {
      position: 'absolute',
      left: `${nikkel.coord_x}%`,
      top: `${nikkel.coord_y}%`,
      transform: 'translate(-50%, -50%)',
      zIndex: 1000,
      cursor: 'pointer'
    }
  }

  async function submitReply(e) {
    e.preventDefault()
    if (!replyText.trim()) return
    if (!token) return
    setSubmitting(true)
    setCollaboratorPrompt(null)
    try {
      const res = await fetch(`/api/board/${params.token}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ nikkelId: activeNikkel.id, text: replyText })
      })
      const data = await res.json()
      if (res.ok) {
        setReplyText('')
        const updated = nikkels.map(n =>
          n.id === activeNikkel.id
            ? { ...n, replies: [...(n.replies || []), data] }
            : n
        )
        setNikkels(updated)
        setActiveNikkel(prev => ({
          ...prev,
          replies: [...(prev.replies || []), data]
        }))
      } else if (res.status === 403 && data.error === 'not_a_collaborator') {
        setCollaboratorPrompt({ projectId: data.projectId, retryData: { nikkelId: activeNikkel.id, text: replyText } })
      } else {
        setError(data.error || `Request failed (${res.status})`)
      }
    } catch {
      setError('Network error submitting reply')
    }
    setSubmitting(false)
  }

  async function joinWorkspace() {
    if (!collaboratorPrompt || !token) return
    setJoining(true)
    try {
      const res = await fetch(`/api/projects/${collaboratorPrompt.projectId}/collaborators`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        setCollaboratorPrompt(null)
        const replyRes = await fetch(`/api/board/${params.token}/reply`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(collaboratorPrompt.retryData)
        })
        if (replyRes.ok) {
          const data = await replyRes.json()
          setReplyText('')
          const updated = nikkels.map(n =>
            n.id === activeNikkel.id
              ? { ...n, replies: [...(n.replies || []), data] }
              : n
          )
          setNikkels(updated)
          setActiveNikkel(prev => ({
            ...prev,
            replies: [...(prev.replies || []), data]
          }))
        } else {
          const d = await replyRes.json()
          setError(d.error || 'Reply failed after joining')
        }
      } else {
        const d = await res.json()
        setError(d.error || 'Failed to join workspace')
      }
    } catch {
      setError('Network error joining workspace')
    }
    setJoining(false)
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', marginTop: 80, color: '#ef4444' }}>
        <h2>Error loading board</h2>
        <p>{error}</p>
      </div>
    )
  }

  if (!project) {
    return (
      <div style={{ textAlign: 'center', marginTop: 80, color: '#9ca3af' }}>
        <h2>Loading board...</h2>
      </div>
    )
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden', background: '#f3f4f6' }}>
      {/* Header */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 2000,
        background: 'rgba(255,255,255,0.95)', borderBottom: '1px solid #e5e7eb',
        padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 12
      }}>
        <h1 style={{ fontSize: 16, color: '#6366f1', margin: 0 }}>Nikkel</h1>
        <span style={{ color: '#9ca3af' }}>|</span>
        <span style={{ fontSize: 14, fontWeight: 600 }}>{project.name}</span>
        <span style={{ fontSize: 12, color: '#6b7280' }}>{nikkels.length} annotation{nikkels.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Iframe container */}
      <div style={{ position: 'absolute', top: 44, left: 0, right: 0, bottom: 0 }}>
        <iframe
          ref={iframeRef}
          src={project.url}
          style={{ width: '100%', height: '100%', border: 'none' }}
          title="Client site review"
        />

        {/* Nikkel pins */}
        {nikkels.map(nikkel => (
          <div
            key={nikkel.id}
            style={getPinStyle(nikkel)}
            onClick={() => setActiveNikkel(nikkel)}
          >
            <NikkelPin nikkel={nikkel} />
          </div>
        ))}

        {/* Active comment bubble */}
        {activeNikkel && (
          <CommentBubble
            nikkel={activeNikkel}
            onClose={() => { setActiveNikkel(null); setCollaboratorPrompt(null) }}
            onSubmit={submitReply}
            replyText={replyText}
            setReplyText={setReplyText}
            submitting={submitting}
            token={token}
            collaboratorPrompt={collaboratorPrompt}
            onJoinWorkspace={joinWorkspace}
            joining={joining}
          />
        )}
      </div>
    </div>
  )
}

function NikkelPin({ nikkel }) {
  const severityColors = { low: '#10b981', medium: '#f59e0b', high: '#ef4444' }
  const dotColor = severityColors[nikkel.severity] || '#6366f1'

  return (
    <div style={{
      width: 28, height: 28, borderRadius: '50%', background: dotColor,
      border: '3px solid #fff', boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontSize: 12, fontWeight: 700,
      transition: 'transform 0.15s, box-shadow 0.15s'
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.2)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.4)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)' }}
    >
      {nikkel.classification === 'bug' ? '!' : nikkel.classification === 'copy' ? 'Aa' : nikkel.classification === 'design' ? '✦' : nikkel.classification === 'content' ? '¶' : '•'}
    </div>
  )
}

function CommentBubble({ nikkel, onClose, onSubmit, replyText, setReplyText, submitting, token, collaboratorPrompt, onJoinWorkspace, joining }) {
  return (
    <div style={{
      position: 'absolute', bottom: 20, right: 20, width: 360, maxHeight: 480,
      background: '#fff', borderRadius: 12, boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
      border: '1px solid #e5e7eb', zIndex: 2000, display: 'flex', flexDirection: 'column',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '12px 16px', borderBottom: '1px solid #e5e7eb'
      }}>
        <div>
          <span style={{ fontWeight: 600, fontSize: 14 }}>{nikkel.author_name || 'Anonymous'}</span>
          {nikkel.classification && (
            <span style={{
              marginLeft: 8, padding: '2px 6px', borderRadius: 4, background: '#eef2ff',
              color: '#4338ca', fontSize: 11, fontWeight: 600
            }}>{nikkel.classification}</span>
          )}
        </div>
        <button onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#6b7280', padding: '0 4px' }}>
          ×
        </button>
      </div>

      {/* Comment */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb' }}>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>{nikkel.comment_text}</p>
        {nikkel.agent_summary && (
          <p style={{ margin: '8px 0 0', fontSize: 12, color: '#6b7280', fontStyle: 'italic' }}>
            AI summary: {nikkel.agent_summary}
          </p>
        )}
        <p style={{ margin: '4px 0 0', fontSize: 11, color: '#9ca3af' }}>
          {new Date(nikkel.created_at).toLocaleDateString()} &middot; {nikkel.page_url ? new URL(nikkel.page_url).hostname : ''}
        </p>
      </div>

      {/* Replies */}
      {nikkel.replies?.length > 0 && (
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb', maxHeight: 150, overflowY: 'auto' }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Replies
          </p>
          {nikkel.replies.map(r => (
            <div key={r.id} style={{ marginBottom: 8, fontSize: 13 }}>
              <strong>{r.author_name}</strong>
              {r.is_client && <span style={{ marginLeft: 4, fontSize: 10, padding: '1px 4px', borderRadius: 3, background: '#dbeafe', color: '#1e40af' }}>Client</span>}
              <p style={{ margin: '2px 0 0', color: '#374151' }}>{r.body}</p>
              <p style={{ margin: 0, fontSize: 11, color: '#9ca3af' }}>{new Date(r.created_at).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      )}

      {/* Collaborator prompt */}
      {collaboratorPrompt && (
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb', background: '#fffbeb' }}>
          <p style={{ margin: '0 0 8px', fontSize: 13, color: '#92400e' }}>
            You need to join this project's workspace to reply.
          </p>
          <button
            onClick={onJoinWorkspace}
            disabled={joining}
            style={{
              width: '100%', padding: '8px 16px', border: 'none', borderRadius: 6,
              background: joining ? '#9ca3af' : '#6366f1', color: '#fff',
              fontWeight: 600, cursor: joining ? 'not-allowed' : 'pointer', fontSize: 13
            }}
          >
            {joining ? 'Joining...' : 'Add to my workspace'}
          </button>
        </div>
      )}

      {/* Reply form */}
      {!collaboratorPrompt && (
        <form onSubmit={onSubmit} style={{ padding: '12px 16px' }}>
          {!token && (
            <p style={{ margin: '0 0 8px', fontSize: 12, color: '#6b7280', textAlign: 'center' }}>
              <a href="/dashboard" style={{ color: '#6366f1' }}>Sign in</a> to reply
            </p>
          )}
          <textarea
            placeholder="Write a reply..."
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            required
            rows={3}
            style={{
              width: '100%', padding: '8px 12px', border: '1px solid #d1d5db',
              borderRadius: 6, fontSize: 13, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: 8
            }}
          />
          <button
            type="submit"
            disabled={submitting || !token}
            style={{
              width: '100%', padding: '8px 16px', border: 'none', borderRadius: 6,
              background: submitting || !token ? '#9ca3af' : '#6366f1', color: '#fff',
              fontWeight: 600, cursor: submitting || !token ? 'not-allowed' : 'pointer', fontSize: 13
            }}
          >
            {!token ? 'Sign in to reply' : submitting ? 'Submitting...' : 'Reply'}
          </button>
        </form>
      )}
    </div>
  )
}
