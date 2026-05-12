const API = '';

// ── State ──
let me = null;
let peer = null;
let ws = null;
let users = [];
let recentChats = [];
let unreadCounts = {};
let onlineUsers = new Set();
let sidebarMode = 'chats';
let myTypingTimer = null;
let typingHideTimer = null;

// ── DOM ──
const authOverlay    = document.getElementById('auth-overlay');
const authForm       = document.getElementById('auth-form');
const authInput      = document.getElementById('auth-input');
const authError      = document.getElementById('auth-error');
const app            = document.getElementById('app');
const myAvatar       = document.getElementById('my-avatar');
const myUsername     = document.getElementById('my-username');
const logoutBtn      = document.getElementById('logout-btn');
const newChatBtn     = document.getElementById('new-chat-btn');
const searchInput    = document.getElementById('search-input');
const usersList      = document.getElementById('users-list');
const sidebarLabel   = document.getElementById('sidebar-label');
const emptyState     = document.getElementById('empty-state');
const conversation   = document.getElementById('conversation');
const peerAvatar     = document.getElementById('peer-avatar');
const peerOnlineDot  = document.getElementById('peer-online-dot');
const peerName       = document.getElementById('peer-name');
const peerStatus     = document.getElementById('peer-status');
const messagesEl     = document.getElementById('messages');
const msgForm        = document.getElementById('msg-form');
const msgInput       = document.getElementById('msg-input');
const sendBtn        = document.getElementById('send-btn');
const attachBtn      = document.getElementById('attach-btn');
const fileInput      = document.getElementById('file-input');
const typingIndicator = document.getElementById('typing-indicator');

// ── Utils ──
const initial = name => name.charAt(0).toUpperCase();

const avatarColor = name => {
  const colors = ['#5865f2','#eb459e','#57f287','#3ba55d','#ed4245','#faa61a','#00b0f4'];
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff;
  return colors[Math.abs(h) % colors.length];
};

function setAvatar(el, name) {
  el.textContent = initial(name);
  el.style.background = avatarColor(name);
}

