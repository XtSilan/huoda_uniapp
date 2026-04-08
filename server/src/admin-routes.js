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
const {
  getStorageSettings,
  sanitizeStorageSettings,
  saveStorageSettings,
  normalizeStorageSettingsPayload,
  validateOssConnection,
  validateOssConfig,
  createOssClient,
  uploadRootDir,
  finalizeUploadedLocalFile,
  getAssetPathFromAbsolutePath,
  getAbsoluteLocalAssetPath,
  buildObjectKey,
  mapObjectKeyToLocalAssetPath,
  normalizeLocalAssetPath,
  normalizeOssAssetPath,
  getStorageSwitchTaskState,
  startStorageSwitchTask,
  toAssetProxyUrl
} = require('./storage-service');

const classGroupUploadDir = path.resolve(__dirname, '..', 'uploads', 'class-group-qrcodes');
const infoAttachmentUploadDir = path.resolve(__dirname, '..', 'uploads', 'info-attachments');
const appUpdateUploadDir = path.resolve(__dirname, '..', 'uploads', 'app-updates');
const popupAnnouncementUploadDir = path.resolve(__dirname, '..', 'uploads', 'popup-announcements');
const mediaLibraryUploadDir = path.resolve(__dirname, '..', 'uploads', 'media-library');
const wgtExtractRootDir = path.resolve(__dirname, '..', '..', 'huoda_uniapp', 'unpackage', 'release', 'apk');

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

function toPathVariants(value) {
  const normalized = String(value || '').trim();
  if (!normalized) {
    return [];
  }
  const local = normalizeLocalAssetPath(normalized);
  const oss = local ? normalizeOssAssetPath(local) : '';
  const withLeading = normalized.startsWith('/') ? normalized : `/${normalized}`;
  const withoutLeading = withLeading.replace(/^\/+/, '');
  const localWithLeading = local ? (local.startsWith('/') ? local : `/${local}`) : '';
  const localWithoutLeading = localWithLeading ? localWithLeading.replace(/^\/+/, '') : '';
  return [...new Set([normalized, withLeading, withoutLeading, local, oss, localWithLeading, localWithoutLeading].filter(Boolean))];
}

function replacePathInText(source, fromPath, toPath) {
  let next = String(source || '');
  const fromVariants = toPathVariants(fromPath);
  const toVariants = toPathVariants(toPath);
  const replacement = toVariants.length ? toVariants[0] : '';
  fromVariants.forEach((item) => {
    if (!item) {
      return;
    }
    next = next.split(item).join(replacement);
  });
  return next;
}

function sameAssetPath(left, right) {
  const leftVariants = toPathVariants(left);
  const rightVariants = toPathVariants(right);
  return leftVariants.some((item) => rightVariants.includes(item));
}

function walkUploadFiles(dirPath, list = []) {
  if (!fs.existsSync(dirPath)) {
    return list;
  }
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  entries.forEach((entry) => {
    const absolutePath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      walkUploadFiles(absolutePath, list);
      return;
    }
    if (entry.isFile()) {
      list.push(absolutePath);
    }
  });
  return list;
}

function getMimeTypeByExt(fileName) {
  const ext = path.extname(String(fileName || '').toLowerCase());
  const map = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.pdf': 'application/pdf',
    '.txt': 'text/plain',
    '.zip': 'application/zip',
    '.apk': 'application/vnd.android.package-archive',
    '.wgt': 'application/octet-stream',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.mp4': 'video/mp4',
    '.mp3': 'audio/mpeg'
  };
  return map[ext] || 'application/octet-stream';
}

function isImageByMimeType(mimeType = '') {
  return String(mimeType || '').toLowerCase().startsWith('image/');
}

function mapMediaFileItem(req, absolutePath) {
  const stat = fs.statSync(absolutePath);
  const assetPath = getAssetPathFromAbsolutePath(absolutePath);
  const mimeType = getMimeTypeByExt(assetPath || absolutePath);
  return {
    name: path.basename(absolutePath),
    path: assetPath,
    folder: path.dirname(assetPath || '').replace(/\\/g, '/'),
    size: Number(stat.size || 0),
    mimeType,
    isImage: isImageByMimeType(mimeType),
    updatedAt: stat.mtime ? stat.mtime.toISOString() : '',
    url: toAssetProxyUrl(req, assetPath)
  };
}

