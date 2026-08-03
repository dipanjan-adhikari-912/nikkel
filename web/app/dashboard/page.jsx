'use client'

import { useEffect, useState, useCallback, useRef } from 'react'

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
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState(null)
  const [menuOpen, setMenuOpen] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [toast, setToast] = useState(null)
  const [unread, setUnread] = useState({})
  const [lastRefreshed, setLastRefreshed] = useState(null)
  const intervalRef = useRef(null)

  const fetchData = useCallback(async (t) => {
    if (!t) return
    try {
      const [u, p] = await Promise.all([
        api(t, '/auth/me'),
        api(t, '/projects'),
      ])
      setUser(u)
      setProjects(p)
    } catch (e) {
      if (e.message?.includes('(401)')) {
        setToken(null)
        try { sessionStorage.removeItem('nikkel_token') } catch {}
      }
    } finally {
      setLoading(false)
    }
  }, [])

  const pollUnread = useCallback(async (t) => {
    if (!t) return
    try {
      const res = await api(t, '/projects/unread')
      setUnread(res.byProject || {})
      setLastRefreshed(new Date())
    } catch {}
  }, [])

  useEffect(() => {
    const t = getToken()
    if (t) { setToken(t); return }

    function handler(event) {
      if (event.data?.source === 'nikkel-extension' && event.data?.token) {
        setToken(event.data.token)
        try { sessionStorage.setItem('nikkel_token', event.data.token) } catch {}
      }
    }
    window.addEventListener('message', handler)

    const interval = setInterval(() => {
      const dt = document.documentElement.dataset.nikkelToken
      if (dt) { setToken(dt); try { sessionStorage.setItem('nikkel_token', dt) } catch {}; clearInterval(interval); clearTimeout(timer); window.removeEventListener('message', handler) }
    }, 300)

    window.postMessage({ type: 'NIKKEL_PING' }, '*')
    const timer = setTimeout(() => { clearInterval(interval); window.removeEventListener('message', handler) }, 5000)
    return () => { clearInterval(interval); clearTimeout(timer); window.removeEventListener('message', handler) }
  }, [])

  useEffect(() => {
    if (!token) return
    setLoading(true)
    fetchData(token)
    pollUnread(token)
    // Refresh every 60s
    intervalRef.current = setInterval(() => {
      fetchData(token)
      pollUnread(token)
    }, 60000)
    // Refresh when tab becomes visible
    const onVisible = () => { if (document.visibilityState === 'visible') { fetchData(token); pollUnread(token) } }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(intervalRef.current)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [token, fetchData, pollUnread])

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
    setDeletingId(id)
    try {
      await api(token, `/projects/${id}`, { method: 'DELETE' })
      const updated = await api(token, '/projects')
      setProjects(updated)
      setToast('Project deleted')
    } catch {
      setToast('Failed to delete project')
    } finally {
      setDeletingId(null)
    }
  }, [token])

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(id)
  }, [toast])

  function copyShareLink(shareToken) {
    navigator.clipboard.writeText(`${window.location.origin}/review/${shareToken}`)
      .then(() => setToast('Share link copied'))
      .catch(() => setToast('Failed to copy link'))
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

        {/* Refresh row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, fontSize: 12, color: '#64748b' }}>
          <button onClick={() => { fetchData(token); pollUnread(token) }} style={{ padding: '4px 12px', background: '#1e293b', border: '1px solid #334155', borderRadius: 4, color: '#94a3b8', cursor: 'pointer', fontSize: 12 }}>
            Refresh
          </button>
          <span>Last refreshed: {lastRefreshed ? lastRefreshed.toLocaleString() : '—'}</span>
        </div>

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

        {/* Toast */}
        {toast && (
          <div style={{ position: 'fixed', bottom: 24, right: 24, padding: '10px 20px', background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#e2e8f0', fontSize: 14, zIndex: 1000, boxShadow: '0 4px 12px rgba(0,0,0,0.4)' }}>
            {toast}
          </div>
        )}

        {/* Project grid */}
        {nav === 'home' && (
          loading ? (
            <div style={{ textAlign: 'center', marginTop: 80, color: '#64748b' }}>
              <p style={{ fontSize: 15 }}>Loading...</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {projects.map(p => (
                <ProjectCard
                  key={p.id}
                  project={p}
                  unreadCount={unread[p.id] || 0}
                  menuOpen={menuOpen === p.id}
                  onMenuToggle={() => setMenuOpen(menuOpen === p.id ? null : p.id)}
                  onShare={() => copyShareLink(p.share_token)}
                  onDelete={() => { setMenuOpen(null); setConfirmDelete(p.id) }}
                />
              ))}
              {projects.length === 0 && (
                <div style={{ textAlign: 'center', padding: 40, color: '#64748b', gridColumn: '1 / -1' }}>
                  <p style={{ fontSize: 15 }}>No projects yet. Click "+ New Project" to get started.</p>
                </div>
              )}
            </div>
          )
        )}
      </div>

      {/* Delete confirmation dialog */}
      {confirmDelete && (
        <div
          onClick={() => setConfirmDelete(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 }}
        >
          <div onClick={e => e.stopPropagation()} style={{ width: 420, maxWidth: '100%', background: '#101014', border: '1px solid #1b2723', borderRadius: 16, padding: 28 }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 600, color: '#ffffff' }}>Delete project?</h3>
            <p style={{ margin: 0, fontSize: 14, color: '#82b0a0', lineHeight: 1.5 }}>
              This will permanently delete the project and all its feedback. This action cannot be undone.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
              <button
                onClick={() => setConfirmDelete(null)}
                style={{ padding: '9px 16px', background: '#1b2723', color: '#e2e8f0', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}
              >
                Cancel
              </button>
              <button
                onClick={() => { const id = confirmDelete; setConfirmDelete(null); deleteProject(id) }}
                disabled={deletingId === confirmDelete}
                style={{ padding: '9px 16px', background: deletingId === confirmDelete ? '#7f1d1d' : '#dc2626', color: '#fff', border: 'none', borderRadius: 8, cursor: deletingId === confirmDelete ? 'wait' : 'pointer', fontSize: 14, fontWeight: 500 }}
              >
                {deletingId === confirmDelete ? 'Deleting...' : 'Delete project'}
              </button>
            </div>
          </div>
        </div>
      )}
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

function timeAgo(iso) {
  if (!iso) return ''
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'Just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function ProjectCard({ project, unreadCount, menuOpen, onMenuToggle, onShare, onDelete }) {
  let domain = ''
  try { domain = project.base_url ? new URL(project.base_url).hostname : '' } catch {}
  const pages = project.pageBreakdown || []
  const pageCount = pages.length
  const name = project.title || domain || 'Untitled Project'

  return (
    <div style={{ background: '#101014', borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Screenshot area */}
      <div style={{ position: 'relative', aspectRatio: '466 / 312', margin: 22, borderRadius: 16, background: '#1b2723', overflow: 'hidden' }}>
        {project.screenshot_url ? (
          <img src={project.screenshot_url} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#ffffff', fontSize: 16, fontWeight: 500 }}>[ screenshot ]</span>
          </div>
        )}

        {/* Overlay pill (project + time) */}
        <div style={{ position: 'absolute', top: 8, left: 8, display: 'flex', alignItems: 'center', gap: 8, padding: 8, background: '#1b2723cc', borderRadius: 8, backdropFilter: 'blur(3.5px)' }}>
          <img
            src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
            alt=""
            onError={(e) => { e.target.style.display = 'none' }}
            style={{ width: 37, height: 37, borderRadius: '50%', objectFit: 'cover', background: '#d9d9d9' }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <span style={{ color: '#ddf3ec', fontSize: 14, fontWeight: 500, lineHeight: '16px' }}>{name}</span>
            <span style={{ color: '#82b0a0', fontSize: 11, fontWeight: 500, lineHeight: '16px' }}>{timeAgo(project.lastActivityAt)}</span>
          </div>
        </div>

        {/* ellipsis menu */}
        <div style={{ position: 'absolute', top: 8, right: 8 }}>
          <div
            onClick={(e) => { e.stopPropagation(); onMenuToggle() }}
            style={{ width: 32, height: 32, borderRadius: 6, background: '#1b2723cc', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <svg width="4" height="16" viewBox="0 0 4 16" style={{ display: 'block' }}>
              {[3.2, 8, 12.8].map(y => <circle key={y} cx="2" cy={y} r="1.6" fill="#e2e8f0" />)}
            </svg>
          </div>
          {menuOpen && (
            <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', top: 38, right: 0, width: 150, background: '#101014', border: '1px solid #1b2723', borderRadius: 10, padding: 6, boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
              <div onClick={onShare} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 10px', borderRadius: 6, cursor: 'pointer', color: '#ddf3ec', fontSize: 13 }} onMouseEnter={e => e.currentTarget.style.background = '#1b2723'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <svg width="15" height="15" viewBox="0 0 24 24" style={{ display: 'block' }}><path d="M5 12a2 2 0 1 0 0-.01M19 6a2 2 0 1 0 0-.01M19 18a2 2 0 1 0 0-.01" fill="none" stroke="#82b0a0" strokeWidth="2" /><path d="M12 11a1 1 0 0 0 .5-.87l2.5-1.5M9.5 15.4a3 3 0 1 0 3.5-5.1l2.5-1.5" fill="none" stroke="#82b0a0" strokeWidth="2" strokeLinecap="round" /></svg>
                Share link
              </div>
              <div onClick={onDelete} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 10px', borderRadius: 6, cursor: 'pointer', color: '#f87171', fontSize: 13 }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(220,38,38,0.12)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <svg width="15" height="15" viewBox="0 0 24 24" style={{ display: 'block' }}><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                Delete project
              </div>
            </div>
          )}
        </div>

        {unreadCount > 0 && (
          <span style={{ position: 'absolute', top: 8, right: 48, minWidth: 18, height: 18, padding: '0 5px', borderRadius: 9, background: '#ef4444', color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{unreadCount}</span>
        )}
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 22px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* page count */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" style={{ display: 'block' }}><path d="M14 3v5h5" /><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5z" /><path d="M9 14h6M9 17h6" fill="none" stroke="#ddf3ec" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" /></svg>
            <span style={{ color: '#ffffff', fontSize: 15 }}>{pageCount} {pageCount === 1 ? 'Page' : 'Pages'}</span>
          </div>
          <div style={{ width: 1, height: 18, background: '#82b0a033' }} />
          {/* nikkel count */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 24, height: 24, borderRadius: 12, background: '#71b9a1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#1b2723', fontSize: 14, fontWeight: 500 }}>{project.nikkelCount ?? 0}</span>
            </div>
            <span style={{ color: '#ffffff', fontSize: 15 }}>nikkels</span>
          </div>
        </div>

        <a
          href={`/review/${project.share_token}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
        >
          <span style={{ color: '#ffffff', fontSize: 14, fontWeight: 500 }}>View project</span>
          <svg width="14" height="14" viewBox="0 0 24 24" style={{ display: 'block' }}><path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="#71b9a1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </a>
      </div>
    </div>
  )
}
