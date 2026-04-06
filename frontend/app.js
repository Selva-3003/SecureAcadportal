/* ===============================================
   EDUSECURE - MAIN APPLICATION
   =============================================== */


const API = '/api';
let currentUser = null;
let authToken = null;
let socket = null;
let activeChat = null;
let onlineUsers = [];

// ---- SESSION TIMEOUT (15 minutes inactivity) ----
const SESSION_TIMEOUT_MS = 15 * 60 * 1000;
let sessionTimer = null;

function resetSessionTimer() {
    clearTimeout(sessionTimer);
    sessionTimer = setTimeout(() => {
        if (authToken) {
            toast('⏰ Session expired due to inactivity. Please log in again.', 'warning');
            setTimeout(logout, 1500);
        }
    }, SESSION_TIMEOUT_MS);
}

function startSessionWatcher() {
    ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'].forEach(ev =>
        document.addEventListener(ev, resetSessionTimer, { passive: true })
    );
    resetSessionTimer();
}

// ---- API HELPER ----
async function api(method, path, body, isForm = false) {
    const opts = {
        method,
        headers: { Authorization: `Bearer ${authToken}` }
    };
    if (body) {
        if (isForm) { opts.body = body; }
        else { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
    }
    const res = await fetch(API + path, opts);
    const data = await res.json();
    if (!res.ok) throw { status: res.status, message: data.error || 'Request failed', data };
    return data;
}

// ---- TOAST ----
function toast(msg, type = 'info') {
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.innerHTML = `<span>${icons[type]}</span><span>${msg}</span>`;
    document.getElementById('toast-container').appendChild(el);
    setTimeout(() => el.remove(), 4000);
}

// ---- MODAL ----
function openModal(html) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'active-modal';
    overlay.innerHTML = `<div class="modal" style="position:relative">${html}</div>`;
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
    return overlay;
}
function closeModal() { document.getElementById('active-modal')?.remove(); }

