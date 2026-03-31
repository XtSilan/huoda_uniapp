<template>
  <view class="page-shell history-page">
    <view class="page-header">
      <view class="page-eyebrow">历史记录</view>
      <view class="page-title">继续上次浏览过的内容</view>
      <view class="page-subtitle">浏览历史和活动参与拆成卡片切换，不再是原始列表。</view>
    </view>

    <view class="surface-card tabs-card">
      <view class="tab" :class="{ active: activeTab === 'browse' }" @click="activeTab = 'browse'">浏览历史</view>
      <view class="tab" :class="{ active: activeTab === 'activity' }" @click="activeTab = 'activity'">活动参与</view>
    </view>

    <view class="surface-card list-card">
      <view v-if="currentList.length === 0" class="empty-state">暂无记录</view>
      <view v-for="item in currentList" :key="item.id" class="history-item" @click="activeTab === 'browse' ? openBrowse(item) : openActivity(item)">
        <view class="history-item__body">
          <view class="history-item__title">{{ item.title }}</view>
          <view class="history-item__meta">{{ getMetaText(item) }}</view>
        </view>
        <tag-badge v-if="activeTab === 'activity'" :text="item.status || '已参与'" tone="green" />
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
  computed: {
    currentList() {
      return this.activeTab === 'browse' ? this.browseHistory : this.activityHistory;
    }
  },
  onShow() {
    this.loadHistory();
  },
  methods: {
    async loadHistory() {
      try {
        const res = await this.$api.user.getHistory();
        this.browseHistory = res.browse || [];
        this.activityHistory = res.activities || [];
      } catch (error) {
        uni.showToast({ title: error.message || '获取历史失败', icon: 'none' });
      }
    },
    getMetaText(item) {
      if (this.activeTab === 'activity') {
        return `${item.organizer || '校园组织'} · ${this.formatTime(item.time)}`;
      }
      return this.formatTime(item.time);
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
      return value ? new Date(value).toLocaleString() : '-';
    }
  }
};
</script>

<style scoped>
.tabs-card,
.list-card {
  padding: 10rpx;
}

.list-card {
  margin-top: 28rpx;
  padding: 12rpx 24rpx;
}

.tabs-card {
  display: flex;
  gap: 10rpx;
}

.tab {
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

.tab.active {
  background: var(--primary-light);
  color: var(--primary-color);
}

.history-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  padding: 20rpx 0;
}

.history-item + .history-item {
  border-top: 1rpx solid #eef1f7;
}

.history-item__body {
  flex: 1;
}

.history-item__title {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--text-main);
}

.history-item__meta {
  margin-top: 10rpx;
  font-size: 24rpx;
  color: var(--text-sub);
}
</style>
