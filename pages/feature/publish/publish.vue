<template>
  <view class="container">
    <view class="section">
      <view class="section-title">活动列表</view>
      <view class="activity-list">
        <view v-for="item in activityList" :key="item.id" class="activity-item">
          <view class="activity-info" @click="goToDetail(item)">
            <view class="activity-title">{{ item.title }}</view>
            <view class="activity-meta">
              <text>{{ item.organizer }}</text>
              <text>{{ formatDate(item.startTime) }}</text>
            </view>
            <view class="activity-location">{{ item.location }}</view>
          </view>
          <view class="activity-actions">
            <view class="activity-status">{{ item.status }}</view>
            <view class="delete-btn" @click.stop="deleteActivity(item.id)">删除</view>
          </view>
        </view>
      </view>
    </view>

    <view class="section">
      <view class="section-title">我报名的活动</view>
      <view class="activity-list">
        <view v-if="myActivityList.length === 0" class="empty">暂无报名记录</view>
        <view v-for="item in myActivityList" :key="item.id" class="activity-item" @click="goToDetail(item)">
          <view class="activity-info">
            <view class="activity-title">{{ item.title }}</view>
            <view class="activity-meta">
              <text>{{ item.organizer }}</text>
              <text>{{ formatDate(item.startTime) }}</text>
            </view>
            <view class="activity-location">{{ item.location }}</view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      activityList: [],
      myActivityList: []
    };
  },
  onShow() {
    this.loadData();
  },
  methods: {
    async loadData() {
      try {
        const [activityRes, applicationRes] = await Promise.all([
          this.$api.publish.getList(),
          this.$api.publish.getApplications()
        ]);
        this.activityList = activityRes.list || [];
        this.myActivityList = applicationRes.list || [];
      } catch (error) {
        uni.showToast({ title: error.message || '获取活动失败', icon: 'none' });
      }
    },
    goToDetail(item) {
      uni.navigateTo({
        url: `/pages/feature/publish/detail?id=${item.id}`
      });
    },
    async deleteActivity(id) {
      try {
        await this.$api.publish.remove(id);
        uni.showToast({ title: '删除成功', icon: 'success' });
        this.loadData();
      } catch (error) {
        uni.showToast({ title: error.message || '删除失败', icon: 'none' });
      }
    },
    formatDate(dateString) {
      return dateString ? new Date(dateString).toLocaleString() : '-';
    }
  }
};
</script>

<style scoped>
.container {
  padding: 16rpx;
}

.section {
  margin-bottom: 24rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: 700;
  margin-bottom: 12rpx;
}

.activity-list {
  background: #ffffff;
  border-radius: 12rpx;
  padding: 16rpx;
}

.activity-item {
  display: flex;
  justify-content: space-between;
  gap: 16rpx;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #ececec;
}

.activity-item:last-child {
  border-bottom: none;
}

.activity-info {
  flex: 1;
}

.activity-title {
  font-size: 30rpx;
  font-weight: 700;
}

.activity-meta,
.activity-location,
.activity-status,
.delete-btn,
.empty {
  font-size: 24rpx;
  color: #666666;
  margin-top: 8rpx;
}

.delete-btn {
  color: #d14343;
}
</style>
