import { container } from './src/di/index.js';
import { VIEWER_BASE, API_URL } from './src/config/index.js';
import { SUPABASE_URL, SUPABASE_ANON } from './src/infrastructure/supabase/SupabaseClient.js';

const { supabaseClient, authService, projectService, pinService, shareService } = container;

const globalState = {
  user: null,
  token: null,
  refreshToken: null,
  isAnonymous: false,
  globalDisabled: false,
};

const tabState = new Map();

function getTabState(tabId) {
  if (!tabState.has(tabId)) {
    tabState.set(tabId, { mode: 'idle', project: null, review: null, nikkels: [], url: '', title: '', readOnly: false });
  }
  return tabState.get(tabId);
}

let pendingShare = null;

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
    globalState.refreshToken = null;
    await saveState();
  }
  supabaseClient.setTokens(globalState.token, globalState.refreshToken);
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
    supabaseClient.setTokens(globalState.token, globalState.refreshToken);

    const tabId = msg.payload?.tabId || sender.tab?.id;
    const ts = tabId ? getTabState(tabId) : null;

    switch (msg.type) {
      case 'GET_STATE':
        return { ok: true, user: globalState.user, mode: ts?.mode || 'idle', project: ts?.project || null, review: ts?.review || null, isAnonymous: globalState.isAnonymous, globalDisabled: globalState.globalDisabled, url: ts?.url || '', title: ts?.title || '', readOnly: ts?.readOnly || false };

      case 'INIT_ANONYMOUS': {
        if (globalState.token && globalState.user) return { ok: true, user: globalState.user, isAnonymous: globalState.isAnonymous };
        const result = await authService.signInAnonymously();
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
          const anon = await authService.signInAnonymously();
          globalState.user = anon.user;
          globalState.token = anon.token;
          globalState.refreshToken = anon.refreshToken;
          globalState.isAnonymous = true;
          await saveState();
          supabaseClient.setTokens(globalState.token, globalState.refreshToken);
        }
        const project = await projectService.create(title || 'Untitled Review', url || '', globalState.user?.id, globalState.token);
        const review = await shareService.ensureProjectReview(project.id, globalState.user?.id, globalState.token);
        if (!review) console.error('[BG] START_REVIEW: ensureProjectReview returned null — review not created');
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
            payload: { projectName: project.title, sessionId: project.id, reviewId: review?.id, shareUrl: '' },
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
        if (!tab.project || !tab.review) return { ok: false, error: 'No active project or review' };
        const d = msg.payload.nikkel;
        const saved = await pinService.create({
          reviewId: tab.review.id,
          pageUrl: d.pageUrl,
          selector: d.selector,
          pageX: d.pageX,
          pageY: d.pageY,
          viewportW: d.viewportW,
          viewportH: d.viewportH,
          tag: d.tag,
          elementText: d.elementText,
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
        const nikkels = await pinService.findByReview(tab.review.id, { pageUrl }, globalState.token);
        tab.nikkels = nikkels;
        return { ok: true, nikkels };
      }

      case 'GET_NIKKEL_COMMENTS': {
        const { nikkelId } = msg.payload || {};
        if (!nikkelId) return { ok: true, comments: [] };
        try {
          const res = await fetch(`${SUPABASE_URL}/rest/v1/replies?nikkel_id=eq.${nikkelId}&order=created_at.asc`, {
            headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${globalState.token}` },
          });
          if (!res.ok) return { ok: true, comments: [] };
          const data = await res.json();
          return { ok: true, comments: data || [] };
        } catch {
          return { ok: true, comments: [] };
        }
      }

      case 'SUBMIT_COMMENT': {
        const { nikkelId, text } = msg.payload || {};
        if (!nikkelId || !text) return { ok: false, error: 'Missing nikkelId or text' };
        try {
          const authorName = globalState.user?.user_metadata?.full_name || 'Anonymous';
          const res = await fetch(`${API_URL}/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nikkelId, text, authorName }),
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            return { ok: false, error: err.error || `HTTP ${res.status}` };
          }
          const comment = await res.json();
          return { ok: true, comment };
        } catch (e) {
          return { ok: false, error: e.message };
        }
      }

      case 'SIGN_IN_GOOGLE': {
        console.log('[BG] SIGN_IN_GOOGLE — globalState.isAnonymous:', globalState.isAnonymous, 'globalState.user:', globalState.user?.id);
        const redirectUrl = chrome.identity.getRedirectURL();
        const oauthUrl = `${SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectUrl)}`;
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
        supabaseClient.setTokens(accessToken, refreshToken);
        globalState.user = await authService.getUserInfo(accessToken);
        globalState.token = accessToken;
        globalState.refreshToken = refreshToken;
        globalState.isAnonymous = false;
        console.log('[BG] SIGN_IN_GOOGLE — after auth, pendingShare:', pendingShare, 'pendingShare?.tabId:', pendingShare?.tabId);
        if (pendingShare && pendingShare.tabId) {
          const ts = getTabState(pendingShare.tabId);
          console.log('[BG] SIGN_IN_GOOGLE — pendingShare tabState project:', ts?.project?.id, 'review:', ts?.review?.id);
          if (ts.project) {
            let review = await shareService.ensureProjectReview(ts.project.id, globalState.user?.id, globalState.token);
            console.log('[BG] SIGN_IN_GOOGLE — ensureProjectReview returned:', review?.id);
            if (review) {
              ts.review = review;
              const shareToken = await shareService.ensureShareToken(review.id, globalState.token);
              const shareUrl = `${VIEWER_BASE}/review/${shareToken}`;
              pendingShare = null;
              await saveState();
              return { ok: true, user: globalState.user, shareUrl };
            }
            console.error('[BG] SIGN_IN_GOOGLE: ensureProjectReview returned null — review not created after Google auth');
          }
        }
        console.log('[BG] SIGN_IN_GOOGLE — returning user only, no shareUrl (pendingShare was not set)');
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

      case 'OPEN_PROJECT': {
        const srcTabId = sender.tab?.id || tabId;
        if (!srcTabId) return { ok: false, error: 'No tab context' };
        const { shareId } = msg.payload || {};
        if (!shareId) return { ok: false, error: 'No shareId provided' };

        const boardRes = await fetch(`${API_URL}/board/${encodeURIComponent(shareId)}`);
        if (!boardRes.ok) return { ok: false, error: 'Project not found' };
        const board = await boardRes.json();
        const boardProject = board.project;
        const review = board.review;

        const targetUrl = (boardProject.base_url || boardProject.url || '').replace(/\/+$/, '');
        if (!targetUrl) return { ok: false, error: 'Project has no target URL' };

        const ts = getTabState(srcTabId);
        ts.project = { id: boardProject.id, title: boardProject.title || boardProject.name, baseUrl: targetUrl, shareToken: boardProject.share_token };
        ts.review = review ? { id: review.id, project_id: review.project_id, owner_id: review.owner_id, share_token: review.share_token } : null;
        ts.nikkels = [];
        ts.mode = 'browse';
        ts.url = targetUrl;
        ts.readOnly = true;
        await saveState();

        return { ok: true, targetUrl };
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
        if (!rt) return { ok: false, error: 'No review token provided' };
        const review = await shareService.getReviewByShareToken(rt);
        if (!review) return { ok: false, error: 'Review not found' };
        const project = review.project;
        if (!project) return { ok: false, error: 'Project not found for review' };
        const targetUrl = project.base_url || project.url;
        if (!targetUrl) return { ok: false, error: 'Project has no target URL' };

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
        if (reused) {
          const ts = getTabState(tab.id);
          try {
            const nikkels = await pinService.findByReview(ts.review.id, { pageUrl: normalized }, globalState.token);
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
        console.log('[BG] SHARE — isAnonymous:', globalState.isAnonymous, 'project:', tab.project.id, 'pendingShare:', pendingShare);

        if (globalState.isAnonymous) {
          pendingShare = { tabId: srcTabId };
          await saveState();
          return { ok: true, needsAuth: true };
        }

        let review = await shareService.ensureProjectReview(tab.project.id, globalState.user?.id, globalState.token);
        if (!review) {
          console.error('[BG] SHARE: ensureProjectReview returned null');
          return { ok: false, error: 'Failed to create review' };
        }
        tab.review = review;

        const shareToken = await shareService.ensureShareToken(review.id, globalState.token);
        const shareUrl = `${VIEWER_BASE}/review/${shareToken}`;
        return { ok: true, shareUrl };
      }

      default:
        return { ok: false, error: 'Unknown message type' };
    }
  };

  handle().then((result) => {
    const nt = supabaseClient.getToken();
    if (nt && nt !== globalState.token) {
      globalState.token = nt;
      globalState.refreshToken = supabaseClient.getRefreshToken();
      saveState();
    }
    sendResponse(result);
  }).catch((err) => {
    sendResponse({ ok: false, error: err.message });
  });
  return true;
});


