<template>
  <view class="page-shell info-page">
    <view class="page-header">
      <page-nav v-if="detailMode || searchMode" fallback="/pages/index/index" :is-tab="true" />
      <view class="page-eyebrow">{{ detailMode ? '璧勮璇︽儏' : '淇℃伅涓績' }}</view>
      <view class="page-title">{{ detailMode ? '娣卞害闃呰' : '鍙戠幇鏇村鏍″洯鍐呭' }}</view>
      <view class="page-subtitle">{{ detailMode ? '鏌ョ湅瀹屾暣鍐呭涓庨檮浠惰祫鏂? : '鎼滅储璧勮銆佹椿鍔ㄤ笌鏍″洯鍔ㄦ€? }}</view>
    </view>

    <view class="search-box surface-card">
      <text class="search-icon">馃攳</text>
      <input class="search-input" placeholder="鎼滅储璧勮銆佹椿鍔? v-model="searchText" @confirm="onSearch" />
      <view class="search-action" @click="onSearch">鎼滅储</view>
    </view>

    <view v-if="detailMode" class="detail-card surface-card">
      <view class="detail-topline">
        <tag-badge :text="detail.source || '璧勮'" tone="blue" />
        <view class="metric-pill">
          <view class="metric-pill__icon">
            <svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16">
              <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Zm0 2.445L6.615 5.5a.75.75 0 0 1-.564.41l-3.097.45 2.24 2.184a.75.75 0 0 1 .216.664l-.528 3.084 2.769-1.456a.75.75 0 0 1 .698 0l2.77 1.456-.53-3.084a.75.75 0 0 1 .216-.664l2.24-2.183-3.096-.45a.75.75 0 0 1-.564-.41L8 2.694Z"></path>
            </svg>
          </view>
          <text>{{ detail.favoriteCount || 0 }} 鏀惰棌</text>
        </view>
      </view>
      <view class="detail-title">{{ detail.title }}</view>
      <view v-if="detail.sourceUrl || isUrl(detail.source)" class="detail-source-link" @click="openSourceLink">
        鏉ユ簮閾炬帴锛歿{ detail.source || normalizedSourceUrl }}
      </view>
      <view class="detail-content">{{ detail.content }}</view>
      <view v-if="detail.attachments && detail.attachments.length" class="detail-attachments">
        <view class="detail-attachments__title">闄勪欢璧勬枡</view>
        <view
          v-for="(item, index) in detail.attachments"
          :key="index"
          class="detail-attachment"
          @click="openAttachment(item)"
        >
          <text class="detail-attachment__name">{{ item.name }}</text>
          <text class="detail-attachment__action">鎵撳紑</text>
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
            <view
              v-if="attachmentDownload.status === 'downloading'"
              class="attachment-download-panel__btn"
              @click.stop="pauseAttachmentDownload"
            >
              鏆傚仠
            </view>
            <view
              v-if="attachmentDownload.status === 'paused'"
              class="attachment-download-panel__btn"
              @click.stop="resumeAttachmentDownload"
            >
              缁х画
            </view>
            <view
              v-if="attachmentDownload.status === 'completed'"
              class="attachment-download-panel__btn attachment-download-panel__btn--primary"
              @click.stop="openDownloadedAttachment"
            >
              鎵撳紑闄勪欢
            </view>
            <view
              v-if="attachmentDownload.status === 'failed'"
              class="attachment-download-panel__btn attachment-download-panel__btn--primary"
              @click.stop="retryAttachmentDownload"
            >
              閲嶆柊涓嬭浇
            </view>
            <view class="attachment-download-panel__btn attachment-download-panel__btn--ghost" @click.stop="cancelAttachmentDownload">
              {{ attachmentDownload.status === 'completed' ? '鍏抽棴' : '鍙栨秷' }}
            </view>
          </view>
        </view>
      </view>
      <view class="detail-action">
        <custom-button text="鏀惰棌 / 鍙栨秷鏀惰棌" @click="toggleCollection" />
      </view>
    </view>

    <view v-else-if="searchMode" class="result-layout">
      <view class="surface-card result-card">
        <view class="section-row">
          <text class="section-heading">璧勮缁撴灉</text>
        </view>
        <view v-if="searchInfos.length === 0" class="empty-state">鏆傛棤鍖归厤璧勮</view>
        <view v-for="item in searchInfos" :key="item.id" class="content-card" @click="goToDetail(item.id)">
          <view class="content-card__top">
            <view class="content-card__title">{{ item.title }}</view>
            <view class="metric-pill">
              <view class="metric-pill__icon">
                <svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16">
                  <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Zm0 2.445L6.615 5.5a.75.75 0 0 1-.564.41l-3.097.45 2.24 2.184a.75.75 0 0 1 .216.664l-.528 3.084 2.769-1.456a.75.75 0 0 1 .698 0l2.77 1.456-.53-3.084a.75.75 0 0 1 .216-.664l2.24-2.183-3.096-.45a.75.75 0 0 1-.564-.41L8 2.694Z"></path>
                </svg>
              </view>
              <text>{{ item.favoriteCount || 0 }} 鏀惰棌</text>
            </view>
          </view>
          <view class="content-card__desc">{{ item.summary || item.content }}</view>
          <view class="content-card__meta">{{ item.source || '鏍″洯鍙戝竷' }} 路 {{ item.locationType || '璧勮' }}</view>
        </view>
      </view>

      <view class="surface-card result-card">
        <view class="section-row">
          <text class="section-heading">娲诲姩缁撴灉</text>
        </view>
        <view v-if="searchActivities.length === 0" class="empty-state">鏆傛棤鍖归厤娲诲姩</view>
        <view v-for="item in searchActivities" :key="item.id" class="content-card" @click="goToActivity(item.id)">
          <view class="content-card__top">
            <view class="content-card__title">{{ item.title }}</view>
            <view class="metric-pill">
              <view class="metric-pill__icon">
                <svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16">
                  <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Zm0 2.445L6.615 5.5a.75.75 0 0 1-.564.41l-3.097.45 2.24 2.184a.75.75 0 0 1 .216.664l-.528 3.084 2.769-1.456a.75.75 0 0 1 .698 0l2.77 1.456-.53-3.084a.75.75 0 0 1 .216-.664l2.24-2.183-3.096-.45a.75.75 0 0 1-.564-.41L8 2.694Z"></path>
                </svg>
              </view>
              <text>{{ item.applyCount || 0 }} 鍙備笌</text>
            </view>
          </view>
          <view class="content-card__desc">{{ item.summary || item.content }}</view>
          <view class="content-card__meta">{{ item.organizer || '鏍″洯缁勭粐' }} 路 {{ item.location || '鍦扮偣寰呭畾' }}</view>
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
          <view v-if="filteredInfos.length === 0" class="surface-card empty-state">娌℃湁鏇村鍐呭</view>
          <view v-for="item in filteredInfos" :key="item.id" class="content-feed-card surface-card" @click="goToDetail(item.id)">
            <view class="content-feed-card__tags">
              <tag-badge :text="item.category || '璧勮'" tone="purple" />
              <view class="metric-pill">
                <view class="metric-pill__icon">
                  <svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16">
                    <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Zm0 2.445L6.615 5.5a.75.75 0 0 1-.564.41l-3.097.45 2.24 2.184a.75.75 0 0 1 .216.664l-.528 3.084 2.769-1.456a.75.75 0 0 1 .698 0l2.77 1.456-.53-3.084a.75.75 0 0 1 .216-.664l2.24-2.183-3.096-.45a.75.75 0 0 1-.564-.41L8 2.694Z"></path>
                  </svg>
                </view>
                <text>{{ item.favoriteCount || 0 }} 鏀惰棌</text>
              </view>
            </view>
            <view class="content-card__title">{{ item.title }}</view>
            <view class="content-card__desc">{{ item.summary || item.content }}</view>
            <view class="content-card__meta">{{ item.source || '鏍″洯鍙戝竷' }}</view>
          </view>
        </scroll-view>
      </view>
    </view>
    <app-tabbar v-if="!detailMode" current="info" />
  </view>
