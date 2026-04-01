<template>
  <view class="page-shell home-page">
    <view class="page-header">
      <view class="page-eyebrow">{{ greetingPrefix }}</view>
      <view class="page-title">{{ greetingTitle }}</view>
      <view class="page-subtitle">看看今天校园里有哪些新鲜事</view>
    </view>

    <view class="hero-card surface-card">
      <view class="hero-search">
        <view class="search-box">
          <text class="search-icon">🔍</text>
          <input class="search-input" placeholder="搜索资讯、活动、组织方" v-model="searchText" @confirm="onSearch" />
        </view>
      </view>

      <view class="hero-progress">
        <view>
          <view class="hero-progress__title">今日探索进度</view>
          <view class="hero-progress__desc">已点亮 {{ completedModules }}/3 个内容模块</view>
        </view>
        <view class="progress-ring" :style="progressStyle">
          <view class="progress-ring__inner">{{ progressPercent }}%</view>
        </view>
      </view>

      <view class="hero-actions">
        <view v-for="item in quickActions" :key="item.title" class="quick-card" @click="goTo(item.url)">
          <view class="quick-card__icon" :class="item.tone">{{ item.icon }}</view>
          <view class="quick-card__title">{{ item.title }}</view>
          <view class="quick-card__desc">{{ item.desc }}</view>
        </view>
      </view>
    </view>

    <view v-if="banners.length" class="section-block">
      <view class="section-row">
        <text class="section-heading">焦点推荐</text>
        <text class="section-action" @click="switchToDiscover">去发现</text>
      </view>
      <swiper
        class="banner-swiper surface-card"
        circular
        autoplay
        indicator-dots
        indicator-color="rgba(255,255,255,0.5)"
        indicator-active-color="#ffffff"
      >
        <swiper-item v-for="item in banners" :key="item.id" @click="goToBanner(item)">
          <view class="banner-slide">
            <image class="banner-image" :src="item.imageUrl" mode="aspectFill"></image>
            <view class="banner-overlay">
              <tag-badge text="精选" tone="purple" />
              <view class="banner-title">{{ item.title || '校园热点正在发生' }}</view>
            </view>
          </view>
        </swiper-item>
      </swiper>
    </view>

    <view class="section-block">
      <view class="section-row">
        <text class="section-heading">个性化推荐</text>
        <text class="section-action" @click="switchToInfo">更多</text>
      </view>
      <view v-if="recommendList.length" class="content-stack">
        <view
          v-for="item in recommendList.slice(0, 3)"
          :key="item.id"
          class="news-card surface-card"
          @click="goToInfoDetail(item.id)"
        >
          <view class="news-card__icon tone-purple">荐</view>
          <view class="news-card__body">
            <view class="news-card__title">{{ item.title }}</view>
            <view class="news-card__content">{{ item.summary || item.content }}</view>
            <view class="news-card__meta">
              <tag-badge :text="item.source || '校园推荐'" tone="purple" />
            </view>
          </view>
        </view>
      </view>
      <view v-else class="surface-card empty-panel">推荐内容正在整理中</view>
    </view>

    <view class="section-block">
      <view class="section-row">
        <text class="section-heading">最新活动</text>
        <text class="section-action" @click="switchToDiscover">全部活动</text>
      </view>
      <view v-if="activities.length" class="activity-stack">
        <view
          v-for="item in activities.slice(0, 3)"
          :key="item.id"
          class="activity-card surface-card"
          @click="goToPublishDetail(item.id)"
        >
          <image v-if="item.images && item.images.length" class="activity-image" :src="item.images[0]" mode="aspectFill"></image>
          <view class="activity-body">
            <view class="activity-topline">
              <tag-badge :text="item.activityType || '活动'" tone="blue" />
              <view class="metric-pill">
                <view class="metric-pill__icon">
                  <svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16">
                    <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Zm0 2.445L6.615 5.5a.75.75 0 0 1-.564.41l-3.097.45 2.24 2.184a.75.75 0 0 1 .216.664l-.528 3.084 2.769-1.456a.75.75 0 0 1 .698 0l2.77 1.456-.53-3.084a.75.75 0 0 1 .216-.664l2.24-2.183-3.096-.45a.75.75 0 0 1-.564-.41L8 2.694Z"></path>
                  </svg>
                </view>
                <text>{{ item.applyCount || 0 }} 参与</text>
              </view>
            </view>
            <view class="activity-title">{{ item.title }}</view>
            <view class="activity-content">{{ item.summary || item.content }}</view>
            <view class="activity-meta">{{ item.organizer || '校园组织' }} · {{ item.location || '地点待定' }}</view>
          </view>
        </view>
      </view>
      <view v-else class="surface-card empty-panel">还没有新的活动，晚点再来看看</view>
    </view>

    <view class="section-block">
      <view class="section-row">
        <text class="section-heading">热门资讯</text>
        <text class="section-action" @click="switchToInfo">查看全部</text>
      </view>
      <view v-if="hotList.length" class="surface-card hot-panel">
        <view v-for="item in hotList.slice(0, 3)" :key="item.id" class="hot-row" @click="goToInfoDetail(item.id)">
          <view class="hot-row__index">{{ `0${hotList.indexOf(item) + 1}`.slice(-2) }}</view>
          <view class="hot-row__body">
            <view class="hot-row__title">{{ item.title }}</view>
            <view class="hot-row__meta">{{ formatTime(item.publishTime) }}</view>
          </view>
        </view>
      </view>
      <view v-else class="surface-card empty-panel">热门资讯稍后更新</view>
    </view>

    <view class="fab" @click="goTo('/pages/feature/publish/create')">+</view>
    <app-tabbar current="home" />
  </view>
