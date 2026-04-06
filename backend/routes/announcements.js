const express = require('express');
const router = express.Router();
const models = require('../database');
const { authenticate, authorize } = require('../middleware/auth');

// GET /api/announcements
router.get('/', authenticate, async (req, res) => {
    try {
        const announcements = await models.Announcement.find()
            .populate('author_id', 'name role')
            .sort('-created_at')
            .limit(20).lean();
            
        res.json(announcements.map(a => ({
            ...a, id: a._id,
            author_name: a.author_id?.name,
            author_role: a.author_id?.role
        })));
    } catch (err) { res.status(500).json({ error: 'Server Error' }); }
});

// POST /api/announcements (faculty/admin)
router.post('/', authenticate, authorize('faculty', 'admin'), async (req, res) => {
    try {
        const { title, content, priority } = req.body;
        if (!title || !content) return res.status(400).json({ error: 'Title and content required' });
        const ann = await models.Announcement.create({
            title, content, author_id: req.user.id, priority: priority || 'normal'
        });
        res.json({ id: ann.id, message: 'Announcement posted' });
    } catch (err) { res.status(500).json({ error: 'Server Error' }); }
});

// DELETE /api/announcements/:id (admin)
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
    try {
        await models.Announcement.findByIdAndDelete(req.params.id);
        res.json({ message: 'Deleted' });
    } catch (err) { res.status(500).json({ error: 'Server Error' }); }
});

module.exports = router;
