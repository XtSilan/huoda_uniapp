export function isApkFile(filePath = '', fileName = '') {
  const source = `${filePath || ''} ${fileName || ''}`;
  return /\.apk(?:$|[?#\s])/i.test(source);
}

export function canInstallApkOnAndroid() {
  // #ifdef APP-PLUS
  try {
    const systemInfo = uni.getSystemInfoSync();
    const platform = String(systemInfo.platform || systemInfo.osName || '').toLowerCase();
    if (!platform.includes('android')) {
      return true;
    }

    const main = plus.android.runtimeMainActivity();
    const Build = plus.android.importClass('android.os.Build');
    if (Number(Build.VERSION.SDK_INT) < 26) {
      return true;
    }

    const packageManager = main.getPackageManager();
    plus.android.importClass(packageManager);
    return Boolean(packageManager.canRequestPackageInstalls());
  } catch (_error) {
    return false;
  }
  // #endif

  // #ifndef APP-PLUS
  return false;
  // #endif
}

export function openUnknownAppSourcesSettings() {
  // #ifdef APP-PLUS
  try {
    const main = plus.android.runtimeMainActivity();
    const Intent = plus.android.importClass('android.content.Intent');
    const Settings = plus.android.importClass('android.provider.Settings');
    const Uri = plus.android.importClass('android.net.Uri');
    const intent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES);
    intent.setData(Uri.parse(`package:${main.getPackageName()}`));
    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
    main.startActivity(intent);
    return true;
  } catch (_error) {
    return false;
  }
  // #endif

  // #ifndef APP-PLUS
  return false;
  // #endif
}

export function installApkFile(filePath) {
  return new Promise((resolve, reject) => {
    // #ifdef APP-PLUS
    plus.runtime.install(
      filePath,
      { force: false },
      () => resolve(),
      (error) => reject(new Error((error && error.message) || '安装 APK 失败'))
    );
    // #endif

    // #ifndef APP-PLUS
    reject(new Error('当前平台不支持安装 APK'));
    // #endif
  });
}

export function openDocumentFile(filePath) {
  return new Promise((resolve, reject) => {
    uni.openDocument({
      filePath,
      showMenu: true,
      success: () => resolve(),
      fail: (error) => reject(error || new Error('打开文件失败'))
    });
  });
}

export async function openOrInstallLocalFile({ filePath = '', fileName = '' } = {}) {
  if (!filePath) {
    throw new Error('文件路径不能为空');
  }

  if (isApkFile(filePath, fileName)) {
    const allowed = canInstallApkOnAndroid();
    if (!allowed) {
      return { status: 'permission_required' };
    }
    await installApkFile(filePath);
    return { status: 'install_started' };
  }

  await openDocumentFile(filePath);
  return { status: 'opened' };
}
