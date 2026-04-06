// =========================================
//  MESSAGES MODULE
// =========================================

let typingTimer = null;

async function renderMessages() {
    const area = document.getElementById('content-area');
    area.style.padding = '0';
    activeChat = null;

    try {
        const [dmUsers, myGroups] = await Promise.all([
            api('GET', '/messages/users'),
            api('GET', '/messages/groups')
        ]);

        area.innerHTML = `
      <div class="chat-layout">
        <div class="chat-sidebar">
          <div class="chat-tab-switcher">
            <button class="chat-tab active" id="tab-dm">Direct</button>
            <button class="chat-tab" id="tab-group">Groups</button>
          </div>
          <div class="chat-sidebar-header">
            <div class="chat-search-container">
              <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input class="chat-search" id="chat-search" placeholder="Search..." />
            </div>
          </div>
          <div class="chat-list" id="chat-list"></div>
        </div>
        <div class="chat-main" id="chat-main">
          <div class="chat-no-selection">
            <div class="no-selection-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="color:var(--primary-light);opacity:0.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            </div>
            <div style="font-size:16px;font-weight:600;color:var(--text-primary)">Select a conversation</div>
            <div style="font-size:13px">All messages are monitored for academic content</div>
            <div style="margin-top:16px;font-size:12px;display:flex;align-items:center;gap:6px;background:rgba(0,171,228,0.05);border:1px solid rgba(0,171,228,0.1);color:var(--primary);padding:8px 16px;border-radius:20px">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              End-to-end secured connection
            </div>
          </div>
        </div>
      </div>`;

        let showGroups = false;

        function renderChatList() {
            const list = document.getElementById('chat-list');
            const q = document.getElementById('chat-search').value.toLowerCase();
            if (!showGroups) {
                const filtered = dmUsers.filter(u => u.name.toLowerCase().includes(q));
                list.innerHTML = filtered.map(u => {
                    const online = onlineUsers.find(o => o.id === u.id);
                    return `<div class="chat-item" data-uid="${u.id}" data-name="${u.name}" data-role="${u.role}">
            <div class="chat-avatar">${initials(u.name)}${online ? '<div class="online-indicator"></div>' : ''}</div>
            <div class="chat-item-info">
              <div class="chat-item-name">${u.name}</div>
              <div class="chat-item-role">${u.role} • ${u.department || ''}</div>
            </div></div>`;
                }).join('') || '<div class="empty-state" style="padding:30px"><p>No contacts</p></div>';
                list.querySelectorAll('.chat-item').forEach(el =>
                    el.addEventListener('click', () => openDMChat(parseInt(el.dataset.uid), el.dataset.name, el.dataset.role))
                );
            } else {
                const filtered = myGroups.filter(g => g.name.toLowerCase().includes(q));
                const canCreate = currentUser.role !== 'student';
                list.innerHTML = (canCreate ? `<div class="chat-item" id="create-group-btn" style="justify-content:center;color:var(--primary);font-weight:600;font-size:13px"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:8px"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Create Group</div>` : '') +
                    filtered.map(g => `<div class="chat-item" data-gid="${g.id}" data-gname="${g.name}">
            <div class="chat-avatar" style="background:linear-gradient(135deg,var(--primary),#6C63FF)"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>
            <div class="chat-item-info">
              <div class="chat-item-name">${g.name}</div>
              <div class="chat-item-role">${g.description || 'Group chat'}</div>
            </div></div>`).join('') || '<div class="empty-state" style="padding:30px"><p>No groups</p></div>';
                list.querySelectorAll('.chat-item[data-gid]').forEach(el =>
                    el.addEventListener('click', () => openGroupChat(parseInt(el.dataset.gid), el.dataset.gname))
                );
                document.getElementById('create-group-btn')?.addEventListener('click', showCreateGroupModal);
            }
        }

        document.getElementById('tab-dm').addEventListener('click', () => {
            showGroups = false;
            document.getElementById('tab-dm').classList.add('active');
            document.getElementById('tab-group').classList.remove('active');
            renderChatList();
        });
        document.getElementById('tab-group').addEventListener('click', () => {
            showGroups = true;
            document.getElementById('tab-group').classList.add('active');
            document.getElementById('tab-dm').classList.remove('active');
            renderChatList();
        });
        document.getElementById('chat-search').addEventListener('input', renderChatList);
        renderChatList();
    } catch (e) {
        area.innerHTML = `<div class="empty-state"><div class="empty-icon">❌</div><p>${e.message}</p></div>`;
    }
}

