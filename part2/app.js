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

// ─── Middleware ────────────────────────────────────────────────
// parse JSON and URL-encoded form bodies
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// sessions for login
app.use(session({
  secret: process.env.SESSION_SECRET || 'change_this',
  resave: false,
  saveUninitialized: false
}));

// serve static HTML + assets
app.use(express.static(path.join(__dirname, 'public')));


// ─── Authentication / Session Routes ──────────────────────────
// POST /login — validate credentials, store user in session, redirect
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    // you’ll need a `db` connection in userRoutes or import it here
    const db = require('./models/db');
    const [rows] = await db.execute(
      'SELECT user_id, username, role FROM Users WHERE username = ? AND password_hash = ?',
      [username, password]
    );
    if (rows.length === 0) {
      return res.redirect('/?error=Invalid%20credentials');
    }

    // store logged-in user
    req.session.user = rows[0];

    // redirect based on role
    if (rows[0].role === 'owner') {
      return res.redirect('/owner-dashboard.html');
    }
    res.redirect('/walker-dashboard.html');
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).send('Login failed');
  }
});


// ─── Route Guards for Dashboards ──────────────────────────────
app.use('/owner-dashboard.html', (req, res, next) => {
  if (!req.session.user || req.session.user.role !== 'owner') {
    return res.redirect('/');
  }
  next(); // allow static file to be served
});

app.use('/walker-dashboard.html', (req, res, next) => {
  if (!req.session.user || req.session.user.role !== 'walker') {
    return res.redirect('/');
  }
  next(); // allow static file to be served
});


// ─── API Routes ────────────────────────────────────────────────
app.use('/api/walks', walkRoutes);
app.use('/api/users', userRoutes);


// ─── Export ───────────────────────────────────────────────────
module.exports = app;
