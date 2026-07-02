const MODES = { IDLE: 'idle', BROWSING: 'browsing', ANNOTATING: 'annotating' }

let currentMode = MODES.IDLE
let activeProject = null
let currentElement = null

// ---- Shadow DOM root ----

let root = null
let shadow = null

function ensureRoot() {
  if (root) return
  root = document.createElement('div')
  root.id = 'nikkel-root'
  Object.assign(root.style, {
    all: 'initial',
    position: 'fixed',
    top: '0',
    left: '0',
    width: '0',
    height: '0',
    zIndex: '2147483647',
    pointerEvents: 'none'
  })
  document.body.appendChild(root)
  shadow = root.attachShadow({ mode: 'closed' })
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SET_MODE') {
    currentMode = message.mode
    activeProject = message.project
    applyMode(currentMode)
    sendResponse({ success: true })
  }
  if (message.type === 'GET_MODE') {
    sendResponse({ mode: currentMode, project: activeProject })
  }
})

function applyMode(mode) {
  if (mode === MODES.ANNOTATING) {
    document.body.style.cursor = 'crosshair'
    document.addEventListener('mouseover', handleHover)
    document.addEventListener('click', handleClick, true)
  } else {
    document.body.style.cursor = ''
    document.removeEventListener('mouseover', handleHover)
    document.removeEventListener('click', handleClick, true)
    removeHighlight()
    closeCommentBubble()
    hideTooltip()
  }
}

function handleHover(e) {
  if (currentMode !== MODES.ANNOTATING) return
  e.stopPropagation()
  currentElement = e.target
  showHighlight(currentElement)
}

function handleClick(e) {
  if (currentMode !== MODES.ANNOTATING) return
  e.preventDefault()
  e.stopPropagation()

  const element = currentElement || e.target
  showHighlight(element)
  showCommentBubble(element, (commentText) => submitNikkel(element, commentText), () => {
    removeHighlight()
    closeCommentBubble()
    currentElement = null
  })
}

async function submitNikkel(element, commentText) {
  if (!activeProject) {
    showToast('Select a project in the extension popup first', true)
    return
  }

  closeCommentBubble()
  showToast('Saving feedback...')

  const sel = generateSelector(element)
  const coords = getCoordinates(element)

  let screenshotBase64 = null
  try {
    screenshotBase64 = await captureScreenshot(element)
  } catch (err) {
    console.warn('Screenshot capture failed:', err.message)
  }

  removeHighlight()

  chrome.runtime.sendMessage({
    type: 'CREATE_NIKKEL',
    projectId: activeProject.id,
    nikkelData: {
      pageUrl: window.location.href,
      selector: sel.selector,
      coordX: coords.coordX,
      coordY: coords.coordY,
      elementTag: element.tagName.toLowerCase(),
      elementText: element.textContent?.trim().slice(0, 200) || '',
      commentText,
      screenshotBase64
    }
  }, (response) => {
    if (response?.success) {
      showPin(response.nikkel)
      showToast('Feedback saved!')
    } else {
      showToast(response?.error || 'Failed to save feedback', true)
    }
  })
}

// ---- Toast ----

let toastTimer = null

function showToast(msg, isError) {
  ensureRoot()
  const existing = shadow.getElementById('nikkel-toast')
  if (existing) existing.remove()
  clearTimeout(toastTimer)

  const toast = document.createElement('div')
  toast.id = 'nikkel-toast'
  Object.assign(toast.style, {
    all: 'initial',
    display: 'block',
    position: 'fixed',
    bottom: '24px',
    left: '50%',
    transform: 'translateX(-50%)',
    padding: '10px 20px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#fff',
    background: isError ? '#ef4444' : '#10b981',
    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    whiteSpace: 'nowrap',
    pointerEvents: 'none'
  })
  toast.textContent = msg
  shadow.appendChild(toast)

  toastTimer = setTimeout(() => {
    toast.style.opacity = '0'
    setTimeout(() => toast.remove(), 300)
  }, isError ? 4000 : 2000)
}

// ---- Selector ----

