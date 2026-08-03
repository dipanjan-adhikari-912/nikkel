'use client'

import { useEffect, useState, useCallback, useRef } from 'react'

const DEFAULT_AVATAR = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><rect fill="#334155" width="40" height="40" rx="20"/><text x="20" y="26" text-anchor="middle" fill="#94a3b8" font-size="18" font-family="sans-serif">?</text></svg>')

// Exact proportions from the pencil `dashboard` design (frame r5tcd, 2581×1458)
const DESIGN_W = 2581

const WORDMARK = [
  { d: 'M244 66.9996C244 70.9841 240.77 74.2141 236.786 74.2141C232.801 74.2141 229.571 70.9841 229.571 66.9996V7.25649C229.571 3.27203 232.801 0.0419922 236.786 0.0419922C240.77 0.0419922 244 3.27203 244 7.25649V66.9996Z', fill: '#ffffff' },
  { d: 'M201.135 59.7378C200.606 60.3394 200.885 61.2802 201.681 61.374C202.24 61.4071 202.8 61.4236 203.36 61.4236C204.759 61.4236 206.106 61.2419 207.4 60.8786C208.694 60.5152 209.901 60.0032 211.02 59.3426C212.175 58.649 213.189 57.8232 214.063 56.8653C215.382 55.429 217.724 54.9781 219.138 56.3201L222.66 59.6624C225 61.8826 225.356 65.5721 222.93 67.6972C222.673 67.9224 222.411 68.1434 222.144 68.3602C220.43 69.7806 218.558 70.9862 216.529 71.9771C214.536 72.9681 212.419 73.7113 210.181 74.2068C207.977 74.7353 205.703 74.9995 203.36 74.9995C199.407 74.9995 195.682 74.3059 192.184 72.9185C188.721 71.5312 185.678 69.5989 183.054 67.1215C180.466 64.6442 178.419 61.7044 176.915 58.3021C175.411 54.8668 174.659 51.1013 174.659 47.0054C174.659 42.8104 175.411 38.9787 176.915 35.5104C178.419 32.0421 180.466 29.0858 183.054 26.6415C185.678 24.1971 188.721 22.2978 192.184 20.9435C195.682 19.5893 199.407 18.9121 203.36 18.9121C205.703 18.9121 207.995 19.1764 210.233 19.7049C212.472 20.2334 214.588 20.9931 216.582 21.984C218.611 22.975 220.5 24.1971 222.249 25.6505C225.273 28.1066 225.027 32.5493 222.455 35.4759L201.135 59.7378ZM206.07 34.7328C206.694 33.9512 206.349 32.7851 205.354 32.6862C204.724 32.6202 204.059 32.5871 203.36 32.5871C201.401 32.5871 199.547 32.934 197.798 33.6276C196.084 34.2883 194.58 35.2462 193.286 36.5014C192.026 37.7566 191.03 39.276 190.295 41.0597C189.56 42.8104 189.193 44.7923 189.193 47.0054C189.193 47.5008 189.211 48.0624 189.246 48.69C189.316 49.3176 189.403 49.9617 189.508 50.6223C189.648 51.2499 189.805 51.861 189.98 52.4556C190.217 53.2611 191.218 53.3445 191.742 52.6882L206.07 34.7328Z', fill: '#ffffff' },
  { d: 'M89.0218 70.1721C89.0218 72.3813 87.2309 74.1721 85.0218 74.1721H78.5928C76.3836 74.1721 74.5928 72.3813 74.5928 70.1721V4C74.5928 1.79086 76.3836 0 78.5928 0H85.0218C87.2309 0 89.0218 1.79086 89.0218 4V35.7441C89.0218 39.483 93.6948 41.1779 96.0917 38.3083L109.177 22.6419C109.937 21.7321 111.062 21.2062 112.247 21.2062H118.249C121.651 21.2062 123.5 25.183 121.307 27.7842L110.072 41.1132C108.968 42.4231 108.821 44.2909 109.706 45.7577L123.191 68.1055C124.8 70.7714 122.88 74.1721 119.766 74.1721H112.66C111.245 74.1721 109.935 73.4247 109.216 72.2066L100.152 56.8638C99.4324 55.6457 98.1228 54.8983 96.708 54.8983H93.0218C90.8126 54.8983 89.0218 56.6891 89.0218 58.8983V67.3842V70.1721Z', fill: '#ffffff' },
  { d: 'M142.115 70.1721C142.115 72.3813 140.325 74.1721 138.115 74.1721H131.686C129.477 74.1721 127.686 72.3813 127.686 70.1721V4C127.686 1.79086 129.477 0 131.686 0H138.115C140.325 0 142.115 1.79086 142.115 4V35.7441C142.115 39.483 146.789 41.1779 149.185 38.3083L162.271 22.6419C163.031 21.7321 164.156 21.2062 165.341 21.2062H171.343C174.744 21.2062 176.594 25.183 174.401 27.7842L163.166 41.1132C162.062 42.4231 161.914 44.2909 162.8 45.7577L176.285 68.1055C177.894 70.7714 175.974 74.1721 172.86 74.1721H165.753C164.338 74.1721 163.029 73.4247 162.309 72.2066L153.246 56.8638C152.526 55.6457 151.217 54.8983 149.802 54.8983H146.115C143.906 54.8983 142.115 56.6891 142.115 58.8983V67.3842V70.1721Z', fill: '#ffffff' },
  { d: 'M69.5811 66.958C69.5811 70.9424 66.351 74.1725 62.3666 74.1725C58.3821 74.1725 55.1521 70.9424 55.1521 66.958V28.3219C55.1521 24.3375 58.3821 21.1074 62.3666 21.1074C66.351 21.1074 69.5811 24.3375 69.5811 28.3219V66.958Z', fill: '#ffffff' },
  { d: 'M14.3241 70.1719C14.3241 72.3811 12.5332 74.1719 10.3241 74.1719H4C1.79086 74.1719 0 72.3811 0 70.1719V23.5118C0 22.1836 1.07669 21.1069 2.40486 21.1069C3.07907 21.1069 3.72232 21.3899 4.17783 21.887L5.56891 23.4049C7.02735 24.9964 9.47054 25.11 11.3058 23.9736C12.774 23.0644 14.3397 22.307 16.0031 21.7015C18.9413 20.6114 22.002 20.0664 25.1851 20.0664C28.6131 20.0664 31.8487 20.694 34.8919 21.9492C37.9351 23.1714 40.5936 24.8725 42.8672 27.0526C45.1409 29.1996 46.9248 31.7265 48.2191 34.6333C49.5483 37.507 50.2129 40.5789 50.2129 43.8491V70.1719C50.2129 72.3811 48.422 74.1719 46.2129 74.1719H39.8888C37.6797 74.1719 35.8888 72.3811 35.8888 70.1719V43.8491C35.8888 42.4617 35.609 41.157 35.0493 39.9348C34.4897 38.6796 33.7201 37.5896 32.7407 36.6647C31.7613 35.7398 30.6244 35.0131 29.3302 34.4846C28.036 33.9561 26.6543 33.6919 25.1851 33.6919C23.681 33.6919 22.2644 33.9561 20.9352 34.4846C19.6059 35.0131 18.4516 35.7398 17.4722 36.6647C16.4928 37.5896 15.7232 38.6796 15.1636 39.9348C14.6039 41.157 14.3241 42.4617 14.3241 43.8491V70.1719Z', fill: '#ffffff' },
  { d: 'M71.2605 13.466C71.7852 12.3108 72.0475 11.068 72.0475 9.73772C72.0475 8.44244 71.7852 7.21718 71.2605 6.06193C70.7708 4.87167 70.0887 3.85645 69.2142 3.01627C68.3397 2.14109 67.3078 1.45844 66.1185 0.968334C64.9642 0.443221 63.7224 0.180664 62.3932 0.180664C61.064 0.180664 59.8047 0.443221 58.6154 0.968334C57.4611 1.45844 56.4467 2.14109 55.5722 3.01627C54.7327 3.85645 54.0506 4.87167 53.5259 6.06193C53.0362 7.21718 52.7914 8.44244 52.7914 9.73772C52.7914 11.068 53.0362 12.3108 53.5259 13.466C54.0506 14.6213 54.7327 15.6365 55.5722 16.5117C56.4467 17.3519 57.4611 18.0345 58.6154 18.5596C59.8047 19.0497 61.064 19.2948 62.3932 19.2948C63.7224 19.2948 64.9642 19.0497 66.1185 18.5596C67.3078 18.0345 68.3397 17.3519 69.2142 16.5117C70.0887 15.6365 70.7708 14.6213 71.2605 13.466Z', fill: '#71b9a1' },
]

