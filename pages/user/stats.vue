<template>
  <view class="container">
    <view class="card section">
      <view class="section-title">活动参与统计</view>
      <view class="stats-card">
        <view class="stats-item"><view class="stats-value">{{ activityStats.total }}</view><view class="stats-label">总参与</view></view>
        <view class="stats-item"><view class="stats-value">{{ activityStats.completed }}</view><view class="stats-label">已完成</view></view>
        <view class="stats-item"><view class="stats-value">{{ activityStats.ongoing }}</view><view class="stats-label">进行中</view></view>
      </view>
    </view>
    <view class="card section">
      <view class="section-title">浏览统计</view>
      <view class="stats-card">
        <view class="stats-item"><view class="stats-value">{{ browseStats.total }}</view><view class="stats-label">总浏览</view></view>
        <view class="stats-item"><view class="stats-value">{{ browseStats.today }}</view><view class="stats-label">今日浏览</view></view>
        <view class="stats-item"><view class="stats-value">{{ browseStats.week }}</view><view class="stats-label">近7天</view></view>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      activityStats: { total: 0, completed: 0, ongoing: 0 },
      browseStats: { total: 0, today: 0, week: 0 }
    };
  },
  onShow() {
    this.loadStats();
  },
  methods: {
    async loadStats() {
      try {
        const res = await this.$api.user.getStats();
        this.activityStats = res.activityStats || this.activityStats;
        this.browseStats = res.browseStats || this.browseStats;
      } catch (error) {
        uni.showToast({ title: error.message || '获取统计失败', icon: 'none' });
      }
    }
  }
};
</script>

<style scoped>
.container { padding: 16rpx; }
.section { margin-bottom: 24rpx; }
.section-title { font-size: 30rpx; font-weight: 700; margin-bottom: 16rpx; }
.stats-card { display: flex; }
.stats-item { flex: 1; text-align: center; }
.stats-value { font-size: 40rpx; font-weight: 700; color: #1e88e5; }
.stats-label { margin-top: 8rpx; font-size: 24rpx; color: #666; }
</style>
