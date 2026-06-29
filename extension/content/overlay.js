let commentBubble = null
let highlightEl = null

export function showHighlight(element) {
  removeHighlight()
  highlightEl = document.createElement('div')
  const rect = element.getBoundingClientRect()
  const scrollTop = window.scrollY
  const scrollLeft = window.scrollX

  Object.assign(highlightEl.style, {
    position: 'absolute',
    left: `${rect.left + scrollLeft}px`,
    top: `${rect.top + scrollTop}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    border: '3px solid #6366f1',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderRadius: '4px',
    pointerEvents: 'none',
    zIndex: '999998',
    boxSizing: 'border-box'
  })

  document.body.appendChild(highlightEl)
}

export function removeHighlight() {
  if (highlightEl) {
    highlightEl.remove()
    highlightEl = null
  }
}

export function showCommentBubble(element, onSubmit, onCancel) {
  closeCommentBubble()

  const rect = element.getBoundingClientRect()
  const scrollTop = window.scrollY

  commentBubble = document.createElement('div')
  commentBubble.id = 'nikkel-comment-bubble'
  Object.assign(commentBubble.style, {
    position: 'absolute',
    left: `${rect.left + window.scrollX}px`,
    top: `${rect.bottom + scrollTop + 8}px`,
    zIndex: '999999',
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
    padding: '16px',
    width: '320px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  })

  commentBubble.innerHTML = `
    <textarea id="nikkel-comment-input"
      style="width:100%;min-height:80px;border:1px solid #d1d5db;border-radius:8px;padding:8px;font-size:14px;resize:vertical;box-sizing:border-box;font-family:inherit"
      placeholder="What's the feedback?"></textarea>
    <div style="display:flex;gap:8px;margin-top:8px;justify-content:flex-end">
      <button id="nikkel-cancel-btn"
        style="padding:8px 16px;border:1px solid #d1d5db;border-radius:8px;background:#fff;cursor:pointer;font-size:14px">Cancel</button>
      <button id="nikkel-submit-btn"
        style="padding:8px 16px;border:none;border-radius:8px;background:#6366f1;color:#fff;cursor:pointer;font-size:14px;font-weight:600">Submit</button>
    </div>
  `

  document.body.appendChild(commentBubble)

  document.getElementById('nikkel-submit-btn').onclick = () => {
    const text = document.getElementById('nikkel-comment-input').value.trim()
    if (text) {
      onSubmit(text)
    }
  }

  document.getElementById('nikkel-cancel-btn').onclick = onCancel

  setTimeout(() => {
    document.getElementById('nikkel-comment-input')?.focus()
  }, 100)
}

export function closeCommentBubble() {
  if (commentBubble) {
    commentBubble.remove()
    commentBubble = null
  }
}
