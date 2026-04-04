const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const multer = require('multer');
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
const { platforms, readAppUpdateConfig, writeAppUpdateConfig, normalizePlatformConfig } = require('./app-update-store');

const classGroupUploadDir = path.resolve(__dirname, '..', 'uploads', 'class-group-qrcodes');
const infoAttachmentUploadDir = path.resolve(__dirname, '..', 'uploads', 'info-attachments');
const appUpdateUploadDir = path.resolve(__dirname, '..', 'uploads', 'app-updates');
const popupAnnouncementUploadDir = path.resolve(__dirname, '..', 'uploads', 'popup-announcements');
const wgtExtractRootDir = path.resolve(__dirname, '..', '..', 'unpackage', 'release', 'apk');

function decodeUploadFileName(fileName) {
  const rawName = String(fileName || '').trim();
  if (!rawName) {
    return '';
  }
  if (/[^\u0000-\u00ff]/.test(rawName)) {
    return rawName;
  }

  try {
    return Buffer.from(rawName, 'latin1').toString('utf8');
  } catch (_error) {
    return rawName;
  }
}

function buildStoredFileName(fileName, fallback = 'file') {
  const normalizedFileName = decodeUploadFileName(fileName);
  const ext = path.extname(normalizedFileName || '').slice(0, 20);
  const safeBase = path.basename(normalizedFileName || '', path.extname(normalizedFileName || '')).replace(/[^a-zA-Z0-9_-]/g, '') || fallback;
  return `${Date.now()}-${safeBase}${ext}`;
}

function normalizeInfoPayload(body = {}) {
  return {
    title: String(body.title || '').trim(),
    summary: String(body.summary || '').trim(),
    content: String(body.content || ''),
    source: String(body.source || '后台发布').trim() || '后台发布',
    sourceUrl: String(body.sourceUrl || '').trim(),
    isTop: Boolean(body.isTop),
    category: String(body.category || '其他').trim() || '其他',
    locationType: String(body.locationType || '校内').trim() || '校内',
    status: String(body.status || 'published').trim() || 'published',
    attachments: Array.isArray(body.attachments)
      ? body.attachments
          .map((item) => ({
            name: String(item && item.name ? item.name : '').trim(),
            path: String(item && item.path ? item.path : '').trim(),
            mimeType: String(item && item.mimeType ? item.mimeType : '').trim(),
            size: Number(item && item.size ? item.size : 0) || 0
          }))
          .filter((item) => item.name && item.path)
      : []
  };
}

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

function buildWgtExtractDir(fileName) {
  const normalizedFileName = decodeUploadFileName(fileName);
  const baseName = path.basename(normalizedFileName || '', path.extname(normalizedFileName || '')).replace(/[^a-zA-Z0-9_-]/g, '') || 'wgt-package';
  return path.join(wgtExtractRootDir, baseName);
}

function normalizePopupAnnouncementPayload(body = {}) {
  return {
    title: String(body.title || '').trim(),
    content: String(body.content || '').trim(),
    imageUrl: String(body.imageUrl || '').trim(),
    buttonText: String(body.buttonText || '我知道了').trim() || '我知道了',
    isActive: body.isActive !== undefined ? Boolean(body.isActive) : true
  };
}

function readWgtManifestVersionInfo(manifestPath) {
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`未找到 WGT 解压后的 manifest 文件：${manifestPath}`);
  }

  const raw = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const latestVersion = String(raw && raw.version && raw.version.name ? raw.version.name : '').trim();
  const versionCode = Number(raw && raw.version && raw.version.code ? raw.version.code : 0) || 0;

  if (!latestVersion || !versionCode) {
    throw new Error('WGT manifest 缺少有效的 version.name 或 version.code');
  }

  return {
    manifestPath,
    latestVersion,
    versionCode
  };
}

function extractWgtPackage(file) {
  const extractDir = buildWgtExtractDir(file.originalname || file.filename || '');
  const manifestPath = path.join(extractDir, 'manifest.json');

  fs.mkdirSync(wgtExtractRootDir, { recursive: true });
  fs.rmSync(extractDir, { recursive: true, force: true });
  fs.mkdirSync(extractDir, { recursive: true });

  const zip = new AdmZip(file.path);
  zip.extractAllTo(extractDir, true);

  const manifestInfo = readWgtManifestVersionInfo(manifestPath);
  return {
    ...manifestInfo,
    extractedDir: extractDir
  };
}

