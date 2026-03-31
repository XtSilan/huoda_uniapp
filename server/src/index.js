const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { getDb, dbPath } = require('./db');
const { parseToken } = require('./shared');
const registerPublicRoutes = require('./public-routes');
const registerAdminRoutes = require('./admin-routes');

const PORT = process.env.PORT || 3000;
const uploadsDir = path.resolve(__dirname, '..', 'uploads');

async function start() {
  const shouldResetDb = process.argv.includes('--init-db');
  const db = await getDb({ reset: shouldResetDb });

  if (shouldResetDb) {
    console.log(`Database ready: ${dbPath}`);
    process.exit(0);
  }

  const app = express();
  fs.mkdirSync(uploadsDir, { recursive: true });
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use('/uploads', express.static(uploadsDir));

  app.use((req, _res, next) => {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    const userId = parseToken(token);
    req.user = userId ? db.get('SELECT * FROM users WHERE id = ?', [userId]) : null;
    next();
  });

  registerPublicRoutes(app, db);
  registerAdminRoutes(app, db);

  app.listen(PORT, () => {
    console.log(`Huoda server listening on http://localhost:${PORT}`);
    console.log(`SQLite database: ${dbPath}`);
  });
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
