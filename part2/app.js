// const express = require('express');
// const path = require('path');
// require('dotenv').config();

// const app = express();

// // Middleware
// app.use(express.json());
// app.use(express.static(path.join(__dirname, '/public')));

// // Routes
// const walkRoutes = require('./routes/walkRoutes');
// const userRoutes = require('./routes/userRoutes');

// app.use('/api/walks', walkRoutes);
// app.use('/api/users', userRoutes);

// // Export the app instead of listening here
// module.exports = app;

// app.js
const express = require('express');
const path    = require('path');
const session = require('express-session');
require('dotenv').config();

const walkRoutes = require('./routes/walkRoutes');
const userRoutes = require('./routes/userRoutes');

const app = express();

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Sessions
app.use(session({
  secret: process.env.SESSION_SECRET || 'change_this',
  resave: false,
  saveUninitialized: false
}));

// Serve static files
app.use(express.static(path.join(__dirname, '/public')));

// Login handler (inlined here for brevity)
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const db = require('./models/db');
  const [rows] = await db.execute(
    'SELECT user_id, username, role FROM Users WHERE username = ? AND password_hash = ?',
    [username, password]
  );
  if (!rows.length) {
    return res.redirect('/?error=Invalid%20credentials');
  }
  req.session.user = rows[0];
  if (rows[0].role === 'owner') {
    return res.redirect('/owner-dashboard.html');
  }
  res.redirect('/walker-dashboard.html');
});

// Protect owner dashboard
app.use('/owner-dashboard.html', (req, res, next) => {
  if (!req.session.user || req.session.user.role !== 'owner') {
    return res.redirect('/');
  }
  next();
});

// Protect walker dashboard
app.use('/walker-dashboard.html', (req, res, next) => {
  if (!req.session.user || req.session.user.role !== 'walker') {
    return res.redirect('/');
  }
  next();
});

// LOGOUT: destroy session & clear cookie
app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) console.error('Logout error:', err);
    res.clearCookie('connect.sid');
    res.redirect('/');
  });
});

// API routes
app.use('/api/walks', walkRoutes);
app.use('/api/users', userRoutes);

module.exports = app;
