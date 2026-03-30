<template>
  <view class="container">
    <view class="collection-list">
      <view v-if="collections.length === 0" class="empty">
        <text>暂无收藏内容</text>
      </view>
      <view 
        v-for="(item, index) in collections" 
        :key="index"
        class="collection-item"
      >
        <view class="collection-content">
          <view class="collection-title">{{ item.title }}</view>
          <view class="collection-time">{{ formatTime(item.time) }}</view>
        </view>
        <view class="collection-delete" @click="deleteCollection(index)">
          <text>取消收藏</text>
        </view>
      </view>
      <view v-if="collections.length > 0" class="clear-all" @click="clearCollections">
        <text>清空收藏</text>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      collections: []
    };
  },
  onLoad() {
    this.loadCollections();
  },
  methods: {
    loadCollections() {
      // 从本地存储加载收藏
      const collections = uni.getStorageSync('collections');
      if (collections) {
        this.collections = collections;
      } else {
        // 模拟数据
        this.collections = [
          {
            title: '校园科技节',
            time: new Date(Date.now() - 3600000).toISOString()
          },
          {
            title: '新生入学指南',
            time: new Date(Date.now() - 7200000).toISOString()
          }
        ];
        uni.setStorageSync('collections', this.collections);
      }
    },
    formatTime(time) {
      const date = new Date(time);
      const now = new Date();
      const diff = now - date;
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);

      if (minutes < 60) {
        return `${minutes}分钟前`;
      } else if (hours < 24) {
        return `${hours}小时前`;
      } else if (days < 7) {
        return `${days}天前`;
      } else {
        return date.toLocaleDateString();
      }
    },
    deleteCollection(index) {
      this.collections.splice(index, 1);
      uni.setStorageSync('collections', this.collections);
      uni.showToast({ title: '已取消收藏', icon: 'success' });
    },
    clearCollections() {
      uni.showModal({
        title: '清空收藏',
        content: '确定要清空所有收藏吗？',
        success: (res) => {
          if (res.confirm) {
            this.collections = [];
            uni.setStorageSync('collections', this.collections);
            uni.showToast({ title: '收藏已清空', icon: 'success' });
          }
        }
      });
    }
  }
};
</script>

<style scoped>
.container {
  padding: 16rpx;
  background-color: #f5f5f5;
  min-height: 100vh;
}

.collection-list {
  background-color: #ffffff;
  border-radius: 12rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
  padding: 16rpx;
}

.collection-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #e0e0e0;
}

.collection-item:last-child {
  border-bottom: none;
}

.collection-content {
  flex: 1;
}

.collection-title {
  font-size: 28rpx;
  font-weight: bold;
  margin-bottom: 8rpx;
  color: #333333;
}

.collection-time {
  font-size: 24rpx;
  color: #999999;
}

.collection-delete {
  font-size: 24rpx;
  color: #FF5252;
  padding: 4rpx 12rpx;
  border: 1rpx solid #FF5252;
  border-radius: 8rpx;
}

.empty {
  text-align: center;
  padding: 80rpx 0;
  color: #999999;
  font-size: 28rpx;
}

.clear-all {
  text-align: center;
  padding: 20rpx 0;
  color: #1E88E5;
  font-size: 28rpx;
  margin-top: 16rpx;
  border-top: 1rpx solid #e0e0e0;
}
</style>