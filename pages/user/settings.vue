<template>
  <view class="container">
    <!-- 账户安全设置 -->
    <view class="section">
      <view class="section-title">账户安全</view>
      <view class="setting-list">
        <view class="setting-item" @click="changePassword">
          <view class="setting-text">修改密码</view>
          <view class="setting-arrow">›</view>
        </view>
        <view class="setting-item" @click="bindPhone">
          <view class="setting-text">绑定手机号</view>
          <view class="setting-arrow">›</view>
        </view>
        <view class="setting-item" @click="bindEmail">
          <view class="setting-text">绑定邮箱</view>
          <view class="setting-arrow">›</view>
        </view>
      </view>
    </view>

    <!-- 个人偏好设置 -->
    <view class="section">
      <view class="section-title">个人偏好</view>
      <view class="setting-list">
        <view class="setting-item">
          <view class="setting-text">消息通知</view>
          <view class="switch">
            <switch v-model="notifications" @change="toggleNotifications"></switch>
          </view>
        </view>
        <view class="setting-item">
          <view class="setting-text">夜间模式</view>
          <view class="switch">
            <switch v-model="darkMode" @change="toggleDarkMode"></switch>
          </view>
        </view>
        <view class="setting-item" @click="selectLanguage">
          <view class="setting-text">语言</view>
          <view class="setting-value">{{ language }}</view>
          <view class="setting-arrow">›</view>
        </view>
      </view>
    </view>

    <!-- 其他设置 -->
    <view class="section">
      <view class="section-title">其他</view>
      <view class="setting-list">
        <view class="setting-item" @click="clearCache">
          <view class="setting-text">清除缓存</view>
          <view class="setting-value">{{ cacheSize }}</view>
          <view class="setting-arrow">›</view>
        </view>
        <view class="setting-item" @click="aboutUs">
          <view class="setting-text">关于我们</view>
          <view class="setting-arrow">›</view>
        </view>
        <view class="setting-item" @click="feedback">
          <view class="setting-text">意见反馈</view>
          <view class="setting-arrow">›</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      notifications: true,
      darkMode: false,
      language: '简体中文',
      cacheSize: '12.3 MB'
    };
  },
  onLoad() {
    this.loadSettings();
  },
  methods: {
    loadSettings() {
      // 从本地存储加载设置
      const settings = uni.getStorageSync('settings');
      if (settings) {
        this.notifications = settings.notifications || true;
        this.darkMode = settings.darkMode || false;
        this.language = settings.language || '简体中文';
      }
    },
    saveSettings() {
      // 保存设置到本地存储
      const settings = {
        notifications: this.notifications,
        darkMode: this.darkMode,
        language: this.language
      };
      uni.setStorageSync('settings', settings);
    },
    changePassword() {
      uni.showModal({
        title: '修改密码',
        content: '此功能暂未实现',
        showCancel: false
      });
    },
    bindPhone() {
      uni.showModal({
        title: '绑定手机号',
        content: '此功能暂未实现',
        showCancel: false
      });
    },
    bindEmail() {
      uni.showModal({
        title: '绑定邮箱',
        content: '此功能暂未实现',
        showCancel: false
      });
    },
    toggleNotifications() {
      this.saveSettings();
      uni.showToast({ title: this.notifications ? '通知已开启' : '通知已关闭', icon: 'success' });
    },
    toggleDarkMode() {
      this.saveSettings();
      uni.showToast({ title: this.darkMode ? '夜间模式已开启' : '夜间模式已关闭', icon: 'success' });
    },
    selectLanguage() {
      uni.showActionSheet({
        itemList: ['简体中文', 'English'],
        success: (res) => {
          this.language = res.tapIndex === 0 ? '简体中文' : 'English';
          this.saveSettings();
          uni.showToast({ title: '语言已切换', icon: 'success' });
        }
      });
    },
    clearCache() {
      uni.showModal({
        title: '清除缓存',
        content: '确定要清除缓存吗？',
        success: (res) => {
          if (res.confirm) {
            // 模拟清除缓存
            setTimeout(() => {
              this.cacheSize = '0 MB';
              uni.showToast({ title: '缓存已清除', icon: 'success' });
            }, 500);
          }
        }
      });
    },
    aboutUs() {
      uni.showModal({
        title: '关于我们',
        content: '活达—大学生个性化与信息聚合平台\n版本：1.0.0\n© 2026 活达团队',
        showCancel: false
      });
    },
    feedback() {
      uni.showModal({
        title: '意见反馈',
        content: '此功能暂未实现',
        showCancel: false
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

.section {
  margin-bottom: 24rpx;
}

.section-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #666666;
  margin-bottom: 8rpx;
  padding: 0 8rpx;
}

.setting-list {
  background-color: #ffffff;
  border-radius: 12rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
}

.setting-item {
  display: flex;
  align-items: center;
  padding: 20rpx 16rpx;
  border-bottom: 1rpx solid #e0e0e0;
}

.setting-item:last-child {
  border-bottom: none;
}

.setting-text {
  flex: 1;
  font-size: 28rpx;
  color: #333333;
}

.setting-value {
  font-size: 26rpx;
  color: #999999;
  margin-right: 8rpx;
}

.setting-arrow {
  font-size: 32rpx;
  color: #999999;
}

.switch {
  display: flex;
  align-items: center;
}
</style>