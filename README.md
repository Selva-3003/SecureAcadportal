# 🎓 Secure Academic Communication Portal

A full-stack academic portal with a clean separation between frontend and backend code.

---

## 📁 Project Structure

```
New Project/
├── backend/               ← Node.js + Express API Server
│   ├── server.js          ← Main server entry point
│   ├── database.js        ← SQLite database setup & queries
│   ├── .env               ← Environment variables (JWT secret, PORT)
│   ├── package.json       ← Backend dependencies
│   ├── routes/            ← API route handlers
│   │   ├── auth.js
│   │   ├── messages.js
│   │   ├── announcements.js
│   │   ├── assignments.js
│   │   ├── leaves.js
│   │   ├── academic.js
│   │   └── admin.js
│   ├── middleware/        ← Express middleware
│   │   ├── auth.js
│   │   ├── messageFilter.js
│   │   └── security.js
│   └── uploads/           ← Uploaded files (auto-created)
│
└── frontend/              ← Static Frontend (HTML, CSS, JS)
    ├── index.html         ← Main HTML entry point
    ├── style.css          ← Global styles
    ├── app.js             ← Main application logic
    ├── admin.js           ← Admin panel logic
    ├── messages.js        ← Messaging UI logic
    ├── modules.js         ← Feature modules
    └── views.js           ← View rendering helpers
```

---

## 🚀 How to Run

### 1. Start the Backend

```bash
cd backend
npm install
npm start
```

The server will start at: **http://localhost:3000**

The backend also **serves the frontend** automatically — just open the URL above in your browser.

### 2. Default Login Credentials

| Role    | Email                       | Password     |
|---------|-----------------------------|--------------|
| Admin   | admin@portal.edu            | Admin@123    |
| Faculty | sarah.johnson@portal.edu    | Faculty@123  |
| Student | alex.t@portal.edu           | Student@123  |

---

## 🔧 Environment Variables (`backend/.env`)

| Variable       | Description                      |
|----------------|----------------------------------|
| `PORT`         | Server port (default: 3000)      |
| `JWT_SECRET`   | Secret key for JWT tokens        |
| `JWT_EXPIRES_IN` | Token expiry duration           |
| `NODE_ENV`     | Environment (`development`/`production`) |
"# SecurePortal" 
"# SecurePortal" 
"# Secure_Portal" 
"# Secure_Portal" 
"# Secure_Portal" 
