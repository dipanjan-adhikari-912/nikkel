(function() {
if (window.__nikkelLoaded) return;
window.__nikkelLoaded = true;

console.log('[Nikkel] content script injected', location.href);

document.documentElement.dataset.nikkelExtension = '1';

console.log('[Nikkel] content script loaded');

function isValid() {
  try { return !!chrome.runtime.id; } catch { return false; }
}

function bgMsg(msg, cb) {
  if (!isValid()) { console.warn('[Nikkel] context invalid, skipping', msg.type); return; }
  try {
    if (cb) { chrome.runtime.sendMessage(msg, cb); } else { chrome.runtime.sendMessage(msg); }
  } catch (e) { console.warn('[Nikkel] sendMessage failed', msg.type, e.message); }
}

const BAR_HTML = `
  <style>
    :host { all: initial; display: block; position: fixed; bottom: 0; left: 0; right: 0; z-index: 2147483647; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; }
    #bar { display: flex; align-items: center; gap: 8px; height: 42px; padding: 0 12px; background: #0f172a; border-top: 1px solid #1e293b; color: #94a3b8; box-sizing: border-box; }
    .bar-section { display: flex; align-items: center; gap: 6px; }
    .bar-sep { width: 1px; height: 20px; background: #1e293b; margin: 0 4px; }
    #projectName { color: #e2e8f0; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 140px; }
    #modeDot { width: 8px; height: 8px; border-radius: 50%; background: #64748b; flex-shrink: 0; }
    #modeLabel { color: #e2e8f0; font-weight: 500; }
    #modeToggle { display: flex; gap: 0; border: 1px solid #334155; border-radius: 4px; overflow: hidden; }
    #modeToggle button { background: #1e293b; color: #64748b; border: none; padding: 4px 10px; font-size: 12px; cursor: pointer; transition: background .15s, color .15s; }
    #modeToggle button:not(.active):hover { background: #334155; color: #94a3b8; }
    #modeToggle button.active { background: #6366f1; color: #fff; font-weight: 500; }
    #modeToggle button:first-child { border-right: 1px solid #334155; }
    #inspIdle { color: #64748b; font-style: italic; }
    #inspLive { display: none; gap: 8px; flex-wrap: wrap; }
    #inspLive span { white-space: nowrap; }
    .il { color: #64748b; }
    .iv { color: #e2e8f0; }
    #pinsBtn { background: #1e293b; border: 1px solid #334155; color: #94a3b8; border-radius: 4px; padding: 4px 8px; cursor: pointer; font-size: 12px; }
    #pinsBtn:hover { background: #334155; }
    #pinsBadge { background: #6366f1; color: #fff; border-radius: 10px; padding: 0 6px; font-size: 11px; margin-left: 4px; }
    #shareBtn { background: #6366f1; border: none; color: #fff; border-radius: 4px; padding: 4px 10px; cursor: pointer; font-weight: 500; font-size: 12px; margin-left: auto; }
    #shareBtn:hover { background: #4f46e5; }
    #shareOverlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,.55); z-index: 2147483647; align-items: center; justify-content: center; }
    #shareOverlay.visible { display: flex; }
    #shareModal { background: #0f172a; border: 1px solid #1e293b; border-radius: 12px; padding: 20px; width: 360px; box-shadow: 0 8px 32px rgba(0,0,0,.5); }
    #shareHead { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    #shareHead span { font-weight: 600; color: #e2e8f0; font-size: 15px; }
    #shareClose { background: transparent; border: none; color: #64748b; cursor: pointer; font-size: 18px; padding: 0 4px; line-height: 1; }
    #shareClose:hover { color: #e2e8f0; }
    #shareUrlTxt { width: 100%; background: #1e293b; border: 1px solid #334155; color: #e2e8f0; border-radius: 4px; padding: 8px; font-size: 13px; margin-bottom: 8px; box-sizing: border-box; }
    #copyBtn { background: #6366f1; border: none; color: #fff; border-radius: 4px; padding: 6px 14px; cursor: pointer; font-size: 12px; font-weight: 500; }
    #copyBtn:hover { background: #4f46e5; }
    #shareMeta { font-size: 11px; color: #64748b; margin-top: 8px; }
  </style>
  <div id="bar">
    <div class="bar-section">
      <span id="projectName"></span>
    </div>
    <div class="bar-sep"></div>
    <div class="bar-section">
      <span id="modeDot" class="browse"></span>
      <span id="modeLabel">Browse</span>
      <span id="modeToggle">
        <button id="browseBtn">Browse</button>
        <button id="annotateBtn">Annotate</button>
      </span>
    </div>
    <div class="bar-sep"></div>
    <div class="bar-section" id="inspIdle">Hover over elements to inspect</div>
    <div class="bar-section" id="inspLive">
      <span><span class="il">Tag:</span> <span class="iv" id="iTag">—</span></span>
      <span><span class="il">Text:</span> <span class="iv" id="iText">—</span></span>
      <span><span class="il">Sel:</span> <span class="iv" id="iSel">—</span></span>
      <span><span class="il">XY:</span> <span class="iv" id="iXY">—</span></span>
    </div>
    <div class="bar-sep"></div>
    <button id="pinsBtn">📍<span id="pinsBadge">0</span></button>
    <button id="shareBtn">🔗 Share</button>
  </div>
  <div id="shareOverlay">
    <div id="shareModal">
      <div id="shareHead">
        <span>Share Session</span>
        <button id="shareClose">✕</button>
      </div>
      <div id="shareUrlSection">
        <input id="shareUrlTxt" readonly />
        <button id="copyBtn">Copy link</button>
        <div id="shareMeta"></div>
      </div>
      <div id="shareAuthSection" style="display:none">
        <div style="color:#94a3b8;font-size:12px;text-align:center;line-height:1.4;margin:8px 0">Save your review to share it.<br />Authenticate with Google to generate a shareable link.</div>
        <button id="shareGoogleBtn" style="width:100%;background:#fff;color:#1e293b;border:none;border-radius:6px;padding:8px;font-size:13px;font-weight:500;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px">Continue with Google</button>
      </div>
    </div>
  </div>
`;

const COMMENT_BUBBLE_HTML = `
  <style>
    :host { all: initial; display: block; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; z-index: 2147483647; }
    #bubble { background: #0f172a; border: 1px solid #1e293b; border-radius: 8px; padding: 10px; width: 284px; box-shadow: 0 4px 16px rgba(0,0,0,.5); box-sizing: border-box; }
    #cbEl { color: #94a3b8; font-size: 11px; margin-bottom: 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    #cbTa { width: 100%; background: #1e293b; border: 1px solid #334155; color: #e2e8f0; border-radius: 4px; padding: 6px 8px; font-size: 13px; resize: none; min-height: 60px; box-sizing: border-box; }
    #cbTa:focus { outline: 1px solid #6366f1; border-color: #6366f1; }
    #cbActions { display: flex; gap: 6px; justify-content: flex-end; margin-top: 6px; }
    #cbCancel { background: transparent; border: 1px solid #475569; color: #94a3b8; border-radius: 4px; padding: 4px 10px; cursor: pointer; font-size: 12px; }
    #cbCancel:hover { background: #1e293b; }
    #cbSubmit { background: #6366f1; border: none; color: #fff; border-radius: 4px; padding: 4px 12px; cursor: pointer; font-weight: 500; font-size: 12px; }
    #cbSubmit:hover { background: #4f46e5; }
  </style>
  <div id="bubble">
    <div id="cbEl"></div>
    <textarea id="cbTa" placeholder="Type your feedback…"></textarea>
    <div id="cbActions">
      <button id="cbCancel">Cancel</button>
      <button id="cbSubmit">Submit</button>
    </div>
  </div>
`;

const POPOVER_HTML = `
  <style>
    :host { all: initial; display: block; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; z-index: 2147483647; }
    #popover { background: #0f172a; border: 1px solid #1e293b; border-radius: 8px; padding: 10px; width: 264px; box-shadow: 0 4px 16px rgba(0,0,0,.5); box-sizing: border-box; }
    #nvHead { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
    #nvNum { color: #6366f1; font-weight: 600; font-size: 14px; }
    #nvClose { background: transparent; border: none; color: #64748b; cursor: pointer; font-size: 16px; padding: 0 2px; }
    #nvClose:hover { color: #e2e8f0; }
    #nvEl { color: #94a3b8; font-size: 11px; margin-bottom: 6px; }
    #nvComment { color: #e2e8f0; font-size: 13px; line-height: 1.4; white-space: pre-wrap; word-wrap: break-word; }
    #nvMeta { color: #64748b; font-size: 11px; margin-top: 6px; }
    #comments { border-top: 1px solid #1e293b; margin-top: 8px; padding-top: 6px; }
    #commentsTitle { color: #94a3b8; font-size: 11px; font-weight: 600; margin-bottom: 4px; }
    #commentsList { list-style: none; margin: 0; padding: 0; max-height: 180px; overflow-y: auto; }
    #commentsList li { padding: 4px 0; border-bottom: 1px solid #0f172a; }
    #commentsList li:last-child { border-bottom: none; }
    .cmtAuthor { color: #6366f1; font-size: 11px; font-weight: 500; }
    .cmtText { color: #e2e8f0; font-size: 12px; line-height: 1.4; margin: 1px 0; }
    .cmtTime { color: #64748b; font-size: 10px; }
    #commentsLoading { color: #64748b; font-size: 11px; text-align: center; padding: 8px 0; }
    #commentsEmpty { color: #64748b; font-size: 11px; text-align: center; padding: 8px 0; }
    #commentInput { display: flex; gap: 6px; margin-top: 6px; }
    #commentInputField { flex: 1; background: #1e293b; border: 1px solid #334155; border-radius: 4px; color: #e2e8f0; font-size: 12px; padding: 6px 8px; outline: none; box-sizing: border-box; }
    #commentInputField:focus { border-color: #6366f1; }
    #commentSubmit { background: #6366f1; border: none; color: #fff; border-radius: 4px; padding: 6px 10px; font-size: 12px; font-weight: 500; cursor: pointer; white-space: nowrap; }
    #commentSubmit:disabled { opacity: .5; cursor: default; }
    #commentError { color: #f87171; font-size: 11px; margin-top: 4px; display: none; }
  </style>
  <div id="popover">
    <div id="nvHead">
      <span id="nvNum">#0</span>
      <button id="nvClose">✕</button>
    </div>
    <div id="nvEl"></div>
    <div id="nvComment"></div>
    <div id="nvMeta"></div>
    <div id="comments">
      <div id="commentsTitle">Comments</div>
      <div id="commentsLoading">Loading comments…</div>
      <div id="commentsEmpty" style="display:none">No comments yet.</div>
      <ul id="commentsList"></ul>
      <div id="commentInput">
        <input id="commentInputField" type="text" placeholder="Add a comment…" />
        <button id="commentSubmit">Send</button>
      </div>
      <div id="commentError"></div>
    </div>
  </div>
`;

const PINS_CSS = `
  position: absolute !important;
  top: 0 !important;
  left: 0 !important;
  overflow: visible !important;
  pointer-events: none !important;
  z-index: 2147483646 !important;
  width: 0 !important;
  height: 0 !important;
`;

let currentMode = 'browse';
let barHost = null;
let commentHost = null;
let popoverHost = null;
let pinsContainer = null;
let highlightEl = null;
let pins = [];
let pinCounter = 0;
let savedPaddingBottom = '';
let isPinsVisible = true;
let commentResolve = null;
let currentSessionId = null;
let currentReviewId = null;
let readOnly = false;
let pollInterval = null;

const NIKKEL_SKIP_SELECTORS = '#nikkel-bar-host, #nikkel-comment-host, #nikkel-popover-host, #nikkel-pins';

function isNikkelOwned(el) {
  const root = el.getRootNode();
  if (root instanceof ShadowRoot) {
    const hostId = root.host?.id || '';
    return hostId === 'nikkel-bar-host' || hostId === 'nikkel-comment-host' || hostId === 'nikkel-popover-host';
  }
  return false;
}

function buildSelector(el) {
  if (el.id) return '#' + CSS.escape(el.id);
  if (el.className && typeof el.className === 'string') {
    const cls = el.className.trim().split(/\s+/).find(c => c.length > 0);
    if (cls) return el.tagName.toLowerCase() + '.' + CSS.escape(cls);
  }
  return el.tagName.toLowerCase();
}

function getElementInfo(el) {
  const text = (el.innerText || '').trim().slice(0, 60);
  const rect = el.getBoundingClientRect();
  return {
    tag: el.tagName.toLowerCase(),
    elementText: text,
    selector: buildSelector(el),
    pageX: Math.round(rect.left + window.scrollX),
    pageY: Math.round(rect.top + window.scrollY),
  };
}

function createShadowHost(id) {
  let host = document.getElementById(id);
  if (!host) {
    host = document.createElement('div');
    host.id = id;
    if (id === 'nikkel-pins') {
      document.documentElement.appendChild(host);
    } else {
      document.body.appendChild(host);
    }
  }
  return host;
}

function qs(shadow, id) {
  return shadow.querySelector('#' + CSS.escape(id));
}

function startPolling() {
  stopPolling();
  if (!currentSessionId) return;
  pollInterval = setInterval(() => {
    bgMsg({ type: 'GET_NIKKELS', payload: { pageUrl: location.href } }, (res) => {
      if (res?.ok && res.nikkels) {
        res.nikkels.forEach((n) => {
          if (!pins.find((p) => p.id === n.id)) addPin(n);
        });
      }
    });
  }, 30000);
}

function stopPolling() {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
}

function injectBar(projectName, sessionId, shareUrl, initialMode, reviewId, isReadOnly) {
  if (barHost) {
    console.log('[Nikkel] injectBar: barHost already exists, skipping');
    return;
  }
  console.log('[Nikkel] injectBar: injecting bar', { projectName, sessionId, shareUrl, initialMode, reviewId, isReadOnly });
  currentSessionId = sessionId || null;
  currentReviewId = reviewId || null;
  readOnly = isReadOnly || false;
  barHost = createShadowHost('nikkel-bar-host');
  const shadow = barHost.attachShadow({ mode: 'open' });
  shadow.innerHTML = BAR_HTML;

  const projectNameEl = qs(shadow, 'projectName');
  const browseBtn = qs(shadow, 'browseBtn');
  const annotateBtn = qs(shadow, 'annotateBtn');
  const inspIdle = qs(shadow, 'inspIdle');
  const inspLive = qs(shadow, 'inspLive');
  const pinsBtn = qs(shadow, 'pinsBtn');
  const pinsBadge = qs(shadow, 'pinsBadge');
  const shareBtn = qs(shadow, 'shareBtn');
  const shareOverlay = qs(shadow, 'shareOverlay');
  const shareUrlTxt = qs(shadow, 'shareUrlTxt');
  const copyBtn = qs(shadow, 'copyBtn');
  const shareMeta = qs(shadow, 'shareMeta');
  const shareUrlSection = qs(shadow, 'shareUrlSection');
  const shareAuthSection = qs(shadow, 'shareAuthSection');
  const shareGoogleBtn = qs(shadow, 'shareGoogleBtn');
  const shareClose = qs(shadow, 'shareClose');

  pinsContainer = createShadowHost('nikkel-pins');
  pinsContainer.style.cssText = PINS_CSS;

  savedPaddingBottom = document.body.style.paddingBottom || '';
  document.body.style.paddingBottom = '42px';

  setMode(initialMode || 'browse');

  if (projectNameEl) projectNameEl.textContent = projectName || '';
  if (shareUrl && shareUrlTxt) {
    shareUrlTxt.value = shareUrl;
    if (shareMeta) shareMeta.textContent = projectName ? `Session: ${projectName}` : '';
    if (shareUrlSection) shareUrlSection.style.display = '';
    if (shareAuthSection) shareAuthSection.style.display = 'none';
  } else {
    if (shareUrlSection) shareUrlSection.style.display = 'none';
    if (shareAuthSection) shareAuthSection.style.display = '';
  }

  document.addEventListener('mousemove', handleMousemove);
  document.addEventListener('click', handleDocumentClick, true);
  document.addEventListener('keydown', handleKeydown);
  document.addEventListener('contextmenu', handleContextMenu);

  const switchMode = (mode) => {
    if (readOnly && mode === 'annotate') return;
    setMode(mode);
    bgMsg({ type: 'MODE_CHANGED', payload: { mode } });
  };
  if (browseBtn) browseBtn.addEventListener('click', () => switchMode('browse'));
  if (annotateBtn) annotateBtn.addEventListener('click', () => switchMode('annotate'));

  if (pinsBtn) {
    pinsBtn.addEventListener('click', () => {
      isPinsVisible = !isPinsVisible;
      if (pinsContainer) {
        pinsContainer.style.display = isPinsVisible ? '' : 'none';
      }
    });
  }

  if (shareBtn) {
    shareBtn.addEventListener('click', () => {
      if (shareOverlay) shareOverlay.classList.add('visible');
    });
  }

  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(shareUrlTxt.value);
        copyBtn.textContent = 'Copied!';
        setTimeout(() => { copyBtn.textContent = 'Copy link'; }, 1500);
      } catch { }
    });
  }

  if (shareClose) {
    shareClose.addEventListener('click', () => {
      if (shareOverlay) shareOverlay.classList.remove('visible');
    });
  }

  if (shareOverlay) {
    shareOverlay.addEventListener('click', (e) => {
      if (e.target === shareOverlay) shareOverlay.classList.remove('visible');
    });
  }

  if (shareGoogleBtn) {
    shareGoogleBtn.addEventListener('click', async () => {
      shareGoogleBtn.disabled = true;
      shareGoogleBtn.textContent = 'Connecting…';

      const showUrl = (url) => {
        if (shareUrlSection && shareAuthSection) {
          shareUrlSection.style.display = '';
          shareAuthSection.style.display = 'none';
        }
        if (shareUrlTxt) shareUrlTxt.value = url;
        if (shareMeta) shareMeta.textContent = 'Review saved and shareable!';
        if (copyBtn) {
          try { navigator.clipboard.writeText(url); } catch {}
          copyBtn.textContent = 'Copied!';
          setTimeout(() => { copyBtn.textContent = 'Copy link'; }, 1500);
        }
      };

      const showError = (msg) => {
        shareGoogleBtn.disabled = false;
        shareGoogleBtn.textContent = 'Continue with Google';
        if (shareMeta) shareMeta.textContent = msg;
      };

      // Step 1: try SHARE — sets pendingShare if anonymous
      let shareRes;
      try { shareRes = await chrome.runtime.sendMessage({ type: 'SHARE' }); } catch { return showError('Extension context lost.'); }
      if (shareRes?.ok && shareRes.shareUrl) return showUrl(shareRes.shareUrl);
      if (!shareRes?.ok) return showError(shareRes?.error || 'Failed to create share link.');

      // needsAuth was returned — authenticate, background will create review via pendingShare
      let authRes;
      try { authRes = await chrome.runtime.sendMessage({ type: 'SIGN_IN_GOOGLE' }); } catch { return showError('Extension context lost.'); }
      if (authRes?.ok && authRes.shareUrl) return showUrl(authRes.shareUrl);
      showError(authRes?.ok ? 'Signed in. Click Share again to generate a link.' : (authRes?.error || 'Google sign-in failed.'));
    });
  }

  startPolling();
  console.log('[Nikkel] injectBar: done');
}

