// =========================================
//  ASSIGNMENTS, LEAVES, MARKS, PROJECTS
// =========================================

async function renderAssignments() {
    const area = document.getElementById('content-area');
    try {
        const [assignments, submissions] = await Promise.all([
            api('GET', '/assignments'),
            currentUser.role === 'student' ? api('GET', '/assignments/my/submissions') : Promise.resolve([])
        ]);
        const submittedIds = new Set(submissions.map(s => s.assignment_id));
        const isFaculty = currentUser.role !== 'student';

        area.innerHTML = `
      <div class="section-header">
        <div class="section-title">📝 ${isFaculty ? 'Assignment Management' : 'My Assignments'}</div>
        ${isFaculty ? `<button class="btn btn-primary" id="btn-new-assign">+ New Assignment</button>` : ''}
      </div>
      <div class="assignment-grid" id="assign-list">
        ${assignments.length === 0 ? `<div class="empty-state"><div class="empty-icon">📝</div><p>No assignments yet</p></div>` :
                assignments.map(a => {
                    const submitted = submittedIds.has(a.id);
                    const sub = submissions.find(s => s.assignment_id === a.id);
                    const safe = new Date(a.deadline) > new Date();
                    return `<div class="assignment-card">
              <div class="assignment-header">
                <div>
                  <div class="assignment-title">${a.title}</div>
                  <div class="assignment-subject">${a.subject}</div>
                </div>
                <span class="deadline-badge ${safe ? 'safe' : ''}">📅 ${daysLeft(a.deadline)}</span>
              </div>
              <div class="assignment-desc">${a.description || 'No description provided.'}</div>
              <div class="assignment-meta">
                <span>👨‍🏫 ${a.faculty_name}</span>
                <span>�mark ${a.max_marks} marks</span>
                <span>⏰ ${fmtDate(a.deadline)}</span>
              </div>
              <div style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap">
                ${!isFaculty ? (submitted
                            ? `<span class="badge badge-success">✅ Submitted${sub?.marks != null ? ' • ' + sub.marks + '/' + a.max_marks : ''}</span>`
                            : `<button class="btn btn-primary btn-sm" onclick="submitAssignment(${a.id},'${escHtml(a.title)}')">📤 Submit</button>`)
                            : `<button class="btn btn-info btn-sm" onclick="viewSubmissions(${a.id},'${escHtml(a.title)}')">👁 View Submissions</button>`}
              </div>
            </div>`;
                }).join('')}
      </div>`;

        if (isFaculty) {
            document.getElementById('btn-new-assign').addEventListener('click', () => {
                openModal(`
          <h2 class="modal-title">📝 New Assignment</h2>
          <p class="modal-subtitle">Post assignment to students</p>
          <div class="form-group-mb"><label class="form-label">Title</label>
            <input id="m-at" class="form-control" placeholder="Assignment title..." /></div>
          <div class="form-row" style="margin-bottom:16px">
            <div><label class="form-label">Subject</label><input id="m-as" class="form-control" placeholder="e.g. Data Structures" /></div>
            <div><label class="form-label">Max Marks</label><input id="m-am" class="form-control" type="number" value="100" /></div>
          </div>
          <div class="form-group-mb"><label class="form-label">Description</label>
            <textarea id="m-ad" class="form-control" rows="3" placeholder="Assignment details..."></textarea></div>
          <div class="form-group-mb"><label class="form-label">Deadline</label>
            <input id="m-adl" class="form-control" type="datetime-local" /></div>
          <div class="modal-actions">
            <button class="btn" onclick="closeModal()">Cancel</button>
            <button class="btn btn-primary" id="m-apost">Post Assignment</button>
          </div>`);
                document.getElementById('m-apost').addEventListener('click', async () => {
                    try {
                        await api('POST', '/assignments', {
                            title: document.getElementById('m-at').value,
                            subject: document.getElementById('m-as').value,
                            description: document.getElementById('m-ad').value,
                            deadline: document.getElementById('m-adl').value,
                            max_marks: parseInt(document.getElementById('m-am').value)
                        });
                        closeModal(); toast('Assignment posted!', 'success'); renderAssignments();
                    } catch (e) { toast(e.message, 'error'); }
                });
            });
        }
    } catch (e) {
        area.innerHTML = `<div class="empty-state"><div class="empty-icon">❌</div><p>${e.message}</p></div>`;
    }
}

