const SUPABASE_URL = 'https://ptyogubndwyanjaenmzy.supabase.co';
const SUPABASE_ANON = 'sb_publishable_rIIjNoFOiD5H7qhJMUPO3Q_Sjr9rsdl';

document.getElementById('dbUrl').textContent = SUPABASE_URL;
document.getElementById('dbKey').textContent = SUPABASE_ANON.slice(0, 24) + '…';

let token = null;
let projectId = null;
let passCount = 0, failCount = 0;

async function sfetch(path, opts = {}) {
  const { token: t, prefer, ...rest } = opts;
  const headers = { apikey: SUPABASE_ANON, 'Content-Type': 'application/json' };
  if (t) headers['Authorization'] = `Bearer ${t}`;
  if (prefer) headers['Prefer'] = prefer;
  const res = await fetch(SUPABASE_URL + path, { ...rest, headers });
  if (!res.ok) {
    let msg = res.statusText;
    try { const e = await res.json(); msg = e.message || e.error || e.msg || msg; } catch {}
    throw new Error(msg);
  }
  if (res.status === 204 || res.status === 201) {
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  }
  return res.json();
}

function log(type, label, detail) {
  const time = new Date().toLocaleTimeString();
  const cls = type === 'ok' ? 'log-ok' : type === 'err' ? 'log-err' : 'log-info';
  const entry = document.createElement('div');
  entry.className = 'log-entry';
  let d = '';
  if (detail) {
    if (typeof detail === 'object') {
      try { d = JSON.stringify(detail, null, 2); } catch { d = String(detail); }
    } else {
      d = String(detail);
    }
  }
  entry.innerHTML = `<span class="log-time">[${time}]</span> <span class="${cls}">${label}</span>${d ? `<div class="log-detail">${d}</div>` : ''}`;
  document.getElementById('log').prepend(entry);
  if (type === 'ok') { passCount++; document.getElementById('testPassed').textContent = passCount; }
  if (type === 'err') { failCount++; document.getElementById('testFailed').textContent = failCount; }
  document.getElementById('testCount').textContent = passCount + failCount;
}

function disableAll(v) {
  document.querySelectorAll('button[data-test], #runAll').forEach(b => b.disabled = v);
}

const tests = {
  async anonSignIn() {
    const data = await sfetch('/auth/v1/signup', { method: 'POST', body: '{}' });
    token = data.access_token;
    log('ok', 'anonSignIn', { user: data.user.id, is_anonymous: data.user.is_anonymous });
  },
  async getProjects() {
    if (!token) throw new Error('Sign in first');
    const data = await sfetch('/rest/v1/projects?select=*&order=created_at.desc', { token });
    log('ok', 'getProjects', { count: data.length, projects: data });
  },
  async createProject() {
    if (!token) throw new Error('Sign in first');
    const data = await sfetch('/rest/v1/projects', {
      method: 'POST', token, prefer: 'return=representation',
      body: JSON.stringify({ title: 'Debug Project ' + Date.now(), base_url: 'https://example.com' }),
    });
    const p = Array.isArray(data) ? data[0] : data;
    projectId = p.id;
    log('ok', 'createProject', { id: p.id, title: p.title, base_url: p.base_url });
  },
  async submitNikkel() {
    if (!token) throw new Error('Sign in first');
    if (!projectId) throw new Error('Create a project first');
    const existing = await sfetch(`/rest/v1/nikkels?project_id=eq.${projectId}&select=id`, { token });
    const idx = (existing || []).length + 1;
    const data = await sfetch('/rest/v1/nikkels', {
      method: 'POST', token, prefer: 'return=representation',
      body: JSON.stringify({ project_id: projectId, x: 400, y: 300, dom_selector: '.cta', tag: 'button', element_text: 'Click Me', comment: 'Debug pin ' + idx, idx }),
    });
    const n = Array.isArray(data) ? data[0] : data;
    log('ok', 'submitNikkel', { id: n.id, idx: n.idx, comment: n.comment });
  },
  async getNikkels() {
    if (!token) throw new Error('Sign in first');
    if (!projectId) throw new Error('Create a project first');
    const data = await sfetch(`/rest/v1/nikkels?project_id=eq.${projectId}&order=idx.asc`, { token });
    log('ok', 'getNikkels', { count: data.length, nikkels: data });
  },
};

async function runTest(name) {
  const btn = document.querySelector(`[data-test="${name}"]`);
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span>';
  }
  try {
    await tests[name]();
  } catch (e) {
    log('err', name, e.message);
  }
  if (btn) {
    btn.disabled = false;
    btn.textContent = name === 'anonSignIn' ? 'Anon Sign In' :
      name === 'getProjects' ? 'Get Projects' :
      name === 'createProject' ? 'Create Project' :
      name === 'submitNikkel' ? 'Submit Nikkel' : 'Get Nikkels';
  }
}

document.querySelectorAll('[data-test]').forEach(btn => {
  btn.addEventListener('click', () => runTest(btn.dataset.test));
});

document.getElementById('runAll').addEventListener('click', async () => {
  const order = ['anonSignIn', 'getProjects', 'createProject', 'submitNikkel', 'getNikkels'];
  disableAll(true);
  document.getElementById('runAll').innerHTML = '<span class="spinner"></span> Running…';
  for (const name of order) {
    await runTest(name);
  }
  disableAll(false);
  document.getElementById('runAll').textContent = '▶ Run All Tests';
});

document.getElementById('clearBtn').addEventListener('click', () => {
  document.getElementById('log').innerHTML = '';
});
