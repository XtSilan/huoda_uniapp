const fs = require('fs');
const path = require('path');
const {
  requireAdmin,
  mapUser,
  mapBanner,
  mapInfo,
  mapActivity,
  ensureUserSettings,
  ensureClassGroup,
  getClassGroupWithMembers,
  buildClassmatesFromUsers,
  parseJson
} = require('./shared');
const { normalizeAiConfig, validateAiConfig } = require('./ai-client');
const fs = require('fs');
const path = require('path');

const uploadsDir = path.resolve(__dirname, '..', 'uploads');

const classGroupUploadDir = path.resolve(__dirname, '..', 'uploads', 'class-group-qrcodes');

function mapPreset(row) {
  return {
    id: String(row.id),
    name: row.name,
    provider: row.provider,
    baseUrl: row.base_url,
    apiKey: row.api_key,
    model: row.model,
    temperature: row.temperature,
    topP: row.top_p,
    maxTokens: row.max_tokens,
    presencePenalty: row.presence_penalty,
    frequencyPenalty: row.frequency_penalty,
    systemPrompt: row.system_prompt,
    isDefault: Boolean(row.is_default),
    isActive: Boolean(row.is_active)
  };
}

function ensureClassGroup(db, className) {
  if (!className) {
    return null;
  }
  let row = db.get('SELECT * FROM class_groups WHERE class_name = ?', [className]);
  if (!row) {
    const now = new Date().toISOString();
    db.run(
      `INSERT INTO class_groups (class_name, group_name, announcement, qr_code, online_count, classmates, messages, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [className, `${className}群`, '欢迎加入班级群。', '', 0, '[]', '[]', now, now]
    );
    row = db.get('SELECT * FROM class_groups WHERE class_name = ?', [className]);
  }
  return row;
}

function getClassmatesByClass(db, className) {
  return db.all(
    `SELECT id, student_id, name, department, class_name
     FROM users
     WHERE role = 'user' AND class_name = ?
     ORDER BY student_id ASC`,
    [className]
  ).map((row) => ({
    id: row.id,
    studentId: row.student_id,
    name: row.name,
    department: row.department || '',
    className: row.class_name || ''
  }));
}

function mapClassGroupWithMembers(db, row) {
  const group = mapClassGroup(row);
  const classmates = getClassmatesByClass(db, row.class_name);
  return {
    ...group,
    memberCount: classmates.length,
    classmates
  };
}

function saveBase64Image({ name, content }) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  const safeName = String(name || 'image.png').replace(/[^\w.\-]/g, '_');
  const ext = path.extname(safeName) || '.png';
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
  const base64 = String(content || '').replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');
  fs.writeFileSync(path.join(uploadsDir, fileName), Buffer.from(base64, 'base64'));
  return `/uploads/${fileName}`;
}

module.exports = function registerAdminRoutes(app, db) {
  fs.mkdirSync(classGroupUploadDir, { recursive: true });

  app.get('/api/admin/dashboard', requireAdmin, (_req, res) => {
    res.json({
      cards: {
        userCount: db.get('SELECT COUNT(*) AS count FROM users').count,
        infoCount: db.get('SELECT COUNT(*) AS count FROM infos').count,
        activityCount: db.get('SELECT COUNT(*) AS count FROM activities').count,
        bannerCount: db.get('SELECT COUNT(*) AS count FROM banners').count
      },
      latestUsers: db.all('SELECT * FROM users ORDER BY datetime(created_at) DESC LIMIT 5').map(mapUser),
      latestInfos: db.all('SELECT * FROM infos ORDER BY datetime(created_at) DESC LIMIT 5').map(mapInfo),
      latestActivities: db.all('SELECT * FROM activities ORDER BY datetime(created_at) DESC LIMIT 5').map(mapActivity)
    });
  });

  app.get('/api/admin/users', requireAdmin, (_req, res) => {
    const rows = db.all(
      `SELECT u.*, us.interests, us.future_plan
      FROM users u
      LEFT JOIN user_settings us ON us.user_id = u.id
      ORDER BY u.id ASC`
    );
    res.json({
      list: rows.map((row) => ({
        ...mapUser(row),
        interests: parseJson(row.interests, []),
        futurePlan: row.future_plan || '',
        createdAt: row.created_at,
        lastLoginAt: row.last_login_at
      }))
    });
  });

  app.put('/api/admin/users/:id', requireAdmin, (req, res) => {
    const current = db.get('SELECT * FROM users WHERE id = ?', [req.params.id]);
    const body = req.body || {};
    const className = String(body.className || current.class_name || '').trim();
    db.run(
      `UPDATE users SET role = ?, status = ?, name = ?, school = ?, department = ?, class_name = ?, phone = ?, password = ?, updated_at = ? WHERE id = ?`,
      [
        body.role || current.role,
        body.status || current.status,
        body.name || current.name,
        body.school !== undefined ? body.school : current.school,
        body.department || current.department,
        body.className || current.class_name,
        body.phone !== undefined ? body.phone : current.phone,
        body.password || current.password,
        new Date().toISOString(),
        req.params.id
      ]
    );
    if (body.className) {
      ensureClassGroup(db, body.className);
    }
    res.json({ success: true });
  });

  app.post('/api/admin/users', requireAdmin, (req, res) => {
    const body = req.body || {};
    const now = new Date().toISOString();
    db.run(
      `INSERT INTO users
      (student_id, password, name, role, status, school, department, class_name, phone, avatar_url, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        body.studentId,
        body.password || '123456',
        body.name,
        body.role || 'user',
        body.status || 'active',
        body.school || '',
        body.department || '',
        body.className || '',
        body.phone || '',
        body.avatarUrl || '',
        now,
        now
      ]
    );
    const created = db.get('SELECT id FROM users ORDER BY id DESC LIMIT 1');
    db.run(
      `INSERT INTO user_settings
      (user_id, grade, education_type, interests, future_plan, notification_settings, theme_settings, ai_settings, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [created.id, body.grade || '', body.educationType || '', '[]', '', '{}', '{}', '{}', now]
    );
    if (body.className) {
      ensureClassGroup(db, body.className);
    }
    res.json({ success: true });
  });

  app.post('/api/admin/students', requireAdmin, (req, res) => {
    const body = req.body || {};
    const studentId = String(body.studentId || '').trim();
    const password = String(body.password || '').trim();
    const name = String(body.name || '').trim();
    const className = String(body.className || '').trim();

    if (!studentId || !password || !name) {
      return res.status(400).json({ message: '学号、密码、姓名不能为空' });
    }
    if (db.get('SELECT id FROM users WHERE student_id = ?', [studentId])) {
      return res.status(400).json({ message: '该学号已存在' });
    }

    const now = new Date().toISOString();
    const result = db.run(
      `INSERT INTO users
      (student_id, password, name, role, status, school, department, class_name, phone, avatar_url, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        studentId,
        password,
        name,
        'user',
        'active',
        String(body.school || '').trim(),
        String(body.department || '').trim(),
        className,
        String(body.phone || '').trim(),
        '',
        now,
        now
      ]
    );

    ensureUserSettings(db, result.lastID);
    ensureClassGroup(db, className);
    const created = db.get('SELECT * FROM users WHERE id = ?', [result.lastID]);
    res.json({ success: true, user: mapUser(created) });
  });

  app.get('/api/admin/banners', requireAdmin, (_req, res) => {
    const rows = db.all('SELECT * FROM banners ORDER BY sort_order ASC, id ASC');
    res.json({ list: rows.map(mapBanner) });
  });

  app.post('/api/admin/banners', requireAdmin, (req, res) => {
    const body = req.body || {};
    db.run(
      `INSERT INTO banners (title, image_url, link_url, link_type, sort_order, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [body.title, body.imageUrl, body.linkUrl || '', body.linkType || 'placeholder', body.sortOrder || 0, body.isActive ? 1 : 0, new Date().toISOString(), new Date().toISOString()]
    );
    res.json({ success: true });
  });

  app.put('/api/admin/banners/:id', requireAdmin, (req, res) => {
    const body = req.body || {};
    db.run(
      `UPDATE banners SET title = ?, image_url = ?, link_url = ?, link_type = ?, sort_order = ?, is_active = ?, updated_at = ? WHERE id = ?`,
      [body.title, body.imageUrl, body.linkUrl || '', body.linkType || 'placeholder', body.sortOrder || 0, body.isActive ? 1 : 0, new Date().toISOString(), req.params.id]
    );
    res.json({ success: true });
  });

  app.delete('/api/admin/banners/:id', requireAdmin, (req, res) => {
    db.run('DELETE FROM banners WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  });

  app.get('/api/admin/infos', requireAdmin, (_req, res) => {
    const rows = db.all('SELECT * FROM infos ORDER BY datetime(created_at) DESC');
    res.json({ list: rows.map(mapInfo) });
  });

  app.post('/api/admin/infos', requireAdmin, (req, res) => {
    const body = req.body || {};
    const now = new Date().toISOString();
    db.run(
      `INSERT INTO infos (title, summary, content, source, category, location_type, status, publish_time, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [body.title, body.summary || '', body.content, body.source || '后台发布', body.category || '其他', body.locationType || '校内', body.status || 'published', now, now, now]
    );
    res.json({ success: true });
  });

  app.put('/api/admin/infos/:id', requireAdmin, (req, res) => {
    const body = req.body || {};
    db.run(
      `UPDATE infos SET title = ?, summary = ?, content = ?, source = ?, category = ?, location_type = ?, status = ?, updated_at = ? WHERE id = ?`,
      [body.title, body.summary || '', body.content, body.source || '后台发布', body.category || '其他', body.locationType || '校内', body.status || 'published', new Date().toISOString(), req.params.id]
    );
    res.json({ success: true });
  });

  app.delete('/api/admin/infos/:id', requireAdmin, (req, res) => {
    db.run('DELETE FROM infos WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  });

  app.get('/api/admin/activities', requireAdmin, (_req, res) => {
    const rows = db.all('SELECT * FROM activities ORDER BY datetime(created_at) DESC');
    res.json({ list: rows.map(mapActivity) });
  });

  app.post('/api/admin/activities', requireAdmin, (req, res) => {
    const body = req.body || {};
    const now = new Date().toISOString();
    db.run(
      `INSERT INTO activities
      (title, summary, content, start_time, end_time, location, location_type, organizer, images, activity_type, status, publish_time, creator_user_id, apply_count, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        body.title,
        body.summary || '',
        body.content,
        body.startTime,
        body.endTime,
        body.location,
        body.locationType || '校内',
        body.organizer || '后台发布',
        JSON.stringify(body.images || []),
        body.activityType || '其他',
        body.status || 'upcoming',
        now,
        req.user.id,
        body.applyCount || 0,
        now,
        now
      ]
    );
    res.json({ success: true });
  });

  app.put('/api/admin/activities/:id', requireAdmin, (req, res) => {
    const body = req.body || {};
    db.run(
      `UPDATE activities SET
      title = ?, summary = ?, content = ?, start_time = ?, end_time = ?, location = ?, location_type = ?, organizer = ?, images = ?, activity_type = ?, status = ?, apply_count = ?, updated_at = ?
      WHERE id = ?`,
      [
        body.title,
        body.summary || '',
        body.content,
        body.startTime,
        body.endTime,
        body.location,
        body.locationType || '校内',
        body.organizer || '后台发布',
        JSON.stringify(body.images || []),
        body.activityType || '其他',
        body.status || 'upcoming',
        body.applyCount || 0,
        new Date().toISOString(),
        req.params.id
      ]
    );
    res.json({ success: true });
  });

  app.delete('/api/admin/activities/:id', requireAdmin, (req, res) => {
    db.run('DELETE FROM activities WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  });

  app.get('/api/admin/class-groups', requireAdmin, (_req, res) => {
    const classNames = db.all(
      `SELECT DISTINCT TRIM(class_name) AS class_name
      FROM users
      WHERE role = 'user' AND TRIM(class_name) <> ''
      ORDER BY class_name ASC`
    );
    classNames.forEach((row) => ensureClassGroup(db, row.class_name));
    const rows = db.all('SELECT * FROM class_groups ORDER BY class_name ASC');
    res.json({ list: rows.map((row) => mapClassGroupWithMembers(db, row)) });
  });

  app.put('/api/admin/class-groups/:id', requireAdmin, (req, res) => {
    const body = req.body || {};
    const current = db.get('SELECT * FROM class_groups WHERE id = ?', [req.params.id]);
    if (!current) {
      return res.status(404).json({ message: '班级群不存在' });
    }
    const className = String(body.className || current.class_name || '').trim();
    db.run(
      `UPDATE class_groups SET
      class_name = ?, group_name = ?, announcement = ?, qr_code = ?, online_count = ?, messages = ?, updated_at = ?
      WHERE id = ?`,
      [
        className,
        body.groupName || `${className}群`,
        body.announcement || '',
        body.qrCode || '',
        0,
        JSON.stringify(body.classmates || []),
        JSON.stringify(body.messages || []),
        new Date().toISOString(),
        req.params.id
      ]
    );
    ensureClassGroup(db, body.className);
    res.json({ success: true });
  });

  app.post('/api/admin/class-groups/:id/assign-user', requireAdmin, (req, res) => {
    const group = db.get('SELECT * FROM class_groups WHERE id = ?', [req.params.id]);
    if (!group) {
      return res.status(404).json({ message: '班级群不存在' });
    }
    const user = db.get('SELECT * FROM users WHERE id = ?', [req.body.userId]);
    if (!user) {
      return res.status(404).json({ message: '学生不存在' });
    }
    db.run('UPDATE users SET class_name = ?, updated_at = ? WHERE id = ?', [group.class_name, new Date().toISOString(), req.body.userId]);
    res.json({ success: true });
  });

  app.post('/api/admin/upload-image', requireAdmin, (req, res) => {
    const { name, content } = req.body || {};
    if (!content) {
      return res.status(400).json({ message: '图片内容不能为空' });
    }
    const relativePath = saveBase64Image({ name, content });
    const fullUrl = `${req.protocol}://${req.get('host')}${relativePath}`;
    res.json({ path: relativePath, url: fullUrl });
  });

  app.get('/api/admin/reports', requireAdmin, (_req, res) => {
    res.json({
      usersByRole: db.all('SELECT role AS name, COUNT(*) AS value FROM users GROUP BY role'),
      infosByCategory: db.all('SELECT category AS name, COUNT(*) AS value FROM infos GROUP BY category'),
      activitiesByType: db.all('SELECT activity_type AS name, COUNT(*) AS value FROM activities GROUP BY activity_type'),
      runTrend: db.all(`SELECT substr(date, 1, 10) AS name, ROUND(SUM(distance), 2) AS value FROM runs GROUP BY substr(date, 1, 10) ORDER BY name DESC LIMIT 7`).reverse()
    });
  });

  app.get('/api/admin/ai-models', requireAdmin, (_req, res) => {
    const rows = db.all('SELECT * FROM ai_model_presets ORDER BY is_default DESC, id ASC');
    res.json({ list: rows.map(mapPreset) });
  });

  app.post('/api/admin/ai-models', requireAdmin, (req, res) => {
    const body = req.body || {};
    const config = normalizeAiConfig(body);
    const error = validateAiConfig(config);
    if (!String(body.name || '').trim()) {
      return res.status(400).json({ message: '默认模型名称不能为空' });
    }
    if (error) {
      return res.status(400).json({ message: error });
    }
    if (body.isDefault) {
      db.run('UPDATE ai_model_presets SET is_default = 0, updated_at = ?', [new Date().toISOString()]);
    }
    db.run(
      `INSERT INTO ai_model_presets
      (name, provider, base_url, api_key, model, temperature, top_p, max_tokens, presence_penalty, frequency_penalty, system_prompt, is_default, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        String(body.name).trim(),
        config.provider,
        config.baseUrl,
        config.apiKey,
        config.model,
        config.temperature,
        config.topP,
        config.maxTokens,
        config.presencePenalty,
        config.frequencyPenalty,
        config.systemPrompt,
        body.isDefault ? 1 : 0,
        body.isActive === false ? 0 : 1,
        new Date().toISOString(),
        new Date().toISOString()
      ]
    );
    res.json({ success: true });
  });

  app.put('/api/admin/ai-models/:id', requireAdmin, (req, res) => {
    const body = req.body || {};
    const config = normalizeAiConfig(body);
    const error = validateAiConfig(config);
    if (!String(body.name || '').trim()) {
      return res.status(400).json({ message: '默认模型名称不能为空' });
    }
    if (error) {
      return res.status(400).json({ message: error });
    }
    if (body.isDefault) {
      db.run('UPDATE ai_model_presets SET is_default = 0, updated_at = ? WHERE id <> ?', [new Date().toISOString(), req.params.id]);
    }
    db.run(
      `UPDATE ai_model_presets SET
      name = ?, provider = ?, base_url = ?, api_key = ?, model = ?, temperature = ?, top_p = ?, max_tokens = ?, presence_penalty = ?, frequency_penalty = ?, system_prompt = ?, is_default = ?, is_active = ?, updated_at = ?
      WHERE id = ?`,
      [
        String(body.name).trim(),
        config.provider,
        config.baseUrl,
        config.apiKey,
        config.model,
        config.temperature,
        config.topP,
        config.maxTokens,
        config.presencePenalty,
        config.frequencyPenalty,
        config.systemPrompt,
        body.isDefault ? 1 : 0,
        body.isActive === false ? 0 : 1,
        new Date().toISOString(),
        req.params.id
      ]
    );
    res.json({ success: true });
  });

  app.delete('/api/admin/ai-models/:id', requireAdmin, (req, res) => {
    db.run('DELETE FROM ai_model_presets WHERE id = ?', [req.params.id]);
    const hasDefault = db.get('SELECT id FROM ai_model_presets WHERE is_default = 1 LIMIT 1');
    if (!hasDefault) {
      const fallback = db.get('SELECT id FROM ai_model_presets ORDER BY id ASC LIMIT 1');
      if (fallback) {
        db.run('UPDATE ai_model_presets SET is_default = 1, updated_at = ? WHERE id = ?', [new Date().toISOString(), fallback.id]);
      }
    }
    res.json({ success: true });
  });
};
