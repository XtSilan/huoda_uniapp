const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream/promises');
const { readAppUpdateConfig, writeAppUpdateConfig } = require('./app-update-store');

let OSS = null;
try {
  // Delay hard failure until OSS features are actually used.
  OSS = require('ali-oss');
} catch (_error) {
  OSS = null;
}

const uploadRootDir = path.resolve(__dirname, '..', 'uploads');
const assetProxyPath = '/api/assets/object';
const allowedLocalRootPrefix = '/uploads/';

const DEFAULT_STORAGE_CONFIG = {
  provider: 'local',
  oss: {
    region: '',
    bucket: '',
    accessKeyId: '',
    accessKeySecret: '',
    endpoint: '',
    cname: false,
    secure: true,
    authorizationV4: true,
    objectPrefix: 'huoda'
  },
  lastSync: {
    direction: '',
    status: '',
    message: '',
    stats: {},
    at: ''
  }
};

let activeStorageSwitchTask = null;
let lastStorageSwitchTask = null;

function parseJson(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch (_error) {
    return fallback;
  }
}

function maskSecret(secret) {
  const normalized = String(secret || '').trim();
  if (!normalized) {
    return '';
  }
  if (normalized.length <= 8) {
    return `${normalized.slice(0, 1)}***${normalized.slice(-1)}`;
  }
  return `${normalized.slice(0, 4)}****${normalized.slice(-4)}`;
}

function trimSlashes(value) {
  return String(value || '').trim().replace(/^\/+|\/+$/g, '');
}

function normalizeRegion(region) {
  const normalized = String(region || '').trim();
  if (!normalized) {
    return '';
  }
  if (/^oss-/i.test(normalized)) {
    return normalized;
  }
  return `oss-${normalized}`;
}

function normalizeObjectPrefix(value) {
  return trimSlashes(value);
}

function normalizeLocalAssetPath(value) {
  const normalized = String(value || '').trim().replace(/\\/g, '/');
  if (!normalized) {
    return '';
  }
  if (/^https?:\/\//i.test(normalized)) {
    return normalized;
  }
  if (/^oss:\/\//i.test(normalized)) {
    return normalizeLocalAssetPath(normalized.slice('oss://'.length));
  }
  if (normalized.startsWith(allowedLocalRootPrefix)) {
    return normalized;
  }
  if (normalized.startsWith('uploads/')) {
    return `/${normalized}`;
  }
  if (normalized.startsWith('/')) {
    return normalized.startsWith(allowedLocalRootPrefix) ? normalized : '';
  }
  return `${allowedLocalRootPrefix}${trimSlashes(normalized)}`;
}

function normalizeOssAssetPath(value) {
  const localPath = normalizeLocalAssetPath(value);
  if (!localPath || /^https?:\/\//i.test(localPath)) {
    return localPath;
  }
  return `oss://${localPath.replace(/^\/+/, '')}`;
}

function isHttpUrl(value) {
  return /^https?:\/\//i.test(String(value || '').trim());
}

function isOssAssetPath(value) {
  return /^oss:\/\//i.test(String(value || '').trim());
}

function isManagedAssetPath(value) {
  return Boolean(normalizeLocalAssetPath(value));
}

