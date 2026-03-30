<template>
  <view class="container">
    <!-- 活动图片 -->
    <view class="image-container" v-if="activity.images && activity.images.length > 0">
      <swiper indicator-dots circular autoplay>
        <swiper-item v-for="(image, index) in activity.images" :key="index">
          <image :src="image" mode="aspectFill"></image>
        </swiper-item>
      </swiper>
    </view>

    <!-- 活动信息 -->
    <view class="info-section">
      <view class="activity-title">{{ activity.title }}</view>
      <view class="activity-meta">
        <view class="meta-item">
          <text class="meta-label">组织方：</text>
          <text class="meta-value">{{ activity.organizer }}</text>
        </view>
        <view class="meta-item">
          <text class="meta-label">时间：</text>
          <text class="meta-value">{{ formatDate(activity.startTime) }} 至 {{ formatDate(activity.endTime) }}</text>
        </view>
        <view class="meta-item">
          <text class="meta-label">地点：</text>
          <text class="meta-value">{{ activity.location }}</text>
        </view>
        <view class="meta-item">
          <text class="meta-label">报名人数：</text>
          <text class="meta-value">{{ activity.applyCount }} 人</text>
        </view>
      </view>
    </view>

    <!-- 活动内容 -->
    <view class="content-section">
      <view class="section-title">活动详情</view>
      <view class="content">{{ activity.content }}</view>
    </view>

    <!-- 底部按钮 -->
    <view class="bottom-bar">
      <button class="apply-btn" @click="applyActivity">立即报名</button>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      activity: {
        id: '',
        title: '',
        content: '',
        startTime: '',
        endTime: '',
        location: '',
        organizer: '',
        applyCount: 0,
        images: []
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
      // 从本地存储获取活动详情
      uni.showLoading({ title: '加载中...' });
      setTimeout(() => {
        uni.hideLoading();
        const activities = uni.getStorageSync('activities') || [];
        const activity = activities.find(item => item.id === id);
        if (activity) {
          this.activity = {
            ...activity,
            applyCount: activity.applyCount || 0
          };
        } else {
          // 如果没有找到活动，显示默认数据
          this.activity = {
            id: id,
            title: '活动不存在',
            content: '抱歉，该活动不存在或已被删除',
            startTime: new Date().toISOString(),
            endTime: new Date().toISOString(),
            location: '',
            organizer: '',
            applyCount: 0,
            images: []
          };
        }
      }, 1000);
    },
    applyActivity() {
      uni.showModal({
        title: '报名确认',
        content: '确定要报名参加这个活动吗？',
        success: (res) => {
          if (res.confirm) {
            uni.showLoading({ title: '报名中...' });
            setTimeout(() => {
              uni.hideLoading();
              uni.showToast({ title: '报名成功', icon: 'success' });
              this.activity.applyCount++;
            }, 1000);
          }
        }
      });
    },
    formatDate(dateString) {
      const date = new Date(dateString);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    }
  }
};
</script>

<style scoped>
.container {
  background-color: #f5f5f5;
  min-height: 100vh;
}

.image-container {
  width: 100%;
  height: 400rpx;
  overflow: hidden;
}

.image-container swiper {
  width: 100%;
  height: 100%;
}

.image-container image {
  width: 100%;
  height: 100%;
}

.info-section {
  background-color: #ffffff;
  padding: 24rpx;
  margin-bottom: 16rpx;
}

.activity-title {
  font-size: 36rpx;
  font-weight: bold;
  margin-bottom: 16rpx;
  color: #333333;
}

.activity-meta {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.meta-item {
  display: flex;
  align-items: flex-start;
}

.meta-label {
  font-size: 28rpx;
  color: #666666;
  width: 120rpx;
}

.meta-value {
  font-size: 28rpx;
  color: #333333;
  flex: 1;
}

.content-section {
  background-color: #ffffff;
  padding: 24rpx;
  margin-bottom: 100rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: bold;
  margin-bottom: 16rpx;
  color: #333333;
}

.content {
  font-size: 28rpx;
  line-height: 1.5;
  color: #333333;
}

.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: #ffffff;
  padding: 16rpx;
  border-top: 1rpx solid #e0e0e0;
  box-shadow: 0 -2rpx 8rpx rgba(0, 0, 0, 0.1);
}

.apply-btn {
  width: 100%;
  padding: 16rpx;
  background-color: #1E88E5;
  color: #ffffff;
  border-radius: 8rpx;
  font-size: 32rpx;
}
</style>
