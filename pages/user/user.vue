<template>
  <view class="container">
    <view class="user-info">
      <view class="avatar">
        <image :src="userInfo.avatarUrl || '/static/avatar.png'" mode="aspectFill"></image>
      </view>
      <view class="info">
        <view class="name">{{ userInfo.name || '未登录用户' }}</view>
        <view class="student-id">{{ userInfo.studentId || '-' }}</view>
        <view class="department">{{ userInfo.department || '请先完善资料' }}</view>
      </view>
    </view>

    <view class="function-list">
      <view class="function-item" @click="goTo('/pages/user/profile')">
        <view class="function-text">编辑资料</view>
      </view>
      <view class="function-item" @click="goTo('/pages/user/personalization')">
        <view class="function-text">个性化设置</view>
      </view>
      <view class="function-item" @click="goTo('/pages/user/collection')">
        <view class="function-text">我的收藏</view>
      </view>
      <view class="function-item" @click="goTo('/pages/user/history')">
        <view class="function-text">浏览历史</view>
      </view>
      <view class="function-item" @click="goTo('/pages/user/stats')">
        <view class="function-text">数据统计</view>
      </view>
      <view class="function-item" @click="goTo('/pages/user/settings')">
        <view class="function-text">设置</view>
      </view>
      <view class="function-item logout" @click="logout">
        <view class="function-text">退出登录</view>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      userInfo: {
        name: '',
        studentId: '',
        department: '',
        avatarUrl: ''
      }
    };
  },
  onShow() {
    this.checkLoginStatus();
    this.loadUserInfo();
  },
  methods: {
    checkLoginStatus() {
      const token = uni.getStorageSync('token');
      if (!token) {
        uni.navigateTo({ url: '/pages/login/login' });
      }
    },
    async loadUserInfo() {
      try {
        const profile = await this.$api.user.getProfile();
        this.userInfo = profile;
        uni.setStorageSync('userInfo', profile);
      } catch (error) {
        const localUser = uni.getStorageSync('userInfo');
        if (localUser) {
          this.userInfo = localUser;
        }
      }
    },
    goTo(url) {
      uni.navigateTo({ url });
    },
    logout() {
      uni.removeStorageSync('token');
      uni.removeStorageSync('isLoggedIn');
      uni.removeStorageSync('userInfo');
      uni.navigateTo({ url: '/pages/login/login' });
    }
  }
};
</script>

<style scoped>
.container {
  padding: 16rpx;
}

.user-info {
  display: flex;
  align-items: center;
  background: #1e88e5;
  color: #ffffff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
}

.avatar {
  width: 120rpx;
  height: 120rpx;
  border-radius: 60rpx;
  overflow: hidden;
  margin-right: 24rpx;
}

.avatar image {
  width: 100%;
  height: 100%;
}

.name {
  font-size: 36rpx;
  font-weight: 700;
}

.student-id,
.department {
  font-size: 26rpx;
  margin-top: 8rpx;
}

.function-list {
  background: #ffffff;
  border-radius: 12rpx;
  overflow: hidden;
}

.function-item {
  padding: 24rpx 20rpx;
  border-bottom: 1rpx solid #ececec;
}

.function-item:last-child {
  border-bottom: none;
}

.logout {
  color: #d14343;
}

.function-text {
  font-size: 28rpx;
}
</style>
