<template>
  <view class="container">
    <!-- 标签切换 -->
    <view class="tabs">
      <view 
        class="tab" 
        :class="{ active: activeTab === 'browse' }" 
        @click="activeTab = 'browse'"
      >
        浏览历史
      </view>
      <view 
        class="tab" 
        :class="{ active: activeTab === 'activity' }" 
        @click="activeTab = 'activity'"
      >
        活动参与
      </view>
    </view>

    <!-- 浏览历史 -->
    <view v-if="activeTab === 'browse'" class="history-list">
      <view v-if="browseHistory.length === 0" class="empty">
        <text>暂无浏览历史</text>
      </view>
      <view 
        v-for="(item, index) in browseHistory" 
        :key="index"
        class="history-item"
      >
        <view class="history-content">
          <view class="history-title">{{ item.title }}</view>
          <view class="history-time">{{ formatTime(item.time) }}</view>
        </view>
        <view class="history-delete" @click="deleteBrowseHistory(index)">
          <text>删除</text>
        </view>
      </view>
      <view v-if="browseHistory.length > 0" class="clear-all" @click="clearBrowseHistory">
        <text>清空历史</text>
      </view>
    </view>

    <!-- 活动参与历史 -->
    <view v-if="activeTab === 'activity'" class="history-list">
      <view v-if="activityHistory.length === 0" class="empty">
        <text>暂无活动参与记录</text>
      </view>
      <view 
        v-for="(item, index) in activityHistory" 
        :key="index"
        class="history-item"
      >
        <view class="history-content">
          <view class="history-title">{{ item.title }}</view>
          <view class="history-meta">
            <text class="history-organizer">{{ item.organizer }}</text>
            <text class="history-time">{{ formatTime(item.time) }}</text>
          </view>
        </view>
        <view class="history-status" :class="item.status">
          {{ item.status === 'completed' ? '已完成' : item.status === 'ongoing' ? '进行中' : '已报名' }}
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
  onLoad() {
    this.loadHistory();
  },
  methods: {
    loadHistory() {
      // 从本地存储加载历史记录
      const browseHistory = uni.getStorageSync('browseHistory');
      if (browseHistory) {
        this.browseHistory = browseHistory;
      } else {
        // 模拟数据
        this.browseHistory = [
          {
            title: '校园科技节',
            time: new Date(Date.now() - 3600000).toISOString()
          },
          {
            title: '新生入学指南',
            time: new Date(Date.now() - 7200000).toISOString()
          },
          {
            title: '校园招聘会',
            time: new Date(Date.now() - 86400000).toISOString()
          }
        ];
        uni.setStorageSync('browseHistory', this.browseHistory);
      }

      const activityHistory = uni.getStorageSync('activityHistory');
      if (activityHistory) {
        this.activityHistory = activityHistory;
      } else {
        // 模拟数据
        this.activityHistory = [
          {
            title: '校园文化节',
            organizer: '学生会',
            time: new Date(Date.now() - 86400000).toISOString(),
            status: 'completed'
          },
          {
            title: '学术讲座',
            organizer: '学术部',
            time: new Date(Date.now() - 172800000).toISOString(),
            status: 'ongoing'
          }
        ];
        uni.setStorageSync('activityHistory', this.activityHistory);
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
    deleteBrowseHistory(index) {
      this.browseHistory.splice(index, 1);
      uni.setStorageSync('browseHistory', this.browseHistory);
    },
    clearBrowseHistory() {
      uni.showModal({
        title: '清空历史',
        content: '确定要清空所有浏览历史吗？',
        success: (res) => {
          if (res.confirm) {
            this.browseHistory = [];
            uni.setStorageSync('browseHistory', this.browseHistory);
            uni.showToast({ title: '历史已清空', icon: 'success' });
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

.tabs {
  display: flex;
  background-color: #ffffff;
  border-radius: 12rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
}

.tab {
  flex: 1;
  text-align: center;
  padding: 20rpx;
  font-size: 28rpx;
  color: #666666;
  border-bottom: 2rpx solid transparent;
}

.tab.active {
  color: #1E88E5;
  border-bottom-color: #1E88E5;
  font-weight: bold;
}

.history-list {
  background-color: #ffffff;
  border-radius: 12rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
  padding: 16rpx;
}

.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #e0e0e0;
}

.history-item:last-child {
  border-bottom: none;
}

.history-content {
  flex: 1;
}

.history-title {
  font-size: 28rpx;
  font-weight: bold;
  margin-bottom: 8rpx;
  color: #333333;
}

.history-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.history-organizer {
  font-size: 24rpx;
  color: #666666;
}

.history-time {
  font-size: 24rpx;
  color: #999999;
}

.history-delete {
  font-size: 24rpx;
  color: #FF5252;
  padding: 4rpx 12rpx;
  border: 1rpx solid #FF5252;
  border-radius: 8rpx;
}

.history-status {
  font-size: 24rpx;
  padding: 4rpx 12rpx;
  border-radius: 12rpx;
  align-self: flex-start;
  margin-top: 8rpx;
}

.history-status.completed {
  background-color: #4CAF50;
  color: #ffffff;
}

.history-status.ongoing {
  background-color: #FFC107;
  color: #ffffff;
}

.history-status.registered {
  background-color: #1E88E5;
  color: #ffffff;
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