function normalizeObjectPrefix(value) {
  return String(value || '').trim().replace(/^\/+|\/+$/g, '');
}

function getMediaObjectKeyPrefix(settings = {}) {
  const basePrefix = normalizeObjectPrefix(settings && settings.oss ? settings.oss.objectPrefix : '');
  return basePrefix ? `${basePrefix}/uploads/` : 'uploads/';
}

async function listAllObjectsForPrefix(client, prefix) {
  const objects = [];
  let continuationToken = '';
  do {
    const query = {
      prefix,
      'max-keys': 1000
    };
    if (continuationToken) {
      query.continuationToken = continuationToken;
    }
    const result = await client.listV2(query);
    if (Array.isArray(result.objects)) {
      objects.push(...result.objects);
    }
    continuationToken = result.nextContinuationToken || '';
    if (!result.isTruncated) {
      break;
    }
  } while (continuationToken);
  return objects;
}

function mapMediaObjectItem(req, settings, object) {
  const objectKey = String(object && object.name ? object.name : '').trim();
  const localAssetPath = mapObjectKeyToLocalAssetPath(objectKey, settings);
  if (!localAssetPath) {
    return null;
  }
  const mimeType = getMimeTypeByExt(localAssetPath);
  return {
    name: path.basename(localAssetPath),
    path: normalizeOssAssetPath(localAssetPath),
    folder: path.dirname(localAssetPath || '').replace(/\\/g, '/'),
    size: Number((object && object.size) || 0),
    mimeType,
    isImage: isImageByMimeType(mimeType),
    updatedAt: object && object.lastModified ? new Date(object.lastModified).toISOString() : '',
    url: toAssetProxyUrl(req, normalizeOssAssetPath(localAssetPath))
  };
}