function generateSelector(element) {
  if (element.id && !element.id.match(/^\d/)) {
    return { selector: `#${element.id}`, strategy: 'id' }
  }

  const testId = element.dataset.testid || element.dataset.id || element.dataset.cy
  if (testId) {
    const attr = element.dataset.testid ? 'data-testid' :
                 element.dataset.id ? 'data-id' : 'data-cy'
    return { selector: `[${attr}="${testId}"]`, strategy: 'data-attr' }
  }

  const ariaLabel = element.getAttribute('aria-label')
  if (ariaLabel) {
    return {
      selector: `${element.tagName.toLowerCase()}[aria-label="${ariaLabel}"]`,
      strategy: 'aria'
    }
  }

  if (element.classList.length > 0) {
    const classes = Array.from(element.classList)
      .filter(c => !c.match(/^(js-|is-|has-)/))
      .slice(0, 3)
      .join('.')
    if (classes) {
      const selector = `${element.tagName.toLowerCase()}.${classes}`
      if (document.querySelectorAll(selector).length === 1) {
        return { selector, strategy: 'class' }
      }
    }
  }

  return { selector: buildPositionalSelector(element), strategy: 'positional' }
}

function buildPositionalSelector(element) {
  const parts = []
  let current = element
  while (current && current !== document.body) {
    let part = current.tagName.toLowerCase()
    const siblings = Array.from(current.parentNode?.children || [])
      .filter(s => s.tagName === current.tagName)
    if (siblings.length > 1) {
      const index = siblings.indexOf(current) + 1
      part += `:nth-of-type(${index})`
    }
    parts.unshift(part)
    current = current.parentElement
  }
  return parts.join(' > ')
}

function getCoordinates(element) {
  const rect = element.getBoundingClientRect()
  return {
    coordX: ((rect.left + window.scrollX + rect.width / 2) / document.body.scrollWidth) * 100,
    coordY: ((rect.top + window.scrollY + rect.height / 2) / document.body.scrollHeight) * 100
  }
}

// ---- Screenshot ----

async function captureScreenshot(element) {
  element.scrollIntoView({ behavior: 'instant', block: 'center' })
  await new Promise(r => setTimeout(r, 150))

  const canvas = document.createElement('canvas')
  canvas.width = Math.min(document.body.scrollWidth, 1920)
  canvas.height = Math.min(document.body.scrollHeight, 1080)
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = '#f3f4f6'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = '#6366f1'
  ctx.font = '16px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('Screenshot capture placeholder', canvas.width / 2, canvas.height / 2)

  const rect = element.getBoundingClientRect()
  ctx.strokeStyle = '#6366f1'
  ctx.lineWidth = 3
  ctx.strokeRect(rect.left, rect.top + window.scrollY, rect.width, rect.height)

  return canvas.toDataURL('image/jpeg', 0.8)
}

// ---- Highlight (light DOM) ----

let highlightEl = null

function showHighlight(element) {
  removeHighlight()
  highlightEl = document.createElement('div')
  const rect = element.getBoundingClientRect()
  Object.assign(highlightEl.style, {
    position: 'fixed',
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    border: '2px solid #6366f1',
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    borderRadius: '4px',
    pointerEvents: 'none',
    zIndex: '2147483646',
    boxSizing: 'border-box'
  })
  document.body.appendChild(highlightEl)
}

function removeHighlight() {
  if (highlightEl) {
    highlightEl.remove()
    highlightEl = null
  }
}

// ---- Comment bubble (shadow DOM) ----

