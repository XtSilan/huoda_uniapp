<template>
  <view class="page-shell info-page">
    <view class="page-header">
      <page-nav v-if="detailMode || searchMode" fallback="/pages/index/index" :is-tab="true" />
      <view class="page-eyebrow">{{ detailMode ? '资讯详情' : '信息中心' }}</view>
      <view class="page-title">{{ detailMode ? '深度阅读' : '发现更多校园内容' }}</view>
      <view class="page-subtitle">{{ detailMode ? '查看完整内容与附件资料' : '搜索资讯、活动与校园动态' }}</view>
    </view>

    <view class="search-box surface-card">
      <text class="search-icon">🔍</text>
      <input class="search-input" placeholder="搜索资讯、活动" v-model="searchText" @confirm="onSearch" />
      <view class="search-action" @click="onSearch">搜索</view>
    </view>

    <view v-if="detailMode" class="detail-card surface-card">
      <view class="detail-topline">
        <view class="tag-group">
          <tag-badge v-if="detail.isTop" text="置顶" tone="yellow" />
          <tag-badge :text="detail.source || '校园发布'" tone="blue" />
        </view>
        <view class="metric-pill">
          <view class="metric-pill__icon">
            <svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16">
              <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Zm0 2.445L6.615 5.5a.75.75 0 0 1-.564.41l-3.097.45 2.24 2.184a.75.75 0 0 1 .216.664l-.528 3.084 2.769-1.456a.75.75 0 0 1 .698 0l2.77 1.456-.53-3.084a.75.75 0 0 1 .216-.664l2.24-2.183-3.096-.45a.75.75 0 0 1-.564-.41L8 2.694Z"></path>
            </svg>
          </view>
          <text>{{ detail.favoriteCount || 0 }} 收藏</text>
        </view>
      </view>
      <view class="detail-title">{{ detail.title }}</view>
      <view v-if="detail.sourceUrl || isUrl(detail.source)" class="detail-source-link" @click="openSourceLink">
        来源链接：{{ detail.source || normalizedSourceUrl }}
      </view>
      <view class="detail-content">{{ detail.content }}</view>
      <view v-if="detail.attachments && detail.attachments.length" class="detail-attachments">
        <view class="detail-attachments__title">附件资料</view>
        <view
          v-for="(item, index) in detail.attachments"
          :key="index"
          class="detail-attachment"
          @click="openAttachment(item)"
        >
          <text class="detail-attachment__name">{{ item.name }}</text>
          <text class="detail-attachment__action">打开</text>
        </view>
        <view v-if="attachmentDownload.visible" class="attachment-download-panel">
          <view class="attachment-download-panel__header">
            <text class="attachment-download-panel__title">{{ attachmentDownload.name }}</text>
            <text class="attachment-download-panel__meta">{{ attachmentDownloadStatusText }}</text>
          </view>
          <view class="attachment-download-panel__progress">
            <view class="attachment-download-panel__bar">
              <view class="attachment-download-panel__bar-value" :style="{ width: `${attachmentDownload.progress || 0}%` }"></view>
            </view>
            <text class="attachment-download-panel__percent">{{ attachmentDownload.progress || 0 }}%</text>
          </view>
          <view class="attachment-download-panel__info">
            {{ formatDownloadProgress(attachmentDownload.receivedSize, attachmentDownload.totalSize) }}
          </view>
          <view class="attachment-download-panel__actions">
            <view v-if="attachmentDownload.status === 'downloading'" class="attachment-download-panel__btn" @click.stop="pauseAttachmentDownload">暂停</view>
            <view v-if="attachmentDownload.status === 'paused'" class="attachment-download-panel__btn" @click.stop="resumeAttachmentDownload">继续</view>
            <view v-if="attachmentDownload.status === 'completed'" class="attachment-download-panel__btn attachment-download-panel__btn--primary" @click.stop="openDownloadedAttachment">打开附件</view>
            <view v-if="attachmentDownload.status === 'failed'" class="attachment-download-panel__btn attachment-download-panel__btn--primary" @click.stop="retryAttachmentDownload">重新下载</view>
            <view class="attachment-download-panel__btn attachment-download-panel__btn--ghost" @click.stop="cancelAttachmentDownload">
              {{ attachmentDownload.status === 'completed' ? '关闭' : '取消' }}
            </view>
          </view>
        </view>
      </view>
      <view class="detail-action">
        <custom-button :text="collectionButtonText" @click="toggleCollection" />
      </view>
    </view>

    <view v-else-if="searchMode" class="result-layout">
      <view class="surface-card result-card">
        <view class="section-row">
          <text class="section-heading">资讯结果</text>
        </view>
        <view v-if="searchInfos.length === 0" class="empty-state">暂无匹配资讯</view>
        <view v-for="item in searchInfos" :key="item.id" class="content-card" @click="goToDetail(item.id)">
          <view class="content-card__top">
            <view class="tag-title-row">
              <tag-badge v-if="item.isTop" text="置顶" tone="yellow" />
              <view class="content-card__title">{{ item.title }}</view>
            </view>
            <view class="metric-pill">
              <view class="metric-pill__icon">
                <svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16">
                  <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Zm0 2.445L6.615 5.5a.75.75 0 0 1-.564.41l-3.097.45 2.24 2.184a.75.75 0 0 1 .216.664l-.528 3.084 2.769-1.456a.75.75 0 0 1 .698 0l2.77 1.456-.53-3.084a.75.75 0 0 1 .216-.664l2.24-2.183-3.096-.45a.75.75 0 0 1-.564-.41L8 2.694Z"></path>
                </svg>
              </view>
              <text>{{ item.favoriteCount || 0 }} 收藏</text>
            </view>
          </view>
          <view class="content-card__desc">{{ item.summary || item.content }}</view>
          <view class="content-card__meta">{{ item.source || '校园发布' }} · {{ item.locationType || '资讯' }}</view>
        </view>
      </view>

      <view class="surface-card result-card">
        <view class="section-row">
          <text class="section-heading">活动结果</text>
        </view>
        <view v-if="searchActivities.length === 0" class="empty-state">暂无匹配活动</view>
        <view v-for="item in searchActivities" :key="item.id" class="content-card" @click="goToActivity(item.id)">
          <view class="content-card__top">
            <view class="tag-title-row">
              <tag-badge v-if="item.isTop" text="置顶" tone="yellow" />
              <view class="content-card__title">{{ item.title }}</view>
            </view>
            <view class="metric-pill">
              <view class="metric-pill__icon">
                <svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16">
                  <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Zm0 2.445L6.615 5.5a.75.75 0 0 1-.564.41l-3.097.45 2.24 2.184a.75.75 0 0 1 .216.664l-.528 3.084 2.769-1.456a.75.75 0 0 1 .698 0l2.77 1.456-.53-3.084a.75.75 0 0 1 .216-.664l2.24-2.183-3.096-.45a.75.75 0 0 1-.564-.41L8 2.694Z"></path>
                </svg>
              </view>
              <text>{{ item.applyCount || 0 }} 参与</text>
            </view>
          </view>
          <view class="content-card__desc">{{ item.summary || item.content }}</view>
          <view class="content-card__meta">{{ item.organizer || '校园组织' }} · {{ item.location || '地点待定' }}</view>
        </view>
      </view>
    </view>

    <view v-else class="browse-layout">
      <view class="location-tabs surface-card">
        <view
          v-for="item in locationTabs"
          :key="item"
          class="location-tab"
          :class="{ active: activeLocation === item }"
          @click="switchLocation(item)"
        >
          {{ item }}
        </view>
      </view>

      <view class="info-panel">
        <scroll-view class="category-list surface-card" scroll-y>
          <view
            v-for="item in categories"
            :key="item.name"
            class="category-item"
            :class="{ active: activeCategory === item.name }"
            @click="activeCategory = item.name"
          >
            <text>{{ item.name }}</text>
            <text class="count">{{ item.count }}</text>
          </view>
        </scroll-view>

        <scroll-view class="content-list" scroll-y>
          <view v-if="filteredInfos.length === 0" class="surface-card empty-state">没有更多内容</view>
          <view v-for="item in filteredInfos" :key="item.id" class="content-feed-card surface-card" @click="goToDetail(item.id)">
            <view class="content-feed-card__tags">
              <view class="tag-group">
                <tag-badge v-if="item.isTop" text="置顶" tone="yellow" />
                <tag-badge :text="item.category || '其他'" tone="purple" />
              </view>
              <view class="metric-pill">
                <view class="metric-pill__icon">
                  <svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16">
                    <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Zm0 2.445L6.615 5.5a.75.75 0 0 1-.564.41l-3.097.45 2.24 2.184a.75.75 0 0 1 .216.664l-.528 3.084 2.769-1.456a.75.75 0 0 1 .698 0l2.77 1.456-.53-3.084a.75.75 0 0 1 .216-.664l2.24-2.183-3.096-.45a.75.75 0 0 1-.564-.41L8 2.694Z"></path>
                  </svg>
                </view>
                <text>{{ item.favoriteCount || 0 }} 收藏</text>
              </view>
            </view>
            <view class="content-card__title">{{ item.title }}</view>
            <view class="content-card__desc">{{ item.summary || item.content }}</view>
            <view class="content-card__meta">{{ item.source || '校园发布' }}</view>
          </view>
        </scroll-view>
      </view>
    </view>
    <announcement-popup ref="announcementPopup" />
    <app-tabbar v-if="!detailMode" current="info" />
  </view>
