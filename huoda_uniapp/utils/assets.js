import { SERVER_ORIGIN } from '../config/api';

const USER_AVATAR_CACHE_KEY = 'userAvatarCache';

export function resolveAssetUrl(value) {
  const normalized = String(value || '').trim();
  if (!normalized) {
    return '';
  }
  if (/^https?:\/\//i.test(normalized)) {
    return normalized;
  }
  if (!SERVER_ORIGIN) {
    return normalized;
  }
  return `${SERVER_ORIGIN}/api/assets/object?path=${encodeURIComponent(normalized)}`;
}

function getAvatarCacheRecord() {
  return uni.getStorageSync(USER_AVATAR_CACHE_KEY) || {};
}

export function getCachedAvatarPath(value) {
  const remoteUrl = resolveAssetUrl(value);
  if (!remoteUrl) {
    return '';
  }
  const record = getAvatarCacheRecord();
  if (record.remoteUrl === remoteUrl && record.localPath) {
    return record.localPath;
  }
  return '';
}

export function setCachedAvatarPath(value, localPath) {
  const remoteUrl = resolveAssetUrl(value);
  if (!remoteUrl || !localPath) {
    return;
  }
  uni.setStorageSync(USER_AVATAR_CACHE_KEY, {
    remoteUrl,
    localPath
  });
}

export function clearCachedAvatarPath() {
  uni.removeStorageSync(USER_AVATAR_CACHE_KEY);
}

export function cacheAvatarFromRemote(value) {
  const remoteUrl = resolveAssetUrl(value);
  if (!remoteUrl) {
    clearCachedAvatarPath();
    return Promise.resolve('');
  }

  const cachedPath = getCachedAvatarPath(value);
  if (cachedPath) {
    return Promise.resolve(cachedPath);
  }

  return new Promise((resolve, reject) => {
    uni.downloadFile({
      url: remoteUrl,
      success: (downloadRes) => {
        if (downloadRes.statusCode < 200 || downloadRes.statusCode >= 300 || !downloadRes.tempFilePath) {
          reject(new Error('下载头像失败'));
          return;
        }

        if (typeof uni.saveFile !== 'function') {
          setCachedAvatarPath(value, downloadRes.tempFilePath);
          resolve(downloadRes.tempFilePath);
          return;
        }

        uni.saveFile({
          tempFilePath: downloadRes.tempFilePath,
          success: (saveRes) => {
            const savedPath = saveRes.savedFilePath || downloadRes.tempFilePath;
            setCachedAvatarPath(value, savedPath);
            resolve(savedPath);
          },
          fail: () => {
            setCachedAvatarPath(value, downloadRes.tempFilePath);
            resolve(downloadRes.tempFilePath);
          }
        });
      },
      fail: () => reject(new Error('下载头像失败'))
    });
  });
}

export default {
  resolveAssetUrl,
  getCachedAvatarPath,
  setCachedAvatarPath,
  clearCachedAvatarPath,
  cacheAvatarFromRemote
};