window.submitAssignment = (id, title) => {
    openModal(`
    <h2 class="modal-title">📤 Submit Assignment</h2>
    <p class="modal-subtitle">${title}</p>
    <div class="form-group-mb"><label class="form-label">Upload File (optional)</label>
      <input id="m-subfile" class="form-control" type="file" accept=".pdf,.doc,.docx,.zip,.txt" /></div>
    <div class="modal-actions">
      <button class="btn" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" id="m-subpost">Submit</button>
    </div>`);
    document.getElementById('m-subpost').addEventListener('click', async () => {
        const fd = new FormData();
        const file = document.getElementById('m-subfile').files[0];
        if (file) fd.append('file', file);
        try {
            await api('POST', `/assignments/${id}/submit`, fd, true);
            closeModal(); toast('Assignment submitted!', 'success'); renderAssignments();
        } catch (e) { toast(e.message, 'error'); }
    });
};

window.viewSubmissions = async (id, title) => {
    try {
        const subs = await api('GET', `/assignments/${id}/submissions`);
        openModal(`
      <h2 class="modal-title">📋 Submissions</h2>
      <p class="modal-subtitle">${title} — ${subs.length} submission(s)</p>
      <div style="max-height:400px;overflow-y:auto">
        ${subs.length === 0 ? '<div class="empty-state"><p>No submissions yet</p></div>' :
                subs.map(s => `<div style="padding:12px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:12px;flex-wrap:wrap">
            <div style="flex:1"><div style="font-weight:600;color:var(--text-primary)">${s.student_name}</div>
            <div style="font-size:12px;color:var(--text-muted)">${s.sid} • ${fmtDate(s.submitted_at)}</div></div>
            <span class="badge badge-${s.status === 'graded' ? 'success' : s.status === 'late' ? 'danger' : 'info'}">${s.status}</span>
            ${s.marks != null ? `<span style="font-size:13px;color:var(--text-primary)">${s.marks} marks</span>` : ''}
            ${s.file_url ? `<a href="${s.file_url}" target="_blank" class="btn btn-info btn-sm">📄 File</a>` : ''}
            <button class="btn btn-success btn-sm" onclick="gradeSubmission(${s.id})">✏️ Grade</button>
          </div>`).join('')}
      </div>
      <div class="modal-actions"><button class="btn" onclick="closeModal()">Close</button></div>`);
    } catch (e) { toast(e.message, 'error'); }
};

window.gradeSubmission = (id) => {
    closeModal();
    openModal(`
    <h2 class="modal-title">✏️ Grade Submission</h2>
    <div class="form-group-mb"><label class="form-label">Marks</label>
      <input id="m-gmarks" class="form-control" type="number" placeholder="e.g. 85" /></div>
    <div class="form-group-mb"><label class="form-label">Feedback</label>
      <textarea id="m-gfb" class="form-control" rows="3" placeholder="Feedback for student..."></textarea></div>
    <div class="modal-actions">
      <button class="btn" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" id="m-gsave">Save Grade</button>
    </div>`);
    document.getElementById('m-gsave').addEventListener('click', async () => {
        try {
            await api('PUT', `/assignments/submissions/${id}/grade`, {
                marks: parseInt(document.getElementById('m-gmarks').value),
                feedback: document.getElementById('m-gfb').value
            });
            closeModal(); toast('Graded successfully!', 'success');
        } catch (e) { toast(e.message, 'error'); }
    });
};