function removeBar() {
  console.log('[Nikkel] removeBar');
  stopPolling();
  document.removeEventListener('mousemove', handleMousemove);
  document.removeEventListener('click', handleDocumentClick, true);
  document.removeEventListener('keydown', handleKeydown);
  document.removeEventListener('contextmenu', handleContextMenu);
  if (barHost) {
    barHost.remove();
    barHost = null;
  }
  if (pinsContainer) {
    pinsContainer.remove();
    pinsContainer = null;
  }
  removeCommentBubble();
  removePopover();
  clearHighlight();
  pins = [];
  pinCounter = 0;
  currentSessionId = null;
  currentReviewId = null;
  readOnly = false;
  document.body.style.paddingBottom = savedPaddingBottom;
  document.getElementById('nikkel-cursor')?.remove();
  currentMode = 'browse';
}

function injectCommentBubble(cx, cy, elementInfo) {
  removeCommentBubble();
  commentHost = createShadowHost('nikkel-comment-host');
  const shadow = commentHost.attachShadow({ mode: 'open' });
  shadow.innerHTML = COMMENT_BUBBLE_HTML;

  const cbEl = qs(shadow, 'cbEl');
  const cbTa = qs(shadow, 'cbTa');
  const cbCancel = qs(shadow, 'cbCancel');
  const cbSubmit = qs(shadow, 'cbSubmit');

  if (cbEl) cbEl.textContent = `<${elementInfo.tag}> ${elementInfo.elementText || ''}`;

  const margin = 8;
  const bw = 284;
  const bh = 140;
  let x = cx + margin;
  let y = cy - Math.round(bh / 2);
  if (x + bw + margin > window.innerWidth) x = cx - margin - bw;
  if (y + bh + margin > window.innerHeight) y = cy - bh - margin;
  if (x < margin) x = margin;
  if (y < margin) y = margin;
  commentHost.style.cssText = `position:fixed;left:${x}px;top:${y}px;z-index:2147483647`;

  if (cbTa) cbTa.focus();

  return new Promise((resolve) => {
    commentResolve = resolve;

    function submit() {
      if (!cbTa) return;
      const comment = cbTa.value.trim();
      if (!comment) return;
      cbTa.disabled = true;
      if (cbSubmit) cbSubmit.disabled = true;
      resolve({ comment, elementInfo });
      removeCommentBubble();
    }

    if (cbSubmit) cbSubmit.addEventListener('click', submit);
    if (cbCancel) {
      cbCancel.addEventListener('click', () => {
        resolve(null);
        removeCommentBubble();
      });
    }

    if (cbTa) {
      cbTa.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          resolve(null);
          removeCommentBubble();
        }
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
          e.preventDefault();
          submit();
        }
      });
    }
  });
}