async function openDMChat(userId, userName, userRole) {
    activeChat = { type: 'dm', userId };
    document.querySelectorAll('.chat-item').forEach(el => el.classList.remove('active'));
    document.querySelector(`.chat-item[data-uid="${userId}"]`)?.classList.add('active');

    const main = document.getElementById('chat-main');
    main.innerHTML = `
    <div class="chat-header">
      <div class="chat-avatar" style="width:38px;height:38px;font-size:14px">${initials(userName)}</div>
      <div class="chat-user-info">
        <div class="chat-user-name">${userName}</div>
        <div class="chat-user-status">${userRole}</div>
      </div>
      <div class="chat-security-badge"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> Filtered & Secure</div>
    </div>
    <div id="typing-indicator" class="typing-indicator" style="display:none">
      <div class="typing-dots"><span></span><span></span><span></span></div>
      <span></span>
    </div>
    <div class="chat-messages" id="chat-messages"><div class="loader"><div class="spinner"></div></div></div>
    <div class="chat-filter-notice" id="filter-notice"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> Keep messages academic</div>
    <div class="chat-input-area">
      <textarea class="chat-input" id="chat-input" placeholder='Type academic message...' rows="1"></textarea>
      <button class="chat-send-btn" id="send-btn"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polyline points="22 2 15 22 11 13 2 9 22 2"/></svg></button>
    </div>`;

    try {
        const messages = await api('GET', `/messages/dm/${userId}`);
        renderChatMessages(messages);
    } catch (e) { document.getElementById('chat-messages').innerHTML = `<div class="empty-state"><p>${e.message}</p></div>`; }

    setupChatInput({ receiverId: userId });
}

async function openGroupChat(groupId, groupName) {
    activeChat = { type: 'group', groupId };
    document.querySelectorAll('.chat-item').forEach(el => el.classList.remove('active'));
    document.querySelector(`.chat-item[data-gid="${groupId}"]`)?.classList.add('active');

    const main = document.getElementById('chat-main');
    main.innerHTML = `
    <div class="chat-header">
      <div class="chat-avatar" style="width:38px;height:38px;font-size:14px;background:linear-gradient(135deg,var(--primary),#6C63FF)"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>
      <div class="chat-user-info">
        <div class="chat-user-name">${groupName}</div>
        <div class="chat-user-status">Group Chat</div>
      </div>
      <div class="chat-security-badge"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> Monitored</div>
    </div>
    <div class="chat-messages" id="chat-messages"><div class="loader"><div class="spinner"></div></div></div>
    <div class="chat-filter-notice" id="filter-notice"></div>
    <div class="chat-input-area">
      <textarea class="chat-input" id="chat-input" placeholder="Type academic message..." rows="1"></textarea>
      <button class="chat-send-btn" id="send-btn">➤</button>
    </div>`;

    try {
        const messages = await api('GET', `/messages/group/${groupId}`);
        renderChatMessages(messages);
    } catch (e) { document.getElementById('chat-messages').innerHTML = `<div class="empty-state"><p>${e.message}</p></div>`; }

    setupChatInput({ groupId });
}