function makeAvatar(name, size = 40) {
  const el = document.createElement('div');
  el.className = 'avatar';
  el.style.cssText = `width:${size}px;height:${size}px;font-size:${size * 0.4}px`;
  setAvatar(el, name);
  return el;
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatSidebarTime(iso) {
  if (!iso) return '';
  const d = new Date(iso), now = new Date(), diff = now - d;
  if (diff < 86400000) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diff < 604800000) return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()];
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function formatDay(iso) {
  const d = new Date(iso), diff = Math.floor((new Date() - d) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function formatLastSeen(iso) {
  if (!iso) return '';
  const d = new Date(iso), diff = new Date() - d;
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `today at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

// ── API ──
async function apiPost(path, body) {
  const res = await fetch(API + path, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
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
authForm.addEventListener('submit', async e => {
  e.preventDefault();
  const username = authInput.value.trim();
  if (!username) return;
  authError.textContent = '';
  try {
    const existing = await apiGet(`/users/by-username/${encodeURIComponent(username)}`).catch(() => null);
    me = existing || await apiPost('/users/register', { username });
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
  loadSidebar();
}

logoutBtn.addEventListener('click', () => { localStorage.removeItem('vibe_user'); location.reload(); });

// ── WebSocket ──
function connectWS() {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  ws = new WebSocket(`${proto}://${location.host}/ws/${me.id}`);

  ws.addEventListener('message', e => {
    const msg = JSON.parse(e.data);
    switch (msg.type) {
      case 'online_list':
        onlineUsers = new Set(msg.user_ids);
        refreshOnlineUI();
        break;
      case 'status':
        msg.online ? onlineUsers.add(msg.user_id) : onlineUsers.delete(msg.user_id);
        refreshOnlineUI();
        if (peer?.id === msg.user_id) updatePeerStatus();
        break;
      case 'typing':
        if (peer?.id === msg.sender_id) showTyping();
        break;
      case 'stop_typing':
        if (peer?.id === msg.sender_id) hideTyping();
        break;
      case 'sent':
        if (peer?.id === msg.receiver_id) appendMessage(msg);
        upsertRecentChat(msg);
        renderSidebar();
        break;
      case 'received':
        if (peer?.id === msg.sender_id) { hideTyping(); appendMessage(msg); }
        else unreadCounts[msg.sender_id] = (unreadCounts[msg.sender_id] || 0) + 1;
        upsertRecentChat(msg);
        renderSidebar();
        break;
      case 'reaction_update':
        updateMessageReactions(msg);
        break;
    }
  });

  ws.addEventListener('close', () => setTimeout(connectWS, 2000));
}

// ── Sidebar ──
async function loadSidebar() {
  [users, recentChats] = await Promise.all([
    apiGet('/users/'),
    apiGet(`/messages/recent?user_id=${me.id}`).catch(() => []),
  ]);
  renderSidebar();
}

function renderSidebar() {
  const query = searchInput.value.toLowerCase();
  if (query) {
    sidebarLabel.textContent = 'Search Results';
    renderUsersList(users.filter(u => u.id !== me.id && u.username.toLowerCase().includes(query)));
    return;
  }
  if (sidebarMode === 'users') {
    sidebarLabel.textContent = 'New Chat';
    renderUsersList(users.filter(u => u.id !== me.id));
    return;
  }
  sidebarLabel.textContent = 'Messages';
  recentChats.length > 0
    ? renderChatList(recentChats)
    : renderUsersList(users.filter(u => u.id !== me.id));
}

function renderChatList(chats) {
  usersList.innerHTML = '';
  chats.forEach(chat => {
    const li = document.createElement('li');
    li.className = 'chat-item' + (peer?.id === chat.user_id ? ' active' : '');
    li.dataset.userId = chat.user_id;

    const av = makeAvatar(chat.username);
    if (onlineUsers.has(chat.user_id)) av.classList.add('online-ring');

    const body = document.createElement('div');
    body.className = 'chat-item-body';

    const top = document.createElement('div');
    top.className = 'chat-item-top';
    const nameEl = document.createElement('span');
    nameEl.className = 'chat-item-name';
    nameEl.textContent = chat.username;
    const timeEl = document.createElement('span');
    timeEl.className = 'chat-item-time' + (unreadCounts[chat.user_id] ? ' unread-time' : '');
    timeEl.textContent = formatSidebarTime(chat.last_message_at);
    top.append(nameEl, timeEl);

    const bottom = document.createElement('div');
    bottom.className = 'chat-item-bottom';
    const preview = document.createElement('span');
    preview.className = 'chat-item-preview';
    const prefix = chat.last_message_sender_id === me.id ? 'You: ' : '';
    preview.textContent = chat.last_message_type === 'image'
      ? prefix + '📷 Photo'
      : prefix + (chat.last_message || '');

    bottom.appendChild(preview);
    const unread = unreadCounts[chat.user_id];
    if (unread) {
      const badge = document.createElement('span');
      badge.className = 'unread-badge';
      badge.textContent = unread;
      bottom.appendChild(badge);
    }

    body.append(top, bottom);
    li.append(av, body);
    li.addEventListener('click', () => { sidebarMode = 'chats'; openChat({ id: chat.user_id, username: chat.username }); });
    usersList.appendChild(li);
  });
}

function renderUsersList(list) {
  usersList.innerHTML = '';
  list.forEach(u => {
    const li = document.createElement('li');
    li.className = 'chat-item' + (peer?.id === u.id ? ' active' : '');
    li.dataset.userId = u.id;

    const av = makeAvatar(u.username);
    if (onlineUsers.has(u.id)) av.classList.add('online-ring');

    const body = document.createElement('div');
    body.className = 'chat-item-body';
    const nameEl = document.createElement('span');
    nameEl.className = 'chat-item-name';
    nameEl.style.lineHeight = '40px';
    nameEl.textContent = u.username;
    body.appendChild(nameEl);

    li.append(av, body);
    li.addEventListener('click', () => { sidebarMode = 'chats'; openChat(u); });
    usersList.appendChild(li);
  });
}

newChatBtn.addEventListener('click', () => {
  sidebarMode = sidebarMode === 'users' ? 'chats' : 'users';
  searchInput.value = '';
  renderSidebar();
});
searchInput.addEventListener('input', renderSidebar);

// ── Online status ──
function refreshOnlineUI() {
  document.querySelectorAll('[data-user-id]').forEach(li => {
    const uid = parseInt(li.dataset.userId);
    const av = li.querySelector('.avatar');
    if (av) av.classList.toggle('online-ring', onlineUsers.has(uid));
  });
}

function updatePeerStatus() {
  if (!peer) return;
  if (onlineUsers.has(peer.id)) {
    peerStatus.textContent = 'online';
    peerStatus.className = 'peer-status online';
    peerOnlineDot.classList.remove('hidden');
  } else {
    peerOnlineDot.classList.add('hidden');
    apiGet(`/users/${peer.id}`).then(u => {
      peerStatus.textContent = u.last_seen ? `last seen ${formatLastSeen(u.last_seen)}` : '';
      peerStatus.className = 'peer-status';
    }).catch(() => {});
  }
}

// ── Typing ──
msgInput.addEventListener('input', () => {
  if (!peer || ws?.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify({ type: 'typing', receiver_id: peer.id }));
  clearTimeout(myTypingTimer);
  myTypingTimer = setTimeout(() => {
    if (ws?.readyState === WebSocket.OPEN)
      ws.send(JSON.stringify({ type: 'stop_typing', receiver_id: peer.id }));
  }, 1500);
});

function showTyping() {
  typingIndicator.classList.remove('hidden');
  clearTimeout(typingHideTimer);
  typingHideTimer = setTimeout(hideTyping, 3000);
}
function hideTyping() { typingIndicator.classList.add('hidden'); }

// ── Recent chats ──
function upsertRecentChat(msg) {
  const otherId = msg.sender_id === me.id ? msg.receiver_id : msg.sender_id;
  const other = users.find(u => u.id === otherId);
  if (!other) return;
  const idx = recentChats.findIndex(c => c.user_id === otherId);
  const entry = {
    user_id: otherId, username: other.username,
    last_message: msg.content, last_message_type: msg.message_type,
    last_message_at: msg.created_at, last_message_sender_id: msg.sender_id,
  };
  if (idx >= 0) recentChats.splice(idx, 1);
  recentChats.unshift(entry);
}

// ── Chat ──
async function openChat(user) {
  peer = user;
  delete unreadCounts[user.id];

  usersList.querySelectorAll('li').forEach(li => li.classList.remove('active'));
  usersList.querySelector(`[data-user-id="${user.id}"]`)?.classList.add('active');

  setAvatar(peerAvatar, user.username);
  peerName.textContent = user.username;
  hideTyping();
  updatePeerStatus();

  emptyState.classList.add('hidden');
  conversation.classList.remove('hidden');
  messagesEl.innerHTML = '';
  msgInput.focus();

  const history = await apiGet(`/messages/${user.id}?user_id=${me.id}&limit=100`);
  renderHistory(history.messages);
  renderSidebar();
}

function renderHistory(messages) {
  messagesEl.innerHTML = '';
  let lastDay = null;
  messages.forEach(msg => {
    const day = formatDay(msg.created_at);
    if (day !== lastDay) {
      const div = document.createElement('div');
      div.className = 'day-divider'; div.textContent = day;
      messagesEl.appendChild(div); lastDay = day;
    }
    appendMessage(msg, false);
  });
  scrollBottom();
}

const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

function appendMessage(msg, scroll = true) {
  const sent = msg.sender_id === me.id;
  const row = document.createElement('div');
  row.className = `msg-row ${sent ? 'sent' : 'received'}`;
  row.dataset.messageId = msg.id;

  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble';

  if (msg.message_type === 'image' && msg.media_data) {
    const img = document.createElement('img');
    img.src = msg.media_data; img.className = 'msg-image'; img.loading = 'lazy';
    img.addEventListener('click', () => window.open(msg.media_data, '_blank'));
    bubble.appendChild(img);
  } else {
    bubble.textContent = msg.content;
  }

  bubble.addEventListener('contextmenu', e => { e.preventDefault(); showReactionMenu(e, msg.id); });

  const time = document.createElement('div');
  time.className = 'msg-time'; time.textContent = formatTime(msg.created_at);

  row.append(bubble, time);
  messagesEl.appendChild(row);
  renderReactions(msg.reactions || {}, msg.id, row);
  if (scroll) scrollBottom();
}

// ── Reaction context menu ──
function showReactionMenu(e, messageId) {
  document.getElementById('reaction-menu')?.remove();

  const menu = document.createElement('div');
  menu.id = 'reaction-menu';
  menu.className = 'reaction-menu';

  REACTION_EMOJIS.forEach(emoji => {
    const btn = document.createElement('button');
    btn.textContent = emoji;
    btn.title = emoji;
    btn.addEventListener('click', e => {
      e.stopPropagation();
      sendReaction(messageId, emoji);
      menu.remove();
    });
    menu.appendChild(btn);
  });

  document.body.appendChild(menu);

  // Smart positioning — keep inside viewport
  const vw = window.innerWidth, vh = window.innerHeight;
  const mw = 290, mh = 52;
  menu.style.left = Math.min(e.clientX, vw - mw - 8) + 'px';
  menu.style.top  = (e.clientY + mh + 8 > vh ? e.clientY - mh - 8 : e.clientY + 8) + 'px';

  setTimeout(() => document.addEventListener('click', () => menu.remove(), { once: true }), 0);
}

function sendReaction(messageId, emoji) {
  if (ws?.readyState === WebSocket.OPEN)
    ws.send(JSON.stringify({ type: 'reaction', message_id: messageId, emoji }));
}

// ── Render reactions under a message row ──
function renderReactions(reactions, messageId, row) {
  row.querySelector('.reactions')?.remove();
  if (!reactions || Object.keys(reactions).length === 0) return;

  const container = document.createElement('div');
  container.className = 'reactions';

  Object.entries(reactions).forEach(([emoji, userIds]) => {
    const pill = document.createElement('button');
    pill.className = 'reaction-pill' + (userIds.includes(me.id) ? ' mine' : '');
    pill.innerHTML = `<span>${emoji}</span><span>${userIds.length}</span>`;
    pill.title = `${emoji} ${userIds.length}`;
    pill.addEventListener('click', () => sendReaction(messageId, emoji));
    container.appendChild(pill);
  });

  // Insert after time element so reactions appear below it
  const time = row.querySelector('.msg-time');
  time ? time.insertAdjacentElement('afterend', container) : row.appendChild(container);
}

// ── Update reactions in-place for an existing message ──
function updateMessageReactions(msg) {
  const row = messagesEl.querySelector(`[data-message-id="${msg.id}"]`);
  if (row) renderReactions(msg.reactions || {}, msg.id, row);
}

function scrollBottom() { messagesEl.scrollTop = messagesEl.scrollHeight; }

// ── Send text ──
msgForm.addEventListener('submit', e => {
  e.preventDefault();
  const content = msgInput.value.trim();
  if (!content || !peer || ws?.readyState !== WebSocket.OPEN) return;
  clearTimeout(myTypingTimer);
  ws.send(JSON.stringify({ type: 'stop_typing', receiver_id: peer.id }));
  ws.send(JSON.stringify({ content, receiver_id: peer.id, message_type: 'text' }));
  msgInput.value = '';
  msgInput.focus();
});

// ── Send image ──
attachBtn.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', () => {
  const file = fileInput.files[0];
  if (!file || !peer || ws?.readyState !== WebSocket.OPEN) return;
  if (!file.type.startsWith('image/')) return alert('Only images are supported');
  if (file.size > 2 * 1024 * 1024) return alert('Image too large (max 2 MB)');

  const reader = new FileReader();
  reader.onload = () => {
    ws.send(JSON.stringify({ content: '', receiver_id: peer.id, message_type: 'image', media_data: reader.result }));
  };
  reader.readAsDataURL(file);
  fileInput.value = '';
});

// ── Boot ──
const saved = localStorage.getItem('vibe_user');
if (saved) {
  try {
    me = JSON.parse(saved);
    apiGet(`/users/${me.id}`)
      .then(u => { me = u; showApp(); })
      .catch(() => { localStorage.removeItem('vibe_user'); });
  } catch { localStorage.removeItem('vibe_user'); }
}
