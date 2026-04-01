<template>
  <view class="page-shell user-page">
    <view class="page-header">
      <view class="page-eyebrow">个人空间</view>
      <view class="page-title">我的校园卡片</view>
      <view class="page-subtitle">资料、偏好、历史和账号入口都整理到这一页里，查看更顺手。</view>
    </view>

    <view class="profile-card">
      <view class="profile-main">
        <view class="avatar">
          <image :src="avatarSrc" mode="aspectFill"></image>
        </view>
        <view class="profile-info">
          <view class="profile-name">{{ userInfo.name || '未登录用户' }}</view>
          <view class="profile-id">{{ userInfo.studentId || '学号待补充' }}</view>
          <view class="profile-dept">{{ userInfo.department || '请先完善院系与班级信息' }}</view>
        </view>
      </view>
      <view class="profile-tags">
        <tag-badge :text="roleText" tone="purple" />
        <tag-badge :text="loginStateText" :tone="userInfo.studentId ? 'green' : 'yellow'" />
      </view>
    </view>

    <view class="stats-grid">
      <view class="stat-card surface-card">
        <view class="stat-icon tone-purple">藏</view>
        <view class="stat-value">{{ stats.collections }}</view>
        <view class="stat-label">我的收藏</view>
      </view>
      <view class="stat-card surface-card">
        <view class="stat-icon tone-blue">历</view>
        <view class="stat-value">{{ stats.history }}</view>
        <view class="stat-label">浏览记录</view>
      </view>
      <view class="stat-card surface-card">
        <view class="stat-icon tone-green">访</view>
        <view class="stat-value">{{ stats.views }}</view>
        <view class="stat-label">累计访问</view>
      </view>
    </view>

    <view class="section-block">
      <view class="section-row">
        <text class="section-heading">常用设置</text>
      </view>
      <view class="menu-list surface-card">
        <view v-for="item in menuItems" :key="item.title" class="menu-item" @click="handleMenuClick(item)">
          <view class="menu-item__lead">
            <view class="menu-item__icon" :class="item.tone">{{ item.icon }}</view>
            <view>
              <view class="menu-item__title">{{ item.title }}</view>
              <view class="menu-item__desc">{{ item.desc }}</view>
            </view>
          </view>
          <text class="menu-item__arrow">&#8250;</text>
        </view>
      </view>
    </view>

    <view class="section-block">
      <custom-button v-if="userInfo.role === 'admin'" text="进入管理后台" @click="goToAdmin" />
      <view class="logout-wrap">
        <custom-button text="退出登录" ghost @click="logout" />
      </view>
    </view>
  </view>
</template>

<script>
import { ADMIN_LOGIN_URL, SERVER_ORIGIN } from '../../config/api';

