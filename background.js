import * as api from './api.js';

let state = {
  user: null,
  token: null,
  refreshToken: null,
  project: null,
  isAnonymous: false,
  nikkels: [],
  mode: 'idle',
  globalDisabled: false,
};

let pendingShare = false;

async function saveState() {
  await chrome.storage.local.set({
    nikkelState: state,
    nikkelMode: state.mode,
    nikkelProject: state.project,
    pendingShare,
  });
}

async function loadState() {
  const r = await chrome.storage.local.get(['nikkelState', 'pendingShare']);
  if (r.nikkelState) state = r.nikkelState;
  if (r.pendingShare) pendingShare = r.pendingShare;
  if (state.token && !state.refreshToken) {
    state.user = null;
    state.token = null;
    state.project = null;
    state.nikkels = [];
    state.mode = 'idle';
    await saveState();
  }
  api.setTokens(state.token, state.refreshToken);
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
  if (state.globalDisabled) return;
  if (state.project) {
    await sendToTab(activeInfo.tabId, {
      type: 'ACTIVATE',
      payload: { projectName: state.project.title, sessionId: state.project.id, shareUrl: '' },
    });
  }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  const handle = async () => {
    await ready;
    api.setTokens(state.token, state.refreshToken);
    console.log('[BG] message', msg.type, msg.payload);

    switch (msg.type) {
      case 'GET_STATE':
        return { ok: true, user: state.user, mode: state.mode, project: state.project, isAnonymous: state.isAnonymous, pendingShare, globalDisabled: state.globalDisabled };

      case 'INIT_ANONYMOUS': {
        if (state.token && state.user) return { ok: true, user: state.user, isAnonymous: state.isAnonymous };
        const result = await api.signInAnonymously();
        state.user = result.user;
        state.token = result.token;
        state.refreshToken = result.refreshToken;
        state.isAnonymous = true;
        await saveState();
        return { ok: true, user: result.user, isAnonymous: true };
      }

      case 'START_REVIEW': {
        if (state.globalDisabled) return { ok: false, error: 'Nikkel is disabled' };
        const { tabId, title, url } = msg.payload;
        if (!state.token) {
          const anon = await api.signInAnonymously();
          state.user = anon.user;
          state.token = anon.token;
          state.refreshToken = anon.refreshToken;
          state.isAnonymous = true;
          await saveState();
          api.setTokens(state.token, state.refreshToken);
        }
        const project = await api.createProject(title || 'Untitled Review', url || '', state.user?.id, state.token);
        state.project = project;
        state.mode = 'annotate';
        state.nikkels = [];
        await saveState();
        if (tabId) {
          await sendToTab(tabId, {
            type: 'ACTIVATE',
            payload: { projectName: project.title, sessionId: project.id, shareUrl: '' },
          });
        }
        return { ok: true, project };
      }

      case 'STOP_REVIEW': {
        state.project = null;
        state.nikkels = [];
        state.mode = 'idle';
        await saveState();
        if (msg.payload?.tabId) {
          await sendToTab(msg.payload.tabId, { type: 'DEACTIVATE' });
        }
        return { ok: true };
      }

      case 'SUBMIT_NIKKEL': {
        if (!state.project) throw new Error('No active project');
        const d = msg.payload.nikkel;
        const saved = await api.submitNikkel({
          project_id: state.project.id,
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
        }, state.token);
        state.nikkels.push(saved);
        await saveState();
        try { await chrome.tabs.sendMessage(sender.tab.id, { type: 'PIN_CONFIRMED', payload: { nikkel: saved } }); } catch {}
        return { ok: true };
      }

      case 'GET_NIKKELS': {
        if (!state.project) return { ok: true, nikkels: [] };
        const nikkels = await api.getProjectNikkels(state.project.id, state.token);
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
        state.user = { id: userInfo.id, email: userInfo.email, name: userInfo.user_metadata?.name, is_anonymous: false };
        state.token = accessToken;
        state.refreshToken = refreshToken;
        state.isAnonymous = false;
        if (pendingShare && state.project) {
          const shareUrl = `https://nikkel.app/s/${state.project.id}`;
          pendingShare = false;
          await saveState();
          return { ok: true, user: state.user, shareUrl };
        }
        await saveState();
        return { ok: true, user: state.user };
      }

      case 'ACTIVATE_TAB': {
        if (state.project && msg.payload?.tabId) {
          await sendToTab(msg.payload.tabId, {
            type: 'ACTIVATE',
            payload: { projectName: state.project.title, sessionId: state.project.id, shareUrl: '' },
          });
        }
        return { ok: true };
      }

      case 'MODE_CHANGED': {
        state.mode = msg.payload.mode;
        await saveState();
        return { ok: true };
      }

      case 'TOGGLE_DISABLED': {
        state.globalDisabled = msg.payload?.disabled;
        if (state.globalDisabled) {
          const tabId = msg.payload?.tabId;
          if (tabId) await sendToTab(tabId, { type: 'DEACTIVATE' });
          state.project = null;
          state.nikkels = [];
          state.mode = 'idle';
        }
        await saveState();
        return { ok: true, globalDisabled: state.globalDisabled };
      }

      case 'SIGN_OUT': {
        state.user = null;
        state.token = null;
        state.refreshToken = null;
        state.project = null;
        state.nikkels = [];
        state.mode = 'idle';
        state.isAnonymous = false;
        await saveState();
        if (msg.payload?.tabId) {
          await sendToTab(msg.payload.tabId, { type: 'DEACTIVATE' });
        }
        return { ok: true };
      }

      default:
        return { ok: false, error: 'Unknown message type' };
    }
  };

  handle().then((result) => {
    const nt = api.getToken();
    if (nt && nt !== state.token) {
      state.token = nt;
      state.refreshToken = api.getRefreshToken();
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