</template>

<script>
export default {
  data() {
    return {
      searchText: '',
      banners: [],
      recommendList: [],
      hotList: [],
      activities: []
    };
  },
  computed: {
    quickActions() {
      return [
        { title: '校园乐跑', desc: '开始今天的运动计划', url: '/pages/feature/run/run', icon: '跑', tone: 'tone-purple' },
        { title: '班级签到', desc: '快速进入签到与群聊', url: '/pages/feature/sign/sign', icon: '签', tone: 'tone-green' },
        { title: 'AI 助手', desc: '随时问问小达老师', url: '/pages/feature/ai/ai', icon: 'AI', tone: 'tone-blue' }
      ];
    },
    greetingPrefix() {
      const hour = new Date().getHours();
      if (hour < 12) {
        return '早上好';
      }
      if (hour < 18) {
        return '下午好';
      }
      return '晚上好';
    },
    greetingTitle() {
      const userInfo = uni.getStorageSync('userInfo') || {};
      return `${this.greetingPrefix}，${userInfo.name || '同学'}`;
    },
    completedModules() {
      return [this.recommendList.length, this.activities.length, this.hotList.length].filter(Boolean).length;
    },
    progressPercent() {
      return Math.round((this.completedModules / 3) * 100);
    },
    progressStyle() {
      return {
        background: `conic-gradient(var(--primary-color) ${this.progressPercent}%, var(--primary-light) 0)`
      };
    }
  },
  onShow() {
    this.loadData();
  },
  methods: {
    async loadData() {
      try {
        const res = await this.$api.home.getOverview();
        this.banners = res.banners || [];
        this.recommendList = res.recommendations || [];
        this.hotList = res.hotInfos || [];
        this.activities = res.latestActivities || [];
      } catch (error) {
        uni.showToast({ title: error.message || '加载首页失败', icon: 'none' });
      }
    },
    onSearch() {
      uni.setStorageSync('pendingInfoSearch', this.searchText || '');
      uni.redirectTo({ url: '/pages/info/info' });
    },
    goTo(url) {
      uni.navigateTo({ url });
    },
    goToBanner(item) {
      uni.navigateTo({
        url: item.linkUrl || `/pages/feature/banner-placeholder/banner-placeholder?id=${item.id}`
      });
    },
    goToInfoDetail(id) {
      uni.navigateTo({ url: `/pages/info/info?id=${id}` });
    },
    goToPublishDetail(id) {
      uni.navigateTo({ url: `/pages/feature/publish/detail?id=${id}` });
    },
    switchToInfo() {
      uni.redirectTo({ url: '/pages/info/info' });
    },
    switchToDiscover() {
      uni.redirectTo({ url: '/pages/feature/publish/publish' });
    },
    formatTime(value) {
      return value ? new Date(value).toLocaleDateString() : '-';
    }
  }
};
</script>

