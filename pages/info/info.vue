<template>
  <view class="page-shell info-page">
    <view class="page-header">
      <view class="page-eyebrow">{{ detailMode ? '资讯详情' : '信息中心' }}</view>
      <view class="page-title">{{ detailMode ? '深度阅读' : '展现更多精彩' }}</view>
      <view class="page-subtitle">{{ detailMode ? '在这里发现更多精彩内容' : '在这里发现更多精彩内容' }}</view>
    </view>

    <view class="search-box surface-card">
      <text class="search-icon">搜</text>
      <input class="search-input" placeholder="搜索资讯、活动" v-model="searchText" @confirm="onSearch" />
      <view class="search-action" @click="onSearch">搜索</view>
    </view>

    <view v-if="detailMode" class="detail-card surface-card">
      <view class="detail-topline">
        <tag-badge :text="detail.source || '资讯'" tone="blue" />
        <tag-badge :text="formatTime(detail.publishTime)" tone="yellow" />
      </view>
      <view class="detail-title">{{ detail.title }}</view>
      <view class="detail-content">{{ detail.content }}</view>
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
          <view class="content-card__title">{{ item.title }}</view>
          <view class="content-card__desc">{{ item.summary || item.content }}</view>
          <view class="content-card__meta">{{ item.source }} · {{ item.locationType || '资讯' }}</view>
        </view>
      </view>

      <view class="surface-card result-card">
        <view class="section-row">
          <text class="section-heading">活动结果</text>
        </view>
        <view v-if="searchActivities.length === 0" class="empty-state">暂无匹配活动</view>
        <view v-for="item in searchActivities" :key="item.id" class="content-card" @click="goToActivity(item.id)">
          <view class="content-card__title">{{ item.title }}</view>
          <view class="content-card__desc">{{ item.summary || item.content }}</view>
          <view class="content-card__meta">{{ item.organizer }} · {{ item.location }}</view>
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
              <tag-badge :text="formatTime(item.publishTime)" tone="yellow" />
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
        try {
          await this.$api.user.recordHistory({
            targetType: 'info',
            targetId: id,
            title: this.detail.title,
            summary: this.detail.summary || this.detail.content
          });
        } catch (e) {}
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
    async toggleCollection() {
      try {
        await this.$api.user.toggleCollection({
          targetType: 'info',
          targetId: Number(this.detail.id)
        });
        uni.showToast({ title: '收藏状态已更新', icon: 'success' });
      } catch (error) {
        uni.showToast({ title: error.message || '操作失败', icon: 'none' });
      }
    },
    formatTime(value) {
      if (!value) {
        return '刚刚';
      }
      const date = new Date(value);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    }
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
.content-feed-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
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

.content-card__meta {
  margin-top: 14rpx;
  font-size: 22rpx;
  color: var(--text-sub);
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
</style>
