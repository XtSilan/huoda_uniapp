<template>
  <view class="page-shell stats-page">
    <view class="page-header">
      <page-nav fallback="/pages/user/user" :is-tab="true" />
      <view class="page-eyebrow">数据统计</view>
      <view class="page-title">看看你的校园使用节奏</view>
      <view class="page-subtitle">先用卡片化统计承接，后面再接环形图表也很顺手。</view>
    </view>

    <view class="stats-grid">
      <view class="surface-card stat-card">
        <view class="stat-card__icon tone-purple">总</view>
        <view class="stat-card__value">{{ activityStats.total }}</view>
        <view class="stat-card__label">总参与</view>
      </view>
      <view class="surface-card stat-card">
        <view class="stat-card__icon tone-green">成</view>
        <view class="stat-card__value">{{ activityStats.completed }}</view>
        <view class="stat-card__label">已完成</view>
      </view>
      <view class="surface-card stat-card">
        <view class="stat-card__icon tone-blue">进</view>
        <view class="stat-card__value">{{ activityStats.ongoing }}</view>
        <view class="stat-card__label">进行中</view>
      </view>
    </view>

    <view class="surface-card stats-section">
      <view class="section-heading">浏览统计</view>
      <view class="stats-grid stats-grid--secondary">
        <view class="stat-card compact">
          <view class="stat-card__value">{{ browseStats.total }}</view>
          <view class="stat-card__label">总浏览</view>
        </view>
        <view class="stat-card compact">
          <view class="stat-card__value">{{ browseStats.today }}</view>
          <view class="stat-card__label">今日浏览</view>
        </view>
        <view class="stat-card compact">
          <view class="stat-card__value">{{ browseStats.week }}</view>
          <view class="stat-card__label">近 7 天</view>
        </view>
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
.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16rpx;
}

.stat-card {
  padding: 24rpx 16rpx;
  text-align: center;
}

.stat-card__icon {
  width: 64rpx;
  height: 64rpx;
  margin: 0 auto 14rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26rpx;
  font-weight: 700;
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

.stat-card__value {
  font-size: 38rpx;
  font-weight: 700;
  color: var(--text-main);
}

.stat-card__label {
  margin-top: 8rpx;
  font-size: 22rpx;
  color: var(--text-sub);
}

.stats-section {
  margin-top: 28rpx;
  padding: 24rpx;
}

.stats-grid--secondary {
  margin-top: 20rpx;
}

.compact {
  background: #f7f8fc;
  border-radius: 24rpx;
}
</style>