function removeCommentBubble() {
  if (commentHost) {
    commentHost.remove();
    commentHost = null;
  }
  if (commentResolve) {
    commentResolve(null);
    commentResolve = null;
  }
}

function injectPopover(pageX, pageY, nikkel) {
  removePopover();
  popoverHost = createShadowHost('nikkel-popover-host');
  const shadow = popoverHost.attachShadow({ mode: 'open' });
  shadow.innerHTML = POPOVER_HTML;

  const nvNum = qs(shadow, 'nvNum');
  const nvEl = qs(shadow, 'nvEl');
  const nvComment = qs(shadow, 'nvComment');
  const nvMeta = qs(shadow, 'nvMeta');
  const nvClose = qs(shadow, 'nvClose');

  if (nvNum) nvNum.textContent = `#${nikkel.idx || '?'}`;
  if (nvEl) nvEl.textContent = `<${nikkel.tag || '?'}> ${(nikkel.elementText || '').slice(0, 60)}`;
  if (nvComment) nvComment.textContent = nikkel.comment || '';
  if (nvMeta) nvMeta.textContent = nikkel.selector ? `Selector: ${nikkel.selector}` : '';

  let x = pageX;
  let y = pageY;
  const pw = 264;
  const ph = 120;
  if (x + pw + 10 > window.innerWidth) x = window.innerWidth - pw - 10;
  if (y + ph + 10 > window.innerHeight) y = window.innerHeight - ph - 10;
  if (x < 10) x = 10;
  if (y < 10) y = 10;

  popoverHost.style.cssText = `position:fixed;left:${x}px;top:${y}px;z-index:2147483647`;

  if (nvClose) nvClose.addEventListener('click', removePopover);

  loadNikkelComments(nikkel);
}

