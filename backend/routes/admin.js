const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const models = require('../database');
const { authenticate, authorize } = require('../middleware/auth');

// GET /api/admin/users
router.get('/users', authenticate, authorize('admin', 'faculty'), async (req, res) => {
    try {
        const users = await models.User.find().select('-password').sort('-created_at').lean();
        res.json(users.map(u => ({ ...u, id: u._id })));
    } catch (err) { res.status(500).json({ error: 'Server Error' }); }
});

// POST /api/admin/users (create)
router.post('/users', authenticate, authorize('admin'), async (req, res) => {
    try {
        const { name, email, password, role, student_id, department } = req.body;
        if (!name || !email || !password || !role) return res.status(400).json({ error: 'Fields missing' });
        
        const existing = await models.User.findOne({ email });
        if (existing) return res.status(409).json({ error: 'Email already exists' });
        
        const hash = bcrypt.hashSync(password, 10);
        const user = await models.User.create({
            name, email, password: hash, role, student_id: student_id || null, department: department || null
        });
        res.json({ id: user.id, message: 'User created' });
    } catch (err) { res.status(500).json({ error: 'Server Error' }); }
});

// PUT /api/admin/users/:id/suspend
router.put('/users/:id/suspend', authenticate, authorize('admin'), async (req, res) => {
    try {
        await models.User.findByIdAndUpdate(req.params.id, { is_suspended: true });
        res.json({ message: 'User suspended' });
    } catch (err) { res.status(500).json({ error: 'Server Error' }); }
});

// PUT /api/admin/users/:id/recover
router.put('/users/:id/recover', authenticate, authorize('admin'), async (req, res) => {
    try {
        await models.User.findByIdAndUpdate(req.params.id, { is_suspended: false, warning_count: 0 });
        res.json({ message: 'Account recovered' });
    } catch (err) { res.status(500).json({ error: 'Server Error' }); }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', authenticate, authorize('admin'), async (req, res) => {
    try {
        const id = req.params.id;
        // Perform cascading deletes
        await models.Group.updateMany({}, { $pull: { members: id } });
        await models.Message.deleteMany({ $or: [{ sender_id: id }, { receiver_id: id }] });
        await models.Warning.deleteMany({ user_id: id });
        await models.Leave.deleteMany({ $or: [{ student_id: id }, { faculty_id: id }] });
        await models.Submission.deleteMany({ student_id: id });
        await models.StudentMark.deleteMany({ $or: [{ student_id: id }, { updated_by: id }] });
        await models.Project.deleteMany({ $or: [{ student_id: id }, { faculty_id: id }] });
        await models.Announcement.deleteMany({ author_id: id });
        await models.Assignment.deleteMany({ faculty_id: id });
        await models.Event.deleteMany({ created_by: id });
        await models.User.findByIdAndDelete(id);
        
        res.json({ message: 'User and all associated data deleted successfully' });
    } catch (err) { res.status(500).json({ error: 'Server Error' }); }
});

// GET /api/admin/warnings
router.get('/warnings', authenticate, authorize('admin'), async (req, res) => {
    try {
        const warnings = await models.Warning.find()
            .populate('user_id', 'name email role is_suspended student_id')
            .sort('-created_at').lean();
        res.json(warnings.map(w => ({
            ...w, id: w._id,
            user_name: w.user_id?.name,
            user_email: w.user_id?.email,
            user_role: w.user_id?.role,
            is_suspended: w.user_id?.is_suspended,
            student_id: w.user_id?.student_id
        })));
    } catch (err) { res.status(500).json({ error: 'Server Error' }); }
});

// GET /api/admin/messages (chat monitoring)
router.get('/messages', authenticate, authorize('admin'), async (req, res) => {
    try {
        const messages = await models.Message.find()
            .populate('sender_id', 'name role')
            .populate('receiver_id', 'name')
            .sort('-created_at')
            .limit(100).lean();
        res.json(messages.map(m => ({
            ...m, id: m._id,
            sender_name: m.sender_id?.name,
            sender_role: m.sender_id?.role,
            receiver_name: m.receiver_id?.name
        })));
    } catch (err) { res.status(500).json({ error: 'Server Error' }); }
});

// GET /api/admin/activity-logs
router.get('/activity-logs', authenticate, authorize('admin'), async (req, res) => {
    try {
        const logs = await models.ActivityLog.find().sort('-created_at').limit(200).lean();
        res.json(logs.map(l => ({ ...l, id: l._id })));
    } catch (err) { res.status(500).json({ error: 'Server Error' }); }
});

// GET /api/admin/security-alerts
router.get('/security-alerts', authenticate, authorize('admin'), async (req, res) => {
    try {
        const alerts = await models.SecurityAlert.find()
            .populate('user_id', 'name email')
            .sort('-created_at').limit(100).lean();
        res.json(alerts.map(a => ({
            ...a, id: a._id,
            user_name: a.user_id?.name,
            user_email: a.user_id?.email
        })));
    } catch (err) { res.status(500).json({ error: 'Server Error' }); }
});

// PUT /api/admin/security-alerts/:id/resolve
router.put('/security-alerts/:id/resolve', authenticate, authorize('admin'), async (req, res) => {
    try {
        await models.SecurityAlert.findByIdAndUpdate(req.params.id, { resolved: true });
        res.json({ message: 'Alert resolved' });
    } catch (err) { res.status(500).json({ error: 'Server Error' }); }
});

// GET /api/admin/login-attempts
router.get('/login-attempts', authenticate, authorize('admin'), async (req, res) => {
    try {
        const attempts = await models.LoginAttempt.find().sort('-attempted_at').limit(100).lean();
        res.json(attempts.map(a => ({ ...a, id: a._id })));
    } catch (err) { res.status(500).json({ error: 'Server Error' }); }
});

// GET /api/admin/stats
router.get('/stats', authenticate, authorize('admin'), async (req, res) => {
    try {
        const [
            total_users, students, faculty, suspended, warnings, assignments, submissions,
            leaves, messages, announcements, security_alerts, failed_logins, activity_today
        ] = await Promise.all([
            models.User.countDocuments(),
            models.User.countDocuments({ role: 'student' }),
            models.User.countDocuments({ role: 'faculty' }),
            models.User.countDocuments({ is_suspended: true }),
            models.Warning.countDocuments(),
            models.Assignment.countDocuments(),
            models.Submission.countDocuments(),
            models.Leave.countDocuments(),
            models.Message.countDocuments(),
            models.Announcement.countDocuments(),
            models.SecurityAlert.countDocuments({ resolved: false }),
            models.LoginAttempt.countDocuments({ success: false, attempted_at: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) } }),
            models.ActivityLog.countDocuments({ created_at: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) } })
        ]);

        res.json({
            total_users, students, faculty, suspended, warnings, assignments, submissions,
            leaves, messages, announcements, security_alerts, failed_logins, activity_today
        });
    } catch (err) {
        res.status(500).json({ error: 'Server Error' });
    }
});

module.exports = router;