function ensureStorageSettingsRow(db) {
  const existing = db.get('SELECT * FROM storage_settings WHERE id = 1');
  if (existing) {
    return existing;
  }
  const now = new Date().toISOString();
  db.run(
    `INSERT INTO storage_settings
    (id, provider, config_json, last_sync_direction, last_sync_status, last_sync_message, last_sync_stats, last_sync_at, updated_at)
    VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      DEFAULT_STORAGE_CONFIG.provider,
      JSON.stringify({ oss: DEFAULT_STORAGE_CONFIG.oss }),
      '',
      '',
      '',
      JSON.stringify({}),
      '',
      now
    ]
  );
  return db.get('SELECT * FROM storage_settings WHERE id = 1');
}

function mapStorageSettingsRow(row) {
  const current = row || {};
  const parsed = parseJson(current.config_json, {});
  const oss = {
    ...DEFAULT_STORAGE_CONFIG.oss,
    ...(parsed.oss || {})
  };
  return {
    provider: current.provider === 'oss' ? 'oss' : 'local',
    oss: {
      ...oss,
      region: normalizeRegion(oss.region),
      objectPrefix: normalizeObjectPrefix(oss.objectPrefix)
    },
    lastSync: {
      direction: String(current.last_sync_direction || '').trim(),
      status: String(current.last_sync_status || '').trim(),
      message: String(current.last_sync_message || '').trim(),
      stats: parseJson(current.last_sync_stats, {}),
      at: String(current.last_sync_at || '').trim()
    }
  };
}

function getStorageSettings(db) {
  return mapStorageSettingsRow(ensureStorageSettingsRow(db));
}

function sanitizeStorageSettings(settings) {
  return {
    provider: settings.provider,
    oss: {
      ...settings.oss,
      accessKeySecret: '',
      accessKeySecretMasked: maskSecret(settings.oss.accessKeySecret),
      hasAccessKeySecret: Boolean(String(settings.oss.accessKeySecret || '').trim())
    },
    lastSync: settings.lastSync
  };
}

function normalizeStorageSettingsPayload(payload = {}, current = DEFAULT_STORAGE_CONFIG) {
  const bodyOss = payload.oss || {};
  const currentOss = current.oss || DEFAULT_STORAGE_CONFIG.oss;
  const providedSecret = String(bodyOss.accessKeySecret || '').trim();
  const provider = String(payload.provider || current.provider || DEFAULT_STORAGE_CONFIG.provider).trim().toLowerCase();

  return {
    provider: provider === 'oss' ? 'oss' : 'local',
    oss: {
      region: normalizeRegion(bodyOss.region !== undefined ? bodyOss.region : currentOss.region),
      bucket: String(bodyOss.bucket !== undefined ? bodyOss.bucket : currentOss.bucket).trim(),
      accessKeyId: String(bodyOss.accessKeyId !== undefined ? bodyOss.accessKeyId : currentOss.accessKeyId).trim(),
      accessKeySecret: providedSecret || String(currentOss.accessKeySecret || '').trim(),
      endpoint: String(bodyOss.endpoint !== undefined ? bodyOss.endpoint : currentOss.endpoint).trim(),
      cname: bodyOss.cname !== undefined ? Boolean(bodyOss.cname) : Boolean(currentOss.cname),
      secure: bodyOss.secure !== undefined ? Boolean(bodyOss.secure) : currentOss.secure !== false,
      authorizationV4: bodyOss.authorizationV4 !== undefined ? Boolean(bodyOss.authorizationV4) : currentOss.authorizationV4 !== false,
      objectPrefix: normalizeObjectPrefix(bodyOss.objectPrefix !== undefined ? bodyOss.objectPrefix : currentOss.objectPrefix)
    }
  };
}

function saveStorageSettings(db, payload = {}) {
  const current = getStorageSettings(db);
  const normalized = normalizeStorageSettingsPayload(payload, current);
  const now = new Date().toISOString();
  db.run(
    `UPDATE storage_settings
    SET provider = ?, config_json = ?, updated_at = ?
    WHERE id = 1`,
    [current.provider, JSON.stringify({ oss: normalized.oss }), now]
  );
  return getStorageSettings(db);
}

function setStorageProvider(db, provider) {
  const current = getStorageSettings(db);
  const nextProvider = provider === 'oss' ? 'oss' : 'local';
  const now = new Date().toISOString();
  db.run(
    `UPDATE storage_settings
    SET provider = ?, updated_at = ?
    WHERE id = 1`,
    [nextProvider, now]
  );
  return {
    ...current,
    provider: nextProvider
  };
}

function setLastSyncStatus(db, payload = {}) {
  const now = new Date().toISOString();
  db.run(
    `UPDATE storage_settings
    SET last_sync_direction = ?, last_sync_status = ?, last_sync_message = ?, last_sync_stats = ?, last_sync_at = ?, updated_at = ?
    WHERE id = 1`,
    [
      String(payload.direction || '').trim(),
      String(payload.status || '').trim(),
      String(payload.message || '').trim(),
      JSON.stringify(payload.stats || {}),
      payload.at || now,
      now
    ]
  );
}

function createStorageSwitchTask(target, settings) {
  const task = {
    id: `storage-switch-${Date.now()}`,
    target,
    status: 'running',
    stage: 'preparing',
    startedAt: new Date().toISOString(),
    finishedAt: '',
    percent: 0,
    current: 0,
    total: 0,
    currentItem: '',
    errorMessage: '',
    settings: {
      bucket: settings && settings.oss ? String(settings.oss.bucket || '').trim() : '',
      region: settings && settings.oss ? String(settings.oss.region || '').trim() : '',
      endpoint: settings && settings.oss ? String(settings.oss.endpoint || '').trim() : '',
      objectPrefix: settings && settings.oss ? String(settings.oss.objectPrefix || '').trim() : '',
      secure: Boolean(settings && settings.oss ? settings.oss.secure !== false : true),
      authorizationV4: Boolean(settings && settings.oss ? settings.oss.authorizationV4 !== false : true),
      cname: Boolean(settings && settings.oss ? settings.oss.cname : false)
    },
    result: null,
    logs: []
  };
  activeStorageSwitchTask = task;
  lastStorageSwitchTask = task;
  return task;
}

function appendStorageSwitchLog(task, message, level = 'info') {
  if (!task || !message) {
    return;
  }
  task.logs.push({
    time: new Date().toISOString(),
    level,
    message: String(message)
  });
  if (task.logs.length > 200) {
    task.logs = task.logs.slice(-200);
  }
}

function updateStorageSwitchTask(task, payload = {}) {
  if (!task) {
    return;
  }
  Object.assign(task, payload);
}

function cloneStorageSwitchTask(task) {
  return task ? JSON.parse(JSON.stringify(task)) : null;
}

function getStorageSwitchTaskState() {
  return cloneStorageSwitchTask(activeStorageSwitchTask || lastStorageSwitchTask);
}

function ensureOssSdkInstalled() {
  if (!OSS) {
    throw new Error('未检测到 ali-oss 依赖，请先在 server 目录执行 npm install ali-oss@^6.x');
  }
}

function validateOssConfig(settings) {
  const oss = settings && settings.oss ? settings.oss : {};
  if (!String(oss.region || '').trim()) {
    return '请填写 OSS Region';
  }
  if (!String(oss.bucket || '').trim()) {
    return '请填写 OSS Bucket';
  }
  if (!String(oss.accessKeyId || '').trim()) {
    return '请填写 OSS AccessKeyId';
  }
  if (!String(oss.accessKeySecret || '').trim()) {
    return '请填写 OSS AccessKeySecret';
  }
  return '';
}

function createOssClient(settings, overrides = {}) {
  ensureOssSdkInstalled();
  const mergedSettings = {
    ...settings,
    oss: {
      ...((settings && settings.oss) || {}),
      ...overrides
    }
  };
  const error = validateOssConfig(mergedSettings);
  if (error) {
    throw new Error(error);
  }
  const oss = mergedSettings.oss;
  const config = {
    region: normalizeRegion(oss.region),
    bucket: String(oss.bucket || '').trim(),
    accessKeyId: String(oss.accessKeyId || '').trim(),
    accessKeySecret: String(oss.accessKeySecret || '').trim(),
    authorizationV4: oss.authorizationV4 !== false,
    secure: oss.secure !== false
  };
  if (String(oss.endpoint || '').trim()) {
    config.endpoint = String(oss.endpoint || '').trim();
    config.cname = Boolean(oss.cname);
  }
  return new OSS(config);
}

function isOssSignatureMismatchError(error) {
  if (!error) {
    return false;
  }
  const code = String(error.code || '').trim();
  const message = String(error.message || '').trim();
  return code === 'SignatureDoesNotMatch' || /signature we calculated does not match/i.test(message);
}

async function withOssClientFallback(settings, action, options = {}) {
  const onLog = typeof options.onLog === 'function' ? options.onLog : () => {};
  const primaryClient = createOssClient(settings);

  try {
    return await action(primaryClient, settings);
  } catch (error) {
    const canRetryWithLegacySignature = Boolean(
      settings &&
        settings.oss &&
        settings.oss.authorizationV4 !== false &&
        isOssSignatureMismatchError(error)
    );
    if (!canRetryWithLegacySignature) {
      throw error;
    }

    onLog('检测到 OSS V4 签名与当前接口不兼容，正在自动切换为兼容签名重试');
    const fallbackSettings = {
      ...settings,
      oss: {
        ...settings.oss,
        authorizationV4: false
      }
    };
    const fallbackClient = createOssClient(fallbackSettings);
    return action(fallbackClient, fallbackSettings);
  }
}

function buildObjectKey(assetPath, settings) {
  const localPath = normalizeLocalAssetPath(assetPath);
  if (!localPath || isHttpUrl(localPath)) {
    return '';
  }
  const suffix = localPath.replace(/^\/+/, '');
  const prefix = normalizeObjectPrefix(settings && settings.oss ? settings.oss.objectPrefix : '');
  return prefix ? `${prefix}/${suffix}` : suffix;
}

function mapObjectKeyToLocalAssetPath(objectKey, settings) {
  const normalizedKey = trimSlashes(objectKey);
  const prefix = normalizeObjectPrefix(settings && settings.oss ? settings.oss.objectPrefix : '');
  if (!normalizedKey) {
    return '';
  }
  if (prefix) {
    if (normalizedKey === prefix) {
      return '';
    }
    if (!normalizedKey.startsWith(`${prefix}/`)) {
      return '';
    }
    return normalizeLocalAssetPath(normalizedKey.slice(prefix.length + 1));
  }
  return normalizeLocalAssetPath(normalizedKey);
}

function getAbsoluteLocalAssetPath(assetPath) {
  const localPath = normalizeLocalAssetPath(assetPath);
  if (!localPath || !localPath.startsWith(allowedLocalRootPrefix)) {
    return '';
  }
  const relative = localPath.slice(allowedLocalRootPrefix.length);
  return path.join(uploadRootDir, relative.split('/').join(path.sep));
}

function getAssetPathFromAbsolutePath(filePath) {
  const relative = path.relative(uploadRootDir, filePath);
  if (!relative || relative.startsWith('..')) {
    return '';
  }
  return normalizeLocalAssetPath(`uploads/${relative.split(path.sep).join('/')}`);
}

function guessContentType(filePath) {
  const ext = path.extname(String(filePath || '').toLowerCase());
  const map = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.pdf': 'application/pdf',
    '.txt': 'text/plain; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.apk': 'application/vnd.android.package-archive',
    '.wgt': 'application/octet-stream',
    '.zip': 'application/zip',
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

async function ensureObjectUploadedForAsset(db, assetPath, options = {}) {
  const settings = getStorageSettings(db);
  if (settings.provider !== 'oss') {
    return {
      provider: settings.provider,
      localPath: normalizeLocalAssetPath(assetPath),
      storedPath: normalizeLocalAssetPath(assetPath)
    };
  }

  const localPath = normalizeLocalAssetPath(assetPath);
  const absolutePath = getAbsoluteLocalAssetPath(localPath);
  if (!absolutePath || !fs.existsSync(absolutePath)) {
    throw new Error(`待上传的本地文件不存在：${localPath}`);
  }

  const client = createOssClient(settings);
  const objectKey = buildObjectKey(localPath, settings);
  await client.put(objectKey, absolutePath, {
    headers: {
      'Content-Type': options.contentType || guessContentType(localPath)
    }
  });

  return {
    provider: settings.provider,
    localPath,
    storedPath: normalizeOssAssetPath(localPath),
    objectKey
  };
}

async function finalizeUploadedLocalFile(db, absolutePath, options = {}) {
  const localPath = getAssetPathFromAbsolutePath(absolutePath);
  if (!localPath) {
    throw new Error('无法识别上传文件的相对路径');
  }
  return ensureObjectUploadedForAsset(db, localPath, options);
}

function toProviderStoredPath(assetPath, provider) {
  if (!isManagedAssetPath(assetPath)) {
    return assetPath;
  }
  return provider === 'oss' ? normalizeOssAssetPath(assetPath) : normalizeLocalAssetPath(assetPath);
}

function toAssetProxyUrl(req, assetPath) {
  const normalized = String(assetPath || '').trim();
  if (!normalized) {
    return '';
  }
  if (isHttpUrl(normalized)) {
    return normalized;
  }
  return `${req.protocol}://${req.get('host')}${assetProxyPath}?path=${encodeURIComponent(normalized)}`;
}

function buildDownloadContentDisposition(fileName) {
  const normalized = String(fileName || '').trim() || 'download';
  const asciiFallback = normalized.replace(/[^\x20-\x7E]/g, '_').replace(/"/g, '');
  const encoded = encodeURIComponent(normalized);
  return `attachment; filename="${asciiFallback || 'download'}"; filename*=UTF-8''${encoded}`;
}

function getDownloadFileName(assetPath, fileName) {
  const normalizedName = String(fileName || '').trim();
  if (normalizedName) {
    return normalizedName;
  }
  const localPath = normalizeLocalAssetPath(assetPath);
  const fallbackName = localPath ? path.basename(localPath) : '';
  return fallbackName || 'download';
}

async function createSignedOssDownloadUrl(settings, assetPath, fileName, options = {}) {
  const client = createOssClient(settings);
  const objectKey = buildObjectKey(assetPath, settings);
  const downloadName = getDownloadFileName(assetPath, fileName);
  const expires = Number(options.expires || 3600);
  const disposition = buildDownloadContentDisposition(downloadName);

  if (settings.oss && settings.oss.authorizationV4 !== false && typeof client.signatureUrlV4 === 'function') {
    return client.signatureUrlV4(
      'GET',
      expires,
      {
        queries: {
          'response-content-disposition': disposition
        }
      },
      objectKey
    );
  }

  return client.signatureUrl(objectKey, {
    expires,
    response: {
      'content-disposition': disposition
    }
  });
}

async function toAttachmentDownloadUrl(req, db, assetPath, fileName, options = {}) {
  const normalized = String(assetPath || '').trim();
  if (!normalized) {
    return '';
  }
  if (isHttpUrl(normalized)) {
    return normalized;
  }

  const settings = getStorageSettings(db);
  const shouldUseOssDirectUrl = settings.provider === 'oss' || isOssAssetPath(normalized);
  if (shouldUseOssDirectUrl) {
    try {
      return await createSignedOssDownloadUrl(settings, normalized, fileName, options);
    } catch (_error) {
      // Fall back to asset proxy when signed URL generation fails.
    }
  }

  const query = [`path=${encodeURIComponent(normalized)}`, 'download=1'];
  const downloadName = getDownloadFileName(normalized, fileName);
  if (downloadName) {
    query.push(`name=${encodeURIComponent(downloadName)}`);
  }
  return `${req.protocol}://${req.get('host')}${assetProxyPath}?${query.join('&')}`;
}

async function sendAssetToResponse(req, res, db, assetPath) {
  const normalized = String(assetPath || '').trim();
  const localPath = normalizeLocalAssetPath(normalized);
  const settings = getStorageSettings(db);
  const shouldDownload = ['1', 'true', 'yes'].includes(String(req.query.download || '').trim().toLowerCase());
  const downloadName = getDownloadFileName(normalized, req.query.name);
  const contentType = guessContentType(localPath);

  if (!localPath || isHttpUrl(normalized)) {
    return res.status(404).json({ message: '资源不存在' });
  }

  const shouldTryOss = settings.provider === 'oss' || isOssAssetPath(normalized);
  if (shouldTryOss) {
    try {
      if (shouldDownload) {
        const signedUrl = await createSignedOssDownloadUrl(settings, normalized, downloadName);
        return res.redirect(signedUrl);
      }

      const client = createOssClient(settings);
      const objectKey = buildObjectKey(normalized, settings);
      const result = await client.getStream(objectKey);
      const headers = (result && result.res && result.res.headers) || {};
      if (headers['content-type']) {
        res.setHeader('Content-Type', headers['content-type']);
      } else {
        res.setHeader('Content-Type', contentType);
      }
      if (headers['content-length']) {
        res.setHeader('Content-Length', headers['content-length']);
      }
      if (headers.etag) {
        res.setHeader('ETag', headers.etag);
      }
      if (headers['last-modified']) {
        res.setHeader('Last-Modified', headers['last-modified']);
      }
      if (shouldDownload) {
        res.setHeader('Content-Disposition', buildDownloadContentDisposition(downloadName));
      }
      await pipeline(result.stream, res);
      return;
    } catch (_error) {
      // Fall back to local mirror when OSS is unavailable.
    }
  }

  const absolutePath = getAbsoluteLocalAssetPath(localPath);
  if (!absolutePath || !fs.existsSync(absolutePath)) {
    return res.status(404).json({ message: '资源不存在' });
  }
  res.type(contentType);
  if (shouldDownload) {
    res.setHeader('Content-Disposition', buildDownloadContentDisposition(downloadName));
  }
  res.sendFile(absolutePath);
}

function formatStorageError(error, context = '') {
  if (!error) {
    return context || '未知错误';
  }

  const details = [];
  if (context) {
    details.push(context);
  }

  const message = String(error.message || error.code || '未知错误').trim();
  if (message) {
    details.push(message);
  }
  if (error.code && !message.includes(error.code)) {
    details.push(`code=${error.code}`);
  }
  if (error.status) {
    details.push(`status=${error.status}`);
  }
  if (error.requestId) {
    details.push(`requestId=${error.requestId}`);
  }

  const responseHeaders = error.res && error.res.headers ? error.res.headers : {};
  const ossRequestId = responseHeaders['x-oss-request-id'] || responseHeaders['x-oss-requestid'];
  if (ossRequestId) {
    details.push(`ossRequestId=${ossRequestId}`);
  }

  return details.join(' | ');
}

function walkLocalUploadFiles(dirPath, result = []) {
  if (!fs.existsSync(dirPath)) {
    return result;
  }
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  entries.forEach((entry) => {
    const absolutePath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      walkLocalUploadFiles(absolutePath, result);
      return;
    }
    result.push(absolutePath);
  });
  return result;
}

function migrateSingleAssetPath(value, targetProvider) {
  const normalized = String(value || '').trim();
  if (!normalized || isHttpUrl(normalized)) {
    return normalized;
  }
  if (!isManagedAssetPath(normalized)) {
    return normalized;
  }
  return toProviderStoredPath(normalized, targetProvider);
}

function migrateAttachmentsJson(rawValue, targetProvider) {
  const list = Array.isArray(rawValue) ? rawValue : parseJson(rawValue, []);
  return JSON.stringify(
    list.map((item) => ({
      ...item,
      path: migrateSingleAssetPath(item && item.path ? item.path : '', targetProvider)
    }))
  );
}

function migrateImagesJson(rawValue, targetProvider) {
  const list = Array.isArray(rawValue) ? rawValue : parseJson(rawValue, []);
  return JSON.stringify(list.map((item) => migrateSingleAssetPath(item, targetProvider)));
}

function migrateAppUpdateConfig(targetProvider) {
  const current = readAppUpdateConfig();
  const next = Object.keys(current).reduce((result, platform) => {
    const item = current[platform] || {};
    result[platform] = {
      ...item,
      wgtUrl: migrateSingleAssetPath(item.wgtUrl || '', targetProvider),
      apkUrl: migrateSingleAssetPath(item.apkUrl || '', targetProvider),
      packagePath: migrateSingleAssetPath(item.packagePath || '', targetProvider)
    };
    return result;
  }, {});
  writeAppUpdateConfig(next);
  return next;
}

function migrateDatabaseAssetPaths(db, targetProvider) {
  const stats = {
    users: 0,
    banners: 0,
    infos: 0,
    activities: 0,
    classGroups: 0,
    popupAnnouncements: 0
  };

  db.all('SELECT id, avatar_url FROM users').forEach((row) => {
    const next = migrateSingleAssetPath(row.avatar_url || '', targetProvider);
    if (next !== (row.avatar_url || '')) {
      db.run('UPDATE users SET avatar_url = ?, updated_at = ? WHERE id = ?', [next, new Date().toISOString(), row.id]);
      stats.users += 1;
    }
  });

  db.all('SELECT id, image_url FROM banners').forEach((row) => {
    const next = migrateSingleAssetPath(row.image_url || '', targetProvider);
    if (next !== (row.image_url || '')) {
      db.run('UPDATE banners SET image_url = ?, updated_at = ? WHERE id = ?', [next, new Date().toISOString(), row.id]);
      stats.banners += 1;
    }
  });

  db.all('SELECT id, attachments FROM infos').forEach((row) => {
    const next = migrateAttachmentsJson(row.attachments, targetProvider);
    if (next !== String(row.attachments || '')) {
      db.run('UPDATE infos SET attachments = ?, updated_at = ? WHERE id = ?', [next, new Date().toISOString(), row.id]);
      stats.infos += 1;
    }
  });

  db.all('SELECT id, images FROM activities').forEach((row) => {
    const next = migrateImagesJson(row.images, targetProvider);
    if (next !== String(row.images || '')) {
      db.run('UPDATE activities SET images = ?, updated_at = ? WHERE id = ?', [next, new Date().toISOString(), row.id]);
      stats.activities += 1;
    }
  });

  db.all('SELECT id, qr_code FROM class_groups').forEach((row) => {
    const next = migrateSingleAssetPath(row.qr_code || '', targetProvider);
    if (next !== (row.qr_code || '')) {
      db.run('UPDATE class_groups SET qr_code = ?, updated_at = ? WHERE id = ?', [next, new Date().toISOString(), row.id]);
      stats.classGroups += 1;
    }
  });

  db.all('SELECT id, image_url FROM popup_announcements').forEach((row) => {
    const next = migrateSingleAssetPath(row.image_url || '', targetProvider);
    if (next !== (row.image_url || '')) {
      db.run('UPDATE popup_announcements SET image_url = ?, updated_at = ? WHERE id = ?', [next, new Date().toISOString(), row.id]);
      stats.popupAnnouncements += 1;
    }
  });

  migrateAppUpdateConfig(targetProvider);

  return stats;
}

async function listAllObjects(client, prefix) {
  let continuationToken = '';
  const objects = [];
  do {
    const query = {
      prefix,
      'max-keys': 1000
    };
    if (continuationToken) {
      query.continuationToken = continuationToken;
    }
    const result = await client.listV2(query, {
      timeout: 60000
    });
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

async function downloadObjectToLocal(client, objectKey, absolutePath) {
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  const result = await client.getStream(objectKey);
  const output = fs.createWriteStream(absolutePath);
  await pipeline(result.stream, output);
}

async function syncLocalUploadsToOss(db, options = {}) {
  const onProgress = typeof options.onProgress === 'function' ? options.onProgress : () => {};
  const onLog = typeof options.onLog === 'function' ? options.onLog : () => {};
  const settings = getStorageSettings(db);
  const error = validateOssConfig(settings);
  if (error) {
    throw new Error(error);
  }
  const client = createOssClient(settings);
  const files = walkLocalUploadFiles(uploadRootDir, []).filter((filePath) => {
    const relative = path.relative(uploadRootDir, filePath).split(path.sep).join('/');
    return !relative.startsWith('_tmp/');
  });

  onLog(`开始转入 OSS，共发现 ${files.length} 个本地文件`);
  onProgress({
    stage: 'uploading',
    total: files.length,
    current: 0,
    percent: files.length ? 0 : 90,
    currentItem: ''
  });

  let uploadedCount = 0;
  for (const absolutePath of files) {
    const localPath = getAssetPathFromAbsolutePath(absolutePath);
    if (!localPath) {
      continue;
    }
    onLog(`上传 ${localPath}`);
    try {
      await client.put(buildObjectKey(localPath, settings), absolutePath, {
        headers: {
          'Content-Type': guessContentType(localPath)
        }
      });
    } catch (error) {
      onLog(formatStorageError(error, `上传失败：${localPath}`));
      throw error;
    }
    uploadedCount += 1;
    onProgress({
      stage: 'uploading',
      total: files.length,
      current: uploadedCount,
      percent: files.length ? Math.min(90, Math.round((uploadedCount / files.length) * 90)) : 90,
      currentItem: localPath
    });
  }

  onLog('上传完成，开始改写数据库路径并切换存储提供方');
  onProgress({
    stage: 'migrating',
    total: files.length,
    current: uploadedCount,
    percent: 95,
    currentItem: ''
  });

  const migrated = migrateDatabaseAssetPaths(db, 'oss');
  setStorageProvider(db, 'oss');
  const stats = {
    uploadedCount,
    ...migrated
  };
  setLastSyncStatus(db, {
    direction: 'local-to-oss',
    status: 'success',
    message: `已同步 ${uploadedCount} 个本地文件到 OSS，并切换为 OSS 存储`,
    stats
  });
  return {
    provider: 'oss',
    stats
  };
}

async function syncOssToLocal(db, options = {}) {
  const onLog = typeof options.onLog === 'function' ? options.onLog : () => {};
  const settings = getStorageSettings(db);
  const error = validateOssConfig(settings);
  if (error) {
    throw new Error(error);
  }
  const prefix = buildObjectKey('/uploads/', settings);
  const { client, objects } = await withOssClientFallback(
    settings,
    async (selectedClient) => ({
      client: selectedClient,
      objects: await listAllObjects(selectedClient, prefix)
    }),
    { onLog }
  );

  let downloadedCount = 0;
  for (const object of objects) {
    const objectKey = String(object && object.name ? object.name : '').trim();
    if (!objectKey || objectKey.endsWith('/')) {
      continue;
    }
    const localPath = mapObjectKeyToLocalAssetPath(objectKey, settings);
    if (!localPath) {
      continue;
    }
    const absolutePath = getAbsoluteLocalAssetPath(localPath);
    if (!absolutePath) {
      continue;
    }
    try {
      await downloadObjectToLocal(client, objectKey, absolutePath);
    } catch (error) {
      onLog(formatStorageError(error, `下载失败：${objectKey}`));
      throw error;
    }
    downloadedCount += 1;
  }

  const migrated = migrateDatabaseAssetPaths(db, 'local');
  setStorageProvider(db, 'local');
  const stats = {
    downloadedCount,
    ...migrated
  };
  setLastSyncStatus(db, {
    direction: 'oss-to-local',
    status: 'success',
    message: `已从 OSS 同步 ${downloadedCount} 个文件到本地，并切换为本地存储`,
    stats
  });
  return {
    provider: 'local',
    stats
  };
}

async function syncLocalUploadsToOssWithProgress(db, options = {}) {
  const onProgress = typeof options.onProgress === 'function' ? options.onProgress : () => {};
  const onLog = typeof options.onLog === 'function' ? options.onLog : () => {};
  const settings = getStorageSettings(db);
  const error = validateOssConfig(settings);
  if (error) {
    throw new Error(error);
  }

  const client = createOssClient(settings);
  const files = walkLocalUploadFiles(uploadRootDir, []).filter((filePath) => {
    const relative = path.relative(uploadRootDir, filePath).split(path.sep).join('/');
    return !relative.startsWith('_tmp/');
  });

  onLog(`开始转入 OSS，共发现 ${files.length} 个本地文件`);
  onProgress({ stage: 'uploading', total: files.length, current: 0, percent: files.length ? 0 : 90, currentItem: '' });

  let uploadedCount = 0;
  for (const absolutePath of files) {
    const localPath = getAssetPathFromAbsolutePath(absolutePath);
    if (!localPath) {
      continue;
    }
    onLog(`上传 ${localPath}`);
    try {
      await client.put(buildObjectKey(localPath, settings), absolutePath, {
        headers: {
          'Content-Type': guessContentType(localPath)
        }
      });
    } catch (error) {
      onLog(formatStorageError(error, `上传失败：${localPath}`));
      throw error;
    }
    uploadedCount += 1;
    onProgress({
      stage: 'uploading',
      total: files.length,
      current: uploadedCount,
      percent: files.length ? Math.min(90, Math.round((uploadedCount / files.length) * 90)) : 90,
      currentItem: localPath
    });
  }

  onLog('上传完成，开始改写数据库路径并切换存储提供方');
  onProgress({ stage: 'migrating', total: files.length, current: uploadedCount, percent: 95, currentItem: '' });

  const migrated = migrateDatabaseAssetPaths(db, 'oss');
  setStorageProvider(db, 'oss');
  const stats = {
    uploadedCount,
    ...migrated
  };

  onLog('转入 OSS 完成');
  onProgress({ stage: 'completed', total: files.length, current: uploadedCount, percent: 100, currentItem: '' });

  return {
    provider: 'oss',
    stats,
    message: `已同步 ${uploadedCount} 个本地文件到 OSS，并切换为 OSS 存储`
  };
}

async function syncOssToLocalWithProgress(db, options = {}) {
  const onProgress = typeof options.onProgress === 'function' ? options.onProgress : () => {};
  const onLog = typeof options.onLog === 'function' ? options.onLog : () => {};
  const settings = getStorageSettings(db);
  const error = validateOssConfig(settings);
  if (error) {
    throw new Error(error);
  }

  const prefix = buildObjectKey('/uploads/', settings);
  onLog(`开始从 OSS 同步到本地，列举前缀 ${prefix}`);
  onProgress({ stage: 'listing', total: 0, current: 0, percent: 5, currentItem: prefix });
  const { client, objects } = await withOssClientFallback(
    settings,
    async (selectedClient) => ({
      client: selectedClient,
      objects: await listAllObjects(selectedClient, prefix)
    }),
    { onLog }
  );
  onLog(`已从 OSS 列举到 ${objects.length} 个对象`);
  onProgress({ stage: 'downloading', total: objects.length, current: 0, percent: objects.length ? 10 : 90, currentItem: '' });

  let downloadedCount = 0;
  for (const object of objects) {
    const objectKey = String(object && object.name ? object.name : '').trim();
    if (!objectKey || objectKey.endsWith('/')) {
      continue;
    }
    const localPath = mapObjectKeyToLocalAssetPath(objectKey, settings);
    if (!localPath) {
      continue;
    }
    const absolutePath = getAbsoluteLocalAssetPath(localPath);
    if (!absolutePath) {
      continue;
    }
    onLog(`下载 ${objectKey}`);
    try {
      await downloadObjectToLocal(client, objectKey, absolutePath);
    } catch (error) {
      onLog(formatStorageError(error, `下载失败：${objectKey}`));
      throw error;
    }
    downloadedCount += 1;
    onProgress({
      stage: 'downloading',
      total: objects.length,
      current: downloadedCount,
      percent: objects.length ? Math.min(90, 10 + Math.round((downloadedCount / objects.length) * 80)) : 90,
      currentItem: objectKey
    });
  }

  onLog('下载完成，开始改写数据库路径并切换存储提供方');
  onProgress({ stage: 'migrating', total: objects.length, current: downloadedCount, percent: 95, currentItem: '' });

  const migrated = migrateDatabaseAssetPaths(db, 'local');
  setStorageProvider(db, 'local');
  const stats = {
    downloadedCount,
    ...migrated
  };

  onLog('切回本地完成');
  onProgress({ stage: 'completed', total: objects.length, current: downloadedCount, percent: 100, currentItem: '' });

  return {
    provider: 'local',
    stats,
    message: `已从 OSS 同步 ${downloadedCount} 个文件到本地，并切换为本地存储`
  };
}

function startStorageSwitchTask(db, target) {
  if (activeStorageSwitchTask && activeStorageSwitchTask.status === 'running') {
    return {
      started: false,
      task: cloneStorageSwitchTask(activeStorageSwitchTask)
    };
  }

  const settings = getStorageSettings(db);
  const task = createStorageSwitchTask(target, settings);
  appendStorageSwitchLog(task, `开始执行存储切换，目标：${target === 'oss' ? 'OSS' : '本地'}`);
  appendStorageSwitchLog(
    task,
    `当前配置：bucket=${task.settings.bucket || '-'}, region=${task.settings.region || '-'}, endpoint=${task.settings.endpoint || '(默认)'}, prefix=${task.settings.objectPrefix || '(空)'}, v4=${task.settings.authorizationV4}, cname=${task.settings.cname}`
  );

  Promise.resolve()
    .then(async () => {
      const result =
        target === 'oss'
          ? await syncLocalUploadsToOssWithProgress(db, {
              onProgress: (payload) => updateStorageSwitchTask(task, payload),
              onLog: (message) => appendStorageSwitchLog(task, message)
            })
          : await syncOssToLocalWithProgress(db, {
              onProgress: (payload) => updateStorageSwitchTask(task, payload),
              onLog: (message) => appendStorageSwitchLog(task, message)
            });

      task.status = 'success';
      task.result = result;
      task.finishedAt = new Date().toISOString();
      setLastSyncStatus(db, {
        direction: target === 'oss' ? 'local-to-oss' : 'oss-to-local',
        status: 'success',
        message: result.message || '存储切换成功',
        stats: {
          ...(result.stats || {}),
          logs: task.logs
        },
        at: task.finishedAt
      });
    })
    .catch((error) => {
      task.status = 'failed';
      task.finishedAt = new Date().toISOString();
      task.errorMessage = formatStorageError(error, `存储切换失败，阶段：${task.stage || 'unknown'}，当前项：${task.currentItem || '-'}`);
      appendStorageSwitchLog(task, task.errorMessage, 'error');
      setLastSyncStatus(db, {
        direction: target === 'oss' ? 'local-to-oss' : 'oss-to-local',
        status: 'failed',
        message: task.errorMessage,
        stats: {
          logs: task.logs,
          errorMessage: task.errorMessage
        },
        at: task.finishedAt
      });
    })
    .finally(() => {
      lastStorageSwitchTask = task;
      activeStorageSwitchTask = null;
    });

  return {
    started: true,
    task: cloneStorageSwitchTask(task)
  };
}

async function validateOssConnection(settings) {
  const client = createOssClient(settings);
  const stamp = Date.now();
  const probeObject = buildObjectKey(`/uploads/_health/oss-${stamp}.txt`, settings);
  const content = Buffer.from(`huoda-oss-healthcheck-${stamp}`, 'utf8');

  await client.put(probeObject, content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8'
    }
  });

  const streamResult = await client.getStream(probeObject);
  const chunks = [];
  await new Promise((resolve, reject) => {
    streamResult.stream.on('data', (chunk) => chunks.push(chunk));
    streamResult.stream.on('end', resolve);
    streamResult.stream.on('error', reject);
  });

  await client.delete(probeObject);

  const contentMatched = Buffer.concat(chunks).toString('utf8') === content.toString('utf8');
  if (!contentMatched) {
    throw new Error('OSS 读写校验未通过，请检查 Bucket 权限或网络链路');
  }

  return {
    ok: true,
    bucket: settings.oss.bucket,
    region: settings.oss.region,
    objectPrefix: settings.oss.objectPrefix,
    sampleObject: probeObject,
    contentMatched
  };
}

module.exports = {
  uploadRootDir,
  assetProxyPath,
  DEFAULT_STORAGE_CONFIG,
  getStorageSettings,
  sanitizeStorageSettings,
  normalizeStorageSettingsPayload,
  saveStorageSettings,
  validateOssConfig,
  validateOssConnection,
  createOssClient,
  buildObjectKey,
  mapObjectKeyToLocalAssetPath,
  normalizeLocalAssetPath,
  normalizeOssAssetPath,
  toProviderStoredPath,
  toAssetProxyUrl,
  toAttachmentDownloadUrl,
  sendAssetToResponse,
  ensureObjectUploadedForAsset,
  finalizeUploadedLocalFile,
  getAssetPathFromAbsolutePath,
  getAbsoluteLocalAssetPath,
  migrateSingleAssetPath,
  getStorageSwitchTaskState,
  startStorageSwitchTask,
  syncLocalUploadsToOss,
  syncOssToLocal
};
