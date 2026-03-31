<template>
  <view class="page-shell form-page">
    <view class="page-header">
      <view class="page-eyebrow">编辑资料</view>
      <view class="page-title">把你的校园身份信息补完整</view>
      <view class="page-subtitle">延续首页的上下结构表单，不再使用原始的横排输入样式。</view>
    </view>

    <view class="form-stack">
      <view v-for="field in fields" :key="field.key" class="surface-card form-card">
        <text class="field-title">{{ field.label }}</text>
        <view class="field-panel" :class="{ 'field-panel--disabled': field.disabled }">
          <input class="field-input" :value="userInfo[field.key]" :placeholder="field.placeholder" :disabled="field.disabled" @input="onFieldInput(field.key, $event)" />
        </view>
      </view>
    </view>

    <view class="submit-wrap">
      <custom-button text="保存信息" :loading="loading" @click="submitForm" />
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      loading: false,
      userInfo: {
        name: '',
        studentId: '',
        school: '',
        department: '',
        class: '',
        phone: '',
        avatarUrl: ''
      }
    };
  },
  computed: {
    fields() {
      return [
        { key: 'name', label: '姓名', placeholder: '请输入姓名' },
        { key: 'studentId', label: '学号', placeholder: '学号自动同步', disabled: true },
        { key: 'school', label: '学校', placeholder: '请输入学校' },
        { key: 'department', label: '院系', placeholder: '请输入院系' },
        { key: 'class', label: '班级', placeholder: '请输入班级' },
        { key: 'phone', label: '手机号', placeholder: '请输入手机号' }
      ];
    }
  },
  onLoad() {
    this.loadProfile();
  },
  methods: {
    onFieldInput(key, event) {
      this.userInfo[key] = event.detail.value;
    },
    async loadProfile() {
      try {
        const profile = await this.$api.user.getProfile();
        this.userInfo = { ...this.userInfo, ...profile };
        uni.setStorageSync('userInfo', this.userInfo);
      } catch (error) {
        const localUser = uni.getStorageSync('userInfo');
        if (localUser) {
          this.userInfo = { ...this.userInfo, ...localUser };
        }
      }
    },
    async submitForm() {
      if (!this.userInfo.name || !this.userInfo.school || !this.userInfo.department || !this.userInfo.class) {
        uni.showToast({ title: '请把资料填写完整', icon: 'none' });
        return;
      }
      this.loading = true;
      try {
        const res = await this.$api.user.updateProfile(this.userInfo);
        this.userInfo = res;
        uni.setStorageSync('userInfo', res);
        uni.$emit('userInfoUpdated', res);
        uni.showToast({ title: '保存成功', icon: 'success' });
        setTimeout(() => {
          uni.navigateBack();
        }, 300);
      } catch (error) {
        uni.showToast({ title: error.message || '保存失败', icon: 'none' });
      } finally {
        this.loading = false;
      }
    }
  }
};
</script>

<style scoped>
.form-page {
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

.field-panel--disabled {
  opacity: 0.72;
}

.field-input {
  width: 100%;
  height: 88rpx;
  font-size: 28rpx;
  color: var(--text-main);
}

.submit-wrap {
  position: fixed;
  left: 40rpx;
  right: 40rpx;
  bottom: calc(28rpx + env(safe-area-inset-bottom));
}
</style>
