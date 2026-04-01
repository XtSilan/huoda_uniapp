<template>
  <view class="page-shell detail-page">
    <view class="page-header">
      <page-nav fallback="/pages/feature/publish/publish" :is-tab="true" />
      <view class="page-eyebrow">活动详情</view>
      <view class="page-title">{{ activity.title || '活动详情' }}</view>
      <view class="page-subtitle">把时间、地点、内容和操作统一放进卡片层次里。</view>
    </view>

    <view class="surface-card meta-card">
      <view class="meta-tags">
        <tag-badge :text="activity.activityType || '活动'" tone="blue" />
        <tag-badge :text="`${activity.applyCount || 0} 人报名`" tone="yellow" />
      </view>
      <view class="meta-item">组织方：{{ activity.organizer || '待补充' }}</view>
      <view class="meta-item">时间：{{ formatDate(activity.startTime) }} - {{ formatDate(activity.endTime) }}</view>
      <view class="meta-item">地点：{{ activity.location || '待补充' }}</view>
      <scroll-view v-if="activity.images && activity.images.length" class="image-strip" scroll-x>
        <image v-for="(item, index) in activity.images" :key="index" class="preview-image" :src="item" mode="aspectFill"></image>
      </scroll-view>
    </view>

    <view class="surface-card content-card">
      <view class="section-heading">活动详情</view>
      <view class="content">{{ activity.content || '暂无详情说明' }}</view>
      <view class="content-action">
        <custom-button text="收藏活动" ghost @click="toggleCollection" />
      </view>
    </view>

    <view class="bottom-action">
      <custom-button text="立即报名" :loading="applying" @click="applyActivity" />
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      applying: false,
      activity: {
        id: '',
        title: '',
        content: '',
        startTime: '',
        endTime: '',
        location: '',
        organizer: '',
        images: [],
        applyCount: 0
      }
    };
  },
  onLoad(options) {
    if (options.id) {
      this.loadActivityDetail(options.id);
    }
  },
  methods: {
    async loadActivityDetail(id) {
      uni.showLoading({ title: '加载中' });
      try {
        this.activity = await this.$api.publish.getDetail(id);
        try {
          await this.$api.user.recordHistory({
            targetType: 'activity',
            targetId: id,
            title: this.activity.title,
            summary: this.activity.summary || this.activity.content
          });
        } catch (e) {}
      } catch (error) {
        uni.showToast({ title: error.message || '加载失败', icon: 'none' });
      } finally {
        uni.hideLoading();
      }
    },
    async applyActivity() {
      this.applying = true;
      try {
        this.activity = await this.$api.publish.apply(this.activity.id);
        uni.showToast({ title: '报名成功', icon: 'success' });
      } catch (error) {
        uni.showToast({ title: error.message || '报名失败', icon: 'none' });
      } finally {
        this.applying = false;
      }
    },
    async toggleCollection() {
      try {
        await this.$api.user.toggleCollection({
          targetType: 'activity',
          targetId: Number(this.activity.id)
        });
        uni.showToast({ title: '收藏状态已更新', icon: 'success' });
      } catch (error) {
        uni.showToast({ title: error.message || '操作失败', icon: 'none' });
      }
    },
    formatDate(dateString) {
      return dateString ? new Date(dateString).toLocaleString() : '-';
    }
  }
};
</script>

<style scoped>
.detail-page {
  padding-bottom: calc(150rpx + env(safe-area-inset-bottom));
}

.meta-card,
.content-card {
  padding: 24rpx;
}

.content-card {
  margin-top: 28rpx;
}

.meta-tags {
  display: flex;
  gap: 10rpx;
  flex-wrap: wrap;
  margin-bottom: 18rpx;
}

.meta-item,
.content {
  font-size: 26rpx;
  line-height: 1.75;
  color: var(--text-sub);
}

.meta-item + .meta-item {
  margin-top: 10rpx;
}

.image-strip {
  margin-top: 20rpx;
  white-space: nowrap;
}

.preview-image {
  width: 240rpx;
  height: 180rpx;
  border-radius: 24rpx;
  margin-right: 14rpx;
}

.content {
  margin-top: 20rpx;
}

.content-action {
  margin-top: 28rpx;
}

.bottom-action {
  position: fixed;
  left: 40rpx;
  right: 40rpx;
  bottom: calc(28rpx + env(safe-area-inset-bottom));
}
</style>
