<template>
  <view class="page-shell chat-page">
    <view class="page-header">
      <view class="page-eyebrow">班级群聊</view>
      <view class="page-title">{{ group ? group.groupName : '班级群' }}</view>
      <view class="page-subtitle">{{ group ? `${group.memberCount || classmates.length} 人在群` : '群信息加载中' }}</view>
    </view>

    <view v-if="group" class="surface-card group-card">
      <view class="group-top">
        <view class="group-icon">群</view>
        <view class="group-body">
          <view class="group-name">{{ group.groupName }}</view>
          <view class="group-announcement">{{ group.announcement || '暂无群公告' }}</view>
        </view>
      </view>
      <image v-if="group.qrCode" class="qr-code" :src="fullQrCode(group.qrCode)" mode="aspectFit" @click="previewQrCode"></image>
    </view>

    <view class="section-block">
      <view class="section-row">
        <text class="section-heading">班级同学</text>
      </view>
      <view class="surface-card member-card">
        <view v-if="classmates.length === 0" class="empty-state">暂无同学信息</view>
        <view v-for="item in classmates" :key="item.id" class="member-item">
          <view class="member-name">{{ item.name }}</view>
          <tag-badge :text="item.role || '成员'" tone="purple" />
        </view>
      </view>
    </view>

    <view class="section-block">
      <view class="section-row">
        <text class="section-heading">公开聊天</text>
      </view>
      <scroll-view scroll-y class="surface-card chat-content">
        <view v-if="messages.length === 0" class="empty-state">还没有消息，发一句试试。</view>
        <view v-for="item in messages" :key="item.id" class="message-item">
          <view class="message-sender">{{ item.sender }}</view>
          <view class="message-text">{{ item.text }}</view>
          <view class="message-time">{{ formatTime(item.time) }}</view>
        </view>
      </scroll-view>
    </view>

    <view class="input-area surface-card">
      <input class="input" v-model="inputMessage" placeholder="输入消息..." @confirm="sendMessage" />
      <view class="send-btn" @click="sendMessage">发送</view>
    </view>
  </view>
</template>

<script>
import { SERVER_ORIGIN } from '../../../config/api';

export default {
  data() {
    return {
      group: null,
      classmates: [],
      messages: [],
      inputMessage: ''
    };
  },
  onShow() {
    this.loadGroup();
  },
  methods: {
    async loadGroup() {
      try {
        const res = await this.$api.classGroup.getCurrent();
        this.group = res;
        this.classmates = res.classmates || [];
        this.messages = res.messages || [];
      } catch (error) {
        uni.showToast({ title: error.message || '加载班级群失败', icon: 'none' });
      }
    },
    async sendMessage() {
      if (!this.inputMessage.trim()) {
        return;
      }
      try {
        const res = await this.$api.classGroup.sendMessage(this.inputMessage);
        this.messages = res.messages || [];
        this.inputMessage = '';
      } catch (error) {
        uni.showToast({ title: error.message || '发送失败', icon: 'none' });
      }
    },
    fullQrCode(path) {
      if (!path) {
        return '';
      }
      return path.startsWith('http') ? path : `${SERVER_ORIGIN}${path}`;
    },
    previewQrCode() {
      if (!this.group || !this.group.qrCode) {
        return;
      }
      const url = this.fullQrCode(this.group.qrCode);
      uni.previewImage({
        urls: [url],
        current: url
      });
    },
    formatTime(value) {
      return value ? new Date(value).toLocaleString() : '-';
    }
  }
};
</script>

<style scoped>
.chat-page {
  padding-bottom: calc(150rpx + env(safe-area-inset-bottom));
}

.group-card,
.member-card {
  padding: 24rpx;
}

.group-top {
  display: flex;
  gap: 18rpx;
}

.group-icon {
  width: 84rpx;
  height: 84rpx;
  border-radius: 28rpx;
  background: var(--primary-light);
  color: var(--primary-color);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30rpx;
  font-weight: 700;
}

.group-body {
  flex: 1;
}

.group-name,
.member-name,
.message-sender {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--text-main);
}

.group-announcement,
.message-time {
  margin-top: 10rpx;
  font-size: 24rpx;
  line-height: 1.6;
  color: var(--text-sub);
}

.qr-code {
  width: 260rpx;
  height: 260rpx;
  margin-top: 20rpx;
  border-radius: 24rpx;
  background: #f6f7fb;
}

.member-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18rpx 0;
}

.member-item + .member-item {
  border-top: 1rpx solid #eef1f7;
}

.chat-content {
  max-height: 560rpx;
  padding: 12rpx 24rpx;
}

.message-item {
  padding: 18rpx 0;
}

.message-item + .message-item {
  border-top: 1rpx solid #eef1f7;
}

.message-text {
  margin-top: 8rpx;
  font-size: 26rpx;
  line-height: 1.7;
  color: var(--text-main);
}

.input-area {
  position: fixed;
  left: 24rpx;
  right: 24rpx;
  bottom: calc(24rpx + env(safe-area-inset-bottom));
  padding: 16rpx;
  display: flex;
  gap: 12rpx;
  align-items: center;
}

.input {
  flex: 1;
  height: 88rpx;
  padding: 0 24rpx;
  border-radius: 24rpx;
  background: #f6f7fb;
  font-size: 28rpx;
}

.send-btn {
  min-width: 120rpx;
  height: 64rpx;
  border-radius: var(--radius-full);
  background: var(--primary-light);
  color: var(--primary-color);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  font-weight: 700;
}
</style>
