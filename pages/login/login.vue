<template>
  <view class="login-page">
    <view class="ambient ambient--top"></view>
    <view class="ambient ambient--bottom"></view>

    <view class="login-shell">
      <view class="intro">
        <view class="intro__badge">HUODA CAMPUS</view>
        <view class="intro__title">登录后，把校园生活装进一张更好看的首页。</view>
        <view class="intro__desc">查资讯、看活动、班级协作和个人中心，都统一成一套轻盈的体验。</view>
      </view>

      <view class="login-card">
        <view class="field-group">
          <text class="field-title">输入你的校园账号</text>
          <view class="field-panel">
            <input class="field-input" placeholder="请输入学号" v-model="loginForm.studentId" />
          </view>
        </view>

        <view class="field-group">
          <text class="field-title">输入登录密码</text>
          <view class="field-panel">
            <input class="field-input" placeholder="请输入密码" v-model="loginForm.password" password />
          </view>
        </view>

        <custom-button text="进入活达" :loading="loading" @click="login" />
      </view>
    </view>
  </view>
</template>

<script>
import { ADMIN_LOGIN_URL } from '../../config/api';

export default {
  data() {
    return {
      loading: false,
      loginForm: {
        studentId: '',
        password: ''
      }
    };
  },
  methods: {
    buildAdminRedirect(token, user) {
      const returnTo =
        typeof window !== 'undefined'
          ? `${window.location.origin}${window.location.pathname}#/pages/user/user`
          : '';
      const query = [
        `token=${encodeURIComponent(token)}`,
        `user=${encodeURIComponent(JSON.stringify(user))}`,
        `returnTo=${encodeURIComponent(returnTo)}`
      ].join('&');
      return `${ADMIN_LOGIN_URL}?${query}`;
    },
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
          if (res.user && res.user.role === 'admin' && typeof window !== 'undefined') {
            window.location.href = this.buildAdminRedirect(res.token, res.user);
            return;
          }
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
.login-page {
  min-height: 100vh;
  padding: calc(32rpx + env(safe-area-inset-top)) 32rpx calc(40rpx + env(safe-area-inset-bottom));
  background: linear-gradient(180deg, #f8f5ff 0%, #eef3ff 100%);
  position: relative;
  overflow: hidden;
}

.ambient {
  position: absolute;
  border-radius: 50%;
  filter: blur(10rpx);
}

.ambient--top {
  top: -120rpx;
  right: -40rpx;
  width: 360rpx;
  height: 360rpx;
  background: rgba(107, 72, 255, 0.15);
}

.ambient--bottom {
  left: -80rpx;
  bottom: 160rpx;
  width: 320rpx;
  height: 320rpx;
  background: rgba(74, 144, 226, 0.14);
}

.login-shell {
  position: relative;
  z-index: 1;
  min-height: calc(100vh - 72rpx - env(safe-area-inset-top) - env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.intro {
  margin-bottom: 40rpx;
}

.intro__badge {
  display: inline-flex;
  padding: 10rpx 18rpx;
  border-radius: var(--radius-full);
  background: rgba(107, 72, 255, 0.1);
  color: var(--primary-color);
  font-size: 22rpx;
  font-weight: 700;
}

.intro__title {
  margin-top: 24rpx;
  font-size: 54rpx;
  line-height: 1.25;
  font-weight: 700;
  color: var(--text-main);
}

.intro__desc {
  margin-top: 16rpx;
  font-size: 26rpx;
  line-height: 1.7;
  color: var(--text-sub);
}

.login-card {
  padding: 32rpx;
  background: rgba(255, 255, 255, 0.92);
  border-radius: 36rpx;
  box-shadow: var(--shadow-lg);
  backdrop-filter: blur(12rpx);
}

.field-group + .field-group {
  margin-top: 28rpx;
}

.field-group:last-of-type {
  margin-bottom: 32rpx;
}

.field-title {
  display: block;
  margin-bottom: 16rpx;
  font-size: 30rpx;
  font-weight: 700;
  color: var(--text-main);
}

.field-panel {
  background: #f5f6fb;
  border-radius: 24rpx;
  padding: 0 24rpx;
}

.field-input {
  width: 100%;
  height: 92rpx;
  font-size: 28rpx;
  color: var(--text-main);
}
</style>
