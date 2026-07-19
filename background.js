import { container } from './src/di/index.js';
import { VIEWER_BASE, API_URL } from './src/config/index.js';
import { SUPABASE_URL, SUPABASE_ANON } from './src/infrastructure/supabase/SupabaseClient.js';

const { supabaseClient, authService, projectService, pinService, shareService } = container;

function jwtSub(token) {
  try { return JSON.parse(atob(token.split('.')[1])).sub; } catch { return null; }
}

const globalState = {
  user: null,
  token: null,
  refreshToken: null,
  globalDisabled: false,
  lastProject: null, // { projectId, reviewId, baseUrl, title } — persisted, used by tabs.onUpdated to auto-resume
};

const tabState = new Map();

function getTabState(tabId) {
  if (!tabState.has(tabId)) {
    tabState.set(tabId, { mode: 'idle', project: null, review: null, nikkels: [], url: '', title: '', readOnly: false, barActive: false });
  }
  return tabState.get(tabId);
}

async function ensureCollaborator(projectId) {
  if (!globalState.token || !globalState.user?.id) return false;
  try {
    await supabaseClient.request('/rest/v1/project_collaborators', {
      method: 'POST', token: globalState.token,
      prefer: 'resolution=ignore-duplicates,return=minimal',
      body: JSON.stringify({ project_id: projectId, user_id: globalState.user.id, role: 'collaborator' }),
    });
    return true;
  } catch (e) {
    console.warn('[Nikkel] ensureCollaborator failed:', e.message);
    return false;
  }
}

function setSignedOut() {
  globalState.user = null;
  globalState.token = null;
  globalState.refreshToken = null;
}

function setAuthenticatedUser(user, token, refreshToken) {
  globalState.user = user;
  globalState.token = token;
  globalState.refreshToken = refreshToken;
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
  await chrome.storage.local.set({
    nikkelState: globalState,
    nikkelTabState: tabObj,
  });
}

async function loadState() {
  const r = await chrome.storage.local.get(['nikkelState', 'nikkelTabState']);
  if (r.nikkelState) Object.assign(globalState, r.nikkelState);
  if (r.nikkelTabState) {
    for (const [tabId, ts] of Object.entries(r.nikkelTabState)) {
      tabState.set(Number(tabId), ts);
    }
  }
  const hasUser = !!globalState.user;
  const hasToken = !!globalState.token;
  const hasRefresh = !!globalState.refreshToken;
  if (hasUser !== hasToken || hasToken !== hasRefresh) {
    setSignedOut();
    await saveState();
    supabaseClient.setTokens(globalState.token, globalState.refreshToken);
    return;
  }
  supabaseClient.setTokens(globalState.token, globalState.refreshToken);
}

async function sendToTab(tabId, msg, retries = 8) {
  for (let i = 0; i < retries; i++) {
    try {
      return await chrome.tabs.sendMessage(tabId, msg);
    } catch {
      try { await chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] }); } catch {}
      if (i < retries - 1) await new Promise(r => setTimeout(r, 500));
    }
  }
  return null;
}

function setLastProject(project, review) {
  if (project && project.id) {
    globalState.lastProject = { projectId: project.id, reviewId: review?.id || null, baseUrl: project.base_url || project.baseUrl || '', title: project.title || '' };
  }
}

