<template>
  <view class="container">
    <view class="form">
      <view class="form-item">
        <text class="label">姓名</text>
        <input class="input" v-model="userInfo.name" placeholder="请输入姓名" />
      </view>

      <view class="form-item">
        <text class="label">学号</text>
        <input class="input" v-model="userInfo.studentId" disabled />
      </view>

      <view class="form-item">
        <text class="label">学校</text>
        <input class="input" v-model="userInfo.school" placeholder="请输入学校" />
      </view>

      <view class="form-item">
        <text class="label">院系</text>
        <input class="input" v-model="userInfo.department" placeholder="请输入院系" />
      </view>

      <view class="form-item">
        <text class="label">班级</text>
        <input class="input" v-model="userInfo.class" placeholder="请输入班级" />
      </view>

      <view class="form-item">
        <text class="label">手机号</text>
        <input class="input" v-model="userInfo.phone" placeholder="请输入手机号" />
      </view>

      <button class="submit-btn" :loading="loading" @click="submitForm">保存信息</button>
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
  onLoad() {
    this.loadProfile();
  },
  methods: {
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
.container {
  padding: 16rpx;
}

.form {
  background: #ffffff;
  border-radius: 12rpx;
  padding: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.08);
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

.input {
  width: 100%;
  padding: 16rpx;
  border: 2rpx solid #e5e7eb;
  border-radius: 10rpx;
  font-size: 28rpx;
}

.submit-btn {
  width: 100%;
  background: #1e88e5;
  color: #ffffff;
  border-radius: 10rpx;
  font-size: 30rpx;
}
</style>