export default {
  data() {
    return {
      userInfo: {
        name: '',
        studentId: '',
        department: '',
        avatarUrl: ''
      },
      stats: {
        collections: 0,
        history: 0,
        views: 0
      }
    };
  },
  computed: {
    avatarSrc() {
      if (!this.userInfo.avatarUrl) {
        return '/static/avatar.png';
      }
      return this.userInfo.avatarUrl.startsWith('http') ? this.userInfo.avatarUrl : `${SERVER_ORIGIN}${this.userInfo.avatarUrl}`;
    },
    roleText() {
      return this.userInfo.role === 'admin' ? '管理员' : '普通用户';
    },
    loginStateText() {
      return this.userInfo.studentId ? '资料已同步' : '待完善';
    },
    menuItems() {
      return [
        { title: '编辑资料', desc: '头像、昵称和院系信息', url: '/pages/user/profile', icon: '资', tone: 'tone-purple' },
        { title: '个性化设置', desc: '调整偏好与展示方式', url: '/pages/user/personalization', icon: '设', tone: 'tone-blue' },
        { title: '我的收藏', desc: '快速回看收藏内容', url: '/pages/user/collection', icon: '藏', tone: 'tone-green' },
        { title: '浏览历史', desc: '继续上次浏览的内容', url: '/pages/user/history', icon: '历', tone: 'tone-yellow' },
        { title: '数据统计', desc: '查看个人使用概览', url: '/pages/user/stats', icon: '统', tone: 'tone-purple' },
        { title: '设置', desc: '账号与安全项', url: '/pages/user/settings', icon: '安', tone: 'tone-blue' }
      ];
    }
  },
  onShow() {
    this.checkLoginStatus();
    this.loadUserInfo();
    this.loadStats();
  },
  methods: {
    buildAdminRedirect() {
      const token = uni.getStorageSync('token');
      const userInfo = this.userInfo && this.userInfo.id ? this.userInfo : uni.getStorageSync('userInfo');
      const returnTo =
        typeof window !== 'undefined'
          ? `${window.location.origin}${window.location.pathname}#/pages/user/user`
          : '';
      const query = [
        `token=${encodeURIComponent(token || '')}`,
        `user=${encodeURIComponent(JSON.stringify(userInfo || {}))}`,
        `returnTo=${encodeURIComponent(returnTo)}`
      ].join('&');
      return `${ADMIN_LOGIN_URL}?${query}`;
    },
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
    async loadStats() {
      try {
        const [statsRes, collectionsRes, historyRes] = await Promise.all([
          this.$api.user.getStats().catch(() => ({})),
          this.$api.user.getCollections().catch(() => ([])),
          this.$api.user.getHistory().catch(() => ([]))
        ]);
        this.stats = {
          collections: Array.isArray(collectionsRes) ? collectionsRes.length : collectionsRes.total || 0,
          history: Array.isArray(historyRes) ? historyRes.length : historyRes.total || 0,
          views: statsRes.totalViews || statsRes.views || 0
        };
      } catch (error) {}
    },
    handleMenuClick(item) {
      uni.navigateTo({ url: item.url });
    },
    goToAdmin() {
      if (typeof window !== 'undefined') {
        window.open(this.buildAdminRedirect(), '_blank');
      } else {
        uni.showToast({ title: '请在 H5 管理端打开', icon: 'none' });
      }
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
.user-page {
  padding-bottom: calc(120rpx + env(safe-area-inset-bottom));
}

.profile-card {
  padding: 28rpx;
  border-radius: 36rpx;
  background: linear-gradient(135deg, rgba(138, 100, 255, 0.95), rgba(107, 72, 255, 1));
  color: #ffffff;
  box-shadow: var(--shadow-md);
}

.profile-main {
  display: flex;
  align-items: center;
  gap: 22rpx;
}

.avatar {
  width: 132rpx;
  height: 132rpx;
  border-radius: 40rpx;
  overflow: hidden;
  border: 4rpx solid rgba(255, 255, 255, 0.25);
  flex-shrink: 0;
}

.avatar image {
  width: 100%;
  height: 100%;
}

.profile-name {
  font-size: 40rpx;
  font-weight: 700;
}

.profile-id,
.profile-dept {
  margin-top: 10rpx;
  font-size: 24rpx;
  opacity: 0.88;
}

.profile-tags {
  display: flex;
  gap: 12rpx;
  margin-top: 24rpx;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16rpx;
  margin-top: 28rpx;
}

.stat-card {
  padding: 22rpx 16rpx;
  text-align: center;
}

.stat-icon,
.menu-item__icon {
  width: 64rpx;
  height: 64rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  font-weight: 700;
}

.stat-icon {
  margin: 0 auto 14rpx;
}

.tone-purple {
  background: var(--primary-light);
  color: var(--primary-color);
}

.tone-blue {
  background: var(--blue-bg);
  color: var(--blue-color);
}

.tone-green {
  background: var(--green-bg);
  color: var(--green-color);
}

.tone-yellow {
  background: var(--yellow-bg);
  color: var(--yellow-color);
}

.stat-value {
  font-size: 34rpx;
  font-weight: 700;
  color: var(--text-main);
}

.stat-label {
  margin-top: 8rpx;
  font-size: 22rpx;
  color: var(--text-sub);
}

.menu-list {
  padding: 8rpx 24rpx;
}

.menu-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 22rpx 0;
}

.menu-item + .menu-item {
  border-top: 1rpx solid #eef1f7;
}

.menu-item__lead {
  display: flex;
  align-items: center;
  gap: 18rpx;
}

.menu-item__title {
  font-size: 30rpx;
  font-weight: 700;
  color: var(--text-main);
}

.menu-item__desc {
  margin-top: 8rpx;
  font-size: 22rpx;
  color: var(--text-sub);
}

.menu-item__arrow {
  font-size: 36rpx;
  color: var(--text-light);
}

.logout-wrap {
  margin-top: 20rpx;
}
</style>
