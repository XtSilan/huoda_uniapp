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

async function getDb() {
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
      category TEXT DEFAULT '资讯',
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
  `);

  ensureColumn(db, 'user_settings', 'ai_settings', `TEXT DEFAULT '${JSON.stringify(DEFAULT_USER_AI_SETTINGS)}'`);

  await seed(db);
  return db;
}

async function seed(db) {
  const now = new Date().toISOString();

  const userCount = db.get('SELECT COUNT(*) AS count FROM users');
  if (!userCount.count) {
    [
      ['20240001', '123456', '测试用户', 'user', 'active', '活达大学', '计算机学院', '大数据 2411 班', '13800138000', '', now, now],
      ['admin001', 'admin123', '系统管理员', 'admin', 'active', '活达大学', '信息中心', '管理组', '13900139000', '', now, now]
    ].forEach((item) => {
      db.run(
        `INSERT INTO users
        (student_id, password, name, role, status, school, department, class_name, phone, avatar_url, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        item
      );
    });
  }

  const allUsers = db.all('SELECT id, role FROM users');
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
          JSON.stringify(user.role === 'admin' ? ['通知', '竞赛'] : ['讲座', '就业', '公益']),
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

  if (!db.get('SELECT COUNT(*) AS count FROM banners').count) {
    [
      ['春季校园招聘', 'https://dummyimage.com/1200x420/1e88e5/ffffff&text=%E6%98%A5%E5%AD%A3%E6%A0%A1%E5%9B%AD%E6%8B%9B%E8%81%98', '/pages/feature/banner-placeholder/banner-placeholder?id=1', 'placeholder', 1, 1, now, now],
      ['科技节作品征集', 'https://dummyimage.com/1200x420/43a047/ffffff&text=%E7%A7%91%E6%8A%80%E8%8A%82%E4%BD%9C%E5%93%81%E5%BE%81%E9%9B%86', '/pages/feature/banner-placeholder/banner-placeholder?id=2', 'placeholder', 2, 1, now, now]
    ].forEach((item) => {
      db.run(
        `INSERT INTO banners
        (title, image_url, link_url, link_type, sort_order, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        item
      );
    });
  }

  if (!db.get('SELECT COUNT(*) AS count FROM infos').count) {
    [
      ['新生入学指南', '入学报到、宿舍办理、选课流程一站式说明。', '为新生提供校园生活、选课和社团指南。', '学生处', '通知', '校内', 'published', now, now, now],
      ['校园招聘会', '本周五体育馆专场招聘会，含实习与校招岗位。', '多家企业来校招聘，提供实习和就业机会。', '就业中心', '资讯', '校内', 'published', now, now, now],
      ['公益志愿者招募', '周末敬老院志愿服务开始报名。', '周末敬老院公益活动正在招募志愿者。', '青年志愿者协会', '资讯', '校外', 'published', now, now, now],
      ['人工智能讲座', '图书馆报告厅，欢迎报名。', '人工智能前沿讲座，本周五晚在图书馆报告厅举行。', '计算机学院', '讲座', '校内', 'published', now, now, now]
    ].forEach((item) => {
      db.run(
        `INSERT INTO infos
        (title, summary, content, source, category, location_type, status, publish_time, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        item
      );
    });
  }

  if (!db.get('SELECT COUNT(*) AS count FROM activities').count) {
    const adminUser = db.get('SELECT id FROM users WHERE role = ?', ['admin']);
    [
      ['校园科技节', '科技成果展示与路演招募。', '展示学生科技成果，欢迎报名参加作品展和路演。', new Date(Date.now() + 86400000).toISOString(), new Date(Date.now() + 2 * 86400000).toISOString(), '科技楼一层大厅', '校内', '科技协会', '[]', '竞赛', 'upcoming', now, adminUser.id, 12, now, now],
      ['周末公益跑', '轻松公益跑活动。', '轻松 5 公里公益跑，参与即可累计志愿时长。', new Date(Date.now() + 2 * 86400000).toISOString(), new Date(Date.now() + 2 * 86400000 + 7200000).toISOString(), '东操场', '校内', '青年志愿者协会', '[]', '公益', 'upcoming', now, adminUser.id, 20, now, now]
    ].forEach((item) => {
      db.run(
        `INSERT INTO activities
        (title, summary, content, start_time, end_time, location, location_type, organizer, images, activity_type, status, publish_time, creator_user_id, apply_count, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        item
      );
    });
  }

  const user = db.get('SELECT id FROM users WHERE student_id = ?', ['20240001']);
  const firstInfo = db.get('SELECT id, title, summary FROM infos ORDER BY id ASC LIMIT 1');
  const firstActivity = db.get('SELECT id, title, summary FROM activities ORDER BY id ASC LIMIT 1');

  if (!db.get('SELECT COUNT(*) AS count FROM activity_applications').count) {
    db.run('INSERT INTO activity_applications (activity_id, user_id, created_at) VALUES (?, ?, ?)', [firstActivity.id, user.id, now]);
  }

  if (!db.get('SELECT COUNT(*) AS count FROM favorites').count) {
    db.run('INSERT INTO favorites (user_id, target_type, target_id, created_at) VALUES (?, ?, ?, ?)', [user.id, 'info', firstInfo.id, now]);
    db.run('INSERT INTO favorites (user_id, target_type, target_id, created_at) VALUES (?, ?, ?, ?)', [user.id, 'activity', firstActivity.id, now]);
  }

  if (!db.get('SELECT COUNT(*) AS count FROM browse_history').count) {
    db.run(`INSERT INTO browse_history (user_id, target_type, target_id, title, summary, created_at) VALUES (?, ?, ?, ?, ?, ?)`, [user.id, 'info', firstInfo.id, firstInfo.title, firstInfo.summary, now]);
    db.run(`INSERT INTO browse_history (user_id, target_type, target_id, title, summary, created_at) VALUES (?, ?, ?, ?, ?, ?)`, [user.id, 'activity', firstActivity.id, firstActivity.title, firstActivity.summary, now]);
  }

  if (!db.get('SELECT COUNT(*) AS count FROM runs').count) {
    [
      [user.id, 3.2, 1500, 210, new Date(Date.now() - 2 * 86400000).toISOString(), now],
      [user.id, 4.5, 2100, 320, new Date(Date.now() - 86400000).toISOString(), now]
    ].forEach((item) => {
      db.run('INSERT INTO runs (user_id, distance, duration, calories, date, created_at) VALUES (?, ?, ?, ?, ?, ?)', item);
    });
  }

  if (!db.get('SELECT COUNT(*) AS count FROM sign_records').count) {
    [
      [user.id, '高等数学', '张老师', 'success', new Date(Date.now() - 86400000).toISOString(), now],
      [user.id, '数据结构', '李老师', 'success', new Date(Date.now() - 2 * 86400000).toISOString(), now]
    ].forEach((item) => {
      db.run('INSERT INTO sign_records (user_id, course_name, teacher, status, time, created_at) VALUES (?, ?, ?, ?, ?, ?)', item);
    });
  }
}

module.exports = {
  getDb,
  dbPath
};
