const express = require('express');
const mysql   = require('mysql2/promise');

async function main() {
  // (A) open connection
  const db = await mysql.createConnection({
    host:     'localhost',
    user:     'YOUR_DB_USER',
    password: 'YOUR_DB_PASS',
    database: 'DogWalkService'
  });

  // (B) create Express
  const app = express();

  // we’ll add routes here…

  // (C) listen
  app.listen(8080, () => {
    console.log('Server listening on http://localhost:8080');
  });
}

main().catch(err => {
  console.error('Startup error', err);
  process.exit(1);
});
