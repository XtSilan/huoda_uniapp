<template>
  <view class="container">
    <view class="group-card" v-if="group">
      <view class="group-name">{{ group.groupName }}</view>
      <view class="group-meta">{{ group.memberCount || classmates.length }} 人在群</view>
      <view class="group-announcement">{{ group.announcement || '暂无群公告' }}</view>
      <image v-if="group.qrCode" class="qr-code" :src="fullQrCode(group.qrCode)" mode="aspectFit" @click="previewQrCode"></image>
    </view>

    <view class="section">
      <view class="section-title">班级同学</view>
      <view class="classmate-list">
        <view v-for="item in classmates" :key="item.id" class="classmate-item">
          <text>{{ item.name }}</text>
          <text class="classmate-role">{{ item.role }}</text>
        </view>
      </view>
    </view>

    <view class="section">
      <view class="section-title">公开聊天</view>
      <scroll-view scroll-y class="chat-content">
        <view v-for="item in messages" :key="item.id" class="message-item">
          <view class="message-sender">{{ item.sender }}</view>
          <view class="message-text">{{ item.text }}</view>
          <view class="message-time">{{ formatTime(item.time) }}</view>
        </view>
      </scroll-view>
    </view>

    <view class="input-area">
      <input class="input" v-model="inputMessage" placeholder="输入消息..." @confirm="sendMessage" />
      <button class="send-btn" @click="sendMessage">发送</button>
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
.container {
  min-height: 100vh;
  padding: 16rpx;
  background: #f5f5f5;
  box-sizing: border-box;
}

.group-card,
.section {
  background: #ffffff;
  border-radius: 16rpx;
  padding: 20rpx;
  margin-bottom: 18rpx;
}

.group-name,
.section-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #222222;
}

.group-meta,
.group-announcement,
.message-time,
.classmate-role {
  color: #666666;
  font-size: 24rpx;
}

.group-meta,
.group-announcement {
  margin-top: 8rpx;
}

.qr-code {
  width: 260rpx;
  height: 260rpx;
  margin-top: 18rpx;
  border-radius: 12rpx;
  background: #f6f8fa;
}

.classmate-item,
.message-item {
  padding: 14rpx 0;
  border-bottom: 1rpx solid #eeeeee;
}

.classmate-item:last-child,
.message-item:last-child {
  border-bottom: none;
}

.classmate-item {
  display: flex;
  justify-content: space-between;
}

.chat-content {
  max-height: 520rpx;
}

.message-sender {
  font-size: 26rpx;
  font-weight: 600;
}

.message-text {
  margin-top: 8rpx;
  font-size: 28rpx;
  color: #333333;
}

.message-time {
  margin-top: 8rpx;
}

.input-area {
  display: flex;
  gap: 12rpx;
  background: #ffffff;
  border-radius: 16rpx;
  padding: 16rpx;
}

.input {
  flex: 1;
  background: #f8fafc;
  border-radius: 12rpx;
  padding: 16rpx;
}

.send-btn {
  background: #1e88e5;
  color: #ffffff;
  border-radius: 12rpx;
  padding: 0 28rpx;
}
</style>
