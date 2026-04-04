const TOKEN_KEY = 'token';
const USER_INFO_KEY = 'userInfo';
const LOGIN_STATE_KEY = 'isLoggedIn';
const REMEMBER_PASSWORD_KEY = 'rememberPassword';
const CREDENTIALS_KEY = 'savedLoginCredentials';
const SESSION_BACKUP_FILE = '_doc/huoda-session.json';
const DOWNLOAD_CACHE_DIR = '_downloads';

function canUsePlus() {
  return typeof plus !== 'undefined' && plus.io;
}

function writeAppBackup(payload) {
  return new Promise((resolve) => {
    // #ifdef APP-PLUS
    if (!canUsePlus()) {
      resolve();
      return;
    }
    plus.io.requestFileSystem(
      plus.io.PRIVATE_DOC,
      (fs) => {
        fs.root.getFile(
          'huoda-session.json',
          { create: true },
          (fileEntry) => {
            fileEntry.createWriter(
              (writer) => {
                writer.onwriteend = () => resolve();
                writer.onerror = () => resolve();
                writer.write(JSON.stringify(payload || {}));
              },
              () => resolve()
            );
          },
          () => resolve()
        );
      },
      () => resolve()
    );
    // #endif

    // #ifndef APP-PLUS
    resolve();
    // #endif
  });
}

function readAppBackup() {
  return new Promise((resolve) => {
    // #ifdef APP-PLUS
    if (!canUsePlus()) {
      resolve(null);
      return;
    }
    plus.io.resolveLocalFileSystemURL(
      SESSION_BACKUP_FILE,
      (entry) => {
        entry.file(
          (file) => {
            const reader = new plus.io.FileReader();
            reader.onloadend = (event) => {
              try {
                resolve(JSON.parse((event && event.target && event.target.result) || '{}'));
              } catch (error) {
                resolve(null);
              }
            };
            reader.onerror = () => resolve(null);
            reader.readAsText(file, 'utf-8');
          },
          () => resolve(null)
        );
      },
      () => resolve(null)
    );
    // #endif

    // #ifndef APP-PLUS
    resolve(null);
    // #endif
  });
}

function removeAppBackup() {
  return new Promise((resolve) => {
    // #ifdef APP-PLUS
    if (!canUsePlus()) {
      resolve();
      return;
    }
    plus.io.resolveLocalFileSystemURL(
      SESSION_BACKUP_FILE,
      (entry) => {
        entry.remove(() => resolve(), () => resolve());
      },
      () => resolve()
    );
    // #endif

    // #ifndef APP-PLUS
    resolve();
    // #endif
  });
}

function removeLocalEntry(targetPath) {
  return new Promise((resolve) => {
    // #ifdef APP-PLUS
    if (!canUsePlus() || !targetPath) {
      resolve();
      return;
    }
    plus.io.resolveLocalFileSystemURL(
      targetPath,
      (entry) => {
        const done = () => resolve();
        if (entry.isDirectory) {
          entry.removeRecursively(done, done);
          return;
        }
        entry.remove(done, done);
      },
      () => resolve()
    );
    // #endif

    // #ifndef APP-PLUS
    resolve();
    // #endif
  });
}

export function getToken() {
  return uni.getStorageSync(TOKEN_KEY) || '';
}

export function getUserInfo() {
  return uni.getStorageSync(USER_INFO_KEY) || null;
}

export async function saveSession(token, userInfo) {
  const safeToken = token || '';
  const safeUser = userInfo || {};
  uni.setStorageSync(TOKEN_KEY, safeToken);
  uni.setStorageSync(USER_INFO_KEY, safeUser);
  uni.setStorageSync(LOGIN_STATE_KEY, Boolean(safeToken));
  await writeAppBackup({ token: safeToken, userInfo: safeUser, savedAt: Date.now() });
}

export async function restoreSessionFromBackup() {
  const token = getToken();
  const userInfo = getUserInfo();
  if (token) {
    return { token, userInfo };
  }
  const backup = await readAppBackup();
  if (backup && backup.token) {
    uni.setStorageSync(TOKEN_KEY, backup.token);
    uni.setStorageSync(USER_INFO_KEY, backup.userInfo || {});
    uni.setStorageSync(LOGIN_STATE_KEY, true);
    return {
      token: backup.token,
      userInfo: backup.userInfo || {}
    };
  }
  return { token: '', userInfo: null };
}

export async function clearSession() {
  uni.removeStorageSync(TOKEN_KEY);
  uni.removeStorageSync(USER_INFO_KEY);
  uni.removeStorageSync(LOGIN_STATE_KEY);
  await removeAppBackup();
}

export async function clearLocalCache() {
  try {
    uni.clearStorageSync();
  } catch (_error) {}
  await removeAppBackup();
  await removeLocalEntry(DOWNLOAD_CACHE_DIR);
}

export function getRememberPassword() {
  return Boolean(uni.getStorageSync(REMEMBER_PASSWORD_KEY));
}

export function getSavedCredentials() {
  return uni.getStorageSync(CREDENTIALS_KEY) || { studentId: '', password: '' };
}

export function getAutoLoginCredentials() {
  if (!getRememberPassword()) {
    return null;
  }
  const credentials = getSavedCredentials();
  if (!credentials.studentId || !credentials.password) {
    return null;
  }
  return credentials;
}

export function saveRememberPassword(enabled, credentials = {}) {
  uni.setStorageSync(REMEMBER_PASSWORD_KEY, Boolean(enabled));
  if (enabled) {
    uni.setStorageSync(CREDENTIALS_KEY, {
      studentId: credentials.studentId || '',
      password: credentials.password || ''
    });
    return;
  }
  uni.removeStorageSync(CREDENTIALS_KEY);
}

export function redirectToLogin() {
  const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : [];
  const current = pages.length ? pages[pages.length - 1].route : '';
  if (current === 'pages/login/login') {
    return;
  }
  uni.reLaunch({ url: '/pages/login/login' });
}
