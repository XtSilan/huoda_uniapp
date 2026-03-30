const {
  createToken,
  requireAuth,
  mapUser,
  mapBanner,
  mapInfo,
  mapActivity,
  parseSettings,
  recordBrowse
} = require('./shared');
const {
  DEFAULT_AI_CONFIG,
  parseJson,
  normalizeAiConfig,
  validateAiConfig,
  sanitizeMessages,
  chatWithAi,
  validateAiConnection
} = require('./ai-client');

module.exports = function registerPublicRoutes(app, db) {
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.post('/api/auth/login', (req, res) => {
    const { studentId, password } = req.body || {};
    const user = db.get('SELECT * FROM users WHERE student_id = ? AND password = ?', [studentId, password]);
    if (!user) {
      return res.status(400).json({ message: '账号或密码错误' });
    }
    db.run('UPDATE users SET last_login_at = ?, updated_at = ? WHERE id = ?', [new Date().toISOString(), new Date().toISOString(), user.id]);
    res.json({ token: createToken(user.id), user: mapUser(user) });
  });

  app.post('/api/auth/refresh', requireAuth, (req, res) => {
    res.json({ token: createToken(req.user.id), user: mapUser(req.user) });
  });

  app.post('/api/auth/change-password', requireAuth, (req, res) => {
    const { oldPassword, newPassword } = req.body || {};
    if (req.user.password !== oldPassword) {
      return res.status(400).json({ message: '原密码错误' });
    }
    db.run('UPDATE users SET password = ?, updated_at = ? WHERE id = ?', [newPassword, new Date().toISOString(), req.user.id]);
    res.json({ success: true });
  });

  app.get('/api/home/overview', (req, res) => {
    const banners = db.all('SELECT * FROM banners WHERE is_active = 1 ORDER BY sort_order ASC, id ASC');
    const activities = db.all('SELECT * FROM activities ORDER BY datetime(publish_time) DESC LIMIT 4');
    const settings = req.user ? db.get('SELECT * FROM user_settings WHERE user_id = ?', [req.user.id]) : null;
    const interests = settings ? JSON.parse(settings.interests || '[]') : [];

    let recommendations = [];
    if (interests.length) {
      const placeholders = interests.map(() => '?').join(',');
      recommendations = db.all(`SELECT * FROM infos WHERE category IN (${placeholders}) ORDER BY datetime(publish_time) DESC LIMIT 4`, interests);
    }
    if (!recommendations.length) {
      recommendations = db.all('SELECT * FROM infos ORDER BY datetime(publish_time) DESC LIMIT 4');
    }

    const hotInfos = db.all('SELECT * FROM infos ORDER BY datetime(publish_time) DESC LIMIT 6');
    res.json({
      banners: banners.map(mapBanner),
      recommendations: recommendations.map(mapInfo),
      hotInfos: hotInfos.map(mapInfo),
      latestActivities: activities.map(mapActivity)
    });
  });

  app.get('/api/banners', (_req, res) => {
    const rows = db.all('SELECT * FROM banners WHERE is_active = 1 ORDER BY sort_order ASC, id ASC');
    res.json({ list: rows.map(mapBanner) });
  });

  app.get('/api/user/profile', requireAuth, (req, res) => {
    res.json(mapUser(req.user));
  });

  app.put('/api/user/profile', requireAuth, (req, res) => {
    const body = req.body || {};
    db.run(
      `UPDATE users SET
      name = ?, school = ?, department = ?, class_name = ?, phone = ?, avatar_url = ?, updated_at = ?
      WHERE id = ?`,
      [body.name || req.user.name, body.school || '', body.department || '', body.class || '', body.phone || '', body.avatarUrl || '', new Date().toISOString(), req.user.id]
    );
    const updated = db.get('SELECT * FROM users WHERE id = ?', [req.user.id]);
    res.json(mapUser(updated));
  });

  app.get('/api/user/settings', requireAuth, (req, res) => {
    const row = db.get('SELECT * FROM user_settings WHERE user_id = ?', [req.user.id]);
    res.json(parseSettings(row));
  });

  app.put('/api/user/settings', requireAuth, (req, res) => {
    const body = req.body || {};
    const current = db.get('SELECT * FROM user_settings WHERE user_id = ?', [req.user.id]);
    const currentSettings = parseSettings(current);
    const merged = {
      grade: body.grade !== undefined ? body.grade : currentSettings.grade,
      educationType: body.educationType !== undefined ? body.educationType : currentSettings.educationType,
      interests: body.interests !== undefined ? body.interests : currentSettings.interests,
      futurePlan: body.futurePlan !== undefined ? body.futurePlan : currentSettings.futurePlan,
      notification: body.notification !== undefined ? body.notification : currentSettings.notification,
      theme: body.theme !== undefined ? body.theme : currentSettings.theme,
      aiConfig: body.aiConfig !== undefined ? normalizeAiConfig(body.aiConfig) : normalizeAiConfig(currentSettings.aiConfig || DEFAULT_AI_CONFIG)
    };
    db.run(
      `UPDATE user_settings SET
      grade = ?, education_type = ?, interests = ?, future_plan = ?, notification_settings = ?, theme_settings = ?, ai_settings = ?, updated_at = ?
      WHERE user_id = ?`,
      [
        merged.grade || '',
        merged.educationType || '',
        JSON.stringify(merged.interests || []),
        merged.futurePlan || '',
        JSON.stringify(merged.notification || {}),
        JSON.stringify(merged.theme || {}),
        JSON.stringify(merged.aiConfig || DEFAULT_AI_CONFIG),
        new Date().toISOString(),
        req.user.id
      ]
    );
    res.json({ success: true });
  });

  app.get('/api/user/collections', requireAuth, (req, res) => {
    const rows = db.all(
      `SELECT f.id, f.target_type, f.target_id, f.created_at,
      i.title AS info_title, i.summary AS info_summary,
      a.title AS activity_title, a.summary AS activity_summary
      FROM favorites f
      LEFT JOIN infos i ON f.target_type = 'info' AND f.target_id = i.id
      LEFT JOIN activities a ON f.target_type = 'activity' AND f.target_id = a.id
      WHERE f.user_id = ?
      ORDER BY datetime(f.created_at) DESC`,
      [req.user.id]
    );
    res.json({
      list: rows.map((row) => ({
        id: String(row.id),
        targetType: row.target_type,
        targetId: String(row.target_id),
        title: row.info_title || row.activity_title || '未知内容',
        summary: row.info_summary || row.activity_summary || '',
        time: row.created_at
      }))
    });
  });

  app.post('/api/user/collections/toggle', requireAuth, (req, res) => {
    const { targetType, targetId } = req.body || {};
    const existing = db.get('SELECT id FROM favorites WHERE user_id = ? AND target_type = ? AND target_id = ?', [req.user.id, targetType, targetId]);
    if (existing) {
      db.run('DELETE FROM favorites WHERE id = ?', [existing.id]);
      return res.json({ collected: false });
    }
    db.run('INSERT INTO favorites (user_id, target_type, target_id, created_at) VALUES (?, ?, ?, ?)', [req.user.id, targetType, targetId, new Date().toISOString()]);
    res.json({ collected: true });
  });

  app.get('/api/user/history', requireAuth, (req, res) => {
    const browse = db.all('SELECT * FROM browse_history WHERE user_id = ? ORDER BY datetime(created_at) DESC LIMIT 50', [req.user.id]);
    const activities = db.all(
      `SELECT a.*, aa.created_at AS applied_at
      FROM activity_applications aa
      INNER JOIN activities a ON a.id = aa.activity_id
      WHERE aa.user_id = ?
      ORDER BY datetime(aa.created_at) DESC`,
      [req.user.id]
    );
    res.json({
      browse: browse.map((row) => ({
        id: String(row.id),
        targetType: row.target_type,
        targetId: String(row.target_id),
        title: row.title,
        summary: row.summary,
        time: row.created_at
      })),
      activities: activities.map((row) => ({
        id: String(row.id),
        title: row.title,
        organizer: row.organizer,
        status: row.status,
        time: row.applied_at
      }))
    });
  });

  app.post('/api/user/history/record', requireAuth, (req, res) => {
    const body = req.body || {};
    recordBrowse(db, req.user.id, body.targetType, body.targetId, body.title || '未命名内容', body.summary || '');
    res.json({ success: true });
  });

  app.get('/api/user/stats', requireAuth, (req, res) => {
    const activityTotal = db.get('SELECT COUNT(*) AS count FROM activity_applications WHERE user_id = ?', [req.user.id]).count;
    const activityCompleted = db.get(
      `SELECT COUNT(*) AS count FROM activity_applications aa
      INNER JOIN activities a ON a.id = aa.activity_id
      WHERE aa.user_id = ? AND a.status = 'completed'`,
      [req.user.id]
    ).count;
    const browseTotal = db.get('SELECT COUNT(*) AS count FROM browse_history WHERE user_id = ?', [req.user.id]).count;
    res.json({
      activityStats: {
        total: activityTotal,
        completed: activityCompleted,
        ongoing: activityTotal - activityCompleted
      },
      browseStats: {
        total: browseTotal,
        today: db.get(`SELECT COUNT(*) AS count FROM browse_history WHERE user_id = ? AND date(created_at) = date('now','localtime')`, [req.user.id]).count,
        week: db.get(`SELECT COUNT(*) AS count FROM browse_history WHERE user_id = ? AND datetime(created_at) >= datetime('now','-7 day')`, [req.user.id]).count
      }
    });
  });

  app.get('/api/info/list', (req, res) => {
    const { search = '', category = '', page = 1, pageSize = 20 } = req.query;
    const conditions = [];
    const params = [];
    if (search) {
      conditions.push('(title LIKE ? OR content LIKE ? OR summary LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (category) {
      conditions.push('category = ?');
      params.push(category);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = Number(pageSize);
    const offset = (Number(page) - 1) * limit;
    const rows = db.all(`SELECT * FROM infos ${where} ORDER BY datetime(publish_time) DESC LIMIT ? OFFSET ?`, [...params, limit, offset]);
    const total = db.get(`SELECT COUNT(*) AS count FROM infos ${where}`, params).count;
    res.json({ list: rows.map(mapInfo), total, page: Number(page), pageSize: limit });
  });

  app.get('/api/info/search', (req, res) => {
    const search = req.query.search || req.query.q || '';
    const rows = db.all(`SELECT * FROM infos WHERE title LIKE ? OR content LIKE ? OR summary LIKE ? ORDER BY datetime(publish_time) DESC LIMIT 20`, [`%${search}%`, `%${search}%`, `%${search}%`]);
    res.json({ list: rows.map(mapInfo), total: rows.length, page: 1, pageSize: rows.length });
  });

  app.get('/api/info/detail', (req, res) => {
    const row = db.get('SELECT * FROM infos WHERE id = ?', [req.query.id]);
    if (!row) {
      return res.status(404).json({ message: '资讯不存在' });
    }
    if (req.user) {
      recordBrowse(db, req.user.id, 'info', row.id, row.title, row.summary);
    }
    res.json(mapInfo(row));
  });

  app.get('/api/publish/list', (_req, res) => {
    const rows = db.all('SELECT * FROM activities ORDER BY datetime(publish_time) DESC');
    res.json({ list: rows.map(mapActivity) });
  });

  app.get('/api/publish/detail', (req, res) => {
    const row = db.get('SELECT * FROM activities WHERE id = ?', [req.query.id]);
    if (!row) {
      return res.status(404).json({ message: '活动不存在' });
    }
    if (req.user) {
      recordBrowse(db, req.user.id, 'activity', row.id, row.title, row.summary);
    }
    res.json(mapActivity(row));
  });

  app.post('/api/publish/create', requireAuth, (req, res) => {
    const body = req.body || {};
    const now = new Date().toISOString();
    db.run(
      `INSERT INTO activities
      (title, summary, content, start_time, end_time, location, location_type, organizer, images, activity_type, status, publish_time, creator_user_id, apply_count, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [body.title, body.summary || body.content.slice(0, 40), body.content, body.startTime, body.endTime, body.location, body.locationType || '校内', body.organizer, JSON.stringify(body.images || []), body.activityType || '其他', body.status || 'upcoming', now, req.user.id, 0, now, now]
    );
    const created = db.get('SELECT * FROM activities ORDER BY id DESC LIMIT 1');
    res.json(mapActivity(created));
  });

  app.post('/api/publish/apply', requireAuth, (req, res) => {
    const { activityId } = req.body || {};
    const exists = db.get('SELECT id FROM activity_applications WHERE activity_id = ? AND user_id = ?', [activityId, req.user.id]);
    if (exists) {
      return res.status(400).json({ message: '你已经报名过该活动' });
    }
    db.run('INSERT INTO activity_applications (activity_id, user_id, created_at) VALUES (?, ?, ?)', [activityId, req.user.id, new Date().toISOString()]);
    db.run('UPDATE activities SET apply_count = apply_count + 1, updated_at = ? WHERE id = ?', [new Date().toISOString(), activityId]);
    const updated = db.get('SELECT * FROM activities WHERE id = ?', [activityId]);
    res.json(mapActivity(updated));
  });

  app.post('/api/publish/delete', requireAuth, (req, res) => {
    db.run('DELETE FROM activities WHERE id = ?', [req.body.id]);
    res.json({ success: true });
  });

  app.get('/api/publish/applications', requireAuth, (req, res) => {
    const rows = db.all(
      `SELECT a.* FROM activities a
      INNER JOIN activity_applications aa ON aa.activity_id = a.id
      WHERE aa.user_id = ?
      ORDER BY datetime(aa.created_at) DESC`,
      [req.user.id]
    );
    res.json({ list: rows.map(mapActivity) });
  });

  app.get('/api/run/history', requireAuth, (req, res) => {
    const rows = db.all('SELECT * FROM runs WHERE user_id = ? ORDER BY datetime(date) DESC', [req.user.id]);
    res.json({ list: rows.map((row) => ({ id: String(row.id), distance: row.distance, duration: row.duration, calories: row.calories, date: row.date, path: [] })) });
  });

  app.post('/api/run/start', requireAuth, (_req, res) => res.json({ startedAt: new Date().toISOString() }));

  app.post('/api/run/end', requireAuth, (req, res) => {
    const body = req.body || {};
    db.run('INSERT INTO runs (user_id, distance, duration, calories, date, created_at) VALUES (?, ?, ?, ?, ?, ?)', [req.user.id, body.distance, body.duration, body.calories || 0, new Date().toISOString(), new Date().toISOString()]);
    res.json({ success: true });
  });

  app.get('/api/run/ranking', (_req, res) => {
    const rows = db.all(`SELECT u.id AS user_id, u.name, COALESCE(SUM(r.distance), 0) AS distance FROM users u LEFT JOIN runs r ON r.user_id = u.id GROUP BY u.id ORDER BY distance DESC, u.id ASC`);
    res.json({ list: rows.map((row, index) => ({ userId: String(row.user_id), name: row.name, distance: Number(Number(row.distance || 0).toFixed(2)), rank: index + 1 })) });
  });

  app.get('/api/sign/history', requireAuth, (req, res) => {
    const rows = db.all('SELECT * FROM sign_records WHERE user_id = ? ORDER BY datetime(time) DESC', [req.user.id]);
    res.json({ list: rows.map((row) => ({ id: String(row.id), courseName: row.course_name, teacher: row.teacher, time: row.time, status: row.status })) });
  });

  app.get('/api/sign/statistics', requireAuth, (req, res) => {
    const row = db.get(`SELECT COUNT(*) AS total, SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) AS successCount FROM sign_records WHERE user_id = ?`, [req.user.id]);
    const total = row.total || 0;
    res.json({ total, attendanceRate: total ? Math.round((row.successCount || 0) / total * 100) : 0 });
  });

  app.post('/api/sign/do', requireAuth, (req, res) => {
    const body = req.body || {};
    const now = new Date().toISOString();
    db.run('INSERT INTO sign_records (user_id, course_name, teacher, status, time, created_at) VALUES (?, ?, ?, ?, ?, ?)', [req.user.id, body.courseName || '高等数学', body.teacher || '张老师', 'success', now, now]);
    res.json({ success: true });
  });

  app.post('/api/sign/leave', requireAuth, (req, res) => {
    res.json({ success: true, reason: req.body.reason || '', leaveTime: req.body.leaveTime || '' });
  });

  app.get('/api/ai/recommend', (_req, res) => {
    const rows = db.all('SELECT * FROM infos ORDER BY datetime(publish_time) DESC LIMIT 4');
    res.json({ recommendations: rows.map(mapInfo) });
  });

  app.get('/api/ai/settings', requireAuth, (req, res) => {
    const row = db.get('SELECT ai_settings FROM user_settings WHERE user_id = ?', [req.user.id]);
    res.json(normalizeAiConfig(parseJson(row && row.ai_settings, DEFAULT_AI_CONFIG)));
  });

  app.put('/api/ai/settings', requireAuth, (req, res) => {
    const config = normalizeAiConfig(req.body || {});
    const error = validateAiConfig(config);
    if (error) {
      return res.status(400).json({ message: error });
    }
    db.run('UPDATE user_settings SET ai_settings = ?, updated_at = ? WHERE user_id = ?', [
      JSON.stringify(config),
      new Date().toISOString(),
      req.user.id
    ]);
    res.json({ success: true, config });
  });

  app.post('/api/ai/validate', requireAuth, async (req, res) => {
    try {
      const result = await validateAiConnection(req.body || {});
      res.json(result);
    } catch (error) {
      res.status(400).json({ message: error.message || 'AI 配置校验失败' });
    }
  });

  app.post('/api/ai/chat', requireAuth, async (req, res) => {
    try {
      const body = req.body || {};
      const row = db.get('SELECT ai_settings FROM user_settings WHERE user_id = ?', [req.user.id]);
      const savedConfig = normalizeAiConfig(parseJson(row && row.ai_settings, DEFAULT_AI_CONFIG));
      const config = body.config ? normalizeAiConfig(body.config) : savedConfig;
      const messages = sanitizeMessages(body.messages || [{ role: 'user', content: body.message || '' }]);
      const response = await chatWithAi(config, messages);
      const keyword = String(body.message || (messages[messages.length - 1] && messages[messages.length - 1].content) || '').trim();
      const relatedInfos = keyword
        ? db.all(
            `SELECT * FROM infos WHERE title LIKE ? OR content LIKE ? OR summary LIKE ?
             ORDER BY datetime(publish_time) DESC LIMIT 2`,
            [`%${keyword}%`, `%${keyword}%`, `%${keyword}%`]
          )
        : [];
      const relatedActivities = keyword
        ? db.all(
            `SELECT * FROM activities WHERE title LIKE ? OR content LIKE ? OR summary LIKE ?
             ORDER BY datetime(publish_time) DESC LIMIT 2`,
            [`%${keyword}%`, `%${keyword}%`, `%${keyword}%`]
          )
        : [];

      res.json({
        response,
        provider: config.provider,
        model: config.model,
        relatedInfos: [...relatedInfos.map(mapInfo), ...relatedActivities.map(mapActivity)].slice(0, 4)
      });
    } catch (error) {
      res.status(400).json({ message: error.message || 'AI 对话失败' });
    }
  });

  app.post('/api/ai/search', (req, res) => {
    const query = String((req.body || {}).query || '');
    const rows = db.all(`SELECT * FROM infos WHERE title LIKE ? OR content LIKE ? OR summary LIKE ? ORDER BY datetime(publish_time) DESC LIMIT 6`, [`%${query}%`, `%${query}%`, `%${query}%`]);
    res.json({ list: rows.map(mapInfo) });
  });

  app.get('/api/ai/history', (_req, res) => res.json({ list: [] }));
};
