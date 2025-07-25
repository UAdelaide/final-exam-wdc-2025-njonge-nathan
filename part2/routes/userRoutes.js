// const express = require('express');
// const router = express.Router();
// const db = require('../models/db');

// // GET all users (for admin/testing)
// router.get('/', async (req, res) => {
//   try {
//     const [rows] = await db.query('SELECT user_id, username, email, role FROM Users');
//     res.json(rows);
//   } catch (error) {
//     res.status(500).json({ error: 'Failed to fetch users' });
//   }
// });

// // POST a new user (simple signup)
// router.post('/register', async (req, res) => {
//   const { username, email, password, role } = req.body;

//   try {
//     const [result] = await db.query(`
//       INSERT INTO Users (username, email, password_hash, role)
//       VALUES (?, ?, ?, ?)
//     `, [username, email, password, role]);

//     res.status(201).json({ message: 'User registered', user_id: result.insertId });
//   } catch (error) {
//     res.status(500).json({ error: 'Registration failed' });
//   }
// });

// router.get('/me', (req, res) => {
//   if (!req.session.user) {
//     return res.status(401).json({ error: 'Not logged in' });
//   }
//   res.json(req.session.user);
// });

// // POST login (dummy version)
// router.post('/login', async (req, res) => {
//   const { email, password } = req.body;

//   try {
//     const [rows] = await db.query(`
//       SELECT user_id, username, role FROM Users
//       WHERE email = ? AND password_hash = ?
//     `, [email, password]);

//     if (rows.length === 0) {
//       return res.status(401).json({ error: 'Invalid credentials' });
//     }

//     res.json({ message: 'Login successful', user: rows[0] });
//   } catch (error) {
//     res.status(500).json({ error: 'Login failed' });
//   }
// });

// module.exports = router;

// routes/userRoutes.js
const express = require('express');
const db      = require('../models/db');

const router = express.Router();

/**
 * GET /api/users
 * (Admin/testing) Return basic info for all users.
 */
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT user_id, username, email, role FROM Users'
    );
    res.json(rows);
  } catch (err) {
    console.error('Failed to fetch users:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

/**
 * GET /api/users/me
 * Return the currently logged-in user from session.
 */
router.get('/me', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Not logged in' });
  }
  res.json(req.session.user);
});

/**
 * POST /login
 * Validate credentials, store user in session, and redirect
 * to the correct dashboard page.
 */
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const [rows] = await db.execute(
      `SELECT user_id, username, role
       FROM Users
       WHERE username = ? AND password_hash = ?`,
      [username, password]
    );
    if (rows.length === 0) {
      // invalid credentials → back to login with error
      return res.redirect('/?error=Invalid%20credentials');
    }

    // save user info in session
    req.session.user = rows[0];

    // redirect based on role
    if (rows[0].role === 'owner') {
      return res.redirect('/owner-dashboard.html');
    }
    res.redirect('/walker-dashboard.html');

  } catch (err) {
    console.error('Login failed:', err);
    res.status(500).send('Login failed');
  }
});

module.exports = router;
