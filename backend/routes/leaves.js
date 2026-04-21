const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const models = require('../database');
const { authenticate, authorize } = require('../middleware/auth');

const storage = multer.diskStorage({
    destination: path.join(__dirname, '../uploads'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// GET /api/leaves (student gets own, faculty/admin gets all)
router.get('/', authenticate, async (req, res) => {
    try {
        if (req.user.role === 'student') {
            const leaves = await models.Leave.find({ student_id: req.user.id })
                .populate('faculty_id', 'name')
                .sort('-created_at').lean();
            res.json(leaves.map(l => ({ ...l, id: l._id, faculty_name: l.faculty_id?.name })));
        } else {
            const leaves = await models.Leave.find()
                .populate('student_id', 'name student_id')
                .sort('-created_at').lean();
            res.json(leaves.map(l => ({
                ...l, id: l._id,
                student_name: l.student_id?.name,
                sid: l.student_id?.student_id
            })));
        }
    } catch (err) { res.status(500).json({ error: 'Server Error' }); }
});

// POST /api/leaves (student)
router.post('/', authenticate, authorize('student'), upload.single('document'), async (req, res) => {
    try {
        const { reason, start_date, end_date } = req.body;
        if (!reason || !start_date || !end_date) return res.status(400).json({ error: 'All fields required' });
        
        await models.Leave.create({
            student_id: req.user.id, reason, start_date, end_date
        });
        res.json({ message: 'Leave application submitted' });
    } catch (err) { res.status(500).json({ error: 'Server Error' }); }
});

// PUT /api/leaves/:id (faculty/admin)
router.put('/:id', authenticate, authorize('faculty', 'admin'), async (req, res) => {
    try {
        const { status, remarks } = req.body;
        if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
        
        await models.Leave.findByIdAndUpdate(req.params.id, { status, remarks: remarks || '', faculty_id: req.user.id });
        res.json({ message: `Leave ${status}` });
    } catch (err) { res.status(500).json({ error: 'Server Error' }); }
});

module.exports = router;
