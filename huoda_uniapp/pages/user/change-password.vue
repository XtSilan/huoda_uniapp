<template>
  <view class="page-shell change-password-page">
    <view class="page-header">
      <page-nav fallback="/pages/user/account-security" />
      <view class="page-eyebrow">账户安全</view>
      <view class="page-title">修改密码</view>
      <view class="page-subtitle">定期更新密码，让账号更安全</view>
    </view>

    <view class="surface-card section-card">
      <view class="section-heading">密码修改</view>
      <view class="field-block">
        <text class="field-label">旧密码</text>
        <view class="field-panel">
          <input
            v-model="passwordForm.oldPassword"
            class="field-input"
            password
            placeholder="请输入当前密码"
          />
        </view>
      </view>
      <view class="field-block">
        <text class="field-label">新密码</text>
        <view class="field-panel">
          <input
            v-model="passwordForm.newPassword"
            class="field-input"
            password
            placeholder="请输入新密码"
          />
        </view>
      </view>
      <view class="tips-text">密码建议至少 6 位，并尽量包含字母和数字组合。</view>
      <view class="save-wrap">
        <custom-button text="修改密码" :loading="passwordLoading" @click="changePassword" />
      </view>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      passwordLoading: false,
      passwordForm: {
        oldPassword: '',
        newPassword: ''
      }
    };
  },
  methods: {
    async changePassword() {
      if (!this.passwordForm.oldPassword || !this.passwordForm.newPassword) {
        uni.showToast({ title: '请填写旧密码和新密码', icon: 'none' });
        return;
      }
      if (this.passwordForm.newPassword.length < 6) {
        uni.showToast({ title: '新密码至少 6 位', icon: 'none' });
        return;
      }
      this.passwordLoading = true;
      try {
        await this.$api.user.changePassword(this.passwordForm);
        this.passwordForm.oldPassword = '';
        this.passwordForm.newPassword = '';
        uni.showToast({ title: '密码修改成功', icon: 'success' });
        setTimeout(() => {
          uni.navigateBack();
        }, 300);
      } catch (error) {
        uni.showToast({ title: error.message || '密码修改失败', icon: 'none' });
      } finally {
        this.passwordLoading = false;
      }
    }
  }
};
</script>

<style scoped>
.section-card {
  padding: 28rpx 24rpx;
}

.field-block + .field-block,
.tips-text,
.save-wrap {
  margin-top: 22rpx;
}

.field-label {
  display: block;
  margin-bottom: 14rpx;
  font-size: 28rpx;
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

.tips-text {
  font-size: 24rpx;
  line-height: 1.7;
  color: var(--text-sub);
}
</style>