</template>

<script>
import { SERVER_ORIGIN } from '../../config/api';

const DEFAULT_CATEGORIES = ['鍏ㄩ儴', '璁插骇', '鍏泭', '鍏艰亴', '灏变笟', '濞变箰', '绔炶禌', '缇庨', '鍏朵粬'];
const ATTACHMENT_DOWNLOAD_DIR = '_doc/attachments/';

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

export default {
  data() {
    return {
      searchText: '',
      detailMode: false,
      searchMode: false,
      detail: {},
      locationTabs: ['鏍″', '鏍″唴'],
      activeLocation: '鏍″',
      activeCategory: '鍏ㄩ儴',
      infoList: [],
      searchInfos: [],
      searchActivities: [],
      attachmentDownload: createEmptyAttachmentDownloadState()
    };
  },
  computed: {
    normalizedSourceUrl() {
      return this.normalizeUrl(this.detail.sourceUrl || (this.isUrl(this.detail.source) ? this.detail.source : ''));
    },
    categories() {
      return DEFAULT_CATEGORIES.map((name) => ({
        name,
        count: name === '鍏ㄩ儴' ? this.infoList.length : this.infoList.filter((item) => item.category === name).length
      }));
    },
    filteredInfos() {
      if (this.activeCategory === '鍏ㄩ儴') {
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
  onShow() {
    if (this.detailMode) {
      return;
    }
    const pendingSearch = uni.getStorageSync('pendingInfoSearch');
    if (pendingSearch !== '' && pendingSearch !== undefined) {
      this.searchText = pendingSearch;
      this.searchMode = Boolean(pendingSearch);
      uni.removeStorageSync('pendingInfoSearch');
    }
    this.loadInfos();
  },
  onUnload() {
    this.disposeAttachmentTask(false);
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
          this.activeCategory = firstAvailable ? firstAvailable.name : '鍏ㄩ儴';
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
      return `${ATTACHMENT_DOWNLOAD_DIR}${safeKey || 'attachment'}${ext}`;
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
          filePath,
          () => resolve(true),
          () => resolve(false)
        );
      });
      // #endif

      // #ifndef APP-PLUS
      return Promise.resolve(false);
      // #endif
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
        url: `/pages/webview/webview?url=${encodeURIComponent(url)}&title=${encodeURIComponent(this.detail.source || '鏉ユ簮閾炬帴')}`
      });
      // #endif
    },
    async openAttachment(item) {
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
      return;
      // #endif

      // #ifdef APP-PLUS
      await this.handleAppAttachmentDownload(item, fileUrl);
      return;
      // #endif

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
    },
    async handleAppAttachmentDownload(item, fileUrl) {
      const key = this.getAttachmentKey(item);
      const current = this.attachmentDownload;

      if (current.key && current.key !== key && ['downloading', 'paused'].includes(current.status)) {
        uni.showToast({ title: '当前有附件正在下载，请先处理', icon: 'none' });
        return;
      }

      if (current.key === key) {
        if (current.status === 'completed' && current.filePath) {
          const exists = await this.checkLocalAttachmentExists(current.filePath);
          if (exists) {
            this.openDownloadedAttachment();
            return;
          }
          this.updateAttachmentDownloadState({
            status: 'failed',
            filePath: ''
          });
        }
        if (['downloading', 'paused'].includes(current.status)) {
          uni.showToast({ title: '该附件正在下载，请在下方查看进度', icon: 'none' });
          return;
        }
      }

      const modalResult = await new Promise((resolve) => {
        uni.showModal({
          title: '下载附件',
          content: `确认下载并打开“${item.name || '附件'}”吗？`,
          confirmText: '确认下载',
          cancelText: '取消',
          success: resolve,
          fail: () => resolve({ confirm: false, cancel: true })
        });
      });

      if (!modalResult.confirm) {
        return;
      }

      this.startAttachmentDownload(item, fileUrl);
    },
    startAttachmentDownload(item, fileUrl) {
      const targetPath = this.getAttachmentDownloadPath(item);
      const key = this.getAttachmentKey(item);

      this.disposeAttachmentTask(false);
      this.attachmentDownloadTask = null;
      this.attachmentDownload = {
        visible: true,
        key,
        name: item.name || '附件',
        url: fileUrl,
        progress: 0,
        status: 'downloading',
        receivedSize: 0,
        totalSize: Number(item.size || 0) || 0,
        filePath: '',
        item
      };

      // #ifdef APP-PLUS
      const task = plus.downloader.createDownload(
        fileUrl,
        {
          filename: targetPath,
          timeout: 300
        },
        (download, status) => {
          if (status === 200) {
            const savedFilePath = download.filename || targetPath;
            this.updateAttachmentDownloadState({
              progress: 100,
              status: 'completed',
              receivedSize: Number(download.downloadedSize || this.attachmentDownload.totalSize || 0),
              totalSize: Number(download.totalSize || this.attachmentDownload.totalSize || 0),
              filePath: savedFilePath
            });
            this.attachmentDownloadTask = null;
            this.openDownloadedAttachment();
            return;
          }

          this.updateAttachmentDownloadState({
            status: 'failed'
          });
          this.attachmentDownloadTask = null;
          uni.showToast({ title: '附件下载失败', icon: 'none' });
        }
      );

      task.addEventListener('statechanged', (download) => {
        const totalSize = Number(download.totalSize || this.attachmentDownload.totalSize || 0);
        const receivedSize = Number(download.downloadedSize || 0);
        const progress = totalSize ? Math.min(100, Math.round((receivedSize / totalSize) * 100)) : this.attachmentDownload.progress;
        const status = download.state === 5 ? 'paused' : this.attachmentDownload.status;

        this.updateAttachmentDownloadState({
          status,
          progress,
          receivedSize,
          totalSize
        });
      });

      this.attachmentDownloadTask = task;
      task.start();
      // #endif
    },
    pauseAttachmentDownload() {
      // #ifdef APP-PLUS
      if (this.attachmentDownloadTask && this.attachmentDownload.status === 'downloading') {
        this.attachmentDownloadTask.pause();
        this.updateAttachmentDownloadState({ status: 'paused' });
      }
      // #endif
    },
    resumeAttachmentDownload() {
      // #ifdef APP-PLUS
      if (this.attachmentDownloadTask && this.attachmentDownload.status === 'paused') {
        this.attachmentDownloadTask.resume();
        this.updateAttachmentDownloadState({ status: 'downloading' });
      }
      // #endif
    },
    retryAttachmentDownload() {
      if (!this.attachmentDownload.item || !this.attachmentDownload.url) {
        return;
      }
      this.startAttachmentDownload(this.attachmentDownload.item, this.attachmentDownload.url);
    },
    cancelAttachmentDownload() {
      const shouldClear = this.attachmentDownload.status === 'completed';
      this.disposeAttachmentTask(shouldClear);
      if (!shouldClear) {
        this.attachmentDownload = createEmptyAttachmentDownloadState();
      }
    },
    openDownloadedAttachment() {
      if (!this.attachmentDownload.filePath) {
        uni.showToast({ title: '附件尚未下载完成', icon: 'none' });
        return;
      }
      uni.openDocument({
        filePath: this.attachmentDownload.filePath,
        showMenu: true,
        fail: () => {
          uni.showToast({ title: '当前附件暂不支持预览', icon: 'none' });
        }
      });
    },
    async toggleCollection() {
      try {
        await this.$api.user.toggleCollection({
          targetType: 'info',
          targetId: Number(this.detail.id)
        });
        await this.loadDetail(this.detail.id);
        uni.showToast({ title: '收藏状态已更新', icon: 'success' });
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
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
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

.attachment-download-panel {
  margin-top: 20rpx;
  padding: 22rpx 20rpx;
  border-radius: 24rpx;
  background: #f7faff;
  border: 1rpx solid #dbe8ff;
}

.attachment-download-panel__header,
.attachment-download-panel__progress,
.attachment-download-panel__actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}

.attachment-download-panel__title {
  flex: 1;
  font-size: 24rpx;
  font-weight: 700;
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
  margin-top: 18rpx;
}

.attachment-download-panel__bar {
  flex: 1;
  height: 12rpx;
  border-radius: 999rpx;
  overflow: hidden;
  background: #e5edfb;
}

.attachment-download-panel__bar-value {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #4f8cff 0%, #6db7ff 100%);
}

.attachment-download-panel__info {
  margin-top: 12rpx;
}

.attachment-download-panel__actions {
  margin-top: 18rpx;
  justify-content: flex-end;
  flex-wrap: wrap;
}

.attachment-download-panel__btn {
  min-width: 132rpx;
  padding: 14rpx 24rpx;
  border-radius: 999rpx;
  background: #e8f0ff;
  color: var(--primary-color);
  font-size: 22rpx;
  text-align: center;
  font-weight: 700;
}

.attachment-download-panel__btn--primary {
  background: var(--primary-color);
  color: #fff;
}

.attachment-download-panel__btn--ghost {
  background: #fff;
  color: var(--text-sub);
  border: 1rpx solid #d8e0ef;
}

.detail-action {
  margin-top: 28rpx;
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


