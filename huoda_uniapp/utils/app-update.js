import request, { toQueryString } from './request';
import API from '../config/api';

const RELEASE_APPLIED_PREFIX = 'huoda_app_update_applied_';
const RELEASE_DISMISSED_PREFIX = 'huoda_app_update_dismissed_';

let updatePrompting = false;

function compareVersion(a = '0.0.0', b = '0.0.0') {
  const aParts = String(a)
    .split('.')
    .map((item) => Number(item) || 0);
  const bParts = String(b)
    .split('.')
    .map((item) => Number(item) || 0);
  const maxLength = Math.max(aParts.length, bParts.length);
  for (let i = 0; i < maxLength; i += 1) {
    const left = aParts[i] || 0;
    const right = bParts[i] || 0;
    if (left > right) return 1;
    if (left < right) return -1;
  }
  return 0;
}

function getReleaseStorageKey(prefix, platform) {
  return `${prefix}${platform || 'unknown'}`;
}

function getStoredReleaseId(prefix, platform) {
  try {
    return String(uni.getStorageSync(getReleaseStorageKey(prefix, platform)) || '');
  } catch (_error) {
    return '';
  }
}

function setStoredReleaseId(prefix, platform, releaseId) {
  if (!platform) {
    return;
  }
  try {
    uni.setStorageSync(getReleaseStorageKey(prefix, platform), String(releaseId || ''));
  } catch (_error) {}
}

function getAppliedReleaseId(platform) {
  return getStoredReleaseId(RELEASE_APPLIED_PREFIX, platform);
}

function markReleaseApplied(platform, releaseId) {
  setStoredReleaseId(RELEASE_APPLIED_PREFIX, platform, releaseId);
  if (releaseId) {
    clearDismissedRelease(platform, releaseId);
  }
}

function getDismissedReleaseId(platform) {
  return getStoredReleaseId(RELEASE_DISMISSED_PREFIX, platform);
}

function markReleaseDismissed(platform, releaseId) {
  setStoredReleaseId(RELEASE_DISMISSED_PREFIX, platform, releaseId);
}

function clearDismissedRelease(platform, releaseId) {
  if (!platform) {
    return;
  }
  if (!releaseId || getDismissedReleaseId(platform) === releaseId) {
    setStoredReleaseId(RELEASE_DISMISSED_PREFIX, platform, '');
  }
}

