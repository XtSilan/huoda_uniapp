<template>
  <view v-if="visible" class="announcement-popup">
    <view class="announcement-mask"></view>
    <view class="announcement-card">
      <image v-if="announcement.imageUrl" class="announcement-image" :src="announcement.imageUrl" mode="aspectFill"></image>
      <view class="announcement-body">
        <view class="announcement-title">{{ announcement.title }}</view>
        <view class="announcement-content">{{ announcement.content }}</view>
      </view>
      <button class="announcement-button" @click="handleConfirm">{{ announcement.buttonText || '我知道了' }}</button>
    </view>
  </view>
</template>

<script>
import { SERVER_ORIGIN } from '../../config/api';

export default {
  created() {
    uni.$on('popup-announcement:check', this.handleCheckEvent);
  },
  beforeDestroy() {
    uni.$off('popup-announcement:check', this.handleCheckEvent);
  },
  data() {
    return {
      visible: false,
      loading: false,
      lastCheckAt: 0,
      announcement: {
        id: '',
        title: '',
        content: '',
        imageUrl: '',
        buttonText: '我知道了'
      }
    };
  },
  methods: {
    handleCheckEvent() {
      this.checkAndOpen(true);
    },
    resolveImage(url) {
      const normalized = String(url || '').trim();
      if (!normalized) {
        return '';
      }
      if (/^https?:\/\//i.test(normalized)) {
        return normalized;
      }
      return `${SERVER_ORIGIN}${normalized.startsWith('/') ? normalized : `/${normalized}`}`;
    },
    async checkAndOpen(force = false) {
      const token = uni.getStorageSync('token');
      if (!token || this.loading) {
        return;
      }

      const now = Date.now();
      if (!force && now - this.lastCheckAt < 5000) {
        return;
      }
      this.lastCheckAt = now;
      this.loading = true;

      try {
        const res = await this.$api.user.getPopupAnnouncement();
        if (!res || !res.active || !res.announcement) {
          this.visible = false;
          return;
        }
        this.announcement = {
          ...res.announcement,
          imageUrl: this.resolveImage(res.announcement.imageUrl)
        };
        this.visible = true;
      } catch (_error) {
      } finally {
        this.loading = false;
      }
    },
    async handleConfirm() {
      if (!this.announcement.id) {
        this.visible = false;
        return;
      }

      try {
        await this.$api.user.ackPopupAnnouncement(this.announcement.id);
      } catch (_error) {
      } finally {
        this.visible = false;
      }
    }
  }
};
</script>

<style scoped>
.announcement-popup {
  position: fixed;
  inset: 0;
  z-index: 100001;
}

.announcement-mask {
  position: absolute;
  inset: 0;
  background: rgba(15, 18, 34, 0.62);
  backdrop-filter: blur(4px);
}

.announcement-card {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 620rpx;
  max-width: calc(100vw - 72rpx);
  transform: translate(-50%, -50%);
  border-radius: 36rpx;
  overflow: hidden;
  background: #1f2030;
  box-shadow: 0 28rpx 80rpx rgba(0, 0, 0, 0.28);
}

.announcement-image {
  display: block;
  width: 100%;
  height: 280rpx;
  background: linear-gradient(135deg, #7058ff, #5443df);
}

.announcement-body {
  padding: 34rpx 34rpx 24rpx;
}

.announcement-title {
  font-size: 36rpx;
  line-height: 1.4;
  font-weight: 700;
  color: #ffffff;
  text-align: center;
}

.announcement-content {
  margin-top: 24rpx;
  font-size: 28rpx;
  line-height: 1.8;
  color: rgba(255, 255, 255, 0.88);
  white-space: pre-line;
}

.announcement-button {
  margin: 0 34rpx 34rpx;
  height: 88rpx;
  line-height: 88rpx;
  border-radius: 999rpx;
  border: none;
  background: linear-gradient(135deg, #725cff 0%, #5b46ef 100%);
  color: #ffffff;
  font-size: 30rpx;
  font-weight: 700;
  box-shadow: 0 18rpx 36rpx rgba(99, 79, 255, 0.35);
}

.announcement-button::after {
  border: none;
}
</style>
