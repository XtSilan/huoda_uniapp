const fs = require('fs');
const path = require('path');

const appUpdateConfigPath = path.resolve(__dirname, '..', 'data', 'app-update.json');
const platforms = ['android', 'ios'];

function createDefaultConfig(platform) {
  return {
    latestVersion: '',
    versionCode: 0,
    updateType: 'none',
    force: false,
    title: `活达 ${platform === 'ios' ? 'iOS' : 'Android'} 更新`,
    description: '当前已是最新版本。',
    wgtUrl: '',
    apkUrl: '',
    packagePath: '',
    packageName: '',
    packageSize: 0,
    releaseId: '',
    extractedDir: '',
    manifestPath: '',
    marketUrl: '',
    publishedAt: ''
  };
}

function normalizePlatformConfig(platform, value = {}) {
  const fallback = createDefaultConfig(platform);
  const updateType = String(value.updateType || fallback.updateType).trim().toLowerCase();
  const normalized = {
    latestVersion: String(value.latestVersion || '').trim(),
    versionCode: Number(value.versionCode || 0) || 0,
    updateType: ['none', 'wgt', 'apk', 'store'].includes(updateType) ? updateType : fallback.updateType,
    force: Boolean(value.force),
    title: String(value.title || fallback.title).trim() || fallback.title,
    description: String(value.description || fallback.description).trim() || fallback.description,
    wgtUrl: String(value.wgtUrl || '').trim(),
    apkUrl: String(value.apkUrl || '').trim(),
    packagePath: String(value.packagePath || '').trim(),
    packageName: String(value.packageName || '').trim(),
    packageSize: Number(value.packageSize || 0) || 0,
    releaseId: String(value.releaseId || '').trim(),
    extractedDir: String(value.extractedDir || '').trim(),
    manifestPath: String(value.manifestPath || '').trim(),
    marketUrl: String(value.marketUrl || '').trim(),
    publishedAt: String(value.publishedAt || '').trim()
  };

  if (normalized.updateType === 'none' && !normalized.publishedAt && !normalized.packagePath && !normalized.releaseId) {
    normalized.latestVersion = '';
    normalized.versionCode = 0;
  }

  return normalized;
}

function normalizeAppUpdateConfig(raw = {}) {
  return platforms.reduce((result, platform) => {
    result[platform] = normalizePlatformConfig(platform, raw[platform] || {});
    return result;
  }, {});
}

function ensureAppUpdateConfigFile() {
  const dir = path.dirname(appUpdateConfigPath);
  fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(appUpdateConfigPath)) {
    fs.writeFileSync(appUpdateConfigPath, JSON.stringify(normalizeAppUpdateConfig(), null, 2));
  }
}

function readAppUpdateConfig() {
  try {
    ensureAppUpdateConfigFile();
    return normalizeAppUpdateConfig(JSON.parse(fs.readFileSync(appUpdateConfigPath, 'utf8')));
  } catch (_error) {
    return normalizeAppUpdateConfig();
  }
}

function writeAppUpdateConfig(config) {
  const normalized = normalizeAppUpdateConfig(config);
  ensureAppUpdateConfigFile();
  fs.writeFileSync(appUpdateConfigPath, JSON.stringify(normalized, null, 2));
  return normalized;
}

module.exports = {
  appUpdateConfigPath,
  platforms,
  createDefaultConfig,
  normalizePlatformConfig,
  normalizeAppUpdateConfig,
  readAppUpdateConfig,
  writeAppUpdateConfig
};
