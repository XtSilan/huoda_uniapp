<template>
  <view class="container">
    <view class="info-section">
      <view class="activity-title">{{ activity.title }}</view>
      <view class="meta-item">组织方：{{ activity.organizer }}</view>
      <view class="meta-item">时间：{{ formatDate(activity.startTime) }} - {{ formatDate(activity.endTime) }}</view>
      <view class="meta-item">地点：{{ activity.location }}</view>
      <view class="meta-item">报名人数：{{ activity.applyCount }}</view>
    </view>

    <view class="content-section">
      <view class="section-title">活动详情</view>
      <view class="content">{{ activity.content }}</view>
    </view>

    <view class="bottom-bar">
      <button class="apply-btn" :loading="applying" @click="applyActivity">立即报名</button>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      applying: false,
      activity: {
        id: '',
        title: '',
        content: '',
        startTime: '',
        endTime: '',
        location: '',
        organizer: '',
        applyCount: 0
      }
    };
  },
  onLoad(options) {
    if (options.id) {
      this.loadActivityDetail(options.id);
    }
  },
  methods: {
    async loadActivityDetail(id) {
      uni.showLoading({ title: '加载中' });
      try {
        this.activity = await this.$api.publish.getDetail(id);
      } catch (error) {
        uni.showToast({ title: error.message || '加载失败', icon: 'none' });
      } finally {
        uni.hideLoading();
      }
    },
    async applyActivity() {
      this.applying = true;
      try {
        this.activity = await this.$api.publish.apply(this.activity.id);
        uni.showToast({ title: '报名成功', icon: 'success' });
      } catch (error) {
        uni.showToast({ title: error.message || '报名失败', icon: 'none' });
      } finally {
        this.applying = false;
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
  min-height: 100vh;
  background: #f5f5f5;
}

.info-section,
.content-section {
  background: #ffffff;
  padding: 24rpx;
  margin: 16rpx;
  border-radius: 12rpx;
}

.activity-title {
  font-size: 36rpx;
  font-weight: 700;
  margin-bottom: 20rpx;
}

.meta-item,
.content {
  font-size: 28rpx;
  line-height: 1.7;
  margin-bottom: 12rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: 700;
  margin-bottom: 16rpx;
}

.bottom-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 16rpx;
  background: #ffffff;
}

.apply-btn {
  background: #1e88e5;
  color: #ffffff;
  border-radius: 10rpx;
}
</style>