function loadNikkelComments(nikkel) {
  const shadow = popoverHost?.shadowRoot;
  if (!shadow) return;
  const list = qs(shadow, 'commentsList');
  const loading = qs(shadow, 'commentsLoading');
  const empty = qs(shadow, 'commentsEmpty');
  const input = qs(shadow, 'commentInputField');
  const submit = qs(shadow, 'commentSubmit');
  const errEl = qs(shadow, 'commentError');
  if (!list || !loading || !empty || !input || !submit || !errEl) return;

  let comments = [];

  const render = () => {
    loading.style.display = 'none';
    if (comments.length > 0) {
      comments.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      list.innerHTML = comments.map((c) => `
        <li data-cmid="${escHtml(c.id || c._temp || '')}">
          <div class="cmtAuthor">${escHtml(c.author_name || 'Anonymous')}</div>
          <div class="cmtText">${escHtml(c.body)}</div>
          <div class="cmtTime">${c.created_at ? new Date(c.created_at).toLocaleString() : 'Just now'}</div>
        </li>
      `).join('');
      empty.style.display = 'none';
    } else {
      list.innerHTML = '';
      empty.style.display = '';
    }
  };

  loading.style.display = '';
  empty.style.display = 'none';
  list.innerHTML = '';

  if (!isValid()) return;
  try {
    chrome.runtime.sendMessage({ type: 'GET_NIKKEL_COMMENTS', payload: { nikkelId: nikkel.id } }, (res) => {
      if (chrome.runtime.lastError) return;
      const serverComments = (res?.ok ? res.comments || [] : []);
      const pendingTemps = comments.filter((c) => c._temp);
      comments = [...serverComments];
      for (const t of pendingTemps) {
        if (!comments.find((c) => c._temp === t._temp)) {
          comments.push(t);
        }
      }
      render();
    });
  } catch (e) { console.warn('[Nikkel] GET_NIKKEL_COMMENTS failed', e.message); }

  const handleSubmit = async () => {
    const text = input.value.trim();
    if (!text) return;
    submit.disabled = true;
    errEl.style.display = 'none';

    const temp = { id: null, _temp: `tmp-${Date.now()}`, author_name: 'You', body: text, created_at: null };
    comments.push(temp);
    render();
    input.value = '';

    if (!isValid()) { submit.disabled = false; return; }
    try {
      chrome.runtime.sendMessage({ type: 'SUBMIT_COMMENT', payload: { nikkelId: nikkel.id, text } }, (res2) => {
        submit.disabled = false;
        if (chrome.runtime.lastError) {
          comments = comments.filter((c) => c._temp !== temp._temp);
          render();
          errEl.textContent = 'Extension context lost.';
          errEl.style.display = '';
          return;
        }
        if (res2?.ok && res2.comment) {
          const idx = comments.findIndex((c) => c._temp === temp._temp);
          if (idx !== -1) {
            comments[idx] = res2.comment;
          } else {
            comments.push(res2.comment);
          }
          render();
        } else {
          comments = comments.filter((c) => c._temp !== temp._temp);
          render();
          errEl.textContent = res2?.error || 'Failed to post comment.';
          errEl.style.display = '';
        }
      });
    } catch (e) {
      submit.disabled = false;
      comments = comments.filter((c) => c._temp !== temp._temp);
      render();
      errEl.textContent = 'Failed to post comment.';
      errEl.style.display = '';
    }
  };

  submit.onclick = handleSubmit;
  input.onkeydown = (e) => { if (e.key === 'Enter') handleSubmit(); };
}

function escHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function removePopover() {
  if (popoverHost) {
    popoverHost.remove();
    popoverHost = null;
  }
}

function addPin(nikkel) {
  if (!pinsContainer) return;
  pinCounter++;
  const idx = nikkel.idx ?? pinCounter;
  const pin = document.createElement('div');
  pin.dataset.idx = idx;
  pin.dataset.sessionId = nikkel.sessionId || '';
  const isRemote = nikkel.userId && nikkel.userId !== 'local';
  pin.textContent = idx;
  const px = (nikkel.pageX || 0) - 13;
  const py = (nikkel.pageY || 0) - 13;
  pin.style.cssText = `
    position: absolute;
    left: ${px}px;
    top: ${py}px;
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background: ${isRemote ? '#0ea5e9' : '#6366f1'};
    color: #fff;
    font-size: 11px;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    pointer-events: auto;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    box-shadow: 0 2px 4px rgba(0,0,0,.3);
    transition: transform .15s, box-shadow .15s;
    z-index: 1;
    user-select: none;
  `;
  pin.addEventListener('mouseenter', () => {
    pin.style.transform = 'scale(1.2)';
    pin.style.boxShadow = '0 0 0 3px rgba(99,102,241,.3), 0 2px 8px rgba(0,0,0,.4)';
  });
  pin.addEventListener('mouseleave', () => {
    pin.style.transform = '';
    pin.style.boxShadow = '';
  });
  pin.addEventListener('click', (e) => {
    e.stopPropagation();
    removeCommentBubble();
    injectPopover(nikkel.pageX + 13, nikkel.pageY + 13, nikkel);
  });
  pinsContainer.appendChild(pin);
  pins.push(nikkel);
  updateBadge();
}