function normalizeNotificationType(type = '') {
  if (type === 'app_update') {
    return 'version';
  }
  return ['system', 'activity', 'sign', 'version'].includes(type) ? type : 'system';
}

function createNotification(db, payload = {}) {
  const userId = Number(payload.userId || 0);
  if (!userId) {
    return null;
  }
  const now = payload.createdAt || new Date().toISOString();
  const type = normalizeNotificationType(payload.type);
  const releaseId = String(payload.releaseId || '').trim();
  const serializedPayload = JSON.stringify(payload.payload || {});

  if (releaseId) {
    const existing = db.get('SELECT id FROM notifications WHERE user_id = ? AND type = ? AND release_id = ?', [userId, type, releaseId]);
    if (existing) {
      db.run(
        `UPDATE notifications
        SET title = ?, content = ?, payload = ?, is_read = 0, read_at = '', created_at = ?
        WHERE id = ?`,
        [payload.title || '', payload.content || '', serializedPayload, now, existing.id]
      );
      return;
    }
  }

  db.run(
    `INSERT INTO notifications
    (user_id, type, title, content, payload, release_id, is_read, created_at, read_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId, type, payload.title || '', payload.content || '', serializedPayload, releaseId, 0, now, '']
  );
}

function createNotificationsForUsers(db, userIds = [], payload = {}) {
  [...new Set((userIds || []).map((item) => Number(item || 0)).filter(Boolean))].forEach((userId) => {
    createNotification(db, { ...payload, userId });
  });
}

function notifyFavoritedUsers(db, targetType, targetId, payload) {
  const rows = db.all(
    `SELECT DISTINCT user_id
    FROM favorites
    WHERE target_type = ? AND target_id = ?`,
    [targetType, targetId]
  );
  createNotificationsForUsers(
    db,
    rows.map((row) => row.user_id),
    payload
  );
}

function publishAppUpdateNotifications(db, payload) {
  if (!payload || payload.updateType === 'none') {
    return;
  }

  const users = db.all(`SELECT id FROM users WHERE status = 'active' ORDER BY id ASC`);
  const now = new Date().toISOString();
  const releaseId = String(payload.releaseId || payload.publishedAt || '').trim();
  const notificationTitle = payload.title || '发现新版本';
  const notificationContent = payload.description || `检测到新的${payload.updateType === 'wgt' ? '热更新' : '安装包'}，点击后即可更新。`;
  const serializedPayload = JSON.stringify({
    updateType: payload.updateType,
    latestVersion: payload.latestVersion,
    versionCode: payload.versionCode,
    packageName: payload.packageName || '',
    packagePath: payload.packagePath || '',
    publishedAt: payload.publishedAt || '',
    releaseId
  });

  users.forEach((user) => {
    const existing = releaseId
      ? db.get(`SELECT id FROM notifications WHERE user_id = ? AND type IN ('app_update', 'version') AND release_id = ?`, [user.id, releaseId])
      : null;

    if (existing) {
      db.run(
        `UPDATE notifications
        SET title = ?, content = ?, payload = ?, is_read = 0, read_at = '', created_at = ?
        WHERE id = ?`,
        [notificationTitle, notificationContent, serializedPayload, now, existing.id]
      );
      return;
    }

    db.run(
      `INSERT INTO notifications
      (user_id, type, title, content, payload, release_id, is_read, created_at, read_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [user.id, 'version', notificationTitle, notificationContent, serializedPayload, releaseId, 0, now, '']
    );
  });
}

