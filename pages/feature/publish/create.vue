<template>
  <view class="container">
    <view class="form">
      <view class="form-item">
        <text class="label">活动标题</text>
        <input class="input" v-model="activity.title" placeholder="请输入活动标题" />
      </view>

      <view class="form-item">
        <text class="label">活动内容</text>
        <textarea class="textarea" v-model="activity.content" placeholder="请输入活动内容"></textarea>
      </view>

      <view class="form-item">
        <text class="label">开始时间</text>
        <input class="input" v-model="activity.startTime" placeholder="例如 2026-03-31T18:00:00.000Z" />
      </view>

      <view class="form-item">
        <text class="label">结束时间</text>
        <input class="input" v-model="activity.endTime" placeholder="例如 2026-03-31T20:00:00.000Z" />
      </view>

      <view class="form-item">
        <text class="label">活动地点</text>
        <input class="input" v-model="activity.location" placeholder="请输入活动地点" />
      </view>

      <view class="form-item">
        <text class="label">活动地点类型</text>
        <view class="type-list">
          <view
            v-for="item in locationTypes"
            :key="item"
            class="type-item"
            :class="{ active: activity.locationType === item }"
            @click="activity.locationType = item"
          >
            {{ item }}
          </view>
        </view>
      </view>

      <view class="form-item">
        <text class="label">活动类型</text>
        <view class="type-list">
          <view
            v-for="item in activityTypes"
            :key="item"
            class="type-item"
            :class="{ active: activity.activityType === item }"
            @click="activity.activityType = item"
          >
            {{ item }}
          </view>
        </view>
      </view>

      <view class="form-item">
        <text class="label">组织方</text>
        <input class="input" v-model="activity.organizer" placeholder="请输入组织方" />
      </view>

      <view class="form-item">
        <text class="label">活动图片</text>
        <view class="image-list">
          <view class="upload-box" @click="chooseImages">+</view>
          <image v-for="(item, index) in activity.images" :key="`${item}-${index}`" class="preview-image" :src="item" mode="aspectFill"></image>
        </view>
      </view>

      <button class="submit-btn" :loading="submitting" @click="submitForm">发布活动</button>
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
.container {
  padding: 16rpx;
}

.form {
  background: #ffffff;
  border-radius: 12rpx;
  padding: 24rpx;
}

.form-item {
  margin-bottom: 24rpx;
}

.label {
  display: block;
  margin-bottom: 10rpx;
  font-size: 28rpx;
  font-weight: 600;
}

.input,
.textarea {
  width: 100%;
  padding: 16rpx;
  border: 2rpx solid #e5e7eb;
  border-radius: 10rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}

.textarea {
  min-height: 200rpx;
}

.type-list,
.image-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.type-item {
  padding: 10rpx 20rpx;
  border: 2rpx solid #e5e7eb;
  border-radius: 999rpx;
  font-size: 24rpx;
}

.type-item.active {
  background: #1e88e5;
  color: #ffffff;
  border-color: #1e88e5;
}

.upload-box,
.preview-image {
  width: 140rpx;
  height: 140rpx;
  border-radius: 12rpx;
}

.upload-box {
  border: 2rpx dashed #cbd5e1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #1e88e5;
  font-size: 56rpx;
}

.submit-btn {
  background: #1e88e5;
  color: #ffffff;
  border-radius: 10rpx;
}
</style>
