// app.js
const express = require('express');
const mysql   = require('mysql2/promise');

async function main() {
  // 1. Connect to MySQL
  const db = await mysql.createConnection({
    host:     'localhost',
    user:     'root',
    password: '',
    database: 'DogWalkService'
  });

  // 2. Seed test data (INSERT IGNORE so you can restart safely)
  await db.execute(`
    INSERT IGNORE INTO Users (username,email,password_hash,role) VALUES
      ('alice123','alice@example.com','hashed123','owner'),
      ('bobwalker','bobwalker@example.com','hashed456','walker'),
      ('carol123','carol@example.com','hashed789','owner'),
      ('davewalker','dave@example.com','hashed101112','walker'),
      ('eveowner','eve@example.com','hashed131415','owner');
  `);

  await db.execute(`
    INSERT IGNORE INTO Dogs (owner_id,name,size) VALUES
      ((SELECT user_id FROM Users WHERE username='alice123'),'Max','medium'),
      ((SELECT user_id FROM Users WHERE username='carol123'),'Bella','small'),
      ((SELECT user_id FROM Users WHERE username='alice123'),'Charlie','small'),
      ((SELECT user_id FROM Users WHERE username='carol123'),'Daisy','large'),
      ((SELECT user_id FROM Users WHERE username='eveowner'),'Rex','large');
  `);

  await db.execute(`
    INSERT IGNORE INTO WalkRequests
      (dog_id,requested_time,duration_minutes,location,status) VALUES
      ((SELECT dog_id FROM Dogs WHERE name='Max'),'2025-06-10 08:00:00',30,'Parklands','open'),
      ((SELECT dog_id FROM Dogs WHERE name='Bella'),'2025-06-10 09:30:00',45,'Beachside Ave','accepted'),
      ((SELECT dog_id FROM Dogs WHERE name='Charlie'),'2025-06-11 07:00:00',20,'Central Park','open'),
      ((SELECT dog_id FROM Dogs WHERE name='Daisy'),'2025-06-12 14:00:00',60,'Riverside Walk','completed'),
      ((SELECT dog_id FROM Dogs WHERE name='Rex'),'2025-06-13 16:30:00',40,'Hillside Trail','cancelled');
  `);

  // 3. Create Express app
  const app = express();

  // 4. Define routes

  // GET /api/dogs
  app.get('/api/dogs', async (req, res) => {
    try {
      const [rows] = await db.execute(`
        SELECT
          d.name     AS dog_name,
          d.size,
          u.username AS owner_username
        FROM Dogs d
        JOIN Users u ON d.owner_id = u.user_id
        ORDER BY d.name
      `);
      res.json(rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch dogs' });
    }
  });

  // GET /api/walkrequests/open
  app.get('/api/walkrequests/open', async (req, res) => {
    try {
      const [rows] = await db.execute(`
        SELECT
          wr.request_id,
          d.name           AS dog_name,
          wr.requested_time,
          wr.duration_minutes,
          wr.location,
          u.username       AS owner_username
        FROM WalkRequests wr
        JOIN Dogs d  ON wr.dog_id  = d.dog_id
        JOIN Users u ON d.owner_id = u.user_id
        WHERE wr.status = 'open'
        ORDER BY wr.requested_time
      `);
      res.json(rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch open walk requests' });
    }
  });

  // GET /api/walkers/summary
  app.get('/api/walkers/summary', async (req, res) => {
    try {
      const [rows] = await db.execute(`
        SELECT
          u.username                   AS walker_username,
          COUNT(r.rating_id)           AS total_ratings,
          AVG(r.rating)                AS average_rating,
          COUNT(r.rating_id)           AS completed_walks
        FROM Users u
        LEFT JOIN WalkRatings r
          ON u.user_id = r.walker_id
        WHERE u.role = 'walker'
        GROUP BY u.user_id, u.username
        ORDER BY u.username
      `);
      res.json(rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch walkers summary' });
    }
  });

  // 5. Start server
  const PORT = process.env.PORT || 8080;
  app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}

main().catch(err => {
  console.error('Startup error:', err);
  process.exit(1);
});
