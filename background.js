import { container } from './src/di/index.js';
import { VIEWER_BASE, API_URL } from './src/config/index.js';
import { SUPABASE_URL, SUPABASE_ANON } from './src/infrastructure/supabase/SupabaseClient.js';

const { supabaseClient, authService, projectService, pinService, shareService } = container;

const globalState = {
  user: null,
  token: null,
  refreshToken: null,
  isAnonymous: false,
  shareAsGuest: false,
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

function setSignedOut() {
  globalState.user = null;
  globalState.token = null;
  globalState.refreshToken = null;
  globalState.isAnonymous = false;
  globalState.shareAsGuest = false;
}

function setAnonymousUser(user, token, refreshToken) {
  globalState.user = user;
  globalState.token = token;
  globalState.refreshToken = refreshToken;
  globalState.isAnonymous = true;
  globalState.shareAsGuest = false;
}

function setAuthenticatedUser(user, token, refreshToken) {
  globalState.user = user;
  globalState.token = token;
  globalState.refreshToken = refreshToken;
  globalState.isAnonymous = false;
  globalState.shareAsGuest = false;
}

function syncTokens(token, refreshToken) {
  globalState.token = token;
  globalState.refreshToken = refreshToken;
}

async function saveState() {
  const tabObj = {};
  for (const [tabId, ts] of tabState) {
    if (ts.project) tabObj[String(tabId)] = { mode: ts.mode, project: ts.project, review: ts.review, nikkels: ts.nikkels, readOnly: ts.readOnly };
  }
  const { shareAsGuest, ...cleanState } = globalState;
  await chrome.storage.local.set({
    nikkelState: cleanState,
    nikkelTabState: tabObj,
    pendingShare,
  });
}

async function loadState() {
  const r = await chrome.storage.local.get(['nikkelState', 'nikkelTabState', 'pendingShare']);
  if (r.nikkelState) Object.assign(globalState, r.nikkelState);
  globalState.shareAsGuest = false;
  if (r.nikkelTabState) {
    for (const [tabId, ts] of Object.entries(r.nikkelTabState)) {
      tabState.set(Number(tabId), ts);
    }
  }
  if (r.pendingShare) pendingShare = r.pendingShare;
  const hasUser = !!globalState.user;
  const hasToken = !!globalState.token;
  const hasRefresh = !!globalState.refreshToken;
  if (hasUser !== hasToken || hasToken !== hasRefresh) {
    setSignedOut();
    await saveState();
    supabaseClient.setTokens(globalState.token, globalState.refreshToken);
    return;
  }
  // Migration: old code could save anon users with isAnonymous=false.
  // If user has no email they're almost certainly anonymous, so force reset.
  if (hasUser && !globalState.isAnonymous && !globalState.user?.email) {
    setSignedOut();
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

async function completeUpgrade(anonToken, anonUserId, tabIdOverride) {
  const targetTabId = (pendingShare && pendingShare.tabId) || tabIdOverride;
  if (!targetTabId || !anonToken || !anonUserId) {
    await saveState();
    return null;
  }
  const ts = getTabState(targetTabId);
  if (!ts.project) {
    await saveState();
    return null;
  }
  try {
    await supabaseClient.request(`/rest/v1/projects?id=eq.${ts.project.id}`, {
      method: 'PATCH', token: anonToken,
      body: JSON.stringify({ owner_id: globalState.user.id }),
    });
    ts.project.ownerId = globalState.user.id;
  } catch (e) {
    console.warn('[BG] Failed to transfer project ownership', e.message);
  }
  try {
    const anonReview = await shareService.ensureProjectReview(ts.project.id, anonUserId, anonToken);
    if (anonReview) {
      await supabaseClient.request(`/rest/v1/reviews?id=eq.${anonReview.id}`, {
        method: 'PATCH', token: anonToken,
        body: JSON.stringify({ owner_id: globalState.user.id }),
      });
      ts.review = anonReview;
      ts.review.owner_id = globalState.user.id;
    }
  } catch (e) {
    console.warn('[BG] Failed to transfer review ownership', e.message);
  }
  let review = await shareService.ensureProjectReview(ts.project.id, globalState.user?.id, globalState.token);
  if (!review) return null;
  ts.review = review;
  const shareToken = await shareService.ensureShareToken(review.id, globalState.token);
  const shareUrl = `${VIEWER_BASE}/review/${shareToken}`;
  pendingShare = null;
  await saveState();
  return shareUrl;
}

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
        return { ok: true, user: globalState.user, userName: globalState.user?.name || '', userEmail: globalState.user?.email || '', mode: ts?.mode || 'idle', project: ts?.project || null, review: ts?.review || null, isAnonymous: globalState.isAnonymous, globalDisabled: globalState.globalDisabled, url: ts?.url || '', title: ts?.title || '', readOnly: ts?.readOnly || false };

      case 'INIT_ANONYMOUS': {
        if (globalState.token && globalState.user) return { ok: true, user: globalState.user, isAnonymous: globalState.isAnonymous };
        const result = await authService.signInAnonymously();
        setAnonymousUser(result.user, result.token, result.refreshToken);
        await saveState();
        return { ok: true, user: result.user, isAnonymous: true };
      }

      case 'START_REVIEW': {
        if (globalState.globalDisabled) return { ok: false, error: 'Nikkel is disabled' };
        const { tabId: tId, title, url } = msg.payload;
        if (!globalState.token) {
          const anon = await authService.signInAnonymously();
          setAnonymousUser(anon.user, anon.token, anon.refreshToken);
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
          const supabaseRes = await fetch(`${SUPABASE_URL}/rest/v1/replies`, {
            method: 'POST',
            headers: { apikey: SUPABASE_ANON, 'Content-Type': 'application/json', Authorization: `Bearer ${globalState.token}`, Prefer: 'return=representation' },
            body: JSON.stringify({ nikkel_id: nikkelId, body: text, author_name: authorName, is_client: true }),
          });
          if (!supabaseRes.ok) {
            let msg = supabaseRes.statusText;
            try { const e = await supabaseRes.json(); msg = e.message || e.error || e.msg || msg; } catch {}
            return { ok: false, error: msg };
          }
          const data = await supabaseRes.json();
          const row = Array.isArray(data) ? data[0] : data;
          return { ok: true, comment: row || { body: text, author_name: authorName } };
        } catch (e) {
          return { ok: false, error: e.message };
        }
      }

      case 'SHARE_AS_GUEST': {
        const srcTabIdG = msg.payload?.tabId || tabId;
        if (!srcTabIdG) return { ok: false, error: 'No tab context' };
        const tabG = getTabState(srcTabIdG);
        if (!tabG.project) return { ok: false, error: 'No active project' };
        let reviewG = await shareService.ensureProjectReview(tabG.project.id, globalState.user?.id, globalState.token);
        if (!reviewG) return { ok: false, error: 'Failed to create review' };
        tabG.review = reviewG;
        const shareTokenG = await shareService.ensureShareToken(reviewG.id, globalState.token);
        const shareUrlG = `${VIEWER_BASE}/review/${shareTokenG}`;
    pendingShare = null;
    await saveState();
    return { ok: true, shareUrl: shareUrlG };
      }

      case 'SIGN_UP_EMAIL': {
        const { email: regEmail, password: regPassword } = msg.payload || {};
        if (!regEmail || !regPassword) return { ok: false, error: 'Email and password required' };
        const anonTokenReg = globalState.token;
        const anonUserIdReg = globalState.user?.id;
        let regResult;
        try { regResult = await authService.signUpWithEmail(regEmail, regPassword); }
        catch (e) { return { ok: false, error: e.message }; }
        setAuthenticatedUser(regResult.user, regResult.token, regResult.refreshToken);
        supabaseClient.setTokens(regResult.token, regResult.refreshToken);
        const shareUrlReg = await completeUpgrade(anonTokenReg, anonUserIdReg, tabId);
        if (shareUrlReg) return { ok: true, user: globalState.user, shareUrl: shareUrlReg };
        await saveState();
        return { ok: true, user: globalState.user };
      }

      case 'SIGN_IN_EMAIL': {
        const { email: signEmail, password: signPassword } = msg.payload || {};
        if (!signEmail || !signPassword) return { ok: false, error: 'Email and password required' };
        const anonTokenSign = globalState.token;
        const anonUserIdSign = globalState.user?.id;
        let signResult;
        try { signResult = await authService.signInWithEmail(signEmail, signPassword); }
        catch (e) { return { ok: false, error: e.message }; }
        setAuthenticatedUser(signResult.user, signResult.token, signResult.refreshToken);
        supabaseClient.setTokens(signResult.token, signResult.refreshToken);
        const shareUrlSign = await completeUpgrade(anonTokenSign, anonUserIdSign, tabId);
        if (shareUrlSign) return { ok: true, user: globalState.user, shareUrl: shareUrlSign };
        await saveState();
        return { ok: true, user: globalState.user };
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

        const anonToken = globalState.token;
        const anonUserId = globalState.user?.id;

        const userInfo = await authService.getUserInfo(accessToken);
        supabaseClient.setTokens(accessToken, refreshToken);
        setAuthenticatedUser(userInfo, accessToken, refreshToken);

        const shareUrl = await completeUpgrade(anonToken, anonUserId, tabId);
        if (shareUrl) return { ok: true, user: globalState.user, shareUrl };
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

        const boardRes = await fetch(`${API_URL}/api/board/${encodeURIComponent(shareId)}`);
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
        setSignedOut();
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
        console.log('[BG] SHARE — isAnonymous:', globalState.isAnonymous, 'project:', tab.project.id, 'pendingShare:', pendingShare, 'shareAsGuest:', globalState.shareAsGuest);

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

      case 'GET_USER_PROFILE': {
        try {
          const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
            headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${globalState.token}` },
          });
          if (!res.ok) {
            let msg = res.statusText;
            try { const e = await res.json(); msg = e.message || e.error || e.msg || msg; } catch {}
            return { ok: false, error: msg };
          }
          const data = await res.json();
          return {
            ok: true,
            user: {
              id: data.id,
              email: data.email,
              email_confirmed_at: data.email_confirmed_at,
              last_sign_in_at: data.last_sign_in_at,
              user_metadata: data.user_metadata || {},
              app_metadata: data.app_metadata || {},
            },
            identities: data.identities || [],
          };
        } catch (e) {
          return { ok: false, error: e.message };
        }
      }

      case 'UPDATE_PROFILE': {
        const { fullName } = msg.payload || {};
        if (!fullName) return { ok: false, error: 'Name is required' };
        try {
          const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
            method: 'PUT',
            headers: { apikey: SUPABASE_ANON, 'Content-Type': 'application/json', Authorization: `Bearer ${globalState.token}` },
            body: JSON.stringify({ data: { full_name: fullName } }),
          });
          if (!res.ok) {
            let msg = res.statusText;
            try { const e = await res.json(); msg = e.message || e.error || e.msg || msg; } catch {}
            return { ok: false, error: msg };
          }
          const updatedUser = await authService.getUserInfo(globalState.token);
          setAuthenticatedUser(updatedUser, globalState.token, globalState.refreshToken);
          await saveState();
          return { ok: true, user: globalState.user };
        } catch (e) {
          return { ok: false, error: e.message };
        }
      }

      case 'CHANGE_PASSWORD': {
        const { newPassword } = msg.payload || {};
        if (!newPassword || newPassword.length < 6) return { ok: false, error: 'Password must be at least 6 characters' };
        try {
          const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
            method: 'PUT',
            headers: { apikey: SUPABASE_ANON, 'Content-Type': 'application/json', Authorization: `Bearer ${globalState.token}` },
            body: JSON.stringify({ password: newPassword }),
          });
          if (!res.ok) {
            let msg = res.statusText;
            try { const e = await res.json(); msg = e.message || e.error || e.msg || msg; } catch {}
            return { ok: false, error: msg };
          }
          return { ok: true };
        } catch (e) {
          return { ok: false, error: e.message };
        }
      }

      case 'FORGOT_PASSWORD': {
        const { email } = msg.payload || {};
        if (!email) return { ok: false, error: 'Email is required' };
        try {
          const res = await fetch(`${SUPABASE_URL}/auth/v1/recover`, {
            method: 'POST',
            headers: { apikey: SUPABASE_ANON, 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
          });
          if (!res.ok) {
            let msg = res.statusText;
            try { const e = await res.json(); msg = e.message || e.error || e.msg || msg; } catch {}
            return { ok: false, error: msg };
          }
          return { ok: true };
        } catch (e) {
          return { ok: false, error: e.message };
        }
      }

      default:
        return { ok: false, error: 'Unknown message type' };
    }
  };

  handle().then((result) => {
    const nt = supabaseClient.getToken();
    if (nt && nt !== globalState.token) {
      syncTokens(nt, supabaseClient.getRefreshToken());
      saveState();
    }
    sendResponse(result);
  }).catch((err) => {
    sendResponse({ ok: false, error: err.message });
  });
  return true;
});


