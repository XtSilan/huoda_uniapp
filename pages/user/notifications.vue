<template>
  <view class="page-shell notifications-page">
    <view class="page-header">
      <page-nav fallback="/pages/user/user" :is-tab="true" />
      <view class="header-topline">
        <view>
          <view class="page-eyebrow">通知中心</view>
          <view class="page-title">和你有关的提醒消息</view>
        </view>
        <view class="dnd-toggle" :class="{ active: doNotDisturb }" @click="toggleDoNotDisturb">
          <text class="dnd-toggle__icon">☾</text>
        </view>
      </view>
      <view class="page-subtitle">报名、签到、更新和收藏内容变化都会汇总到这里</view>
    </view>

    <view class="surface-card section-card summary-card">
      <view class="summary-item">
        <view class="summary-value">{{ unreadCount }}</view>
        <view class="summary-label">未读通知</view>
      </view>
      <custom-button text="全部标为已读" :loading="readingAll" @click="markAllRead" />
    </view>

    <view class="surface-card section-card filter-card">
      <scroll-view class="filter-row" scroll-x>
        <view
          v-for="item in typeOptions"
          :key="item.value"
          class="filter-chip"
          :class="{ active: typeFilter === item.value }"
          @click="changeType(item.value)"
        >
          {{ item.label }}
        </view>
      </scroll-view>
      <view class="filter-row filter-row--compact">
        <view
          v-for="item in statusOptions"
          :key="item.value"
          class="filter-chip filter-chip--compact"
          :class="{ active: statusFilter === item.value }"
          @click="changeStatus(item.value)"
        >
          {{ item.label }}
        </view>
      </view>
    </view>

    <view class="surface-card section-card">
      <view v-if="notifications.length === 0" class="empty-state">当前筛选下还没有通知</view>
      <view
        v-for="item in notifications"
        :key="item.id"
        class="notification-item"
        :class="{ unread: !item.isRead }"
        @click="openNotification(item)"
      >
        <view class="notification-main">
          <view class="notification-top">
            <tag-badge :text="typeLabelMap[item.type] || '系统通知'" :tone="typeToneMap[item.type] || 'purple'" />
            <view class="notification-title">{{ item.title }}</view>
            <view v-if="!item.isRead" class="notification-dot"></view>
          </view>
          <view class="notification-content">{{ item.content || '点击查看详情' }}</view>
          <view class="notification-meta">
            <text>{{ formatTime(item.createdAt) }}</text>
            <text v-if="item.payload && item.payload.latestVersion">版本 {{ item.payload.latestVersion }}</text>
            <text v-if="item.payload && item.payload.startTime">{{ formatStartTime(item.payload.startTime) }}</text>
          </view>
        </view>
        <view class="notification-action">{{ getActionText(item) }}</view>
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
      updating: false,
      savingPreference: false,
      doNotDisturb: false,
      typeFilter: 'all',
      statusFilter: 'all',
      typeLabelMap: {
        system: '系统通知',
        activity: '活动通知',
        sign: '签到通知',
        version: '版本通知'
      },
      typeToneMap: {
        system: 'purple',
        activity: 'blue',
        sign: 'green',
        version: 'yellow'
      }
    };
  },
  computed: {
    typeOptions() {
      return [
        { label: '全部', value: 'all' },
        { label: '系统', value: 'system' },
        { label: '活动', value: 'activity' },
        { label: '签到', value: 'sign' },
        { label: '版本', value: 'version' }
      ];
    },
    statusOptions() {
      return [
        { label: '全部', value: 'all' },
        { label: '未读', value: 'unread' },
        { label: '已读', value: 'read' }
      ];
    }
  },
  onShow() {
    this.loadNotifications();
  },
  methods: {
    async loadNotifications() {
      this.loading = true;
      try {
        const res = await this.$api.user.getNotifications({
          type: this.typeFilter === 'all' ? '' : this.typeFilter,
          status: this.statusFilter
        });
        this.notifications = res.list || [];
        this.unreadCount = Number(res.unreadCount || 0) || 0;
        this.doNotDisturb = Boolean(res.preferences && res.preferences.doNotDisturb);
      } catch (error) {
        uni.showToast({ title: error.message || '加载通知失败', icon: 'none' });
      } finally {
        this.loading = false;
      }
    },
    changeType(value) {
      if (this.typeFilter === value) {
        return;
      }
      this.typeFilter = value;
      this.loadNotifications();
    },
    changeStatus(value) {
      if (this.statusFilter === value) {
        return;
      }
      this.statusFilter = value;
      this.loadNotifications();
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
    formatStartTime(value) {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        return '';
      }
      const month = `${date.getMonth() + 1}`.padStart(2, '0');
      const day = `${date.getDate()}`.padStart(2, '0');
      const hour = `${date.getHours()}`.padStart(2, '0');
      const minute = `${date.getMinutes()}`.padStart(2, '0');
      return `${month}-${day} ${hour}:${minute} 开始`;
    },
    getActionText(item) {
      if (item.type === 'version') {
        return '去更新';
      }
      if (item.payload && item.payload.targetType === 'activity') {
        return '查看活动';
      }
      if (item.payload && item.payload.targetType === 'info') {
        return '查看内容';
      }
      if (item.payload && item.payload.targetType === 'sign') {
        return '去签到';
      }
      return '查看';
    },
    async markNotificationRead(item) {
      if (!item || item.isRead) {
        return item;
      }
      const updated = await this.$api.user.readNotification(item.id);
      this.notifications = this.notifications
        .map((current) => (current.id === updated.id ? updated : current))
        .filter((current) => !(this.statusFilter === 'unread' && current.isRead));
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
        await this.$api.user.readAllNotifications({
          type: this.typeFilter === 'all' ? '' : this.typeFilter,
          status: this.statusFilter
        });
        if (this.statusFilter === 'unread') {
          this.notifications = [];
        } else {
          this.notifications = this.notifications.map((item) => ({
            ...item,
            isRead: true,
            readAt: item.readAt || new Date().toISOString()
          }));
        }
        uni.showToast({ title: '已全部标为已读', icon: 'success' });
        await this.loadNotifications();
      } catch (error) {
        uni.showToast({ title: error.message || '操作失败', icon: 'none' });
      } finally {
        this.readingAll = false;
      }
    },
    async toggleDoNotDisturb() {
      if (this.savingPreference) {
        return;
      }
      this.savingPreference = true;
      const nextValue = !this.doNotDisturb;
      try {
        await this.$api.user.updateSettings({
          notification: {
            doNotDisturb: nextValue
          }
        });
        this.doNotDisturb = nextValue;
        uni.showToast({ title: nextValue ? '已开启免打扰' : '已恢复消息提醒', icon: 'none' });
      } catch (error) {
        uni.showToast({ title: error.message || '设置失败', icon: 'none' });
      } finally {
        this.savingPreference = false;
      }
    },
    async openNotification(item) {
      try {
        const notification = await this.markNotificationRead(item);
        const payload = (notification && notification.payload) || {};
        if (notification.type === 'version') {
          await this.handleUpdateNotification();
          return;
        }
        if (payload.targetType === 'activity' && payload.targetId) {
          uni.navigateTo({ url: `/pages/feature/publish/detail?id=${payload.targetId}` });
          return;
        }
        if (payload.targetType === 'info' && payload.targetId) {
          uni.navigateTo({ url: `/pages/info/info?id=${payload.targetId}` });
          return;
        }
        if (payload.targetType === 'sign' || notification.type === 'sign') {
          uni.navigateTo({ url: '/pages/feature/sign/sign' });
        }
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
.header-topline {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20rpx;
}

.dnd-toggle {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: #eef1f7;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s ease;
}

.dnd-toggle.active {
  background: linear-gradient(135deg, #6b48ff 0%, #4b7cff 100%);
  box-shadow: 0 12rpx 24rpx rgba(97, 84, 214, 0.22);
}

.dnd-toggle__icon {
  font-size: 30rpx;
  color: #7b8798;
  font-weight: 700;
}

.dnd-toggle.active .dnd-toggle__icon {
  color: #ffffff;
}

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

.filter-card {
  display: flex;
  flex-direction: column;
  gap: 18rpx;
}

.filter-row {
  white-space: nowrap;
}

.filter-row--compact {
  display: flex;
  gap: 12rpx;
  flex-wrap: wrap;
}

.filter-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 112rpx;
  height: 64rpx;
  margin-right: 12rpx;
  padding: 0 22rpx;
  border-radius: 999rpx;
  background: #f3f5fa;
  color: var(--text-sub);
  font-size: 24rpx;
  font-weight: 700;
}

.filter-chip--compact {
  min-width: 96rpx;
  margin-right: 0;
}

.filter-chip.active {
  background: rgba(107, 72, 255, 0.12);
  color: var(--primary-color);
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
  min-width: 0;
}

.notification-top {
  display: flex;
  align-items: center;
  gap: 12rpx;
  flex-wrap: wrap;
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
  flex-wrap: wrap;
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
