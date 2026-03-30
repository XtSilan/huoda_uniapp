const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const dataDir = path.resolve(__dirname, '..', 'data');
const dbPath = path.join(dataDir, 'huoda.sqlite');

function createDbWrapper() {
  fs.mkdirSync(dataDir, { recursive: true });
  const db = new DatabaseSync(dbPath);

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
        lastID: Number(result.lastInsertRowid || 0),
        changes: result.changes || 0
      };
    }
  };
}

async function getDb() {
  const db = createDbWrapper();

  db.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      school TEXT DEFAULT '',
      department TEXT DEFAULT '',
      class_name TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      avatar_url TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS infos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      source TEXT NOT NULL,
      category TEXT DEFAULT '其他',
      location_type TEXT DEFAULT '校内',
      publish_time TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
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
  `);

  await seed(db);
  return db;
}

async function seed(db) {
  const now = new Date().toISOString();

  const userCount = db.get('SELECT COUNT(*) AS count FROM users');
  if (!userCount.count) {
    db.run(
      `INSERT INTO users
      (student_id, password, name, school, department, class_name, phone, avatar_url, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ['20240001', '123456', '测试用户', '活达大学', '计算机学院', '大数据 2411 班', '13800138000', '', now, now]
    );
  }

  const infoCount = db.get('SELECT COUNT(*) AS count FROM infos');
  if (!infoCount.count) {
    const items = [
      ['新生入学指南', '为新生提供校园生活、选课和社团指南。', '学生处', '通知', '校内'],
      ['校园招聘会', '多家企业来校招聘，提供实习和就业机会。', '就业中心', '就业', '校内'],
      ['公益志愿者招募', '周末敬老院公益活动正在招募志愿者。', '青年志愿者协会', '公益', '校外'],
      ['学术讲座预告', '人工智能前沿讲座，本周五晚在图书馆报告厅举行。', '计算机学院', '讲座', '校内']
    ];

    for (const item of items) {
      db.run(
        `INSERT INTO infos
        (title, content, source, category, location_type, publish_time, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [...item, now, now]
      );
    }
  }

  const activityCount = db.get('SELECT COUNT(*) AS count FROM activities');
  if (!activityCount.count) {
    const creator = db.get('SELECT id FROM users WHERE student_id = ?', ['20240001']);
    const activities = [
      [
        '校园科技节',
        '展示学生科技成果，欢迎报名参加作品展和路演。',
        new Date(Date.now() + 86400000).toISOString(),
        new Date(Date.now() + 2 * 86400000).toISOString(),
        '科技楼一层大厅',
        '校内',
        '科技协会',
        '[]',
        '竞赛',
        'upcoming',
        now,
        creator.id,
        12,
        now
      ],
      [
        '周末公益跑',
        '轻松 5 公里公益跑，参与即可累计志愿时长。',
        new Date(Date.now() + 2 * 86400000).toISOString(),
        new Date(Date.now() + 2 * 86400000 + 7200000).toISOString(),
        '东操场',
        '校内',
        '青年志愿者协会',
        '[]',
        '公益',
        'upcoming',
        now,
        creator.id,
        20,
        now
      ]
    ];

    for (const item of activities) {
      db.run(
        `INSERT INTO activities
        (title, content, start_time, end_time, location, location_type, organizer, images, activity_type, status, publish_time, creator_user_id, apply_count, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        item
      );
    }
  }

  const runCount = db.get('SELECT COUNT(*) AS count FROM runs');
  if (!runCount.count) {
    const user = db.get('SELECT id FROM users WHERE student_id = ?', ['20240001']);
    const runs = [
      [user.id, 3.2, 1500, 210, new Date(Date.now() - 2 * 86400000).toISOString(), now],
      [user.id, 4.5, 2100, 320, new Date(Date.now() - 86400000).toISOString(), now]
    ];

    for (const item of runs) {
      db.run(
        `INSERT INTO runs (user_id, distance, duration, calories, date, created_at)
        VALUES (?, ?, ?, ?, ?, ?)`,
        item
      );
    }
  }

  const signCount = db.get('SELECT COUNT(*) AS count FROM sign_records');
  if (!signCount.count) {
    const user = db.get('SELECT id FROM users WHERE student_id = ?', ['20240001']);
    const records = [
      [user.id, '高等数学', '张老师', 'success', new Date(Date.now() - 86400000).toISOString(), now],
      [user.id, '数据结构', '李老师', 'success', new Date(Date.now() - 2 * 86400000).toISOString(), now]
    ];

    for (const item of records) {
      db.run(
        `INSERT INTO sign_records (user_id, course_name, teacher, status, time, created_at)
        VALUES (?, ?, ?, ?, ?, ?)`,
        item
      );
    }
  }
}

module.exports = {
  getDb,
  dbPath
};