function showCommentBubble(element, onSubmit, onCancel) {
  ensureRoot()
  closeCommentBubble()

  const rect = element.getBoundingClientRect()
  const BUBBLE_WIDTH = 320
  const GAP = 12
  const PAD = 8

  let left = rect.left + rect.width / 2 - BUBBLE_WIDTH / 2
  let top = rect.bottom + GAP

  if (top + 210 > window.innerHeight) {
    top = rect.top - 210 - GAP
  }
  left = Math.max(PAD, Math.min(left, window.innerWidth - BUBBLE_WIDTH - PAD))

  const bubble = document.createElement('div')
  bubble.id = 'nikkel-comment-bubble'
  Object.assign(bubble.style, {
    all: 'initial',
    display: 'block',
    position: 'fixed',
    left: `${left}px`,
    top: `${top}px`,
    width: `${BUBBLE_WIDTH}px`,
    padding: '16px',
    backgroundColor: '#ffffff',
    border: '1px solid #e0e0e0',
    borderRadius: '12px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: '14px',
    lineHeight: '1.4',
    color: '#1f2937',
    boxSizing: 'border-box',
    pointerEvents: 'auto',
    zIndex: '2147483647'
  })

  bubble.innerHTML = `
    <textarea id="nikkel-comment-input"
      style="all:initial;display:block;width:100%;min-height:80px;border:1px solid #d1d5db;border-radius:8px;padding:8px;font:14px -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1f2937;resize:vertical;box-sizing:border-box;outline:none;background:#fff"
      placeholder="What's the feedback?"></textarea>
    <div style="display:flex;gap:8px;margin-top:8px;justify-content:flex-end">
      <button id="nikkel-cancel-btn"
        style="all:initial;display:inline-block;padding:8px 16px;border:1px solid #d1d5db;border-radius:8px;background:#fff;cursor:pointer;font:14px -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#374151">Cancel</button>
      <button id="nikkel-submit-btn"
        style="all:initial;display:inline-block;padding:8px 16px;border:none;border-radius:8px;background:#6366f1;cursor:pointer;font:14px -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-weight:600;color:#fff">Submit</button>
    </div>
  `

  shadow.appendChild(bubble)

  bubble.querySelector('#nikkel-submit-btn').onclick = () => {
    const text = bubble.querySelector('#nikkel-comment-input').value.trim()
    if (text) onSubmit(text)
  }
  bubble.querySelector('#nikkel-cancel-btn').onclick = onCancel

  setTimeout(() => bubble.querySelector('#nikkel-comment-input')?.focus(), 100)
}

function closeCommentBubble() {
  if (!shadow) return
  const el = shadow.getElementById('nikkel-comment-bubble')
  if (el) el.remove()
}

// ---- Pin wrapper (light DOM positioning context) ----

let pinWrapper = null

function ensurePinWrapper() {
  if (pinWrapper) return
  pinWrapper = document.createElement('div')
  pinWrapper.id = 'nikkel-pin-wrapper'
  Object.assign(pinWrapper.style, {
    position: 'absolute',
    top: '0',
    left: '0',
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    zIndex: '2147483646',
    overflow: 'hidden'
  })
  document.body.appendChild(pinWrapper)
}

function showPin(nikkel) {
  ensurePinWrapper()
  const id = `nikkel-pin-${nikkel.id}`
  if (pinWrapper.querySelector(`#${id}`)) return

  const pin = document.createElement('div')
  pin.id = id
  Object.assign(pin.style, {
    position: 'absolute',
    left: `${nikkel.coord_x}%`,
    top: `${nikkel.coord_y}%`,
    transform: 'translate(-50%, -50%)',
    width: '28px',
    height: '28px',
    backgroundColor: '#6366f1',
    border: '3px solid #fff',
    borderRadius: '50%',
    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
    cursor: 'pointer',
    pointerEvents: 'auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontSize: '12px',
    fontWeight: '700',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    transition: 'transform 0.15s'
  })
  pin.textContent = nikkel.comment_text ? nikkel.comment_text.charAt(0).toUpperCase() : 'N'

  pin.onmouseenter = () => {
    pin.style.transform = 'translate(-50%, -50%) scale(1.2)'
    showTooltip(nikkel.comment_text, pin)
  }
  pin.onmouseleave = () => {
    pin.style.transform = 'translate(-50%, -50%) scale(1)'
    hideTooltip()
  }

  pinWrapper.appendChild(pin)
}

// ---- Tooltip (shadow DOM) ----

let tooltipEl = null

function showTooltip(text, anchor) {
  hideTooltip()
  ensureRoot()
  tooltipEl = document.createElement('div')
  Object.assign(tooltipEl.style, {
    all: 'initial',
    display: 'block',
    position: 'fixed',
    padding: '8px 12px',
    backgroundColor: '#1f2937',
    color: '#fff',
    borderRadius: '6px',
    fontSize: '13px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    maxWidth: '280px',
    wordWrap: 'break-word',
    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
    pointerEvents: 'none',
    zIndex: '2147483647'
  })
  tooltipEl.textContent = text
  shadow.appendChild(tooltipEl)

  const rect = anchor.getBoundingClientRect()
  let left = rect.left + rect.width / 2 - 140
  let top = rect.bottom + 8
  left = Math.max(4, Math.min(left, window.innerWidth - 284))
  if (top + 40 > window.innerHeight) top = rect.top - 8 - 36
  tooltipEl.style.left = `${left}px`
  tooltipEl.style.top = `${top}px`
}

function hideTooltip() {
  if (tooltipEl) {
    tooltipEl.remove()
    tooltipEl = null
  }
}
