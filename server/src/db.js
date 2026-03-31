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
  `);

  ensureColumn(db, 'user_settings', 'ai_settings', `TEXT DEFAULT '${JSON.stringify(DEFAULT_USER_AI_SETTINGS)}'`);
  ensureColumn(db, 'infos', 'location_type', `TEXT DEFAULT '校内'`);
  ensureColumn(db, 'activities', 'images', `TEXT DEFAULT '[]'`);
  ensureColumn(db, 'activities', 'location_type', `TEXT DEFAULT '校内'`);

  await seed(db);
  return db;
}

async function seed(db) {
  const now = new Date().toISOString();

  if (!db.get('SELECT COUNT(*) AS count FROM users').count) {
    [
      ['20240001', '123456', '测试用户', 'user', 'active', '活达大学', '计算机学院', '计科2511', '13800138000', '', now, now],
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
      ['校园科技节', '展示学生科技成果，激发创新精神。', '欢迎各学院团队报名参与校园科技节作品展示与现场交流。', '科技协会', '讲座', '校内', 'published', now, now, now],
      ['体育文化节', '丰富多彩的体育活动，增强学生体质。', '本周体育文化节将开放趣味运动会、班级接力和篮球友谊赛。', '体育部', '竞赛', '校内', 'published', now, now, now],
      ['校外兼职推荐', '周末活动执行兼职招募。', '需要周末活动协助人员，提供餐补与交通补贴。', '合作企业', '兼职', '校外', 'published', now, now, now],
      ['公益志愿者招募', '社区敬老服务活动开始报名。', '欢迎同学报名参与校外公益志愿活动，可累计志愿时长。', '青年志愿者协会', '公益', '校外', 'published', now, now, now]
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
      [
        '运动会',
        '校园春季运动会',
        '运动会报名已开启，欢迎各班级积极参与。',
        new Date(Date.now() + 24 * 3600000).toISOString(),
        new Date(Date.now() + 48 * 3600000).toISOString(),
        '学校操场',
        '校内',
        '学校',
        JSON.stringify(['https://images.unsplash.com/photo-1547347298-4074fc3086f0?auto=format&fit=crop&w=1200&q=80']),
        '运动',
        'upcoming',
        now,
        adminUser.id,
        12,
        now,
        now
      ],
      [
        '校园科技节',
        '成果展示与创新分享',
        '欢迎报名校园科技节活动，展示作品并参与交流。',
        new Date(Date.now() + 72 * 3600000).toISOString(),
        new Date(Date.now() + 76 * 3600000).toISOString(),
        '科技楼一层大厅',
        '校内',
        '科技协会',
        JSON.stringify([]),
        '讲座',
        'upcoming',
        now,
        adminUser.id,
        20,
        now,
        now
      ]
    ].forEach((item) => {
      db.run(
        `INSERT INTO activities
        (title, summary, content, start_time, end_time, location, location_type, organizer, images, activity_type, status, publish_time, creator_user_id, apply_count, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        item
      );
    });
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
        [
          className,
          `${className}群`,
          '欢迎加入班级群，发布活动和通知前请先查看群公告。',
          'https://dummyimage.com/480x480/1e88e5/ffffff&text=%E7%8F%AD%E7%BA%A7%E7%BE%A4%E4%BA%8C%E7%BB%B4%E7%A0%81',
          32,
          JSON.stringify([
            { id: 1, name: '张同学', role: '班长' },
            { id: 2, name: '李同学', role: '学习委员' },
            { id: 3, name: user.name, role: '群成员' }
          ]),
          JSON.stringify([
            { id: 1, sender: '班长', text: '今晚七点开班会，记得准时参加。', time: now, type: 'other' },
            { id: 2, sender: '学习委员', text: '本周活动报名链接已发到群文件。', time: now, type: 'other' }
          ]),
          now,
          now
        ]
      );
    }
  });

  const user = db.get('SELECT id FROM users WHERE student_id = ?', ['20240001']);
  const firstInfo = db.get('SELECT id, title, summary FROM infos ORDER BY id ASC LIMIT 1');
  const firstActivity = db.get('SELECT id, title, summary FROM activities ORDER BY id ASC LIMIT 1');

  if (user && firstActivity && !db.get('SELECT COUNT(*) AS count FROM activity_applications').count) {
    db.run('INSERT INTO activity_applications (activity_id, user_id, created_at) VALUES (?, ?, ?)', [firstActivity.id, user.id, now]);
  }

  if (user && firstInfo && firstActivity && !db.get('SELECT COUNT(*) AS count FROM favorites').count) {
    db.run('INSERT INTO favorites (user_id, target_type, target_id, created_at) VALUES (?, ?, ?, ?)', [user.id, 'info', firstInfo.id, now]);
    db.run('INSERT INTO favorites (user_id, target_type, target_id, created_at) VALUES (?, ?, ?, ?)', [user.id, 'activity', firstActivity.id, now]);
  }

  if (user && firstInfo && firstActivity && !db.get('SELECT COUNT(*) AS count FROM browse_history').count) {
    db.run(`INSERT INTO browse_history (user_id, target_type, target_id, title, summary, created_at) VALUES (?, ?, ?, ?, ?, ?)`, [user.id, 'info', firstInfo.id, firstInfo.title, firstInfo.summary, now]);
    db.run(`INSERT INTO browse_history (user_id, target_type, target_id, title, summary, created_at) VALUES (?, ?, ?, ?, ?, ?)`, [user.id, 'activity', firstActivity.id, firstActivity.title, firstActivity.summary, now]);
  }

  if (user && !db.get('SELECT COUNT(*) AS count FROM runs').count) {
    [
      [user.id, 3.2, 1500, 210, new Date(Date.now() - 2 * 86400000).toISOString(), now],
      [user.id, 4.5, 2100, 320, new Date(Date.now() - 86400000).toISOString(), now]
    ].forEach((item) => {
      db.run('INSERT INTO runs (user_id, distance, duration, calories, date, created_at) VALUES (?, ?, ?, ?, ?, ?)', item);
    });
  }

  if (user && !db.get('SELECT COUNT(*) AS count FROM sign_records').count) {
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
