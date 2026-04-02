import request, { toQueryString } from './request';
import API from '../config/api';

const RELEASE_STORAGE_PREFIX = 'huoda_app_update_release_';

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

function getReleaseStorageKey(platform) {
  return `${RELEASE_STORAGE_PREFIX}${platform || 'unknown'}`;
}

function getLastAppliedReleaseId(platform) {
  try {
    return String(uni.getStorageSync(getReleaseStorageKey(platform)) || '');
  } catch (error) {
    return '';
  }
}

function markReleaseApplied(platform, releaseId) {
  if (!platform || !releaseId) {
    return;
  }
  try {
    uni.setStorageSync(getReleaseStorageKey(platform), releaseId);
  } catch (error) {}
}

function resolveUpdateUrl(url) {
  const normalized = String(url || '').trim();
  if (!normalized) {
    return '';
  }
  if (/^https?:\/\//i.test(normalized)) {
    return normalized;
  }
  const match = String(API.app.version || '').match(/^(https?:\/\/[^/]+)/i);
  if (!match) {
    return normalized;
  }
  return `${match[1]}${normalized.startsWith('/') ? normalized : `/${normalized}`}`;
}

export function getPlatformType() {
  // #ifdef APP-PLUS
  const system = uni.getSystemInfoSync();
  return /ios/i.test(system.platform || '') ? 'ios' : 'android';
  // #endif

  // #ifndef APP-PLUS
  return 'web';
  // #endif
}

export function getRuntimeInfo() {
  return new Promise((resolve) => {
    // #ifdef APP-PLUS
    plus.runtime.getProperty(plus.runtime.appid, (info) => {
      resolve({
        appid: plus.runtime.appid,
        versionName: info.version || '',
        versionCode: Number(info.versionCode || 0) || 0,
        platform: getPlatformType()
      });
    });
    // #endif

    // #ifndef APP-PLUS
    resolve({
      appid: '',
      versionName: '',
      versionCode: 0,
      platform: getPlatformType()
    });
    // #endif
  });
}

export async function fetchUpdateInfo(runtimeInfo) {
  const query = toQueryString({
    platform: runtimeInfo.platform,
    versionName: runtimeInfo.versionName,
    versionCode: runtimeInfo.versionCode
  });
  return request(`${API.app.version}${query ? `?${query}` : ''}`);
}

export async function checkForUpdates() {
  const runtimeInfo = await getRuntimeInfo();
  const updateInfo = await fetchUpdateInfo(runtimeInfo);
  const latestVersion = updateInfo.latestVersion || runtimeInfo.versionName;
  const latestVersionCode = Number(updateInfo.versionCode || 0) || 0;
  const releaseId = String(updateInfo.releaseId || updateInfo.publishedAt || '').trim();
  const hasReleaseUpdate = Boolean(releaseId && releaseId !== getLastAppliedReleaseId(runtimeInfo.platform));
  const hasUpdate = Boolean(
    updateInfo.hasUpdate ||
      compareVersion(latestVersion, runtimeInfo.versionName) > 0 ||
      latestVersionCode > Number(runtimeInfo.versionCode || 0) ||
      hasReleaseUpdate
  );

  return {
    runtimeInfo,
    updateInfo: {
      ...updateInfo,
      releaseId,
      hasReleaseUpdate,
      hasUpdate
    }
  };
}

function installDownloadedPackage(filePath, options = {}) {
  return new Promise((resolve, reject) => {
    // #ifdef APP-PLUS
    plus.runtime.install(
      filePath,
      options,
      () => resolve(),
      (error) => reject(new Error((error && error.message) || '安装更新失败'))
    );
    // #endif

    // #ifndef APP-PLUS
    reject(new Error('当前平台不支持安装更新'));
    // #endif
  });
}

function downloadPackage(url) {
  return new Promise((resolve, reject) => {
    uni.showLoading({ title: '下载更新中', mask: true });
    uni.downloadFile({
      url,
      success: (res) => {
        uni.hideLoading();
        if (res.statusCode !== 200 || !res.tempFilePath) {
          reject(new Error('下载更新失败'));
          return;
        }
        resolve(res.tempFilePath);
      },
      fail: () => {
        uni.hideLoading();
        reject(new Error('下载更新失败'));
      }
    });
  });
}

export async function applyUpdate(updateInfo) {
  // #ifdef APP-PLUS
  const runtimeInfo = await getRuntimeInfo();

  if (updateInfo.updateType === 'wgt') {
    const wgtUrl = resolveUpdateUrl(updateInfo.wgtUrl || updateInfo.packagePath || '');
    if (!wgtUrl) {
      throw new Error('未配置 WGT 更新包');
    }
    const filePath = await downloadPackage(wgtUrl);
    await installDownloadedPackage(filePath, { force: true });
    markReleaseApplied(runtimeInfo.platform, updateInfo.releaseId || updateInfo.publishedAt || '');
    return { type: 'wgt' };
  }

  if (updateInfo.updateType === 'apk') {
    const apkUrl = resolveUpdateUrl(updateInfo.apkUrl || updateInfo.packagePath || '');
    if (!apkUrl) {
      throw new Error('未配置 APK 下载地址');
    }
    const filePath = await downloadPackage(apkUrl);
    await installDownloadedPackage(filePath, { force: false });
    return { type: 'apk' };
  }

  if (updateInfo.updateType === 'store' && updateInfo.marketUrl) {
    plus.runtime.openURL(updateInfo.marketUrl);
    return { type: 'store' };
  }

  throw new Error('当前平台未配置可用的更新地址');
  // #endif

  // #ifndef APP-PLUS
  throw new Error('当前平台不支持热更新');
  // #endif
}

export function restartAfterWgt() {
  // #ifdef APP-PLUS
  plus.runtime.restart();
  // #endif
}
