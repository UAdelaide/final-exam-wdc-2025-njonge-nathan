// const express = require('express');
// const router = express.Router();
// const db = require('../models/db');

// // GET all walk requests (for walkers to view)
// router.get('/', async (req, res) => {
//   try {
//     const [rows] = await db.query(`
//       SELECT wr.*, d.name AS dog_name, d.size, u.username AS owner_name
//       FROM WalkRequests wr
//       JOIN Dogs d ON wr.dog_id = d.dog_id
//       JOIN Users u ON d.owner_id = u.user_id
//       WHERE wr.status = 'open'
//     `);
//     res.json(rows);
//   } catch (error) {
//     console.error('SQL Error:', error);
//     res.status(500).json({ error: 'Failed to fetch walk requests' });
//   }
// });

// // POST a new walk request (from owner)
// router.post('/', async (req, res) => {
//   const { dog_id, requested_time, duration_minutes, location } = req.body;

//   try {
//     const [result] = await db.query(`
//       INSERT INTO WalkRequests (dog_id, requested_time, duration_minutes, location)
//       VALUES (?, ?, ?, ?)
//     `, [dog_id, requested_time, duration_minutes, location]);

//     res.status(201).json({ message: 'Walk request created', request_id: result.insertId });
//   } catch (error) {
//     res.status(500).json({ error: 'Failed to create walk request' });
//   }
// });

// // POST an application to walk a dog (from walker)
// router.post('/:id/apply', async (req, res) => {
//   const requestId = req.params.id;
//   const { walker_id } = req.body;

//   try {
//     await db.query(`
//       INSERT INTO WalkApplications (request_id, walker_id)
//       VALUES (?, ?)
//     `, [requestId, walker_id]);

//     await db.query(`
//       UPDATE WalkRequests
//       SET status = 'accepted'
//       WHERE request_id = ?
//     `, [requestId]);

//     res.status(201).json({ message: 'Application submitted' });
//   } catch (error) {
//     console.error('SQL Error:', error);
//     res.status(500).json({ error: 'Failed to apply for walk' });
//   }
// });

// module.exports = router;

// routes/walkRoutes.js
const express = require('express');
const db      = require('../models/db');

const router = express.Router();

// ─── Authentication guard for walkers ────────────────────────────
router.use((req, res, next) => {
  if (!req.session.user || req.session.user.role !== 'walker') {
    return res.status(401).json({ error: 'Unauthorized: walkers only' });
  }
  next();
});

/**
 * GET /api/walks/open
 * Return all open walk requests with dog name, requested time, duration,
 * location, and owner’s username.
 */
router.get('/open', async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT
        wr.request_id,
        d.name               AS dog_name,
        wr.requested_time,
        wr.duration_minutes,
        wr.location,
        u.username           AS owner_username
      FROM WalkRequests wr
      JOIN Dogs d
        ON wr.dog_id = d.dog_id
      JOIN Users u
        ON d.owner_id = u.user_id
      WHERE wr.status = 'open'
      ORDER BY wr.requested_time
    `);
    res.json(rows);
  } catch (err) {
    console.error('Failed to fetch open walks:', err);
    res.status(500).json({ error: 'Failed to fetch open walks' });
  }
});

/**
 * POST /api/walks/:id/apply
 * Submit an application for a walk request (walker applies).
 */
router.post('/:id/apply', async (req, res) => {
  const requestId = req.params.id;
  const walkerId  = req.session.user.user_id;

  try {
    // Insert application
    await db.execute(`
      INSERT INTO WalkApplications (request_id, walker_id)
      VALUES (?, ?)
    `, [requestId, walkerId]);

    // Optionally update request status to 'accepted'
    // (if the requirement is to auto-accept on first apply;
    // otherwise owners accept later via another endpoint)
    await db.execute(`
      UPDATE WalkRequests
      SET status = 'accepted'
      WHERE request_id = ?
    `, [requestId]);

    res.status(201).json({ message: 'Application submitted' });
  } catch (err) {
    console.error('Application error:', err);
    res.status(500).json({ error: 'Failed to apply for walk' });
  }
});

module.exports = router;