function removeAllPins() {
  if (pinsContainer) {
    pinsContainer.innerHTML = '';
  }
  pins = [];
  pinCounter = 0;
  updateBadge();
}

function updateBadge() {
  const host = document.getElementById('nikkel-bar-host');
  if (!host) return;
  const shadow = host.shadowRoot;
  if (!shadow) return;
  const el = qs(shadow, 'pinsBadge');
  if (el) el.textContent = pins.length;
}

function clearHighlight() {
  if (highlightEl) {
    highlightEl.style.outline = '';
    highlightEl = null;
  }
}

function handleMousemove(e) {
  if (currentMode !== 'annotate') return;
  const target = e.target;
  if (!target || target.closest(NIKKEL_SKIP_SELECTORS) || isNikkelOwned(target)) {
    clearHighlight();
    return;
  }

  clearHighlight();
  highlightEl = target;
  target.style.outline = '1.5px solid rgba(99,102,241,.55)';

  const info = getElementInfo(target);
  const host = document.getElementById('nikkel-bar-host');
  if (!host) return;
  const shadow = host.shadowRoot;
  if (!shadow) return;
  const iTag = qs(shadow, 'iTag');
  const iText = qs(shadow, 'iText');
  const iSel = qs(shadow, 'iSel');
  const iXY = qs(shadow, 'iXY');
  if (iTag) iTag.textContent = info.tag;
  if (iText) iText.textContent = info.elementText.slice(0, 60);
  if (iSel) iSel.textContent = info.selector;
  if (iXY) iXY.textContent = `${info.pageX}, ${info.pageY}`;
}

