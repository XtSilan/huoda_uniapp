<template>
  <view class="container">
    <view class="form">
      <!-- 年级选择 -->
      <view class="form-item">
        <text class="label">年级</text>
        <view class="option-group">
          <view
            v-for="grade in grades"
            :key="grade"
            class="option-item"
            :class="{ active: userInfo.grade === grade }"
            @click="selectGrade(grade)"
          >
            {{ grade }}
          </view>
        </view>
      </view>
      
      <!-- 学历类型选择 -->
      <view class="form-item">
        <text class="label">学历类型</text>
        <view class="option-group">
          <view
            v-for="education in educationTypes"
            :key="education"
            class="option-item"
            :class="{ active: userInfo.educationType === education }"
            @click="selectEducationType(education)"
          >
            {{ education }}
          </view>
        </view>
      </view>
      
      <!-- 兴趣选择 -->
      <view class="form-item">
        <text class="label">兴趣</text>
        <view class="option-group">
          <view
            v-for="interest in interests"
            :key="interest"
            class="option-item"
            :class="{ active: userInfo.interests.includes(interest) }"
            @click="toggleInterest(interest)"
          >
            {{ interest }}
          </view>
        </view>
      </view>
      
      <!-- 未来规划选择 -->
      <view class="form-item">
        <text class="label">未来规划</text>
        <view class="option-group">
          <view
            v-for="plan in futurePlans"
            :key="plan"
            class="option-item"
            :class="{ active: userInfo.futurePlan === plan }"
            @click="selectFuturePlan(plan)"
          >
            {{ plan }}
          </view>
        </view>
      </view>
      
      <!-- 通知设置 -->
      <view class="form-item">
        <text class="label">通知设置</text>
        <view class="toggle-group">
          <view class="toggle-item">
            <text class="toggle-label">接收活动通知</text>
            <switch v-model="userInfo.notification.activity" />
          </view>
          <view class="toggle-item">
            <text class="toggle-label">接收讲座通知</text>
            <switch v-model="userInfo.notification.lecture" />
          </view>
          <view class="toggle-item">
            <text class="toggle-label">接收兼职通知</text>
            <switch v-model="userInfo.notification.partTime" />
          </view>
        </view>
      </view>
      
      <!-- 界面设置 -->
      <view class="form-item">
        <text class="label">界面设置</text>
        <view class="toggle-group">
          <view class="toggle-item">
            <text class="toggle-label">深色模式</text>
            <switch v-model="userInfo.theme.darkMode" />
          </view>
          <view class="toggle-item">
            <text class="toggle-label">自动刷新</text>
            <switch v-model="userInfo.theme.autoRefresh" />
          </view>
        </view>
      </view>
      
      <button class="submit-btn" @click="submitForm">保存设置</button>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      userInfo: {
        grade: '',
        educationType: '',
        interests: [],
        futurePlan: '',
        notification: {
          activity: true,
          lecture: true,
          partTime: true
        },
        theme: {
          darkMode: false,
          autoRefresh: true
        }
      },
      grades: ['大一', '大二', '大三', '大四'],
      educationTypes: ['本科', '专科'],
      interests: ['讲座', '公益', '兼职', '就业', '娱乐', '竞赛', '美食'],
      futurePlans: ['考研', '就业']
    };
  },
  onLoad() {
    // 从本地存储获取用户信息
    const storedUserInfo = uni.getStorageSync('userInfo');
    if (storedUserInfo) {
      this.userInfo = {
        ...this.userInfo,
        ...storedUserInfo,
        notification: {
          activity: true,
          lecture: true,
          partTime: true,
          ...(storedUserInfo.notification || {})
        },
        theme: {
          darkMode: false,
          autoRefresh: true,
          ...(storedUserInfo.theme || {})
        }
      };
    }
  },
  methods: {
    selectGrade(grade) {
      this.userInfo.grade = grade;
    },
    selectEducationType(education) {
      this.userInfo.educationType = education;
    },
    toggleInterest(interest) {
      const index = this.userInfo.interests.indexOf(interest);
      if (index > -1) {
        this.userInfo.interests.splice(index, 1);
      } else {
        this.userInfo.interests.push(interest);
      }
    },
    selectFuturePlan(plan) {
      this.userInfo.futurePlan = plan;
    },
    submitForm() {
      // 表单验证
      if (!this.userInfo.grade) {
        uni.showToast({ title: '请选择年级', icon: 'none' });
        return;
      }
      if (!this.userInfo.educationType) {
        uni.showToast({ title: '请选择学历类型', icon: 'none' });
        return;
      }
      if (!this.userInfo.futurePlan) {
        uni.showToast({ title: '请选择未来规划', icon: 'none' });
        return;
      }
      
      // 保存用户信息
      uni.setStorageSync('userInfo', this.userInfo);
      uni.showToast({ title: '保存成功', icon: 'success' });
      
      // 通知其他页面更新用户信息
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

.option-group {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-top: 8rpx;
}

.option-item {
  padding: 12rpx 20rpx;
  border: 2rpx solid #e0e0e0;
  border-radius: 20rpx;
  font-size: 24rpx;
  transition: all 0.3s ease;
  cursor: pointer;
}

.option-item.active {
  background-color: #1E88E5;
  color: #ffffff;
  border-color: #1E88E5;
}

.toggle-group {
  margin-top: 8rpx;
}

.toggle-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12rpx 0;
  border-bottom: 1rpx solid #e0e0e0;
}

.toggle-item:last-child {
  border-bottom: none;
}

.toggle-label {
  font-size: 28rpx;
  color: #333333;
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