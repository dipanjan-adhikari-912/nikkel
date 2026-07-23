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
    :host { all: initial; display: block; position: fixed; bottom: 0; left: 0; right: 0; z-index: 2147483647; font-family: 'Instrument Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; }
    *,*::before,*::after { box-sizing: border-box; }

    .nikkel-bar {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 12px 20px;
      background: #101715;
      border-radius: 48px;
      border: 1px solid transparent;
      background-image:
        linear-gradient(#101715, #101715),
        linear-gradient(92deg, #9dafa9 -16%, #dfdfdfa8 19%, #71b9a1 64%);
      background-origin: border-box;
      background-clip: padding-box, border-box;
      max-width: 100%;
      margin: 0 12px 12px;
      box-shadow: 0 4px 24px rgba(0,0,0,.4);
    }
    .nikkel-bar,
    .nikkel-bar * { cursor: default; }

    .icon-tile {
      width: 38px;
      height: 38px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #1d2a26;
      border-radius: 10px;
    }

    .bar-brand {
      color: #e2e8f0;
      font-weight: 600;
      font-size: 15px;
      letter-spacing: -0.02em;
      user-select: none;
      white-space: nowrap;
    }

    .pill {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      border-radius: 20px;
      border: 1px solid #ffffff1f;
      white-space: nowrap;
    }
    .pill-filled { background: #101715; }
    .pill-mode { background: transparent; border-color: #ffffff1f; }
    .pill-mode .annotate-label { font-weight: 600; }
    .pill-nikkels { border-color: #71b9a14d; }

    .switch {
      width: 44px;
      height: 22px;
      background: #212826;
      border-radius: 10px;
      display: flex;
      align-items: center;
      padding: 1px;
      cursor: pointer;
      flex-shrink: 0;
      border: none;
    }
    .switch.on { justify-content: flex-end; }
    .switch.off { justify-content: flex-start; }

    .badge {
      width: 26px;
      height: 26px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #71b9a1;
      color: #101715;
      font-weight: 600;
      font-size: 13px;
      border-radius: 40px;
      flex-shrink: 0;
    }

    .btn-share {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 18px;
      background: #71b9a1;
      color: #101715;
      font-weight: 500;
      border: none;
      border-radius: 20px;
      cursor: pointer;
      font-family: inherit;
      font-size: 14px;
      white-space: nowrap;
      flex-shrink: 0;
    }
    .btn-share:hover { background: #7fc4ac; }
    .btn-share:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
    .btn-share:disabled { opacity: .5; cursor: default; }

    .chevron-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border-radius: 8px;
      background: transparent;
      border: none;
      cursor: pointer;
      color: #71b9a1;
      flex-shrink: 0;
    }
    .chevron-btn:hover { background: #ffffff0f; }
    .chevron-btn:focus-visible { outline: 2px solid #71b9a1; outline-offset: 2px; }

    .spacer { flex: 1; min-width: 12px; }

    #eyeBtn { cursor: pointer; background: #101715; }
    #eyeBtn:hover { background: #1d2a26; }
    #eyeBtn.hidden .eye-visible { display: block; }
    #eyeBtn.hidden .eye-hidden { display: none; }
    #eyeBtn .eye-visible { display: none; }
    #eyeBtn .eye-hidden { display: block; }

    .pill-filled:hover { background: #1d2a26; }
    .pill-mode:hover { background: #1d2a26; }
    .pill-mode { position: relative; }
    .pill-mode .tooltip {
      display: none;
      position: absolute;
      bottom: calc(100% + 8px);
      left: 50%;
      transform: translateX(-50%);
      background: #1d2a26;
      border: 1px solid #ffffff1f;
      border-radius: 8px;
      padding: 6px 10px;
      white-space: nowrap;
      font-size: 12px;
      color: #e2e8f0;
      pointer-events: none;
      z-index: 1;
    }
    .pill-mode:hover .tooltip { display: block; }
    .pill-mode .tooltip kbd {
      display: inline-block;
      padding: 1px 5px;
      font-size: 11px;
      font-family: 'Instrument Sans', sans-serif;
      background: #101715;
      border: 1px solid #ffffff1f;
      border-radius: 4px;
      color: #71b9a1;
    }

    #projectName { display: none; }
    #logoIcon { cursor: pointer; position: relative; }
    #logoIcon .tooltip {
      display: none;
      position: absolute;
      bottom: calc(100% + 8px);
      left: 0;
      background: #1d2a26;
      border: 1px solid #ffffff1f;
      border-radius: 8px;
      padding: 6px 10px;
      white-space: nowrap;
      font-size: 12px;
      color: #e2e8f0;
      pointer-events: none;
      z-index: 1;
    }
    #logoIcon:hover .tooltip { display: block; }
    #logoIcon .tooltip kbd {
      display: inline-block;
      padding: 1px 5px;
      font-size: 11px;
      font-family: 'Instrument Sans', sans-serif;
      background: #101715;
      border: 1px solid #ffffff1f;
      border-radius: 4px;
      color: #71b9a1;
    }

    #pinDrawer {
      display: none;
      position: absolute;
      bottom: calc(100% + 12px);
      right: 12px;
      left: auto;
      width: 400px;
      max-width: 90%;
      max-height: min(280px, calc(100vh - 100px));
      overflow-y: auto;
      background: #101715;
      border: 1px solid #ffffff1f;
      border-radius: 12px;
      padding: 4px 0;
      box-shadow: 0 -4px 24px rgba(0,0,0,.4);
    }
    #pinDrawer.visible { display: block; }
    #pinDrawerHeader {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 12px 8px;
      border-bottom: 1px solid #ffffff1f;
      margin-bottom: 4px;
    }
    #pinDrawerHeader span { color: #e2e8f0; font-weight: 600; font-size: 13px; }
    #pinDrawerClose {
      background: none;
      border: none;
      color: #64748b;
      cursor: pointer;
      font-size: 16px;
      padding: 0 4px;
      line-height: 1;
    }
    #pinDrawerClose:hover { color: #e2e8f0; }
    .pdItem { display: flex; gap: 8px; padding: 5px 12px; align-items: flex-start; cursor: default; }
    .pdItem:hover { background: #1d2a26; }
    .pdIdx {
      width: 22px; height: 22px; border-radius: 50%;
      background: #71b9a1; color: #101715;
      display: flex; align-items: center; justify-content: center;
      font-size: 11px; font-weight: 700; flex-shrink: 0; margin-top: 1px;
    }
    .pdBody { flex: 1; min-width: 0; }
    .pdPage { font-size: 11px; color: #71b9a1; font-family: monospace; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; }
    .pdMeta { font-size: 12px; color: #94a3b8; margin-top: 1px; }
    .pdMeta strong { color: #64748b; font-weight: 500; }
    .pdComment { font-size: 12px; color: #e2e8f0; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    #pinDrawerEmpty { padding: 16px; text-align: center; color: #64748b; font-size: 13px; }

    #shareOverlay {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,.55);
      z-index: 2147483647;
      align-items: center;
      justify-content: center;
    }
    #shareOverlay.visible { display: flex; }
    #shareModal {
      background: #101715;
      border: 1px solid #ffffff1f;
      border-radius: 12px;
      padding: 20px;
      width: 360px;
      box-shadow: 0 8px 32px rgba(0,0,0,.5);
    }
    #shareHead { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    #shareHead span { font-weight: 600; color: #e2e8f0; font-size: 15px; }
    #shareClose { background: transparent; border: none; color: #64748b; cursor: pointer; font-size: 18px; padding: 0 4px; line-height: 1; }
    #shareClose:hover { color: #e2e8f0; }
    #shareUrlTxt {
      width: 100%; background: #1d2a26; border: 1px solid #ffffff1f;
      color: #e2e8f0; border-radius: 4px; padding: 8px;
      font-size: 13px; margin-bottom: 8px; box-sizing: border-box;
    }
    #copyBtn {
      background: #71b9a1; border: none; color: #101715;
      border-radius: 4px; padding: 6px 14px; cursor: pointer;
      font-size: 12px; font-weight: 500;
    }
    #copyBtn:hover { background: #7fc4ac; }
    #shareMeta { font-size: 11px; color: #64748b; margin-top: 8px; }

    #dashboardLink { display: none; }
    #modeDot, #modeLabel, #browseBtn, #annotateBtn, #inspIdle, #inspLive { display: none; }
  </style>

  <div class="nikkel-bar" role="toolbar" aria-label="Nikkel review toolbar">

    <div class="icon-tile" id="logoIcon" role="button" tabindex="0" aria-label="Open dashboard">
      <div class="tooltip"><h2 style="margin:0;font-size:12px;font-weight:400;font-family:inherit">Press <kbd>D</kbd> to view Dashboard.</h2></div>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="3" width="7" height="9" rx="2" stroke="url(#logoGrad)" stroke-width="1.8"/>
        <rect x="14" y="3" width="7" height="5" rx="2" stroke="url(#logoGrad)" stroke-width="1.8"/>
        <rect x="14" y="12" width="7" height="9" rx="2" stroke="url(#logoGrad)" stroke-width="1.8"/>
        <rect x="3" y="16" width="7" height="5" rx="2" stroke="url(#logoGrad)" stroke-width="1.8"/>
        <defs>
          <linearGradient id="logoGrad" x1="0" y1="0" x2="24" y2="24">
            <stop offset="0%" stop-color="#71b9a1"/>
            <stop offset="100%" stop-color="#ccdbd6"/>
          </linearGradient>
        </defs>
      </svg>
    </div>

    <span class="bar-brand" id="projectName"></span>
    <span class="bar-brand">nikkel</span>

    <div class="pill pill-mode">
      <div class="flex items-center gap-1.5" style="display:flex;align-items:center;gap:6px">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#71b9a1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 4l7 17 2-7 7-2z"/>
        </svg>
        <span id="modeBrowseLabel" style="font-size:14px">Browse</span>
      </div>

      <button class="switch off" role="switch" aria-checked="false" aria-label="Toggle mode" id="modeSwitch">
        <svg width="20" height="20" viewBox="0 0 36 36" fill="none">
          <rect x="4" y="2" width="28" height="28" rx="10" fill="white"/>
          <path d="M21.3898 24L18 20H20.6059L23 24H21.3898Z" fill="#999999"/>
          <path d="M20.1314 12C19.5743 12 19.0548 11.9268 18.5729 11.7805C18.091 11.6341 17.6318 11.4634 17.1951 11.2683C16.7734 11.0569 16.3518 10.878 15.9302 10.7317C15.5236 10.5854 15.1095 10.5122 14.6879 10.5122C14.3114 10.5122 13.9952 10.6098 13.7392 10.8049C13.4832 11 13.3176 11.3171 13.2423 11.7561H12C12.0903 11.1545 12.2485 10.6504 12.4743 10.2439C12.7153 9.8374 13.0315 9.52846 13.423 9.31707C13.8145 9.10569 14.2888 9 14.846 9C15.3881 9 15.9001 9.07317 16.3819 9.21951C16.8789 9.36585 17.3457 9.54472 17.7823 9.7561C18.2341 9.95122 18.6632 10.122 19.0698 10.2683C19.4914 10.4146 19.9055 10.4878 20.3121 10.4878C20.7036 10.4878 21.0274 10.3902 21.2834 10.1951C21.5394 10 21.6975 9.68293 21.7577 9.2439H23C22.9247 9.84553 22.7666 10.3496 22.5257 10.7561C22.2847 11.1626 21.9685 11.4715 21.577 11.6829C21.1855 11.8943 20.7036 12 20.1314 12Z" fill="#999999"/>
        </svg>
      </button>

      <div class="flex items-center gap-1.5" style="display:flex;align-items:center;gap:6px">
        <span id="modeAnnotateLabel" style="font-size:14px">Annotate</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#71b9a1" stroke-width="2.5" stroke-linecap="round">
          <path d="M12 4v16M4 12h16"/>
        </svg>
      </div>
      <div class="tooltip"><h2 style="margin:0;font-size:12px;font-weight:400;font-family:inherit">Press <kbd>~</kbd> to toggle modes.</h2></div>
    </div>

    <button class="pill pill-filled" id="eyeBtn" aria-label="Toggle nikkels visibility">
      <svg class="eye-visible" width="16" height="16" viewBox="0 0 44 44" fill="none" stroke="url(#logoGrad)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22.0002 9.16675C10.4373 9.16675 4.82733 19.5856 3.83183 21.6481C3.77862 21.7578 3.75098 21.8781 3.75098 22.0001C3.75098 22.122 3.77862 22.2424 3.83183 22.3521C4.8255 24.4146 10.4355 34.8334 22.0002 34.8334C33.5648 34.8334 39.173 24.4146 40.1685 22.3521C40.2217 22.2424 40.2493 22.122 40.2493 22.0001C40.2493 21.8781 40.2217 21.7578 40.1685 21.6481C39.1748 19.5856 33.5648 9.16675 22.0002 9.16675Z"/>
        <path d="M22 27.5C25.0376 27.5 27.5 25.0376 27.5 22C27.5 18.9624 25.0376 16.5 22 16.5C18.9624 16.5 16.5 18.9624 16.5 22C16.5 25.0376 18.9624 27.5 22 27.5Z"/>
      </svg>
      <svg class="eye-hidden" width="16" height="16" viewBox="0 0 44 44" fill="none" stroke="url(#logoGrad)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12.8334 11.6637C15.606 10.0154 18.7746 9.15228 22.0001 9.16667C33.5629 9.16667 39.1729 19.5855 40.1684 21.648C40.2784 21.8735 40.2784 22.1265 40.1684 22.3538C39.5231 23.6885 36.9491 28.5175 32.0834 31.7607M25.6667 34.4667C24.4599 34.7117 23.2315 34.8346 22.0001 34.8333C10.4372 34.8333 4.82724 24.4145 3.83174 22.352C3.77796 22.2418 3.75 22.1208 3.75 21.9982C3.75 21.8755 3.77796 21.7545 3.83174 21.6443C4.23324 20.8157 5.37174 18.6523 7.33341 16.3552M18.3334 17.9007C19.3812 16.964 20.7479 16.464 22.1528 16.5033C23.5577 16.5426 24.8942 17.1183 25.888 18.1121C26.8818 19.1059 27.4574 20.4424 27.4967 21.8473C27.5361 23.2522 27.0361 24.6188 26.0994 25.6667M5.50008 5.5L38.5001 38.5"/>
      </svg>
      <span id="eyeBtnText" style="color:#ffffffcc;font-size:14px">Hide nikkels</span>
    </button>

    <div class="spacer"></div>

    <div class="pill pill-nikkels" id="pinsBtn" role="button" tabindex="0" aria-label="Nikkels list">
      <button class="chevron-btn" aria-label="Expand nikkels list">
        <svg width="14" height="14" viewBox="0 0 10 5" fill="none" stroke="#71b9a1" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10 5L5 0L0 5"/>
        </svg>
      </button>
      <span style="color:#fff;font-size:14px">nikkels</span>
      <span class="badge" id="pinsBadge">0</span>
    </div>

    <button class="btn-share" id="shareBtn">
      <svg width="14" height="14" viewBox="0 0 16 14" fill="none" stroke="#101715" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M16 7L9.6 0v3.5C6.4 3.5 0 5.6 0 14c0-1.17 1.92-3.5 9.6-3.5V14L16 7Z"/>
      </svg>
      <span id="shareBtnText">Share</span>
    </button>
  </div>

  <span id="modeDot"></span>
  <span id="modeLabel">Browse</span>
  <button id="browseBtn" style="display:none"></button>
  <button id="annotateBtn" style="display:none"></button>
  <div id="inspIdle" style="display:none"></div>
  <div id="inspLive" style="display:none">
    <span><span class="il">Tag:</span> <span class="iv" id="iTag">—</span></span>
    <span><span class="il">Text:</span> <span class="iv" id="iText">—</span></span>
    <span><span class="il">Sel:</span> <span class="iv" id="iSel">—</span></span>
    <span><span class="il">XY:</span> <span class="iv" id="iXY">—</span></span>
  </div>
  <a id="dashboardLink" href="#" target="_blank" style="display:none">Dashboard</a>

  <div id="pinDrawer">
    <div id="pinDrawerHeader">
      <span>All Pins</span>
      <button id="pinDrawerClose">✕</button>
    </div>
    <div id="pinDrawerList"></div>
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
let currentDashboardUrl = '';
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

function injectBar(projectName, sessionId, shareUrl, initialMode, reviewId, isReadOnly, dashboardUrl) {
  if (barHost) {
    console.log('[Nikkel] injectBar: barHost already exists, skipping');
    return;
  }
  console.log('[Nikkel] injectBar: injecting bar', { projectName, sessionId, shareUrl, initialMode, reviewId, isReadOnly, dashboardUrl });
  currentSessionId = sessionId || null;
  currentReviewId = reviewId || null;
  currentDashboardUrl = dashboardUrl || '';
  readOnly = isReadOnly || false;
  barHost = createShadowHost('nikkel-bar-host');
  const shadow = barHost.attachShadow({ mode: 'open' });
  shadow.innerHTML = BAR_HTML;

  const projectNameEl = qs(shadow, 'projectName');
  const inspIdle = qs(shadow, 'inspIdle');
  const inspLive = qs(shadow, 'inspLive');
  const pinsBtn = qs(shadow, 'pinsBtn');
  const pinsBadge = qs(shadow, 'pinsBadge');
  const eyeBtn = qs(shadow, 'eyeBtn');
  const eyeBtnText = qs(shadow, 'eyeBtnText');
  const modeSwitch = qs(shadow, 'modeSwitch');
  const pinDrawer = qs(shadow, 'pinDrawer');
  const pinDrawerClose = qs(shadow, 'pinDrawerClose');
  const logoIcon = qs(shadow, 'logoIcon');
  const dashboardLink = qs(shadow, 'dashboardLink');
  const shareBtn = qs(shadow, 'shareBtn');
  const shareBtnText = qs(shadow, 'shareBtnText');
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
  document.body.style.paddingBottom = '96px';

  setMode(initialMode || 'browse');

  if (projectNameEl) projectNameEl.textContent = projectName || '';
  if (dashboardLink && dashboardUrl) { dashboardLink.href = dashboardUrl; }
  if (dashboardLink) {
    dashboardLink.addEventListener('click', (e) => {
      chrome.runtime.sendMessage({ type: 'GET_STATE' }, (res) => {
        if (res?.dashboardUrl) dashboardLink.href = res.dashboardUrl;
      });
    });
  }
  if (logoIcon) {
    logoIcon.addEventListener('click', () => {
      chrome.runtime.sendMessage({ type: 'GET_STATE' }, (res) => {
        window.open(res?.dashboardUrl || dashboardUrl, '_blank');
      });
    });
  }
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
  if (modeSwitch) {
    modeSwitch.addEventListener('click', () => {
      const newMode = currentMode === 'annotate' ? 'browse' : 'annotate';
      switchMode(newMode);
    });
  }

  if (eyeBtn) {
    eyeBtn.addEventListener('click', () => {
      isPinsVisible = !isPinsVisible;
      if (pinsContainer) {
        pinsContainer.style.display = isPinsVisible ? '' : 'none';
      }
      eyeBtn.classList.toggle('hidden', !isPinsVisible);
      if (eyeBtnText) eyeBtnText.textContent = isPinsVisible ? 'Hide nikkels' : 'Show nikkels';
    });
  }

  function openPinDrawer() {
    if (!pinDrawer) return;
    chrome.runtime.sendMessage({ type: 'GET_NIKKELS', payload: { allPages: true } }, (res) => {
      if (chrome.runtime.lastError) return;
      const list = qs(pinDrawer, 'pinDrawerList');
      if (!list) return;
      if (res?.ok && res.nikkels?.length) {
        list.innerHTML = res.nikkels.map(n => {
          let pageLabel = '';
          try { const u = new URL(n.pageUrl); pageLabel = u.hostname + u.pathname; } catch { pageLabel = n.pageUrl || ''; }
          const text = n.elementText ? `"${n.elementText.slice(0, 60)}"` : '';
          const comment = n.comment ? n.comment.slice(0, 80) : '';
          const x = n.pageX ?? n.x ?? 0;
          const y = n.pageY ?? n.y ?? 0;
          return `<div class="pdItem" data-x="${x}" data-y="${y}">
            <span class="pdIdx">${n.idx || '?'}</span>
            <div class="pdBody">
              <span class="pdPage">${pageLabel}</span>
              <div class="pdMeta">${n.tag ? `<strong>&lt;${n.tag}&gt;</strong> ` : ''}${text}</div>
              ${comment ? `<div class="pdComment">${comment}</div>` : ''}
            </div>
          </div>`;
        }).join('');
        list.querySelectorAll('.pdItem').forEach(el => {
          el.addEventListener('click', () => {
            const x = parseInt(el.dataset.x);
            const y = parseInt(el.dataset.y);
            window.scrollTo({ left: Math.max(0, x - 200), top: Math.max(0, y - 200), behavior: 'smooth' });
            pinDrawer.classList.remove('visible');
          });
        });
      } else {
        list.innerHTML = '<div id="pinDrawerEmpty">No pins yet</div>';
      }
      pinDrawer.classList.add('visible');
    });
  }

  if (pinsBtn) {
    pinsBtn.addEventListener('click', () => {
      if (pinDrawer?.classList.contains('visible')) {
        pinDrawer.classList.remove('visible');
      } else {
        openPinDrawer();
      }
    });
  }

  if (pinDrawerClose) {
    pinDrawerClose.addEventListener('click', () => {
      if (pinDrawer) pinDrawer.classList.remove('visible');
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && pinDrawer?.classList.contains('visible')) {
      pinDrawer.classList.remove('visible');
    }
  });

  if (shareBtn) {
    shareBtn.addEventListener('click', async () => {
      if (readOnly) {
        shareBtn.disabled = true;
        if (shareBtnText) shareBtnText.textContent = 'Signing in…';
        const authRes = await chrome.runtime.sendMessage({ type: 'SIGN_IN_GOOGLE' }).catch(() => null);
        if (authRes?.ok) {
          const claimRes = await chrome.runtime.sendMessage({ type: 'CLAIM_PROJECT' }).catch(() => null);
          if (claimRes?.ok) {
            readOnly = false;
            if (shareBtnText) shareBtnText.textContent = 'Share';
            shareBtn.disabled = false;
            shareBtn.style.opacity = '';
            shareBtn.style.cursor = '';
            return;
          }
          if (shareBtnText) shareBtnText.textContent = claimRes?.error || 'Failed to claim project';
        } else {
          if (shareBtnText) shareBtnText.textContent = authRes?.error || 'Sign in failed';
        }
        shareBtn.disabled = false;
        setTimeout(() => { if (shareBtnText) shareBtnText.textContent = 'Login'; }, 3000);
        return;
      }

      if (pins.length === 0) {
        if (shareBtnText) shareBtnText.textContent = 'No pins yet';
        shareBtn.style.opacity = '0.6';
        setTimeout(() => {
          if (shareBtnText) shareBtnText.textContent = 'Share';
          shareBtn.style.opacity = '1';
        }, 2000);
        return;
      }
      if (!shareOverlay) return;
      shareOverlay.classList.add('visible');
      if (shareAuthSection) shareAuthSection.style.display = 'none';
      if (shareUrlSection) shareUrlSection.style.display = 'none';
      if (shareMeta) shareMeta.textContent = '';

      let shareRes;
      try { shareRes = await chrome.runtime.sendMessage({ type: 'SHARE' }); } catch { shareRes = null; }

      if (shareRes?.ok && shareRes.shareUrl) {
        if (shareUrlSection) shareUrlSection.style.display = '';
        if (shareUrlTxt) shareUrlTxt.value = shareRes.shareUrl;
        if (shareMeta) shareMeta.textContent = 'Review saved and shareable!';
        if (copyBtn) { try { navigator.clipboard.writeText(shareRes.shareUrl); } catch {} copyBtn.textContent = 'Copied!'; setTimeout(() => { copyBtn.textContent = 'Copy link'; }, 1500); }
        return;
      }

      if (shareRes?.ok && shareRes.needsAuth) {
        if (shareAuthSection) shareAuthSection.style.display = '';
        return;
      }

      if (shareMeta) shareMeta.textContent = shareRes?.error || 'Cannot share right now.';
      if (shareAuthSection) shareAuthSection.style.display = '';
    });
    if (readOnly && shareBtnText) {
      shareBtnText.textContent = 'Login';
    }
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
      if (shareMeta) shareMeta.textContent = '';

      let authRes;
      try { authRes = await chrome.runtime.sendMessage({ type: 'SIGN_IN_GOOGLE' }); } catch { authRes = null; }

      if (authRes?.ok && authRes.shareUrl) {
        if (shareUrlSection) shareUrlSection.style.display = '';
        if (shareAuthSection) shareAuthSection.style.display = 'none';
        if (shareUrlTxt) shareUrlTxt.value = authRes.shareUrl;
        if (shareMeta) shareMeta.textContent = 'Review saved and shareable!';
        if (copyBtn) { try { navigator.clipboard.writeText(authRes.shareUrl); } catch {} copyBtn.textContent = 'Copied!'; setTimeout(() => { copyBtn.textContent = 'Copy link'; }, 1500); }
        return;
      }

      shareGoogleBtn.disabled = false;
      shareGoogleBtn.textContent = 'Continue with Google';
      if (shareMeta) shareMeta.textContent = authRes?.ok ? 'Signed in. Tap Share to generate a link.' : (authRes?.error || 'Google sign-in failed.');
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

  let x = pageX - window.scrollX;
  let y = pageY - window.scrollY;
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

  if (readOnly) {
    input.disabled = true;
    input.placeholder = 'Login to add comments';
    submit.disabled = true;
    submit.style.cursor = 'default';
  }

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

function pinColor(userId) {
  if (!userId || userId === 'local') return '#06b6d4';
  const colors = ['#6366f1','#ec4899','#f59e0b','#10b981','#8b5cf6','#ef4444','#14b8a6','#f97316','#3b82f6','#84cc16','#a855f7','#e11d48'];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) { hash = ((hash << 5) - hash) + userId.charCodeAt(i); hash |= 0; }
  return colors[Math.abs(hash) % colors.length];
}

function addPin(nikkel) {
  if (!pinsContainer) return;
  pinCounter++;
  const idx = nikkel.idx ?? pinCounter;
  const pin = document.createElement('div');
  pin.dataset.idx = idx;
  pin.dataset.sessionId = nikkel.sessionId || '';
  pin.textContent = idx;
  const px = (nikkel.pageX ?? nikkel.x ?? 0) - 13;
  const py = (nikkel.pageY ?? nikkel.y ?? 0) - 13;
  const pc = pinColor(nikkel.userId);
  pin.style.cssText = `
    position: absolute;
    left: ${px}px;
    top: ${py}px;
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background: ${pc};
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
    injectPopover((nikkel.pageX ?? nikkel.x ?? 0) + 13, (nikkel.pageY ?? nikkel.y ?? 0) + 13, nikkel);
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
  };

  console.log('[Nikkel] submitting nikkel', nikkel);
  bgMsg({ type: 'SUBMIT_NIKKEL', payload: { nikkel } }, (res) => {
    if (!res?.ok) console.error('[Nikkel] Submit failed:', res.error);
  });
}

function handleKeydown(e) {
  if (e.key === '`' || e.key === 'Backquote' || e.key === '´') {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
    if (currentMode !== 'annotate' && currentMode !== 'browse') return;
    const newMode = currentMode === 'annotate' ? 'browse' : 'annotate';
    setMode(newMode);
    try { chrome.runtime.sendMessage({ type: 'MODE_CHANGED', payload: { mode: newMode } }); } catch {}
    return;
  }
  if (e.key === 'd' || e.key === 'D') {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
    chrome.runtime.sendMessage({ type: 'GET_STATE' }, (res) => {
      window.open(res?.dashboardUrl || currentDashboardUrl, '_blank');
    });
    return;
  }
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
    const modeSwitch = qs(shadow, 'modeSwitch');
    const browseLabel = qs(shadow, 'modeBrowseLabel');
    const annotateLabel = qs(shadow, 'modeAnnotateLabel');
    const inspIdle = qs(shadow, 'inspIdle');
    const inspLive = qs(shadow, 'inspLive');
    if (modeSwitch) {
      modeSwitch.classList.toggle('on', mode === 'annotate');
      modeSwitch.classList.toggle('off', mode !== 'annotate');
      modeSwitch.setAttribute('aria-checked', mode === 'annotate');
    }
    if (browseLabel) {
      const active = mode === 'browse';
      browseLabel.style.color = active ? '#FFFFFF' : '#CFD1D0';
      browseLabel.style.fontWeight = active ? '600' : '400';
    }
    if (annotateLabel) {
      const active = mode === 'annotate';
      annotateLabel.style.color = active ? '#FFFFFF' : '#CFD1D0';
      annotateLabel.style.fontWeight = active ? '600' : '400';
    }
    if (inspIdle) inspIdle.style.display = 'none';
    if (inspLive) inspLive.style.display = 'none';
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
        injectBar(msg.payload.projectName, msg.payload.sessionId, msg.payload.shareUrl, msg.payload.mode || 'annotate', msg.payload.reviewId, msg.payload.readOnly, msg.payload.dashboardUrl);
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
        injectBar(msg.payload.projectName, msg.payload.sessionId, msg.payload.shareUrl, msg.payload.viewOnly ? 'browse' : 'annotate', msg.payload.reviewId, msg.payload.viewOnly, msg.payload.dashboardUrl);
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

function resumeActiveReview(retries = 5) {
  if (!isValid()) return;
  try {
    chrome.runtime.sendMessage({ type: 'GET_STATE' }, (res) => {
      if (chrome.runtime.lastError) return;
      if (res?.ok && res.project) {
        if (!barHost) injectBar(res.project.title, res.project.id, null, res.mode || 'annotate', res.review?.id, res.readOnly, res.dashboardUrl);
        onPageReady(loadPinsForReview);
      } else if (retries > 0) {
        setTimeout(() => resumeActiveReview(retries - 1), 600);
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
        { type: 'LOAD_REVIEW', payload: { reviewToken: event.data.reviewToken, pageUrl: event.data.pageUrl } },
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
chrome.runtime.sendMessage({ type: 'GET_TOKEN' }, (res) => {
  const token = res?.token || '';
  if (token) document.documentElement.dataset.nikkelToken = token;
  window.postMessage({ type: 'NIKKEL_EXTENSION_READY', source: 'nikkel-extension', token }, '*');
});
})();
