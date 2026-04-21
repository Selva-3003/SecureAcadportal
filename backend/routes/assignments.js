const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const models = require('../database');
const { authenticate, authorize } = require('../middleware/auth');
const { logActivity } = require('../middleware/security');

// ── SECURE FILE UPLOAD CONFIG ──────────────────────────────────────────────
const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.txt', '.zip', '.png', '.jpg'];
const BLOCKED_EXTENSIONS = ['.exe', '.bat', '.sh', '.cmd', '.ps1', '.msi', '.vbs', '.js', '.php'];

const storage = multer.diskStorage({
    destination: path.join(__dirname, '../uploads'),
    filename: (req, file, cb) => {
        const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
        cb(null, Date.now() + '-' + safe);
    }
});

const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (BLOCKED_EXTENSIONS.includes(ext)) {
        return cb(new Error(`File type ${ext} is not allowed for security reasons.`), false);
    }
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
        return cb(new Error(`Only ${ALLOWED_EXTENSIONS.join(', ')} files are accepted.`), false);
    }
    cb(null, true);
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 } // 10 MB
});

// GET /api/assignments - get all assignments
router.get('/', authenticate, async (req, res) => {
    try {
        const assignments = await models.Assignment.find()
            .populate('faculty_id', 'name')
            .sort('deadline').lean();
        res.json(assignments.map(a => ({ ...a, id: a._id, faculty_name: a.faculty_id?.name })));
    } catch (err) { res.status(500).json({ error: 'Server Error' }); }
});

// POST /api/assignments (faculty)
router.post('/', authenticate, authorize('faculty', 'admin'), async (req, res) => {
    try {
        const { title, description, subject, deadline, max_marks } = req.body;
        if (!title || !subject || !deadline) return res.status(400).json({ error: 'Required fields missing' });
        
        const assignment = await models.Assignment.create({
            title, description: description || '', faculty_id: req.user.id, subject, deadline, max_marks: max_marks || 100
        });
        res.json({ id: assignment.id, message: 'Assignment created' });
    } catch (err) { res.status(500).json({ error: 'Server Error' }); }
});

// GET /api/assignments/my/submissions (student)
router.get('/my/submissions', authenticate, authorize('student'), async (req, res) => {
    try {
        const subs = await models.Submission.find({ student_id: req.user.id })
            .populate('assignment_id', 'title subject deadline max_marks')
            .lean();
        res.json(subs.map(s => ({
            ...s, id: s._id,
            assignment_title: s.assignment_id?.title,
            subject: s.assignment_id?.subject,
            deadline: s.assignment_id?.deadline,
            max_marks: s.assignment_id?.max_marks
        })));
    } catch (err) { res.status(500).json({ error: 'Server Error' }); }
});

// GET /api/assignments/:id/submissions (faculty)
router.get('/:id/submissions', authenticate, authorize('faculty', 'admin'), async (req, res) => {
    try {
        const subs = await models.Submission.find({ assignment_id: req.params.id })
            .populate('student_id', 'name student_id')
            .lean();
        res.json(subs.map(s => ({
            ...s, id: s._id,
            student_name: s.student_id?.name,
            sid: s.student_id?.student_id
        })));
    } catch (err) { res.status(500).json({ error: 'Server Error' }); }
});

// POST /api/assignments/:id/submit (student)
router.post('/:id/submit', authenticate, authorize('student'), (req, res, next) => {
    upload.single('file')(req, res, (err) => {
        if (err) return res.status(400).json({ error: `⚠ File rejected: ${err.message}` });
        next();
    });
}, async (req, res) => {
    try {
        const assignmentId = req.params.id;
        const existing = await models.Submission.findOne({ assignment_id: assignmentId, student_id: req.user.id });
        if (existing) return res.status(409).json({ error: 'Already submitted' });

        const assignment = await models.Assignment.findById(assignmentId);
        if (!assignment) return res.status(404).json({ error: 'Assignment not found' });
        
        const now = new Date();
        const deadline = new Date(assignment.deadline);
        const status = now > deadline ? 'late' : 'submitted';

        const file_url = req.file ? `/uploads/${req.file.filename}` : null;
        const fileType = req.file ? path.extname(req.file.originalname).toUpperCase() : 'No file';
        
        const sub = await models.Submission.create({
            assignment_id: assignmentId, student_id: req.user.id, file_url, status
        });

        await logActivity(req.user.id, req.user.name, 'ASSIGNMENT_SUBMITTED',
            `Assignment "${assignment.title}" (${fileType}) – ${status}`, req.ip);
            
        res.json({ id: sub.id, status, message: 'Submission successful' });
    } catch (err) { res.status(500).json({ error: 'Server Error' }); }
});

// PUT /api/assignments/submissions/:id/grade (faculty)
router.put('/submissions/:id/grade', authenticate, authorize('faculty', 'admin'), async (req, res) => {
    try {
        const { marks, feedback } = req.body;
        await models.Submission.findByIdAndUpdate(req.params.id, { marks, feedback, status: 'graded' });
        await logActivity(req.user.id, req.user.name, 'SUBMISSION_GRADED', `Submission #${req.params.id} graded: ${marks} marks`, req.ip);
        res.json({ message: 'Graded successfully' });
    } catch (err) { res.status(500).json({ error: 'Server Error' }); }
});

module.exports = router;
