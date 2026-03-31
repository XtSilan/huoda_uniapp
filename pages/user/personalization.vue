<template>
  <view class="page-shell personalized-page">
    <view class="page-header">
      <view class="page-eyebrow">个性化设置</view>
      <view class="page-title">让推荐更贴近你的校园阶段</view>
      <view class="page-subtitle">兴趣、年级和未来规划都改成统一的上下表单结构。</view>
    </view>

    <view class="form-stack">
      <view class="surface-card form-card">
        <text class="field-title">年级</text>
        <view class="field-panel">
          <input class="field-input" v-model="settings.grade" placeholder="例如：大一" />
        </view>
      </view>
      <view class="surface-card form-card">
        <text class="field-title">学历类型</text>
        <view class="field-panel">
          <input class="field-input" v-model="settings.educationType" placeholder="例如：本科" />
        </view>
      </view>
      <view class="surface-card form-card">
        <text class="field-title">未来规划</text>
        <view class="field-panel">
          <input class="field-input" v-model="settings.futurePlan" placeholder="例如：就业 / 考研" />
        </view>
      </view>
      <view class="surface-card form-card">
        <text class="field-title">兴趣标签</text>
        <view class="field-panel">
          <input class="field-input" v-model="interestsText" placeholder="讲座, 就业, 公益" />
        </view>
      </view>
      <view class="surface-card form-card">
        <text class="field-title">偏好开关</text>
        <view class="toggle-item">
          <text>接收活动通知</text>
          <switch v-model="settings.notification.activity" color="#6B48FF"></switch>
        </view>
        <view class="toggle-item">
          <text>接收讲座通知</text>
          <switch v-model="settings.notification.lecture" color="#6B48FF"></switch>
        </view>
        <view class="toggle-item">
          <text>深色模式</text>
          <switch v-model="settings.theme.darkMode" color="#6B48FF"></switch>
        </view>
      </view>
    </view>

    <view class="submit-wrap">
      <custom-button text="保存设置" @click="submitForm" />
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
      try {
        const res = await this.$api.user.getSettings();
        this.settings = { ...this.settings, ...res };
        this.interestsText = (this.settings.interests || []).join(', ');
      } catch (error) {
        uni.showToast({ title: error.message || '加载设置失败', icon: 'none' });
      }
    },
    async submitForm() {
      try {
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
      } catch (error) {
        uni.showToast({ title: error.message || '保存失败', icon: 'none' });
      }
    }
  }
};
</script>

<style scoped>
.personalized-page {
  padding-bottom: calc(150rpx + env(safe-area-inset-bottom));
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

.field-input {
  width: 100%;
  height: 88rpx;
  font-size: 28rpx;
}

.toggle-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18rpx 0;
  font-size: 28rpx;
  color: var(--text-main);
}

.toggle-item + .toggle-item {
  border-top: 1rpx solid #eef1f7;
}

.submit-wrap {
  position: fixed;
  left: 40rpx;
  right: 40rpx;
  bottom: calc(28rpx + env(safe-area-inset-bottom));
}
</style>
