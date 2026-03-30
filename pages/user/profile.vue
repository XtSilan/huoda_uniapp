<template>
  <view class="container">
    <view class="form">
      <view class="form-item">
        <text class="label">姓名</text>
        <input
          class="input"
          placeholder="请输入姓名"
          v-model="userInfo.name"
        />
      </view>
      
      <view class="form-item">
        <text class="label">学号</text>
        <input
          class="input"
          placeholder="请输入学号"
          v-model="userInfo.studentId"
          type="number"
          disabled
        />
      </view>
      
      <view class="form-item">
        <text class="label">学校</text>
        <input
          class="input"
          placeholder="请输入学校名称"
          v-model="userInfo.school"
        />
      </view>
      
      <view class="form-item">
        <text class="label">院系</text>
        <input
          class="input"
          placeholder="请输入院系"
          v-model="userInfo.department"
        />
      </view>
      
      <view class="form-item">
        <text class="label">班级</text>
        <input
          class="input"
          placeholder="请输入班级"
          v-model="userInfo.class"
        />
      </view>
      
      <view class="form-item">
        <text class="label">联系方式</text>
        <input
          class="input"
          placeholder="请输入手机号码"
          v-model="userInfo.phone"
          type="number"
        />
      </view>
      
      <button class="submit-btn" @click="submitForm">保存信息</button>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      userInfo: {
        name: '',
        studentId: '',
        school: '',
        department: '',
        class: '',
        phone: ''
      }
    };
  },
  onLoad() {
    // 从本地存储获取用户信息
    const storedUserInfo = uni.getStorageSync('userInfo');
    if (storedUserInfo) {
      this.userInfo = { ...this.userInfo, ...storedUserInfo };
    }
  },
  methods: {
    submitForm() {
      // 表单验证
      if (!this.userInfo.name) {
        uni.showToast({ title: '请输入姓名', icon: 'none' });
        return;
      }
      if (!this.userInfo.school) {
        uni.showToast({ title: '请输入学校名称', icon: 'none' });
        return;
      }
      if (!this.userInfo.department) {
        uni.showToast({ title: '请输入院系', icon: 'none' });
        return;
      }
      if (!this.userInfo.class) {
        uni.showToast({ title: '请输入班级', icon: 'none' });
        return;
      }
      if (!this.userInfo.phone) {
        uni.showToast({ title: '请输入手机号码', icon: 'none' });
        return;
      }
      
      // 保存用户信息
      uni.setStorageSync('userInfo', this.userInfo);
      uni.showToast({ title: '保存成功', icon: 'success' });
      
      // 通知其他页面更新班级信息
      uni.$emit('userInfoUpdated', this.userInfo);
      
      // 返回到上一页
      uni.navigateBack();
    }
  }
};
</script>

<style scoped>
.container {
  padding: 16rpx;
  background-color: #f5f5f5;
  min-height: 100vh;
}

.form {
  background-color: #ffffff;
  border-radius: 12rpx;
  padding: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
}

.form-item {
  margin-bottom: 24rpx;
}

.label {
  display: block;
  font-size: 28rpx;
  font-weight: bold;
  margin-bottom: 8rpx;
  color: #333333;
}

.input {
  width: 100%;
  padding: 16rpx;
  border: 2rpx solid #e0e0e0;
  border-radius: 8rpx;
  font-size: 28rpx;
}

.input:disabled {
  background-color: #f5f5f5;
  color: #999999;
}

.submit-btn {
  width: 100%;
  padding: 16rpx;
  background-color: #1E88E5;
  color: #ffffff;
  border-radius: 8rpx;
  font-size: 32rpx;
  margin-top: 24rpx;
}
</style>