async function upsertProfile(user, token) {
  if (!user || !token) return;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/profiles?on_conflict=id`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON, Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify({
        id: user.id,
        name: user.name,
        email: user.email,
        avatar_url: user.avatarUrl,
      }),
    });
  } catch (e) {
    console.warn('[BG] Failed to upsert profile', e.message);
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
  if (ts.project && !ts.barActive) {
    ts.barActive = true;
    await sendToTab(activeInfo.tabId, {
      type: 'ACTIVATE',
      payload: { projectName: ts.project.title, sessionId: ts.project.id, reviewId: ts.review?.id, shareUrl: '', mode: ts.mode, readOnly: ts.readOnly, dashboardUrl: `${VIEWER_BASE}/dashboard#token=${encodeURIComponent(globalState.token || '')}` },
    });
  }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
  await ready;
  if (changeInfo.url) {
    const ts = getTabState(tabId);
    ts.url = changeInfo.url;
    ts.barActive = false;
    if (!ts.project && globalState.lastProject && globalState.token) {
      console.log('[BG] tabs.onUpdated — matching lastProject', { baseUrl: globalState.lastProject.baseUrl, url: changeInfo.url });
      const base = globalState.lastProject.baseUrl?.replace(/\/+$/, '');
      const url = changeInfo.url.replace(/\/+$/, '');
      if (base && (url === base || url.startsWith(base + '/') || url.startsWith(base + '?'))) {
        const reviewId = globalState.lastProject.reviewId;
        ts.project = { id: globalState.lastProject.projectId, title: globalState.lastProject.title, base_url: globalState.lastProject.baseUrl, baseUrl: globalState.lastProject.baseUrl };
        ts.review = reviewId ? { id: reviewId } : null;
        ts.mode = 'annotate';
        ts.nikkels = [];
        ts.readOnly = false;
        ts.barActive = true;
        await saveState();
        await sendToTab(tabId, {
          type: 'ACTIVATE',
          payload: { projectName: globalState.lastProject.title, sessionId: globalState.lastProject.projectId, reviewId, shareUrl: '', mode: 'annotate', readOnly: false, dashboardUrl: `${VIEWER_BASE}/dashboard#token=${encodeURIComponent(globalState.token || '')}` },
        });
      }
    }
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
        return { ok: true, user: globalState.user, userName: globalState.user?.name || '', userEmail: globalState.user?.email || '', mode: ts?.mode || 'idle', project: ts?.project || null, review: ts?.review || null, globalDisabled: globalState.globalDisabled, url: ts?.url || '', title: ts?.title || '', readOnly: ts?.readOnly || false, token: globalState.token || '', dashboardUrl: `${VIEWER_BASE}/dashboard#token=${encodeURIComponent(globalState.token || '')}` };

      case 'START_REVIEW': {
        if (globalState.globalDisabled) return { ok: false, error: 'Nikkel is disabled' };
        if (!globalState.token || !globalState.user?.email) return { ok: false, error: 'Sign in to start a review' };
        const { tabId: tId, title, url } = msg.payload;
        console.log('[BG] START_REVIEW — user.id:', globalState.user?.id, 'email:', globalState.user?.email, 'JWT sub:', jwtSub(globalState.token));
        const project = await projectService.create(title || 'Untitled Review', url || '', globalState.user?.id, globalState.token);
        console.log('[BG] START_REVIEW — project created', { projectId: project.id, owner_id: project.ownerId || project.owner_id });
        const review = await shareService.ensureProjectReview(project.id, globalState.user?.id, globalState.token);
        console.log('[BG] START_REVIEW — review result', { reviewId: review?.id, owner_id: review?.owner_id });
        if (!review) console.error('[BG] START_REVIEW: ensureProjectReview returned null — review not created');
        const tab = getTabState(tId);
        tab.project = project;
        tab.review = review;
        tab.mode = 'annotate';
        tab.nikkels = [];
        tab.url = url || tab.url;
        setLastProject(project, review);
        await saveState();
        if (tId) {
          await sendToTab(tId, {
            type: 'ACTIVATE',
            payload: { projectName: project.title, sessionId: project.id, reviewId: review?.id, shareUrl: '', dashboardUrl: `${VIEWER_BASE}/dashboard#token=${encodeURIComponent(globalState.token || '')}` },
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
          tab.barActive = false;
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
        if (!globalState.token || !globalState.user?.email) return { ok: false, error: 'Sign in to drop pins.' };
        const isOwner = globalState.user?.id && tab.project.owner_id === globalState.user.id;
        if (!isOwner) {
          const claimed = await ensureCollaborator(tab.project.id);
          if (!claimed) return { ok: false, error: 'Could not verify project access. Try again.' };
        }
        try {
          const pCheck = await supabaseClient.request(`/rest/v1/projects?id=eq.${tab.project.id}&select=id`, { token: globalState.token });
          if (!pCheck || (Array.isArray(pCheck) && pCheck.length === 0)) throw new Error('gone');
        } catch {
          tab.project = null; tab.review = null; tab.nikkels = []; tab.mode = 'idle'; tab.barActive = false;
          await saveState();
          try { chrome.tabs.sendMessage(srcTabId, { type: 'DEACTIVATE' }); } catch {}
          return { ok: false, error: 'Project has been deleted. Starting a new review.' };
        }
        const d = msg.payload.nikkel;
        let nextIdx = 1;
        try {
          const existing = await supabaseClient.request(`/rest/v1/nikkels?review_id=eq.${tab.review.id}&select=idx&order=idx.desc&limit=1`, { token: globalState.token });
          if (Array.isArray(existing) && existing.length > 0 && existing[0].idx != null) nextIdx = existing[0].idx + 1;
        } catch {}
        try {
          const saved = await pinService.create({
            reviewId: tab.review.id, pageUrl: d.pageUrl, selector: d.selector,
            pageX: d.pageX, pageY: d.pageY, viewportW: d.viewportW, viewportH: d.viewportH,
            tag: d.tag, elementText: d.elementText, comment: d.comment, idx: nextIdx,
            userId: globalState.user?.id,
          }, globalState.token);
          tab.nikkels.push(saved);
          await saveState();
          await sendToTab(srcTabId, { type: 'PIN_CONFIRMED', payload: { nikkel: saved } });
          return { ok: true };
        } catch (e) {
          console.warn('[Nikkel] pinService.create failed:', e.message);
          return { ok: false, error: 'Could not save that pin — you may not have access to this project yet.' };
        }
      }

      case 'GET_NIKKELS': {
        const srcTabId = sender.tab?.id || tabId;
        if (!srcTabId) return { ok: true, nikkels: [] };
        const tab = getTabState(srcTabId);
        if (!tab.project || !tab.review) {
          try { chrome.tabs.sendMessage(srcTabId, { type: 'DEACTIVATE' }); } catch {}
          return { ok: true, nikkels: [] };
        }
        const allPages = msg.payload?.allPages;
        const pageUrl = allPages ? undefined : (msg.payload?.pageUrl || tab.url);
        const opts = pageUrl ? { pageUrl } : {};
        const nikkels = await pinService.findByReview(tab.review.id, opts, globalState.token);
        if (!allPages) tab.nikkels = nikkels;
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
        if (!globalState.token || !globalState.user?.email) return { ok: false, error: 'Sign in to reply.' };
        const srcTabId = sender.tab?.id;
        const tab = srcTabId ? getTabState(srcTabId) : null;
        if (tab?.project?.id) {
          const isOwner = globalState.user?.id && tab.project.owner_id === globalState.user.id;
          if (!isOwner) {
            const claimed = await ensureCollaborator(tab.project.id);
            if (!claimed) return { ok: false, error: 'Could not verify project access. Try again.' };
          }
        }
        try {
          const authorName = globalState.user?.name || 'Anonymous';
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

      case 'GET_TOKEN': {
        return { ok: true, token: globalState.token || '' };
      }

      case 'SIGN_IN_GOOGLE': {
        const redirectUrl = chrome.identity.getRedirectURL();
        const oauthUrl = `${SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectUrl)}&prompt=select_account`;
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

        const userInfo = await authService.getUserInfo(accessToken);
        console.log('[BG] SIGN_IN_GOOGLE — Google user info', { id: userInfo.id, email: userInfo.email, name: userInfo.name });
        supabaseClient.setTokens(accessToken, refreshToken);
        setAuthenticatedUser(userInfo, accessToken, refreshToken);
        await upsertProfile(globalState.user, globalState.token);
        await saveState();
        return { ok: true, user: globalState.user };
      }

      case 'CLAIM_PROJECT': {
        const srcTabId = sender.tab?.id || tabId;
        if (!srcTabId) return { ok: false, error: 'No tab context' };
        const tab = getTabState(srcTabId);
        if (!tab.project) return { ok: false, error: 'No project in tab' };
        if (!globalState.token || !globalState.user?.email) return { ok: false, error: 'Not authenticated' };
        try {
          const claimUrl = `${API_URL}/api/projects/${tab.project.id}/collaborators`;
          console.log('[BG] CLAIM_PROJECT — url:', claimUrl, 'token prefix:', globalState.token?.slice(0, 20));
          const res = await fetch(claimUrl, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${globalState.token}`, 'Content-Type': 'application/json' },
          });
          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            console.log('[BG] CLAIM_PROJECT — failed', res.status, body);
            return { ok: false, error: body.error || `HTTP ${res.status}` };
          }
          tab.readOnly = false;
          await saveState();
          return { ok: true };
        } catch (e) {
          console.log('[BG] CLAIM_PROJECT — network error', e.message);
          return { ok: false, error: e.message };
        }
      }

      case 'ACTIVATE_TAB': {
        const tId = msg.payload?.tabId;
        if (tId) {
          const tab = getTabState(tId);
          if (tab.project) {
            await sendToTab(tId, {
              type: 'ACTIVATE',
              payload: { projectName: tab.project.title, sessionId: tab.project.id, reviewId: tab.review?.id, shareUrl: '', mode: tab.mode, readOnly: tab.readOnly, dashboardUrl: `${VIEWER_BASE}/dashboard#token=${encodeURIComponent(globalState.token || '')}` },
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
        setLastProject(ts.project, review);
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
                t.mode = 'idle'; t.barActive = false;
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
        pendingShare = null;
        for (const [id] of tabState) {
          try { chrome.tabs.sendMessage(id, { type: 'DEACTIVATE' }); } catch {}
        }
        tabState.clear();
        await saveState();
        return { ok: true, globalDisabled: globalState.globalDisabled };
      }

      case 'SIGN_OUT': {
        setSignedOut();
        globalState.lastProject = null;
        tabState.clear();
        await saveState();
        return { ok: true };
      }

      case 'LOAD_REVIEW': {
        const rt = msg.payload?.reviewToken;
        if (!rt) return { ok: false, error: 'No review token provided' };

        const boardRes = await fetch(`${API_URL}/api/board/${encodeURIComponent(rt)}`);
        if (!boardRes.ok) return { ok: false, error: 'Review not found' };
        const board = await boardRes.json();
        const project = board.project;
        const review = board.review;
        if (!project) return { ok: false, error: 'Project not found for review' };

        const targetUrl = msg.payload?.pageUrl || project.base_url || project.url;
        if (!targetUrl) return { ok: false, error: 'Project has no target URL' };

        const normalized = targetUrl.replace(/\/+$/, '');
        const tabs = await chrome.tabs.query({});
        const existing = tabs.find(t => t.url && t.url.replace(/\/+$/, '') === normalized && !t.url.startsWith('chrome-extension://'));

        const isOwner = globalState.user?.id && project.owner_id === globalState.user.id;
        const stateForTab = { project, review: { id: review.id, share_token: rt }, mode: 'browse', nikkels: [], url: targetUrl, readOnly: !(globalState.token && globalState.user?.email) };

        let tab;
        let reused = false;
        if (existing) {
          tab = existing;
          reused = true;
          Object.assign(getTabState(tab.id), stateForTab);
          await chrome.tabs.update(tab.id, { active: true });
          await chrome.windows.update(tab.windowId, { focused: true });
        } else {
          tab = await chrome.tabs.create({ url: targetUrl, active: true });
          Object.assign(getTabState(tab.id), stateForTab);
        }

        setLastProject(project, review);
        await saveState();
        try {
          const nikkels = await pinService.findByReview(review.id, {}, globalState.token);
          stateForTab.nikkels = nikkels;
          await sendToTab(tab.id, {
            type: 'LOAD_SESSION',
            payload: { projectName: project.title, sessionId: project.id, reviewId: review.id, shareUrl: '', viewOnly: stateForTab.readOnly, nikkels, dashboardUrl: `${VIEWER_BASE}/dashboard#token=${encodeURIComponent(globalState.token || '')}` },
          });
        } catch {}
        return { ok: true, targetUrl, reused };
      }

      case 'SHARE': {
        const srcTabId = sender.tab?.id || tabId;
        if (!srcTabId) return { ok: false, error: 'No tab context' };
        const tab = getTabState(srcTabId);
        if (!tab.project) return { ok: false, error: 'No active project' };
        if (!tab.nikkels || tab.nikkels.length === 0) return { ok: false, error: 'Add at least one pin before sharing' };
        if (!globalState.token || !globalState.user?.email) return { ok: false, error: 'Sign in to share' };
        try {
          const pCheck = await supabaseClient.request(`/rest/v1/projects?id=eq.${tab.project.id}&select=id`, { token: globalState.token });
          if (!pCheck || (Array.isArray(pCheck) && pCheck.length === 0)) {
            tab.project = null; tab.review = null; tab.nikkels = []; tab.mode = 'idle';
            await saveState();
            return { ok: false, error: 'Project has been deleted.' };
          }
        } catch {} // network blip, let the real operation fail naturally

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
          await upsertProfile(globalState.user, globalState.token);
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


