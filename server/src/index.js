const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { getDb, dbPath } = require('./db');
const { parseToken } = require('./shared');
const registerPublicRoutes = require('./public-routes');
const registerAdminRoutes = require('./admin-routes');
const loadServerEnv = require('./load-env');

loadServerEnv();

const PORT = process.env.PORT || 3000;
const PUBLIC_HOST = process.env.PUBLIC_HOST || '127.0.0.1';
const uploadDir = path.resolve(__dirname, '..', 'uploads');

async function start() {
  const shouldInit = process.argv.includes('--init-db');
  const db = await getDb({ reset: shouldInit });

  if (shouldInit) {
    console.log(`Database ready: ${dbPath}`);
    process.exit(0);
  }

  const app = express();
  app.use(cors());
  fs.mkdirSync(uploadDir, { recursive: true });
  app.use('/uploads', express.static(uploadDir));
  app.use(express.json({ limit: '10mb' }));

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
    console.log(`Huoda server listening on http://${PUBLIC_HOST}:${PORT}`);
    console.log(`SQLite database: ${dbPath}`);
  });
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
