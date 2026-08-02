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

  if (state.globalDisabled) {
    showView('vDisabled');
    $('userRow').classList.remove('show');
    return;
  }

  if (tabId) {
    try {
      const ctx = await chrome.tabs.sendMessage(tabId, { type: 'GET_PAGE_CONTEXT' });
      if (ctx?.ok) {
        state.url = ctx.url;
        state.title = ctx.title;
      }
    } catch {}
  }
  if (!state.title && tab?.title) state.title = tab.title;

  console.log('[Popup] GET_STATE', state);

  updateUserRow(state);

  if (state.project) {
    if (tabId) {
      await bg({ type: 'ACTIVATE_TAB', payload: { tabId } });
    }
    showActiveView(state);
  } else if (state.user && state.userEmail) {
    showReady(state);
  } else {
    showSignIn();
  }
}

$('powerBtn').addEventListener('click', async () => {
  const tab = await getActiveTab();
  await bg({ type: 'TOGGLE_DISABLED', payload: { disabled: false, tabId: tab?.id } });
  init();
});

$('vauthPowerOff').addEventListener('click', async () => {
  const tab = await getActiveTab();
  await bg({ type: 'TOGGLE_DISABLED', payload: { disabled: true, tabId: tab?.id } });
  init();
});

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

function showSignIn() {
  showView('vAuth');
  $('userRow').classList.remove('show');
}

$('signinGoogleBtn').addEventListener('click', async () => {
  $('signinGoogleBtn').style.pointerEvents = 'none';
  $('signinGoogleBtn').style.opacity = '.7';
  const tab = await getActiveTab();
  const res = await bg({ type: 'SIGN_IN_GOOGLE', payload: { tabId: tab?.id } });
  $('signinGoogleBtn').style.pointerEvents = '';
  $('signinGoogleBtn').style.opacity = '';
  if (res.ok) { init(); }
  else { showError(res.error || 'Sign-in failed.'); }
});

function showReady(state) {
  showView('vReady');
  $('userRow').classList.remove('show');
  const avatar = $('vauthAvatar');
  if (state.userAvatarUrl) { avatar.style.backgroundImage = `url(${state.userAvatarUrl})`; avatar.textContent = ''; }
  else { avatar.style.backgroundImage = ''; const parts = (state.userName || '').split(' '); avatar.textContent = (parts[0]?.[0] || '') + (parts[1]?.[0] || ''); }
  $('vauthName').textContent = state.userName || 'User';
  $('vauthEmail').textContent = state.userEmail || '';
  $('vauthWebsite').textContent = state.title || '';
  try { $('vauthFavicon').src = `https://www.google.com/s2/favicons?domain=${new URL(state.url).hostname}&sz=16`; } catch { $('vauthFavicon').style.display = 'none'; }

  $('vauthStartBtn').onclick = async () => {
    $('vauthStartBtn').disabled = true;
    $('vauthStartBtn').textContent = 'Starting…';
    const tab = await getActiveTab();
    if (!tab) { showError('No active tab found.'); $('vauthStartBtn').disabled = false; $('vauthStartBtn').textContent = 'Start Review'; return; }
    const res = await bg({ type: 'START_REVIEW', payload: { tabId: tab.id, title: tab.title, url: tab.url } });
    if (res.ok) { window.close(); }
    else { showError(res.error || 'Failed to start review.'); $('vauthStartBtn').disabled = false; $('vauthStartBtn').textContent = 'Start Review'; }
  };

  $('vauthDashboardBtn').onclick = async () => {
    const tab = await getActiveTab();
    const s = await bg({ type: 'GET_STATE', payload: { tabId: tab?.id } });
    const url = s?.dashboardUrl || `https://nikkel-alpha.vercel.app/dashboard`;
    chrome.tabs.create({ url });
  };

  $('vauthSignOut').onclick = async () => {
    await bg({ type: 'SIGN_OUT' });
    init();
  };
}

function showActiveView(state) {
  showView('vReview');
  $('userRow').classList.remove('show');
  const avatar = $('reviewAvatar');
  if (state.userAvatarUrl) { avatar.style.backgroundImage = `url(${state.userAvatarUrl})`; avatar.textContent = ''; }
  else { avatar.style.backgroundImage = ''; const parts = (state.userName || '').split(' '); avatar.textContent = (parts[0]?.[0] || '') + (parts[1]?.[0] || ''); }
  $('reviewName').textContent = state.userName || 'User';
  $('reviewEmail').textContent = state.userEmail || '';
  $('reviewWebsite').textContent = state.title || '';
  try { $('reviewFavicon').src = `https://www.google.com/s2/favicons?domain=${new URL(state.url).hostname}&sz=16`; } catch { $('reviewFavicon').style.display = 'none'; }
  $('reviewBadge').textContent = state.nikkelCount || 0;
  $('reviewShareSection').innerHTML = '';
  $('reviewCard').style.display = '';

  $('reviewSignOut').onclick = async () => {
    await bg({ type: 'SIGN_OUT' });
    init();
  };

  $('reviewDashboardBtn').onclick = async () => {
    const tab = await getActiveTab();
    const s = await bg({ type: 'GET_STATE', payload: { tabId: tab?.id } });
    const url = s?.dashboardUrl || `https://nikkel-alpha.vercel.app/dashboard`;
    chrome.tabs.create({ url });
  };

  $('reviewShareBtn').onclick = async () => {
    $('reviewShareBtn').disabled = true;
    $('reviewShareBtn').textContent = 'Generating…';
    const tab = await getActiveTab();
    const res = await bg({ type: 'SHARE', payload: { tabId: tab?.id } });
    if (res.ok && res.shareUrl) {
      try { await navigator.clipboard.writeText(res.shareUrl); } catch {}
      $('reviewShareBtn').textContent = 'Link copied';
      $('reviewShareBtn').disabled = false;
      setTimeout(() => { $('reviewShareBtn').textContent = 'Share link'; }, 2000);
    } else {
      $('reviewShareBtn').disabled = false;
      $('reviewShareBtn').textContent = 'Share link';
      showError(res.error || 'Failed to generate link.');
    }
  };
}

function showReviewShareUrl(url) {
  const section = $('reviewShareSection');
  section.innerHTML = `
    <div class="share-box">
      <input value="${url}" readonly id="reviewShareUrlInput" />
      <button class="btn btn-sm" id="reviewCopyShareBtn">Copy share link</button>
    </div>`;
  const inp = section.querySelector('#reviewShareUrlInput');
  if (inp) inp.addEventListener('click', () => inp.select());
  const cb = section.querySelector('#reviewCopyShareBtn');
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

$('stopReviewBtn').addEventListener('click', async () => {
  clearError();
  const tab = await getActiveTab();
  await bg({ type: 'STOP_REVIEW', payload: { tabId: tab?.id } });
  const s = await bg({ type: 'GET_STATE', payload: { tabId: tab?.id } });
  updateUserRow(s);
  showReady(s);
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
