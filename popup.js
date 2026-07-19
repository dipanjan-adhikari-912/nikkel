const $ = (id) => document.getElementById(id);

function showView(id) {
  document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
  $(id).classList.add('active');
}

async function bg(msg) {
  try { return await chrome.runtime.sendMessage(msg); } catch { return { ok: false, error: 'Extension context lost.' }; }
}

function showError(msg) {
  console.error('[Popup]', msg);
  const el = $('globalError');
  if (el) {
    el.textContent = msg;
    el.style.display = 'block';
  }
}

function clearError() {
  const el = $('globalError');
  if (el) el.style.display = 'none';
}

async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (tabs[0]) return tabs[0];
  const fallback = await chrome.tabs.query({ active: true });
  return fallback[0] || null;
}

async function init() {
  const tab = await getActiveTab();
  const tabId = tab?.id;
  let state = await bg({ type: 'GET_STATE', payload: { tabId } });

  if (tabId) {
    try {
      const ctx = await chrome.tabs.sendMessage(tabId, { type: 'GET_PAGE_CONTEXT' });
      if (ctx?.ok) {
        state.url = ctx.url;
        state.title = ctx.title;
      }
    } catch {}
  }

  console.log('[Popup] GET_STATE', state);

  $('toggleBtn').className = state.globalDisabled ? 'off' : '';
  $('toggleBtn').textContent = state.globalDisabled ? '⏻' : '⏻';

  if (state.globalDisabled) {
    showView('vDisabled');
    $('userRow').classList.remove('show');
    return;
  }

  updateUserRow(state);

  if (state.project) {
    if (tabId) {
      await bg({ type: 'ACTIVATE_TAB', payload: { tabId } });
    }
    showActiveView(state);
  } else {
    showWelcomeView(state);
  }
}

$('toggleBtn').addEventListener('click', async () => {
  const tab = await getActiveTab();
  const tabId = tab?.id;
  const state = await bg({ type: 'GET_STATE', payload: { tabId } });
  const res = await bg({ type: 'TOGGLE_DISABLED', payload: { disabled: !state.globalDisabled, tabId } });
  if (res.ok) init();
});

$('enableBtn').addEventListener('click', async () => {
  const tab = await getActiveTab();
  await bg({ type: 'TOGGLE_DISABLED', payload: { disabled: false, tabId: tab?.id } });
  init();
});

function showWelcomeView(state) {
  showView('vWelcome');
  $('resetLink').style.display = state.user ? 'block' : 'none';
}

function showShareUrl(url) {
  const shareSection = $('shareSection');
  shareSection.innerHTML = `
    <div class="share-box">
      <input value="${url}" readonly id="shareUrlInput" />
      <button class="btn btn-sm" id="copyShareBtn">Copy share link</button>
    </div>`;
  const inp = shareSection.querySelector('#shareUrlInput');
  if (inp) inp.addEventListener('click', () => inp.select());
  const cb = shareSection.querySelector('#copyShareBtn');
  if (cb) {
    cb.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(url);
        cb.textContent = 'Copied!';
        setTimeout(() => { cb.textContent = 'Copy share link'; }, 1500);
      } catch {}
    });
  }
}

function updateUserRow(state) {
  const row = $('userRow');
  if (!state || !state.user) {
    row.classList.remove('show');
    return;
  }
  row.classList.add('show');
  $('userActions').style.display = 'flex';
  $('userName').textContent = state.userName || 'User';
  $('userEmail').textContent = state.userEmail || '';
  $('userAvatar').textContent = state.userName ? state.userName[0].toUpperCase() : 'U';
}

