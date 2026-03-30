const express = require('express');
const cors = require('cors');
const { getDb, dbPath } = require('./db');

const PORT = process.env.PORT || 3000;

function createToken(userId) {
  return Buffer.from(`huoda:${userId}`, 'utf8').toString('base64');
}

function parseToken(token) {
  try {
    const raw = Buffer.from(token, 'base64').toString('utf8');
    const [prefix, userId] = raw.split(':');
    if (prefix !== 'huoda' || !userId) {
      return null;
    }
    return Number(userId);
  } catch (error) {
    return null;
  }
}

function mapUser(row) {
  return {
    id: row.id,
    studentId: row.student_id,
    name: row.name,
    school: row.school,
    department: row.department,
    class: row.class_name,
    phone: row.phone,
    avatarUrl: row.avatar_url
  };
}

function mapActivity(row) {
  return {
    id: String(row.id),
    title: row.title,
    content: row.content,
    startTime: row.start_time,
    endTime: row.end_time,
    location: row.location,
    locationType: row.location_type,
    organizer: row.organizer,
    images: JSON.parse(row.images || '[]'),
    activityType: row.activity_type,
    status: row.status,
    publishTime: row.publish_time,
    applyCount: row.apply_count
  };
}

function mapInfo(row) {
  return {
    id: String(row.id),
    title: row.title,
    content: row.content,
    source: row.source,
    category: row.category,
    locationType: row.location_type,
    publishTime: row.publish_time,
    viewCount: Math.floor(100 + row.id * 17)
  };
}

