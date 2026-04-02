const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const { DEFAULT_AI_CONFIG, DEFAULT_USER_AI_SETTINGS } = require('./ai-client');

const dataDir = path.resolve(__dirname, '..', 'data');
const dbPath = path.join(dataDir, 'huoda.sqlite');

function wrap(db) {
  return {
    exec(sql) {
      db.exec(sql);
    },
    get(sql, params = []) {
      return db.prepare(sql).get(...params);
    },
    all(sql, params = []) {
      return db.prepare(sql).all(...params);
    },
    run(sql, params = []) {
      const result = db.prepare(sql).run(...params);
      return {
        changes: result.changes || 0,
        lastID: Number(result.lastInsertRowid || 0)
      };
    }
  };
}

function createDb() {
  fs.mkdirSync(dataDir, { recursive: true });
  const db = new DatabaseSync(dbPath);
  return wrap(db);
}

function ensureColumn(db, tableName, columnName, definition) {
  const columns = db.all(`PRAGMA table_info(${tableName})`);
  if (!columns.some((column) => column.name === columnName)) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}

async function getDb(options = {}) {
  if (options.reset && fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }

  const db = createDb();

  db.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      status TEXT NOT NULL DEFAULT 'active',
      school TEXT DEFAULT '',
      department TEXT DEFAULT '',
      class_name TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      avatar_url TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      last_login_at TEXT
    );

    CREATE TABLE IF NOT EXISTS user_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      grade TEXT DEFAULT '',
      education_type TEXT DEFAULT '',
      interests TEXT DEFAULT '[]',
      future_plan TEXT DEFAULT '',
      notification_settings TEXT DEFAULT '{}',
      theme_settings TEXT DEFAULT '{}',
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS banners (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      image_url TEXT NOT NULL,
      link_url TEXT DEFAULT '',
      link_type TEXT DEFAULT 'placeholder',
      sort_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS infos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      summary TEXT DEFAULT '',
      content TEXT NOT NULL,
      source TEXT NOT NULL,
      source_url TEXT DEFAULT '',
      attachments TEXT DEFAULT '[]',
      category TEXT DEFAULT '其他',
      location_type TEXT DEFAULT '校内',
      status TEXT DEFAULT 'published',
      publish_time TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      summary TEXT DEFAULT '',
      content TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      location TEXT NOT NULL,
      location_type TEXT DEFAULT '校内',
      organizer TEXT NOT NULL,
      images TEXT DEFAULT '[]',
      activity_type TEXT DEFAULT '其他',
      status TEXT DEFAULT 'upcoming',
      publish_time TEXT NOT NULL,
      creator_user_id INTEGER,
      apply_count INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (creator_user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS activity_applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      activity_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(activity_id, user_id),
      FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      target_type TEXT NOT NULL,
      target_id INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(user_id, target_type, target_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS browse_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      target_type TEXT NOT NULL,
      target_id INTEGER DEFAULT 0,
      title TEXT NOT NULL,
      summary TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      distance REAL NOT NULL,
      duration INTEGER NOT NULL,
      calories INTEGER NOT NULL,
      date TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sign_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      course_name TEXT NOT NULL,
      teacher TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'success',
      time TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS class_groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      class_name TEXT NOT NULL UNIQUE,
      group_name TEXT NOT NULL,
      announcement TEXT DEFAULT '',
      qr_code TEXT DEFAULT '',
      online_count INTEGER DEFAULT 0,
      classmates TEXT DEFAULT '[]',
      messages TEXT DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ai_model_presets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      provider TEXT NOT NULL DEFAULT 'openai',
      base_url TEXT NOT NULL,
      api_key TEXT DEFAULT '',
      model TEXT NOT NULL,
      temperature REAL DEFAULT 0.7,
      top_p REAL DEFAULT 1,
      max_tokens INTEGER DEFAULT 512,
      presence_penalty REAL DEFAULT 0,
      frequency_penalty REAL DEFAULT 0,
      system_prompt TEXT DEFAULT '',
      is_default INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL DEFAULT 'system',
      title TEXT NOT NULL,
      content TEXT DEFAULT '',
      payload TEXT DEFAULT '{}',
      release_id TEXT DEFAULT '',
      is_read INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      read_at TEXT DEFAULT '',
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  ensureColumn(db, 'user_settings', 'ai_settings', `TEXT DEFAULT '${JSON.stringify(DEFAULT_USER_AI_SETTINGS)}'`);
  ensureColumn(db, 'infos', 'location_type', `TEXT DEFAULT '校内'`);
  ensureColumn(db, 'infos', 'source_url', `TEXT DEFAULT ''`);
  ensureColumn(db, 'infos', 'attachments', `TEXT DEFAULT '[]'`);
  ensureColumn(db, 'activities', 'images', `TEXT DEFAULT '[]'`);
  ensureColumn(db, 'activities', 'location_type', `TEXT DEFAULT '校内'`);
  ensureColumn(db, 'notifications', 'payload', `TEXT DEFAULT '{}'`);
  ensureColumn(db, 'notifications', 'release_id', `TEXT DEFAULT ''`);
  ensureColumn(db, 'notifications', 'read_at', `TEXT DEFAULT ''`);

  await seed(db);
  return db;
}

async function seed(db) {
  const now = new Date().toISOString();

  if (!db.get('SELECT COUNT(*) AS count FROM users').count) {
    db.run(
      `INSERT INTO users
      (student_id, password, name, role, status, school, department, class_name, phone, avatar_url, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ['admin', 'admin', '系统管理员', 'admin', 'active', '', '', '', '', '', now, now]
    );
  }

  const allUsers = db.all('SELECT id, role, class_name, name FROM users ORDER BY id ASC');
  allUsers.forEach((user) => {
    if (!db.get('SELECT id FROM user_settings WHERE user_id = ?', [user.id])) {
      db.run(
        `INSERT INTO user_settings
        (user_id, grade, education_type, interests, future_plan, notification_settings, theme_settings, ai_settings, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          user.id,
          '大一',
          '本科',
          JSON.stringify(user.role === 'admin' ? ['讲座', '竞赛'] : ['讲座', '就业', '公益']),
          '就业',
          JSON.stringify({ activity: true, lecture: true, partTime: true }),
          JSON.stringify({ darkMode: false, autoRefresh: true }),
          JSON.stringify(DEFAULT_USER_AI_SETTINGS),
          now
        ]
      );
    }
  });

  db.run(
    `UPDATE user_settings
    SET ai_settings = COALESCE(NULLIF(ai_settings, ''), ?)
    WHERE ai_settings IS NULL OR ai_settings = ''`,
    [JSON.stringify(DEFAULT_USER_AI_SETTINGS)]
  );

  if (!db.get('SELECT COUNT(*) AS count FROM ai_model_presets').count) {
    db.run(
      `INSERT INTO ai_model_presets
      (name, provider, base_url, api_key, model, temperature, top_p, max_tokens, presence_penalty, frequency_penalty, system_prompt, is_default, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        '平台默认模型',
        DEFAULT_AI_CONFIG.provider,
        DEFAULT_AI_CONFIG.baseUrl,
        DEFAULT_AI_CONFIG.apiKey,
        DEFAULT_AI_CONFIG.model || 'gpt-4.1-mini',
        DEFAULT_AI_CONFIG.temperature,
        DEFAULT_AI_CONFIG.topP,
        DEFAULT_AI_CONFIG.maxTokens,
        DEFAULT_AI_CONFIG.presencePenalty,
        DEFAULT_AI_CONFIG.frequencyPenalty,
        DEFAULT_AI_CONFIG.systemPrompt,
        1,
        1,
        now,
        now
      ]
    );
  }

  allUsers.forEach((user) => {
    const className = (user.class_name || '').trim();
    if (!className) {
      return;
    }
    if (!db.get('SELECT id FROM class_groups WHERE class_name = ?', [className])) {
      db.run(
        `INSERT INTO class_groups
        (class_name, group_name, announcement, qr_code, online_count, classmates, messages, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [className, `${className}群`, '', '', 0, '[]', '[]', now, now]
      );
    }
  });
}

module.exports = {
  getDb,
  dbPath
};
