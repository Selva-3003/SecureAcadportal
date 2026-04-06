// =========================================
//  DASHBOARD & ANNOUNCEMENTS
// =========================================

async function renderDashboard() {
    const area = document.getElementById('content-area');
    try {
        const data = await api('GET', '/academic/dashboard');
        const { cgpa, assignments_total, assignments_submitted, projects, warning_count, marks } = data;
        const grade = cgpaToGrade(cgpa);
        const pct = Math.min((cgpa / 10) * 100, 100);
        const circ = 2 * Math.PI * 52;
        const offset = circ - (pct / 100) * circ;
        const assPct = assignments_total ? Math.round((assignments_submitted / assignments_total) * 100) : 0;
        const project = projects[0];

        area.innerHTML = `
      <div class="stats-row">
        <div class="stat-card" style="--accent-color:#6C63FF">
          <div class="stat-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg></div>
          <div class="stat-value">${cgpa}</div>
          <div class="stat-label">Current CGPA</div>
          <div class="stat-change up">Grade: ${grade.g} – ${grade.d}</div>
        </div>
        <div class="stat-card" style="--accent-color:#00D2FF">
          <div class="stat-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg></div>
          <div class="stat-value">${assignments_submitted}/${assignments_total}</div>
          <div class="stat-label">Assignments Submitted</div>
          <div class="stat-change ${assPct >= 80 ? 'up' : 'down'}">${assPct}% completion rate</div>
        </div>
        <div class="stat-card" style="--accent-color:#00E676">
          <div class="stat-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></div>
          <div class="stat-value">${projects.length}</div>
          <div class="stat-label">Active Projects</div>
          <div class="stat-change up">${project ? project.progress + '% avg progress' : 'No projects yet'}</div>
        </div>
        <div class="stat-card" style="--accent-color:${warning_count > 0 ? '#FFB300' : '#00E676'}">
          <div class="stat-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m11.73 3 9.17 15.82a2 2 0 0 1-1.73 3H5.17a2 2 0 0 1-1.73-3z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div>
          <div class="stat-value">${warning_count}</div>
          <div class="stat-label">Warnings</div>
          <div class="stat-change ${warning_count > 0 ? 'down' : 'up'}">${3 - warning_count} before suspension</div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
        <div class="card">
          <div class="card-title"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:text-bottom;margin-right:8px"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg> CGPA Overview</div>
          <div class="card-subtitle">Academic performance meter</div>
          <div class="cgpa-card">
            <div class="cgpa-ring">
              <svg width="120" height="120" viewBox="0 0 120 120">
                <defs><linearGradient id="cgpa-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stop-color="#6C63FF"/><stop offset="100%" stop-color="#00D2FF"/>
                </linearGradient></defs>
                <circle class="ring-bg" cx="60" cy="60" r="52"/>
                <circle class="ring-progress" cx="60" cy="60" r="52"
                  stroke-dasharray="${circ}" stroke-dashoffset="${offset}"/>
              </svg>
              <div class="ring-text">
                <div class="cgpa-value">${cgpa}</div>
                <div class="cgpa-label">/ 10</div>
              </div>
            </div>
            <div class="cgpa-info">
              <div class="cgpa-grade">${grade.g}</div>
              <div class="cgpa-desc">${grade.d}</div>
              <div style="margin-top:12px;font-size:13px;color:var(--text-muted)">${marks.length} subjects tracked</div>
            </div>
          </div>
        </div>
        <div class="card">
          <div class="card-title"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:text-bottom;margin-right:8px"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> Subject Performance</div>
          <div class="card-subtitle">Marks breakdown by subject</div>
          <div class="chart-bar-container" style="margin-top:8px">
            ${marks.slice(0, 5).map(m => `
              <div class="chart-bar-row">
                <div class="chart-bar-label">${m.subject}</div>
                <div class="chart-bar-track"><div class="chart-bar-fill" style="width:${Math.round(m.marks / m.max_marks * 100)}%"></div></div>
                <div class="chart-bar-value">${m.marks}/${m.max_marks}</div>
              </div>
            `).join('') || '<div class="empty-state"><p>No marks yet</p></div>'}
          </div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
        <div class="card">
          <div class="card-title">📝 Assignment Progress</div>
          <div class="card-subtitle">${assignments_submitted} of ${assignments_total} submitted</div>
          <div style="margin-top:16px">
            <div class="progress-bar" style="height:12px">
              <div class="progress-fill" style="width:${assPct}%"></div>
            </div>
            <div style="display:flex;justify-content:space-between;margin-top:8px;font-size:13px;color:var(--text-muted)">
              <span>Submitted: ${assignments_submitted}</span>
              <span>${assPct}%</span>
              <span>Total: ${assignments_total}</span>
            </div>
          </div>
        </div>
        <div class="card">
          <div class="card-title">🚀 Project Status</div>
          <div class="card-subtitle">Active project tracking</div>
          ${projects.slice(0, 2).map(p => `
            <div style="margin-top:14px">
              <div class="project-progress-label">
                <span style="font-size:13px;color:var(--text-primary);font-weight:600">${p.title}</span>
                <span class="project-progress-value">${p.progress}%</span>
              </div>
              <div class="progress-bar"><div class="progress-fill" style="width:${p.progress}%"></div></div>
            </div>
          `).join('') || '<div style="padding:20px 0;text-align:center;color:var(--text-muted);font-size:13px">No projects found</div>'}
        </div>
      </div>`;
    } catch (e) {
        area.innerHTML = `<div class="empty-state"><div class="empty-icon">❌</div><p>${e.message}</p></div>`;
    }
}

