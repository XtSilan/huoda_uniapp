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
        <tag-badge :text="detail.source || '资讯'" tone="blue" />
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
          :key="item.path || index"
          class="detail-attachment"
          @click="openAttachment(item)"
        >
          <text class="detail-attachment__name">{{ item.name }}</text>
          <text class="detail-attachment__action">打开</text>
        </view>
      </view>
      <view class="detail-action">
        <custom-button text="收藏 / 取消收藏" @click="toggleCollection" />
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
            <view class="content-card__title">{{ item.title }}</view>
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
            <view class="content-card__title">{{ item.title }}</view>
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
              <tag-badge :text="item.category || '资讯'" tone="purple" />
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
    <app-tabbar v-if="!detailMode" current="info" />
  </view>
</template>

<script>
import { SERVER_ORIGIN } from '../../config/api';

const DEFAULT_CATEGORIES = ['全部', '讲座', '公益', '兼职', '就业', '娱乐', '竞赛', '美食', '其他'];

export default {
  data() {
    return {
      searchText: '',
      detailMode: false,
      searchMode: false,
      detail: {},
      locationTabs: ['校外', '校内'],
      activeLocation: '校外',
      activeCategory: '全部',
      infoList: [],
      searchInfos: [],
      searchActivities: []
    };
  },
  computed: {
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
