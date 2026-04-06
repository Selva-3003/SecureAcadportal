/**
 * SECURITY MIDDLEWARE
 * Features: Brute-force protection, IDS, Activity logging, Spam detection
 */

const models = require('../database');

// ─── ACTIVITY LOGGER ─────────────────────────────────────────────────────────
async function logActivity(userId, userName, action, details, ip) {
    try {
        await models.ActivityLog.create({
            user_id: userId || null,
            user_name: userName || 'Anonymous',
            action,
            details: details || null,
            ip: ip || null
        });
    } catch (e) { /* silent */ }
}

function activityLogger(action, detailsFn) {
    return (req, res, next) => {
        const original = res.json.bind(res);
        res.json = (body) => {
            if (res.statusCode < 400 && req.user) {
                const details = detailsFn ? detailsFn(req, body) : null;
                logActivity(req.user.id, req.user.name, action, details, req.ip);
            }
            return original(body);
        };
        next();
    };
}

// ─── BRUTE FORCE LIMITER ─────────────────────────────────────────────────────
const LOCK_THRESHOLD = 5;      // lock after 5 fails
const WARN_THRESHOLD = 3;      // warn after 3 fails
const LOCK_DURATION_MS = 10 * 60 * 1000; // 10 minutes

async function checkBruteForce(email) {
    const since = new Date(Date.now() - LOCK_DURATION_MS);
    const count = await models.LoginAttempt.countDocuments({ email, success: false, attempted_at: { $gt: since } });
    return count;
}

async function recordLoginAttempt(email, ip, success) {
    await models.LoginAttempt.create({ email, ip, success });
    if (!success) {
        const fails = await checkBruteForce(email);
        if (fails >= LOCK_THRESHOLD) {
            // Create security alert
            const user = await models.User.findOne({ email });
            await models.SecurityAlert.create({
                alert_type: 'brute_force',
                severity: 'high',
                user_id: user?._id || null,
                details: `${fails} failed logins for ${email} from ${ip}`
            });
        }
    }
}

async function bruteForceGuard(req, res, next) {
    try {
        const { email } = req.body;
        const ip = req.ip || req.connection?.remoteAddress || 'unknown';
        if (!email) return next();

        const fails = await checkBruteForce(email);
        if (fails >= LOCK_THRESHOLD) {
            return res.status(429).json({
                error: `🔒 Account temporarily locked after ${fails} failed attempts. Try again in 10 minutes.`,
                locked: true,
                attempts: fails
            });
        }
        req._ip = ip;
        req._loginEmail = email;
        next();
    } catch (err) {
        next(err);
    }
}

// ─── SPAM DETECTOR ───────────────────────────────────────────────────────────
const SPAM_THRESHOLD = 5;         // same msg 5x = spam
const MUTE_DURATION_MS = 10 * 60 * 1000; // 10 min mute

async function checkSpam(userId, content) {
    const now = new Date();
    const existing = await models.SpamTracker.findOne({ user_id: userId });

    if (existing) {
        // Check if muted
        if (existing.muted_until && existing.muted_until > now) {
            const remaining = Math.ceil((existing.muted_until - now) / 60000);
            return { spammed: true, muted: true, remaining };
        }
        // Same message?
        if (existing.last_message === content.trim()) {
            const newCount = existing.repeat_count + 1;
            if (newCount >= SPAM_THRESHOLD) {
                existing.repeat_count = newCount;
                existing.muted_until = new Date(now.getTime() + MUTE_DURATION_MS);
                existing.updated_at = now;
                await existing.save();

                await models.SecurityAlert.create({
                    alert_type: 'spam', severity: 'medium', user_id: userId, details: `Sent same message ${newCount} times`
                });
                return { spammed: true, muted: false, count: newCount };
            }
            existing.repeat_count = newCount;
            existing.updated_at = now;
            await existing.save();
            return { spammed: false, count: newCount };
        } else {
            existing.last_message = content.trim();
            existing.repeat_count = 1;
            existing.muted_until = null;
            existing.updated_at = now;
            await existing.save();
        }
    } else {
        await models.SpamTracker.create({ user_id: userId, last_message: content.trim() });
    }
    return { spammed: false };
}

// ─── SECURITY ALERT CREATOR ──────────────────────────────────────────────────
async function createAlert(type, severity, userId, details) {
    await models.SecurityAlert.create({
        alert_type: type, severity, user_id: userId || null, details
    });
}

module.exports = { logActivity, activityLogger, bruteForceGuard, recordLoginAttempt, checkSpam, createAlert, WARN_THRESHOLD, LOCK_THRESHOLD };