async function start() {
  const db = await getDb();

  if (process.argv.includes('--init-db')) {
    console.log(`Database ready: ${dbPath}`);
    process.exit(0);
  }

  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '2mb' }));

  app.use(async (req, _res, next) => {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    const userId = parseToken(token);
    if (userId) {
      const user = await db.get('SELECT * FROM users WHERE id = ?', [userId]);
      req.user = user || null;
    }
    next();
  });

  function requireAuth(req, res, next) {
    if (!req.user) {
      res.status(401).json({ message: '未登录或 token 无效' });
      return;
    }
    next();
  }

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, dbPath });
  });

  app.post('/api/auth/login', async (req, res) => {
    const { studentId, password, code } = req.body || {};

    let user;
    if (studentId && password) {
      user = await db.get(
        'SELECT * FROM users WHERE student_id = ? AND password = ?',
        [studentId, password]
      );
    } else if (code) {
      user = await db.get('SELECT * FROM users ORDER BY id ASC LIMIT 1');
    }

    if (!user) {
      res.status(400).json({ message: '账号或密码错误' });
      return;
    }

    res.json({
      token: createToken(user.id),
      user: mapUser(user)
    });
  });

  app.post('/api/auth/refresh', requireAuth, (req, res) => {
    res.json({
      token: createToken(req.user.id),
      user: mapUser(req.user)
    });
  });

  app.get('/api/user/profile', requireAuth, (req, res) => {
    res.json(mapUser(req.user));
  });

  app.put('/api/user/profile', requireAuth, async (req, res) => {
    const payload = req.body || {};
    const now = new Date().toISOString();
    await db.run(
      `UPDATE users SET
        name = ?,
        school = ?,
        department = ?,
        class_name = ?,
        phone = ?,
        avatar_url = ?,
        updated_at = ?
      WHERE id = ?`,
      [
        payload.name || req.user.name,
        payload.school || '',
        payload.department || '',
        payload.class || '',
        payload.phone || '',
        payload.avatarUrl || '',
        now,
        req.user.id
      ]
    );

    const updated = await db.get('SELECT * FROM users WHERE id = ?', [req.user.id]);
    res.json(mapUser(updated));
  });

  app.get('/api/info/list', async (req, res) => {
    const { search = '', locationType = '', category = '', page = 1, pageSize = 10 } = req.query;
    const conditions = [];
    const params = [];

    if (search) {
      conditions.push('(title LIKE ? OR content LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }
    if (locationType) {
      conditions.push('location_type = ?');
      params.push(locationType);
    }
    if (category) {
      conditions.push('category = ?');
      params.push(category);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = Number(pageSize);
    const offset = (Number(page) - 1) * limit;
    const rows = await db.all(
      `SELECT * FROM infos ${where} ORDER BY datetime(publish_time) DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    const totalRow = await db.get(`SELECT COUNT(*) AS count FROM infos ${where}`, params);

    res.json({
      list: rows.map(mapInfo),
      page: Number(page),
      pageSize: limit,
      total: totalRow.count
    });
  });

  app.get('/api/info/detail', async (req, res) => {
    const row = await db.get('SELECT * FROM infos WHERE id = ?', [req.query.id]);
    if (!row) {
      res.status(404).json({ message: '资讯不存在' });
      return;
    }
    res.json(mapInfo(row));
  });

  app.get('/api/info/search', async (req, res) => {
    const search = req.query.search || req.query.keyword || req.query.q || '';
    const rows = await db.all(
      `SELECT * FROM infos
      WHERE title LIKE ? OR content LIKE ?
      ORDER BY datetime(publish_time) DESC
      LIMIT 20`,
      [`%${search}%`, `%${search}%`]
    );
    res.json({
      list: rows.map(mapInfo),
      page: 1,
      pageSize: rows.length,
      total: rows.length
    });
  });

  app.get('/api/publish/list', async (_req, res) => {
    const rows = await db.all('SELECT * FROM activities ORDER BY datetime(publish_time) DESC');
    res.json({ list: rows.map(mapActivity) });
  });

  app.get('/api/publish/detail', async (req, res) => {
    const row = await db.get('SELECT * FROM activities WHERE id = ?', [req.query.id]);
    if (!row) {
      res.status(404).json({ message: '活动不存在' });
      return;
    }
    res.json(mapActivity(row));
  });

  app.post('/api/publish/create', requireAuth, async (req, res) => {
    const {
      title,
      content,
      startTime,
      endTime,
      location,
      locationType = '校内',
      organizer,
      images = [],
      activityType = '其他'
    } = req.body || {};

    if (!title || !content || !startTime || !endTime || !location || !organizer) {
      res.status(400).json({ message: '活动参数不完整' });
      return;
    }

    const now = new Date().toISOString();
    const result = await db.run(
      `INSERT INTO activities
      (title, content, start_time, end_time, location, location_type, organizer, images, activity_type, status, publish_time, creator_user_id, apply_count, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title,
        content,
        startTime,
        endTime,
        location,
        locationType,
        organizer,
        JSON.stringify(images),
        activityType,
        new Date(startTime).getTime() > Date.now() ? 'upcoming' : 'ongoing',
        now,
        req.user.id,
        0,
        now
      ]
    );

    const created = await db.get('SELECT * FROM activities WHERE id = ?', [result.lastID]);
    res.json(mapActivity(created));
  });

  app.post('/api/publish/delete', requireAuth, async (req, res) => {
    const { id } = req.body || {};
    const row = await db.get('SELECT * FROM activities WHERE id = ?', [id]);
    if (!row) {
      res.status(404).json({ message: '活动不存在' });
      return;
    }
    await db.run('DELETE FROM activities WHERE id = ?', [id]);
    res.json({ success: true });
  });

  app.post('/api/publish/apply', requireAuth, async (req, res) => {
    const { activityId } = req.body || {};
    const activity = await db.get('SELECT * FROM activities WHERE id = ?', [activityId]);
    if (!activity) {
      res.status(404).json({ message: '活动不存在' });
      return;
    }

    const now = new Date().toISOString();
    try {
      await db.run(
        'INSERT INTO activity_applications (activity_id, user_id, created_at) VALUES (?, ?, ?)',
        [activityId, req.user.id, now]
      );
      await db.run('UPDATE activities SET apply_count = apply_count + 1 WHERE id = ?', [activityId]);
    } catch (error) {
      res.status(400).json({ message: '你已经报名过该活动' });
      return;
    }

    const updated = await db.get('SELECT * FROM activities WHERE id = ?', [activityId]);
    res.json(mapActivity(updated));
  });

  app.get('/api/publish/applications', requireAuth, async (req, res) => {
    const rows = await db.all(
      `SELECT a.* FROM activities a
      INNER JOIN activity_applications aa ON aa.activity_id = a.id
      WHERE aa.user_id = ?
      ORDER BY datetime(aa.created_at) DESC`,
      [req.user.id]
    );
    res.json({ list: rows.map(mapActivity) });
  });

  app.get('/api/run/history', requireAuth, async (req, res) => {
    const rows = await db.all(
      'SELECT * FROM runs WHERE user_id = ? ORDER BY datetime(date) DESC',
      [req.user.id]
    );
    res.json({
      list: rows.map((row) => ({
        id: String(row.id),
        distance: row.distance,
        duration: row.duration,
        calories: row.calories,
        date: row.date,
        path: []
      }))
    });
  });

  app.post('/api/run/start', requireAuth, (_req, res) => {
    res.json({ startedAt: new Date().toISOString() });
  });

  app.post('/api/run/end', requireAuth, async (req, res) => {
    const { distance, duration, calories } = req.body || {};
    if (!distance || !duration) {
      res.status(400).json({ message: '跑步数据不完整' });
      return;
    }

    const now = new Date().toISOString();
    const result = await db.run(
      `INSERT INTO runs (user_id, distance, duration, calories, date, created_at)
      VALUES (?, ?, ?, ?, ?, ?)`,
      [req.user.id, distance, duration, calories || Math.round(distance * 60), now, now]
    );

    const created = await db.get('SELECT * FROM runs WHERE id = ?', [result.lastID]);
    res.json({
      id: String(created.id),
      distance: created.distance,
      duration: created.duration,
      calories: created.calories,
      date: created.date
    });
  });

  app.get('/api/run/ranking', async (_req, res) => {
    const rows = await db.all(
      `SELECT u.id AS user_id, u.name, COALESCE(SUM(r.distance), 0) AS distance
      FROM users u
      LEFT JOIN runs r ON r.user_id = u.id
      GROUP BY u.id, u.name
      ORDER BY distance DESC, u.id ASC`
    );
    res.json({
      list: rows.map((row, index) => ({
        userId: String(row.user_id),
        name: row.name,
        distance: Number(row.distance.toFixed(2)),
        rank: index + 1
      }))
    });
  });

  app.get('/api/run/target', requireAuth, (_req, res) => {
    res.json({ dailyTarget: 3 });
  });

  app.get('/api/sign/history', requireAuth, async (req, res) => {
    const rows = await db.all(
      'SELECT * FROM sign_records WHERE user_id = ? ORDER BY datetime(time) DESC',
      [req.user.id]
    );
    res.json({
      list: rows.map((row) => ({
        id: String(row.id),
        courseName: row.course_name,
        teacher: row.teacher,
        time: row.time,
        status: row.status
      }))
    });
  });

  app.post('/api/sign/do', requireAuth, async (req, res) => {
    const { courseName = '高等数学', teacher = '张老师' } = req.body || {};
    const now = new Date().toISOString();
    const result = await db.run(
      `INSERT INTO sign_records (user_id, course_name, teacher, status, time, created_at)
      VALUES (?, ?, ?, 'success', ?, ?)`,
      [req.user.id, courseName, teacher, now, now]
    );
    const created = await db.get('SELECT * FROM sign_records WHERE id = ?', [result.lastID]);
    res.json({
      id: String(created.id),
      courseName: created.course_name,
      teacher: created.teacher,
      time: created.time,
      status: created.status
    });
  });

  app.get('/api/sign/statistics', requireAuth, async (req, res) => {
    const stats = await db.get(
      `SELECT COUNT(*) AS total,
      SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) AS successCount
      FROM sign_records WHERE user_id = ?`,
      [req.user.id]
    );
    const total = stats.total || 0;
    const successCount = stats.successCount || 0;
    res.json({
      total,
      attendanceRate: total ? Math.round((successCount / total) * 100) : 0
    });
  });

  app.post('/api/sign/leave', requireAuth, (req, res) => {
    res.json({
      success: true,
      reason: req.body.reason || '',
      leaveTime: req.body.leaveTime || ''
    });
  });

  app.post('/api/ai/chat', async (req, res) => {
    const message = (req.body && req.body.message ? String(req.body.message) : '').trim();
    const relatedRows = await db.all('SELECT * FROM activities ORDER BY datetime(publish_time) DESC LIMIT 3');
    let response = '我已经收到你的问题了，可以继续问我校园活动、资讯、乐跑或签到相关内容。';

    if (message.includes('活动')) {
      response = '最近有新的校园活动可以参加，我已经把相关活动推荐放在下面了。';
    } else if (message.includes('乐跑') || message.includes('跑步')) {
      response = '乐跑页面已经接入真实历史记录和排行榜，你可以直接开始记录。';
    } else if (message.includes('签到')) {
      response = '签到页面现在可以读取历史记录，也支持直接提交一次签到。';
    }

    res.json({
      response,
      relatedInfos: relatedRows.map(mapActivity)
    });
  });

  app.post('/api/ai/search', async (req, res) => {
    const query = (req.body && req.body.query ? String(req.body.query) : '').trim();
    const rows = await db.all(
      `SELECT * FROM infos
      WHERE title LIKE ? OR content LIKE ?
      ORDER BY datetime(publish_time) DESC
      LIMIT 5`,
      [`%${query}%`, `%${query}%`]
    );
    res.json({ list: rows.map(mapInfo) });
  });

  app.get('/api/ai/recommend', async (_req, res) => {
    const rows = await db.all('SELECT * FROM infos ORDER BY datetime(publish_time) DESC LIMIT 4');
    res.json({ recommendations: rows.map(mapInfo) });
  });

  app.get('/api/ai/history', (_req, res) => {
    res.json({ list: [] });
  });

  app.listen(PORT, () => {
    console.log(`Huoda server listening on http://localhost:${PORT}`);
    console.log(`SQLite database: ${dbPath}`);
  });
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