function isWgtReleaseUpdate(updateInfo, runtimeInfo) {
  const releaseId = String(updateInfo.releaseId || updateInfo.publishedAt || '').trim();
  if (!releaseId || updateInfo.updateType !== 'wgt') {
    return false;
  }
  return releaseId !== getAppliedReleaseId(runtimeInfo.platform);
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

function getPathFileExtension(value = '', fallback = '.bin') {
  const normalized = String(value || '').trim();
  if (!normalized) {
    return fallback;
  }
  const clean = normalized.split('?')[0].split('#')[0];
  const match = clean.match(/(\.[a-zA-Z0-9]{1,12})$/);
  return match ? match[1].toLowerCase() : fallback;
}

function getUpdateFileExtension(url = '', fileName = '', updateType = '') {
  const nameExtension = getPathFileExtension(fileName, '');
  if (nameExtension) {
    return nameExtension;
  }

  const normalizedType = String(updateType || '').trim().toLowerCase();
  if (normalizedType === 'wgt' || normalizedType === 'apk') {
    return `.${normalizedType}`;
  }

  return getPathFileExtension(url, '.bin');
}

function buildAppUpdateDownloadPath(options = {}) {
  const extension = getUpdateFileExtension(options.url, options.fileName, options.updateType);
  return `_doc/updates/huoda-update-${Date.now()}${extension}`;
}

function showUpdateModal(options) {
  return new Promise((resolve) => {
    uni.showModal({
      ...options,
      success: resolve,
      fail: () => resolve({ confirm: false, cancel: true })
    });
  });
}

function buildDownloadProgressText(progress = {}) {
  const percent = Math.max(0, Math.min(100, Number(progress.progress || 0) || 0));
  return `下载更新 ${percent}%`;
}

function createProgressIndicator(initialTitle = '下载更新中...') {
  let currentTitle = String(initialTitle || '下载更新中...');
  let waitingView = null;
  let loadingVisible = false;

  function showLoading(title) {
    currentTitle = String(title || currentTitle || '下载更新中...');
    uni.showLoading({
      title: currentTitle,
      mask: true
    });
    loadingVisible = true;
  }

  return {
    show(title) {
      currentTitle = String(title || currentTitle || '下载更新中...');
      // #ifdef APP-PLUS
      try {
        if (plus.nativeUI && typeof plus.nativeUI.showWaiting === 'function') {
          waitingView = plus.nativeUI.showWaiting(currentTitle, {
            modal: true,
            padlock: true
          });
          return;
        }
      } catch (_error) {}
      // #endif
      showLoading(currentTitle);
    },
    update(title) {
      currentTitle = String(title || currentTitle || '下载更新中...');
      // #ifdef APP-PLUS
      if (waitingView) {
        if (typeof waitingView.setTitle === 'function') {
          waitingView.setTitle(currentTitle);
          return;
        }
        if (typeof waitingView.setText === 'function') {
          waitingView.setText(currentTitle);
          return;
        }
      }
      // #endif
      showLoading(currentTitle);
    },
    close() {
      // #ifdef APP-PLUS
      if (waitingView) {
        try {
          waitingView.close();
        } catch (_error) {}
        waitingView = null;
      }
      // #endif
      if (loadingVisible) {
        uni.hideLoading();
        loadingVisible = false;
      }
    }
  };
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
  const hasReleaseUpdate = isWgtReleaseUpdate({ ...updateInfo, releaseId }, runtimeInfo);
  const hasVersionUpdate =
    compareVersion(latestVersion, runtimeInfo.versionName) > 0 || latestVersionCode > Number(runtimeInfo.versionCode || 0);
  const hasUpdate = Boolean(updateInfo.hasUpdate || hasVersionUpdate || hasReleaseUpdate);
  const isDismissed = Boolean(!updateInfo.force && releaseId && getDismissedReleaseId(runtimeInfo.platform) === releaseId);

  return {
    runtimeInfo,
    updateInfo: {
      ...updateInfo,
      releaseId,
      hasReleaseUpdate,
      hasVersionUpdate,
      hasUpdate,
      isDismissed
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

function downloadPackage(url, options = {}) {
  return new Promise((resolve, reject) => {
    const progressIndicator = createProgressIndicator('准备下载更新...');
    let downloadTask = null;
    let lastProgressText = '';

    progressIndicator.show('准备下载更新...');
    // #ifdef APP-PLUS
    try {
      downloadTask = plus.downloader.createDownload(
        url,
        {
          filename: buildAppUpdateDownloadPath({
            url,
            fileName: options.fileName,
            updateType: options.updateType
          }),
          retry: 1,
          timeout: 0
        },
        (download, status) => {
          progressIndicator.close();
          if (status !== 200 || !(download && download.filename)) {
            reject(new Error(`涓嬭浇鏇存柊澶辫触 (${status || 0})`));
            return;
          }
          resolve(download.filename);
        }
      );

      if (downloadTask && typeof downloadTask.addEventListener === 'function') {
        downloadTask.addEventListener('statechanged', (download) => {
          const totalBytes = Number(download && download.totalSize) || 0;
          const writtenBytes = Number(download && download.downloadedSize) || 0;
          const nextText = buildDownloadProgressText({
            progress: totalBytes > 0 ? Math.min(100, Math.round((writtenBytes / totalBytes) * 100)) : 0,
            totalBytesWritten: writtenBytes,
            totalBytesExpectedToWrite: totalBytes
          });
          if (!nextText || nextText === lastProgressText) {
            return;
          }
          lastProgressText = nextText;
          progressIndicator.update(nextText);
        });
      }

      downloadTask.start();
      return;
    } catch (_error) {}
    // #endif

    downloadTask = uni.downloadFile({
      url,
      success: (res) => {
        progressIndicator.close();
        if (res.statusCode !== 200 || !res.tempFilePath) {
          reject(new Error('下载更新失败'));
          return;
        }
        resolve(res.tempFilePath);
      },
      fail: () => {
        progressIndicator.close();
        reject(new Error('下载更新失败'));
      }
    });

    if (downloadTask && typeof downloadTask.onProgressUpdate === 'function') {
      downloadTask.onProgressUpdate((progress) => {
        const nextText = buildDownloadProgressText(progress);
        if (!nextText || nextText === lastProgressText) {
          return;
        }
        lastProgressText = nextText;
        progressIndicator.update(nextText);
      });
      return;
    }

    progressIndicator.update('下载更新中...');
  });
}

export async function applyUpdate(updateInfo) {
  // #ifdef APP-PLUS
  const runtimeInfo = await getRuntimeInfo();
  const releaseId = String(updateInfo.releaseId || updateInfo.publishedAt || '').trim();

  if (updateInfo.updateType === 'wgt') {
    const wgtUrl = resolveUpdateUrl(updateInfo.wgtUrl || updateInfo.packagePath || '');
    if (!wgtUrl) {
      throw new Error('WGT 更新地址未配置');
    }
    const filePath = await downloadPackage(wgtUrl, {
      fileName: updateInfo.packageName,
      updateType: 'wgt'
    });
    await installDownloadedPackage(filePath, { force: true });
    markReleaseApplied(runtimeInfo.platform, releaseId);
    return { type: 'wgt' };
  }

  if (updateInfo.updateType === 'apk') {
    const apkUrl = resolveUpdateUrl(updateInfo.apkUrl || updateInfo.packagePath || '');
    if (!apkUrl) {
      throw new Error('APK 下载地址未配置');
    }
    const filePath = await downloadPackage(apkUrl, {
      fileName: updateInfo.packageName,
      updateType: 'apk'
    });
    await installDownloadedPackage(filePath, { force: false });
    clearDismissedRelease(runtimeInfo.platform, releaseId);
    return { type: 'apk' };
  }

  if (updateInfo.updateType === 'store' && updateInfo.marketUrl) {
    plus.runtime.openURL(updateInfo.marketUrl);
    clearDismissedRelease(runtimeInfo.platform, releaseId);
    return { type: 'store' };
  }

  throw new Error('当前平台未配置可用的更新地址');
  // #endif

  // #ifndef APP-PLUS
  throw new Error('当前平台不支持热更新');
  // #endif
}

export async function promptForAppUpdate(options = {}) {
  // #ifndef APP-PLUS
  return { shown: false, reason: 'unsupported' };
  // #endif

  // #ifdef APP-PLUS
  const { manual = false } = options;
  if (updatePrompting) {
    return { shown: false, reason: 'busy' };
  }

  updatePrompting = true;
  try {
    const { runtimeInfo, updateInfo } = await checkForUpdates();

    if (!updateInfo.hasUpdate || updateInfo.updateType === 'none') {
      return { shown: false, reason: 'up-to-date', runtimeInfo, updateInfo };
    }

    if (!manual && updateInfo.isDismissed && !updateInfo.force) {
      return { shown: false, reason: 'dismissed', runtimeInfo, updateInfo };
    }

    const modalResult = await showUpdateModal({
      title: updateInfo.title || '发现新版本',
      content: `${updateInfo.description || '检测到可用更新'}\n\n当前版本：${runtimeInfo.versionName || '-'}\n最新版本：${updateInfo.latestVersion || '-'}`,
      showCancel: !updateInfo.force,
      confirmText: '立即更新',
      cancelText: '取消'
    });

    if (!modalResult.confirm) {
      if (!updateInfo.force && updateInfo.releaseId) {
        markReleaseDismissed(runtimeInfo.platform, updateInfo.releaseId);
      }
      return { shown: true, confirmed: false, runtimeInfo, updateInfo };
    }

    const result = await applyUpdate(updateInfo);
    if (result.type === 'wgt') {
      await showUpdateModal({
        title: '更新完成',
        content: '热更新包已安装完成，应用即将重启。',
        showCancel: false,
        confirmText: '立即重启'
      });
      restartAfterWgt();
      return { shown: true, confirmed: true, runtimeInfo, updateInfo, result };
    }

    uni.showToast({ title: '安装包已开始处理', icon: 'none' });
    return { shown: true, confirmed: true, runtimeInfo, updateInfo, result };
  } finally {
    updatePrompting = false;
  }
  // #endif
}

export function restartAfterWgt() {
  // #ifdef APP-PLUS
  plus.runtime.restart();
  // #endif
}