<style scoped>
.home-page {
  padding-bottom: calc(180rpx + env(safe-area-inset-bottom));
}

.hero-card {
  padding: 24rpx;
}

.hero-search {
  margin-bottom: 24rpx;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 14rpx;
  height: 88rpx;
  padding: 0 24rpx;
  background: #f7f8fc;
  border-radius: var(--radius-full);
}

.search-icon {
  font-size: 28rpx;
  color: var(--text-sub);
}

.search-input {
  flex: 1;
  height: 100%;
  font-size: 26rpx;
  color: var(--text-main);
}

.hero-progress {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 28rpx;
}

.hero-progress__title {
  font-size: 34rpx;
  font-weight: 700;
}

.hero-progress__desc {
  margin-top: 10rpx;
  font-size: 24rpx;
  color: var(--text-sub);
}

.progress-ring {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.progress-ring__inner {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  font-weight: 700;
  color: var(--primary-color);
}

.hero-actions {
  display: flex;
  gap: 16rpx;
}

.quick-card {
  flex: 1;
  background: #f8f9fd;
  border-radius: 24rpx;
  padding: 20rpx 18rpx;
}

.quick-card__icon,
.news-card__icon {
  width: 64rpx;
  height: 64rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26rpx;
  font-weight: 700;
  margin-bottom: 16rpx;
}

.quick-card__title {
  font-size: 28rpx;
  font-weight: 700;
}

.quick-card__desc {
  margin-top: 8rpx;
  font-size: 22rpx;
  line-height: 1.5;
  color: var(--text-sub);
}

.tone-purple {
  background: var(--primary-light);
  color: var(--primary-color);
}

.tone-green {
  background: var(--green-bg);
  color: var(--green-color);
}

.tone-blue {
  background: var(--blue-bg);
  color: var(--blue-color);
}

.banner-swiper {
  height: 320rpx;
  overflow: hidden;
}

.banner-slide {
  position: relative;
  width: 100%;
  height: 100%;
}

.banner-image {
  width: 100%;
  height: 100%;
}

.banner-overlay {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 26rpx 24rpx;
  background: linear-gradient(180deg, transparent, rgba(44, 50, 70, 0.65));
}

.banner-title {
  margin-top: 14rpx;
  font-size: 30rpx;
  font-weight: 700;
  color: #ffffff;
}

.content-stack,
.activity-stack {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.news-card {
  display: flex;
  gap: 18rpx;
  padding: 24rpx;
}

.news-card__body {
  flex: 1;
}

.news-card__title,
.activity-title,
.hot-row__title {
  font-size: 30rpx;
  font-weight: 700;
  line-height: 1.4;
}

.news-card__content,
.activity-content {
  margin-top: 10rpx;
  font-size: 24rpx;
  line-height: 1.6;
  color: var(--text-sub);
}

.news-card__meta,
.activity-topline {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
  margin-top: 16rpx;
}

.activity-topline {
  align-items: center;
  justify-content: space-between;
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

.activity-card {
  overflow: hidden;
}

.activity-image {
  width: 100%;
  height: 240rpx;
}

.activity-body {
  padding: 24rpx;
}

.activity-meta {
  margin-top: 14rpx;
  font-size: 22rpx;
  color: var(--text-sub);
}

.hot-panel {
  padding: 10rpx 24rpx;
}

.hot-row {
  display: flex;
  align-items: center;
  gap: 18rpx;
  padding: 18rpx 0;
}

.hot-row + .hot-row {
  border-top: 1rpx solid #eef1f7;
}

.hot-row__index {
  width: 60rpx;
  height: 60rpx;
  border-radius: 20rpx;
  background: var(--primary-light);
  color: var(--primary-color);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  font-weight: 700;
}

.hot-row__body {
  flex: 1;
}

.hot-row__meta {
  margin-top: 8rpx;
  font-size: 22rpx;
  color: var(--text-sub);
}

.empty-panel {
  padding: 40rpx 24rpx;
  text-align: center;
  color: var(--text-sub);
  font-size: 26rpx;
}

.fab {
  position: fixed;
  right: 32rpx;
  bottom: calc(120rpx + env(safe-area-inset-bottom));
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: var(--primary-gradient);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 52rpx;
  box-shadow: var(--shadow-md);
}
</style>