function updateAssetReferencesInDb(db, fromPath, toPath) {
  if (!fromPath) {
    return;
  }
  const now = new Date().toISOString();

  const updateScalarPathColumn = (table, idColumn, valueColumn) => {
    const rows = db.all(`SELECT ${idColumn} AS id, ${valueColumn} AS value FROM ${table}`);
    rows.forEach((row) => {
      const current = String(row.value || '').trim();
      if (!current || !sameAssetPath(current, fromPath)) {
        return;
      }
      db.run(`UPDATE ${table} SET ${valueColumn} = ?, updated_at = ? WHERE ${idColumn} = ?`, [toPath || '', now, row.id]);
    });
  };

  updateScalarPathColumn('users', 'id', 'avatar_url');
  updateScalarPathColumn('banners', 'id', 'image_url');
  updateScalarPathColumn('class_groups', 'id', 'qr_code');
  updateScalarPathColumn('popup_announcements', 'id', 'image_url');

  const infoRows = db.all('SELECT id, attachments, content FROM infos');
  infoRows.forEach((row) => {
    let changed = false;
    const attachments = parseJson(row.attachments, []);
    const nextAttachments = [];
    attachments.forEach((item) => {
      const currentPath = item && item.path ? String(item.path).trim() : '';
      if (!currentPath || !sameAssetPath(currentPath, fromPath)) {
        nextAttachments.push(item);
        return;
      }
      changed = true;
      if (!toPath) {
        return;
      }
      nextAttachments.push({
        ...item,
        path: toPath,
        url: replacePathInText(item.url || '', currentPath, toPath),
        downloadUrl: replacePathInText(item.downloadUrl || '', currentPath, toPath)
      });
    });
    const nextContent = replacePathInText(row.content || '', fromPath, toPath);
    if (nextContent !== String(row.content || '')) {
      changed = true;
    }
    if (changed) {
      db.run('UPDATE infos SET attachments = ?, content = ?, updated_at = ? WHERE id = ?', [
        JSON.stringify(nextAttachments),
        nextContent,
        now,
        row.id
      ]);
    }
  });

  const activityRows = db.all('SELECT id, images, content FROM activities');
  activityRows.forEach((row) => {
    let changed = false;
    const images = parseJson(row.images, []);
    const nextImages = [];
    images.forEach((item) => {
      if (!sameAssetPath(item, fromPath)) {
        nextImages.push(item);
        return;
      }
      changed = true;
      if (toPath) {
        nextImages.push(toPath);
      }
    });
    const nextContent = replacePathInText(row.content || '', fromPath, toPath);
    if (nextContent !== String(row.content || '')) {
      changed = true;
    }
    if (changed) {
      db.run('UPDATE activities SET images = ?, content = ?, updated_at = ? WHERE id = ?', [
        JSON.stringify(nextImages),
        nextContent,
        now,
        row.id
      ]);
    }
  });
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

function getStorageSwitchConfirmText() {
  return '我同意';
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

function appendClassGroupMessage(db, className, message) {
  const trimmed = String(className || '').trim();
  if (!trimmed || !message) {
    return;
  }
  ensureClassGroup(db, trimmed);
  const row = db.get('SELECT * FROM class_groups WHERE class_name = ?', [trimmed]);
  if (!row) {
    return;
  }
  const messages = parseJson(row.messages, []);
  messages.push({
    id: Date.now(),
    sender: '签到助手',
    text: message,
    time: new Date().toISOString(),
    type: 'system'
  });
  db.run('UPDATE class_groups SET messages = ?, updated_at = ? WHERE id = ?', [JSON.stringify(messages.slice(-100)), new Date().toISOString(), row.id]);
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
  fs.mkdirSync(mediaLibraryUploadDir, { recursive: true });

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

  const mediaLibraryUpload = multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, mediaLibraryUploadDir),
      filename: (_req, file, cb) => cb(null, buildStoredFileName(file.originalname, 'media'))
    }),
    limits: {
      fileSize: 1024 * 1024 * 1024
    }
  });

  app.get('/api/admin/storage', requireAdmin, (_req, res) => {
    res.json({
      settings: sanitizeStorageSettings(getStorageSettings(db))
    });
  });

  app.put('/api/admin/storage', requireAdmin, (req, res) => {
    try {
      const saved = saveStorageSettings(db, req.body || {});
      res.json({
        success: true,
        settings: sanitizeStorageSettings(saved)
      });
    } catch (error) {
      res.status(400).json({ message: error.message || '存储配置保存失败' });
    }
  });

  app.post('/api/admin/storage/validate', requireAdmin, async (req, res) => {
    try {
      const current = getStorageSettings(db);
      const next = normalizeStorageSettingsPayload(req.body || {}, current);
      const configError = validateOssConfig(next);
      if (configError) {
        return res.status(400).json({ message: configError });
      }
      const result = await validateOssConnection(next);
      res.json({
        success: true,
        result
      });
    } catch (error) {
      res.status(400).json({ message: error.message || 'OSS 连通性校验失败' });
    }
  });

  app.get('/api/admin/storage/progress', requireAdmin, (_req, res) => {
    res.json({
      task: getStorageSwitchTaskState(),
      settings: sanitizeStorageSettings(getStorageSettings(db))
    });
  });

  app.post('/api/admin/storage/switch', requireAdmin, async (req, res) => {
    const target = String((req.body && req.body.target) || '').trim().toLowerCase();
    const confirmText = String((req.body && req.body.confirmText) || '').trim();

    if (!['local', 'oss'].includes(target)) {
      return res.status(400).json({ message: '不支持的存储目标' });
    }
    if (confirmText !== getStorageSwitchConfirmText(target)) {
      return res.status(400).json({ message: `请填写确认文本：${getStorageSwitchConfirmText(target)}` });
    }

    try {
      const result = startStorageSwitchTask(db, target);
      res.json({
        success: true,
        target,
        result,
        task: result.task,
        settings: sanitizeStorageSettings(getStorageSettings(db))
      });
    } catch (error) {
      res.status(400).json({ message: error.message || '存储切换失败' });
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
    if (!current) {
      return res.status(404).json({ message: '用户不存在' });
    }
    const body = req.body || {};
    const className = String(body.className || current.class_name || '').trim();
    const role = String(body.role || current.role || 'user').trim();
    if (!['user', 'teacher', 'admin'].includes(role)) {
      return res.status(400).json({ message: '角色类型不合法' });
    }
    db.run(
      `UPDATE users SET role = ?, status = ?, name = ?, department = ?, class_name = ?, updated_at = ? WHERE id = ?`,
      [
        role,
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
    const role = String(body.role || 'user').trim();
    const className = String(body.className || '').trim();

    if (!studentId || !password || !name) {
      return res.status(400).json({ message: '学号、密码、姓名不能为空' });
    }
    if (!['user', 'teacher'].includes(role)) {
      return res.status(400).json({ message: '只能创建普通用户或教师账号' });
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
        role,
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

  app.post('/api/admin/info-attachments/upload', requireAdmin, infoAttachmentUpload.single('file'), async (req, res) => {
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: '请先选择要上传的附件' });
    }

    try {
      const stored = await finalizeUploadedLocalFile(db, file.path, {
        contentType: String(file.mimetype || '').trim()
      });
      res.json({
        name: decodeUploadFileName(file.originalname),
        path: stored.storedPath,
        url: toAssetProxyUrl(req, stored.storedPath),
        mimeType: String(file.mimetype || '').trim(),
        size: Number(file.size || 0) || 0
      });
    } catch (error) {
      res.status(400).json({ message: error.message || '附件上传失败' });
    }
  });

  app.get('/api/admin/media-library', requireAdmin, (req, res) => {
    const keyword = String(req.query.keyword || '').trim().toLowerCase();
    const settings = getStorageSettings(db);

    const filterByKeyword = (items = []) =>
      items.filter((item) => {
        if (!item || !item.path) {
          return false;
        }
        if (!keyword) {
          return true;
        }
        return String(item.path || '').toLowerCase().includes(keyword) || String(item.name || '').toLowerCase().includes(keyword);
      });

    const handleDone = (list = []) => {
      const filtered = filterByKeyword(list).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      res.json({
        list: filtered,
        total: filtered.length
      });
    };

    if (settings.provider !== 'oss') {
      const files = walkUploadFiles(uploadRootDir, []).map((absolutePath) => mapMediaFileItem(req, absolutePath));
      handleDone(files);
      return;
    }

    (async () => {
      try {
        const client = createOssClient(settings);
        const objects = await listAllObjectsForPrefix(client, getMediaObjectKeyPrefix(settings));
        const list = objects
          .map((item) => mapMediaObjectItem(req, settings, item))
          .filter(Boolean);
        handleDone(list);
      } catch (error) {
        res.status(400).json({ message: error.message || '读取 OSS 媒体列表失败' });
      }
    })();
  });

  app.post('/api/admin/media-library/upload', requireAdmin, mediaLibraryUpload.single('file'), async (req, res) => {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ message: '请先选择文件' });
    }
    try {
      const stored = await finalizeUploadedLocalFile(db, file.path, {
        contentType: String(file.mimetype || '').trim()
      });
      const absolutePath = getAbsoluteLocalAssetPath(stored.localPath || stored.storedPath);
      const settings = getStorageSettings(db);
      const isOss = settings.provider === 'oss';
      const storedPath = stored.storedPath || stored.localPath || '';
      const item = absolutePath && fs.existsSync(absolutePath) ? mapMediaFileItem(req, absolutePath) : null;
      res.json({
        success: true,
        item: item || {
          name: decodeUploadFileName(file.originalname),
          path: storedPath,
          url: toAssetProxyUrl(req, storedPath),
          mimeType: String(file.mimetype || '').trim(),
          isImage: isImageByMimeType(file.mimetype),
          size: Number(file.size || 0) || 0,
          updatedAt: new Date().toISOString(),
          provider: isOss ? 'oss' : 'local'
        }
      });
    } catch (error) {
      res.status(400).json({ message: error.message || '文件上传失败' });
    }
  });

  app.post('/api/admin/media-library/rename', requireAdmin, (req, res) => {
    const currentPath = String((req.body && req.body.path) || '').trim();
    const newNameRaw = decodeUploadFileName((req.body && req.body.newName) || '');
    const newName = path.basename(String(newNameRaw || '').trim());
    if (!currentPath || !newName) {
      return res.status(400).json({ message: '路径和新文件名不能为空' });
    }
    if (/[\\/:*?"<>|]/.test(newName)) {
      return res.status(400).json({ message: '文件名包含非法字符' });
    }

    const settings = getStorageSettings(db);
    const useOss = settings.provider === 'oss' || String(currentPath).startsWith('oss://');

    const doLocalRename = () => {
      const oldAbsolutePath = getAbsoluteLocalAssetPath(currentPath);
      if (!oldAbsolutePath || !fs.existsSync(oldAbsolutePath)) {
        return res.status(404).json({ message: '文件不存在' });
      }

      const stat = fs.statSync(oldAbsolutePath);
      if (!stat.isFile()) {
        return res.status(400).json({ message: '暂不支持重命名目录' });
      }

      const nextAbsolutePath = path.join(path.dirname(oldAbsolutePath), newName);
      if (fs.existsSync(nextAbsolutePath)) {
        return res.status(400).json({ message: '目标文件名已存在' });
      }

      fs.renameSync(oldAbsolutePath, nextAbsolutePath);
      const oldAssetPath = getAssetPathFromAbsolutePath(oldAbsolutePath);
      const nextAssetPath = getAssetPathFromAbsolutePath(nextAbsolutePath);
      updateAssetReferencesInDb(db, oldAssetPath, nextAssetPath);

      return res.json({
        success: true,
        item: mapMediaFileItem(req, nextAbsolutePath)
      });
    };

    if (!useOss) {
      doLocalRename();
      return;
    }

    (async () => {
      try {
        const client = createOssClient(settings);
        const oldObjectKey = buildObjectKey(currentPath, settings);
        const oldLocalPath = mapObjectKeyToLocalAssetPath(oldObjectKey, settings);
        if (!oldObjectKey || !oldLocalPath) {
          return res.status(400).json({ message: '当前文件路径无效' });
        }
        const dirName = path.posix.dirname(oldLocalPath);
        const nextLocalPath = path.posix.join(dirName, newName);
        const nextStoredPath = normalizeOssAssetPath(nextLocalPath);
        const nextObjectKey = buildObjectKey(nextStoredPath, settings);

        await client.copy(nextObjectKey, oldObjectKey);
        await client.delete(oldObjectKey);

        // Keep local mirror if exists.
        const oldAbsolutePath = getAbsoluteLocalAssetPath(oldLocalPath);
        const nextAbsolutePath = getAbsoluteLocalAssetPath(nextLocalPath);
        if (oldAbsolutePath && nextAbsolutePath && fs.existsSync(oldAbsolutePath)) {
          fs.mkdirSync(path.dirname(nextAbsolutePath), { recursive: true });
          fs.renameSync(oldAbsolutePath, nextAbsolutePath);
        }

        updateAssetReferencesInDb(db, normalizeOssAssetPath(oldLocalPath), nextStoredPath);

        const objectStat = await client.head(nextObjectKey);
        const item = mapMediaObjectItem(req, settings, {
          name: nextObjectKey,
          size: Number((objectStat.res && objectStat.res.headers && objectStat.res.headers['content-length']) || 0),
          lastModified: objectStat.res && objectStat.res.headers ? objectStat.res.headers['last-modified'] : new Date().toUTCString()
        });
        res.json({
          success: true,
          item
        });
      } catch (error) {
        res.status(400).json({ message: error.message || 'OSS 文件重命名失败' });
      }
    })();
  });

  app.post('/api/admin/media-library/delete', requireAdmin, (req, res) => {
    const currentPath = String((req.body && req.body.path) || '').trim();
    if (!currentPath) {
      return res.status(400).json({ message: '文件路径不能为空' });
    }
    const settings = getStorageSettings(db);
    const useOss = settings.provider === 'oss' || String(currentPath).startsWith('oss://');

    const doLocalDelete = () => {
      const absolutePath = getAbsoluteLocalAssetPath(currentPath);
      if (!absolutePath || !fs.existsSync(absolutePath)) {
        return res.status(404).json({ message: '文件不存在' });
      }

      const stat = fs.statSync(absolutePath);
      if (!stat.isFile()) {
        return res.status(400).json({ message: '暂不支持删除目录' });
      }

      fs.unlinkSync(absolutePath);
      const assetPath = getAssetPathFromAbsolutePath(absolutePath);
      updateAssetReferencesInDb(db, assetPath, '');

      return res.json({
        success: true
      });
    };

    if (!useOss) {
      doLocalDelete();
      return;
    }

    (async () => {
      try {
        const client = createOssClient(settings);
        const objectKey = buildObjectKey(currentPath, settings);
        const localPath = mapObjectKeyToLocalAssetPath(objectKey, settings);
        if (!objectKey || !localPath) {
          return res.status(400).json({ message: '当前文件路径无效' });
        }
        await client.delete(objectKey);

        const absolutePath = getAbsoluteLocalAssetPath(localPath);
        if (absolutePath && fs.existsSync(absolutePath)) {
          fs.unlinkSync(absolutePath);
        }
        updateAssetReferencesInDb(db, normalizeOssAssetPath(localPath), '');
        res.json({ success: true });
      } catch (error) {
        res.status(400).json({ message: error.message || 'OSS 文件删除失败' });
      }
    })();
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

  app.get('/api/admin/sign-batches', requireAdmin, (_req, res) => {
    const rows = db.all(
      `SELECT sb.*,
        (SELECT COUNT(*) FROM sign_records sr WHERE sr.batch_id = sb.id) AS sign_count,
        (SELECT COUNT(*) FROM leave_requests lr WHERE lr.batch_id = sb.id AND lr.status = 'pending') AS pending_leave_count
      FROM sign_batches sb
      ORDER BY datetime(sb.sign_date) DESC, datetime(sb.start_time) DESC, sb.id DESC`
    );
    res.json({
      list: rows.map((row) => ({
        id: String(row.id),
        className: row.class_name,
        courseName: row.course_name,
        teacher: row.teacher,
        signDate: row.sign_date,
        startTime: row.start_time,
        endTime: row.end_time,
        lateEndTime: row.late_end_time,
        status: row.status,
        signCount: Number(row.sign_count || 0),
        pendingLeaveCount: Number(row.pending_leave_count || 0)
      }))
    });
  });

  app.post('/api/admin/sign-batches', requireAdmin, (req, res) => {
    const body = req.body || {};
    const className = String(body.className || '').trim();
    const role = String(body.role || 'user').trim();
    const courseName = String(body.courseName || '').trim();
    const teacher = String(body.teacher || '').trim();
    const signDate = String(body.signDate || '').trim();
    const startTime = String(body.startTime || '').trim();
    const endTime = String(body.endTime || '').trim();
    const lateEndTime = String(body.lateEndTime || '').trim();
    if (!className || !courseName || !teacher || !signDate || !startTime || !endTime || !lateEndTime) {
      return res.status(400).json({ message: '请完整填写签到批次信息' });
    }
    const now = new Date().toISOString();
    db.run(
      `INSERT INTO sign_batches
      (class_name, course_name, teacher, sign_date, start_time, end_time, late_end_time, status, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [className, courseName, teacher, signDate, startTime, endTime, lateEndTime, body.status || 'active', req.user.id, now, now]
    );
    appendClassGroupMessage(db, className, `老师发起了《${courseName}》签到批次，请按时完成签到。`);
    res.json({ success: true });
  });

  app.put('/api/admin/sign-batches/:id', requireAdmin, (req, res) => {
    const body = req.body || {};
    const current = db.get('SELECT * FROM sign_batches WHERE id = ?', [req.params.id]);
    if (!current) {
      return res.status(404).json({ message: '签到批次不存在' });
    }
    db.run(
      `UPDATE sign_batches
      SET class_name = ?, course_name = ?, teacher = ?, sign_date = ?, start_time = ?, end_time = ?, late_end_time = ?, status = ?, updated_at = ?
      WHERE id = ?`,
      [
        String(body.className || current.class_name).trim(),
        String(body.courseName || current.course_name).trim(),
        String(body.teacher || current.teacher).trim(),
        String(body.signDate || current.sign_date).trim(),
        String(body.startTime || current.start_time).trim(),
        String(body.endTime || current.end_time).trim(),
        String(body.lateEndTime || current.late_end_time).trim(),
        String(body.status || current.status).trim(),
        new Date().toISOString(),
        req.params.id
      ]
    );
    res.json({ success: true });
  });

  app.get('/api/admin/leave-requests', requireAdmin, (_req, res) => {
    const rows = db.all(
      `SELECT lr.*, u.name AS user_name, u.student_id, u.class_name, sb.course_name, sb.teacher, sb.sign_date
      FROM leave_requests lr
      INNER JOIN users u ON u.id = lr.user_id
      INNER JOIN sign_batches sb ON sb.id = lr.batch_id
      ORDER BY CASE WHEN lr.status = 'pending' THEN 0 ELSE 1 END, datetime(lr.created_at) DESC, lr.id DESC`
    );
    res.json({
      list: rows.map((row) => ({
        id: String(row.id),
        userId: String(row.user_id),
        userName: row.user_name,
        studentId: row.student_id,
        className: row.class_name,
        batchId: String(row.batch_id),
        courseName: row.course_name,
        teacher: row.teacher,
        signDate: row.sign_date,
        reason: row.reason,
        leaveTime: row.leave_time,
        status: row.status,
        reviewComment: row.review_comment || '',
        reviewedAt: row.reviewed_at || '',
        createdAt: row.created_at
      }))
    });
  });

  app.post('/api/admin/leave-requests/:id/review', requireAdmin, (req, res) => {
    const body = req.body || {};
    const status = String(body.status || '').trim();
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: '审核状态不合法' });
    }
    const current = db.get(
      `SELECT lr.*, u.name AS user_name, u.class_name, sb.course_name, sb.id AS sign_batch_id
      FROM leave_requests lr
      INNER JOIN users u ON u.id = lr.user_id
      INNER JOIN sign_batches sb ON sb.id = lr.batch_id
      WHERE lr.id = ?`,
      [req.params.id]
    );
    if (!current) {
      return res.status(404).json({ message: '请假申请不存在' });
    }
    const comment = String(body.reviewComment || '').trim();
    const now = new Date().toISOString();
    db.run(
      `UPDATE leave_requests
      SET status = ?, review_comment = ?, reviewed_by = ?, reviewed_at = ?
      WHERE id = ?`,
      [status, comment, req.user.id, now, req.params.id]
    );
    appendClassGroupMessage(
      db,
      current.class_name,
      `${current.user_name}的《${current.course_name}》请假申请已${status === 'approved' ? '通过' : '驳回'}`
    );
    createNotification(db, {
      userId: current.user_id,
      type: 'sign',
      title: status === 'approved' ? '请假申请已通过' : '请假申请未通过',
      content: comment || `《${current.course_name}》请假申请已${status === 'approved' ? '通过' : '驳回'}。`,
      releaseId: `leave-review-${req.params.id}-${status}`,
      payload: {
        targetType: 'sign',
        action: 'open-sign-page',
        batchId: String(current.sign_batch_id)
      }
    });
    res.json({ success: true });
  });

  app.post('/api/admin/class-groups/upload', requireAdmin, async (req, res) => {
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
    try {
      const stored = await finalizeUploadedLocalFile(db, targetPath, {
        contentType: mimeType
      });
      res.json({
        path: stored.storedPath,
        url: toAssetProxyUrl(req, stored.storedPath)
      });
    } catch (error) {
      res.status(400).json({ message: error.message || '二维码上传失败' });
    }
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

  app.post('/api/admin/popup-announcement/upload', requireAdmin, async (req, res) => {
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
    try {
      const stored = await finalizeUploadedLocalFile(db, targetPath, {
        contentType: mimeType
      });
      res.json({
        path: stored.storedPath,
        url: toAssetProxyUrl(req, stored.storedPath)
      });
    } catch (error) {
      res.status(400).json({ message: error.message || '弹窗图片上传失败' });
    }
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

  app.post('/api/admin/app-updates/upload', requireAdmin, appUpdateUpload.single('file'), async (req, res) => {
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

    let storedPackage;
    try {
      storedPackage = await finalizeUploadedLocalFile(db, file.path, {
        contentType: String(file.mimetype || '').trim() || 'application/octet-stream'
      });
    } catch (error) {
      return res.status(400).json({ message: error.message || '更新包上传失败' });
    }

    const response = {
      updateType: ext.slice(1),
      packageName: originalName,
      packageSize: Number(file.size || 0) || 0,
      packagePath: storedPackage.storedPath,
      packageUrl: toAssetProxyUrl(req, storedPackage.storedPath),
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
        if (storedPackage && storedPackage.objectKey) {
          try {
            const settings = getStorageSettings(db);
            await createOssClient(settings).delete(storedPackage.objectKey);
          } catch (_cleanupError) {
            // Ignore cleanup failures so the original manifest error is preserved.
          }
        }
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
