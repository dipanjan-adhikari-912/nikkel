// D E P R E C A T E D — this file is part of a stale copy and is not used by Chrome.
const API_BASE = ''

let authToken = null

function setToken(token) {
  authToken = token
  if (token) {
    chrome.storage.local.set({ authToken: token })
  } else {
    chrome.storage.local.remove('authToken')
  }
}

function getToken() {
  return new Promise((resolve) => {
    if (authToken) return resolve(authToken)
    chrome.storage.local.get('authToken', (result) => {
      authToken = result.authToken || null
      resolve(authToken)
    })
  })
}

async function request(path, options = {}) {
  const token = await getToken()
  const headers = { 'Content-Type': 'application/json', ...options.headers }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers })
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }))
    throw new Error(error.error || 'API request failed')
  }
  return response.json()
}

const api = {
  auth: {
    login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
    register: (body) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
    me: () => request('/auth/me'),
    logout: () => request('/auth/logout', { method: 'POST' })
  },
  projects: {
    list: () => request('/projects'),
    create: (body) => request('/projects', { method: 'POST', body: JSON.stringify(body) }),
    get: (id) => request(`/projects/${id}`),
    delete: (id) => request(`/projects/${id}`, { method: 'DELETE' })
  },
  nikkels: {
    list: (projectId) => request(`/projects/${projectId}/nikkels`),
    create: (projectId, body) => request(`/projects/${projectId}/nikkels`, { method: 'POST', body: JSON.stringify(body) }),
    get: (id) => request(`/nikkels/${id}`),
    update: (id, body) => request(`/nikkels/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    delete: (id) => request(`/nikkels/${id}`, { method: 'DELETE' }),
    replies: (id) => request(`/nikkels/${id}/replies`),
    addReply: (id, body) => request(`/nikkels/${id}/replies`, { method: 'POST', body: JSON.stringify(body) })
  },
  board: {
    get: (token) => request(`/board/${token}`),
    reply: (token, body) => request(`/board/${token}/reply`, { method: 'POST', body: JSON.stringify(body) })
  }
}
