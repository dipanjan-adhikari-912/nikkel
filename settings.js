const $ = (id) => document.getElementById(id);

async function bg(msg) {
  try { return await chrome.runtime.sendMessage(msg); } catch { return { ok: false, error: 'Extension context lost.' }; }
}

function showMsg(msg, type) {
  const el = $('globalMsg');
  el.textContent = msg;
  el.className = 'msg msg-' + type;
}

function clearMsg() {
  $('globalMsg').className = 'msg';
  $('globalMsg').textContent = '';
}

function showError(msg) {
  console.error('[Settings]', msg);
  showMsg(msg, 'error');
}

async function loadProfile() {
  const res = await bg({ type: 'GET_USER_PROFILE' });
  if (!res.ok) {
    showError(res.error || 'Failed to load profile');
    return null;
  }
  return res;
}

function renderProviders(identities) {
  const list = $('providersList');
  const providers = identities || [];
  if (providers.length === 0) {
    list.innerHTML = '<div class="row" style="border:none"><div class="value" style="color:#64748b">No connected accounts</div></div>';
    return;
  }
  list.innerHTML = providers.map(p => {
    const provider = p.provider || p.provider_id || 'unknown';
    const label = provider.charAt(0).toUpperCase() + provider.slice(1);
    const icon = provider === 'google'
      ? '<svg width="14" height="14" viewBox="0 0 48 48" style="vertical-align:middle"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.54 28.59A14.5 14.5 0 0 1 9.5 24c0-1.59.28-3.14.76-4.59l-7.98-6.19A23.99 23.99 0 0 0 0 24c0 3.77.87 7.35 2.56 10.56l7.98-5.97z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 5.97C6.51 42.62 14.62 48 24 48z"/></svg>'
      : '<span style="font-size:14px">✉</span>';
    const email = p.email || p.identity_data?.email || '';
    return `<div class="row" style="border:none"><div class="provider-tag ${provider}">${icon} ${label}</div><div class="value">${email}</div></div>`;
  }).join('');
}

async function init() {
  const res = await loadProfile();
  if (!res) return;

  $('loadingView').style.display = 'none';
  $('mainContent').style.display = 'block';

  const user = res.user || {};
  const identities = res.identities || [];
  const meta = user.user_metadata || {};

  const displayName = meta.full_name || meta.name || '';
  $('displayNameInput').value = displayName;

  const email = user.email || '';
  $('emailValue').textContent = email || '—';

  const confirmed = user.email_confirmed_at;
  const verifiedRow = $('verifiedRow');
  if (email) {
    verifiedRow.style.display = 'flex';
    $('verifiedValue').innerHTML = confirmed
      ? '<span class="verified">✓ Verified</span>'
      : '<span class="unverified">⚠ Not verified — check your inbox</span>';
  } else {
    verifiedRow.style.display = 'none';
  }

  renderProviders(identities);
}

$('backBtn').addEventListener('click', () => {
  if (history.length > 1) {
    history.back();
  } else {
    window.close();
  }
});

$('saveNameBtn').addEventListener('click', async () => {
  clearMsg();
  const fullName = $('displayNameInput').value.trim();
  if (!fullName) { showError('Display name is required'); return; }
  $('saveNameBtn').disabled = true;
  $('saveNameBtn').textContent = 'Saving…';
  const res = await bg({ type: 'UPDATE_PROFILE', payload: { fullName } });
  $('saveNameBtn').disabled = false;
  $('saveNameBtn').textContent = 'Save';
  if (res.ok) {
    showMsg('Display name updated', 'success');
  } else {
    showError(res.error || 'Failed to update display name');
  }
});

$('changePwdBtn').addEventListener('click', async () => {
  clearMsg();
  const newPassword = $('newPasswordInput').value;
  if (!newPassword || newPassword.length < 6) { showError('Password must be at least 6 characters'); return; }
  $('changePwdBtn').disabled = true;
  $('changePwdBtn').textContent = 'Changing…';
  const res = await bg({ type: 'CHANGE_PASSWORD', payload: { newPassword } });
  $('changePwdBtn').disabled = false;
  $('changePwdBtn').textContent = 'Change';
  if (res.ok) {
    $('newPasswordInput').value = '';
    showMsg('Password changed successfully', 'success');
  } else {
    showError(res.error || 'Failed to change password');
  }
});

$('forgotPwdLink').addEventListener('click', async () => {
  clearMsg();
  const email = $('emailValue').textContent;
  if (!email || email === '—') { showError('No email address on file'); return; }
  $('forgotPwdLink').style.pointerEvents = 'none';
  $('forgotPwdLink').style.opacity = '.5';
  const res = await bg({ type: 'FORGOT_PASSWORD', payload: { email } });
  $('forgotPwdLink').style.pointerEvents = '';
  $('forgotPwdLink').style.opacity = '';
  if (res.ok) {
    showMsg('Password reset email sent to ' + email, 'success');
  } else {
    showError(res.error || 'Failed to send reset email');
  }
});

$('signOutSettingsBtn').addEventListener('click', async () => {
  clearMsg();
  await bg({ type: 'SIGN_OUT' });
  window.close();
});

init();
