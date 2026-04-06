require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const models = require('./database'); // This initializes Mongoose

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] }
});

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, '..', 'frontend'), { index: false }));

// Redirect root to /login
app.get('/', (req, res) => {
    res.redirect('/login');
});

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/announcements', require('./routes/announcements'));
app.use('/api/assignments', require('./routes/assignments'));
app.use('/api/leaves', require('./routes/leaves'));
app.use('/api/academic', require('./routes/academic'));
app.use('/api/admin', require('./routes/admin'));

// Socket.IO for real-time chat
const onlineUsers = new Map();

io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication required'));
    try {
        const user = jwt.verify(token, process.env.JWT_SECRET);
        socket.user = user;
        next();
    } catch (err) {
        next(new Error('Invalid token'));
    }
});

io.on('connection', async (socket) => {
    console.log(`User connected: ${socket.user.name} (${socket.user.role})`);
    onlineUsers.set(socket.user.id, { id: socket.user.id, name: socket.user.name, role: socket.user.role });
    io.emit('online_users', Array.from(onlineUsers.values()));

    // Join personal room
    socket.join(`user_${socket.user.id}`);

    // Join group rooms
    try {
        const groups = await models.Group.find({ members: socket.user.id });
        groups.forEach(g => socket.join(`group_${g._id}`));
    } catch (err) {
        console.error('Socket Group Error:', err);
    }

    // Direct message event
    socket.on('send_dm', (data) => {
        const { receiver_id, content, message } = data;
        const msgData = { ...message, type: 'dm' };
        io.to(`user_${receiver_id}`).emit('new_message', msgData);
        socket.emit('message_sent', msgData);
    });

    // Group message event
    socket.on('send_group', (data) => {
        const { group_id, content, message } = data;
        const msgData = { ...message, type: 'group' };
        io.to(`group_${group_id}`).emit('new_group_message', msgData);
    });

    // Typing indicator
    socket.on('typing', (data) => {
        if (data.receiver_id) {
            io.to(`user_${data.receiver_id}`).emit('user_typing', { user_id: socket.user.id, name: socket.user.name });
        }
    });

    socket.on('stop_typing', (data) => {
        if (data.receiver_id) {
            io.to(`user_${data.receiver_id}`).emit('user_stop_typing', { user_id: socket.user.id });
        }
    });

    socket.on('disconnect', () => {
        onlineUsers.delete(socket.user.id);
        io.emit('online_users', Array.from(onlineUsers.values()));
        console.log(`User disconnected: ${socket.user.name}`);
    });
});

// Serve frontend for all non-API routes
app.use((req, res, next) => {
    // If it's an API route that missed, return JSON 404
    if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'API route not found' });
    res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// JSON Error Handler (must be after all routes)
app.use((err, req, res, next) => {
    console.error('[SERVER ERROR]', err);
    res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`\n🎓 Secure Academic Portal running at http://localhost:${PORT}`);
    console.log(`\n📋 Default Credentials:`);
    console.log(`   Admin:   admin@portal.edu    / Admin@123`);
    console.log(`   Faculty: sarah.johnson@portal.edu / Faculty@123`);
    console.log(`   Student: alex.t@portal.edu   / Student@123\n`);
});
