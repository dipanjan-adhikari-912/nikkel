import * as api from './api.js';

// Global auth state (shared across all tabs)
const globalState = {
  user: null,
  token: null,
  refreshToken: null,
  isAnonymous: false,
  globalDisabled: false,
};

// Per-tab state (keyed by tabId)
const tabState = new Map();

function getTabState(tabId) {
  if (!tabState.has(tabId)) {
    tabState.set(tabId, { mode: 'idle', project: null, review: null, nikkels: [], url: '', title: '', readOnly: false });
  }
  return tabState.get(tabId);
}

let pendingShare = null; // { tabId }

async function saveState() {
  const tabObj = {};
  for (const [tabId, ts] of tabState) {
    if (ts.project) tabObj[String(tabId)] = { mode: ts.mode, project: ts.project, review: ts.review, nikkels: ts.nikkels, readOnly: ts.readOnly };
  }
  await chrome.storage.local.set({
    nikkelState: globalState,
    nikkelTabState: tabObj,
    pendingShare,
  });
}

async function loadState() {
  const r = await chrome.storage.local.get(['nikkelState', 'nikkelTabState', 'pendingShare']);
  if (r.nikkelState) Object.assign(globalState, r.nikkelState);
  if (r.nikkelTabState) {
    for (const [tabId, ts] of Object.entries(r.nikkelTabState)) {
      tabState.set(Number(tabId), ts);
    }
  }
  if (r.pendingShare) pendingShare = r.pendingShare;
  if (globalState.token && !globalState.refreshToken) {
    globalState.user = null;
    globalState.token = null;
    globalState.isAnonymous = false;
    await saveState();
  }
  api.setTokens(globalState.token, globalState.refreshToken);
}

async function sendToTab(tabId, msg, retries = 5) {
  for (let i = 0; i < retries; i++) {
    try {
      return await chrome.tabs.sendMessage(tabId, msg);
    } catch {
      if (i === 0) {
        try { await chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] }); } catch {}
      }
      if (i < retries - 1) await new Promise(r => setTimeout(r, 200));
    }
  }
  return null;
}

async function ensureProjectReview(projectId, userId, token, tabStateEntry) {
  // Query Supabase for existing reviews for this project
  try {
    const existing = await api.getProjectReviews(projectId, token);
    if (existing && existing.length > 0) {
      const review = existing[0];
      if (tabStateEntry) tabStateEntry.review = review;
      console.log('[BG] Reusing existing review', review.id);
      return review;
    }
  } catch (e) {
    console.warn('[BG] Error checking for existing reviews', e.message);
  }

  // No existing review — create one
  try {
    const review = await api.createReview(projectId, userId, token);
    if (!review) {
      console.error('[BG] createReview returned empty');
      return null;
    }
    console.log('[BG] Created new review', review.id);
    if (tabStateEntry) tabStateEntry.review = review;
    await saveState();
    return review;
  } catch (e) {
    console.error('[BG] Failed to create review', e.message);
    return null;
  }
}

