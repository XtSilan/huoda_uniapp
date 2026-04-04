const fs = require('fs');
const path = require('path');
const {
  createToken,
  requireAuth,
  mapUser,
  mapBanner,
  mapInfo,
  mapActivity,
  mapNotification,
  ensureClassGroup,
  getClassGroupWithMembers,
  parseSettings,
  parseJson,
  recordBrowse
} = require('./shared');
const {
  DEFAULT_AI_CONFIG,
  DEFAULT_USER_AI_SETTINGS,
  normalizeAiConfig,
  validateAiConfig,
  sanitizeMessages,
  chatWithAi,
  validateAiConnection
} = require('./ai-client');
const { readAppUpdateConfig } = require('./app-update-store');

const userUploadDir = path.resolve(__dirname, '..', 'uploads', 'user');

function compareVersion(a = '0.0.0', b = '0.0.0') {
  const aParts = String(a).split('.').map((item) => Number(item) || 0);
  const bParts = String(b).split('.').map((item) => Number(item) || 0);
  const maxLength = Math.max(aParts.length, bParts.length);
  for (let i = 0; i < maxLength; i += 1) {
    const left = aParts[i] || 0;
    const right = bParts[i] || 0;
    if (left > right) return 1;
    if (left < right) return -1;
  }
  return 0;
}

function resolvePublicAssetUrl(req, filePath) {
  const normalized = String(filePath || '').trim();
  if (!normalized) {
    return '';
  }
  if (/^https?:\/\//i.test(normalized)) {
    return normalized;
  }
  return `${req.protocol}://${req.get('host')}${normalized.startsWith('/') ? normalized : `/${normalized}`}`;
}

function mapPopupAnnouncement(row, req) {
  if (!row) {
    return null;
  }

  const version = String(row.announcement_version || row.published_at || row.updated_at || row.id || '').trim();
  return {
    id: String(row.id),
    title: row.title || '',
    content: row.content || '',
    imageUrl: resolvePublicAssetUrl(req, row.image_url || ''),
    buttonText: row.button_text || '我知道了',
    version,
    publishedAt: row.published_at || '',
    isActive: Boolean(row.is_active)
  };
}

