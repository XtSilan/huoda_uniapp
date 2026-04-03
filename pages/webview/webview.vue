<template>
  <web-view :src="url"></web-view>
</template>

<script>
import { canInstallApkOnAndroid, openOrInstallLocalFile, openUnknownAppSourcesSettings } from '../../utils/native-file';

const DOWNLOAD_MATCH_PATTERN = '.*\\.(apk|pdf|doc|docx|xls|xlsx|ppt|pptx|zip|rar|7z|txt|csv)(\\?.*)?$';
const WEBVIEW_DOWNLOAD_DIR = '_doc/webview-downloads/';

export default {
  data() {
    return {
      url: '',
      pendingInstallFile: null,
      downloadBridgeReady: false,
      activeDownloadUrl: ''
    };
  },
  onLoad(options) {
    this.url = decodeURIComponent(options.url || '');
    const title = decodeURIComponent(options.title || '链接详情');
    if (title) {
      uni.setNavigationBarTitle({
        title
      });
    }
  },
  onReady() {
    // #ifdef APP-PLUS
    this.initDownloadBridge();
    // #endif
  },
  async onShow() {
    // #ifdef APP-PLUS
    await this.resumePendingApkInstall();
    // #endif
  },
  methods: {
    initDownloadBridge() {
      if (this.downloadBridgeReady) {
        return;
      }

      setTimeout(() => {
        const pageWebview = this.$scope && this.$scope.$getAppWebview ? this.$scope.$getAppWebview() : null;
        const children = pageWebview && pageWebview.children ? pageWebview.children() : [];
        const childWebview = children && children[0];

        if (!childWebview || !childWebview.overrideUrlLoading) {
          return;
        }

        childWebview.overrideUrlLoading(
          {
            mode: 'reject',
            match: DOWNLOAD_MATCH_PATTERN
          },
          (event) => {
            const downloadUrl = String((event && event.url) || '').trim();
            if (!downloadUrl) {
              return;
            }
            this.confirmWebDownload(downloadUrl);
          }
        );

        this.downloadBridgeReady = true;
      }, 400);
    },
    getDownloadFileName(fileUrl) {
      const cleanUrl = String(fileUrl || '').split('#')[0];
      const path = cleanUrl.split('?')[0];
      const segments = path.split('/').filter(Boolean);
      const rawName = segments.length ? segments[segments.length - 1] : `download-${Date.now()}`;
      try {
        return decodeURIComponent(rawName) || `download-${Date.now()}`;
      } catch (_error) {
        return rawName || `download-${Date.now()}`;
      }
    },
    getDownloadSavePath(fileUrl) {
      const fileName = this.getDownloadFileName(fileUrl);
      const safeName = fileName.replace(/[\\/:*?"<>|]/g, '_');
      return `${WEBVIEW_DOWNLOAD_DIR}${safeName}`;
    },
    confirmWebDownload(downloadUrl) {
      const fileName = this.getDownloadFileName(downloadUrl);
      uni.showModal({
        title: '下载文件',
        content: `是否下载“${fileName}”？`,
        confirmText: '下载',
        cancelText: '取消',
        success: ({ confirm }) => {
          if (!confirm) {
            return;
          }
          this.startWebDownload(downloadUrl, fileName);
        }
      });
    },
    startWebDownload(downloadUrl, fileName) {
      // #ifdef APP-PLUS
      if (this.activeDownloadUrl === downloadUrl) {
        uni.showToast({ title: '文件正在下载中', icon: 'none' });
        return;
      }

      const savePath = this.getDownloadSavePath(downloadUrl);
      this.activeDownloadUrl = downloadUrl;
      uni.showLoading({ title: '下载中...', mask: true });

      const task = plus.downloader.createDownload(
        encodeURI(downloadUrl),
        {
          filename: savePath,
          retry: 1,
          timeout: 0
        },
        (download, status) => {
          uni.hideLoading();
          this.activeDownloadUrl = '';

          if (status !== 200) {
            uni.showToast({ title: '下载失败，请稍后重试', icon: 'none' });
            return;
          }

          const filePath = download.filename || savePath;
          const displayPath = filePath.startsWith('_doc/')
            ? `应用目录/${filePath.replace(/^_doc\//, '')}`
            : filePath;

          uni.showModal({
            title: '下载完成',
            content: `文件已保存到：${displayPath}`,
            confirmText: '打开文件',
            cancelText: '知道了',
            success: async ({ confirm }) => {
              if (!confirm) {
                return;
              }
              await this.openDownloadedFile(filePath, fileName);
            }
          });
        }
      );

      task.start();
      // #endif
    },
    async openDownloadedFile(filePath, fileName) {
      try {
        const result = await openOrInstallLocalFile({ filePath, fileName });
        if (result.status === 'permission_required') {
          this.pendingInstallFile = { filePath, fileName };
          uni.showModal({
            title: '需要安装权限',
            content: '安装 APK 前，需要先在系统设置中允许“安装未知来源应用”。',
            confirmText: '去设置',
            cancelText: '取消',
            success: ({ confirm }) => {
              if (!confirm) {
                return;
              }
              const opened = openUnknownAppSourcesSettings();
              if (!opened) {
                uni.showToast({ title: '打开系统设置失败', icon: 'none' });
              }
            }
          });
          return;
        }

        if (result.status === 'install_started') {
          uni.showToast({ title: '已调起安装界面', icon: 'none' });
        }
      } catch (error) {
        uni.showToast({
          title: (error && error.message) || '打开文件失败',
          icon: 'none'
        });
      }
    },
    async resumePendingApkInstall() {
      if (!this.pendingInstallFile) {
        return;
      }
      if (!canInstallApkOnAndroid()) {
        return;
      }

      const pendingFile = this.pendingInstallFile;
      this.pendingInstallFile = null;
      await this.openDownloadedFile(pendingFile.filePath, pendingFile.fileName);
    }
  }
};
</script>
