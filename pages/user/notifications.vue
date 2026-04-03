<template>
  <view class="page-shell notifications-page">
    <view class="page-header">
      <page-nav fallback="/pages/user/user" :is-tab="true" />
      <view class="page-eyebrow">系统通知</view>
      <view class="page-title">更新和系统消息</view>
      <view class="page-subtitle">发布新版本后，通知会自动同步到这里</view>
    </view>

    <view class="surface-card section-card summary-card">
      <view class="summary-item">
        <view class="summary-value">{{ unreadCount }}</view>
        <view class="summary-label">未读通知</view>
      </view>
      <custom-button text="全部标为已读" :loading="readingAll" @click="markAllRead" />
    </view>

    <view class="surface-card section-card">
      <view v-if="notifications.length === 0" class="empty-state">暂时没有系统通知</view>
      <view
        v-for="item in notifications"
        :key="item.id"
        class="notification-item"
        :class="{ unread: !item.isRead }"
        @click="openNotification(item)"
      >
        <view class="notification-main">
          <view class="notification-top">
            <view class="notification-title">{{ item.title }}</view>
            <view v-if="!item.isRead" class="notification-dot"></view>
          </view>
          <view class="notification-content">{{ item.content || '点击查看详情' }}</view>
          <view class="notification-meta">
            <text>{{ formatTime(item.createdAt) }}</text>
            <text v-if="item.payload && item.payload.latestVersion">版本 {{ item.payload.latestVersion }}</text>
          </view>
        </view>
        <view class="notification-action">{{ item.type === 'app_update' ? '去更新' : '查看' }}</view>
      </view>
    </view>
  </view>
</template>

<script>
import { promptForAppUpdate } from '../../utils/app-update';

export default {
  data() {
    return {
      notifications: [],
      unreadCount: 0,
      loading: false,
      readingAll: false,
      updating: false
    };
  },
  onShow() {
    this.loadNotifications();
  },
  methods: {
    async loadNotifications() {
      this.loading = true;
      try {
        const res = await this.$api.user.getNotifications();
        this.notifications = res.list || [];
        this.unreadCount = Number(res.unreadCount || 0) || 0;
      } catch (error) {
        uni.showToast({ title: error.message || '加载通知失败', icon: 'none' });
      } finally {
        this.loading = false;
      }
    },
    formatTime(value) {
      if (!value) {
        return '';
      }
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        return value;
      }
      const month = `${date.getMonth() + 1}`.padStart(2, '0');
      const day = `${date.getDate()}`.padStart(2, '0');
      const hour = `${date.getHours()}`.padStart(2, '0');
      const minute = `${date.getMinutes()}`.padStart(2, '0');
      return `${month}-${day} ${hour}:${minute}`;
    },
    async markNotificationRead(item) {
      if (!item || item.isRead) {
        return item;
      }
      const updated = await this.$api.user.readNotification(item.id);
      this.notifications = this.notifications.map((current) => (current.id === updated.id ? updated : current));
      this.unreadCount = Math.max(0, this.unreadCount - 1);
      return updated;
    },
    async markAllRead() {
      if (!this.unreadCount) {
        uni.showToast({ title: '当前没有未读通知', icon: 'none' });
        return;
      }
      this.readingAll = true;
      try {
        await this.$api.user.readAllNotifications();
        this.notifications = this.notifications.map((item) => ({
          ...item,
          isRead: true,
          readAt: item.readAt || new Date().toISOString()
        }));
        this.unreadCount = 0;
        uni.showToast({ title: '已全部标为已读', icon: 'success' });
      } catch (error) {
        uni.showToast({ title: error.message || '操作失败', icon: 'none' });
      } finally {
        this.readingAll = false;
      }
    },
    async openNotification(item) {
      try {
        const notification = await this.markNotificationRead(item);
        if (notification.type !== 'app_update') {
          return;
        }
        await this.handleUpdateNotification();
      } catch (error) {
        uni.showToast({ title: error.message || '打开通知失败', icon: 'none' });
      }
    },
    async handleUpdateNotification() {
      // #ifndef APP-PLUS
      uni.showToast({ title: '仅 App 支持直接更新', icon: 'none' });
      // #endif

      // #ifdef APP-PLUS
      if (this.updating) {
        return;
      }
      this.updating = true;
      try {
        await promptForAppUpdate({ manual: true });
      } catch (error) {
        uni.showToast({ title: error.message || '检查更新失败', icon: 'none' });
      } finally {
        this.updating = false;
      }
      // #endif
    }
  }
};
</script>

<style scoped>
.section-card {
  padding: 28rpx 24rpx;
}

.section-card + .section-card {
  margin-top: 28rpx;
}

.summary-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24rpx;
}

.summary-value {
  font-size: 48rpx;
  font-weight: 700;
  color: var(--primary-color);
}

.summary-label {
  margin-top: 8rpx;
  font-size: 24rpx;
  color: var(--text-sub);
}

.empty-state {
  text-align: center;
  padding: 48rpx 0;
  color: var(--text-sub);
}

.notification-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20rpx;
  padding: 24rpx 0;
}

.notification-item + .notification-item {
  border-top: 1rpx solid #eef1f7;
}

.notification-item.unread .notification-title {
  color: var(--text-main);
}

.notification-main {
  flex: 1;
}

.notification-top {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.notification-title {
  font-size: 30rpx;
  font-weight: 700;
  color: var(--text-main);
}

.notification-dot {
  width: 14rpx;
  height: 14rpx;
  border-radius: 50%;
  background: #ff5b5b;
}

.notification-content {
  margin-top: 10rpx;
  font-size: 25rpx;
  line-height: 1.7;
  color: var(--text-sub);
}

.notification-meta {
  display: flex;
  gap: 20rpx;
  margin-top: 12rpx;
  font-size: 22rpx;
  color: var(--text-light);
}

.notification-action {
  flex: 0 0 auto;
  font-size: 24rpx;
  font-weight: 700;
  color: var(--primary-color);
}
</style>
