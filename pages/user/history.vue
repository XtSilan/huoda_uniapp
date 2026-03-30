<template>
  <view class="container">
    <view class="tabs card">
      <view class="tab" :class="{ active: activeTab === 'browse' }" @click="activeTab = 'browse'">浏览历史</view>
      <view class="tab" :class="{ active: activeTab === 'activity' }" @click="activeTab = 'activity'">活动参与</view>
    </view>
    <view class="card">
      <view v-if="activeTab === 'browse'">
        <view v-for="item in browseHistory" :key="item.id" class="history-item" @click="openBrowse(item)">
          <view>
            <view class="history-title">{{ item.title }}</view>
            <view class="history-time">{{ formatTime(item.time) }}</view>
          </view>
        </view>
      </view>
      <view v-else>
        <view v-for="item in activityHistory" :key="item.id" class="history-item" @click="openActivity(item)">
          <view>
            <view class="history-title">{{ item.title }}</view>
            <view class="history-time">{{ item.organizer }} · {{ formatTime(item.time) }}</view>
          </view>
          <view class="history-status">{{ item.status }}</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      activeTab: 'browse',
      browseHistory: [],
      activityHistory: []
    };
  },
  onShow() {
    this.loadHistory();
  },
  methods: {
    async loadHistory() {
      const res = await this.$api.user.getHistory();
      this.browseHistory = res.browse || [];
      this.activityHistory = res.activities || [];
    },
    openBrowse(item) {
      const url =
        item.targetType === 'activity'
          ? `/pages/feature/publish/detail?id=${item.targetId}`
          : `/pages/info/info?id=${item.targetId}`;
      uni.navigateTo({ url });
    },
    openActivity(item) {
      uni.navigateTo({ url: `/pages/feature/publish/detail?id=${item.id}` });
    },
    formatTime(value) {
      return new Date(value).toLocaleString();
    }
  }
};
</script>

<style scoped>
.container { padding: 16rpx; }
.tabs { display: flex; margin-bottom: 16rpx; }
.tab { flex: 1; text-align: center; padding: 16rpx 0; }
.tab.active { color: #1e88e5; font-weight: 700; }
.history-item { display: flex; justify-content: space-between; padding: 16rpx 0; border-bottom: 1rpx solid #ececec; }
.history-item:last-child { border-bottom: none; }
.history-title { font-size: 28rpx; font-weight: 600; }
.history-time, .history-status { margin-top: 8rpx; font-size: 24rpx; color: #777; }
</style>