function showAuthForm() {
  showView('vAuth');
  $('userRow').classList.remove('show');
  $('authForm').innerHTML = `
    <div class="auth-title">Sign in</div>
    <div id="authError" style="display:none;background:#7f1d1d;color:#fecaca;padding:6px 12px;font-size:12px;border-radius:4px;margin-bottom:10px"></div>
    <button class="btn btn-google" id="authGoogleBtn">
      <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.54 28.59A14.5 14.5 0 0 1 9.5 24c0-1.59.28-3.14.76-4.59l-7.98-6.19A23.99 23.99 0 0 0 0 24c0 3.77.87 7.35 2.56 10.56l7.98-5.97z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 5.97C6.51 42.62 14.62 48 24 48z"/></svg>
      Sign in with Google
    </button>
    <div class="sep"></div>
    <span class="link" id="authBack">Back</span>
  `;
    $('authGoogleBtn').addEventListener('click', async () => {
      $('authGoogleBtn').disabled = true; $('authGoogleBtn').textContent = 'Connecting…';
      const tab = await getActiveTab();
      const res = await bg({ type: 'SIGN_IN_GOOGLE', payload: { tabId: tab?.id } });
      if (res.ok) { init(); }
      else { showError(res.error || 'Google sign-in failed.'); $('authGoogleBtn').disabled = false; $('authGoogleBtn').innerHTML = '<svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.54 28.59A14.5 14.5 0 0 1 9.5 24c0-1.59.28-3.14.76-4.59l-7.98-6.19A23.99 23.99 0 0 0 0 24c0 3.77.87 7.35 2.56 10.56l7.98-5.97z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 5.97C6.51 42.62 14.62 48 24 48z"/></svg> Sign in with Google'; }
    });
  $('authBack').addEventListener('click', () => init());
}

function showActiveView(state) {
  console.log('[Popup] showActiveView', { project: state.project?.id, user: state.user?.id, url: state.url, title: state.title });
  showView('vActive');
  const p = state.project;
  $('activeProjectName').textContent = state.title || p.title || 'Untitled Review';
  $('activeProjectUrl').textContent = state.url || p.base_url || '';

  const shareSection = $('shareSection');
  if (state.user) {
    shareSection.innerHTML = `
      <div class="share-box">
        <button class="btn btn-sm" id="generateShareBtn">Generate share link</button>
      </div>`;
    const gen = shareSection.querySelector('#generateShareBtn');
    if (gen) {
      gen.addEventListener('click', async () => {
        gen.disabled = true;
        gen.textContent = 'Generating…';
        const tab = await getActiveTab();
        const res = await bg({ type: 'SHARE', payload: { tabId: tab?.id } });
        if (res.ok && res.shareUrl) {
          showShareUrl(res.shareUrl);
        } else {
          gen.disabled = false;
          gen.textContent = 'Generate share link';
          showError(res.error || 'Failed to generate link.');
        }
      });
    }
  } else {
    shareSection.innerHTML = `
      <div class="share-box">
        <div class="share-msg">Sign in with Google to share this review with your name attached.</div>
      </div>`;
  }
}

$('startReviewBtn').addEventListener('click', async () => {
  clearError();
  const tab = await getActiveTab();
  if (!tab) { showError('No active tab found.'); return; }
  const state = await bg({ type: 'GET_STATE', payload: { tabId: tab?.id } });
  if (!state.user || !state.userEmail) { showAuthForm(); return; }
  const res = await bg({ type: 'START_REVIEW', payload: { tabId: tab.id, title: tab.title, url: tab.url } });
  if (res.ok) {
    window.close();
  } else {
    showError(res.error || 'Failed to start review.');
  }
});

$('stopReviewBtn').addEventListener('click', async () => {
  clearError();
  const tab = await getActiveTab();
  await bg({ type: 'STOP_REVIEW', payload: { tabId: tab?.id } });
  const s = await bg({ type: 'GET_STATE', payload: { tabId: tab?.id } });
  updateUserRow(s);
  showWelcomeView(s);
});

$('shareBtn').addEventListener('click', async () => {
  clearError();
  const tab = await getActiveTab();
  const tabId = tab?.id;

  const res = await bg({ type: 'SHARE', payload: { tabId } });
  if (res.ok && res.shareUrl) {
    showShareUrl(res.shareUrl);
  } else {
    showError(res.error || 'Failed to generate share link.');
  }
});

$('resetLink').addEventListener('click', async () => {
  await bg({ type: 'SIGN_OUT' });
  updateUserRow({ user: null });
  showWelcomeView({});
});

$('signOutLink').addEventListener('click', async () => {
  await bg({ type: 'SIGN_OUT' });
  updateUserRow({ user: null });
  init();
});

$('dashboardLink').addEventListener('click', async () => {
  const tab = await getActiveTab();
  const state = await bg({ type: 'GET_STATE', payload: { tabId: tab?.id } });
  const url = state?.dashboardUrl || `https://nikkel-alpha.vercel.app/dashboard`;
  chrome.tabs.create({ url });
});

$('settingsLink').addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('settings.html') });
});

init();