function mapPreset(row) {
  return {
    id: String(row.id),
    name: row.name,
    provider: row.provider,
    baseUrl: row.base_url,
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

function parseUserAiSettings(rawValue, db) {
  const raw = parseJson(rawValue, null);
  const defaultPreset = db.get('SELECT * FROM ai_model_presets WHERE is_default = 1 ORDER BY id ASC LIMIT 1');
  const defaultPresetId = defaultPreset ? String(defaultPreset.id) : '';

  if (!raw || !raw.mode) {
    const legacy = normalizeAiConfig(raw || DEFAULT_AI_CONFIG);
    return {
      mode: 'preset',
      selectedPresetId: defaultPresetId,
      customOpenAI: normalizeAiConfig(legacy.provider === 'openai' ? legacy : DEFAULT_USER_AI_SETTINGS.customOpenAI),
      customAnthropic: normalizeAiConfig(legacy.provider === 'anthropic' ? legacy : DEFAULT_USER_AI_SETTINGS.customAnthropic)
    };
  }

  return {
    mode: ['preset', 'custom-openai', 'custom-anthropic'].includes(raw.mode) ? raw.mode : 'preset',
    selectedPresetId: String(raw.selectedPresetId || defaultPresetId || ''),
    customOpenAI: normalizeAiConfig({ ...DEFAULT_USER_AI_SETTINGS.customOpenAI, ...(raw.customOpenAI || {}) }),
    customAnthropic: normalizeAiConfig({ ...DEFAULT_USER_AI_SETTINGS.customAnthropic, ...(raw.customAnthropic || {}) })
  };
}

function resolveUserAiConfig(aiSettings, db) {
  if (aiSettings.mode === 'custom-openai') {
    return aiSettings.customOpenAI;
  }
  if (aiSettings.mode === 'custom-anthropic') {
    return aiSettings.customAnthropic;
  }
  const selectedPreset = aiSettings.selectedPresetId
    ? db.get('SELECT * FROM ai_model_presets WHERE id = ? AND is_active = 1', [aiSettings.selectedPresetId])
    : null;
  const preset = selectedPreset || db.get('SELECT * FROM ai_model_presets WHERE is_default = 1 AND is_active = 1 ORDER BY id ASC LIMIT 1');
  return preset
    ? normalizeAiConfig({
        provider: preset.provider,
        baseUrl: preset.base_url,
        apiKey: preset.api_key,
        model: preset.model,
        temperature: preset.temperature,
        topP: preset.top_p,
        maxTokens: preset.max_tokens,
        presencePenalty: preset.presence_penalty,
        frequencyPenalty: preset.frequency_penalty,
        systemPrompt: preset.system_prompt
      })
    : normalizeAiConfig(DEFAULT_AI_CONFIG);
}

function buildSearchConditions(search, columns, params) {
  if (!search) {
    return '';
  }
  const condition = columns.map((column) => `${column} LIKE ?`).join(' OR ');
  columns.forEach(() => {
    params.push(`%${search}%`);
  });
  return `(${condition})`;
}

module.exports = function registerPublicRoutes(app, db) {
  fs.mkdirSync(userUploadDir, { recursive: true });
  const infoSelect = `
    SELECT i.*,
      (SELECT COUNT(*) FROM favorites f WHERE f.target_type = 'info' AND f.target_id = i.id) AS favorite_count,
      (SELECT COUNT(*) FROM browse_history bh WHERE bh.target_type = 'info' AND bh.target_id = i.id) AS view_count
    FROM infos i
  `;
  const activitySelect = `
    SELECT a.*,
      (SELECT COUNT(*) FROM favorites f WHERE f.target_type = 'activity' AND f.target_id = a.id) AS favorite_count
    FROM activities a
  `;

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.get('/api/app/version', (req, res) => {
    const platform = String(req.query.platform || 'android').toLowerCase();
    const currentVersionName = String(req.query.versionName || '0.0.0');
    const currentVersionCode = Number(req.query.versionCode || 0) || 0;
    const config = readAppUpdateConfig();
    const current = config[platform] || {};
    const latestVersion = String(current.latestVersion || currentVersionName || '0.0.0');
    const latestVersionCode = Number(current.versionCode || 0) || 0;
    const hasUpdate = compareVersion(latestVersion, currentVersionName) > 0 || latestVersionCode > currentVersionCode;

    res.json({
      platform,
      hasUpdate,
      latestVersion,
      versionCode: latestVersionCode,
      updateType: String(current.updateType || 'none'),
      force: Boolean(current.force),
      title: current.title || '发现新版本',
      description: current.description || '',
      wgtUrl: resolvePublicAssetUrl(req, current.wgtUrl || current.packagePath || ''),
      apkUrl: resolvePublicAssetUrl(req, current.apkUrl || current.packagePath || ''),
      packagePath: current.packagePath || '',
      packageName: current.packageName || '',
      packageSize: Number(current.packageSize || 0) || 0,
      releaseId: current.releaseId || '',
      marketUrl: current.marketUrl || '',
      publishedAt: current.publishedAt || ''
    });
  });

  app.post('/api/auth/login', (req, res) => {
    const { studentId, password } = req.body || {};
    const user = db.get('SELECT * FROM users WHERE student_id = ? AND password = ?', [studentId, password]);
    if (!user) {
      return res.status(400).json({ message: '账号或密码错误' });
    }
    if (user.status === 'disabled') {
      return res.status(403).json({ message: '该账户已停用' });
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
    const activities = db.all(`${activitySelect} ORDER BY datetime(a.publish_time) DESC LIMIT 4`);
    const settings = req.user ? db.get('SELECT * FROM user_settings WHERE user_id = ?', [req.user.id]) : null;
    const interests = settings ? parseJson(settings.interests, []) : [];

    let recommendations = [];
    if (interests.length) {
      const placeholders = interests.map(() => '?').join(',');
      recommendations = db.all(`${infoSelect} WHERE i.category IN (${placeholders}) ORDER BY datetime(i.publish_time) DESC LIMIT 4`, interests);
    }
    if (!recommendations.length) {
      recommendations = db.all(`${infoSelect} ORDER BY datetime(i.publish_time) DESC LIMIT 4`);
    }

    const hotInfos = db.all(`${infoSelect} ORDER BY datetime(i.publish_time) DESC LIMIT 6`);
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
    const nextClassName = String(body.class !== undefined ? body.class : req.user.class_name || '').trim();
    db.run(
      `UPDATE users SET
      name = ?, school = ?, department = ?, class_name = ?, phone = ?, avatar_url = ?, updated_at = ?
      WHERE id = ?`,
      [body.name || req.user.name, body.school || '', body.department || '', nextClassName, body.phone || '', body.avatarUrl || '', new Date().toISOString(), req.user.id]
    );
    ensureClassGroup(db, nextClassName);
    const updated = db.get('SELECT * FROM users WHERE id = ?', [req.user.id]);
    res.json(mapUser(updated));
  });

  app.post('/api/user/avatar/upload', requireAuth, (req, res) => {
    const body = req.body || {};
    const fileName = String(body.fileName || '').trim();
    const content = String(body.content || '');
    const match = content.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);

    if (!fileName || !match) {
      return res.status(400).json({ message: '请上传有效图片' });
    }

    const mimeType = match[1];
    const extMap = {
      'image/png': '.png',
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/webp': '.webp',
      'image/gif': '.gif'
    };
    const ext = extMap[mimeType];
    if (!ext) {
      return res.status(400).json({ message: '仅支持 png、jpg、webp、gif 图片' });
    }

    const safeBase = path.basename(fileName, path.extname(fileName)).replace(/[^a-zA-Z0-9_-]/g, '') || 'avatar';
    const storedName = `${Date.now()}-${req.user.id}-${safeBase}${ext}`;
    const targetPath = path.join(userUploadDir, storedName);
    fs.writeFileSync(targetPath, Buffer.from(match[2], 'base64'));

    res.json({ path: `/uploads/user/${storedName}` });
  });

  app.get('/api/user/settings', requireAuth, (req, res) => {
    const row = db.get('SELECT * FROM user_settings WHERE user_id = ?', [req.user.id]);
    res.json(parseSettings(row));
  });

  app.get('/api/user/notifications', requireAuth, (req, res) => {
    const rows = db.all(
      `SELECT *
      FROM notifications
      WHERE user_id = ?
      ORDER BY is_read ASC, datetime(created_at) DESC, id DESC
      LIMIT 50`,
      [req.user.id]
    );
    const list = rows.map(mapNotification);
    res.json({
      list,
      unreadCount: list.filter((item) => !item.isRead).length
    });
  });

  app.get('/api/user/popup-announcement', requireAuth, (req, res) => {
    const current = db.get(
      `SELECT *
      FROM popup_announcements
      WHERE is_active = 1
      ORDER BY datetime(published_at) DESC, datetime(updated_at) DESC, id DESC
      LIMIT 1`
    );

    const announcement = mapPopupAnnouncement(current, req);
    if (!announcement) {
      return res.json({ active: false, announcement: null });
    }

    const confirmed = db.get(
      `SELECT id
      FROM popup_announcement_reads
      WHERE announcement_id = ? AND announcement_version = ? AND user_id = ?
      LIMIT 1`,
      [announcement.id, announcement.version, req.user.id]
    );

    if (confirmed) {
      return res.json({ active: false, announcement: null });
    }

    res.json({ active: true, announcement });
  });

  app.post('/api/user/popup-announcement/:id/ack', requireAuth, (req, res) => {
    const current = db.get('SELECT * FROM popup_announcements WHERE id = ? AND is_active = 1', [req.params.id]);
    if (!current) {
      return res.status(404).json({ message: '弹窗通知不存在' });
    }

    const announcement = mapPopupAnnouncement(current, req);
    db.run(
      `INSERT OR IGNORE INTO popup_announcement_reads
      (announcement_id, announcement_version, user_id, confirmed_at)
      VALUES (?, ?, ?, ?)`,
      [current.id, announcement.version, req.user.id, new Date().toISOString()]
    );

    res.json({ success: true });
  });

  app.post('/api/user/notifications/:id/read', requireAuth, (req, res) => {
    const current = db.get('SELECT * FROM notifications WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!current) {
      return res.status(404).json({ message: '通知不存在' });
    }
    if (!Number(current.is_read || 0)) {
      db.run('UPDATE notifications SET is_read = 1, read_at = ? WHERE id = ?', [new Date().toISOString(), req.params.id]);
    }
    const updated = db.get('SELECT * FROM notifications WHERE id = ?', [req.params.id]);
    res.json(mapNotification(updated));
  });

  app.post('/api/user/notifications/read-all', requireAuth, (req, res) => {
    db.run(
      `UPDATE notifications
      SET is_read = 1, read_at = ?
      WHERE user_id = ? AND is_read = 0`,
      [new Date().toISOString(), req.user.id]
    );
    res.json({ success: true });
  });

  app.put('/api/user/settings', requireAuth, (req, res) => {
    const body = req.body || {};
    const current = db.get('SELECT * FROM user_settings WHERE user_id = ?', [req.user.id]);
    const currentSettings = parseSettings(current);
    const currentAiSettings = parseUserAiSettings(current && current.ai_settings, db);
    const merged = {
      grade: body.grade !== undefined ? body.grade : currentSettings.grade,
      educationType: body.educationType !== undefined ? body.educationType : currentSettings.educationType,
      interests: body.interests !== undefined ? body.interests : currentSettings.interests,
      futurePlan: body.futurePlan !== undefined ? body.futurePlan : currentSettings.futurePlan,
      notification: body.notification !== undefined ? body.notification : currentSettings.notification,
      theme: body.theme !== undefined ? body.theme : currentSettings.theme,
      aiConfig: body.aiConfig !== undefined ? body.aiConfig : currentAiSettings
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
        JSON.stringify(merged.aiConfig || currentAiSettings),
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
        title: row.info_title || row.activity_title || '鏈煡鍐呭',
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
    const browse = db.all(
      `SELECT bh.*
      FROM browse_history bh
      INNER JOIN (
        SELECT target_type, target_id, MAX(datetime(created_at)) AS latest_time
        FROM browse_history
        WHERE user_id = ?
        GROUP BY target_type, target_id
      ) latest
      ON latest.target_type = bh.target_type
      AND latest.target_id = bh.target_id
      AND latest.latest_time = datetime(bh.created_at)
      WHERE bh.user_id = ?
      ORDER BY datetime(bh.created_at) DESC
      LIMIT 50`,
      [req.user.id, req.user.id]
    );
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
    const browseTotal = db.get(
      `SELECT COUNT(*) AS count FROM (
        SELECT target_type, target_id
        FROM browse_history
        WHERE user_id = ?
        GROUP BY target_type, target_id
      )`,
      [req.user.id]
    ).count;
    const favoriteTotal = db.get('SELECT COUNT(*) AS count FROM favorites WHERE user_id = ?', [req.user.id]).count;
    res.json({
      totalViews: browseTotal,
      totalCollections: favoriteTotal,
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
    const { search = '', category = '', locationType = '', page = 1, pageSize = 50 } = req.query;
    const conditions = [];
    const params = [];
    const searchCondition = buildSearchConditions(search, ['title', 'content', 'summary', 'source'], params);
    if (searchCondition) {
      conditions.push(searchCondition);
    }
    if (category) {
      conditions.push('category = ?');
      params.push(category);
    }
    if (locationType) {
      conditions.push('location_type = ?');
      params.push(locationType);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = Number(pageSize);
    const offset = (Number(page) - 1) * limit;
    const infoWhere = where ? where.replace(/\btitle\b/g, 'i.title').replace(/\bcontent\b/g, 'i.content').replace(/\bsummary\b/g, 'i.summary').replace(/\bsource\b/g, 'i.source').replace(/\bcategory\b/g, 'i.category').replace(/\blocation_type\b/g, 'i.location_type') : '';
    const rows = db.all(`${infoSelect} ${infoWhere} ORDER BY datetime(i.publish_time) DESC LIMIT ? OFFSET ?`, [...params, limit, offset]);
    const total = db.get(`SELECT COUNT(*) AS count FROM infos ${where}`, params).count;
    res.json({ list: rows.map(mapInfo), total, page: Number(page), pageSize: limit });
  });

  app.get('/api/info/search', (req, res) => {
    const search = String(req.query.search || req.query.q || '').trim();
    const infoRows = search
      ? db.all(
          `${infoSelect}
          WHERE i.title LIKE ? OR i.content LIKE ? OR i.summary LIKE ? OR i.source LIKE ?
          ORDER BY datetime(i.publish_time) DESC LIMIT 20`,
          [`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`]
        )
      : [];
    const activityRows = search
      ? db.all(
          `${activitySelect}
          WHERE a.title LIKE ? OR a.content LIKE ? OR a.summary LIKE ? OR a.organizer LIKE ? OR a.location LIKE ?
          ORDER BY datetime(a.publish_time) DESC LIMIT 20`,
          [`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`]
        )
      : [];

    const infos = infoRows.map(mapInfo);
    const activities = activityRows.map(mapActivity);
    const list = [
      ...infos.map((item) => ({ ...item, targetType: 'info' })),
      ...activities.map((item) => ({ ...item, targetType: 'activity' }))
    ].sort((a, b) => new Date(b.publishTime || b.startTime || 0) - new Date(a.publishTime || a.startTime || 0));

    res.json({ infos, activities, list, total: list.length, page: 1, pageSize: list.length });
  });

  app.get('/api/info/detail', (req, res) => {
    const row = db.get(
      `SELECT i.*,
        (SELECT COUNT(*) FROM favorites f WHERE f.target_type = 'info' AND f.target_id = i.id) AS favorite_count,
        (SELECT COUNT(*) FROM browse_history bh WHERE bh.target_type = 'info' AND bh.target_id = i.id) AS view_count,
        CASE
          WHEN ? IS NOT NULL AND EXISTS(
            SELECT 1 FROM favorites f2
            WHERE f2.user_id = ? AND f2.target_type = 'info' AND f2.target_id = i.id
          ) THEN 1
          ELSE 0
        END AS is_collected
      FROM infos i
      WHERE i.id = ?`,
      [req.user ? req.user.id : null, req.user ? req.user.id : null, req.query.id]
    );
    if (!row) {
      return res.status(404).json({ message: '信息不存在' });
    }
    res.json(mapInfo(row));
  });

  app.get('/api/publish/list', (_req, res) => {
    const rows = db.all(`${activitySelect} ORDER BY datetime(a.publish_time) DESC`);
    res.json({ list: rows.map(mapActivity) });
  });

  app.get('/api/publish/detail', (req, res) => {
    const row = db.get(
      `SELECT a.*,
        (SELECT COUNT(*) FROM favorites f WHERE f.target_type = 'activity' AND f.target_id = a.id) AS favorite_count,
        CASE
          WHEN ? IS NOT NULL AND EXISTS(
            SELECT 1 FROM favorites f2
            WHERE f2.user_id = ? AND f2.target_type = 'activity' AND f2.target_id = a.id
          ) THEN 1
          ELSE 0
        END AS is_collected,
        CASE
          WHEN ? IS NOT NULL AND EXISTS(
            SELECT 1 FROM activity_applications aa
            WHERE aa.user_id = ? AND aa.activity_id = a.id
          ) THEN 1
          ELSE 0
        END AS is_applied
      FROM activities a
      WHERE a.id = ?`,
      [
        req.user ? req.user.id : null,
        req.user ? req.user.id : null,
        req.user ? req.user.id : null,
        req.user ? req.user.id : null,
        req.query.id
      ]
    );
    if (!row) {
      return res.status(404).json({ message: '活动不存在' });
    }
    res.json(mapActivity(row));
  });

  app.post('/api/publish/create', requireAuth, (req, res) => {
    const body = req.body || {};
    const now = new Date().toISOString();
    const summary = String(body.summary || body.content || '').slice(0, 60);
    db.run(
      `INSERT INTO activities
      (title, summary, content, start_time, end_time, location, location_type, organizer, images, activity_type, status, publish_time, creator_user_id, apply_count, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        body.title,
        summary,
        body.content,
        body.startTime,
        body.endTime,
        body.location,
        body.locationType || '鏍″唴',
        body.organizer,
        JSON.stringify(body.images || []),
        body.activityType || '鍏朵粬',
        body.status || 'upcoming',
        now,
        req.user.id,
        0,
        now,
        now
      ]
    );
    const created = db.get('SELECT * FROM activities ORDER BY id DESC LIMIT 1');
    res.json(mapActivity(created));
  });

  app.post('/api/publish/apply', requireAuth, (req, res) => {
    const { activityId } = req.body || {};
    const exists = db.get('SELECT id FROM activity_applications WHERE activity_id = ? AND user_id = ?', [activityId, req.user.id]);
    if (exists) {
      db.run('DELETE FROM activity_applications WHERE id = ?', [exists.id]);
      db.run(
        'UPDATE activities SET apply_count = CASE WHEN apply_count > 0 THEN apply_count - 1 ELSE 0 END, updated_at = ? WHERE id = ?',
        [new Date().toISOString(), activityId]
      );
      const updated = db.get(
        `SELECT a.*,
          (SELECT COUNT(*) FROM favorites f WHERE f.target_type = 'activity' AND f.target_id = a.id) AS favorite_count,
          0 AS is_applied,
          CASE
            WHEN EXISTS(
              SELECT 1 FROM favorites f2
              WHERE f2.user_id = ? AND f2.target_type = 'activity' AND f2.target_id = a.id
            ) THEN 1
            ELSE 0
          END AS is_collected
        FROM activities a
        WHERE a.id = ?`,
        [req.user.id, activityId]
      );
      return res.json({
        ...mapActivity(updated),
        action: 'cancel'
      });
    }
    db.run('INSERT INTO activity_applications (activity_id, user_id, created_at) VALUES (?, ?, ?)', [activityId, req.user.id, new Date().toISOString()]);
    db.run('UPDATE activities SET apply_count = apply_count + 1, updated_at = ? WHERE id = ?', [new Date().toISOString(), activityId]);
    const updated = db.get(
      `SELECT a.*,
        (SELECT COUNT(*) FROM favorites f WHERE f.target_type = 'activity' AND f.target_id = a.id) AS favorite_count,
        1 AS is_applied,
        CASE
          WHEN EXISTS(
            SELECT 1 FROM favorites f2
            WHERE f2.user_id = ? AND f2.target_type = 'activity' AND f2.target_id = a.id
          ) THEN 1
          ELSE 0
        END AS is_collected
      FROM activities a
      WHERE a.id = ?`,
      [req.user.id, activityId]
    );
    res.json({
      ...mapActivity(updated),
      action: 'apply'
    });
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

  app.get('/api/class-group/current', requireAuth, (req, res) => {
    const className = String(req.user.class_name || '').trim();
    if (!className) {
      return res.status(400).json({ message: '请先在个人资料中完善班级信息' });
    }
    ensureClassGroup(db, className);
    const row = db.get('SELECT * FROM class_groups WHERE class_name = ?', [className]);
    if (!row) {
      return res.status(404).json({ message: '暂未找到对应班级群' });
    }
    res.json(getClassGroupWithMembers(db, row));
  });

  app.post('/api/class-group/messages', requireAuth, (req, res) => {
    const className = String(req.user.class_name || '').trim();
    if (!className) {
      return res.status(400).json({ message: '请先在个人资料中完善班级信息' });
    }
    ensureClassGroup(db, className);
    const row = db.get('SELECT * FROM class_groups WHERE class_name = ?', [className]);
    if (!row) {
      return res.status(404).json({ message: '暂未找到对应班级群' });
    }
    const text = String((req.body || {}).text || '').trim();
    if (!text) {
      return res.status(400).json({ message: '消息内容不能为空' });
    }
    const messages = parseJson(row.messages, []);
    messages.push({
      id: Date.now(),
      sender: req.user.name,
      text,
      time: new Date().toISOString(),
      type: 'self'
    });
    db.run('UPDATE class_groups SET messages = ?, updated_at = ? WHERE id = ?', [JSON.stringify(messages.slice(-100)), new Date().toISOString(), row.id]);
    const updated = db.get('SELECT * FROM class_groups WHERE id = ?', [row.id]);
    res.json(getClassGroupWithMembers(db, updated));
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
    db.run('INSERT INTO sign_records (user_id, course_name, teacher, status, time, created_at) VALUES (?, ?, ?, ?, ?, ?)', [req.user.id, body.courseName || '楂樼瓑鏁板', body.teacher || '寮犺€佸笀', 'success', now, now]);
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
    const presets = db.all('SELECT * FROM ai_model_presets WHERE is_active = 1 ORDER BY is_default DESC, id ASC');
    const settings = parseUserAiSettings(row && row.ai_settings, db);
    res.json({
      ...settings,
      presets: presets.map(mapPreset)
    });
  });

  app.put('/api/ai/settings', requireAuth, (req, res) => {
    const body = req.body || {};
    const settings = {
      mode: ['preset', 'custom-openai', 'custom-anthropic'].includes(body.mode) ? body.mode : 'preset',
      selectedPresetId: String(body.selectedPresetId || ''),
      customOpenAI: normalizeAiConfig({ ...DEFAULT_USER_AI_SETTINGS.customOpenAI, ...(body.customOpenAI || {}) }),
      customAnthropic: normalizeAiConfig({ ...DEFAULT_USER_AI_SETTINGS.customAnthropic, ...(body.customAnthropic || {}) })
    };
    let error = '';
    if (settings.mode === 'preset') {
      const preset = settings.selectedPresetId
        ? db.get('SELECT id FROM ai_model_presets WHERE id = ? AND is_active = 1', [settings.selectedPresetId])
        : db.get('SELECT id FROM ai_model_presets WHERE is_default = 1 AND is_active = 1 LIMIT 1');
      if (!preset) {
        error = '鏈壘鍒板彲鐢ㄧ殑榛樿妯″瀷閰嶇疆';
      }
    } else if (settings.mode === 'custom-openai') {
      error = validateAiConfig(settings.customOpenAI);
    } else if (settings.mode === 'custom-anthropic') {
      error = validateAiConfig(settings.customAnthropic);
    }
    if (error) {
      return res.status(400).json({ message: error });
    }
    db.run('UPDATE user_settings SET ai_settings = ?, updated_at = ? WHERE user_id = ?', [
      JSON.stringify(settings),
      new Date().toISOString(),
      req.user.id
    ]);
    res.json({ success: true, settings });
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
      const savedSettings = parseUserAiSettings(row && row.ai_settings, db);
      const config = body.config ? normalizeAiConfig(body.config) : resolveUserAiConfig(savedSettings, db);
      const messages = sanitizeMessages(body.messages || [{ role: 'user', content: body.message || '' }]);
      const response = await chatWithAi(config, messages);
      const keyword = String(body.message || (messages[messages.length - 1] && messages[messages.length - 1].content) || '').trim();
      const relatedInfos = keyword
        ? db.all(
            `${infoSelect}
             WHERE i.title LIKE ? OR i.content LIKE ? OR i.summary LIKE ?
             ORDER BY datetime(i.publish_time) DESC LIMIT 2`,
            [`%${keyword}%`, `%${keyword}%`, `%${keyword}%`]
          )
        : [];
      const relatedActivities = keyword
        ? db.all(
            `${activitySelect}
             WHERE a.title LIKE ? OR a.content LIKE ? OR a.summary LIKE ?
             ORDER BY datetime(a.publish_time) DESC LIMIT 2`,
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




