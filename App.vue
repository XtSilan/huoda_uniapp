<template>
  <div id="app">
    <router-view />
  </div>
</template>

<script>
export default {
  onLaunch() {
    // 应用启动时执行
    console.log('App launched');
    this.login();
  },
  methods: {
    login() {
      // 登录逻辑
      uni.login({
        success: res => {
          // 发送 res.code 到后台换取 openId, sessionKey, unionId
          uni.request({
            url: 'http://localhost:3000/api/auth/login',
            method: 'POST',
            data: {
              code: res.code
            },
            success: res => {
              if (res.data.token) {
                uni.setStorageSync('token', res.data.token);
                uni.setStorageSync('user', res.data.user);
                this.globalData.userInfo = res.data.user;
                this.globalData.token = res.data.token;
              }
            }
          });
        }
      });
    }
  },
  globalData: {
    userInfo: null,
    token: null
  }
}
</script>

<style>
/* 全局样式 */
page {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  background-color: #f5f5f5;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

.container {
  padding: 16rpx;
}

.card {
  background-color: #ffffff;
  border-radius: 12rpx;
  padding: 16rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
}

.title {
  font-size: 32rpx;
  font-weight: bold;
  margin-bottom: 8rpx;
  color: #333333;
}

.content {
  font-size: 28rpx;
  color: #666666;
  line-height: 1.5;
}

.btn {
  display: inline-block;
  padding: 12rpx 24rpx;
  background-color: #1E88E5;
  color: #ffffff;
  border-radius: 8rpx;
  font-size: 28rpx;
  text-align: center;
  cursor: pointer;
}

.btn:hover {
  background-color: #1976D2;
}

.btn:active {
  background-color: #1565C0;
}

.input {
  width: 100%;
  padding: 12rpx;
  border: 2rpx solid #e0e0e0;
  border-radius: 8rpx;
  font-size: 28rpx;
  margin-bottom: 16rpx;
}

.input:focus {
  border-color: #1E88E5;
  outline: none;
}

.loading {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40rpx;
}

.error {
  color: #f44336;
  font-size: 24rpx;
  margin-top: 8rpx;
}

.success {
  color: #4caf50;
  font-size: 24rpx;
  margin-top: 8rpx;
}
</style>
