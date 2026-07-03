(function() {
if (window.__nikkelLoaded) return;
window.__nikkelLoaded = true;

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
    #modeDd { background: #1e293b; color: #e2e8f0; border: 1px solid #334155; border-radius: 4px; padding: 2px 4px; font-size: 12px; cursor: pointer; }
    .mode-opt { padding: 4px 8px; cursor: pointer; }
    .mode-opt:hover { background: #1e293b; }
    #inspIdle { color: #64748b; font-style: italic; }
    #inspLive { display: none; gap: 8px; flex-wrap: wrap; }
    #inspLive span { white-space: nowrap; }
    .il { color: #64748b; }
    .iv { color: #e2e8f0; }
    #pinsBtn { background: #1e293b; border: 1px solid #334155; color: #94a3b8; border-radius: 4px; padding: 4px 8px; cursor: pointer; font-size: 12px; }
    #pinsBtn:hover { background: #334155; }
    #pinsBadge { background: #6366f1; color: #fff; border-radius: 10px; padding: 0 6px; font-size: 11px; margin-left: 4px; }
    #refreshBtn { background: transparent; border: 1px solid #475569; color: #94a3b8; border-radius: 4px; padding: 4px 6px; cursor: pointer; font-size: 14px; line-height: 1; }
    #refreshBtn:hover { background: #1e293b; color: #e2e8f0; }
    #shareBtn { background: #6366f1; border: none; color: #fff; border-radius: 4px; padding: 4px 10px; cursor: pointer; font-weight: 500; font-size: 12px; }
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
    #doneBtn { background: transparent; border: 1px solid #475569; color: #94a3b8; border-radius: 4px; padding: 4px 10px; cursor: pointer; font-size: 12px; margin-left: auto; }
    #doneBtn:hover { background: #1e293b; color: #e2e8f0; }
    #modeDot.annotate { background: #10b981; }
    #modeDot.browse { background: #f59e0b; }
    #modeDot.idle { background: #64748b; }
  </style>
  <div id="bar">
    <div class="bar-section">
      <span id="projectName"></span>
    </div>
    <div class="bar-sep"></div>
    <div class="bar-section">
      <span id="modeDot" class="idle"></span>
      <span id="modeLabel">Idle</span>
      <select id="modeDd">
        <option value="idle">Idle</option>
        <option value="annotate">Annotate</option>
        <option value="browse">Browse</option>
      </select>
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
    <button id="refreshBtn">↻</button>
    <button id="shareBtn">🔗 Share</button>
    <button id="doneBtn">✓ Done</button>
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
  </style>
  <div id="popover">
    <div id="nvHead">
      <span id="nvNum">#0</span>
      <button id="nvClose">✕</button>
    </div>
    <div id="nvEl"></div>
    <div id="nvComment"></div>
    <div id="nvMeta"></div>
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

let currentMode = 'idle';
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
  const modeDd = qs(shadow, 'modeDd');
  const inspIdle = qs(shadow, 'inspIdle');
  const inspLive = qs(shadow, 'inspLive');
  const pinsBtn = qs(shadow, 'pinsBtn');
  const pinsBadge = qs(shadow, 'pinsBadge');
  const refreshBtn = qs(shadow, 'refreshBtn');
  const shareBtn = qs(shadow, 'shareBtn');
  const shareOverlay = qs(shadow, 'shareOverlay');
  const shareUrlTxt = qs(shadow, 'shareUrlTxt');
  const copyBtn = qs(shadow, 'copyBtn');
  const shareMeta = qs(shadow, 'shareMeta');
  const shareUrlSection = qs(shadow, 'shareUrlSection');
  const shareAuthSection = qs(shadow, 'shareAuthSection');
  const shareGoogleBtn = qs(shadow, 'shareGoogleBtn');
  const shareClose = qs(shadow, 'shareClose');
  const doneBtn = qs(shadow, 'doneBtn');

  pinsContainer = createShadowHost('nikkel-pins');
  pinsContainer.style.cssText = PINS_CSS;

  savedPaddingBottom = document.body.style.paddingBottom || '';
  document.body.style.paddingBottom = '42px';

  setMode(initialMode || 'idle');

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

  if (modeDd) {
    modeDd.addEventListener('change', () => {
      const mode = modeDd.value;
      if (readOnly && mode === 'annotate') {
        modeDd.value = 'browse';
        return;
      }
      setMode(mode);
      bgMsg({ type: 'MODE_CHANGED', payload: { mode } });
    });
  }

  if (pinsBtn) {
    pinsBtn.addEventListener('click', () => {
      isPinsVisible = !isPinsVisible;
      if (pinsContainer) {
        pinsContainer.style.display = isPinsVisible ? '' : 'none';
      }
    });
  }

  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      if (!currentSessionId) return;
      bgMsg({ type: 'GET_NIKKELS', payload: { pageUrl: location.href } }, (res) => {
        if (res?.ok && res.nikkels) {
          removeAllPins();
          res.nikkels.forEach((n) => addPin(n));
        }
      });
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
      bgMsg({ type: 'SIGN_IN_GOOGLE' }, (res) => {
        if (res?.ok && res.shareUrl) {
          if (shareUrlSection && shareAuthSection) {
            shareUrlSection.style.display = '';
            shareAuthSection.style.display = 'none';
          }
          if (shareUrlTxt) shareUrlTxt.value = res.shareUrl;
          if (shareMeta) shareMeta.textContent = 'Review saved and shareable!';
          if (copyBtn) {
            try { navigator.clipboard.writeText(shareUrlTxt.value); } catch {}
            copyBtn.textContent = 'Copied!';
            setTimeout(() => { copyBtn.textContent = 'Copy link'; }, 1500);
          }
        } else if (res?.ok && !res.shareUrl) {
          shareGoogleBtn.disabled = false;
          shareGoogleBtn.textContent = 'Continue with Google';
          if (shareMeta) shareMeta.textContent = 'Signed in. Click Share again to generate a link.';
        } else {
          shareGoogleBtn.disabled = false;
          shareGoogleBtn.textContent = 'Continue with Google';
        }
      });
    });
  }

  if (doneBtn) {
    doneBtn.addEventListener('click', () => {
      const mode = readOnly ? 'browse' : 'idle';
      setMode(mode);
      bgMsg({ type: 'MODE_CHANGED', payload: { mode } });
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
  currentMode = 'idle';
}

function injectCommentBubble(pageX, pageY, elementInfo) {
  removeCommentBubble();
  commentHost = createShadowHost('nikkel-comment-host');
  const shadow = commentHost.attachShadow({ mode: 'open' });
  shadow.innerHTML = COMMENT_BUBBLE_HTML;

  const cbEl = qs(shadow, 'cbEl');
  const cbTa = qs(shadow, 'cbTa');
  const cbCancel = qs(shadow, 'cbCancel');
  const cbSubmit = qs(shadow, 'cbSubmit');

  if (cbEl) cbEl.textContent = `<${elementInfo.tag}> ${elementInfo.elementText || ''}`;

  // Position bubble near the pin (pin center is at pageX, pageY; pin radius = 13)
  const pinRadius = 13;
  const margin = 8;
  let x = pageX + pinRadius + margin;
  let y = pageY - pinRadius;
  const bw = 284;
  const bh = 140;
  if (x + bw + 10 > window.innerWidth) x = pageX - pinRadius - margin - bw;
  if (y + bh + 10 > window.innerHeight) y = window.innerHeight - bh - 10;
  if (x < 10) x = 10;
  if (y < 10) y = 10;
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
  if (commentHost) return;
  const target = e.target;
  if (!target || target.closest(NIKKEL_SKIP_SELECTORS) || isNikkelOwned(target)) return;
  if (target.closest('a, button, input, select, textarea, [role="button"], [onclick]')) {
    e.preventDefault();
    e.stopPropagation();
    return;
  }

  const info = getElementInfo(target);
  const pageX = Math.round(e.clientX + window.scrollX);
  const pageY = Math.round(e.clientY + window.scrollY);

  const result = await injectCommentBubble(pageX, pageY, info);
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
    if (currentMode === 'annotate') {
      setMode('idle');
      bgMsg({ type: 'MODE_CHANGED', payload: { mode: 'idle' } });
    }
  }
}

function setMode(mode) {
  currentMode = mode;
  const host = document.getElementById('nikkel-bar-host');
  if (host && host.shadowRoot) {
    const shadow = host.shadowRoot;
    const modeDot = qs(shadow, 'modeDot');
    const modeLabel = qs(shadow, 'modeLabel');
    const modeDd = qs(shadow, 'modeDd');
    const inspIdle = qs(shadow, 'inspIdle');
    const inspLive = qs(shadow, 'inspLive');
    if (modeDot) modeDot.className = mode;
    if (modeLabel) {
      const labels = { idle: 'Idle', annotate: 'Annotate', browse: 'Browse' };
      modeLabel.textContent = labels[mode] || 'Idle';
    }
    if (modeDd) modeDd.value = mode;
    if (inspIdle) inspIdle.style.display = mode === 'annotate' ? 'none' : '';
    if (inspLive) inspLive.style.display = mode === 'annotate' ? 'flex' : 'none';
  }
  if (mode !== 'annotate') {
    clearHighlight();
    removeCommentBubble();
  }
  const cs = document.getElementById('nikkel-cursor');
  if (mode === 'annotate') {
    if (!cs) {
      const s = document.createElement('style');
      s.id = 'nikkel-cursor';
      s.textContent = '*,*::before,*::after{cursor:crosshair!important}';
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
  chrome.runtime.sendMessage({ type: 'GET_NIKKELS', payload: { pageUrl: location.href } }, (nres) => {
    if (nres?.ok && nres.nikkels) {
      removeAllPins();
      nres.nikkels.forEach((n) => addPin(n));
    }
    updateBadge();
  });
}

function onPageReady(fn) {
  if (document.readyState === 'complete') {
    fn();
  } else {
    window.addEventListener('load', fn, { once: true });
  }
}

function resumeActiveReview() {
  chrome.runtime.sendMessage({ type: 'GET_STATE' }, (res) => {
    if (res?.ok && res.project) {
      if (!barHost) injectBar(res.project.title, res.project.id, null, res.mode || 'annotate', res.review?.id, res.readOnly);
      onPageReady(loadPinsForReview);
    }
  });
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
    if (currentMode !== 'idle') removeBar();
  }
}
window.addEventListener('popstate', checkUrlChange);
window.addEventListener('hashchange', checkUrlChange);
setInterval(checkUrlChange, 1000);

window.addEventListener('message', (event) => {
  if (event.data?.type === 'PING') {
    window.postMessage({ type: 'PONG', source: 'nikkel-extension' }, '*');
  }
  if (event.data?.action === 'LOAD_REVIEW') {
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
  }
});
})();
