const express = require('express');
const router = express.Router();
const models = require('../database');
const { authenticate, authorize } = require('../middleware/auth');

// GET /api/academic/marks (student gets own, faculty/admin gets all or by student)
router.get('/marks', authenticate, async (req, res) => {
    try {
        if (req.user.role === 'student') {
            const marks = await models.StudentMark.find({ student_id: req.user.id }).sort('subject');
            res.json(marks);
        } else {
            const studentId = req.query.student_id;
            const query = studentId ? { student_id: studentId } : {};
            const marks = await models.StudentMark.find(query)
                .populate('student_id', 'name')
                .lean();
            // Map student_id.name to student_name for frontend compatibility
            const mappedMarks = marks.map(m => ({
                ...m,
                id: m._id,
                student_name: m.student_id ? m.student_id.name : 'Unknown'
            }));
            res.json(mappedMarks);
        }
    } catch (err) {
        res.status(500).json({ error: 'Server Error' });
    }
});

// POST /api/academic/marks (faculty/admin)
router.post('/marks', authenticate, authorize('faculty', 'admin'), async (req, res) => {
    try {
        const { student_id, subject, marks, max_marks, semester } = req.body;
        if (!student_id || !subject || marks === undefined || !semester) return res.status(400).json({ error: 'All fields required' });
        
        const filter = { student_id, subject, semester };
        const update = { marks, max_marks: max_marks || 100, updated_by: req.user.id, updated_at: new Date() };
        
        await models.StudentMark.findOneAndUpdate(filter, update, { upsert: true, new: true });
        res.json({ message: 'Marks updated' });
    } catch (err) {
        res.status(500).json({ error: 'Server Error' });
    }
});

// GET /api/academic/cgpa and /api/academic/cgpa/:studentId
router.get('/cgpa/:studentId', authenticate, async (req, res) => {
    try {
        const marks = await models.StudentMark.find({ student_id: req.params.studentId });
        if (!marks.length) return res.json({ cgpa: 0, marks: [] });
        const total = marks.reduce((acc, m) => acc + (m.marks / m.max_marks) * 10, 0);
        const cgpa = (total / marks.length).toFixed(2);
        res.json({ cgpa: parseFloat(cgpa), marks });
    } catch (err) {
        res.status(500).json({ error: 'Server Error' });
    }
});

router.get('/cgpa', authenticate, async (req, res) => {
    try {
        const marks = await models.StudentMark.find({ student_id: req.user.id });
        if (!marks.length) return res.json({ cgpa: 0, marks: [] });
        const total = marks.reduce((acc, m) => acc + (m.marks / m.max_marks) * 10, 0);
        const cgpa = (total / marks.length).toFixed(2);
        res.json({ cgpa: parseFloat(cgpa), marks });
    } catch (err) {
        res.status(500).json({ error: 'Server Error' });
    }
});

// GET /api/academic/projects
router.get('/projects', authenticate, async (req, res) => {
    try {
        if (req.user.role === 'student') {
            const projects = await models.Project.find({ student_id: req.user.id }).populate('faculty_id', 'name').lean();
            res.json(projects.map(p => ({ ...p, id: p._id, faculty_name: p.faculty_id?.name })));
        } else {
            const projects = await models.Project.find()
                .populate('student_id', 'name')
                .populate('faculty_id', 'name')
                .sort('-updated_at')
                .lean();
            res.json(projects.map(p => ({
                ...p, id: p._id,
                student_name: p.student_id?.name,
                faculty_name: p.faculty_id?.name
            })));
        }
    } catch (err) {
        res.status(500).json({ error: 'Server Error' });
    }
});

// POST /api/academic/projects (student)
router.post('/projects', authenticate, authorize('student'), async (req, res) => {
    try {
        const { title, description, faculty_id } = req.body;
        if (!title) return res.status(400).json({ error: 'Title required' });
        const project = await models.Project.create({
            student_id: req.user.id, title, description: description || '', faculty_id: faculty_id || null
        });
        res.json({ id: project.id, message: 'Project created' });
    } catch (err) {
        res.status(500).json({ error: 'Server Error' });
    }
});

// PUT /api/academic/projects/:id (faculty/admin update progress)
router.put('/projects/:id', authenticate, authorize('faculty', 'admin'), async (req, res) => {
    try {
        const { progress, status } = req.body;
        await models.Project.findByIdAndUpdate(req.params.id, { progress, status, updated_at: new Date() });
        res.json({ message: 'Project updated' });
    } catch (err) {
        res.status(500).json({ error: 'Server Error' });
    }
});

// GET /api/academic/dashboard (student's full dashboard data)
router.get('/dashboard', authenticate, authorize('student'), async (req, res) => {
    try {
        const userId = req.user.id;
        // CGPA
        const marks = await models.StudentMark.find({ student_id: userId });
        const cgpa = marks.length ? (marks.reduce((a, m) => a + (m.marks / m.max_marks) * 10, 0) / marks.length).toFixed(2) : 0;
        
        // Stats
        const assignments_total = await models.Assignment.countDocuments();
        const assignments_submitted = await models.Submission.countDocuments({ student_id: userId });
        const projects = await models.Project.find({ student_id: userId });
        const leaves_count = await models.Leave.countDocuments({ student_id: userId });
        const user = await models.User.findById(userId);

        res.json({
            cgpa: parseFloat(cgpa),
            assignments_total,
            assignments_submitted,
            projects,
            leaves_count,
            warning_count: user?.warning_count || 0,
            marks
        });
    } catch (err) {
        res.status(500).json({ error: 'Server Error' });
    }
});

// GET /api/academic/events
router.get('/events', authenticate, async (req, res) => {
    try {
        const events = await models.Event.find().populate('created_by', 'name').sort('event_date').lean();
        res.json(events.map(e => ({ ...e, id: e._id, creator_name: e.created_by?.name })));
    } catch (err) {
        res.status(500).json({ error: 'Server Error' });
    }
});

// POST /api/academic/events (faculty/admin)
router.post('/events', authenticate, authorize('faculty', 'admin'), async (req, res) => {
    try {
        const { title, description, event_date, event_type } = req.body;
        if (!title || !event_date) return res.status(400).json({ error: 'Title and date required' });
        const event = await models.Event.create({
            title, description: description || '', event_date, event_type: event_type || 'general', created_by: req.user.id
        });
        res.json({ id: event.id, message: 'Event created' });
    } catch (err) {
        res.status(500).json({ error: 'Server Error' });
    }
});

module.exports = router;
