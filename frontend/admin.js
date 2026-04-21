// =========================================
//  PROJECTS, CALENDAR, ADMIN PAGES
// =========================================

async function renderProjects() {
  const area = document.getElementById('content-area');
  try {
    const projects = await api('GET', '/academic/projects');
    const isStudent = currentUser.role === 'student';
    const statusColors = { ongoing: '#40C4FF', completed: '#00E676', 'on-hold': '#FFB300' };

    area.innerHTML = `
      <div class="section-header">
        <div class="section-title"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:10px;vertical-align:middle"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> Project Tracker</div>
        ${isStudent ? `<button class="btn btn-primary" id="btn-new-project">+ New Project</button>` : ''}
      </div>
      ${projects.length === 0 ? `<div class="empty-state"><div class="empty-icon">🚀</div><p>No projects yet</p></div>` :
        `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:16px">` +
        projects.map(p => `
          <div class="project-card">
            <div class="project-header">
              <div>
                <div class="project-title">${p.title}</div>
                ${!isStudent ? `<div style="font-size:12px;color:var(--text-muted);margin-top:2px"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> ${p.student_name}</div>` : ''}
              </div>
              <span class="badge" style="background:rgba(${statusColors[p.status] === '#40C4FF' ? '64,196,255' : statusColors[p.status] === '#00E676' ? '0,230,118' : '255,179,0'},0.15);color:${statusColors[p.status]}">
                ${p.status}
              </span>
            </div>
            ${p.description ? `<div style="font-size:13px;color:var(--text-secondary);margin-bottom:14px;line-height:1.5">${p.description}</div>` : ''}
            <div class="project-progress-label">
              <span>Progress</span>
              <span class="project-progress-value">${p.progress}%</span>
            </div>
            <div class="progress-bar"><div class="progress-fill" style="width:${p.progress}%"></div></div>
            ${p.faculty_name ? `<div style="margin-top:10px;font-size:12px;color:var(--text-muted)"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5z"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><polyline points="10 2 10 10 13 8 16 10 16 2"/></svg> Advisor: ${p.faculty_name}</div>` : ''}
            ${!isStudent ? `
              <div style="margin-top:12px;display:flex;gap:8px">
                <button class="btn btn-primary btn-sm" onclick="updateProjectProgress('${p.id}',${p.progress})">Update Progress</button>
              </div>` : ''}
          </div>`).join('') + `</div>`}`;

    if (isStudent) {
      document.getElementById('btn-new-project').addEventListener('click', async () => {
        const faculty = await api('GET', '/messages/users');
        openModal(`
          <h2 class="modal-title">🚀 New Project</h2>
          <div class="form-group-mb"><label class="form-label">Project Title</label>
            <input id="m-pt" class="form-control" placeholder="Project title..." /></div>
          <div class="form-group-mb"><label class="form-label">Description</label>
            <textarea id="m-pd" class="form-control" rows="3" placeholder="Project description..."></textarea></div>
          <div class="form-group-mb"><label class="form-label">Faculty Advisor</label>
            <select id="m-pfac" class="form-control">
              <option value="">Select advisor...</option>
              ${faculty.map(f => `<option value="${f.id}">${f.name}</option>`).join('')}
            </select></div>
          <div class="modal-actions">
            <button class="btn" onclick="closeModal()">Cancel</button>
            <button class="btn btn-primary" id="m-psave">Create Project</button>
          </div>`);
        document.getElementById('m-psave').addEventListener('click', async () => {
          try {
            await api('POST', '/academic/projects', {
              title: document.getElementById('m-pt').value,
              description: document.getElementById('m-pd').value,
              faculty_id: document.getElementById('m-pfac').value || null
            });
            closeModal(); toast('Project created!', 'success'); renderProjects();
          } catch (e) { toast(e.message, 'error'); }
        });
      });
    }
  } catch (e) {
    area.innerHTML = `<div class="empty-state"><div class="empty-icon">❌</div><p>${e.message}</p></div>`;
  }
}

window.updateProjectProgress = (id, currentProgress) => {
  openModal(`
    <h2 class="modal-title">📊 Update Project</h2>
    <div class="form-group-mb"><label class="form-label">Progress (0-100)</label>
      <input id="m-pp" class="form-control" type="range" min="0" max="100" value="${currentProgress}" oninput="document.getElementById('m-ppval').textContent=this.value+'%'" />
      <div style="text-align:center;font-size:24px;font-weight:800;color:var(--primary-light);margin-top:8px" id="m-ppval">${currentProgress}%</div></div>
    <div class="form-group-mb"><label class="form-label">Status</label>
      <select id="m-pst" class="form-control">
        <option value="ongoing">Ongoing</option>
        <option value="completed">Completed</option>
        <option value="on-hold">On Hold</option>
      </select></div>
    <div class="modal-actions">
      <button class="btn" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" id="m-ppsave">Update</button>
    </div>`);
  document.getElementById('m-ppsave').addEventListener('click', async () => {
    try {
      await api('PUT', `/academic/projects/${id}`, {
        progress: parseInt(document.getElementById('m-pp').value),
        status: document.getElementById('m-pst').value
      });
      closeModal(); toast('Project updated!', 'success'); renderProjects();
    } catch (e) { toast(e.message, 'error'); }
  });
};



// ---- ADMIN DASHBOARD ----
async function renderAdminDashboard() {
  const area = document.getElementById('content-area');
  try {
    const stats = await api('GET', '/admin/stats');
    area.innerHTML = `
      <div class="section-title" style="margin-bottom:18px"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:10px;vertical-align:middle"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg> System Overview</div>
      <div class="admin-stats-grid">
        ${[
        { label: 'Total Users', value: stats.total_users, icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>', color: '#6C63FF' },
        { label: 'Students', value: stats.students, icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>', color: '#00E676' },
        { label: 'Faculty', value: stats.faculty, icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5z"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><polyline points="10 2 10 10 13 8 16 10 16 2"/></svg>', color: '#40C4FF' },
        { label: 'Suspended', value: stats.suspended, icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>', color: '#FF5252' },
        { label: 'Warnings', value: stats.warnings, icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m11.73 3 9.17 15.82a2 2 0 0 1-1.73 3H5.17a2 2 0 0 1-1.73-3z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>', color: '#FFB300' },
        { label: 'Assignments', value: stats.assignments, icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>', color: '#6C63FF' },
        { label: 'Submissions', value: stats.submissions, icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>', color: '#00D2FF' },
        { label: 'Messages', value: stats.messages, icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>', color: '#FF6B9D' },
        { label: 'Leaves', value: stats.leaves, icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>', color: '#FFB300' },
        { label: 'Announcements', value: stats.announcements, icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>', color: '#40C4FF' },
      ].map(s => `<div class="admin-stat"><div class="admin-stat-icon">${s.icon}</div>
          <div class="admin-stat-value" style="--stat-color:${s.color}">${s.value}</div>
          <div class="admin-stat-label">${s.label}</div>
        </div>`).join('')}
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:8px">
        <div class="card">
          <div class="card-title">Quick Actions</div>
          <div style="display:flex;flex-direction:column;gap:10px;margin-top:12px">
            <button class="btn btn-primary" onclick="navigateTo('admin-users')">👥 Manage Users</button>
            <button class="btn btn-warning" onclick="navigateTo('admin-warnings')">⚠️ View Warnings</button>
            <button class="btn btn-info" onclick="navigateTo('admin-messages')">🔍 Monitor Chats</button>
          </div>
        </div>
        <div class="card">
          <div class="card-title">System Health</div>
          <div style="margin-top:12px;display:flex;flex-direction:column;gap:10px">
            <div><div class="project-progress-label"><span>Active Users</span><span class="project-progress-value">${stats.total_users - stats.suspended}/${stats.total_users}</span></div>
              <div class="progress-bar"><div class="progress-fill" style="width:${stats.total_users ? Math.round((stats.total_users - stats.suspended) / stats.total_users * 100) : 0}%"></div></div></div>
            <div><div class="project-progress-label"><span>Assignment Completion</span><span class="project-progress-value">${stats.submissions}/${stats.assignments * Math.max(stats.students, 1)}</span></div>
              <div class="progress-bar"><div class="progress-fill" style="width:${stats.assignments && stats.students ? Math.min(100, Math.round(stats.submissions / (stats.assignments * stats.students) * 100)) : 0}%"></div></div></div>
          </div>
        </div>
      </div>`;
  } catch (e) {
    area.innerHTML = `<div class="empty-state"><div class="empty-icon">❌</div><p>${e.message}</p></div>`;
  }
}

// ---- ADMIN USERS ----
async function renderAdminUsers() {
  const area = document.getElementById('content-area');
  try {
    const users = await api('GET', '/admin/users');
    area.innerHTML = `
      <div class="section-header">
        <div class="section-title">👥 User Management</div>
        <button class="btn btn-primary" id="btn-add-user">+ Add User</button>
      </div>
      <div class="users-table-container">
        <div class="table-header">
          <span style="font-size:14px;color:var(--text-secondary)">${users.length} users total</span>
        </div>
        <table class="data-table">
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Dept</th><th>ID</th><th>Warnings</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            ${users.map(u => `<tr>
              <td><strong style="color:var(--text-primary)">${u.name}</strong></td>
              <td>${u.email}</td>
              <td><span class="user-role-badge ${u.role}" style="display:inline-block">${u.role}</span></td>
              <td>${u.department || '—'}</td>
              <td>${u.student_id || '—'}</td>
              <td><span style="color:${u.warning_count > 0 ? 'var(--warning)' : 'var(--text-muted)'}">${u.warning_count || 0}</span></td>
              <td><span class="badge badge-${u.is_suspended ? 'danger' : 'success'}">${u.is_suspended ? '🚫 Suspended' : '✅ Active'}</span></td>
              <td style="display:flex;gap:6px;flex-wrap:wrap">
                ${u.is_suspended
        ? `<button class="btn btn-success btn-sm" onclick="recoverUser('${u.id}')">Recover</button>`
        : `<button class="btn btn-warning btn-sm" onclick="suspendUser('${u.id}')">Suspend</button>`}
                <button class="btn btn-danger btn-sm" onclick="deleteUser('${u.id}')">Delete</button>
              </td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`;

    document.getElementById('btn-add-user').addEventListener('click', () => {
      openModal(`
        <h2 class="modal-title">➕ Add New User</h2>
        <div class="form-group-mb"><label class="form-label">Full Name</label><input id="m-un" class="form-control" /></div>
        <div class="form-group-mb"><label class="form-label">Email</label><input id="m-ue" class="form-control" type="email" /></div>
        <div class="form-group-mb"><label class="form-label">Password</label><input id="m-up" class="form-control" type="password" /></div>
        <div class="form-row" style="margin-bottom:16px">
          <div><label class="form-label">Role</label><select id="m-ur" class="form-control">
            <option value="student">Student</option><option value="faculty">Faculty</option><option value="admin">Admin</option>
          </select></div>
          <div><label class="form-label">ID</label><input id="m-uid2" class="form-control" placeholder="STU/FAC001" /></div>
        </div>
        <div class="form-group-mb"><label class="form-label">Department</label><input id="m-udept" class="form-control" /></div>
        <div class="modal-actions">
          <button class="btn" onclick="closeModal()">Cancel</button>
          <button class="btn btn-primary" id="m-usave">Create User</button>
        </div>`);
      document.getElementById('m-usave').addEventListener('click', async () => {
        try {
          await api('POST', '/admin/users', {
            name: document.getElementById('m-un').value,
            email: document.getElementById('m-ue').value,
            password: document.getElementById('m-up').value,
            role: document.getElementById('m-ur').value,
            student_id: document.getElementById('m-uid2').value,
            department: document.getElementById('m-udept').value
          });
          closeModal(); toast('User created!', 'success'); renderAdminUsers();
        } catch (e) { toast(e.message, 'error'); }
      });
    });
  } catch (e) {
    area.innerHTML = `<div class="empty-state"><div class="empty-icon">❌</div><p>${e.message}</p></div>`;
  }
}

window.suspendUser = async (id) => {
  if (!confirm('Suspend this user?')) return;
  try {
    await api('PUT', `/admin/users/${id}/suspend`);
    toast('User suspended', 'warning');
    if (document.getElementById('page-title')?.textContent?.includes('Warnings')) renderAdminWarnings();
    else renderAdminUsers();
  }
  catch (e) { toast(e.message, 'error'); }
};
window.recoverUser = async (id) => {
  try {
    await api('PUT', `/admin/users/${id}/recover`);
    toast('Account recovered!', 'success');
    if (document.getElementById('page-title')?.textContent?.includes('Warnings')) renderAdminWarnings();
    else renderAdminUsers();
  }
  catch (e) { toast(e.message, 'error'); }
};
window.deleteUser = async (id) => {
  if (!confirm('Permanently delete this user?')) return;
  try {
    await api('DELETE', `/admin/users/${id}`);
    toast('User deleted', 'info');
    if (document.getElementById('page-title')?.textContent?.includes('Warnings')) renderAdminWarnings();
    else renderAdminUsers();
  }
  catch (e) { toast(e.message, 'error'); }
};

// ---- ADMIN WARNINGS ----
async function renderAdminWarnings() {
  const area = document.getElementById('content-area');
  try {
    const warnings = await api('GET', '/admin/warnings');

    // Group warnings by user - extraction must use w.user_id._id if populated
    const usersMap = {};
    warnings.forEach(w => {
      const actualUserId = w.user_id?._id || w.user_id; // Handles both populated object and direct ID
      if (!actualUserId) return; // Skip if no user linked
      
      if (!usersMap[actualUserId]) {
        usersMap[actualUserId] = {
          id: actualUserId,
          name: w.user_name || 'Deleted User',
          student_id: w.student_id,
          is_suspended: w.is_suspended,
          warningsList: []
        };
      }
      usersMap[actualUserId].warningsList.push(w);
    });

    const userCardsHtml = Object.values(usersMap).map(u => {
      const initialsStr = u.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
      const statusHtml = u.is_suspended
        ? `<div style="background:rgba(255, 82, 82, 0.1); color:#ff5252; padding:4px 12px; border:1px solid rgba(255, 82, 82, 0.2); border-radius:4px; font-size:12px; font-weight:700;">SUSPENDED</div>`
        : `<div style="background:rgba(255, 179, 0, 0.1); color:#ffb300; padding:4px 12px; border:1px solid rgba(255, 179, 0, 0.2); border-radius:4px; font-size:12px; font-weight:700;">WARNED</div>`;

      const warningsHtml = u.warningsList.map(w =>
        `<div style="padding:12px 0; border-top:1px solid rgba(255,255,255,0.05); color:var(--text-secondary); font-size:14px;">
           <span style="color:var(--warning); margin-right:8px;">⚠️</span>${w.reason || w.message}
         </div>`
      ).join('');

      const recoverBtnHtml = u.is_suspended
        ? `<div style="margin-top:16px;">
             <button class="btn" style="background:rgba(0, 230, 118, 0.1); color:#00E676; border:1px solid rgba(0, 230, 118, 0.2); border-radius:6px; padding:6px 14px; display:inline-flex; align-items:center; gap:6px; cursor:pointer;" onclick="recoverUser('${u.id}')">
               🔓 Recover Account
             </button>
           </div>`
        : '';

      return `
        <div style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.05); border-radius:12px; padding:20px; margin-bottom:16px;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:16px;">
            <div style="display:flex; gap:16px; align-items:center;">
              <div style="width:48px; height:48px; border-radius:50%; background:#ff5252; color:#fff; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:16px;">
                ${initialsStr}
              </div>
              <div>
                <div style="font-weight:700; font-size:16px; color:var(--text-primary); margin-bottom:4px;">${u.name}</div>
                <div style="font-size:13px; color:var(--text-muted);">${u.student_id || 'ID N/A'} • ${u.warningsList.length} warnings</div>
              </div>
            </div>
            ${statusHtml}
          </div>
          <div style="margin-bottom:8px;">
            ${warningsHtml}
          </div>
          ${recoverBtnHtml}
        </div>
      `;
    }).join('');

    area.innerHTML = `
      <div class="section-title" style="margin-bottom:24px; display:flex; align-items:center; font-size:24px;">
        <span style="color:var(--warning); margin-right:12px;">⚠️</span> Warnings & Suspensions
      </div>
      <div style="max-width:900px;">
        ${Object.keys(usersMap).length === 0 ? `<div class="empty-state"><img src="" style="display:none"/><p>No warnings recorded</p></div>` : userCardsHtml}
      </div>
    `;
  } catch (e) {
    area.innerHTML = `<div class="empty-state"><div class="empty-icon">❌</div><p>${e.message}</p></div>`;
  }
}

// ---- ADMIN MESSAGE MONITOR ----
async function renderAdminMessages() {
  const area = document.getElementById('content-area');
  try {
    const messages = await api('GET', '/admin/messages');
    area.innerHTML = `
      <div class="section-title" style="margin-bottom:18px">🔍 Chat Monitor</div>
      <div class="users-table-container">
        <table class="data-table">
          <thead><tr><th>From</th><th>To</th><th>Message</th><th>Time</th></tr></thead>
          <tbody>
            ${messages.length === 0 ? `<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:30px">No messages</td></tr>` :
        messages.map(m => `<tr>
                <td><strong>${m.sender_name}</strong><div style="font-size:11px;color:var(--text-muted)">${m.sender_role}</div></td>
                <td style="color:var(--text-muted)">${m.receiver_name || 'Group'}</td>
                <td style="max-width:250px"><div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${m.content}</div>
                  ${m.is_filtered ? `<span class="badge badge-danger">⚠️ Filtered</span>` : ''}
                </td>
                <td style="color:var(--text-muted);white-space:nowrap">${fmtTime(m.created_at)}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  } catch (e) {
    area.innerHTML = `<div class="empty-state"><div class="empty-icon">❌</div><p>${e.message}</p></div>`;
  }
}

// ---- SECURITY CENTER ----
async function renderSecurityCenter() {
  const area = document.getElementById('content-area');
  try {
    const [alerts, attempts, stats] = await Promise.all([
      api('GET', '/admin/security-alerts'),
      api('GET', '/admin/login-attempts'),
      api('GET', '/admin/stats')
    ]);

    const sevColor = { low: '#40C4FF', medium: '#FFB300', high: '#FF5252', critical: '#FF0055' };
    const sevIcon = { 
      low: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>', 
      medium: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px"><path d="m11.73 3 9.17 15.82a2 2 0 0 1-1.73 3H5.17a2 2 0 0 1-1.73-3z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>', 
      high: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>', 
      critical: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px"><path d="M12 2l10 6.5v7L12 22 2 15.5v-7L12 2z"/><path d="M12 22v-6.5"/><path d="M22 8.5l-10 7-10-7"/></svg>' 
    };
    const typeLabel = {
      brute_force: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> Brute Force', 
      spam: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg> Spam', 
      message_violation: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> Message Violation',
      auto_suspension: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg> Auto Suspension', 
      unusual_login: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg> Unusual Login'
    };

    const failedToday = attempts.filter(a => !a.success).length;
    const successToday = attempts.filter(a => a.success).length;
    const unresolved = alerts.filter(a => !a.resolved).length;

    area.innerHTML = `
      <div class="section-title" style="margin-bottom:18px">🛡 Security Center</div>

      <!-- Security Metric Cards -->
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px">
        ${[
        { label: 'Unresolved Alerts', value: unresolved, icon: '🚨', color: '#FF5252' },
        { label: 'Failed Logins (24h)', value: stats.failed_logins, icon: '🔒', color: '#FFB300' },
        { label: 'Successful Logins', value: successToday, icon: '✅', color: '#00E676' },
        { label: 'Today\'s Activity', value: stats.activity_today, icon: '📋', color: '#6C63FF' },
      ].map(s => `<div class="card" style="text-align:center;padding:18px 12px">
          <div style="font-size:28px">${s.icon}</div>
          <div style="font-size:32px;font-weight:800;color:${s.color};margin:6px 0">${s.value}</div>
          <div style="font-size:12px;color:var(--text-muted)">${s.label}</div>
        </div>`).join('')}
      </div>

      <!-- Security Alerts Table -->
      <div class="section-header" style="margin-bottom:10px">
        <div class="section-title" style="font-size:16px">🚨 Security Alerts</div>
        <span style="font-size:13px;color:var(--text-muted)">${unresolved} unresolved</span>
      </div>
      <div class="users-table-container" style="margin-bottom:20px">
        <table class="data-table">
          <thead><tr><th>Severity</th><th>Type</th><th>User</th><th>Details</th><th>Time</th><th>Action</th></tr></thead>
          <tbody>
            ${alerts.length === 0
        ? `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:28px">✅ No security alerts</td></tr>`
        : alerts.map(a => `<tr style="opacity:${a.resolved ? 0.5 : 1}">
                <td><span style="color:${sevColor[a.severity]};font-weight:700">${sevIcon[a.severity]} ${a.severity.toUpperCase()}</span></td>
                <td>${typeLabel[a.alert_type] || a.alert_type}</td>
                <td>${a.user_name ? `<strong>${a.user_name}</strong><div style="font-size:11px;color:var(--text-muted)">${a.user_email || ''}</div>` : '—'}</td>
                <td style="max-width:200px;font-size:12px;color:var(--text-secondary)">${a.details || '—'}</td>
                <td style="white-space:nowrap;color:var(--text-muted)">${fmtDate(a.created_at)}</td>
                <td>${a.resolved
            ? `<span class="badge badge-success">✅ Resolved</span>`
            : `<button class="btn btn-success btn-sm" onclick="resolveAlert('${a.id}')">Resolve</button>`}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>

      <!-- Recent Login Attempts -->
      <div class="section-title" style="font-size:16px;margin-bottom:10px">🎓 Recent Login Attempts</div>
      <div class="users-table-container">
        <table class="data-table">
          <thead><tr><th>Email</th><th>IP</th><th>Result</th><th>Time</th></tr></thead>
          <tbody>
            ${attempts.slice(0, 15).map(a => `<tr>
              <td>${a.email}</td>
              <td style="color:var(--text-muted);font-size:12px">${a.ip || 'unknown'}</td>
              <td><span class="badge badge-${a.success ? 'success' : 'danger'}">${a.success ? '✅ Success' : '❌ Failed'}</span></td>
              <td style="color:var(--text-muted);white-space:nowrap">${fmtTime(a.attempted_at)}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  } catch (e) {
    area.innerHTML = `<div class="empty-state"><div class="empty-icon">❌</div><p>${e.message}</p></div>`;
  }
}

window.resolveAlert = async (id) => {
  try {
    await api('PUT', `/admin/security-alerts/${id}/resolve`);
    toast('Alert resolved ✅', 'success');
    renderSecurityCenter();
  } catch (e) { toast(e.message, 'error'); }
};

// ---- ACTIVITY LOGS ----
async function renderActivityLogs() {
  const area = document.getElementById('content-area');
  try {
    const logs = await api('GET', '/admin/activity-logs');

    const actionColor = {
      LOGIN_SUCCESS: '#00E676', LOGOUT: '#40C4FF',
      SUSPENDED: '#FF5252', WARNING_ISSUED: '#FFB300', REGISTERED: '#6C63FF',
      MESSAGE_SENT: '#FF6B9D', GROUP_MESSAGE: '#FF6B9D', GROUP_CREATED: '#6C63FF',
      ASSIGNMENT_SUBMITTED: '#00D2FF', SUBMISSION_GRADED: '#00E676',
      LOGIN_FAILED: '#FF5252'
    };
    const actionIcon = {
      LOGIN_SUCCESS: '✅', LOGOUT: '👋', SUSPENDED: '🚫',
      WARNING_ISSUED: '⚠', REGISTERED: '🆕', MESSAGE_SENT: '💬', GROUP_MESSAGE: '👥',
      GROUP_CREATED: '🔵', ASSIGNMENT_SUBMITTED: '📤', SUBMISSION_GRADED: '✏',
    };

    area.innerHTML = `
      <div class="section-header" style="margin-bottom:14px">
        <div class="section-title">📋 Activity Audit Log</div>
        <span style="font-size:13px;color:var(--text-muted)">${logs.length} entries</span>
      </div>
      <div class="users-table-container">
        <table class="data-table">
          <thead><tr><th>Time</th><th>User</th><th>Action</th><th>Details</th><th>IP</th></tr></thead>
          <tbody>
            ${logs.length === 0
        ? `<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:28px">No activity logged yet</td></tr>`
        : logs.map(l => `<tr>
                <td style="white-space:nowrap;color:var(--text-muted);font-size:12px">${fmtTime(l.created_at)}<div>${fmtDate(l.created_at)}</div></td>
                <td><strong>${l.user_name || 'System'}</strong></td>
                <td>
                  <span style="color:${actionColor[l.action] || 'var(--text-secondary)'};font-weight:600">
                    ${actionIcon[l.action] || '•'} ${l.action.replace(/_/g, ' ')}
                  </span>
                </td>
                <td style="font-size:12px;color:var(--text-secondary);max-width:260px">${l.details || '—'}</td>
                <td style="font-size:12px;color:var(--text-muted)">${l.ip || '—'}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  } catch (e) {
    area.innerHTML = `<div class="empty-state"><div class="empty-icon">❌</div><p>${e.message}</p></div>`;
  }
}
