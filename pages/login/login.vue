<template>
  <view class="container">
    <view class="login-form">
      <view class="logo">
        <text class="logo-text">活达</text>
        <text class="logo-subtitle">大学生个性化与信息聚合平台</text>
      </view>
      
      <view class="form-item">
        <text class="label">学号</text>
        <input
          class="input"
          placeholder="请输入学号"
          v-model="loginForm.studentId"
          type="number"
        />
      </view>
      
      <view class="form-item">
        <text class="label">密码</text>
        <input
          class="input"
          placeholder="请输入密码"
          v-model="loginForm.password"
          type="password"
        />
      </view>
      
      <button class="login-btn" @click="login">登录</button>
      
      <view class="forgot-password">
        <text>忘记密码？</text>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      loginForm: {
        studentId: '',
        password: ''
      }
    };
  },
  methods: {
    login() {
      // 表单验证
      if (!this.loginForm.studentId) {
        uni.showToast({ title: '请输入学号', icon: 'none' });
        return;
      }
      if (!this.loginForm.password) {
        uni.showToast({ title: '请输入密码', icon: 'none' });
        return;
      }
      
      // 模拟登录
      uni.showLoading({ title: '登录中...' });
      setTimeout(() => {
        uni.hideLoading();
        uni.showToast({ title: '登录成功', icon: 'success' });
        // 保存登录状态
        uni.setStorageSync('isLoggedIn', true);
        uni.setStorageSync('userInfo', {
          studentId: this.loginForm.studentId,
          name: '测试用户',
          avatar: ''
        });
        // 保存用户密码（实际应用中应该加密存储）
        uni.setStorageSync('userPassword', this.loginForm.password);
        // 跳转到首页
        uni.switchTab({
          url: '/pages/index/index'
        });
      }, 1000);
    }
  }
};
</script>

<style scoped>
.container {
  padding: 40rpx;
  background-color: #f5f5f5;
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
}

.login-form {
  width: 100%;
  max-width: 600rpx;
  background-color: #ffffff;
  border-radius: 16rpx;
  padding: 40rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.1);
}

.logo {
  text-align: center;
  margin-bottom: 48rpx;
}

.logo-text {
  display: block;
  font-size: 48rpx;
  font-weight: bold;
  color: #1E88E5;
  margin-bottom: 16rpx;
}

.logo-subtitle {
  font-size: 24rpx;
  color: #666666;
}

.form-item {
  margin-bottom: 32rpx;
}

.label {
  display: block;
  font-size: 28rpx;
  font-weight: bold;
  margin-bottom: 12rpx;
  color: #333333;
}

.input {
  width: 100%;
  padding: 20rpx;
  border: 2rpx solid #e0e0e0;
  border-radius: 8rpx;
  font-size: 28rpx;
}

.login-btn {
  width: 100%;
  padding: 20rpx;
  background-color: #1E88E5;
  color: #ffffff;
  border-radius: 8rpx;
  font-size: 32rpx;
  margin-top: 16rpx;
}

.forgot-password {
  text-align: right;
  margin-top: 24rpx;
  font-size: 24rpx;
  color: #1E88E5;
}
</style>