</template>

<script>
import { SERVER_ORIGIN } from '../../config/api';
import { canInstallApkOnAndroid, openOrInstallLocalFile, openUnknownAppSourcesSettings, scanFileToMediaLibrary } from '../../utils/native-file';

const ATTACHMENT_DOWNLOAD_DIR = '_downloads/';

function toLocalFileSystemUrl(filePath = '') {
  if (!filePath) {
    return '';
  }
  if (/^(file|content):\/\//i.test(filePath)) {
    return filePath;
  }
  return filePath.startsWith('/') ? `file://${filePath}` : filePath;
}

function createEmptyAttachmentDownloadState() {
  return {
    visible: false,
    key: '',
    name: '',
    url: '',
    progress: 0,
    status: 'idle',
    receivedSize: 0,
    totalSize: 0,
    filePath: '',
    item: null
  };
}

const DEFAULT_CATEGORIES = ['全部', '讲座', '公益', '兼职', '就业', '娱乐', '竞赛', '美食', '其他'];

export default {
  data() {
    return {
      searchText: '',
      detailMode: false,
      searchMode: false,
      detail: {},
      locationTabs: ['校内', '校外'],
      activeLocation: '校内',
      activeCategory: '全部',
      infoList: [],
      searchInfos: [],
      searchActivities: [],
      attachmentDownload: createEmptyAttachmentDownloadState(),
      pendingInstallFile: null
    };
  },
  computed: {
    collectionButtonText() {
      return this.detail.isCollected ? '已收藏' : '收藏资讯';
    },
    normalizedSourceUrl() {
      return this.normalizeUrl(this.detail.sourceUrl || (this.isUrl(this.detail.source) ? this.detail.source : ''));
    },
    categories() {
      return DEFAULT_CATEGORIES.map((name) => ({
        name,
        count: name === '全部' ? this.infoList.length : this.infoList.filter((item) => item.category === name).length
      }));
    },
    filteredInfos() {
      if (this.activeCategory === '全部') {
        return this.infoList;
      }
      return this.infoList.filter((item) => item.category === this.activeCategory);
    },
    attachmentDownloadStatusText() {
      const status = this.attachmentDownload.status;
      if (status === 'downloading') return '下载中';
      if (status === 'paused') return '已暂停';
      if (status === 'completed') return '下载完成';
      if (status === 'failed') return '下载失败';
      return '准备下载';
    }
  },
  onLoad(options) {
    if (options.id) {
      this.detailMode = true;
      this.loadDetail(options.id);
      return;
    }
    if (options.search) {
      this.searchText = decodeURIComponent(options.search);
      this.searchMode = Boolean(this.searchText);
    }
    this.loadInfos();
  },
  async onShow() {
    await this.resumePendingAttachmentInstall();

    if (this.detailMode) {
      this.$nextTick(() => {
        if (this.$refs.announcementPopup) {
          this.$refs.announcementPopup.checkAndOpen();
        }
      });
      return;
    }
    const pendingSearch = uni.getStorageSync('pendingInfoSearch');
    if (pendingSearch !== '' && pendingSearch !== undefined) {
      this.searchText = pendingSearch;
      this.searchMode = Boolean(pendingSearch);
      uni.removeStorageSync('pendingInfoSearch');
    }
    this.loadInfos();
    this.$nextTick(() => {
      if (this.$refs.announcementPopup) {
        this.$refs.announcementPopup.checkAndOpen();
      }
    });
  },
  methods: {
    async loadInfos() {
      try {
        if (this.searchMode && this.searchText) {
          const res = await this.$api.info.searchInfo({ search: this.searchText });
          this.searchInfos = res.infos || [];
          this.searchActivities = res.activities || [];
          return;
        }
        const res = await this.$api.info.getInfoList({ locationType: this.activeLocation, pageSize: 100 });
        this.infoList = res.list || [];
        if (!this.categories.find((item) => item.name === this.activeCategory && item.count > 0)) {
          const firstAvailable = this.categories.find((item) => item.count > 0);
          this.activeCategory = firstAvailable ? firstAvailable.name : '全部';
        }
      } catch (error) {
        uni.showToast({ title: error.message || '获取信息失败', icon: 'none' });
      }
    },
    async loadDetail(id) {
      try {
        this.detail = await this.$api.info.getInfoDetail(id);
        await this.$api.user.recordHistory({
          targetType: 'info',
          targetId: id,
          title: this.detail.title,
          summary: this.detail.summary || this.detail.content
        });
      } catch (error) {
        uni.showToast({ title: error.message || '获取详情失败', icon: 'none' });
      }
    },
    onSearch() {
      this.detailMode = false;
      this.searchMode = Boolean(this.searchText);
      this.loadInfos();
    },
    switchLocation(location) {
      this.searchMode = false;
      this.activeLocation = location;
      this.loadInfos();
    },
    goToDetail(id) {
      uni.navigateTo({ url: `/pages/info/info?id=${id}` });
    },
    goToActivity(id) {
      uni.navigateTo({ url: `/pages/feature/publish/detail?id=${id}` });
    },
    isUrl(value) {
      return /^(https?:\/\/|www\.)/i.test(String(value || '').trim());
    },
    normalizeUrl(value) {
      const text = String(value || '').trim();
      if (!text) {
        return '';
      }
      if (/^https?:\/\//i.test(text) || /^\/pages\//.test(text)) {
        return text;
      }
      if (/^www\./i.test(text)) {
        return `https://${text}`;
      }
      return '';
    },
    resolveAssetUrl(filePath) {
      if (!filePath) {
        return '';
      }
      return filePath.startsWith('http') ? filePath : `${SERVER_ORIGIN}${filePath}`;
    },
    getAttachmentKey(item) {
      return String((item && (item.path || item.name)) || '').trim();
    },
    getAttachmentExtension(item) {
      const source = String((item && (item.name || item.path)) || '').trim();
      const match = source.match(/(\.[a-zA-Z0-9]{1,12})(?:$|[?#])/);
      return match ? match[1].toLowerCase() : '';
    },
    getAttachmentDownloadPath(item) {
      const key = this.getAttachmentKey(item);
      const ext = this.getAttachmentExtension(item);
      const safeKey = encodeURIComponent(key).replace(/%/g, '');
      return `${this.getAttachmentDownloadDirectory()}${safeKey || 'attachment'}${ext}`;
    },
    getAttachmentDownloadDirectory() {
      // #ifdef APP-PLUS
      try {
        const systemInfo = uni.getSystemInfoSync();
        const platform = String(systemInfo.platform || systemInfo.osName || '').toLowerCase();
        if (platform.includes('android')) {
          const Environment = plus.android.importClass('android.os.Environment');
          const directory = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
          plus.android.importClass(directory);
          const absolutePath = String(directory.getAbsolutePath() || '').replace(/\\/g, '/');
          if (absolutePath) {
            return absolutePath.endsWith('/') ? absolutePath : `${absolutePath}/`;
          }
        }
      } catch (_error) {}
      // #endif

      return ATTACHMENT_DOWNLOAD_DIR;
    },
    ensureAttachmentStoragePermission() {
      // #ifdef APP-PLUS
      return new Promise((resolve) => {
        try {
          const systemInfo = uni.getSystemInfoSync();
          const platform = String(systemInfo.platform || systemInfo.osName || '').toLowerCase();
          if (!platform.includes('android')) {
            resolve(true);
            return;
          }

          const Build = plus.android.importClass('android.os.Build');
          if (Number(Build.VERSION.SDK_INT) >= 30) {
            resolve(true);
            return;
          }

          plus.android.requestPermissions(
            ['android.permission.READ_EXTERNAL_STORAGE', 'android.permission.WRITE_EXTERNAL_STORAGE'],
            (result) => {
              const deniedAlways = Array.isArray(result.deniedAlways) ? result.deniedAlways : [];
              const deniedPresent = Array.isArray(result.deniedPresent) ? result.deniedPresent : [];
              resolve(!deniedAlways.length && !deniedPresent.length);
            },
            () => resolve(false)
          );
        } catch (_error) {
          resolve(false);
        }
      });
      // #endif

      // #ifndef APP-PLUS
      return Promise.resolve(false);
      // #endif
    },
    ensureAttachmentDownloadDirectory() {
      // #ifdef APP-PLUS
      return new Promise(async (resolve) => {
        const hasPermission = await this.ensureAttachmentStoragePermission();
        if (!hasPermission) {
          resolve({ ok: false, message: '\u8bf7\u5148\u5141\u8bb8\u5b58\u50a8\u6743\u9650' });
          return;
        }

        const downloadDirectory = this.getAttachmentDownloadDirectory().replace(/\/$/, '');
        const normalizedPath = toLocalFileSystemUrl(downloadDirectory);

        plus.io.resolveLocalFileSystemURL(
          normalizedPath,
          () => resolve({ ok: true, path: downloadDirectory }),
          () => {
            const pathParts = downloadDirectory.split('/').filter(Boolean);
            const directoryName = pathParts.pop();
            const parentPath = `/${pathParts.join('/')}`;
            plus.io.resolveLocalFileSystemURL(
              toLocalFileSystemUrl(parentPath),
              (parentEntry) => {
                parentEntry.getDirectory(
                  directoryName,
                  { create: true },
                  () => resolve({ ok: true, path: downloadDirectory }),
                  () => resolve({ ok: false, message: '\u4e0b\u8f7d\u76ee\u5f55\u521b\u5efa\u5931\u8d25' })
                );
              },
              () => resolve({ ok: false, message: '\u65e0\u6cd5\u8bbf\u95ee\u7cfb\u7edf\u4e0b\u8f7d\u76ee\u5f55' })
            );
          }
        );
      });
      // #endif

      // #ifndef APP-PLUS
      return Promise.resolve({ ok: false, message: '\u5f53\u524d\u73af\u5883\u4e0d\u652f\u6301\u4e0b\u8f7d\u5230\u672c\u5730\u76ee\u5f55' });
      // #endif
    },
    formatFileSize(size) {
      const value = Number(size || 0);
      if (!value) {
        return '0B';
      }
      if (value < 1024) {
        return `${value}B`;
      }
      if (value < 1024 * 1024) {
        return `${(value / 1024).toFixed(1)}KB`;
      }
      if (value < 1024 * 1024 * 1024) {
        return `${(value / (1024 * 1024)).toFixed(1)}MB`;
      }
      return `${(value / (1024 * 1024 * 1024)).toFixed(1)}GB`;
    },
    formatDownloadProgress(receivedSize, totalSize) {
      const received = this.formatFileSize(receivedSize);
      if (!Number(totalSize || 0)) {
        return `${received} / 计算中`;
      }
      return `${received} / ${this.formatFileSize(totalSize)}`;
    },
    updateAttachmentDownloadState(patch = {}) {
      this.attachmentDownload = {
        ...this.attachmentDownload,
        ...patch
      };
    },
    disposeAttachmentTask(clearVisible = false) {
      // #ifdef APP-PLUS
      if (this.attachmentDownloadTask) {
        this.attachmentDownloadTask.abort();
      }
      this.attachmentDownloadTask = null;
      // #endif
      if (clearVisible) {
        this.attachmentDownload = createEmptyAttachmentDownloadState();
      }
    },
    checkLocalAttachmentExists(filePath) {
      // #ifdef APP-PLUS
      return new Promise((resolve) => {
        plus.io.resolveLocalFileSystemURL(
          toLocalFileSystemUrl(filePath),
          () => resolve(true),
          () => resolve(false)
        );
      });
      // #endif

      // #ifndef APP-PLUS
      return Promise.resolve(false);
      // #endif
    },
    getReadableLocalPath(filePath) {
      if (!filePath) {
        return '';
      }
      return filePath.startsWith('_doc/') ? `应用目录/${filePath.replace(/^_doc\//, '')}` : filePath;
    },
    async notifyAttachmentIndexed(filePath) {
      if (!filePath) {
        return;
      }
      try {
        await scanFileToMediaLibrary(filePath);
      } catch (_error) {}
    },
    promptForApkInstallPermission(filePath, name) {
      this.pendingInstallFile = { filePath, name };
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
    },
    async resumePendingAttachmentInstall() {
      if (!this.pendingInstallFile) {
        return;
      }
      if (!canInstallApkOnAndroid()) {
        return;
      }

      const pendingFile = this.pendingInstallFile;
      this.pendingInstallFile = null;
      await this.openDownloadedAttachment(pendingFile);
    },
    async openDownloadedAttachment(payload) {
      const filePath = payload && payload.filePath ? payload.filePath : this.attachmentDownload.filePath;
      const name = payload && payload.name ? payload.name : this.attachmentDownload.name;
      if (!filePath) {
        uni.showToast({ title: '附件尚未下载完成', icon: 'none' });
        return;
      }

      // #ifdef APP-PLUS
      const exists = await this.checkLocalAttachmentExists(filePath);
      if (!exists) {
        this.updateAttachmentDownloadState({
          status: 'failed',
          filePath: ''
        });
        uni.showToast({ title: '本地附件不存在，请重新下载', icon: 'none' });
        return;
      }
      // #endif

      try {
        const result = await openOrInstallLocalFile({ filePath, fileName: name });
        if (result.status === 'permission_required') {
          this.promptForApkInstallPermission(filePath, name);
          return;
        }
        if (result.status === 'install_started') {
          uni.showToast({ title: '已调起安装界面', icon: 'none' });
        }
        return;
      } catch (_error) {}

      uni.openDocument({
        filePath,
        showMenu: true,
        fail: () => {
          uni.showToast({ title: `当前附件暂不支持直接打开：${name || '附件'}`, icon: 'none' });
        }
      });
    },
    async handleAppAttachmentDownload(item, fileUrl) {
      const key = this.getAttachmentKey(item);
      const filePath = this.getAttachmentDownloadPath(item);

      if (this.attachmentDownload.key === key) {
        if (this.attachmentDownload.status === 'downloading') {
          uni.showToast({ title: '该附件正在下载', icon: 'none' });
          return;
        }
        if (this.attachmentDownload.status === 'paused') {
          this.resumeAttachmentDownload();
          return;
        }
        if (this.attachmentDownload.status === 'completed') {
          this.openDownloadedAttachment();
          return;
        }
      }

      const exists = await this.checkLocalAttachmentExists(filePath);
      if (exists) {
        this.updateAttachmentDownloadState({
          visible: true,
          key,
          name: item.name || '附件',
          url: fileUrl,
          progress: 100,
          status: 'completed',
          receivedSize: item.size || 0,
          totalSize: item.size || 0,
          filePath,
          item
        });
        this.openDownloadedAttachment();
        return;
      }

      uni.showModal({
        title: '下载附件',
        content: `确认下载“${item.name || '附件'}”吗？`,
        confirmText: '立即下载',
        cancelText: '取消',
        success: ({ confirm }) => {
          if (!confirm) {
            return;
          }
          this.startAttachmentDownload(item, fileUrl, filePath);
        }
      });
    },
    async startAttachmentDownload(item, fileUrl, filePath) {
      // #ifdef APP-PLUS
      if (!fileUrl) {
        uni.showToast({ title: '附件地址无效', icon: 'none' });
        return;
      }

      if (this.attachmentDownload.status === 'downloading' && this.attachmentDownload.key === this.getAttachmentKey(item)) {
        uni.showToast({ title: '该附件正在下载', icon: 'none' });
        return;
      }

      this.disposeAttachmentTask(false);

      const dirResult = await this.ensureAttachmentDownloadDirectory();
      if (!dirResult.ok) {
        uni.showToast({ title: dirResult.message || '\u4e0b\u8f7d\u76ee\u5f55\u521b\u5efa\u5931\u8d25', icon: 'none' });
        return;
      }

      const key = this.getAttachmentKey(item);
      this.updateAttachmentDownloadState({
        visible: true,
        key,
        name: item.name || '附件',
        url: fileUrl,
        progress: 0,
        status: 'downloading',
        receivedSize: 0,
        totalSize: Number(item.size || 0) || 0,
        filePath,
        item
      });

      const task = plus.downloader.createDownload(
        encodeURI(fileUrl),
        {
          filename: filePath,
          retry: 1,
          timeout: 0
        },
        (download, status) => {
          if (status === 200) {
            const completedFilePath = download.filename || filePath;
            this.notifyAttachmentIndexed(completedFilePath);
            this.updateAttachmentDownloadState({
              visible: true,
              progress: 100,
              status: 'completed',
              receivedSize: download.downloadedSize || this.attachmentDownload.receivedSize,
              totalSize: download.totalSize || this.attachmentDownload.totalSize || download.downloadedSize || 0,
              filePath: completedFilePath
            });
            this.attachmentDownloadTask = null;
            uni.showModal({
              title: '下载完成',
              content: `文件已保存到：${this.getReadableLocalPath(completedFilePath)}`,
              confirmText: '打开文件',
              cancelText: '知道了',
              success: ({ confirm }) => {
                if (!confirm) {
                  return;
                }
                this.openDownloadedAttachment({
                  filePath: completedFilePath,
                  name: item.name || '附件'
                });
              }
            });
            return;
          }

          this.updateAttachmentDownloadState({
            visible: true,
            status: 'failed'
          });
          this.attachmentDownloadTask = null;
          uni.showToast({ title: '附件下载失败', icon: 'none' });
        }
      );

      task.addEventListener('statechanged', (download) => {
        const totalSize = download.totalSize || this.attachmentDownload.totalSize || 0;
        const receivedSize = download.downloadedSize || 0;
        const progress = totalSize > 0 ? Math.min(100, Math.round((receivedSize / totalSize) * 100)) : this.attachmentDownload.progress;
        let status = this.attachmentDownload.status;

        if (download.state === 3) {
          status = 'downloading';
        } else if (download.state === 4) {
          status = 'completed';
        } else if (download.state === 5) {
          status = 'paused';
        }

        this.updateAttachmentDownloadState({
          visible: true,
          receivedSize,
          totalSize,
          progress,
          status,
          filePath: download.filename || this.attachmentDownload.filePath
        });
      });

      this.attachmentDownloadTask = task;
      task.start();
      return;
      // #endif

      // #ifndef APP-PLUS
      uni.showToast({ title: '当前环境暂不支持此下载方式', icon: 'none' });
      // #endif
    },
    pauseAttachmentDownload() {
      // #ifdef APP-PLUS
      if (!this.attachmentDownloadTask || this.attachmentDownload.status !== 'downloading') {
        return;
      }
      this.attachmentDownloadTask.pause();
      this.updateAttachmentDownloadState({
        status: 'paused'
      });
      // #endif
    },
    resumeAttachmentDownload() {
      // #ifdef APP-PLUS
      if (!this.attachmentDownloadTask || this.attachmentDownload.status !== 'paused') {
        return;
      }
      this.attachmentDownloadTask.resume();
      this.updateAttachmentDownloadState({
        status: 'downloading'
      });
      // #endif
    },
    retryAttachmentDownload() {
      const { item, url, filePath } = this.attachmentDownload;
      if (!item || !url || !filePath) {
        uni.showToast({ title: '缺少下载信息', icon: 'none' });
        return;
      }
      this.startAttachmentDownload(item, url, filePath);
    },
    cancelAttachmentDownload() {
      const isCompleted = this.attachmentDownload.status === 'completed';
      this.disposeAttachmentTask(true);
      if (!isCompleted) {
        uni.showToast({ title: '已取消下载', icon: 'none' });
      }
    },
    openSourceLink() {
      const url = this.normalizedSourceUrl;
      if (!url) {
        return;
      }
      if (url.startsWith('/pages/')) {
        uni.navigateTo({ url });
        return;
      }
      // #ifdef H5
      window.open(url, '_blank');
      // #endif
      // #ifndef H5
      uni.navigateTo({
        url: `/pages/webview/webview?url=${encodeURIComponent(url)}&title=${encodeURIComponent(this.detail.source || '来源链接')}`
      });
      // #endif
    },
    openAttachment(item) {
      const fileUrl = this.resolveAssetUrl(item && item.path);
      if (!fileUrl) {
        return;
      }
      if ((item.mimeType || '').startsWith('image/')) {
        uni.previewImage({ urls: [fileUrl], current: fileUrl });
        return;
      }
      // #ifdef H5
      window.open(fileUrl, '_blank');
      // #endif
      // #ifdef APP-PLUS
      this.handleAppAttachmentDownload(item, fileUrl);
      // #endif
      // #ifndef APP-PLUS
      // #ifndef H5
      uni.downloadFile({
        url: fileUrl,
        success: (res) => {
          if (res.statusCode !== 200) {
            uni.showToast({ title: '附件打开失败', icon: 'none' });
            return;
          }
          uni.openDocument({
            filePath: res.tempFilePath,
            showMenu: true,
            fail: () => {
              uni.showToast({ title: '当前附件暂不支持预览', icon: 'none' });
            }
          });
        },
        fail: () => {
          uni.showToast({ title: '附件下载失败', icon: 'none' });
        }
      });
      // #endif
      // #endif
    },
    async toggleCollection() {
      try {
        const result = await this.$api.user.toggleCollection({
          targetType: 'info',
          targetId: Number(this.detail.id)
        });
        const collected = Boolean(result && result.collected);
        const favoriteCount = Number(this.detail.favoriteCount || 0);
        this.detail = {
          ...this.detail,
          isCollected: collected,
          favoriteCount: collected ? favoriteCount + 1 : Math.max(0, favoriteCount - 1)
        };
        uni.showToast({ title: collected ? '已收藏' : '已取消收藏', icon: 'success' });
      } catch (error) {
        uni.showToast({ title: error.message || '操作失败', icon: 'none' });
      }
    }
  }
};
</script>

<style scoped>
.info-page {
  padding-bottom: calc(120rpx + env(safe-area-inset-bottom));
}

.search-box {
  display: flex;
  align-items: center;
  gap: 14rpx;
  padding: 0 18rpx 0 24rpx;
  height: 88rpx;
}

.search-icon {
  font-size: 28rpx;
  color: var(--text-sub);
}

.search-input {
  flex: 1;
  height: 100%;
  font-size: 26rpx;
}

.search-action {
  min-width: 108rpx;
  height: 64rpx;
  border-radius: var(--radius-full);
  background: var(--primary-light);
  color: var(--primary-color);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  font-weight: 700;
}

.detail-card,
.result-card {
  margin-top: 28rpx;
  padding: 28rpx 24rpx;
}

.detail-topline,
.content-feed-card__tags,
.content-card__top {
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
  margin-bottom: 16rpx;
}

.detail-title,
.content-card__title {
  font-size: 32rpx;
  line-height: 1.45;
  font-weight: 700;
  color: var(--text-main);
}

.detail-content,
.content-card__desc {
  margin-top: 12rpx;
  font-size: 25rpx;
  line-height: 1.75;
  color: var(--text-sub);
}

.detail-content {
  white-space: pre-wrap;
  word-break: break-word;
}

.content-card__meta {
  margin-top: 14rpx;
  font-size: 22rpx;
  color: var(--text-sub);
}

.detail-source-link {
  margin-top: 16rpx;
  color: var(--primary-color);
  font-size: 24rpx;
  line-height: 1.6;
}

.detail-attachments {
  margin-top: 24rpx;
  padding-top: 20rpx;
  border-top: 1rpx solid #eef1f7;
}

.detail-attachments__title {
  font-size: 26rpx;
  font-weight: 700;
  color: var(--text-main);
}

.detail-attachment {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  padding: 18rpx 0;
  border-bottom: 1rpx solid #f3f5f8;
}

.detail-attachment__name {
  flex: 1;
  color: var(--text-main);
  font-size: 24rpx;
  word-break: break-all;
}

.detail-attachment__action {
  color: var(--primary-color);
  font-size: 24rpx;
  font-weight: 700;
}

.detail-action {
  margin-top: 28rpx;
}

.attachment-download-panel {
  margin-top: 20rpx;
  padding: 22rpx;
  border-radius: 24rpx;
  background: #f7f9fc;
}

.attachment-download-panel__header,
.attachment-download-panel__progress,
.attachment-download-panel__actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}

.attachment-download-panel__header {
  align-items: flex-start;
}

.attachment-download-panel__title {
  flex: 1;
  font-size: 24rpx;
  color: var(--text-main);
  word-break: break-all;
}

.attachment-download-panel__meta,
.attachment-download-panel__info,
.attachment-download-panel__percent {
  font-size: 22rpx;
  color: var(--text-sub);
}

.attachment-download-panel__progress {
  margin-top: 16rpx;
}

.tag-group,
.tag-title-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  flex-wrap: wrap;
  flex: 1;
  min-width: 0;
}

.tag-title-row {
  flex-wrap: nowrap;
}

.content-card__top .content-card__title {
  flex: 1;
  min-width: 0;
}

.attachment-download-panel__bar {
  flex: 1;
  height: 12rpx;
  overflow: hidden;
  border-radius: 999rpx;
  background: #e6ebf3;
}

.attachment-download-panel__bar-value {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #2f80ed 0%, #22c1c3 100%);
}

.attachment-download-panel__info {
  margin-top: 12rpx;
}

.attachment-download-panel__actions {
  justify-content: flex-end;
  flex-wrap: wrap;
  margin-top: 18rpx;
}

.attachment-download-panel__btn {
  min-width: 132rpx;
  height: 60rpx;
  padding: 0 22rpx;
  border-radius: 999rpx;
  border: 1rpx solid #d6deeb;
  background: #ffffff;
  color: var(--text-main);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 22rpx;
  font-weight: 600;
}

.attachment-download-panel__btn--primary {
  border-color: transparent;
  background: var(--primary-color);
  color: #ffffff;
}

.attachment-download-panel__btn--ghost {
  color: var(--text-sub);
}

.result-layout {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  margin-top: 28rpx;
}

.content-card + .content-card {
  margin-top: 20rpx;
  padding-top: 20rpx;
  border-top: 1rpx solid #eef1f7;
}

.location-tabs {
  display: flex;
  padding: 8rpx;
  margin-top: 28rpx;
}

.location-tab {
  flex: 1;
  height: 76rpx;
  border-radius: 22rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-sub);
  font-size: 28rpx;
  font-weight: 700;
}

.location-tab.active {
  background: var(--primary-light);
  color: var(--primary-color);
}

.info-panel {
  display: flex;
  gap: 18rpx;
  margin-top: 20rpx;
  height: calc(100vh - 420rpx);
}

.category-list {
  width: 190rpx;
  padding: 12rpx;
}

.content-list {
  flex: 1;
}

.category-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 16rpx;
  border-radius: 20rpx;
  color: var(--text-sub);
  font-size: 26rpx;
}

.category-item.active {
  background: var(--primary-light);
  color: var(--primary-color);
  font-weight: 700;
}

.count {
  font-size: 22rpx;
}

.content-feed-card {
  padding: 24rpx;
}

.content-feed-card + .content-feed-card {
  margin-top: 18rpx;
}

.metric-pill {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  padding: 10rpx 16rpx;
  border-radius: 999rpx;
  background: #f5f7fb;
  color: var(--text-sub);
  font-size: 22rpx;
  margin-left: auto;
  flex-shrink: 0;
}

.metric-pill__icon {
  width: 28rpx;
  height: 28rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.metric-pill__icon svg {
  width: 28rpx;
  height: 28rpx;
  fill: #f5b301;
}
</style>