// ---- LEAVES ----
async function renderLeaves() {
    const area = document.getElementById('content-area');
    try {
        const leaves = await api('GET', '/leaves');
        const isStudent = currentUser.role === 'student';
        const statusCol = { pending: 'warning', approved: 'success', rejected: 'danger' };
        const statusIcon = { pending: '⏳', approved: '✅', rejected: '❌' };

        area.innerHTML = `
      <div class="section-header">
        <div class="section-title">🗓 ${isStudent ? 'My Leave Applications' : 'Leave Requests'}</div>
        ${isStudent ? `<button class="btn btn-primary" id="btn-new-leave">+ Apply for Leave</button>` : ''}
      </div>
      ${leaves.length === 0 ? `<div class="empty-state"><div class="empty-icon">🗓</div><p>No leave applications found</p></div>` :
                `<div style="display:flex;flex-direction:column;gap:12px">` +
                leaves.map(l => `
          <div class="leave-card">
            <div class="leave-icon" style="background:rgba(108,99,255,0.15)">📋</div>
            <div class="leave-info">
              <div class="leave-reason">${l.reason}</div>
              <div class="leave-dates">📅 ${fmtDate(l.start_date)} → ${fmtDate(l.end_date)}
                ${!isStudent ? ` • 👤 ${l.student_name} (${l.sid})` : ''}</div>
              ${l.remarks ? `<div style="font-size:12px;color:var(--text-muted);margin-top:4px">💬 ${l.remarks}</div>` : ''}
            </div>
            <span class="badge badge-${statusCol[l.status]}">${statusIcon[l.status]} ${l.status}</span>
            ${!isStudent && l.status === 'pending' ? `
              <div class="leave-actions">
                <button class="btn btn-success btn-sm" onclick="reviewLeave(${l.id},'approved')">✅ Approve</button>
                <button class="btn btn-danger btn-sm" onclick="reviewLeave(${l.id},'rejected')">❌ Reject</button>
              </div>` : ''}
          </div>`).join('') + `</div>`}`;

        if (isStudent) {
            document.getElementById('btn-new-leave').addEventListener('click', () => {
                openModal(`
          <h2 class="modal-title">🗓 Apply for Leave</h2>
          <p class="modal-subtitle">Submit your leave application</p>
          <div class="form-group-mb"><label class="form-label">Reason</label>
            <textarea id="m-lr" class="form-control" rows="3" placeholder="State your reason..."></textarea></div>
          <div class="form-row" style="margin-bottom:16px">
            <div><label class="form-label">Start Date</label><input id="m-ls" class="form-control" type="date" /></div>
            <div><label class="form-label">End Date</label><input id="m-le" class="form-control" type="date" /></div>
          </div>
          <div class="modal-actions">
            <button class="btn" onclick="closeModal()">Cancel</button>
            <button class="btn btn-primary" id="m-lsub">Submit Application</button>
          </div>`);
                document.getElementById('m-lsub').addEventListener('click', async () => {
                    try {
                        await api('POST', '/leaves', {
                            reason: document.getElementById('m-lr').value,
                            start_date: document.getElementById('m-ls').value,
                            end_date: document.getElementById('m-le').value
                        });
                        closeModal(); toast('Leave application submitted!', 'success'); renderLeaves();
                    } catch (e) { toast(e.message, 'error'); }
                });
            });
        }
    } catch (e) {
        area.innerHTML = `<div class="empty-state"><div class="empty-icon">❌</div><p>${e.message}</p></div>`;
    }
}

window.reviewLeave = (id, status) => {
    openModal(`
    <h2 class="modal-title">${status === 'approved' ? '✅ Approve' : '❌ Reject'} Leave</h2>
    <div class="form-group-mb"><label class="form-label">Remarks (optional)</label>
      <textarea id="m-rrm" class="form-control" rows="3" placeholder="Add remarks..."></textarea></div>
    <div class="modal-actions">
      <button class="btn" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" id="m-rrsave">${status === 'approved' ? 'Approve' : 'Reject'}</button>
    </div>`);
    document.getElementById('m-rrsave').addEventListener('click', async () => {
        try {
            await api('PUT', `/leaves/${id}`, { status, remarks: document.getElementById('m-rrm').value });
            closeModal(); toast(`Leave ${status}!`, 'success'); renderLeaves();
        } catch (e) { toast(e.message, 'error'); }
    });
};

