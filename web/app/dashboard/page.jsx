'use client'

import { useEffect, useState, useCallback } from 'react'

const DEFAULT_AVATAR = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><rect fill="#334155" width="40" height="40" rx="20"/><text x="20" y="26" text-anchor="middle" fill="#94a3b8" font-size="18" font-family="sans-serif">?</text></svg>')

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

function api(token, path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...opts.headers }
  if (token) headers['Authorization'] = `Bearer ${token}`
  return fetch(`/api${path}`, { ...opts, headers }).then(async (res) => {
    const body = await res.json().catch(() => ({ error: 'Unexpected response' }))
    if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`)
    return body
  })
}

export default function DashboardPage() {
  const [token, setToken] = useState(null)
  const [user, setUser] = useState(null)
  const [projects, setProjects] = useState([])
  const [showNew, setShowNew] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newUrl, setNewUrl] = useState('')
  const [nav, setNav] = useState('home')

  useEffect(() => {
    const t = getToken()
    if (t) setToken(t)
  }, [])

  useEffect(() => {
    if (!token) return
    api(token, '/auth/me').then(setUser).catch((e) => {
      if (e.message?.includes('(401)')) { setToken(null); try { sessionStorage.removeItem('nikkel_token') } catch {} }
    })
    api(token, '/projects').then(setProjects).catch(() => {})
  }, [token])

  const createProject = useCallback(async () => {
    if (!newTitle.trim() || !newUrl.trim()) return
    try {
      await api(token, '/projects', {
        method: 'POST',
        body: JSON.stringify({ title: newTitle, baseUrl: newUrl })
      })
      setNewTitle(''); setNewUrl(''); setShowNew(false)
      const updated = await api(token, '/projects')
      setProjects(updated)
    } catch {}
  }, [token, newTitle, newUrl])

  const deleteProject = useCallback(async (id) => {
    try {
      await api(token, `/projects/${id}`, { method: 'DELETE' })
      const updated = await api(token, '/projects')
      setProjects(updated)
    } catch {}
  }, [token])

  function copyShareLink(shareToken) {
    navigator.clipboard.writeText(`${window.location.origin}/review/${shareToken}`)
  }

  if (!token) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0f172a', color: '#94a3b8' }}>
        <p>Sign in via the Nikkel extension to access the dashboard.</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#0f172a', color: '#e2e8f0' }}>
      {/* Sidebar */}
      <Sidebar
        user={user}
        nav={nav}
        onNav={setNav}
        onLogout={() => setToken(null)}
      />

      {/* Main */}
      <div style={{ flex: 1, overflow: 'auto', padding: 32 }}>
        {/* Top bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>
            {nav === 'new' ? 'New Activity' : nav === 'archive' ? 'Archive' : 'Projects'}
          </h1>
          {nav === 'home' && (
            <button
              onClick={() => setShowNew(true)}
              style={{ padding: '8px 16px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 500 }}
            >
              + New Project
            </button>
          )}
        </div>

        {/* New activity / Archive placeholders */}
        {nav !== 'home' && (
          <div style={{ textAlign: 'center', marginTop: 80, color: '#64748b' }}>
            <p style={{ fontSize: 15 }}>Coming soon</p>
          </div>
        )}

        {/* New project form */}
        {showNew && (
          <div style={{ marginBottom: 24, padding: 16, background: '#1e293b', borderRadius: 8, border: '1px solid #334155', maxWidth: 480 }}>
            <input
              placeholder="Project title"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', background: '#0f172a', border: '1px solid #334155', color: '#e2e8f0', borderRadius: 6, fontSize: 14, marginBottom: 8, boxSizing: 'border-box' }}
            />
            <input
              placeholder="Site URL (https://...)"
              value={newUrl}
              onChange={e => setNewUrl(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', background: '#0f172a', border: '1px solid #334155', color: '#e2e8f0', borderRadius: 6, fontSize: 14, marginBottom: 12, boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={createProject} style={{ padding: '8px 16px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>Create</button>
              <button onClick={() => setShowNew(false)} style={{ padding: '8px 16px', background: '#1e293b', color: '#94a3b8', border: '1px solid #334155', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
            </div>
          </div>
        )}

        {/* Project grid */}
        {nav === 'home' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {projects.map(p => (
              <ProjectCard
                key={p.id}
                project={p}
                onCopyShare={() => copyShareLink(p.share_token)}
                onDelete={() => deleteProject(p.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Sidebar({ user, nav, onNav, onLogout }) {
  const items = [
    { key: 'home', label: 'Home', icon: '⌂' },
    { key: 'new', label: 'New activity', icon: '⚡' },
    { key: 'archive', label: 'Archive', icon: '📁' },
  ]

  return (
    <div style={{ width: 240, borderRight: '1px solid #1e293b', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
      {/* Wordmark */}
      <div style={{ padding: '24px 20px 16px' }}>
        <span style={{ color: '#6366f1', fontWeight: 700, fontSize: 20 }}>Nikkel</span>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '0 8px' }}>
        {items.map(item => {
          const active = nav === item.key
          const disabled = item.key !== 'home'
          return (
            <div
              key={item.key}
              onClick={() => !disabled && onNav(item.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', marginBottom: 2, borderRadius: 6,
                cursor: disabled ? 'default' : 'pointer',
                background: active ? '#1e293b' : 'transparent',
                color: active ? '#e2e8f0' : disabled ? '#475569' : '#94a3b8',
                fontSize: 14,
              }}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </div>
          )
        })}
      </nav>

      {/* User card */}
      {user && (
        <div style={{ borderTop: '1px solid #1e293b', padding: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
          <img
            src={user.avatar_url || DEFAULT_AVATAR}
            alt=""
            style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name || user.email || 'User'}</div>
            <div style={{ fontSize: 11, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email || ''}</div>
          </div>
          <button onClick={onLogout} style={{ background: 'none', border: '1px solid #334155', color: '#94a3b8', borderRadius: 4, padding: '4px 8px', cursor: 'pointer', fontSize: 11, flexShrink: 0 }}>
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}

function relativePath(pageUrl, baseUrl) {
  if (!pageUrl || pageUrl === 'unknown') return '/'
  try {
    const full = new URL(pageUrl)
    const base = baseUrl ? new URL(baseUrl) : null
    if (base && full.origin + full.pathname === base.origin + base.pathname) return '/'
    if (base && full.origin === base.origin) return full.pathname + full.search || '/'
    return pageUrl
  } catch { return pageUrl }
}

function ProjectCard({ project, onCopyShare, onDelete }) {
  let domain = ''
  try { domain = project.base_url ? new URL(project.base_url).hostname : '' } catch {}
  const isOwner = project.role !== 'collaborator'
  const pages = project.pageBreakdown || []
  const pageCount = pages.length

  return (
    <div style={{ background: '#1e293b', borderRadius: 8, border: '1px solid #334155', overflow: 'hidden' }}>
      {/* Header with favicon */}
      <div style={{ padding: '14px 14px 8px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <img
          src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
          alt=""
          onError={(e) => { e.target.style.display = 'none' }}
          style={{ width: 28, height: 28, borderRadius: 4, flexShrink: 0 }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontWeight: 700, fontSize: 15, color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{domain || 'No URL'}</span>
            {!isOwner && (
              <span style={{ padding: '1px 6px', borderRadius: 3, fontSize: 10, fontWeight: 600, background: '#fef3c7', color: '#92400e', textTransform: 'uppercase', flexShrink: 0 }}>Collab</span>
            )}
          </div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>
            {pageCount} {pageCount === 1 ? 'page' : 'pages'} · {project.nikkelCount ?? 0} nikkels
          </div>
        </div>
      </div>

      {/* Page list */}
      {pages.length > 0 && (
        <div style={{ margin: '4px 10px 0', borderTop: '1px solid #334155', paddingTop: 6 }}>
          {pages.map((page, i) => (
            <a
              key={i}
              href={page.pageUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', borderRadius: 4,
                fontSize: 13, color: '#cbd5e1', textDecoration: 'none', cursor: 'pointer',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#334155' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
            >
              <span style={{ color: '#475569', flexShrink: 0, fontSize: 11 }}>📄</span>
              <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: 'monospace', fontSize: 12 }}>
                {relativePath(page.pageUrl, project.base_url)}
              </span>
              <span style={{ padding: '1px 7px', borderRadius: 8, background: '#334155', color: '#94a3b8', fontSize: 11, fontWeight: 500, flexShrink: 0 }}>
                {page.nikkelCount}
              </span>
            </a>
          ))}
        </div>
      )}

      {/* Footer */}
      <div style={{ padding: '8px 14px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, color: '#475569' }}>
          {project.lastActivityAt ? new Date(project.lastActivityAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''}
        </span>
        {isOwner && (
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={onCopyShare} style={{ padding: '4px 10px', border: '1px solid #334155', borderRadius: 4, background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: 11 }}>Copy link</button>
            <button onClick={onDelete} style={{ padding: '4px 10px', border: '1px solid #7f1d1d', borderRadius: 4, background: 'transparent', color: '#fca5a5', cursor: 'pointer', fontSize: 11 }}>Delete</button>
          </div>
        )}
      </div>
    </div>
  )
}
