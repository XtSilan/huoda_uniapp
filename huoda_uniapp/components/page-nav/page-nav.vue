<template>
  <view class="page-nav" @click="goBack">
    <text class="page-nav__icon">&#8592;</text>
  </view>
</template>

<script>
export default {
  name: 'PageNav',
  props: {
    fallback: {
      type: String,
      default: '/pages/index/index'
    },
    isTab: {
      type: Boolean,
      default: false
    }
  },
  methods: {
    goBack() {
      const pages = getCurrentPages();
      if (pages.length > 1) {
        uni.navigateBack();
        return;
      }

      const current = pages.length ? '/' + pages[pages.length - 1].route : '';
      if (!this.fallback || this.fallback === current) {
        return;
      }

      if (this.isTab) {
        uni.redirectTo({ url: this.fallback });
        return;
      }

      uni.navigateTo({ url: this.fallback });
    }
  }
};
</script>

<style scoped>
.page-nav {
  width: 72rpx;
  height: 72rpx;
  border-radius: 22rpx;
  background: rgba(255, 255, 255, 0.88);
  box-shadow: 0 10rpx 28rpx rgba(44, 50, 70, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
}

.page-nav__icon {
  font-size: 34rpx;
  color: var(--text-main);
  font-weight: 700;
  line-height: 1;
}
</style>
