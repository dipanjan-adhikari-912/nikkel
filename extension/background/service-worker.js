importScripts('../shared/api.js')

let currentMode = 'idle'
let activeProject = null

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SET_MODE') {
    currentMode = message.mode
    activeProject = message.project

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'SET_MODE',
          mode: currentMode,
          project: activeProject
        })
      }
    })
    sendResponse({ success: true })
  }

  if (message.type === 'GET_MODE') {
    sendResponse({ mode: currentMode, project: activeProject })
  }

  if (message.type === 'REGISTER') {
    api.auth.register(message.credentials)
      .then(data => {
        setToken(data.token)
        sendResponse({ success: true, user: data.user })
      })
      .catch(err => sendResponse({ success: false, error: err.message }))
    return true
  }

  if (message.type === 'LOGIN') {
    api.auth.login(message.credentials)
      .then(data => {
        setToken(data.token)
        sendResponse({ success: true, user: data.user })
      })
      .catch(err => sendResponse({ success: false, error: err.message }))
    return true
  }

  if (message.type === 'LOGOUT') {
    setToken(null)
    currentMode = 'idle'
    activeProject = null
    sendResponse({ success: true })
  }

  if (message.type === 'CREATE_NIKKEL') {
    api.nikkels.create(message.projectId, message.nikkelData)
      .then(data => sendResponse({ success: true, nikkel: data }))
      .catch(err => sendResponse({ success: false, error: err.message }))
    return true
  }

  if (message.type === 'GET_PROJECTS') {
    api.projects.list()
      .then(data => sendResponse({ success: true, projects: data }))
      .catch(err => sendResponse({ success: false, error: err.message }))
    return true
  }

  if (message.type === 'GET_ME') {
    api.auth.me()
      .then(data => sendResponse({ success: true, ...data }))
      .catch(err => sendResponse({ success: false, error: err.message }))
    return true
  }

  if (message.type === 'GET_TOKEN') {
    getToken().then(token => sendResponse({ token }))
    return true
  }
})
