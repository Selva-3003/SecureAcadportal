const express = require('express');
const router = express.Router();
const models = require('../database');
const { authenticate, authorize } = require('../middleware/auth');
const { filterMessage } = require('../middleware/messageFilter');
const { logActivity, checkSpam, createAlert } = require('../middleware/security');

// Helper: process message violation (warning/suspension)
async function handleViolation(userId, content, reason) {
    const user = await models.User.findById(userId);
    const newWarnings = (user.warning_count || 0) + 1;
    
    await models.User.findByIdAndUpdate(userId, { warning_count: newWarnings });
    await models.Warning.create({ user_id: userId, message: content, reason });
    
    if (newWarnings > 3) {
        await models.User.findByIdAndUpdate(userId, { is_suspended: true });
        await createAlert('auto_suspension', 'high', userId, `Suspended after ${newWarnings} warnings. Last: ${reason}`);
        await logActivity(userId, user.name, 'SUSPENDED', `Auto-suspended after ${newWarnings} violations`, null);
        return { suspended: true, warning_count: newWarnings };
    }
    
    await createAlert('message_violation', 'medium', userId, `Warning ${newWarnings}/3: ${reason}`);
    await logActivity(userId, user.name, 'WARNING_ISSUED', `Warning ${newWarnings}/3 - ${reason}`, null);
    return { suspended: false, warning_count: newWarnings };
}

// GET /api/messages/users
router.get('/users', authenticate, async (req, res) => {
    try {
        let query = { is_suspended: false, _id: { $ne: req.user.id } };

        const users = await models.User.find(query).select('name email role department student_id').lean();
        res.json(users.map(u => ({ ...u, id: u._id })));
    } catch (err) {
        console.error('GET /users error:', err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// GET /api/messages/dm/:userId
router.get('/dm/:userId', authenticate, async (req, res) => {
    try {
        const otherId = req.params.userId;
        const messages = await models.Message.find({
            group_id: { $exists: false },
            $or: [
                { sender_id: req.user.id, receiver_id: otherId },
                { sender_id: otherId, receiver_id: req.user.id }
            ]
        }).populate('sender_id', 'name role').sort('created_at').limit(100).lean();

        res.json(messages.map(m => ({
            ...m, id: m._id,
            sender_name: m.sender_id?.name,
            sender_role: m.sender_id?.role
        })));
    } catch (err) {
        console.error('GET /dm/:userId error:', err);
        if (err.name === 'CastError') return res.status(400).json({ error: 'Invalid User ID' });
        res.status(500).json({ error: 'Server Error' });
    }
});

// POST /api/messages/dm - with spam + content filter
router.post('/dm', authenticate, async (req, res) => {
    try {
        const { receiver_id, content } = req.body;
        if (!receiver_id || !content) return res.status(400).json({ error: 'receiver_id and content required' });

        // 1. Spam check
        const spamResult = await checkSpam(req.user.id, content);
        if (spamResult.muted) {
            return res.status(429).json({ error: `🔇 You are muted for spam. Try again in ${spamResult.remaining} minute(s).`, muted: true });
        }
        if (spamResult.spammed) {
            return res.status(429).json({ error: `⚠ Spam detected! You are muted for 10 minutes.`, muted: true, filtered: true });
        }

        // 2. Academic content filter
        const filterResult = filterMessage(content);
        if (!filterResult.allowed) {
            const violation = await handleViolation(req.user.id, content, filterResult.reason);
            if (violation.suspended) {
                return res.status(403).json({ error: '🚫 Account suspended due to repeated policy violations. Contact admin.', warning_count: violation.warning_count, suspended: true, filtered: true });
            }
            return res.status(400).json({ error: `⚠ Warning ${violation.warning_count}/3: ${filterResult.reason}. Please keep communications academic.`, warning_count: violation.warning_count, filtered: true });
        }

        const msg = await models.Message.create({ sender_id: req.user.id, receiver_id, content });
        await msg.populate('sender_id', 'name role');
        await logActivity(req.user.id, req.user.name, 'MESSAGE_SENT', `DM to user`, null);

        res.json({
            ...msg.toObject(), id: msg._id,
            sender_name: msg.sender_id?.name, sender_role: msg.sender_id?.role
        });
    } catch (err) {
        console.error('POST /dm error:', err);
        if (err.name === 'CastError') return res.status(400).json({ error: 'Invalid User or Group ID' });
        res.status(500).json({ error: 'Server Error' });
    }
});

// GET /api/messages/groups
router.get('/groups', authenticate, async (req, res) => {
    try {
        const groups = await models.Group.find({ members: req.user.id }).lean();
        res.json(groups.map(g => ({ ...g, id: g._id })));
    } catch (err) { res.status(500).json({ error: 'Server Error' }); }
});

// GET /api/messages/group/:groupId
router.get('/group/:groupId', authenticate, async (req, res) => {
    try {
        const messages = await models.Message.find({ group_id: req.params.groupId })
            .populate('sender_id', 'name role')
            .sort('created_at').limit(100).lean();

        res.json(messages.map(m => ({
            ...m, id: m._id,
            sender_name: m.sender_id?.name,
            sender_role: m.sender_id?.role
        })));
    } catch (err) { res.status(500).json({ error: 'Server Error' }); }
});

// POST /api/messages/group - with spam + filter
router.post('/group', authenticate, async (req, res) => {
    try {
        const { group_id, content } = req.body;
        if (!group_id || !content) return res.status(400).json({ error: 'group_id and content required' });

        const spamResult = await checkSpam(req.user.id, content);
        if (spamResult.muted || spamResult.spammed) {
            return res.status(429).json({ error: `⚠ Spam detected. You are muted temporarily.`, muted: true, filtered: true });
        }

        const filterResult = filterMessage(content);
        if (!filterResult.allowed) {
            const violation = await handleViolation(req.user.id, content, filterResult.reason);
            if (violation.suspended) {
                return res.status(403).json({ error: '🚫 Account suspended due to repeated policy violations. Contact admin.', warning_count: violation.warning_count, suspended: true, filtered: true });
            }
            return res.status(400).json({ error: `⚠ Warning ${violation.warning_count}/3: ${filterResult.reason}. Please keep communications academic.`, warning_count: violation.warning_count, filtered: true });
        }

        const msg = await models.Message.create({ sender_id: req.user.id, group_id, content });
        await msg.populate('sender_id', 'name role');
        await logActivity(req.user.id, req.user.name, 'GROUP_MESSAGE', `Group ${group_id}`, null);

        res.json({
            ...msg.toObject(), id: msg._id,
            sender_name: msg.sender_id?.name, sender_role: msg.sender_id?.role
        });
    } catch (err) {
        console.error('POST /group error:', err);
        if (err.name === 'CastError') return res.status(400).json({ error: 'Invalid Group ID' });
        res.status(500).json({ error: 'Server Error' });
    }
});

// POST /api/messages/groups/create (faculty/admin)
router.post('/groups/create', authenticate, authorize('faculty', 'admin'), async (req, res) => {
    try {
        const { name, description, member_ids } = req.body;
        let members = [req.user.id];
        if (member_ids && Array.isArray(member_ids)) {
            members = [...new Set([...members, ...member_ids])];
        }

        const group = await models.Group.create({
            name, description: description || '', created_by: req.user.id, members
        });
        
        await logActivity(req.user.id, req.user.name, 'GROUP_CREATED', `Created group: ${name}`, null);
        res.json({ id: group.id, message: 'Group created' });
    } catch (err) { res.status(500).json({ error: 'Server Error' }); }
});

module.exports = router;