function renderChatMessages(messages) {
    const el = document.getElementById('chat-messages');
    if (!messages.length) {
        el.innerHTML = `<div class="empty-state"><div class="empty-icon">💬</div><p>No messages yet. Say hello!</p></div>`;
        return;
    }
    el.innerHTML = messages.map(m => {
        const sent = m.sender_id === currentUser.id;
        return `<div class="message-bubble ${sent ? 'sent' : 'received'}">
      <div class="msg-avatar">${initials(m.sender_name)}</div>
      <div class="msg-content">
        ${!sent ? `<div style="font-size:11px;color:var(--text-muted);margin-bottom:3px">${m.sender_name}</div>` : ''}
        <div class="msg-text">${escHtml(m.content)}</div>
        <div class="msg-time">${fmtTime(m.created_at)}</div>
      </div></div>`;
    }).join('');
    el.scrollTop = el.scrollHeight;
}

function appendMessage(msg, sent) {
    const el = document.getElementById('chat-messages');
    if (!el) return;
    const emptyState = el.querySelector('.empty-state');
    if (emptyState) emptyState.remove();
    const div = document.createElement('div');
    div.className = `message-bubble ${sent ? 'sent' : 'received'}`;
    div.innerHTML = `
    <div class="msg-avatar">${initials(msg.sender_name)}</div>
    <div class="msg-content">
      ${!sent ? `<div style="font-size:11px;color:var(--text-muted);margin-bottom:3px">${msg.sender_name}</div>` : ''}
      <div class="msg-text">${escHtml(msg.content)}</div>
      <div class="msg-time">${fmtTime(msg.created_at)}</div>
    </div>`;
    el.appendChild(div);
    el.scrollTop = el.scrollHeight;
}

function escHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function setupChatInput({ receiverId, groupId }) {
    const input = document.getElementById('chat-input');
    const btn = document.getElementById('send-btn');

    input.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });
    if (receiverId) {
        input.addEventListener('input', () => {
            socket?.emit('typing', { receiver_id: receiverId });
            clearTimeout(typingTimer);
            typingTimer = setTimeout(() => socket?.emit('stop_typing', { receiver_id: receiverId }), 1500);
        });
    }
    btn.addEventListener('click', sendMessage);

    async function sendMessage() {
        const content = input.value.trim();
        if (!content) return;
        input.value = ''; input.style.height = 'auto';
        const notice = document.getElementById('filter-notice');
        notice.style.display = 'none';

        try {
            let msg;
            if (receiverId) {
                msg = await api('POST', '/messages/dm', { receiver_id: receiverId, content });
                socket?.emit('send_dm', { receiver_id: receiverId, content, message: msg });
            } else {
                msg = await api('POST', '/messages/group', { group_id: groupId, content });
                socket?.emit('send_group', { group_id: groupId, content, message: msg });
            }
            appendMessage(msg, true);
        } catch (e) {
            if (e.data?.filtered) {
                notice.textContent = e.message;
                notice.style.display = 'block';
                if (e.data?.suspended) { toast('🚫 Account suspended!', 'error'); logout(); }
                else toast(e.message, 'warning');
                currentUser.warning_count = e.data?.warning_count || 0;
                if (currentUser.warning_count > 0) {
                    document.getElementById('warning-badge').style.display = 'flex';
                    document.getElementById('warning-count').textContent = currentUser.warning_count;
                }
            } else toast(e.message, 'error');
        }
    }
}

function showCreateGroupModal() {
    openModal(`
    <h2 class="modal-title">👥 Create Group</h2>
    <p class="modal-subtitle">Create a class or study group</p>
    <div class="form-group-mb"><label class="form-label">Group Name</label>
      <input id="m-gname" class="form-control" placeholder="e.g. CS Batch 2024 - Data Structures" /></div>
    <div class="form-group-mb"><label class="form-label">Description</label>
      <input id="m-gdesc" class="form-control" placeholder="Brief description..." /></div>
    <div class="modal-actions">
      <button class="btn" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" id="m-gcreate">Create Group</button>
    </div>`);
    document.getElementById('m-gcreate').addEventListener('click', async () => {
        try {
            await api('POST', '/messages/groups/create', {
                name: document.getElementById('m-gname').value,
                description: document.getElementById('m-gdesc').value
            });
            closeModal(); toast('Group created!', 'success'); renderMessages();
        } catch (e) { toast(e.message, 'error'); }
    });
}