async function handleDocumentClick(e) {
  if (currentMode !== 'annotate') return;
  const target = e.target;
  if (!target || target.closest(NIKKEL_SKIP_SELECTORS) || isNikkelOwned(target)) return;

  e.preventDefault();
  e.stopPropagation();

  if (commentHost) removeCommentBubble();
  if (popoverHost) removePopover();

  const info = getElementInfo(target);
  const clientX = e.clientX;
  const clientY = e.clientY;
  const pageX = Math.round(clientX + window.scrollX);
  const pageY = Math.round(clientY + window.scrollY);

  const result = await injectCommentBubble(clientX, clientY, info);
  if (!result) return;

  const nikkel = {
    pageX,
    pageY,
    pageUrl: location.href,
    viewportW: window.innerWidth,
    viewportH: window.innerHeight,
    tag: result.elementInfo.tag,
    selector: result.elementInfo.selector,
    elementText: result.elementInfo.elementText,
    comment: result.comment,
    idx: pins.length + 1,
  };

  console.log('[Nikkel] submitting nikkel', nikkel);
  bgMsg({ type: 'SUBMIT_NIKKEL', payload: { nikkel } }, (res) => {
    if (!res?.ok) console.error('[Nikkel] Submit failed:', res.error);
  });
}

function handleKeydown(e) {
  if (e.key === 'Escape') {
    if (commentHost) {
      removeCommentBubble();
      return;
    }
    if (popoverHost) {
      removePopover();
      return;
    }
    const host = document.getElementById('nikkel-bar-host');
    const overlay = host?.shadowRoot ? qs(host.shadowRoot, 'shareOverlay') : null;
    if (overlay?.classList.contains('visible')) {
      overlay.classList.remove('visible');
      return;
    }
  }
}

function handleContextMenu(e) {
  if (currentMode === 'annotate') {
    const target = e.target;
    if (!target || target.closest(NIKKEL_SKIP_SELECTORS) || isNikkelOwned(target)) return;
    e.preventDefault();
  }
}

function setMode(mode) {
  currentMode = mode;
  const host = document.getElementById('nikkel-bar-host');
  if (host && host.shadowRoot) {
    const shadow = host.shadowRoot;
    const modeDot = qs(shadow, 'modeDot');
    const modeLabel = qs(shadow, 'modeLabel');
    const browseBtn = qs(shadow, 'browseBtn');
    const annotateBtn = qs(shadow, 'annotateBtn');
    const inspIdle = qs(shadow, 'inspIdle');
    const inspLive = qs(shadow, 'inspLive');
    if (modeDot) modeDot.className = mode;
    if (modeLabel) modeLabel.textContent = mode === 'annotate' ? 'Annotate' : 'Browse';
    if (browseBtn) browseBtn.className = mode === 'annotate' ? '' : 'active';
    if (annotateBtn) annotateBtn.className = mode === 'annotate' ? 'active' : '';
    if (inspIdle) inspIdle.style.display = mode === 'annotate' ? 'none' : '';
    if (inspLive) inspLive.style.display = mode === 'annotate' ? 'flex' : 'none';
  }
  if (mode === 'browse') {
    clearHighlight();
    removeCommentBubble();
    removePopover();
  }
  const cs = document.getElementById('nikkel-cursor');
  if (mode === 'annotate') {
    if (!cs) {
      const s = document.createElement('style');
      s.id = 'nikkel-cursor';
      s.textContent = '*,*::before,*::after{cursor:crosshair!important;user-select:none!important}';
      document.documentElement.appendChild(s);
    }
  } else if (cs) {
    cs.remove();
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  const handle = async () => {
    console.log('[Nikkel] received message', msg.type);
    switch (msg.type) {
      case 'ACTIVATE': {
        injectBar(msg.payload.projectName, msg.payload.sessionId, msg.payload.shareUrl, msg.payload.mode || 'annotate', msg.payload.reviewId, msg.payload.readOnly);
        loadPinsForReview();
        return { ok: true };
      }
      case 'DEACTIVATE': {
        removeBar();
        return { ok: true };
      }
      case 'PIN_CONFIRMED': {
        addPin(msg.payload.nikkel);
        return { ok: true };
      }
      case 'GET_PAGE_CONTEXT': {
        return { ok: true, url: location.href, title: document.title };
      }
      case 'LOAD_SESSION': {
        injectBar(msg.payload.projectName, msg.payload.sessionId, msg.payload.shareUrl, msg.payload.viewOnly ? 'browse' : 'annotate', msg.payload.reviewId, msg.payload.viewOnly);
        removeAllPins();
        for (const n of msg.payload.nikkels) {
          addPin(n);
        }
        setMode(msg.payload.viewOnly ? 'browse' : 'annotate');
        return { ok: true };
      }
      default:
        return { ok: false, error: 'Unknown content message' };
    }
  };
  handle().then(sendResponse).catch((err) => {
    console.error('[Nikkel] message handler error', err);
    sendResponse({ ok: false, error: err.message });
  });
  return true;
});