function Wordmark({ width = 105, height }) {
  return (
    <svg viewBox="0 0 244 75" width={width} height={height ?? width * (75 / 244)} fill="none" style={{ display: 'block' }}>
      {WORDMARK.map((p, i) => (
        <path key={i} d={p.d} fill={p.fill} />
      ))}
    </svg>
  )
}

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
  const [tab, setTab] = useState('all')
  const [sortAsc, setSortAsc] = useState(false)
  const [activityOpen, setActivityOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState(null)
  const [menuOpen, setMenuOpen] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [toast, setToast] = useState(null)
  const [unread, setUnread] = useState({})
  const [lastRefreshed, setLastRefreshed] = useState(null)
  const [now, setNow] = useState(Date.now())
  const [scale, setScale] = useState(1)
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

  const refresh = useCallback(() => {
    fetchData(token)
    pollUnread(token)
  }, [token, fetchData, pollUnread])

  // Scale the 2581px-wide design to fit the viewport (same approach as the review page)
  useEffect(() => {
    function updateScale() {
      const fit = (window.innerWidth - 48) / DESIGN_W
      setScale(Math.min(1, Math.max(0.6, fit)))
    }
    updateScale()
    window.addEventListener('resize', updateScale)
    return () => window.removeEventListener('resize', updateScale)
  }, [])

  // Tick every 30s so the relative "Last refreshed" label stays fresh
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(id)
  }, [])

  // Close the card menu when clicking outside it
  useEffect(() => {
    if (!menuOpen) return
    function onClick(e) {
      if (!e.target?.closest?.('[data-nk="card-menu"], [data-nk="card-menu-button"]')) {
        setMenuOpen(null)
      }
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [menuOpen])

  const deleteProject = useCallback(async (id) => {
    setDeletingId(id)
    try {
      await api(token, `/projects/${id}`, { method: 'DELETE' })
      setProjects(prev => prev.filter(p => p.id !== id))
      setUnread(prev => { const next = { ...prev }; delete next[id]; return next })
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

  const fs = useCallback((base) => base / scale, [scale])
  const is = useCallback((base, min) => Math.max(min, base * scale) / scale, [scale])

  function copyShareLink(shareToken) {
    navigator.clipboard.writeText(`${window.location.origin}/review/${shareToken}`)
      .then(() => setToast('Share link copied'))
      .catch(() => setToast('Failed to copy link'))
  }

  if (!token) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#101715', color: '#ddf3ec', fontFamily: '"Instrument Sans", system-ui, sans-serif' }}>
        <p>Sign in via the Nikkel extension to access the dashboard.</p>
      </div>
    )
  }

  const filtered = projects.filter(p => {
    if (tab === 'all') return true
    if (tab === 'yours') return p.role === 'owner'
    return p.role === 'collaborator'
  })
  const sorted = [...filtered].sort((a, b) => {
    const ta = new Date(a.lastActivityAt || a.created_at || 0).getTime()
    const tb = new Date(b.lastActivityAt || b.created_at || 0).getTime()
    const na = Number.isNaN(ta) ? 0 : ta
    const nb = Number.isNaN(tb) ? 0 : tb
    return sortAsc ? na - nb : nb - na
  })

  const TABS = [
    { key: 'all', label: 'All Projects' },
    { key: 'yours', label: 'Your Projects' },
    { key: 'shared', label: 'Shared with you' },
  ]
  const totalUnread = Object.values(unread).reduce((s, n) => s + (n || 0), 0)

  return (
    <div data-nk="page-bg" style={{ minHeight: '100vh', backgroundImage: 'url(/review_bg.png)', backgroundSize: 'cover', backgroundAttachment: 'fixed', backgroundPosition: 'center', color: '#ffffff', fontFamily: '"Instrument Sans", system-ui, sans-serif', display: 'flex', justifyContent: 'center', overflowX: 'hidden', padding: '24px' }}>
      <div data-nk="scale-wrapper" style={{ width: DESIGN_W * scale, height: 'auto', position: 'relative', flexShrink: 0 }}>
        <div data-nk="design-container" style={{ width: DESIGN_W, position: 'absolute', top: 0, left: 0, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
      {/* Top bar */}
      <div data-nk="top-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, padding: '40px 110px 36px' }}>
        <Wordmark width={200} height={84} />

        <div data-nk="top-bar-actions" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Refresh chip */}
          <div data-nk="refresh-chip" style={{ display: 'flex', alignItems: 'center', gap: 16, background: '#82b0a033', borderRadius: 12, padding: '12px 16px', height: 76, boxSizing: 'border-box' }}>
            <button data-nk="refresh-button" onClick={refresh} style={{ width: 24, height: 24, background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }} aria-label="Refresh">
              <svg width={is(18, 16)} height={is(18, 16)} viewBox="0 0 24 24" style={{ display: 'block' }}><path d="M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6" fill="none" stroke="#ddf3ec" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <span data-nk="last-refreshed" style={{ color: '#ddf3ec', fontSize: fs(16), whiteSpace: 'nowrap' }}>
              Last refreshed on: {lastRefreshed ? timeAgo(lastRefreshed.toISOString(), now) : 'Just now'}
            </span>
          </div>

          {/* Activity dropdown */}
          <div data-nk="activity-dropdown" style={{ position: 'relative' }}>
            <button
              data-nk="activity-button"
              onClick={() => setActivityOpen(o => !o)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#82b0a033', borderRadius: 12, height: 76, padding: '0 16px', border: 'none', cursor: 'pointer', boxSizing: 'border-box' }}
            >
              <svg width={is(20, 20)} height={is(20, 20)} viewBox="0 0 24 24" style={{ display: 'block' }}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" fill="none" stroke="#ddf3ec" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              <span style={{ color: '#ddf3ec', fontSize: fs(16) }}>Activity</span>
              {totalUnread > 0 && (
                <span data-nk="activity-unread-badge" style={{ minWidth: is(18, 16), height: is(18, 16), padding: '0 5px', borderRadius: 9, background: '#ef4444', color: '#fff', fontSize: fs(11), fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{totalUnread}</span>
              )}
              <svg width={is(12, 12)} height={is(12, 12)} viewBox="0 0 24 24" style={{ display: 'block', transform: activityOpen ? 'rotate(180deg)' : 'none' }}><path d="M6 9l6 6 6-6" fill="none" stroke="#ddf3ec" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            {activityOpen && (
              <div data-nk="activity-panel" style={{ position: 'absolute', top: 56, right: 0, width: 300, background: '#101715', border: '1px solid #1b2723', borderRadius: 12, padding: 8, boxShadow: '0 12px 32px rgba(0,0,0,0.5)', zIndex: 50 }}>
                {sorted.length === 0 && <div style={{ padding: '16px 12px', color: '#82b0a0', fontSize: fs(14) }}>No projects yet.</div>}
                {sorted.map(p => (
                  <div key={p.id} data-nk="activity-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '10px 12px', borderRadius: 8 }}>
                    <span style={{ color: '#ddf3ec', fontSize: fs(14), whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.title || p.base_url}</span>
                    <span style={{ color: '#82b0a0', fontSize: fs(12), flexShrink: 0 }}>{timeAgo(p.lastActivityAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Settings */}
          <button
            data-nk="settings-button"
            onClick={() => setToast('Settings coming soon')}
            style={{ width: 76, height: 76, background: '#82b0a033', borderRadius: 12, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            aria-label="Settings"
          >
            <svg width={is(20, 20)} height={is(20, 20)} viewBox="0 0 24 24" style={{ display: 'block' }}><circle cx="12" cy="12" r="3" fill="none" stroke="#ddf3ec" strokeWidth="2" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z" fill="none" stroke="#ddf3ec" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>

          {/* Avatar */}
          <img
            data-nk="user-avatar"
            src={user?.profile?.avatar_url || user?.avatar_url || DEFAULT_AVATAR}
            alt=""
            style={{ width: 76, height: 76, borderRadius: 12, objectFit: 'cover', background: '#d9d9d9' }}
          />
        </div>
      </div>

      {/* Main panel */}
      <div data-nk="main-panel" style={{ margin: '0 110px 48px', background: '#82b0a033', borderRadius: 24, padding: '40px 36px 36px', backdropFilter: 'blur(12px)' }}>
        {/* Tabs row */}
        <div data-nk="tabs-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 28 }}>
          <div data-nk="tabs" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {TABS.map(t => {
              const active = tab === t.key
              return (
                <button
                  key={t.key}
                  data-nk={`tab-${t.key}`}
                  onClick={() => setTab(t.key)}
                  style={{ padding: '16px 24px', borderRadius: 16, border: 'none', cursor: 'pointer', background: active ? '#ddf3ec' : '#1b2723cc', color: active ? '#101715' : '#ddf3ec', fontSize: fs(16), fontWeight: active ? 500 : 400 }}
                >
                  {t.label}
                </button>
              )
            })}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <button
              data-nk="sort-button"
              onClick={() => setSortAsc(a => !a)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 24px', background: '#82b0a033', border: 'none', borderRadius: 16, cursor: 'pointer', color: '#ddf3ec', fontSize: fs(15) }}
            >
              <svg width={is(18, 16)} height={is(18, 16)} viewBox="0 0 24 24" style={{ display: 'block' }}><path d="M3 6h11M3 12h7M3 18h4M17 4v16M17 20l4-4M17 4l4 4" fill="none" stroke="#ddf3ec" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" transform={sortAsc ? 'scale(1,-1) translate(0,-24)' : undefined} /></svg>
              <span>Sort by date</span>
            </button>
          </div>
        </div>

        {/* New project form */}
        {/* Project grid */}
        {loading ? (
          <div data-nk="loading" style={{ textAlign: 'center', padding: 60, color: '#82b0a0' }}>
            <p style={{ fontSize: fs(15) }}>Loading...</p>
          </div>
        ) : (
          <div data-nk="project-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 22 }}>
            {sorted.map(p => (
              <ProjectCard
                key={p.id}
                project={p}
                scale={scale}
                menuOpen={menuOpen === p.id}
                onMenuToggle={() => setMenuOpen(menuOpen === p.id ? null : p.id)}
                onShare={() => copyShareLink(p.share_token)}
                onDelete={() => { setMenuOpen(null); setConfirmDelete(p.id) }}
              />
            ))}
            {sorted.length === 0 && (
              <div data-nk="empty-state" style={{ textAlign: 'center', padding: 40, color: '#82b0a0', gridColumn: '1 / -1' }}>
                <p style={{ fontSize: fs(15) }}>No projects here yet. Start a review from the Nikkel extension.</p>
              </div>
            )}
          </div>
        )}
      </div>
      </div>
      </div>

      {/* Toast */}
      {toast && (
        <div data-nk="toast" style={{ position: 'fixed', bottom: 24, right: 24, padding: '10px 20px', background: '#101715', border: '1px solid #1b2723', borderRadius: 12, color: '#ddf3ec', fontSize: 14, zIndex: 1000, boxShadow: '0 4px 12px rgba(0,0,0,0.4)' }}>
          {toast}
        </div>
      )}

      {/* Delete confirmation dialog */}
      {confirmDelete && (
        <div
          data-nk="delete-dialog"
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
                style={{ padding: '9px 16px', background: '#1b2723', color: '#ddf3ec', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}
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

function timeAgo(iso, now = Date.now()) {
  if (!iso) return ''
  const s = Math.floor((now - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'Just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function ProjectCard({ project, scale, menuOpen, onMenuToggle, onShare, onDelete }) {
  const fs = useCallback((base) => base / scale, [scale])
  const is = useCallback((base, min) => Math.max(min, base * scale) / scale, [scale])
  const [collabOpen, setCollabOpen] = useState(false)
  let domain = ''
  try { domain = project.base_url ? new URL(project.base_url).hostname : '' } catch {}
  const pages = project.pageBreakdown || []
  const pageCount = pages.length
  const name = project.title || domain || 'Untitled Project'

  return (
    <div data-nk="project-card" style={{ background: '#101715', borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Screenshot area */}
      <div data-nk="screenshot-area" style={{ position: 'relative', aspectRatio: '466 / 312', margin: 20, borderRadius: 16, background: '#1b2723', overflow: 'hidden' }}>
        {project.screenshot_url ? (
          <img src={project.screenshot_url} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div data-nk="screenshot-placeholder" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#ffffff', fontSize: fs(16), fontWeight: 500 }}>[ screenshot ]</span>
          </div>
        )}

        {/* Overlay pill (project + time) */}
        <div data-nk="overlay-pill" style={{ position: 'absolute', top: 8, left: 8, display: 'flex', alignItems: 'center', gap: 8, padding: 8, background: '#1b2723cc', borderRadius: 8, backdropFilter: 'blur(3.5px)' }}>
          <img
            src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
            alt=""
            onError={(e) => { e.target.style.display = 'none' }}
            style={{ width: is(37, 24), height: is(37, 24), borderRadius: '50%', objectFit: 'cover', background: '#d9d9d9' }}
          />
          <div data-nk="overlay-pill-text" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0, lineHeight: '36px' }}>
            <span style={{ color: '#ddf3ec', fontSize: fs(14), fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 200 }}>{name}</span>
            <span style={{ color: '#ddf3ec', fontSize: fs(11), fontWeight: 500 }}>{timeAgo(project.lastActivityAt)}</span>
          </div>
        </div>

        {/* Top-right: collaborator badge + ellipsis menu */}
        <div data-nk="card-actions" style={{ position: 'absolute', top: 8, right: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
          {project.collaboratorCount > 0 && (
            <div
              data-nk="collaborator-badge"
              onMouseEnter={() => setCollabOpen(true)}
              onMouseLeave={() => setCollabOpen(false)}
              style={{ position: 'relative', width: 48, height: 52, borderRadius: 8, background: '#E9B454', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'default' }}
            >
              <svg width={is(22, 20)} height={is(22, 20)} viewBox="0 0 24 24" style={{ display: 'block' }}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" fill="none" stroke="#1b2723" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              {collabOpen && (
                <div style={{ position: 'absolute', top: 60, right: 0, minWidth: 220, maxWidth: 260, background: '#101715', border: '1px solid #1b2723', borderRadius: 10, padding: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.5)', zIndex: 50 }}>
                  <div style={{ padding: '6px 10px 8px', color: '#82b0a0', fontSize: fs(12), fontWeight: 600 }}>Access</div>
                  {(project.collaborators || []).map(c => (
                    <div key={c?.id || c?.email} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 6 }}>
                      <img src={c?.avatar_url || DEFAULT_AVATAR} alt="" style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover', background: '#1b2723' }} />
                      <span style={{ color: '#ddf3ec', fontSize: fs(13), whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c?.name || c?.email || 'Collaborator'}</span>
                    </div>
                  ))}
                  {(!project.collaborators || project.collaborators.length === 0) && (
                    <div style={{ padding: '6px 10px', color: '#82b0a0', fontSize: fs(12) }}>No collaborators</div>
                  )}
                </div>
              )}
            </div>
          )}
          <div
            data-nk="card-menu-button"
            onClick={(e) => { e.stopPropagation(); onMenuToggle() }}
            style={{ width: is(32, 24), height: is(32, 24), borderRadius: 6, background: '#1b2723cc', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <svg width={is(16, 16)} height={is(16, 16)} viewBox="0 0 4 16" style={{ display: 'block' }}>
              {[3.2, 8, 12.8].map(y => <circle key={y} cx="2" cy={y} r="1.6" fill="#e2e8f0" />)}
            </svg>
          </div>
          {menuOpen && (
            <div data-nk="card-menu" onClick={e => e.stopPropagation()} style={{ position: 'absolute', top: 38, right: 0, width: 240, background: '#101715', border: '1px solid #1b2723', borderRadius: 10, padding: 6, boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
              <div data-nk="card-menu-share" onClick={(e) => { e.stopPropagation(); onShare() }} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 10px', borderRadius: 6, cursor: 'pointer', color: '#ddf3ec', fontSize: fs(13) }} onMouseEnter={e => e.currentTarget.style.background = '#1b2723'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <svg width={is(15, 16)} height={is(15, 16)} viewBox="0 0 24 24" style={{ display: 'block' }}><path d="M5 12a2 2 0 1 0 0-.01M19 6a2 2 0 1 0 0-.01M19 18a2 2 0 1 0 0-.01" fill="none" stroke="#82b0a0" strokeWidth="2" /><path d="M12 11a1 1 0 0 0 .5-.87l2.5-1.5M9.5 15.4a3 3 0 1 0 3.5-5.1l2.5-1.5" fill="none" stroke="#82b0a0" strokeWidth="2" strokeLinecap="round" /></svg>
                Share link
              </div>
              <div data-nk="card-menu-delete" onClick={(e) => { e.stopPropagation(); onDelete() }} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 10px', borderRadius: 6, cursor: 'pointer', color: '#f87171', fontSize: fs(13) }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(220,38,38,0.12)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <svg width={is(15, 16)} height={is(15, 16)} viewBox="0 0 24 24" style={{ display: 'block' }}><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                Delete project
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div data-nk="card-footer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 20px 20px' }}>
        <div data-nk="card-stats" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* page count */}
          <div data-nk="page-count" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <img src="/web_page_icon.svg" alt="" style={{ width: is(18, 16), height: is(18, 16) }} />
            <span style={{ color: '#ffffff', fontSize: fs(15) }}>{pageCount} {pageCount === 1 ? 'Page' : 'Pages'}</span>
          </div>
          <div style={{ width: 1, height: 18, background: '#82b0a033' }} />
          {/* nikkel count */}
          <div data-nk="nikkel-count" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: is(24, 24), height: is(24, 24), borderRadius: 200, background: '#71b9a1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#1b2723', fontSize: fs(14), fontWeight: 500 }}>{project.nikkelCount ?? 0}</span>
            </div>
            <span style={{ color: '#ffffff', fontSize: fs(15) }}>nikkels</span>
          </div>
        </div>

        <a
          data-nk="view-project-link"
          href={`/review/${project.share_token}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
        >
          <span style={{ color: '#ffffff', fontSize: fs(14), fontWeight: 500, whiteSpace: 'nowrap' }}>View project</span>
          <svg width={is(14, 16)} height={is(14, 16)} viewBox="0 0 24 24" style={{ display: 'block' }}><path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="#71b9a1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </a>
      </div>
    </div>
  )
}