let ready = loadState();

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  await ready;
  if (globalState.globalDisabled) return;
  const ts = getTabState(activeInfo.tabId);
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    ts.url = tab.url || ts.url;
  } catch {}
  if (ts.project) {
    await sendToTab(activeInfo.tabId, {
      type: 'ACTIVATE',
      payload: { projectName: ts.project.title, sessionId: ts.project.id, reviewId: ts.review?.id, shareUrl: '', mode: ts.mode, readOnly: ts.readOnly },
    });
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.url) {
    const ts = getTabState(tabId);
    ts.url = changeInfo.url;
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  tabState.delete(tabId);
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  const handle = async () => {
    await ready;
    api.setTokens(globalState.token, globalState.refreshToken);
    console.log('[BG] message', msg.type, msg.payload);

    const tabId = msg.payload?.tabId || sender.tab?.id;
    const ts = tabId ? getTabState(tabId) : null;

    switch (msg.type) {
      case 'GET_STATE':
        return { ok: true, user: globalState.user, mode: ts?.mode || 'idle', project: ts?.project || null, review: ts?.review || null, isAnonymous: globalState.isAnonymous, globalDisabled: globalState.globalDisabled, url: ts?.url || '', title: ts?.title || '', readOnly: ts?.readOnly || false };

      case 'INIT_ANONYMOUS': {
        if (globalState.token && globalState.user) return { ok: true, user: globalState.user, isAnonymous: globalState.isAnonymous };
        const result = await api.signInAnonymously();
        globalState.user = result.user;
        globalState.token = result.token;
        globalState.refreshToken = result.refreshToken;
        globalState.isAnonymous = true;
        await saveState();
        return { ok: true, user: result.user, isAnonymous: true };
      }

      case 'START_REVIEW': {
        if (globalState.globalDisabled) return { ok: false, error: 'Nikkel is disabled' };
        const { tabId: tId, title, url } = msg.payload;
        if (!globalState.token) {
          const anon = await api.signInAnonymously();
          globalState.user = anon.user;
          globalState.token = anon.token;
          globalState.refreshToken = anon.refreshToken;
          globalState.isAnonymous = true;
          await saveState();
          api.setTokens(globalState.token, globalState.refreshToken);
        }
        const project = await api.createProject(title || 'Untitled Review', url || '', globalState.user?.id, globalState.token);
        const review = await api.createReview(project.id, globalState.user?.id, globalState.token);
        const tab = getTabState(tId);
        tab.project = project;
        tab.review = review;
        tab.mode = 'annotate';
        tab.nikkels = [];
        tab.url = url || tab.url;
        await saveState();
        if (tId) {
          await sendToTab(tId, {
            type: 'ACTIVATE',
            payload: { projectName: project.title, sessionId: project.id, reviewId: review.id, shareUrl: '' },
          });
        }
        return { ok: true, project, review };
      }

      case 'STOP_REVIEW': {
        const tId = msg.payload?.tabId || tabId;
        if (tId) {
          const tab = getTabState(tId);
          tab.project = null;
          tab.review = null;
          tab.nikkels = [];
          tab.mode = 'idle';
          await saveState();
          await sendToTab(tId, { type: 'DEACTIVATE' });
        }
        return { ok: true };
      }

      case 'SUBMIT_NIKKEL': {
        const srcTabId = sender.tab?.id;
        if (!srcTabId) return { ok: false, error: 'No tab context' };
        const tab = getTabState(srcTabId);
        if (!tab.project || !tab.review) throw new Error('No active project or review');
        const d = msg.payload.nikkel;
        const saved = await api.submitNikkel({
          review_id: tab.review.id,
          page_url: d.pageUrl,
          dom_selector: d.selector,
          x: d.pageX,
          y: d.pageY,
          viewport_w: d.viewportW,
          viewport_h: d.viewportH,
          tag: d.tag,
          element_text: d.elementText,
          comment: d.comment,
          idx: d.idx,
        }, globalState.token);
        tab.nikkels.push(saved);
        await saveState();
        await sendToTab(srcTabId, { type: 'PIN_CONFIRMED', payload: { nikkel: saved } });
        return { ok: true };
      }

      case 'GET_NIKKELS': {
        const srcTabId = sender.tab?.id || tabId;
        if (!srcTabId) return { ok: true, nikkels: [] };
        const tab = getTabState(srcTabId);
        if (!tab.project || !tab.review) return { ok: true, nikkels: [] };
        const pageUrl = msg.payload?.pageUrl || tab.url;
        const nikkels = await api.getReviewNikkels(tab.review.id, pageUrl, globalState.token);
        tab.nikkels = nikkels;
        return { ok: true, nikkels };
      }

      case 'SIGN_IN_GOOGLE': {
        const redirectUrl = chrome.identity.getRedirectURL();
        const oauthUrl = `${api.SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectUrl)}`;
        let redirect;
        try {
          redirect = await chrome.identity.launchWebAuthFlow({ url: oauthUrl, interactive: true });
        } catch (e) {
          return { ok: false, error: 'Google sign-in cancelled or failed' };
        }
        if (!redirect) return { ok: false, error: 'No redirect received' };
        const hash = new URL(redirect).hash.substring(1);
        const params = new URLSearchParams(hash);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        if (!accessToken) return { ok: false, error: 'No access token in response' };
        api.setTokens(accessToken, refreshToken);
        const userInfo = await supabaseUserInfo(accessToken);
        globalState.user = { id: userInfo.id, email: userInfo.email, name: userInfo.user_metadata?.name, is_anonymous: false };
        globalState.token = accessToken;
        globalState.refreshToken = refreshToken;
        globalState.isAnonymous = false;
        if (pendingShare && pendingShare.tabId) {
          const ts = getTabState(pendingShare.tabId);
          if (ts.project) {
            let review = await ensureProjectReview(ts.project.id, globalState.user?.id, globalState.token, ts);
            if (review) {
              const shareToken = await api.ensureShareToken(review.id, globalState.token);
              const shareUrl = `${api.VIEWER_BASE}/review/${shareToken}`;
              pendingShare = null;
              await saveState();
              return { ok: true, user: globalState.user, shareUrl };
            }
          }
        }
        await saveState();
        return { ok: true, user: globalState.user };
      }

      case 'ACTIVATE_TAB': {
        const tId = msg.payload?.tabId;
        if (tId) {
          const tab = getTabState(tId);
          if (tab.project) {
            await sendToTab(tId, {
              type: 'ACTIVATE',
              payload: { projectName: tab.project.title, sessionId: tab.project.id, reviewId: tab.review?.id, shareUrl: '', mode: tab.mode, readOnly: tab.readOnly },
            });
          }
        }
        return { ok: true };
      }

      case 'MODE_CHANGED': {
        const srcTabId = sender.tab?.id || tabId;
        if (srcTabId) {
          const tab = getTabState(srcTabId);
          const newMode = msg.payload.mode;

          if (newMode === 'annotate' && tab.readOnly) {
            return { ok: false, error: 'This review is read-only' };
          }

          // Only one tab can annotate at a time — exit annotate on all others
          if (newMode === 'annotate') {
            for (const [id, t] of tabState) {
              if (id !== srcTabId && t.mode === 'annotate') {
                t.mode = 'idle';
                try { chrome.tabs.sendMessage(id, { type: 'DEACTIVATE' }); } catch {}
              }
            }
          }

          tab.mode = newMode;
          await saveState();
        }
        return { ok: true };
      }

      case 'TOGGLE_DISABLED': {
        globalState.globalDisabled = msg.payload?.disabled;
        if (globalState.globalDisabled) {
          // Deactivate all tabs
          for (const [id, t] of tabState) {
            if (t.project) {
              t.project = null;
              t.nikkels = [];
              t.mode = 'idle';
              try { chrome.tabs.sendMessage(id, { type: 'DEACTIVATE' }); } catch {}
            }
          }
        }
        await saveState();
        return { ok: true, globalDisabled: globalState.globalDisabled };
      }

      case 'SIGN_OUT': {
        globalState.user = null;
        globalState.token = null;
        globalState.refreshToken = null;
        globalState.isAnonymous = false;
        tabState.clear();
        await saveState();
        return { ok: true };
      }

      case 'LOAD_REVIEW': {
        const rt = msg.payload?.reviewToken;
        console.log('[BG] LOAD_REVIEW', rt);
        if (!rt) return { ok: false, error: 'No review token provided' };
        const review = await api.getReviewByShareToken(rt);
        if (!review) return { ok: false, error: 'Review not found' };
        const project = review.project;
        if (!project) return { ok: false, error: 'Project not found for review' };
        const targetUrl = project.base_url || project.url;
        if (!targetUrl) return { ok: false, error: 'Project has no target URL' };

        // Normalize URL for matching — strip trailing slash
        const normalized = targetUrl.replace(/\/+$/, '');
        const tabs = await chrome.tabs.query({});
        const existing = tabs.find(t => t.url && t.url.replace(/\/+$/, '') === normalized && !t.url.startsWith('chrome-extension://'));

        let tab;
        let reused = false;
        if (existing) {
          tab = existing;
          reused = true;
          await chrome.tabs.update(tab.id, { active: true });
          await chrome.windows.update(tab.windowId, { focused: true });
        } else {
          tab = await chrome.tabs.create({ url: targetUrl, active: true });
        }

        getTabState(tab.id).project = project;
        getTabState(tab.id).review = { id: review.id, share_token: rt };
        getTabState(tab.id).mode = 'browse';
        getTabState(tab.id).nikkels = [];
        getTabState(tab.id).url = targetUrl;
        getTabState(tab.id).readOnly = true;
        await saveState();
        if (!reused) {
          // On a fresh tab, content script loads and fetches pins via resumeActiveReview
        } else {
          // On reused tab, force a pin refresh
          const ts = getTabState(tab.id);
          try {
            const nikkels = await api.getReviewNikkels(ts.review.id, normalized, globalState.token);
            ts.nikkels = nikkels;
            await sendToTab(tab.id, {
              type: 'LOAD_SESSION',
              payload: { projectName: project.title, sessionId: project.id, reviewId: review.id, shareUrl: '', viewOnly: true, nikkels },
            });
          } catch {}
        }
        return { ok: true, targetUrl, reused };
      }

      case 'SHARE': {
        const srcTabId = sender.tab?.id || tabId;
        if (!srcTabId) return { ok: false, error: 'No tab context' };
        const tab = getTabState(srcTabId);
        if (!tab.project) return { ok: false, error: 'No active project' };

        if (globalState.isAnonymous) {
          pendingShare = { tabId: srcTabId };
          await saveState();
          return { ok: true, needsAuth: true };
        }

        // Ensure a review exists in Supabase for this project
        let review = await ensureProjectReview(tab.project.id, globalState.user?.id, globalState.token, tab);
        if (!review) return { ok: false, error: 'Failed to create review' };

        const shareToken = await api.ensureShareToken(review.id, globalState.token);
        const shareUrl = `${api.VIEWER_BASE}/review/${shareToken}`;
        return { ok: true, shareUrl };
      }

      default:
        return { ok: false, error: 'Unknown message type' };
    }
  };

  handle().then((result) => {
    const nt = api.getToken();
    if (nt && nt !== globalState.token) {
      globalState.token = nt;
      globalState.refreshToken = api.getRefreshToken();
      saveState();
    }
    sendResponse(result);
  }).catch((err) => {
    sendResponse({ ok: false, error: err.message });
  });
  return true;
});

async function supabaseUserInfo(accessToken) {
  const res = await fetch(`${api.SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: api.SUPABASE_ANON, Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error('Failed to get user info');
  return res.json();
}