// ---- FORMAT ----
function fmtDate(d) { return d ? new Date(d).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'; }
function fmtTime(d) { return d ? new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''; }
function initials(name) { return name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?'; }
function deadlineClass(dl) { return new Date(dl) < new Date() ? 'danger' : 'safe'; }
function daysLeft(dl) {
    const diff = new Date(dl) - new Date();
    if (diff < 0) return 'Overdue';
    const d = Math.ceil(diff / 86400000);
    return `${d} day${d !== 1 ? 's' : ''} left`;
}
function cgpaToGrade(c) {
    if (c >= 9) return { g: 'O', d: 'Outstanding' };
    if (c >= 8) return { g: 'A+', d: 'Excellent' };
    if (c >= 7) return { g: 'A', d: 'Very Good' };
    if (c >= 6) return { g: 'B+', d: 'Good' };
    if (c >= 5) return { g: 'B', d: 'Average' };
    return { g: 'C', d: 'Below Average' };
}

// ---- CANVAS PARTICLE ANIMATION ----
function initParticles() {
    const canvas = document.getElementById('particles-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let W, H, dots = [];

    function resize() {
        W = canvas.width = canvas.parentElement.clientWidth;
        H = canvas.height = canvas.parentElement.clientHeight;
    }
    resize();
    window.addEventListener('resize', () => { resize(); dots = []; });

    for (let i = 0; i < 55; i++) dots.push({
        x: Math.random() * 1000, y: Math.random() * 800,
        vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4,
        r: Math.random() * 1.5 + 0.5,
        a: Math.random()
    });

    function draw() {
        ctx.clearRect(0, 0, W, H);
        dots.forEach(d => {
            d.x += d.vx; d.y += d.vy;
            if (d.x < 0) d.x = W; if (d.x > W) d.x = 0;
            if (d.y < 0) d.y = H; if (d.y > H) d.y = 0;
            ctx.beginPath();
            ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(79, 70, 229, ${d.a * 0.4})`;
            ctx.fill();
        });
        // Connect nearby dots
        for (let i = 0; i < dots.length; i++) {
            for (let j = i + 1; j < dots.length; j++) {
                const dx = dots[i].x - dots[j].x, dy = dots[i].y - dots[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 110) {
                    ctx.beginPath();
                    ctx.moveTo(dots[i].x, dots[i].y);
                    ctx.lineTo(dots[j].x, dots[j].y);
                    ctx.strokeStyle = `rgba(79, 70, 229, ${(1 - dist / 110) * 0.15})`;
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
            }
        }
        requestAnimationFrame(draw);
    }
    draw();
}

// ---- LOGIN ----
let failedAttempts = 0;
const MAX_ATTEMPTS = 5;

function updateAttemptsBar(count) {
    const wrap = document.getElementById('lp-attempts-wrap');
    const fill = document.getElementById('lp-attempts-fill');
    const label = document.getElementById('lp-attempts-count');
    if (!wrap) return;
    wrap.classList.remove('hidden');
    fill.style.width = `${(count / MAX_ATTEMPTS) * 100}%`;
    label.textContent = `${count} / ${MAX_ATTEMPTS}`;
}

function fakeBcryptPreview(pw) {
    if (!pw) return '';
    const chars = '$2a$12$ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789./';
    const salt = Array.from({ length: 22 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    const hash = Array.from({ length: 31 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return `$2a$12$${salt}${hash}`;
}

function initLogin() {
    initParticles();

    // Role pills
    document.querySelectorAll('.lp-role-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            document.querySelectorAll('.lp-role-pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
        });
    });

    // Demo pills
    document.querySelectorAll('.lp-demo-pill').forEach(b => {
        b.addEventListener('click', () => {
            document.getElementById('login-email').value = b.dataset.email;
            document.getElementById('login-password').value = b.dataset.pw;
            document.getElementById('lp-hash-preview').textContent = fakeBcryptPreview(b.dataset.pw);
        });
    });

    // Password → bcrypt preview
    const pwInput = document.getElementById('login-password');
    if (pwInput) {
        pwInput.addEventListener('input', () => {
            const preview = document.getElementById('lp-hash-preview');
            if (pwInput.value.length > 0) {
                preview.textContent = fakeBcryptPreview(pwInput.value);
            } else {
                preview.textContent = '';
            }
        });
    }

    // Toggle password visibility
    document.getElementById('toggle-pw')?.addEventListener('click', () => {
        const inp = document.getElementById('login-password');
        inp.type = inp.type === 'password' ? 'text' : 'password';
    });

    // Step 1: Password submit
    document.getElementById('login-form').addEventListener('submit', async e => {
        e.preventDefault();
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;

        // Auto-detect role from email (no role selector in HTML)
        let role = null;
        if (email.includes('admin')) role = 'admin';
        else if (email.includes('johnson') || email.includes('faculty') || email.includes('prof') || email.includes('dr.')) role = 'faculty';
        // Leave null for student — backend handles it

        const btn = document.getElementById('login-btn');
        const errEl = document.getElementById('login-error');
        errEl.classList.add('hidden');
        btn.disabled = true;
        btn.querySelector('.btn-text').textContent = 'AUTHENTICATING...';
        try {
            const res = await fetch(API + '/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, role })
            });
            const data = await res.json();
            if (!res.ok) {
                failedAttempts++;
                updateAttemptsBar(failedAttempts);
                let msg = data.error;
                if (data.attempts_remaining !== undefined)
                    msg += ` (${data.attempts_remaining} attempt(s) left)`;
                throw new Error(msg);
            }
            failedAttempts = 0;

            // Login successful directly
            authToken = data.token;
            currentUser = data.user;
            localStorage.setItem('token', authToken);
            localStorage.setItem('user', JSON.stringify(currentUser));

            toast('✅ Welcome, ' + currentUser.name, 'success');
            initApp();
        } catch (err) {
            errEl.textContent = err.message;
            errEl.classList.remove('hidden');
        } finally {
            btn.disabled = false;
            btn.querySelector('.btn-text').textContent = 'AUTHENTICATE';
        }
    });

    // Sign Up Toggle
    document.getElementById('go-to-signup')?.addEventListener('click', e => {
        e.preventDefault();
        document.getElementById('login-card-view').classList.add('hidden');
        document.getElementById('signup-card-view').classList.remove('hidden');
    });

    document.getElementById('go-to-login')?.addEventListener('click', () => {
        document.getElementById('signup-card-view').classList.add('hidden');
        document.getElementById('login-card-view').classList.remove('hidden');
    });

    // Toggle reg password visibility
    document.getElementById('toggle-reg-pw')?.addEventListener('click', () => {
        const inp = document.getElementById('reg-password');
        inp.type = inp.type === 'password' ? 'text' : 'password';
    });

    // Reg Role pills
    document.querySelectorAll('#reg-roles .lp-role-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            document.querySelectorAll('#reg-roles .lp-role-pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');

            const studentFields = document.getElementById('reg-student-fields');
            if (studentFields) {
                if (pill.dataset.role === 'student') {
                    studentFields.style.display = 'block';
                } else {
                    studentFields.style.display = 'none';
                    document.getElementById('reg-sid').value = '';
                    document.getElementById('reg-dept').value = '';
                }
            }
        });
    });

    // Step 1: Sign up submit
    document.getElementById('signup-form')?.addEventListener('submit', async e => {
        e.preventDefault();
        const name = document.getElementById('reg-name').value.trim();
        const email = document.getElementById('reg-email').value.trim();
        const password = document.getElementById('reg-password').value;
        const role = document.querySelector('#reg-roles .lp-role-pill.active').dataset.role;
        const student_id = document.getElementById('reg-sid') ? document.getElementById('reg-sid').value.trim() : '';
        const department = document.getElementById('reg-dept') ? document.getElementById('reg-dept').value.trim() : '';

        const btn = document.getElementById('signup-btn');
        const errEl = document.getElementById('signup-error');
        errEl.classList.add('hidden');
        btn.disabled = true;
        btn.querySelector('.btn-text').textContent = 'CREATING...';

        try {
            const res = await fetch(API + '/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password, role, student_id, department })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            // Registration successful -> Auto-fill login and switch back
            toast('✅ Registration successful! You can now log in.', 'success');
            document.getElementById('login-email').value = email;
            document.getElementById('login-password').value = password;
            document.getElementById('lp-hash-preview').textContent = fakeBcryptPreview(password);

            // Go to login view
            document.getElementById('go-to-login').click();
            document.getElementById('signup-form').reset();
        } catch (err) {
            errEl.textContent = err.message;
            errEl.classList.remove('hidden');
        } finally {
            btn.disabled = false;
            btn.querySelector('.btn-text').textContent = 'CREATE ACCOUNT';
        }
    });

}



// ---- APP INIT ----
function initApp() {
    document.getElementById('login-page').classList.add('hidden');
    document.getElementById('login-page').classList.remove('active');
    document.getElementById('app-page').classList.remove('hidden');

    // Sidebar user
    document.getElementById('sidebar-avatar').textContent = initials(currentUser.name);
    document.getElementById('sidebar-name').textContent = currentUser.name;
    const roleEl = document.getElementById('sidebar-role');
    roleEl.textContent = currentUser.role;
    roleEl.className = `user-role-badge ${currentUser.role}`;

    // Warning badge
    if (currentUser.warning_count > 0) {
        document.getElementById('warning-badge').style.display = 'flex';
        document.getElementById('warning-count').textContent = currentUser.warning_count;
    }

    buildNavigation();
    initSocket();
    startSessionWatcher();

    // Mobile menu
    document.getElementById('mobile-menu-btn').addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('open');
        document.getElementById('sidebar-overlay').style.display = 'block';
    });
    document.getElementById('sidebar-overlay').addEventListener('click', () => {
        document.getElementById('sidebar').classList.remove('open');
        document.getElementById('sidebar-overlay').style.display = 'none';
    });
    document.getElementById('logout-btn').addEventListener('click', logout);

    // Load default view
    const role = currentUser.role;
    if (role === 'student') navigateTo('dashboard');
    else if (role === 'faculty') navigateTo('announcements');
    else navigateTo('admin-dashboard');
}

// ---- NAVIGATION ----
const NAV_CONFIG = {
    student: [
        { id: 'dashboard', icon: '📊', label: 'Dashboard' },
        { id: 'announcements', icon: '📢', label: 'Announcements' },
        { id: 'messages', icon: '💬', label: 'Messages' },
        { id: 'assignments', icon: '📝', label: 'Assignments' },
        { id: 'leaves', icon: '🗓', label: 'Leave Application' },
        { id: 'marks', icon: '🎯', label: 'My Marks & CGPA' },
        { id: 'projects', icon: '🚀', label: 'Projects' },
    ],
    faculty: [
        { id: 'announcements', icon: '📢', label: 'Announcements' },
        { id: 'messages', icon: '💬', label: 'Messages' },
        { id: 'assignments', icon: '📝', label: 'Assignments' },
        { id: 'leaves', icon: '🗓', label: 'Leave Requests' },
        { id: 'marks', icon: '🎯', label: 'Student Marks' },
        { id: 'projects', icon: '🚀', label: 'Projects' },
    ],
    admin: [
        { id: 'admin-dashboard', icon: '📊', label: 'Overview' },
        { id: 'admin-users', icon: '👥', label: 'Manage Users' },
        { id: 'admin-warnings', icon: '⚠️', label: 'Warnings & Logs' },
        { id: 'admin-messages', icon: '🔍', label: 'Chat Monitor' },
        { id: 'admin-security', icon: '🛡', label: 'Security Center' },
        { id: 'admin-activity', icon: '📋', label: 'Activity Logs' },
        { id: 'announcements', icon: '📢', label: 'Announcements' },
    ]
};

function buildNavigation() {
    const nav = document.getElementById('sidebar-nav');
    const items = NAV_CONFIG[currentUser.role] || [];
    nav.innerHTML = `<div class="nav-section">Main Menu</div>` +
        items.map(i => `
      <div class="nav-item" data-page="${i.id}" id="nav-${i.id}">
        <span class="nav-icon">${i.icon}</span>
        <span>${i.label}</span>
      </div>
    `).join('');
    nav.querySelectorAll('.nav-item').forEach(el => {
        el.addEventListener('click', () => navigateTo(el.dataset.page));
    });
}

function navigateTo(page) {
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.getElementById(`nav-${page}`)?.classList.add('active');
    const titles = {
        'dashboard': 'My Dashboard', 'announcements': 'Announcements',
        'messages': 'Secure Messages', 'assignments': 'Assignments',
        'leaves': 'Leave Applications', 'marks': 'Marks & CGPA',
        'projects': 'Project Tracker',
        'admin-dashboard': 'Admin Overview', 'admin-users': 'Manage Users',
        'admin-warnings': 'Warnings & Logs', 'admin-messages': 'Chat Monitor'
    };
    document.getElementById('page-title').textContent = titles[page] || page;
    const area = document.getElementById('content-area');
    area.innerHTML = `<div class="loader"><div class="spinner"></div></div>`;

    const pages = {
        'dashboard': renderDashboard, 'announcements': renderAnnouncements,
        'messages': renderMessages, 'assignments': renderAssignments,
        'leaves': renderLeaves, 'marks': renderMarks, 'projects': renderProjects,
        'admin-dashboard': renderAdminDashboard,
        'admin-users': renderAdminUsers, 'admin-warnings': renderAdminWarnings,
        'admin-messages': renderAdminMessages,
        'admin-security': renderSecurityCenter,
        'admin-activity': renderActivityLogs
    };
    const titles2 = { 'admin-security': '🛡 Security Center', 'admin-activity': '📋 Activity Logs' };
    if (titles2[page]) document.getElementById('page-title').textContent = titles2[page];
    (pages[page] || (() => { area.innerHTML = '<div class="empty-state"><div class="empty-icon">🚧</div><p>Coming Soon</p></div>'; }))();
}

// ---- SOCKET ----
function initSocket() {
    socket = io('http://localhost:3001', { auth: { token: authToken } });
    socket.on('connect', () => {
        document.getElementById('conn-status').innerHTML = '<span class="status-dot online"></span><span>Connected</span>';
    });
    socket.on('disconnect', () => {
        document.getElementById('conn-status').innerHTML = '<span class="status-dot offline"></span><span>Disconnected</span>';
    });
    socket.on('online_users', users => { onlineUsers = users; });
    socket.on('new_message', msg => {
        if (activeChat && activeChat.type === 'dm' && (msg.sender_id === activeChat.userId || msg.receiver_id === activeChat.userId)) {
            appendMessage(msg, false);
        } else {
            toast(`💬 New message from ${msg.sender_name}`, 'info');
        }
    });
    socket.on('new_group_message', msg => {
        if (activeChat && activeChat.type === 'group' && activeChat.groupId === msg.group_id) {
            appendMessage(msg, false);
        }
    });
    socket.on('user_typing', data => {
        const el = document.getElementById('typing-indicator');
        if (el) { el.style.display = 'flex'; el.querySelector('span').textContent = `${data.name} is typing`; }
    });
    socket.on('user_stop_typing', () => {
        const el = document.getElementById('typing-indicator');
        if (el) el.style.display = 'none';
    });
}

function logout() {
    clearTimeout(sessionTimer);
    // Notify server of logout for activity log
    if (authToken) {
        fetch(API + '/auth/logout', { method: 'POST', headers: { Authorization: `Bearer ${authToken}` } }).catch(() => { });
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    if (socket) socket.disconnect();
    currentUser = null; authToken = null; socket = null; activeChat = null;
    document.getElementById('app-page').classList.add('hidden');
    const lp = document.getElementById('login-page');
    lp.classList.remove('hidden');
    lp.classList.add('active');
    // Refresh page on logout to clear any partial state
    location.reload();
    toast('Signed out successfully', 'info');
}

// ---- AUTO LOGIN ----
window.addEventListener('DOMContentLoaded', async () => {
    initLogin();
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (savedToken && savedUser) {
        // Verify token is still valid before auto-logging in
        try {
            const res = await fetch(API + '/auth/me', {
                headers: { Authorization: `Bearer ${savedToken}` }
            });
            if (!res.ok) throw new Error('Token invalid or expired');
            authToken = savedToken;
            currentUser = JSON.parse(savedUser);
            initApp();
        } catch (err) {
            // Token expired/invalid — clear storage and show login page
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            // login page is already visible by default, nothing else needed
        }
    }
});
