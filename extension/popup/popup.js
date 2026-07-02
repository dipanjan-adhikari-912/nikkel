const $ = (sel) => document.querySelector(sel)
const views = { login: $('#login-view'), main: $('#main-view') }

let currentUser = null
let currentProfile = null
let projects = []
let selectedProject = null

function showView(name) {
  Object.keys(views).forEach(k => views[k].classList.toggle('hidden', k !== name))
}

async function checkAuth() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'GET_ME' }, (response) => {
      if (response?.success) {
        currentUser = response.user
        currentProfile = response.profile
        showView('main')
        renderUserInfo()
        loadProjects()
        resolve(true)
      } else {
        showView('login')
        resolve(false)
      }
    })
  })
}

function renderUserInfo() {
  const name = currentProfile?.full_name || currentUser?.email || 'User'
  $('#user-name').textContent = name
}

function loadProjects() {
  chrome.runtime.sendMessage({ type: 'GET_PROJECTS' }, (response) => {
    if (response?.success) {
      projects = response.projects || []
      renderProjects()
    }
  })
}

function renderProjects() {
  const list = $('#project-list')
  if (projects.length === 0) {
    list.innerHTML = '<div style="color:#9ca3af;text-align:center;padding:12px;font-size:13px">No projects yet</div>'
    return
  }
  list.innerHTML = projects.map(p => `
    <div class="project-item ${selectedProject?.id === p.id ? 'active' : ''}" data-id="${p.id}">
      <div class="project-name">${p.name}</div>
      <div class="project-url">${p.url}</div>
    </div>
  `).join('')

  list.querySelectorAll('.project-item').forEach(el => {
    el.addEventListener('click', () => {
      const id = el.dataset.id
      selectedProject = projects.find(p => p.id === id)
      renderProjects()
      updateModeUI()
    })
  })
}

function updateModeUI() {
  const statusText = $('#mode-status-text')
  const statusDot = $('#mode-status-dot')
  const projectName = $('#current-project-name')

  const activeBtn = document.querySelector('.mode-btn.active')
  const mode = activeBtn?.dataset.mode || 'idle'

  const modeLabels = { idle: 'Idle', browsing: 'Browsing', annotating: 'Annotating' }
  statusText.textContent = modeLabels[mode] || 'Idle'
  statusDot.className = `status-dot ${mode === 'annotating' ? 'active' : 'inactive'}`
  projectName.textContent = selectedProject ? selectedProject.name : 'No project'
}

document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'))
    tab.classList.add('active')
    const isLogin = tab.dataset.tab === 'login'
    $('#login-form').classList.toggle('hidden', !isLogin)
    $('#register-form').classList.toggle('hidden', isLogin)
  })
})

$('#login-btn').addEventListener('click', () => {
  const email = $('#login-email').value
  const password = $('#login-password').value
  if (!email || !password) {
    $('#login-error').textContent = 'Email and password required'
    $('#login-error').classList.remove('hidden')
    return
  }
  chrome.runtime.sendMessage({
    type: 'LOGIN',
    credentials: { email, password }
  }, (response) => {
    if (response?.success) {
      checkAuth()
    } else {
      $('#login-error').textContent = response?.error || 'Login failed'
      $('#login-error').classList.remove('hidden')
    }
  })
})

$('#register-btn').addEventListener('click', () => {
  const email = $('#reg-email').value
  const password = $('#reg-password').value
  const fullName = $('#reg-name').value
  const orgName = $('#reg-org').value
  if (!email || !password || !fullName || !orgName) {
    $('#reg-error').textContent = 'All fields required'
    $('#reg-error').classList.remove('hidden')
    return
  }
  chrome.runtime.sendMessage({
    type: 'REGISTER',
    credentials: { email, password, fullName, orgName }
  }, (response) => {
    if (response?.success) {
      checkAuth()
    } else {
      $('#reg-error').textContent = response?.error || 'Registration failed'
      $('#reg-error').classList.remove('hidden')
    }
  })
})

$('#logout-btn').addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'LOGOUT' }, () => {
    currentUser = null
    currentProfile = null
    projects = []
    selectedProject = null
    showView('login')
  })
})

document.querySelectorAll('.mode-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'))
    btn.classList.add('active')
    updateModeUI()

    chrome.runtime.sendMessage({
      type: 'SET_MODE',
      mode: btn.dataset.mode,
      project: selectedProject
    })
  })
})

$('#refresh-projects-btn').addEventListener('click', loadProjects)

$('#open-dashboard-btn').addEventListener('click', () => {
  chrome.tabs.create({ url: 'http://localhost:3000/dashboard' })
})

checkAuth()
