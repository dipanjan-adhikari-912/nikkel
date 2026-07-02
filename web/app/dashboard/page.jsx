'use client'

import { useEffect, useState, useCallback } from 'react'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

const btn = {
  width: '100%', padding: '10px 16px', border: 'none', borderRadius: 8,
  fontSize: 14, fontWeight: 600, cursor: 'pointer', color: '#fff'
}

const input = {
  width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8,
  fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box'
}

const smallBtn = {
  padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: 4,
  background: '#f3f4f6', cursor: 'pointer', fontSize: 11, fontWeight: 500
}

export default function DashboardPage() {
  const [user, setUser] = useState(null)
  const [projects, setProjects] = useState([])
  const [summaries, setSummaries] = useState({})
  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [newUrl, setNewUrl] = useState('')
  const [selected, setSelected] = useState(null)
  const [nikkels, setNikkels] = useState([])
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let t = localStorage.getItem('nikkel_token')
    if (!t) {
      const hash = window.location.hash
      const match = hash.match(/token=([^&]+)/)
      if (match) {
        t = decodeURIComponent(match[1])
        localStorage.setItem('nikkel_token', t)
        window.location.hash = ''
      }
    }
    if (t) setToken(t)
  }, [])

  useEffect(() => {
    if (token) { loadUser(); loadProjects() }
  }, [token])

  const api = useCallback(async (path, opts = {}) => {
    const t = token || localStorage.getItem('nikkel_token')
    const headers = { 'Content-Type': 'application/json', ...opts.headers }
    if (t) headers['Authorization'] = `Bearer ${t}`
    const res = await fetch(`${API_BASE}${path}`, { ...opts, headers })
    const body = await res.json().catch(() => ({ error: 'Unexpected response' }))
    if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`)
    return body
  }, [token])

  async function loadUser() {
    try { setUser(await api('/auth/me')) } catch {}
  }

  async function loadProjects() {
    try {
      const data = await api('/projects')
      setProjects(data)
      data.forEach(async p => {
        try {
          const d = await api(`/projects/${p.id}`)
          setSummaries(prev => ({ ...prev, [p.id]: d.summary }))
        } catch {}
      })
    } catch {}
  }

  async function createProject() {
    await api('/projects', {
      method: 'POST',
      body: JSON.stringify({ name: newName, url: newUrl })
    })
    setNewName(''); setNewUrl(''); setShowNew(false)
    await loadProjects()
  }

  async function deleteProject(id) {
    await api(`/projects/${id}`, { method: 'DELETE' })
    if (selected?.id === id) { setSelected(null); setNikkels([]) }
    await loadProjects()
  }

  async function loadNikkels(pid) {
    try { setNikkels(await api(`/projects/${pid}/nikkels`)) } catch {}
  }

  async function updateNikkelStatus(id, status) {
    await api(`/nikkels/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    })
    await loadNikkels(selected.id)
  }

  async function pushJira(id) { await api(`/integrations/jira/push/${id}`, { method: 'POST' }) }
  async function pushAsana(id) { await api(`/integrations/asana/push/${id}`, { method: 'POST' }) }

  function copyShareLink(pid) {
    const p = projects.find(x => x.id === pid)
    if (p?.share_token) {
      navigator.clipboard.writeText(`${window.location.origin}/board/${p.share_token}`)
    }
  }

  async function testMode() {
    setLoading(true); setError('')
    const ts = Date.now()
    const email = `test${ts}@nikkel.app`
    try {
      await api('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password: 'password', fullName: 'Test User', orgName: 'Test Org' })
      })
    } catch {}
    try {
      const data = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password: 'password' })
      })
      localStorage.setItem('nikkel_token', data.token)
      setToken(data.token)
      const projects = await api('/projects')
      if (projects.length === 0) {
        await api('/projects', {
          method: 'POST',
          body: JSON.stringify({ name: 'My Test Site', url: window.location.origin })
        })
      }
      await loadUser()
      await loadProjects()
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const statusColors = { open: '#fef3c7', in_progress: '#dbeafe', resolved: '#d1fae5' }
  const statusLabels = { open: 'Open', in_progress: 'In Progress', resolved: 'Resolved' }
  const severityColors = { low: '#d1fae5', medium: '#fef3c7', high: '#fee2e2' }

  if (!token) return <AuthScreen api={api} onToken={(t, u) => { localStorage.setItem('nikkel_token', t); setToken(t); if (u) setUser(u) }} testMode={testMode} loading={loading} />

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <div style={{ width: 320, borderRight: '1px solid #e5e7eb', padding: 24, overflowY: 'auto', background: '#f9fafb' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h1 style={{ color: '#6366f1', fontSize: 20 }}>Nikkel</h1>
          <button onClick={() => { localStorage.removeItem('nikkel_token'); setToken(null); setUser(null) }}
            style={{ padding: '6px 12px', border: '1px solid #d1d5db', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 12 }}>
            Logout
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ fontSize: 14, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Projects</h2>
          <button onClick={() => setShowNew(true)} style={{ padding: '4px 10px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>+ New</button>
        </div>

        {showNew && (
          <div style={{ marginBottom: 12, padding: 12, background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb' }}>
            <input placeholder="Project name" value={newName} onChange={e => setNewName(e.target.value)} style={{ ...input, marginBottom: 6 }} />
            <input placeholder="Site URL (https://...)" value={newUrl} onChange={e => setNewUrl(e.target.value)} style={{ ...input, marginBottom: 8 }} />
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={createProject} style={{ ...btn, flex: 1, padding: 8, fontSize: 13 }}>Create</button>
              <button onClick={() => setShowNew(false)} style={{ padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
            </div>
          </div>
        )}

        {projects.map(p => (
          <div key={p.id} onClick={() => { setSelected(p); loadNikkels(p.id) }}
            style={{
              padding: '10px 12px', marginBottom: 6, borderRadius: 8, cursor: 'pointer',
              background: selected?.id === p.id ? '#eef2ff' : '#fff',
              border: selected?.id === p.id ? '1px solid #6366f1' : '1px solid #e5e7eb'
            }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{p.name}</div>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>{p.url}</div>
            {summaries[p.id] && (
              <div style={{ display: 'flex', gap: 8, fontSize: 11, color: '#6b7280' }}>
                <span>{summaries[p.id].total} total</span>
                <span style={{ color: '#d97706' }}>{summaries[p.id].open} open</span>
                <span style={{ color: '#2563eb' }}>{summaries[p.id].in_progress} in progress</span>
                <span style={{ color: '#059669' }}>{summaries[p.id].resolved} resolved</span>
              </div>
            )}
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              <button onClick={e => { e.stopPropagation(); copyShareLink(p.id) }} style={{ padding: '3px 8px', border: '1px solid #d1d5db', borderRadius: 4, background: '#fff', cursor: 'pointer', fontSize: 11 }}>Copy Share Link</button>
              <button onClick={e => { e.stopPropagation(); deleteProject(p.id) }} style={{ padding: '3px 8px', border: '1px solid #fca5a5', borderRadius: 4, background: '#fff', color: '#dc2626', cursor: 'pointer', fontSize: 11 }}>Delete</button>
            </div>
          </div>
        ))}
      </div>

      <div style={{ flex: 1, padding: 24, overflowY: 'auto' }}>
        {!selected && (
          <div style={{ textAlign: 'center', color: '#9ca3af', marginTop: 80 }}>
            <p style={{ fontSize: 18, marginBottom: 8 }}>Select a project to view Nikkels</p>
            <p style={{ fontSize: 14 }}>Or create a new project to get started</p>
          </div>
        )}

        {selected && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 22 }}>{selected.name}</h2>
                <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 14 }}>{selected.url}</p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="text" readOnly value={`${window.location.origin}/board/${selected.share_token}`}
                  style={{ padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, width: 260 }} />
                <button onClick={() => copyShareLink(selected.id)}
                  style={{ padding: '6px 12px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>Copy</button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              {['open', 'in_progress', 'resolved'].map(status => (
                <div key={status}>
                  <h3 style={{
                    margin: '0 0 12px', fontSize: 14, textTransform: 'uppercase',
                    letterSpacing: '0.05em', color: '#6b7280',
                    padding: '8px 12px', borderRadius: 6, background: statusColors[status]
                  }}>
                    {statusLabels[status]} ({nikkels.filter(n => n.status === status).length})
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {nikkels.filter(n => n.status === status).map(n => (
                      <div key={n.id} style={{
                        padding: 12, background: '#fff', borderRadius: 8,
                        border: '1px solid #e5e7eb', fontSize: 13
                      }}>
                        <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                          {n.classification && (
                            <span style={{ padding: '2px 6px', borderRadius: 4, background: '#eef2ff', color: '#4338ca', fontSize: 11, fontWeight: 600 }}>
                              {n.classification}
                            </span>
                          )}
                          {n.severity && (
                            <span style={{ padding: '2px 6px', borderRadius: 4, background: severityColors[n.severity], color: '#374151', fontSize: 11 }}>
                              {n.severity}
                            </span>
                          )}
                        </div>
                        <p style={{ margin: '0 0 4px', fontWeight: 600 }}>{n.comment_text.slice(0, 80)}{n.comment_text.length > 80 ? '...' : ''}</p>
                        {n.agent_summary && (
                          <p style={{ margin: '0 0 6px', color: '#6b7280', fontSize: 12 }}>{n.agent_summary}</p>
                        )}
                        <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 8 }}>
                          {n.author_name} &middot; {new Date(n.created_at).toLocaleDateString()}
                          {n.page_url && <> &middot; {new URL(n.page_url).hostname}</>}
                        </div>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {status === 'open' && (
                            <button onClick={() => updateNikkelStatus(n.id, 'in_progress')} style={smallBtn}>Start</button>
                          )}
                          {status === 'in_progress' && (
                            <button onClick={() => updateNikkelStatus(n.id, 'resolved')} style={{ ...smallBtn, background: '#d1fae5', color: '#065f46' }}>Resolve</button>
                          )}
                          {status !== 'open' && (
                            <button onClick={() => updateNikkelStatus(n.id, 'open')} style={{ ...smallBtn, background: '#fef3c7', color: '#92400e' }}>Reopen</button>
                          )}
                          <button onClick={() => pushJira(n.id)} style={{ ...smallBtn, background: '#eef2ff', color: '#4338ca' }}>Jira</button>
                          <button onClick={() => pushAsana(n.id)} style={{ ...smallBtn, background: '#fef3c7', color: '#92400e' }}>Asana</button>
                        </div>
                        {n.replies?.length > 0 && (
                          <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #e5e7eb' }}>
                            <p style={{ fontSize: 11, color: '#6b7280', margin: '0 0 4px' }}>
                              {n.replies.length} repl{n.replies.length === 1 ? 'y' : 'ies'}
                            </p>
                            {n.replies.slice(0, 2).map(r => (
                              <p key={r.id} style={{ fontSize: 12, margin: '2px 0', color: '#374151' }}>
                                <strong>{r.author_name}:</strong> {r.text.slice(0, 60)}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function AuthScreen({ api, onToken, testMode, loading }) {
  const [tab, setTab] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [orgName, setOrgName] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showForgot, setShowForgot] = useState(false)
  const [resetEmail, setResetEmail] = useState('')

  function clearMessages() { setError(''); setSuccess('') }

  function validate() {
    if (!email.includes('@')) return 'Enter a valid email address'
    if (tab === 'register') {
      if (password.length < 6) return 'Password must be at least 6 characters'
      if (!fullName.trim()) return 'Full name is required'
      if (!orgName.trim()) return 'Organization name is required'
    }
    return null
  }

  async function handleSubmit(e) {
    e.preventDefault(); clearMessages()
    const v = validate()
    if (v) { setError(v); return }
    setSubmitting(true)
    try {
      if (tab === 'login') {
        const data = await api('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password })
        })
        onToken(data.token, data.user)
      } else {
        const data = await api('/auth/register', {
          method: 'POST',
          body: JSON.stringify({ email, password, fullName, orgName })
        })
        onToken(data.token, data.user)
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleForgot(e) {
    e.preventDefault(); clearMessages()
    if (!resetEmail.includes('@')) { setError('Enter a valid email address'); return }
    setSubmitting(true)
    try {
      const data = await api('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: resetEmail })
      })
      setSuccess(data.message)
    } catch (e) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (showForgot) {
    return (
      <div style={{ maxWidth: 400, margin: '80px auto', padding: 24 }}>
        <h1 style={{ color: '#6366f1', marginBottom: 8 }}>Nikkel</h1>
        <h2 style={{ fontSize: 18, marginBottom: 16 }}>Reset Password</h2>
        {error && <p style={{ color: '#dc2626', fontSize: 13, marginBottom: 12, padding: '8px 12px', background: '#fef2f2', borderRadius: 6 }}>{error}</p>}
        {success && <p style={{ color: '#059669', fontSize: 13, marginBottom: 12, padding: '8px 12px', background: '#ecfdf5', borderRadius: 6 }}>{success}</p>}
        <form onSubmit={handleForgot}>
          <input type="email" placeholder="Your email" value={resetEmail} onChange={e => setResetEmail(e.target.value)} style={{ ...input, marginBottom: 12 }} />
          <button type="submit" disabled={submitting} style={{ ...btn, background: submitting ? '#9ca3af' : '#6366f1' }}>
            {submitting ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>
        <button onClick={() => { setShowForgot(false); clearMessages() }} style={{ marginTop: 12, background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontSize: 13 }}>Back to login</button>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 400, margin: '80px auto', padding: 24 }}>
      <h1 style={{ color: '#6366f1', marginBottom: 24 }}>Nikkel Dashboard</h1>

      <button onClick={testMode} disabled={loading}
        style={{ ...btn, marginBottom: 16, background: loading ? '#9ca3af' : '#059669' }}>
        {loading ? 'Starting...' : 'Quick Start (Test Mode)'}
      </button>

      <div style={{ textAlign: 'center', color: '#9ca3af', marginBottom: 16, fontSize: 13 }}>
        or {tab === 'login' ? 'log in' : 'register'} with your account
      </div>

      <div style={{ display: 'flex', marginBottom: 16, borderRadius: 8, overflow: 'hidden', border: '1px solid #e5e7eb' }}>
        <button onClick={() => { setTab('login'); clearMessages() }}
          style={{ flex: 1, padding: '8px 0', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, background: tab === 'login' ? '#6366f1' : '#f3f4f6', color: tab === 'login' ? '#fff' : '#374151' }}>
          Login
        </button>
        <button onClick={() => { setTab('register'); clearMessages() }}
          style={{ flex: 1, padding: '8px 0', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, background: tab === 'register' ? '#6366f1' : '#f3f4f6', color: tab === 'register' ? '#fff' : '#374151' }}>
          Register
        </button>
      </div>

      {error && <p style={{ color: '#dc2626', fontSize: 13, marginBottom: 12, padding: '8px 12px', background: '#fef2f2', borderRadius: 6, border: '1px solid #fecaca' }}>{error}</p>}

      <form onSubmit={handleSubmit}>
        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} style={{ ...input, marginBottom: 12 }} />
        <input type="password" placeholder="Password (min 6 chars)" value={password} onChange={e => setPassword(e.target.value)} style={{ ...input, marginBottom: 12 }} />
        {tab === 'register' && (
          <>
            <input placeholder="Full Name" value={fullName} onChange={e => setFullName(e.target.value)} style={{ ...input, marginBottom: 12 }} />
            <input placeholder="Organization Name" value={orgName} onChange={e => setOrgName(e.target.value)} style={{ ...input, marginBottom: 12 }} />
          </>
        )}
        <button type="submit" disabled={submitting} style={{ ...btn, background: submitting ? '#9ca3af' : '#6366f1' }}>
          {submitting ? (tab === 'login' ? 'Logging in...' : 'Registering...') : (tab === 'login' ? 'Login' : 'Register')}
        </button>
      </form>

      {tab === 'login' && (
        <button onClick={() => { setShowForgot(true); clearMessages() }}
          style={{ marginTop: 12, background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontSize: 13 }}>
          Forgot password?
        </button>
      )}
    </div>
  )
}
