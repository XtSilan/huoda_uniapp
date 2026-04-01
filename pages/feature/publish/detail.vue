<template>
  <view class="page-shell detail-page">
    <view class="page-header">
      <page-nav fallback="/pages/feature/publish/publish" :is-tab="true" />
      <view class="page-eyebrow">活动详情</view>
      <view class="page-title">{{ activity.title || '活动详情' }}</view>
      <view class="page-subtitle">查看完整活动信息</view>
    </view>

    <view class="surface-card meta-card">
      <view class="meta-tags">
        <tag-badge :text="activity.activityType || '活动'" tone="blue" />
        <view class="metric-pill">
          <view class="metric-pill__icon">
            <svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16">
              <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Zm0 2.445L6.615 5.5a.75.75 0 0 1-.564.41l-3.097.45 2.24 2.184a.75.75 0 0 1 .216.664l-.528 3.084 2.769-1.456a.75.75 0 0 1 .698 0l2.77 1.456-.53-3.084a.75.75 0 0 1 .216-.664l2.24-2.183-3.096-.45a.75.75 0 0 1-.564-.41L8 2.694Z"></path>
            </svg>
          </view>
          <text>{{ activity.applyCount || 0 }} 参与</text>
        </view>
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
        await this.$api.user.recordHistory({
          targetType: 'activity',
          targetId: id,
          title: this.activity.title,
          summary: this.activity.summary || this.activity.content
        });
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
        this.activity = await this.$api.publish.getDetail(this.activity.id);
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

.metric-pill {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  padding: 10rpx 16rpx;
  border-radius: 999rpx;
  background: #f5f7fb;
  color: var(--text-sub);
  font-size: 22rpx;
}

.metric-pill__icon {
  width: 28rpx;
  height: 28rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.metric-pill__icon svg {
  width: 28rpx;
  height: 28rpx;
  fill: #f5b301;
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
