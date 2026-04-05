<template>
  <view class="page-shell create-page">
    <view class="page-header">
      <page-nav fallback="/pages/feature/publish/publish" :is-tab="true" />
      <view class="page-eyebrow">创建活动</view>
      <view class="page-title">发起一场值得参与的校园活动</view>
      <view class="page-subtitle">把时间、地点和组织信息一次填清楚</view>
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
        <view class="time-card">
          <view class="time-block">
            <text class="time-label">开始时间</text>
            <view class="time-picker-row">
              <picker mode="date" :value="activity.startDate" @change="handleDateChange('startDate', $event)">
                <view class="picker-chip">{{ activity.startDate }}</view>
              </picker>
              <picker mode="time" :value="activity.startClock" @change="handleTimeChange('startClock', $event)">
                <view class="picker-chip">{{ activity.startClock }}</view>
              </picker>
            </view>
          </view>

          <view class="time-block">
            <text class="time-label">结束时间</text>
            <view class="time-picker-row">
              <picker mode="date" :value="activity.endDate" @change="handleDateChange('endDate', $event)">
                <view class="picker-chip">{{ activity.endDate }}</view>
              </picker>
              <picker mode="time" :value="activity.endClock" @change="handleTimeChange('endClock', $event)">
                <view class="picker-chip">{{ activity.endClock }}</view>
              </picker>
            </view>
          </view>

          <view class="time-preview">当前安排：{{ displayTimeRange }}</view>
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
function pad(value) {
  return `${value}`.padStart(2, '0');
}

function formatDateValue(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatTimeValue(date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function createDefaultActivity() {
  const start = new Date(Date.now() + 60 * 60 * 1000);
  const end = new Date(Date.now() + 2 * 60 * 60 * 1000);
  return {
    title: '',
    content: '',
    startDate: formatDateValue(start),
    startClock: formatTimeValue(start),
    endDate: formatDateValue(end),
    endClock: formatTimeValue(end),
    location: '',
    locationType: '校内',
    organizer: '',
    images: [],
    activityType: '其他'
  };
}

function combineDateTime(datePart, timePart) {
  return `${datePart}T${timePart}:00`;
}

export default {
  data() {
    return {
      submitting: false,
      activityTypes: ['讲座', '公益', '兼职', '就业', '娱乐', '竞赛', '美食', '其他'],
      locationTypes: ['校内', '校外'],
      activity: createDefaultActivity()
    };
  },
  computed: {
    displayTimeRange() {
      return `${this.activity.startDate} ${this.activity.startClock} - ${this.activity.endDate} ${this.activity.endClock}`;
    }
  },
  methods: {
    handleDateChange(key, event) {
      this.activity[key] = event.detail.value;
    },
    handleTimeChange(key, event) {
      this.activity[key] = event.detail.value;
    },
    chooseImages() {
      uni.chooseImage({
        count: 3,
        success: (res) => {
          this.activity.images = [...this.activity.images, ...(res.tempFilePaths || [])].slice(0, 3);
        }
      });
    },
    async submitForm() {
      const requiredFields = ['title', 'content', 'startDate', 'startClock', 'endDate', 'endClock', 'location', 'organizer'];
      const missing = requiredFields.some((key) => !this.activity[key]);
      if (missing) {
        uni.showToast({ title: '请把活动信息填写完整', icon: 'none' });
        return;
      }

      const startTime = combineDateTime(this.activity.startDate, this.activity.startClock);
      const endTime = combineDateTime(this.activity.endDate, this.activity.endClock);
      if (new Date(endTime).getTime() <= new Date(startTime).getTime()) {
        uni.showToast({ title: '结束时间要晚于开始时间', icon: 'none' });
        return;
      }

      this.submitting = true;
      try {
        await this.$api.publish.create({
          title: this.activity.title,
          content: this.activity.content,
          startTime,
          endTime,
          location: this.activity.location,
          locationType: this.activity.locationType,
          organizer: this.activity.organizer,
          images: this.activity.images,
          activityType: this.activity.activityType
        });
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

.time-card {
  padding: 8rpx 0;
}

.time-block + .time-block {
  margin-top: 18rpx;
}

.time-label {
  display: block;
  margin-bottom: 12rpx;
  font-size: 24rpx;
  color: var(--text-sub);
}

.time-picker-row {
  display: flex;
  gap: 16rpx;
  flex-wrap: wrap;
}

.picker-chip {
  min-width: 220rpx;
  padding: 20rpx 24rpx;
  border-radius: 24rpx;
  background: #f6f7fb;
  font-size: 28rpx;
  color: var(--text-main);
  text-align: center;
}

.time-preview {
  margin-top: 18rpx;
  font-size: 24rpx;
  color: var(--primary-color);
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
