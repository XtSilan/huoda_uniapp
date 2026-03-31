<template>
  <view class="page-shell create-page">
    <view class="page-header">
      <view class="page-eyebrow">创建活动</view>
      <view class="page-title">发起一场值得参与的校园活动</view>
      <view class="page-subtitle">表单改成上下结构，让填写空间更充裕，也更接近你给的设计语言。</view>
    </view>

    <view class="form-stack">
      <view class="surface-card form-card">
        <text class="field-title">活动标题</text>
        <view class="field-panel">
          <input class="field-input" v-model="activity.title" placeholder="例如：春日草地音乐快闪" />
        </view>
      </view>

      <view class="surface-card form-card">
        <text class="field-title">活动内容</text>
        <view class="field-panel field-panel--textarea">
          <textarea class="field-textarea" v-model="activity.content" placeholder="介绍活动亮点、流程安排和参与方式"></textarea>
        </view>
      </view>

      <view class="surface-card form-card">
        <text class="field-title">活动时间</text>
        <view class="double-grid">
          <view class="field-panel">
            <input class="field-input" v-model="activity.startTime" placeholder="开始时间" />
          </view>
          <view class="field-panel">
            <input class="field-input" v-model="activity.endTime" placeholder="结束时间" />
          </view>
        </view>
      </view>

      <view class="surface-card form-card">
        <text class="field-title">活动地点与组织方</text>
        <view class="field-panel">
          <input class="field-input" v-model="activity.location" placeholder="请输入活动地点" />
        </view>
        <view class="field-panel field-gap">
          <input class="field-input" v-model="activity.organizer" placeholder="请输入组织方" />
        </view>
      </view>

      <view class="surface-card form-card">
        <text class="field-title">设定活动属性</text>
        <view class="chip-group">
          <view
            v-for="item in locationTypes"
            :key="item"
            class="chip"
            :class="{ active: activity.locationType === item }"
            @click="activity.locationType = item"
          >
            {{ item }}
          </view>
        </view>
        <view class="chip-group chip-group--bottom">
          <view
            v-for="item in activityTypes"
            :key="item"
            class="chip"
            :class="{ active: activity.activityType === item }"
            @click="activity.activityType = item"
          >
            {{ item }}
          </view>
        </view>
      </view>

      <view class="surface-card form-card">
        <text class="field-title">活动图片</text>
        <view class="image-list">
          <view class="upload-box" @click="chooseImages">+</view>
          <image v-for="(item, index) in activity.images" :key="index" class="preview-image" :src="item" mode="aspectFill"></image>
        </view>
      </view>
    </view>

    <view class="submit-wrap">
      <custom-button text="创建目标活动" :loading="submitting" @click="submitForm" />
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      submitting: false,
      activityTypes: ['讲座', '公益', '兼职', '就业', '娱乐', '竞赛', '美食', '其他'],
      locationTypes: ['校内', '校外'],
      activity: {
        title: '',
        content: '',
        startTime: new Date(Date.now() + 3600000).toISOString(),
        endTime: new Date(Date.now() + 7200000).toISOString(),
        location: '',
        locationType: '校内',
        organizer: '',
        images: [],
        activityType: '其他'
      }
    };
  },
  methods: {
    chooseImages() {
      uni.chooseImage({
        count: 3,
        success: (res) => {
          this.activity.images = [...this.activity.images, ...(res.tempFilePaths || [])].slice(0, 3);
        }
      });
    },
    async submitForm() {
      const requiredFields = ['title', 'content', 'startTime', 'endTime', 'location', 'organizer'];
      const missing = requiredFields.some((key) => !this.activity[key]);
      if (missing) {
        uni.showToast({ title: '请把活动信息填写完整', icon: 'none' });
        return;
      }

      this.submitting = true;
      try {
        await this.$api.publish.create(this.activity);
        uni.showToast({ title: '发布成功', icon: 'success' });
        setTimeout(() => {
          uni.navigateBack();
        }, 300);
      } catch (error) {
        uni.showToast({ title: error.message || '发布失败', icon: 'none' });
      } finally {
        this.submitting = false;
      }
    }
  }
};
</script>

<style scoped>
.create-page {
  padding-bottom: calc(180rpx + env(safe-area-inset-bottom));
}

.form-stack {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.form-card {
  padding: 28rpx 24rpx;
}

.field-title {
  display: block;
  margin-bottom: 16rpx;
  font-size: 30rpx;
  font-weight: 700;
  color: var(--text-main);
}

.field-panel {
  background: #f6f7fb;
  border-radius: 24rpx;
  padding: 0 24rpx;
}

.field-panel--textarea {
  padding: 20rpx 24rpx;
}

.field-gap {
  margin-top: 18rpx;
}

.field-input {
  width: 100%;
  height: 88rpx;
  font-size: 28rpx;
  color: var(--text-main);
}

.field-textarea {
  width: 100%;
  min-height: 220rpx;
  font-size: 28rpx;
  line-height: 1.7;
  color: var(--text-main);
}

.double-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 18rpx;
}

.chip-group {
  display: flex;
  flex-wrap: wrap;
  gap: 14rpx;
}

.chip-group--bottom {
  margin-top: 18rpx;
}

.chip {
  padding: 14rpx 24rpx;
  border-radius: var(--radius-full);
  background: #f6f7fb;
  color: var(--text-sub);
  font-size: 24rpx;
  font-weight: 600;
}

.chip.active {
  background: var(--primary-light);
  color: var(--primary-color);
}

.image-list {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.upload-box,
.preview-image {
  width: 148rpx;
  height: 148rpx;
  border-radius: 24rpx;
}

.upload-box {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f6f7fb;
  color: var(--primary-color);
  font-size: 60rpx;
}

.submit-wrap {
  position: fixed;
  left: 40rpx;
  right: 40rpx;
  bottom: calc(28rpx + env(safe-area-inset-bottom));
}
</style>
