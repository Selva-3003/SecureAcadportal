const jwt = require('jsonwebtoken');

function authenticate(req, res, next) {
    const header = req.headers['authorization'];
    if (!header) return res.status(401).json({ error: 'No token provided' });

    const token = header.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Invalid token format' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (e) {
        return res.status(401).json({ error: 'Token expired or invalid' });
    }
}

function authorize(...roles) {
    return (req, res, next) => {
        console.log(`[AUTH] Checking role: ${req.user.role} against allowed: ${roles.join(',')}`);
        if (!roles.includes(req.user.role)) {
            console.log('[AUTH] Access denied');
            return res.status(403).json({ error: 'Access denied' });
        }
        next();
    };
}

module.exports = { authenticate, authorize };
