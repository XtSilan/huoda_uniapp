<template>
  <view class="container">
    <view class="collection-list card">
      <view v-if="collections.length === 0" class="empty">暂无收藏内容</view>
      <view v-for="item in collections" :key="item.id" class="collection-item">
        <view class="collection-content" @click="openItem(item)">
          <view class="collection-title">{{ item.title }}</view>
          <view class="collection-time">{{ formatTime(item.time) }}</view>
        </view>
        <view class="collection-delete" @click="remove(item)">取消收藏</view>
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
        this.collections = res.list || [];
      } catch (error) {
        uni.showToast({ title: error.message || '获取收藏失败', icon: 'none' });
      }
    },
    async remove(item) {
      await this.$api.user.toggleCollection({
        targetType: item.targetType,
        targetId: Number(item.targetId)
      });
      this.loadCollections();
    },
    openItem(item) {
      const url =
        item.targetType === 'activity'
          ? `/pages/feature/publish/detail?id=${item.targetId}`
          : `/pages/info/info?id=${item.targetId}`;
      uni.navigateTo({ url });
    },
    formatTime(value) {
      return new Date(value).toLocaleString();
    }
  }
};
</script>

<style scoped>
.container { padding: 16rpx; }
.collection-item { display: flex; justify-content: space-between; padding: 16rpx 0; border-bottom: 1rpx solid #ececec; }
.collection-item:last-child { border-bottom: none; }
.collection-title { font-size: 28rpx; font-weight: 600; }
.collection-time { margin-top: 8rpx; color: #888; font-size: 24rpx; }
.collection-delete { color: #d14343; font-size: 24rpx; }
.empty { text-align: center; padding: 80rpx 0; color: #999; }
</style>