function setBadgeText(text) {
  const host = document.getElementById('nikkel-bar-host');
  if (!host) return;
  const shadow = host.shadowRoot;
  if (!shadow) return;
  const el = qs(shadow, 'pinsBadge');
  if (el) el.textContent = text;
}

function loadPinsForReview() {
  if (!currentSessionId) return;
  setBadgeText('...');
  if (!isValid()) return;
  try {
    chrome.runtime.sendMessage({ type: 'GET_NIKKELS', payload: { pageUrl: location.href } }, (nres) => {
      if (chrome.runtime.lastError) return;
      if (nres?.ok && nres.nikkels) {
        removeAllPins();
        nres.nikkels.forEach((n) => addPin(n));
      }
      updateBadge();
    });
  } catch (e) { console.warn('[Nikkel] GET_NIKKELS failed', e.message); }
}

function onPageReady(fn) {
  if (document.readyState === 'complete') {
    fn();
  } else {
    window.addEventListener('load', fn, { once: true });
  }
}

function resumeActiveReview() {
  if (!isValid()) return;
  try {
    chrome.runtime.sendMessage({ type: 'GET_STATE' }, (res) => {
      if (chrome.runtime.lastError) return;
      if (res?.ok && res.project) {
        if (!barHost) injectBar(res.project.title, res.project.id, null, res.mode || 'annotate', res.review?.id, res.readOnly);
        onPageReady(loadPinsForReview);
      }
    });
  } catch (e) { console.warn('[Nikkel] GET_STATE failed', e.message); }
}

onPageReady(() => {
  resumeActiveReview();
});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') onPageReady(resumeActiveReview);
});

let lastUrl = location.href;
function checkUrlChange() {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    if (barHost) removeBar();
  }
}
window.addEventListener('popstate', checkUrlChange);
window.addEventListener('hashchange', checkUrlChange);
setInterval(checkUrlChange, 1000);

window.addEventListener('message', (event) => {
  if (event.data?.type === 'PING') {
    console.log('[Nikkel] received PING');
    console.log('[Nikkel] sending PONG');
    window.postMessage({ type: 'PONG', source: 'nikkel-extension' }, '*');
  }
  if (event.data?.type === 'NIKKEL_PING') {
    window.postMessage({ type: 'NIKKEL_AVAILABLE', source: 'nikkel-extension' }, '*');
  }
  if (event.data?.type === 'OPEN_PROJECT') {
    const { shareId } = event.data?.payload || {};
    if (shareId) {
      if (!isValid()) return;
      try {
        chrome.runtime.sendMessage(
          { type: 'OPEN_PROJECT', payload: { shareId } },
          (res) => {
            if (chrome.runtime.lastError) {
              window.postMessage({ type: 'OPEN_PROJECT_RESULT', payload: { ok: false, error: 'Extension not ready' } }, '*');
              return;
            }
            window.postMessage({ type: 'OPEN_PROJECT_RESULT', payload: res || { ok: false, error: 'No response' } }, '*');
          }
        );
      } catch (e) {
        window.postMessage({ type: 'OPEN_PROJECT_RESULT', payload: { ok: false, error: 'Extension context lost.' } }, '*');
      }
    }
  }
  if (event.data?.action === 'LOAD_REVIEW') {
    if (!isValid()) return;
    try {
      chrome.runtime.sendMessage(
        { type: 'LOAD_REVIEW', payload: { reviewToken: event.data.reviewToken } },
        (res) => {
          if (chrome.runtime.lastError) {
            window.postMessage({ type: 'LOAD_REVIEW_RESULT', payload: { ok: false, error: 'Extension not ready' } }, '*');
            return;
          }
          window.postMessage({ type: 'LOAD_REVIEW_RESULT', payload: res || { ok: false, error: 'No response from extension' } }, '*');
        }
      );
    } catch (e) {
      window.postMessage({ type: 'LOAD_REVIEW_RESULT', payload: { ok: false, error: 'Extension context lost.' } }, '*');
    }
  }
});
console.log('[Nikkel] listener registered');
window.postMessage({ type: 'NIKKEL_EXTENSION_READY', source: 'nikkel-extension' }, '*');
})();
