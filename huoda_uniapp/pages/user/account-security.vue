<template>
  <view class="page-shell account-security-page">
    <view class="page-header">
      <page-nav fallback="/pages/user/settings" />
      <view class="page-eyebrow">账户安全</view>
      <view class="page-title">账号与安全</view>
      <view class="page-subtitle">集中管理你的账号与提醒配置</view>
    </view>

    <view class="surface-card section-card section-card--compact">
      <view class="entry-item clickable" @click="goToChangePassword">
        <view class="setting-main">
          <view class="setting-text">修改密码</view>
          <view class="setting-desc">修改登录密码，提升账号安全性</view>
        </view>
        <view class="arrow">&#8250;</view>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  methods: {
    goToChangePassword() {
      uni.navigateTo({ url: '/pages/user/change-password' });
    }
  }
};
</script>

<style scoped>
.section-card {
  padding: 28rpx 24rpx;
}

.section-card--compact {
  padding-top: 20rpx;
  padding-bottom: 20rpx;
}

.entry-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 24rpx;
  padding: 22rpx 0;
}

.section-card--compact .entry-item {
  padding-top: 12rpx;
  padding-bottom: 12rpx;
}

.clickable:active {
  opacity: 0.85;
}

.setting-main {
  flex: 1;
}

.setting-text {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--text-main);
}

.setting-desc {
  margin-top: 8rpx;
  font-size: 24rpx;
  line-height: 1.6;
  color: var(--text-sub);
}

.section-card--compact .setting-desc {
  margin-top: 0;
}

.arrow {
  font-size: 36rpx;
  color: var(--text-light);
}
</style>
