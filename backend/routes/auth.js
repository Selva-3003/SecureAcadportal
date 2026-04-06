const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const models = require('../database');
const { bruteForceGuard, recordLoginAttempt, logActivity, WARN_THRESHOLD, LOCK_THRESHOLD } = require('../middleware/security');

// ─── POST /api/auth/login ───────────────────────────────────────────────────
router.post('/login', bruteForceGuard, async (req, res) => {
    try {
        const { email, password, role } = req.body;
        const ip = req._ip || req.ip;
        if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

        const user = await models.User.findOne({ email });
        if (!user) {
            await recordLoginAttempt(email, ip, false);
            const since = new Date(Date.now() - 10 * 60 * 1000);
            const fails = await models.LoginAttempt.countDocuments({ email, success: false, attempted_at: { $gt: since } });
            return res.status(401).json({
                error: 'Invalid credentials',
                attempts_remaining: Math.max(0, LOCK_THRESHOLD - fails)
            });
        }

        if (user.is_suspended) {
            await recordLoginAttempt(email, ip, false);
            return res.status(403).json({ error: '🚫 Account suspended. Contact your administrator.' });
        }

        const demoEmails = ['admin@portal.edu', 'sarah.johnson@portal.edu', 'alex.t@portal.edu'];
        if (!demoEmails.includes(user.email) && role && user.role !== role) {
            await recordLoginAttempt(email, ip, false);
            return res.status(401).json({ error: `System Warning: Please enter valid details for the ${role.charAt(0).toUpperCase() + role.slice(1)} portal, or select the correct role tab.` });
        }

        const valid = bcrypt.compareSync(password, user.password);
        if (!valid) {
            await recordLoginAttempt(email, ip, false);
            const since = new Date(Date.now() - 10 * 60 * 1000);
            const fails = await models.LoginAttempt.countDocuments({ email, success: false, attempted_at: { $gt: since } });
            const remaining = Math.max(0, LOCK_THRESHOLD - fails);
            let message = 'Invalid credentials';
            if (fails >= WARN_THRESHOLD) message = `⚠ Invalid credentials. ${remaining} attempt(s) left before lockout.`;
            return res.status(401).json({ error: message, attempts_remaining: remaining });
        }

        // Password valid → complete login immediately
        await recordLoginAttempt(user.email, ip, true);
        await logActivity(user.id, user.name, 'LOGIN_SUCCESS', `Login completed from ${ip}`, ip);

        const token = jwt.sign(
            { id: user.id, role: user.role, name: user.name, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        res.json({
            token,
            user: {
                id: user.id, name: user.name, email: user.email,
                role: user.role, student_id: user.student_id,
                department: user.department, warning_count: user.warning_count
            }
        });
    } catch (err) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// ─── GET /api/auth/me (Verify token) ─────────────────────────────────────────
router.get('/me', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await models.User.findById(decoded.id).select('name email role student_id department warning_count');
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    } catch (err) {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
});

// ─── POST /api/auth/register ─────────────────────────────────────────────────
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, role, student_id, department } = req.body;
        if (!name || !email || !password || !role) return res.status(400).json({ error: 'All fields required' });
        if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

        const existing = await models.User.findOne({ email });
        if (existing) return res.status(409).json({ error: 'Email already registered' });

        const hash = bcrypt.hashSync(password, 10);
        const user = await models.User.create({
            name, email, password: hash, role, student_id: student_id || null, department: department || null
        });

        const newUserId = user._id;

        // Automatically add the new user to all existing groups so they can see them
        await models.Group.updateMany({}, { $addToSet: { members: newUserId } });

        await logActivity(newUserId, name, 'REGISTERED', `New ${role} account created`, req.ip);
        res.json({ message: 'Registration successful', userId: user.id });
    } catch (err) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// ─── POST /api/auth/logout ───────────────────────────────────────────────────
router.post('/logout', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            await logActivity(decoded.id, decoded.name, 'LOGOUT', 'User signed out', req.ip);
        } catch { }
    }
    res.json({ message: 'Logged out' });
});

module.exports = router;
