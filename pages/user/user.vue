<template>
  <view class="container">
    <!-- 用户信息 -->
    <view class="user-info">
      <view class="avatar">
        <image :src="userInfo.avatarUrl || '/static/avatar.png'" mode="aspectFill"></image>
      </view>
      <view class="info">
        <view class="name">{{ userInfo.name }}</view>
        <view class="student-id">{{ userInfo.studentId }}</view>
        <view class="department">{{ userInfo.department }}</view>
      </view>
    </view>

    <!-- 功能列表 -->
    <view class="function-list">
      <view class="function-item" @click="goToEditProfile">
        <view class="function-icon">👤</view>
        <view class="function-text">编辑资料</view>
        <view class="function-arrow">›</view>
      </view>
      
      <view class="function-item" @click="goToPersonalization">
        <view class="function-icon">🎨</view>
        <view class="function-text">个性化设置</view>
        <view class="function-arrow">›</view>
      </view>
      
      <view class="function-item" @click="goToCollection">
        <view class="function-icon">⭐</view>
        <view class="function-text">我的收藏</view>
        <view class="function-arrow">›</view>
      </view>
      <view class="function-item" @click="goToHistory">
        <view class="function-icon">📋</view>
        <view class="function-text">浏览历史</view>
        <view class="function-arrow">›</view>
      </view>
      <view class="function-item" @click="goToStats">
        <view class="function-icon">📊</view>
        <view class="function-text">数据统计</view>
        <view class="function-arrow">›</view>
      </view>
      <view class="function-item" @click="goToSettings">
        <view class="function-icon">⚙️</view>
        <view class="function-text">设置</view>
        <view class="function-arrow">›</view>
      </view>
      <view class="function-item" @click="logout">
        <view class="function-icon">🚪</view>
        <view class="function-text">退出登录</view>
        <view class="function-arrow">›</view>
      </view>
    </view>

    <!-- 版本信息 -->
    <view class="version">
      <text>版本 1.0.0</text>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      userInfo: {
        name: '默认用户',
        studentId: '00000000',
        department: '默认院系',
        avatarUrl: ''
      }
    };
  },
  onLoad() {
    this.checkLoginStatus();
    this.loadUserInfo();
  },
  methods: {
    checkLoginStatus() {
      const isLoggedIn = uni.getStorageSync('isLoggedIn');
      if (!isLoggedIn) {
        uni.navigateTo({
          url: '/pages/login/login'
        });
      }
    },
    async loadUserInfo() {
      try {
        const userInfo = uni.getStorageSync('userInfo');
        if (userInfo) {
          this.userInfo = userInfo;
        }
      } catch (error) {
        console.error('Failed to load user info:', error);
      }
    },
    goToPersonalization() {
      // 跳转到个性化设置页面
      uni.navigateTo({
        url: '/pages/user/personalization'
      });
    },
    goToEditProfile() {
      // 跳转到编辑资料页面
      uni.navigateTo({
        url: '/pages/user/profile'
      });
    },
    goToCollection() {
      // 跳转到我的收藏页面
      uni.navigateTo({
        url: '/pages/user/collection'
      });
    },
    goToHistory() {
      // 跳转到浏览历史页面
      uni.navigateTo({
        url: '/pages/user/history'
      });
    },
    goToSettings() {
      // 跳转到设置页面
      uni.navigateTo({
        url: '/pages/user/settings'
      });
    },
    goToStats() {
      // 跳转到数据统计页面
      uni.navigateTo({
        url: '/pages/user/stats'
      });
    },
    logout() {
      uni.showModal({
        title: '退出登录',
        content: '确定要退出登录吗？',
        success: (res) => {
          if (res.confirm) {
            uni.removeStorageSync('isLoggedIn');
            uni.removeStorageSync('userInfo');
            uni.showToast({ title: '已退出登录', icon: 'success' });
            // 跳转到登录页面
            setTimeout(() => {
              uni.navigateTo({
                url: '/pages/login/login'
              });
            }, 1000);
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

.user-info {
  display: flex;
  align-items: center;
  background-color: #1E88E5;
  color: #ffffff;
  border-radius: 12rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
}

.avatar {
  width: 128rpx;
  height: 128rpx;
  border-radius: 64rpx;
  overflow: hidden;
  margin-right: 24rpx;
  border: 4rpx solid rgba(255, 255, 255, 0.3);
}

.avatar image {
  width: 100%;
  height: 100%;
}

.info {
  flex: 1;
}

.name {
  font-size: 36rpx;
  font-weight: bold;
  margin-bottom: 8rpx;
}

.student-id {
  font-size: 28rpx;
  margin-bottom: 4rpx;
  opacity: 0.8;
}

.department {
  font-size: 28rpx;
  opacity: 0.8;
}

.function-list {
  background-color: #ffffff;
  border-radius: 12rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
}

.function-item {
  display: flex;
  align-items: center;
  padding: 20rpx 16rpx;
  border-bottom: 1rpx solid #e0e0e0;
}

.function-item:last-child {
  border-bottom: none;
}

.function-icon {
  font-size: 40rpx;
  margin-right: 16rpx;
}

.function-text {
  flex: 1;
  font-size: 28rpx;
  color: #333333;
}

.function-arrow {
  font-size: 32rpx;
  color: #999999;
}

.version {
  text-align: center;
  font-size: 24rpx;
  color: #999999;
  margin-top: 40rpx;
}
</style>
