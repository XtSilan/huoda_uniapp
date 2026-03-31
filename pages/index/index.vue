<template>
  <view class="container">
    <view class="search-bar">
      <input class="search-input" placeholder="搜索资讯、活动" v-model="searchText" @confirm="onSearch" />
      <button class="search-btn" @click="onSearch">搜索</button>
    </view>

    <view class="features">
      <view class="feature-item" @click="goTo('/pages/feature/run/run')">校园乐跑</view>
      <view class="feature-item" @click="goTo('/pages/feature/sign/sign')">班级签到</view>
      <view class="feature-item" @click="goTo('/pages/feature/publish/create')">活动发布</view>
    </view>

    <view class="banner-section" v-if="banners.length">
      <swiper class="banner-swiper" circular autoplay indicator-dots>
        <swiper-item v-for="item in banners" :key="item.id" @click="goToBanner(item)">
          <image class="banner-image" :src="item.imageUrl" mode="aspectFill"></image>
        </swiper-item>
      </swiper>
    </view>

    <view class="section">
      <view class="section-title">
        <text>个性化推荐</text>
        <text class="more" @click="switchToInfo()">更多</text>
      </view>
      <view v-for="item in recommendList" :key="item.id" class="card" @click="goToInfoDetail(item.id)">
        <view class="title">{{ item.title }}</view>
        <view class="content">{{ item.summary || item.content }}</view>
        <view class="meta">{{ item.source }}</view>
      </view>
    </view>

    <view class="section">
      <view class="section-title">
        <text>热门资讯</text>
        <text class="more" @click="switchToInfo()">更多</text>
      </view>
      <view v-for="item in hotList" :key="item.id" class="card" @click="goToInfoDetail(item.id)">
        <view class="title">{{ item.title }}</view>
        <view class="content">{{ item.summary || item.content }}</view>
        <view class="meta">{{ formatTime(item.publishTime) }}</view>
      </view>
    </view>

    <view class="section">
      <view class="section-title">
        <text>最新活动</text>
        <text class="more" @click="switchToDiscover()">更多</text>
      </view>
      <view v-for="item in activities" :key="item.id" class="activity-card" @click="goToPublishDetail(item.id)">
        <image v-if="item.images && item.images.length" class="activity-image" :src="item.images[0]" mode="aspectFill"></image>
        <view class="activity-body">
          <view class="title">{{ item.title }}</view>
          <view class="content">{{ item.summary || item.content }}</view>
          <view class="activity-meta">
            <text>{{ item.activityType || '活动' }}</text>
            <text>{{ item.location }}</text>
            <text>{{ formatDate(item.startTime) }}</text>
          </view>
        </view>
      </view>
    </view>
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
      uni.switchTab({ url: '/pages/info/info' });
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
      uni.switchTab({ url: '/pages/info/info' });
    },
    switchToDiscover() {
      uni.switchTab({ url: '/pages/feature/publish/publish' });
    },
    formatTime(value) {
      return value ? new Date(value).toLocaleString() : '-';
    },
    formatDate(value) {
      if (!value) {
        return '-';
      }
      const date = new Date(value);
      return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
    }
  }
};
</script>

<style scoped>
.container {
  padding: 16rpx;
}

.search-bar {
  display: flex;
  gap: 12rpx;
  margin-bottom: 18rpx;
}

.search-input {
  flex: 1;
  background: #ffffff;
  border-radius: 12rpx;
  padding: 18rpx 20rpx;
}

.search-btn {
  background: #1e88e5;
  color: #ffffff;
  border-radius: 12rpx;
  padding: 0 28rpx;
}

.features {
  display: flex;
  gap: 12rpx;
  margin-bottom: 20rpx;
}

.feature-item {
  flex: 1;
  background: #ffffff;
  padding: 24rpx 0;
  text-align: center;
  border-radius: 12rpx;
  font-size: 26rpx;
}

.banner-section {
  margin-bottom: 24rpx;
}

.banner-swiper {
  height: 260rpx;
  border-radius: 16rpx;
  overflow: hidden;
}

.banner-image {
  width: 100%;
  height: 100%;
}

.section {
  margin-bottom: 24rpx;
}

.section-title {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12rpx;
  font-size: 32rpx;
  font-weight: 700;
}

.more {
  font-size: 24rpx;
  color: #1e88e5;
}

.card,
.activity-card {
  background: #ffffff;
  border-radius: 16rpx;
  padding: 20rpx;
  margin-bottom: 14rpx;
}

.activity-card {
  padding: 0;
  overflow: hidden;
}

.activity-image {
  width: 100%;
  height: 220rpx;
}

.activity-body {
  padding: 20rpx;
}

.title {
  font-size: 30rpx;
  font-weight: 700;
  color: #222222;
}

.content {
  margin-top: 10rpx;
  color: #666666;
  font-size: 24rpx;
}

.meta,
.activity-meta {
  margin-top: 12rpx;
  font-size: 22rpx;
  color: #999999;
}

.activity-meta {
  display: flex;
  justify-content: space-between;
  gap: 10rpx;
}
</style>
