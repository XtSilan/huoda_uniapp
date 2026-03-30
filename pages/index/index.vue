<template>
  <view class="container">
    <view class="search-bar">
      <input class="search-input" placeholder="搜索资讯、活动" v-model="searchText" @confirm="onSearch" />
      <button class="search-btn" @click="onSearch">搜索</button>
      <button class="ai-btn" @click="goToAI">AI</button>
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
        <text>个性推荐</text>
        <text class="more" @click="goTo('/pages/info/info')">更多</text>
      </view>
      <view v-for="item in recommendList" :key="item.id" class="card" @click="goToInfoDetail(item.id)">
        <view class="title">{{ item.title }}</view>
        <view class="content">{{ item.content }}</view>
      </view>
    </view>

    <view class="section">
      <view class="section-title">
        <text>热门资讯</text>
        <text class="more" @click="goTo('/pages/info/info')">更多</text>
      </view>
      <view v-for="item in hotList" :key="item.id" class="card" @click="goToInfoDetail(item.id)">
        <view class="title">{{ item.title }}</view>
        <view class="content">{{ item.content }}</view>
      </view>
    </view>

    <view class="section">
      <view class="section-title">
        <text>最新活动</text>
        <text class="more" @click="goTo('/pages/feature/publish/publish')">更多</text>
      </view>
      <view v-for="item in activities" :key="item.id" class="card" @click="goToPublishDetail(item.id)">
        <view class="title">{{ item.title }}</view>
        <view class="content">{{ item.content }}</view>
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
      uni.navigateTo({
        url: `/pages/info/info?search=${encodeURIComponent(this.searchText || '')}`
      });
    },
    goTo(url) {
      uni.navigateTo({ url });
    },
    goToBanner(item) {
      uni.navigateTo({
        url: item.linkUrl || `/pages/feature/banner-placeholder/banner-placeholder?id=${item.id}`
      });
    },
    goToAI() {
      uni.navigateTo({ url: '/pages/feature/ai/ai' });
    },
    goToInfoDetail(id) {
      uni.navigateTo({ url: `/pages/info/info?id=${id}` });
    },
    goToPublishDetail(id) {
      uni.navigateTo({ url: `/pages/feature/publish/detail?id=${id}` });
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
  gap: 8rpx;
  margin-bottom: 16rpx;
}

.search-input {
  flex: 1;
  background: #ffffff;
  border-radius: 10rpx;
  padding: 16rpx;
}

.search-btn,
.ai-btn {
  background: #1e88e5;
  color: #ffffff;
  border-radius: 10rpx;
}

.features {
  display: flex;
  gap: 12rpx;
  margin-bottom: 20rpx;
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

.feature-item {
  flex: 1;
  background: #ffffff;
  padding: 24rpx 0;
  text-align: center;
  border-radius: 12rpx;
  font-size: 26rpx;
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
</style>