async function renderAnnouncements() {
    const area = document.getElementById('content-area');
    try {
        const announcements = await api('GET', '/announcements');
        const canPost = currentUser.role !== 'student';
        const priColor = { urgent: '#FF5252', high: '#FFB300', normal: '#40C4FF', low: '#9194B3' };

        area.innerHTML = `
      <div class="section-header">
        <div class="section-title">📢 Announcements</div>
        ${canPost ? `<button class="btn btn-primary" id="btn-new-announcement">+ New Announcement</button>` : ''}
      </div>
      <div class="announcements-list" id="ann-list">
        ${announcements.length === 0 ? `<div class="empty-state"><div class="empty-icon">📢</div><p>No announcements yet</p></div>` :
                announcements.map(a => `
          <div class="announcement-card" style="--priority-color:${priColor[a.priority] || '#6C63FF'}">
            <div class="ann-header">
              <div class="ann-title">${a.title}</div>
              <span class="badge badge-${a.priority === 'urgent' ? 'danger' : a.priority === 'high' ? 'warning' : a.priority === 'low' ? 'low' : 'info'}">
                ${a.priority.toUpperCase()}
              </span>
            </div>
            <div class="ann-content">${a.content}</div>
            <div class="ann-meta">
              <span class="ann-author"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> ${a.author_name}</span>
              <span class="ann-date"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> ${fmtDate(a.created_at)}</span>
              ${currentUser.role === 'admin' ? `<button class="btn btn-danger btn-sm" onclick="deleteAnnouncement(${a.id})"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg> Delete</button>` : ''}
            </div>
          </div>`).join('')}
      </div>`;

        if (canPost) {
            document.getElementById('btn-new-announcement').addEventListener('click', () => {
                openModal(`
          <h2 class="modal-title">📢 New Announcement</h2>
          <p class="modal-subtitle">Post to all students and faculty</p>
          <div class="form-group-mb"><label class="form-label">Title</label>
            <input id="m-ann-title" class="form-control" placeholder="Announcement title..." /></div>
          <div class="form-group-mb"><label class="form-label">Content</label>
            <textarea id="m-ann-content" class="form-control" rows="4" placeholder="Write your announcement..."></textarea></div>
          <div class="form-group-mb"><label class="form-label">Priority</label>
            <select id="m-ann-priority" class="form-control">
              <option value="normal">Normal</option><option value="high">High</option>
              <option value="urgent">Urgent</option><option value="low">Low</option>
            </select></div>
          <div class="modal-actions">
            <button class="btn" onclick="closeModal()">Cancel</button>
            <button class="btn btn-primary" id="m-ann-btn">Post Announcement</button>
          </div>`);
                document.getElementById('m-ann-btn').addEventListener('click', async () => {
                    try {
                        await api('POST', '/announcements', {
                            title: document.getElementById('m-ann-title').value,
                            content: document.getElementById('m-ann-content').value,
                            priority: document.getElementById('m-ann-priority').value
                        });
                        closeModal(); toast('Announcement posted!', 'success'); renderAnnouncements();
                    } catch (e) { toast(e.message, 'error'); }
                });
            });
        }
    } catch (e) {
        area.innerHTML = `<div class="empty-state"><div class="empty-icon">❌</div><p>${e.message}</p></div>`;
    }
}

window.deleteAnnouncement = async (id) => {
    if (!confirm('Delete this announcement?')) return;
    try { await api('DELETE', `/announcements/${id}`); toast('Deleted', 'success'); renderAnnouncements(); }
    catch (e) { toast(e.message, 'error'); }
};
