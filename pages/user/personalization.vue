<template>
  <view class="container">
    <view class="form card">
      <view class="form-item">
        <text class="label">年级</text>
        <input class="input" v-model="settings.grade" placeholder="例如：大一" />
      </view>
      <view class="form-item">
        <text class="label">学历类型</text>
        <input class="input" v-model="settings.educationType" placeholder="例如：本科" />
      </view>
      <view class="form-item">
        <text class="label">未来规划</text>
        <input class="input" v-model="settings.futurePlan" placeholder="例如：就业 / 考研" />
      </view>
      <view class="form-item">
        <text class="label">兴趣标签（逗号分隔）</text>
        <input class="input" v-model="interestsText" placeholder="讲座,就业,公益" />
      </view>
      <view class="form-item toggle-item">
        <text>接收活动通知</text>
        <switch v-model="settings.notification.activity"></switch>
      </view>
      <view class="form-item toggle-item">
        <text>接收讲座通知</text>
        <switch v-model="settings.notification.lecture"></switch>
      </view>
      <view class="form-item toggle-item">
        <text>深色模式</text>
        <switch v-model="settings.theme.darkMode"></switch>
      </view>
      <button class="submit-btn" @click="submitForm">保存设置</button>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      settings: {
        grade: '',
        educationType: '',
        interests: [],
        futurePlan: '',
        notification: { activity: true, lecture: true, partTime: true },
        theme: { darkMode: false, autoRefresh: true }
      },
      interestsText: ''
    };
  },
  onShow() {
    this.loadSettings();
  },
  methods: {
    async loadSettings() {
      const res = await this.$api.user.getSettings();
      this.settings = { ...this.settings, ...res };
      this.interestsText = (this.settings.interests || []).join(',');
    },
    async submitForm() {
      const payload = {
        ...this.settings,
        interests: this.interestsText
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
      };
      await this.$api.user.updateSettings(payload);
      uni.showToast({ title: '保存成功', icon: 'success' });
      uni.navigateBack();
    }
  }
};
</script>

<style scoped>
.container { padding: 16rpx; }
.form-item { margin-bottom: 20rpx; }
.label { display: block; margin-bottom: 10rpx; font-size: 28rpx; font-weight: 600; }
.input { width: 100%; border: 2rpx solid #e5e7eb; border-radius: 10rpx; padding: 16rpx; }
.toggle-item { display: flex; justify-content: space-between; align-items: center; }
.submit-btn { background: #1e88e5; color: #fff; border-radius: 10rpx; }
</style>
