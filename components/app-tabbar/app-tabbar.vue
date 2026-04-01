<template>
  <view class="tabbar-shell">
    <view class="tabbar">
      <view
        v-for="item in items"
        :key="item.key"
        class="tab-item"
        :class="{ active: current === item.key }"
        @click="switchTo(item)"
      >
        <view class="icon" :class="item.iconClass">
          <view v-if="item.iconClass === 'icon-home'" class="icon-home__roof"></view>
          <view v-if="item.iconClass === 'icon-home'" class="icon-home__body"></view>
          <view v-if="item.iconClass === 'icon-discover'" class="icon-discover__circle"></view>
          <view v-if="item.iconClass === 'icon-discover'" class="icon-discover__handle"></view>
          <view v-if="item.iconClass === 'icon-message'" class="icon-message__body"></view>
          <view v-if="item.iconClass === 'icon-message'" class="icon-message__flap"></view>
          <view v-if="item.iconClass === 'icon-user'" class="icon-user__head"></view>
          <view v-if="item.iconClass === 'icon-user'" class="icon-user__body"></view>
        </view>
        <text class="tab-text">{{ item.text }}</text>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  name: 'AppTabbar',
  props: {
    current: {
      type: String,
      default: 'home'
    }
  },
  data() {
    return {
      items: [
        { key: 'home', text: '首页', url: '/pages/index/index', iconClass: 'icon-home' },
        { key: 'discover', text: '发现', url: '/pages/feature/publish/publish', iconClass: 'icon-discover' },
        { key: 'info', text: '信息', url: '/pages/info/info', iconClass: 'icon-message' },
        { key: 'user', text: '我的', url: '/pages/user/user', iconClass: 'icon-user' }
      ]
    };
  },
  methods: {
    switchTo(item) {
      if (!item || item.key === this.current) {
        return;
      }
      uni.switchTab({ url: item.url });
    }
  }
};
</script>

<style scoped>
.tabbar-shell {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 999;
}

.tabbar {
  display: flex;
  align-items: center;
  height: 118rpx;
  padding-bottom: env(safe-area-inset-bottom);
  background: rgba(255, 255, 255, 0.98);
  border-top: 1rpx solid #ebeff5;
  box-shadow: 0 -12rpx 36rpx rgba(44, 50, 70, 0.06);
}

.tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #99a1b3;
  transition: color 0.28s ease, transform 0.28s ease;
}

.tab-item.active {
  color: #6b48ff;
}

.tab-item:active {
  transform: scale(0.97);
}

.tab-text {
  margin-top: 8rpx;
  font-size: 20rpx;
  font-weight: 600;
  line-height: 1;
}

.icon {
  width: 40rpx;
  height: 40rpx;
  position: relative;
}

.icon-home__roof {
  position: absolute;
  top: 6rpx;
  left: 10rpx;
  width: 18rpx;
  height: 18rpx;
  border-top: 4rpx solid currentColor;
  border-left: 4rpx solid currentColor;
  transform: rotate(45deg);
  border-radius: 4rpx;
}

.icon-home__body {
  position: absolute;
  left: 10rpx;
  bottom: 5rpx;
  width: 18rpx;
  height: 16rpx;
  border-left: 4rpx solid currentColor;
  border-right: 4rpx solid currentColor;
  border-bottom: 4rpx solid currentColor;
  border-radius: 0 0 4rpx 4rpx;
  background: #ffffff;
}

.icon-discover__circle {
  position: absolute;
  top: 5rpx;
  left: 5rpx;
  width: 18rpx;
  height: 18rpx;
  border: 4rpx solid currentColor;
  border-radius: 50%;
}

.icon-discover__handle {
  position: absolute;
  right: 9rpx;
  bottom: 7rpx;
  width: 4rpx;
  height: 14rpx;
  border-radius: 4rpx;
  background: currentColor;
  transform: rotate(-45deg);
  transform-origin: bottom center;
}

.icon-message__body {
  position: absolute;
  top: 10rpx;
  left: 4rpx;
  width: 26rpx;
  height: 18rpx;
  border: 4rpx solid currentColor;
  border-radius: 4rpx;
}

.icon-message__flap {
  position: absolute;
  top: 8rpx;
  left: 9rpx;
  width: 14rpx;
  height: 14rpx;
  border-right: 4rpx solid currentColor;
  border-bottom: 4rpx solid currentColor;
  transform: rotate(45deg) scaleY(0.7);
}

.icon-user__head {
  position: absolute;
  top: 3rpx;
  left: 11rpx;
  width: 14rpx;
  height: 14rpx;
  border: 4rpx solid currentColor;
  border-radius: 50%;
}

.icon-user__body {
  position: absolute;
  left: 6rpx;
  bottom: 4rpx;
  width: 24rpx;
  height: 10rpx;
  border: 4rpx solid currentColor;
  border-bottom: none;
  border-radius: 16rpx 16rpx 0 0;
}
</style>
