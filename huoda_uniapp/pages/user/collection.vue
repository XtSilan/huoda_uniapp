<template>
  <view class="page-shell collection-page">
    <view class="page-header">
      <page-nav fallback="/pages/user/user" :is-tab="true" />
      <view class="page-eyebrow">我的收藏</view>
      <view class="page-title">我的收藏</view>
      <view class="page-subtitle">在这里发现更多精彩内容</view>
    </view>

    <view class="surface-card collection-card">
      <view v-if="collections.length === 0" class="empty-state">暂无收藏内容</view>
      <view v-for="item in collections" :key="item.id" class="collection-item">
        <view class="collection-item__body" @click="openItem(item)">
          <view class="collection-item__title">{{ item.title }}</view>
          <view class="collection-item__meta">{{ formatTime(item.time) }}</view>
        </view>
        <view class="collection-item__action" @click="remove(item)">取消收藏</view>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return { collections: [] };
  },
  onShow() {
    this.loadCollections();
  },
  methods: {
    async loadCollections() {
      try {
        const res = await this.$api.user.getCollections();
        this.collections = res.list || res || [];
      } catch (error) {
        uni.showToast({ title: error.message || '获取收藏失败', icon: 'none' });
      }
    },
    async remove(item) {
      try {
        await this.$api.user.toggleCollection({
          targetType: item.targetType,
          targetId: Number(item.targetId)
        });
        this.loadCollections();
      } catch (error) {
        uni.showToast({ title: error.message || '取消失败', icon: 'none' });
      }
    },
    openItem(item) {
      const url =
        item.targetType === 'activity'
          ? `/pages/feature/publish/detail?id=${item.targetId}`
          : `/pages/info/info?id=${item.targetId}`;
      uni.navigateTo({ url });
    },
    formatTime(value) {
      return value ? new Date(value).toLocaleString() : '-';
    }
  }
};
</script>

<style scoped>
.collection-card {
  padding: 12rpx 24rpx;
}

.collection-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20rpx;
  padding: 20rpx 0;
}

.collection-item + .collection-item {
  border-top: 1rpx solid #eef1f7;
}

.collection-item__body {
  flex: 1;
}

.collection-item__title {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--text-main);
}

.collection-item__meta {
  margin-top: 10rpx;
  font-size: 24rpx;
  color: var(--text-sub);
}

.collection-item__action {
  padding: 12rpx 18rpx;
  border-radius: 18rpx;
  background: var(--danger-bg);
  color: var(--danger-color);
  font-size: 22rpx;
  font-weight: 700;
}
</style>
