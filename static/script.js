const API = '';  // same origin

// ── State ──
let me = null;       // { id, username }
let peer = null;     // { id, username }
let ws = null;
let users = [];

// ── DOM ──
const authOverlay  = document.getElementById('auth-overlay');
const authForm     = document.getElementById('auth-form');
const authInput    = document.getElementById('auth-input');
const authError    = document.getElementById('auth-error');
const app          = document.getElementById('app');
const myAvatar     = document.getElementById('my-avatar');
const myUsername   = document.getElementById('my-username');
const logoutBtn    = document.getElementById('logout-btn');
const searchInput  = document.getElementById('search-input');
const usersList    = document.getElementById('users-list');
const emptyState   = document.getElementById('empty-state');
const conversation = document.getElementById('conversation');
const peerAvatar   = document.getElementById('peer-avatar');
const peerName     = document.getElementById('peer-name');
const peerStatus   = document.getElementById('peer-status');
const messagesEl   = document.getElementById('messages');
const msgForm      = document.getElementById('msg-form');
const msgInput     = document.getElementById('msg-input');
const sendBtn      = document.getElementById('send-btn');

// ── Utils ──
const initial = name => name.charAt(0).toUpperCase();

const avatarColor = name => {
  const colors = ['#5865f2','#eb459e','#57f287','#fee75c','#ed4245','#3ba55d','#faa61a'];
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff;
  return colors[Math.abs(h) % colors.length];
};

function setAvatar(el, name) {
  el.textContent = initial(name);
  el.style.background = avatarColor(name);
}

function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDay(iso) {
  const d = new Date(iso);
  const today = new Date();
  const diff = Math.floor((today - d) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

// ── API helpers ──
async function apiPost(path, body) {
  const res = await fetch(API + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Request failed');
  return data;
}

async function apiGet(path) {
  const res = await fetch(API + path);
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Request failed');
  return data;
}

// ── Auth ──
async function login(username) {
  const existing = await apiGet(`/users/by-username/${encodeURIComponent(username)}`).catch(() => null);
  if (existing) return existing;
  return await apiPost('/users/register', { username });
}

authForm.addEventListener('submit', async e => {
  e.preventDefault();
  const username = authInput.value.trim();
  if (!username) return;
  authError.textContent = '';
  try {
    me = await login(username);
    localStorage.setItem('vibe_user', JSON.stringify(me));
    showApp();
  } catch (err) {
    authError.textContent = err.message;
  }
});

function showApp() {
  authOverlay.classList.add('hidden');
  app.classList.remove('hidden');
  myUsername.textContent = me.username;
  setAvatar(myAvatar, me.username);
  connectWS();
  loadUsers();
}

logoutBtn.addEventListener('click', () => {
  localStorage.removeItem('vibe_user');
  location.reload();
});

// ── WebSocket ──
function connectWS() {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  ws = new WebSocket(`${proto}://${location.host}/ws/${me.id}`);

  ws.addEventListener('message', e => {
    const msg = JSON.parse(e.data);
    if (msg.type === 'error') return;

    const isActive =
      peer &&
      ((msg.type === 'sent'     && msg.receiver_id === peer.id) ||
       (msg.type === 'received' && msg.sender_id   === peer.id));

    if (isActive) appendMessage(msg);
    else if (msg.type === 'received') markUnread(msg.sender_id);
  });

  ws.addEventListener('close', () => {
    setTimeout(connectWS, 2000);
  });
}

// ── Users ──
async function loadUsers() {
  users = await apiGet('/users/');
  renderUsers(users);
}

function renderUsers(list) {
  usersList.innerHTML = '';
  list
    .filter(u => u.id !== me.id)
    .forEach(u => {
      const li = document.createElement('li');
      if (peer && peer.id === u.id) li.classList.add('active');

      const av = document.createElement('div');
      av.className = 'avatar';
      av.style.width = '36px'; av.style.height = '36px'; av.style.fontSize = '15px';
      setAvatar(av, u.username);

      const info = document.createElement('div');
      info.style.display = 'flex'; info.style.flexDirection = 'column'; info.style.gap = '2px'; info.style.overflow = 'hidden';

      const name = document.createElement('span');
      name.className = 'name'; name.textContent = u.username;

      info.appendChild(name);
      li.appendChild(av);
      li.appendChild(info);
      li.dataset.userId = u.id;
      li.addEventListener('click', () => openChat(u));
      usersList.appendChild(li);
    });
}

searchInput.addEventListener('input', () => {
  const q = searchInput.value.toLowerCase();
  renderUsers(q ? users.filter(u => u.username.toLowerCase().includes(q)) : users);
});

function markUnread(senderId) {
  const li = usersList.querySelector(`[data-user-id="${senderId}"]`);
  if (!li) return;
  let badge = li.querySelector('.unread');
  if (!badge) {
    badge = document.createElement('span');
    badge.className = 'unread';
    li.appendChild(badge);
  }
  badge.textContent = (parseInt(badge.textContent || '0') + 1).toString();
}

// ── Chat ──
async function openChat(user) {
  peer = user;

  // Update sidebar active state
  usersList.querySelectorAll('li').forEach(li => li.classList.remove('active'));
  const li = usersList.querySelector(`[data-user-id="${user.id}"]`);
  if (li) {
    li.classList.add('active');
    const badge = li.querySelector('.unread');
    if (badge) badge.remove();
  }

  setAvatar(peerAvatar, user.username);
  peerName.textContent = user.username;
  peerStatus.textContent = '';
  peerStatus.className = 'peer-status';

  emptyState.classList.add('hidden');
  conversation.classList.remove('hidden');
  messagesEl.innerHTML = '';
  msgInput.focus();

  const history = await apiGet(`/messages/${user.id}?user_id=${me.id}&limit=100`);
  renderHistory(history.messages);
}

function renderHistory(messages) {
  messagesEl.innerHTML = '';
  let lastDay = null;
  messages.forEach(msg => {
    const day = formatDay(msg.created_at);
    if (day !== lastDay) {
      const div = document.createElement('div');
      div.className = 'day-divider'; div.textContent = day;
      messagesEl.appendChild(div);
      lastDay = day;
    }
    appendMessage(msg, false);
  });
  scrollBottom();
}

function appendMessage(msg, scroll = true) {
  const sent = msg.sender_id === me.id;
  const row = document.createElement('div');
  row.className = `msg-row ${sent ? 'sent' : 'received'}`;

  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble';
  bubble.textContent = msg.content;

  const time = document.createElement('div');
  time.className = 'msg-time';
  time.textContent = formatTime(msg.created_at);

  row.appendChild(bubble);
  row.appendChild(time);
  messagesEl.appendChild(row);
  if (scroll) scrollBottom();
}

function scrollBottom() {
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

// ── Send message ──
msgForm.addEventListener('submit', e => {
  e.preventDefault();
  const content = msgInput.value.trim();
  if (!content || !peer || !ws || ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify({ content, receiver_id: peer.id }));
  msgInput.value = '';
  msgInput.focus();
});

// ── Boot ──
const saved = localStorage.getItem('vibe_user');
if (saved) {
  try {
    me = JSON.parse(saved);
    // Re-validate user still exists
    apiGet(`/users/${me.id}`)
      .then(u => { me = u; showApp(); })
      .catch(() => { localStorage.removeItem('vibe_user'); });
  } catch {
    localStorage.removeItem('vibe_user');
  }
}