// ---- MARKS ----
async function renderMarks() {
    const area = document.getElementById('content-area');
    try {
        if (currentUser.role === 'student') {
            const { cgpa, marks } = await api('GET', '/academic/cgpa');
            const grade = cgpaToGrade(cgpa);
            area.innerHTML = `
        <div class="section-header"><div class="section-title">🎯 My Marks & CGPA</div></div>
        <div class="card" style="margin-bottom:20px">
          <div class="cgpa-card">
            <div style="font-size:64px;font-weight:800;background:linear-gradient(135deg,#6C63FF,#00D2FF);-webkit-background-clip:text;-webkit-text-fill-color:transparent">${cgpa}</div>
            <div>
              <div style="font-size:36px;font-weight:800;color:var(--text-primary)">${grade.g}</div>
              <div style="color:var(--text-secondary);margin-top:4px">${grade.d}</div>
              <div style="color:var(--text-muted);font-size:13px;margin-top:8px">Based on ${marks.length} subject(s)</div>
            </div>
          </div>
        </div>
        <div class="marks-grid">
          ${marks.map(m => {
                const pct = Math.round(m.marks / m.max_marks * 100);
                const circ = 2 * Math.PI * 35;
                const off = circ - (pct / 100) * circ;
                return `<div class="mark-card">
              <div class="mark-subject">${m.subject}</div>
              <div class="mark-circle">
                <svg width="80" height="80" viewBox="0 0 80 80">
                  <circle class="mark-bg" cx="40" cy="40" r="35"/>
                  <circle class="mark-fill" cx="40" cy="40" r="35"
                    stroke-dasharray="${circ}" stroke-dashoffset="${off}"
                    stroke="${pct >= 80 ? '#00E676' : pct >= 60 ? '#40C4FF' : '#FF5252'}"/>
                </svg>
                <div class="mark-value-text">${pct}%</div>
              </div>
              <div style="font-weight:700;font-size:18px;color:var(--text-primary)">${m.marks}/${m.max_marks}</div>
              <div class="mark-grade">${m.semester}</div>
            </div>`;
            }).join('') || '<div class="empty-state"><p>No marks recorded</p></div>'}
        </div>`;
        } else {
            // Faculty: list students and update marks
            const users = await api('GET', '/admin/users');
            const students = users.filter(u => u.role === 'student');
            area.innerHTML = `
        <div class="section-header">
          <div class="section-title">🎯 Student Marks</div>
          <button class="btn btn-primary" id="btn-addmarks">+ Add/Update Marks</button>
        </div>
        <div class="users-table-container"><table class="data-table">
          <thead><tr><th>Student</th><th>ID</th><th>Dept</th><th>CGPA</th><th>Actions</th></tr></thead>
          <tbody>
            ${students.map(s => `<tr>
              <td><strong>${s.name}</strong></td><td>${s.student_id || '—'}</td><td>${s.department || '—'}</td>
              <td><span id="cgpa-${s.id}">...</span></td>
              <td><button class="btn btn-info btn-sm" onclick="viewStudentMarks(${s.id},'${s.name}')">View Marks</button>
                <button class="btn btn-primary btn-sm" onclick="addMarksFor(${s.id},'${s.name}')">+ Marks</button></td>
            </tr>`).join('')}
          </tbody>
        </table></div>`;
            // Load CGPAs async
            students.forEach(async s => {
                try {
                    const { cgpa } = await api('GET', `/academic/cgpa/${s.id}`);
                    const el = document.getElementById(`cgpa-${s.id}`);
                    if (el) el.textContent = cgpa;
                } catch { }
            });
            document.getElementById('btn-addmarks').addEventListener('click', () => showAddMarksModal(null, 'Select Student'));
        }
    } catch (e) {
        area.innerHTML = `<div class="empty-state"><div class="empty-icon">❌</div><p>${e.message}</p></div>`;
    }
}

window.addMarksFor = (id, name) => showAddMarksModal(id, name);
window.viewStudentMarks = async (id, name) => {
    try {
        const { cgpa, marks } = await api('GET', `/academic/cgpa/${id}`);
        openModal(`
      <h2 class="modal-title">📊 ${name}'s Marks</h2>
      <p class="modal-subtitle">CGPA: ${cgpa}</p>
      <div style="max-height:350px;overflow-y:auto">
        ${marks.map(m => `<div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border)">
          <span style="color:var(--text-secondary)">${m.subject} (${m.semester})</span>
          <span style="font-weight:700;color:var(--text-primary)">${m.marks}/${m.max_marks}</span>
        </div>`).join('') || '<div style="padding:20px;text-align:center;color:var(--text-muted)">No marks</div>'}
      </div>
      <div class="modal-actions"><button class="btn" onclick="closeModal()">Close</button></div>`);
    } catch (e) { toast(e.message, 'error'); }
};

function showAddMarksModal(studentId, studentName) {
    openModal(`
    <h2 class="modal-title">➕ Add/Update Marks</h2>
    <p class="modal-subtitle">${studentName}</p>
    <div class="form-group-mb"><label class="form-label">Subject</label>
      <input id="m-msub" class="form-control" placeholder="e.g. Data Structures" /></div>
    <div class="form-row" style="margin-bottom:16px">
      <div><label class="form-label">Marks Obtained</label><input id="m-mmarks" class="form-control" type="number" /></div>
      <div><label class="form-label">Max Marks</label><input id="m-mmax" class="form-control" type="number" value="100" /></div>
    </div>
    <div class="form-group-mb"><label class="form-label">Semester</label>
      <input id="m-msem" class="form-control" placeholder="e.g. Sem 4" /></div>
    <div class="modal-actions">
      <button class="btn" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" id="m-msave">Save Marks</button>
    </div>`);
    document.getElementById('m-msave').addEventListener('click', async () => {
        try {
            await api('POST', '/academic/marks', {
                student_id: studentId,
                subject: document.getElementById('m-msub').value,
                marks: parseInt(document.getElementById('m-mmarks').value),
                max_marks: parseInt(document.getElementById('m-mmax').value),
                semester: document.getElementById('m-msem').value
            });
            closeModal(); toast('Marks saved!', 'success'); renderMarks();
        } catch (e) { toast(e.message, 'error'); }
    });
}