module.exports = function registerAdminRoutes(app, db) {
  fs.mkdirSync(classGroupUploadDir, { recursive: true });
  fs.mkdirSync(infoAttachmentUploadDir, { recursive: true });
  fs.mkdirSync(appUpdateUploadDir, { recursive: true });
  fs.mkdirSync(popupAnnouncementUploadDir, { recursive: true });

  const infoAttachmentUpload = multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, infoAttachmentUploadDir),
      filename: (_req, file, cb) => cb(null, buildStoredFileName(file.originalname, 'attachment'))
    }),
    limits: {
      fileSize: 1024 * 1024 * 1024
    }
  });

  const appUpdateUpload = multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, appUpdateUploadDir),
      filename: (_req, file, cb) => cb(null, buildStoredFileName(file.originalname, 'app-update'))
    }),
    limits: {
      fileSize: 300 * 1024 * 1024
    }
  });

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

  app.get('/api/admin/users', requireAdmin, (req, res) => {
    const keyword = String(req.query.keyword || '').trim();
    const role = String(req.query.role || '').trim();
    const status = String(req.query.status || '').trim();
    const department = String(req.query.department || '').trim();
    const conditions = [];
    const params = [];

    if (keyword) {
      conditions.push('(u.student_id LIKE ? OR u.name LIKE ? OR u.department LIKE ? OR u.class_name LIKE ? OR u.phone LIKE ?)');
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }
    if (role) {
      conditions.push('u.role = ?');
      params.push(role);
    }
    if (status) {
      conditions.push('u.status = ?');
      params.push(status);
    }
    if (department) {
      conditions.push('u.department = ?');
      params.push(department);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = db.all(
      `SELECT u.*, us.interests, us.future_plan
      FROM users u
      LEFT JOIN user_settings us ON us.user_id = u.id
      ${where}
      ORDER BY datetime(u.created_at) DESC, u.id DESC`,
      params
    );
    const departmentRows = db.all(
      `SELECT department, COUNT(*) AS count
      FROM users
      WHERE TRIM(department) <> ''
      GROUP BY department
      ORDER BY count DESC, department ASC`
    );
    res.json({
      list: rows.map((row) => ({
        ...mapUser(row),
        interests: parseJson(row.interests, []),
        futurePlan: row.future_plan || '',
        createdAt: row.created_at,
        lastLoginAt: row.last_login_at
      })),
      filters: {
        departments: departmentRows.map((row) => ({
          label: row.department,
          value: row.department,
          count: Number(row.count || 0)
        }))
      }
    });
  });

  app.put('/api/admin/users/:id', requireAdmin, (req, res) => {
    const current = db.get('SELECT * FROM users WHERE id = ?', [req.params.id]);
    const body = req.body || {};
    const className = String(body.className || current.class_name || '').trim();
    db.run(
      `UPDATE users SET role = ?, status = ?, name = ?, department = ?, class_name = ?, updated_at = ? WHERE id = ?`,
      [
        body.role || current.role,
        body.status || current.status,
        body.name || current.name,
        body.department || current.department,
        className,
        new Date().toISOString(),
        req.params.id
      ]
    );
    ensureClassGroup(db, className);
    res.json({ success: true });
  });

  app.delete('/api/admin/users/:id', requireAdmin, (req, res) => {
    const current = db.get('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (!current) {
      return res.status(404).json({ message: '用户不存在' });
    }
    if (Number(current.id) === Number(req.user.id)) {
      return res.status(400).json({ message: '不能删除当前登录管理员' });
    }
    db.run('DELETE FROM users WHERE id = ?', [req.params.id]);
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
    const rows = db.all('SELECT * FROM infos ORDER BY is_top DESC, datetime(created_at) DESC, id DESC');
    res.json({ list: rows.map(mapInfo) });
  });

  app.post('/api/admin/infos', requireAdmin, (req, res) => {
    const body = normalizeInfoPayload(req.body || {});
    const now = new Date().toISOString();
    db.run(
      `INSERT INTO infos (title, summary, content, source, source_url, attachments, category, location_type, is_top, status, publish_time, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [body.title, body.summary, body.content, body.source, body.sourceUrl, JSON.stringify(body.attachments), body.category, body.locationType, body.isTop ? 1 : 0, body.status, now, now, now]
    );
    res.json({ success: true });
  });

  app.put('/api/admin/infos/:id', requireAdmin, (req, res) => {
    const body = normalizeInfoPayload(req.body || {});
    db.run(
      `UPDATE infos SET title = ?, summary = ?, content = ?, source = ?, source_url = ?, attachments = ?, category = ?, location_type = ?, is_top = ?, status = ?, updated_at = ? WHERE id = ?`,
      [body.title, body.summary, body.content, body.source, body.sourceUrl, JSON.stringify(body.attachments), body.category, body.locationType, body.isTop ? 1 : 0, body.status, new Date().toISOString(), req.params.id]
    );
    notifyFavoritedUsers(db, 'info', req.params.id, {
      type: 'system',
      title: '收藏内容有更新',
      content: `你收藏的资讯“${body.title}”有新内容，点击查看最新详情。`,
      releaseId: `favorite-info-update-${req.params.id}-${Date.now()}`,
      payload: {
        targetType: 'info',
        targetId: String(req.params.id),
        action: 'open-info-detail'
      }
    });
    res.json({ success: true });
  });

  app.delete('/api/admin/infos/:id', requireAdmin, (req, res) => {
    db.run('DELETE FROM infos WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  });

  app.post('/api/admin/info-attachments/upload', requireAdmin, infoAttachmentUpload.single('file'), (req, res) => {
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: '请先选择要上传的附件' });
    }

    res.json({
      name: decodeUploadFileName(file.originalname),
      path: `/uploads/info-attachments/${path.basename(file.path)}`,
      mimeType: String(file.mimetype || '').trim(),
      size: Number(file.size || 0) || 0
    });
  });

  app.get('/api/admin/activities', requireAdmin, (_req, res) => {
    const rows = db.all('SELECT * FROM activities ORDER BY is_top DESC, datetime(created_at) DESC, id DESC');
    res.json({ list: rows.map(mapActivity) });
  });

  app.post('/api/admin/activities', requireAdmin, (req, res) => {
    const body = req.body || {};
    const now = new Date().toISOString();
    db.run(
      `INSERT INTO activities
      (title, summary, content, start_time, end_time, location, location_type, organizer, images, activity_type, is_top, status, publish_time, creator_user_id, apply_count, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        body.isTop ? 1 : 0,
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
      title = ?, summary = ?, content = ?, start_time = ?, end_time = ?, location = ?, location_type = ?, organizer = ?, images = ?, activity_type = ?, is_top = ?, status = ?, apply_count = ?, updated_at = ?
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
        body.isTop ? 1 : 0,
        body.status || 'upcoming',
        body.applyCount || 0,
        new Date().toISOString(),
        req.params.id
      ]
    );
    notifyFavoritedUsers(db, 'activity', req.params.id, {
      type: 'activity',
      title: '收藏活动有更新',
      content: `你收藏的活动“${body.title}”有新变化，点击查看最新安排。`,
      releaseId: `favorite-activity-update-${req.params.id}-${Date.now()}`,
      payload: {
        targetType: 'activity',
        targetId: String(req.params.id),
        action: 'open-activity-detail'
      }
    });
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
    res.json({ list: rows.map((row) => getClassGroupWithMembers(db, row)) });
  });

  app.post('/api/admin/class-groups', requireAdmin, (req, res) => {
    const body = req.body || {};
    const className = String(body.className || '').trim();
    if (!className) {
      return res.status(400).json({ message: '班级名称不能为空' });
    }
    if (db.get('SELECT id FROM class_groups WHERE class_name = ?', [className])) {
      return res.status(400).json({ message: '该班级已存在' });
    }
    const now = new Date().toISOString();
    db.run(
      `INSERT INTO class_groups
      (class_name, group_name, announcement, qr_code, online_count, classmates, messages, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        className,
        String(body.groupName || `${className}群`).trim() || `${className}群`,
        String(body.announcement || '').trim(),
        String(body.qrCode || '').trim(),
        0,
        '[]',
        JSON.stringify(body.messages || []),
        now,
        now
      ]
    );
    const created = db.get('SELECT * FROM class_groups WHERE class_name = ?', [className]);
    res.json({ success: true, data: getClassGroupWithMembers(db, created) });
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
        buildClassmatesFromUsers(db, className).length,
        JSON.stringify(body.messages || []),
        new Date().toISOString(),
        req.params.id
      ]
    );
    if (className && className !== current.class_name) {
      db.run(`UPDATE users SET class_name = ?, updated_at = ? WHERE role = 'user' AND TRIM(class_name) = ?`, [className, new Date().toISOString(), current.class_name]);
    }
    res.json({ success: true });
  });

  app.delete('/api/admin/class-groups/:id', requireAdmin, (req, res) => {
    const current = db.get('SELECT * FROM class_groups WHERE id = ?', [req.params.id]);
    if (!current) {
      return res.status(404).json({ message: '班级群不存在' });
    }
    const now = new Date().toISOString();
    db.run(`UPDATE users SET class_name = '', updated_at = ? WHERE role = 'user' AND TRIM(class_name) = ?`, [now, current.class_name]);
    db.run('DELETE FROM class_groups WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  });

  app.get('/api/admin/class-groups/:id/students', requireAdmin, (req, res) => {
    const group = db.get('SELECT * FROM class_groups WHERE id = ?', [req.params.id]);
    if (!group) {
      return res.status(404).json({ message: '班级群不存在' });
    }
    const keyword = String(req.query.keyword || '').trim();
    const currentStudents = buildClassmatesFromUsers(db, group.class_name);
    const conditions = [`role = 'user'`, `status = 'active'`, `(TRIM(class_name) = '' OR TRIM(class_name) <> ?)`];
    const params = [group.class_name];
    if (keyword) {
      conditions.push('(name LIKE ? OR student_id LIKE ? OR department LIKE ?)');
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }
    const rows = db.all(
      `SELECT id, student_id, name, department, class_name
      FROM users
      WHERE ${conditions.join(' AND ')}
      ORDER BY student_id ASC
      LIMIT 50`,
      params
    );
    res.json({
      currentStudents,
      candidates: rows.map((row) => ({
        id: row.id,
        studentId: row.student_id,
        name: row.name,
        department: row.department,
        className: row.class_name || ''
      }))
    });
  });

  app.post('/api/admin/class-groups/:id/students', requireAdmin, (req, res) => {
    const group = db.get('SELECT * FROM class_groups WHERE id = ?', [req.params.id]);
    if (!group) {
      return res.status(404).json({ message: '班级群不存在' });
    }
    const userId = Number((req.body || {}).userId || 0);
    const user = db.get(`SELECT * FROM users WHERE id = ? AND role = 'user'`, [userId]);
    if (!user) {
      return res.status(404).json({ message: '学生不存在' });
    }
    db.run('UPDATE users SET class_name = ?, updated_at = ? WHERE id = ?', [group.class_name, new Date().toISOString(), userId]);
    res.json({ success: true });
  });

  app.delete('/api/admin/class-groups/:id/students/:userId', requireAdmin, (req, res) => {
    const group = db.get('SELECT * FROM class_groups WHERE id = ?', [req.params.id]);
    if (!group) {
      return res.status(404).json({ message: '班级群不存在' });
    }
    db.run(`UPDATE users SET class_name = '', updated_at = ? WHERE id = ? AND role = 'user' AND TRIM(class_name) = ?`, [
      new Date().toISOString(),
      req.params.userId,
      group.class_name
    ]);
    res.json({ success: true });
  });

  app.post('/api/admin/class-groups/upload', requireAdmin, (req, res) => {
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

    const safeBase = path.basename(fileName, path.extname(fileName)).replace(/[^a-zA-Z0-9_-]/g, '') || 'qr';
    const storedName = `${Date.now()}-${safeBase}${ext}`;
    const targetPath = path.join(classGroupUploadDir, storedName);
    fs.writeFileSync(targetPath, Buffer.from(match[2], 'base64'));
    res.json({ path: `/uploads/class-group-qrcodes/${storedName}` });
  });

  app.get('/api/admin/app-updates', requireAdmin, (_req, res) => {
    res.json(readAppUpdateConfig());
  });

  app.get('/api/admin/popup-announcement', requireAdmin, (_req, res) => {
    const current = db.get(
      `SELECT *
      FROM popup_announcements
      ORDER BY datetime(published_at) DESC, datetime(updated_at) DESC, id DESC
      LIMIT 1`
    );
    res.json({
      announcement: current
        ? {
            id: String(current.id),
            title: current.title || '',
            content: current.content || '',
            imageUrl: current.image_url || '',
            buttonText: current.button_text || '我知道了',
            version: current.announcement_version || '',
            isActive: Boolean(current.is_active),
            publishedAt: current.published_at || '',
            updatedAt: current.updated_at || ''
          }
        : null
    });
  });

  app.post('/api/admin/popup-announcement/upload', requireAdmin, (req, res) => {
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

    const safeBase = path.basename(fileName, path.extname(fileName)).replace(/[^a-zA-Z0-9_-]/g, '') || 'popup';
    const storedName = `${Date.now()}-${safeBase}${ext}`;
    const targetPath = path.join(popupAnnouncementUploadDir, storedName);
    fs.writeFileSync(targetPath, Buffer.from(match[2], 'base64'));
    res.json({ path: `/uploads/popup-announcements/${storedName}` });
  });

  app.put('/api/admin/popup-announcement', requireAdmin, (req, res) => {
    const payload = normalizePopupAnnouncementPayload(req.body || {});
    if (!payload.title) {
      return res.status(400).json({ message: '请填写弹窗标题' });
    }
    if (!payload.content) {
      return res.status(400).json({ message: '请填写弹窗内容' });
    }

    const now = new Date().toISOString();
    const version = now;
    const current = db.get('SELECT * FROM popup_announcements ORDER BY id DESC LIMIT 1');

    if (current) {
      db.run(
        `UPDATE popup_announcements
        SET title = ?, content = ?, image_url = ?, button_text = ?, announcement_version = ?, is_active = ?, published_at = ?, updated_at = ?
        WHERE id = ?`,
        [payload.title, payload.content, payload.imageUrl, payload.buttonText, version, payload.isActive ? 1 : 0, now, now, current.id]
      );
    } else {
      db.run(
        `INSERT INTO popup_announcements
        (title, content, image_url, button_text, announcement_version, is_active, published_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [payload.title, payload.content, payload.imageUrl, payload.buttonText, version, payload.isActive ? 1 : 0, now, now, now]
      );
    }

    const saved = db.get('SELECT * FROM popup_announcements ORDER BY id DESC LIMIT 1');
    res.json({
      success: true,
      announcement: {
        id: String(saved.id),
        title: saved.title || '',
        content: saved.content || '',
        imageUrl: saved.image_url || '',
        buttonText: saved.button_text || '我知道了',
        version: saved.announcement_version || '',
        isActive: Boolean(saved.is_active),
        publishedAt: saved.published_at || '',
        updatedAt: saved.updated_at || ''
      }
    });
  });

  app.post('/api/admin/popup-announcement/deactivate', requireAdmin, (_req, res) => {
    const current = db.get('SELECT * FROM popup_announcements ORDER BY id DESC LIMIT 1');
    if (!current) {
      return res.json({ success: true, announcement: null });
    }

    db.run('UPDATE popup_announcements SET is_active = 0, updated_at = ? WHERE id = ?', [new Date().toISOString(), current.id]);
    const saved = db.get('SELECT * FROM popup_announcements WHERE id = ?', [current.id]);
    res.json({
      success: true,
      announcement: {
        id: String(saved.id),
        title: saved.title || '',
        content: saved.content || '',
        imageUrl: saved.image_url || '',
        buttonText: saved.button_text || '我知道了',
        version: saved.announcement_version || '',
        isActive: Boolean(saved.is_active),
        publishedAt: saved.published_at || '',
        updatedAt: saved.updated_at || ''
      }
    });
  });

  app.get('/api/admin/notifications', requireAdmin, (_req, res) => {
    const rows = db.all(
      `SELECT n.*, u.name AS user_name, u.student_id
      FROM notifications n
      LEFT JOIN users u ON u.id = n.user_id
      ORDER BY datetime(n.created_at) DESC, n.id DESC
      LIMIT 100`
    );
    res.json({
      list: rows.map((row) => ({
        id: String(row.id),
        type: normalizeNotificationType(row.type),
        title: row.title || '',
        content: row.content || '',
        payload: parseJson(row.payload, {}),
        releaseId: row.release_id || '',
        isRead: Boolean(row.is_read),
        createdAt: row.created_at || '',
        readAt: row.read_at || '',
        userName: row.user_name || '',
        studentId: row.student_id || ''
      }))
    });
  });

  app.post('/api/admin/notifications', requireAdmin, (req, res) => {
    const body = req.body || {};
    const type = normalizeNotificationType(body.type);
    const title = String(body.title || '').trim();
    const content = String(body.content || '').trim();
    const targetScope = String(body.targetScope || 'all').trim();
    const releaseId = String(body.releaseId || `manual-${type}-${Date.now()}`).trim();
    const targetType = String(body.targetType || '').trim();
    const targetId = String(body.targetId || '').trim();

    if (!title) {
      return res.status(400).json({ message: '通知标题不能为空' });
    }
    if (!content) {
      return res.status(400).json({ message: '通知内容不能为空' });
    }

    let userIds = [];
    if (targetScope === 'specific') {
      userIds = Array.isArray(body.userIds) ? body.userIds.map((item) => Number(item || 0)).filter(Boolean) : [];
      if (!userIds.length) {
        return res.status(400).json({ message: '请选择接收通知的用户' });
      }
    } else {
      userIds = db.all(`SELECT id FROM users WHERE status = 'active' ORDER BY id ASC`).map((row) => row.id);
    }

    createNotificationsForUsers(db, userIds, {
      type,
      title,
      content,
      releaseId,
      payload: {
        targetType,
        targetId,
        action:
          targetType === 'activity'
            ? 'open-activity-detail'
            : targetType === 'info'
              ? 'open-info-detail'
              : targetType === 'sign'
                ? 'open-sign-page'
                : targetType === 'version'
                  ? 'open-version-update'
                  : 'none'
      }
    });

    res.json({ success: true, count: userIds.length });
  });

  app.post('/api/admin/app-updates/upload', requireAdmin, appUpdateUpload.single('file'), (req, res) => {
    const file = req.file;
    const updateType = String((req.body && req.body.updateType) || '').trim().toLowerCase();

    if (!file) {
      return res.status(400).json({ message: '请先选择更新包文件' });
    }

    const originalName = decodeUploadFileName(file.originalname);
    const ext = path.extname(originalName || '').toLowerCase();
    if (!['.wgt', '.apk'].includes(ext)) {
      fs.unlinkSync(file.path);
      return res.status(400).json({ message: '仅支持上传 .wgt 或 .apk 文件' });
    }

    if (updateType && updateType !== ext.slice(1)) {
      fs.unlinkSync(file.path);
      return res.status(400).json({ message: `当前更新方式与上传文件不匹配，应上传 ${updateType.toUpperCase()} 文件` });
    }

    const response = {
      updateType: ext.slice(1),
      packageName: originalName,
      packageSize: Number(file.size || 0) || 0,
      packagePath: `/uploads/app-updates/${path.basename(file.path)}`,
      releaseId: path.basename(file.path)
    };

    if (ext === '.wgt') {
      try {
        const manifestInfo = extractWgtPackage(file);
        response.latestVersion = manifestInfo.latestVersion;
        response.versionCode = manifestInfo.versionCode;
        response.extractedDir = manifestInfo.extractedDir;
        response.manifestPath = manifestInfo.manifestPath;
      } catch (error) {
        fs.unlinkSync(file.path);
        fs.rmSync(buildWgtExtractDir(file.originalname || file.filename || ''), { recursive: true, force: true });
        return res.status(400).json({ message: error.message || 'WGT 解压失败' });
      }
    }

    res.json(response);
  });

  app.put('/api/admin/app-updates/:platform', requireAdmin, (req, res) => {
    const platform = String(req.params.platform || '').toLowerCase();
    if (!platforms.includes(platform)) {
      return res.status(400).json({ message: '不支持的平台类型' });
    }

    const current = readAppUpdateConfig();
    const payload = normalizePlatformConfig(platform, {
      ...(current[platform] || {}),
      ...(req.body || {})
    });
    const submittedAt = new Date().toISOString();

    if (payload.updateType === 'wgt') {
      payload.wgtUrl = payload.packagePath || payload.wgtUrl;
      payload.apkUrl = '';
    }
    if (payload.updateType === 'apk') {
      payload.apkUrl = payload.packagePath || payload.apkUrl;
      payload.wgtUrl = '';
    }
    if (payload.updateType === 'store' || payload.updateType === 'none') {
      payload.wgtUrl = '';
      payload.apkUrl = '';
      payload.packagePath = '';
      payload.packageName = '';
      payload.packageSize = 0;
      payload.releaseId = '';
      payload.extractedDir = '';
      payload.manifestPath = '';
    }

    if (payload.updateType === 'wgt' && !payload.packagePath && !payload.wgtUrl) {
      return res.status(400).json({ message: 'WGT 热更新必须填写 wgtUrl' });
    }
    if (payload.updateType === 'apk' && platform === 'android' && !payload.packagePath && !payload.apkUrl) {
      return res.status(400).json({ message: 'Android 整包更新必须填写 apkUrl' });
    }
    if (payload.updateType === 'store' && !payload.marketUrl) {
      return res.status(400).json({ message: '应用商店更新必须填写 marketUrl' });
    }
    if (platform === 'ios' && payload.updateType === 'apk') {
      return res.status(400).json({ message: 'iOS 不支持 APK 整包安装，请改用 WGT 或商店链接' });
    }

    const saved = writeAppUpdateConfig({
      ...current,
      [platform]: {
        ...payload,
        publishedAt: payload.updateType === 'none' ? '' : submittedAt
      }
    });
    if (platform === 'android' && saved[platform].updateType !== 'none') {
      publishAppUpdateNotifications(db, saved[platform]);
    }
    res.json(saved[platform]);
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
