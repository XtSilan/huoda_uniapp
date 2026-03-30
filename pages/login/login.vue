<template>
  <view class="container">
    <view class="login-form">
      <view class="logo">
        <text class="logo-text">活达</text>
        <text class="logo-subtitle">校园信息与活动聚合平台</text>
      </view>

      <view class="form-item">
        <text class="label">学号</text>
        <input class="input" placeholder="请输入学号" v-model="loginForm.studentId" />
      </view>

      <view class="form-item">
        <text class="label">密码</text>
        <input class="input" placeholder="请输入密码" v-model="loginForm.password" password />
      </view>

      <button class="login-btn" :loading="loading" @click="login">登录</button>
      <view class="tips">默认测试账号：`20240001` / `123456`</view>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      loading: false,
      loginForm: {
        studentId: '20240001',
        password: '123456'
      }
    };
  },
  methods: {
    async login() {
      if (!this.loginForm.studentId || !this.loginForm.password) {
        uni.showToast({ title: '请输入学号和密码', icon: 'none' });
        return;
      }

      this.loading = true;
      try {
        const res = await this.$api.auth.login(this.loginForm);
        uni.setStorageSync('token', res.token);
        uni.setStorageSync('isLoggedIn', true);
        uni.setStorageSync('userInfo', res.user);
        uni.showToast({ title: '登录成功', icon: 'success' });
        setTimeout(() => {
          uni.switchTab({ url: '/pages/index/index' });
        }, 300);
      } catch (error) {
        uni.showToast({ title: error.message || '登录失败', icon: 'none' });
      } finally {
        this.loading = false;
      }
    }
  }
};
</script>

<style scoped>
.container {
  min-height: 100vh;
  padding: 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.login-form {
  width: 100%;
  max-width: 640rpx;
  background: #ffffff;
  border-radius: 20rpx;
  padding: 48rpx 40rpx;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.08);
}

.logo {
  text-align: center;
  margin-bottom: 48rpx;
}

.logo-text {
  display: block;
  font-size: 56rpx;
  font-weight: bold;
  color: #1e88e5;
  margin-bottom: 12rpx;
}

.logo-subtitle {
  font-size: 26rpx;
  color: #666666;
}

.form-item {
  margin-bottom: 28rpx;
}

.label {
  display: block;
  margin-bottom: 12rpx;
  font-size: 28rpx;
  font-weight: 600;
}

.input {
  width: 100%;
  border: 2rpx solid #e5e7eb;
  border-radius: 12rpx;
  padding: 20rpx;
  font-size: 28rpx;
  background: #fdfdfd;
}

.login-btn {
  margin-top: 12rpx;
  width: 100%;
  background: #1e88e5;
  color: #ffffff;
  border-radius: 12rpx;
  font-size: 30rpx;
}

.tips {
  margin-top: 20rpx;
  text-align: center;
  color: #888888;
  font-size: 24rpx;
}
</style>
