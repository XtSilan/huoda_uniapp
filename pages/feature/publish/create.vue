<template>
  <view class="container">
    <view class="form">
      <!-- 活动标题 -->
      <view class="form-item">
        <text class="label">活动标题</text>
        <input
          class="input"
          placeholder="请输入活动标题"
          v-model="activity.title"
          @input="searchRelatedActivities"
        />
      </view>

      <!-- 相关活动推荐 -->
      <view class="related-activities" v-if="relatedActivities.length > 0">
        <view class="section-title">
          <text>相关活动推荐</text>
        </view>
        <view class="related-list">
          <view
            v-for="activity in relatedActivities"
            :key="activity.id"
            class="related-item"
            @click="useRelatedActivity(activity)"
          >
            <view class="related-title">{{ activity.title }}</view>
            <view class="related-meta">
              <text class="meta-time">{{ formatDate(activity.startTime) }}</text>
              <text class="meta-location">{{ activity.location }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 活动内容 -->
      <view class="form-item">
        <text class="label">活动内容</text>
        <textarea
          class="textarea"
          placeholder="请输入活动内容"
          v-model="activity.content"
          rows="5"
        ></textarea>
      </view>

      <!-- 活动时间 -->
      <view class="form-item">
        <text class="label">开始时间</text>
        <input
          class="input"
          placeholder="请选择开始时间"
          v-model="activity.startTime"
          @click="pickStartTime"
        />
      </view>

      <view class="form-item">
        <text class="label">结束时间</text>
        <input
          class="input"
          placeholder="请选择结束时间"
          v-model="activity.endTime"
          @click="pickEndTime"
        />
      </view>

      <!-- 活动地点 -->
      <view class="form-item">
        <text class="label">活动地点</text>
        <input
          class="input"
          placeholder="请输入活动地点"
          v-model="activity.location"
        />
      </view>

      <!-- 活动地点类型 -->
      <view class="form-item">
        <text class="label">活动地点类型</text>
        <view class="location-type-selector">
          <view
            v-for="locationType in locationTypes"
            :key="locationType"
            class="type-item"
            :class="{ active: activity.locationType === locationType }"
            @click="selectLocationType(locationType)"
          >
            {{ locationType }}
          </view>
        </view>
      </view>

      <!-- 活动类型 -->
      <view class="form-item">
        <text class="label">活动类型</text>
        <view class="activity-type-selector">
          <view
            v-for="type in activityTypes"
            :key="type"
            class="type-item"
            :class="{ active: activity.activityType === type }"
            @click="selectActivityType(type)"
          >
            {{ type }}
          </view>
        </view>
      </view>

      <!-- 活动组织方 -->
      <view class="form-item">
        <text class="label">组织方</text>
        <input
          class="input"
          placeholder="请输入组织方"
          v-model="activity.organizer"
        />
      </view>

      <!-- 活动图片 -->
      <view class="form-item">
        <text class="label">活动图片</text>
        <view class="upload-container">
          <view
            class="upload-item"
            v-for="(image, index) in activity.images"
            :key="index"
          >
            <image :src="image" mode="aspectFill"></image>
            <view class="delete-btn" @click="deleteImage(index)">
              <text>×</text>
            </view>
          </view>
          <view class="upload-btn" @click="chooseImage">
            <text>+</text>
          </view>
        </view>
      </view>

      <!-- 提交按钮 -->
      <button class="submit-btn" @click="submitForm">发布活动</button>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      activity: {
        title: '',
        content: '',
        startTime: '',
        endTime: '',
        location: '',
        locationType: '校内',
        organizer: '',
        images: [],
        activityType: '其他'
      },
      activityTypes: ['讲座', '公益', '兼职', '就业', '娱乐', '竞赛', '美食', '其他'],
      locationTypes: ['校内', '校外'],
      relatedActivities: []
    };
  },
  onLoad() {
    // 要求输入管理者权限密码（与用户登录密码同步）
    this.requireAdminPassword();
  },
  methods: {
    requireAdminPassword() {
      // 简化密码验证，直接通过
      // 实际应用中应该让用户输入密码进行验证
      console.log('密码验证成功');
    },

    pickStartTime() {
      // 先选择日期
      wx.datePicker({
        start: new Date().getTime(),
        success: (dateRes) => {
          // 再选择时间
          wx.timePicker({
            success: (timeRes) => {
              // 组合日期和时间
              const date = new Date(dateRes.year, dateRes.month - 1, dateRes.day, timeRes.hour, timeRes.minute);
              this.activity.startTime = date.toISOString();
            }
          });
        }
      });
    },
    pickEndTime() {
      // 先选择日期
      wx.datePicker({
        start: new Date().getTime(),
        success: (dateRes) => {
          // 再选择时间
          wx.timePicker({
            success: (timeRes) => {
              // 组合日期和时间
              const date = new Date(dateRes.year, dateRes.month - 1, dateRes.day, timeRes.hour, timeRes.minute);
              this.activity.endTime = date.toISOString();
            }
          });
        }
      });
    },
    chooseImage() {
      uni.chooseImage({
        count: 9 - this.activity.images.length,
        sizeType: ['original', 'compressed'],
        sourceType: ['album', 'camera'],
        success: (res) => {
          this.activity.images = [...this.activity.images, ...res.tempFilePaths];
        }
      });
    },
    deleteImage(index) {
      this.activity.images.splice(index, 1);
    },
    searchRelatedActivities() {
      // 当用户输入活动标题时，搜索相关活动
      if (this.activity.title.length > 2) {
        const activities = uni.getStorageSync('activities') || [];
        this.relatedActivities = activities.filter(activity => 
          activity.title.includes(this.activity.title)
        );
      } else {
        this.relatedActivities = [];
      }
    },
    useRelatedActivity(activity) {
      // 使用相关活动的信息填充表单
      this.activity = {
        title: activity.title,
        content: activity.content,
        startTime: activity.startTime,
        endTime: activity.endTime,
        location: activity.location,
        organizer: activity.organizer,
        images: activity.images,
        activityType: activity.activityType || '其他'
      };
      // 清空相关活动推荐
      this.relatedActivities = [];
    },
    selectActivityType(type) {
      this.activity.activityType = type;
    },
    selectLocationType(locationType) {
      this.activity.locationType = locationType;
    },
    formatDate(dateString) {
      const date = new Date(dateString);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    },
    submitForm() {
      // 表单验证
      if (!this.activity.title) {
        uni.showToast({ title: '请输入活动标题', icon: 'none' });
        return;
      }
      if (!this.activity.content) {
        uni.showToast({ title: '请输入活动内容', icon: 'none' });
        return;
      }
      if (!this.activity.startTime) {
        uni.showToast({ title: '请选择开始时间', icon: 'none' });
        return;
      }
      if (!this.activity.endTime) {
        uni.showToast({ title: '请选择结束时间', icon: 'none' });
        return;
      }
      if (!this.activity.location) {
        uni.showToast({ title: '请输入活动地点', icon: 'none' });
        return;
      }
      if (!this.activity.organizer) {
        uni.showToast({ title: '请输入组织方', icon: 'none' });
        return;
      }

      // 模拟提交
      uni.showLoading({ title: '发布中...' });
      setTimeout(() => {
        // 保存活动到本地存储
        const activities = uni.getStorageSync('activities') || [];
        const newActivity = {
          id: 'activity_' + Date.now(),
          title: this.activity.title,
          content: this.activity.content,
          startTime: this.activity.startTime,
          endTime: this.activity.endTime,
          location: this.activity.location,
          locationType: this.activity.locationType,
          organizer: this.activity.organizer,
          images: this.activity.images,
          activityType: this.activity.activityType,
          status: 'upcoming',
          publishTime: new Date().toISOString()
        };
        activities.unshift(newActivity);
        uni.setStorageSync('activities', activities);
        
        // 同时保存到首页推荐列表
        const recommendList = uni.getStorageSync('recommendList') || [];
        recommendList.unshift({
          id: newActivity.id,
          title: newActivity.title,
          content: newActivity.content,
          source: newActivity.organizer,
          publishTime: newActivity.publishTime
        });
        // 限制推荐列表数量
        if (recommendList.length > 5) {
          recommendList.splice(5);
        }
        uni.setStorageSync('recommendList', recommendList);
        
        uni.hideLoading();
        uni.showToast({ title: '发布成功', icon: 'success' });
        // 跳转到活动列表页面
        setTimeout(() => {
          uni.navigateBack();
        }, 500);
      }, 1000);
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

.textarea {
  width: 100%;
  padding: 16rpx;
  border: 2rpx solid #e0e0e0;
  border-radius: 8rpx;
  font-size: 28rpx;
  min-height: 200rpx;
  resize: none;
}

.upload-container {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.upload-item {
  position: relative;
  width: 160rpx;
  height: 160rpx;
  border-radius: 8rpx;
  overflow: hidden;
}

.upload-item image {
  width: 100%;
  height: 100%;
}

.delete-btn {
  position: absolute;
  top: 8rpx;
  right: 8rpx;
  width: 32rpx;
  height: 32rpx;
  background-color: rgba(0, 0, 0, 0.6);
  border-radius: 16rpx;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #ffffff;
  font-size: 24rpx;
  font-weight: bold;
}

.upload-btn {
  width: 160rpx;
  height: 160rpx;
  border: 2rpx dashed #e0e0e0;
  border-radius: 8rpx;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 48rpx;
  color: #999999;
}

.activity-type-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-top: 8rpx;
}

.type-item {
  padding: 12rpx 20rpx;
  border: 2rpx solid #e0e0e0;
  border-radius: 20rpx;
  font-size: 24rpx;
  transition: all 0.3s ease;
  cursor: pointer;
}

.type-item.active {
  background-color: #1E88E5;
  color: #ffffff;
  border-color: #1E88E5;
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

.related-activities {
  margin-bottom: 24rpx;
  padding: 16rpx;
  background-color: #f5f5f5;
  border-radius: 8rpx;
}

.related-list {
  margin-top: 12rpx;
}

.related-item {
  padding: 12rpx;
  background-color: #ffffff;
  border-radius: 8rpx;
  margin-bottom: 8rpx;
  box-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.1);
}

.related-title {
  font-size: 28rpx;
  font-weight: bold;
  margin-bottom: 4rpx;
  color: #333333;
}

.related-meta {
  display: flex;
  justify-content: space-between;
  font-size: 24rpx;
  color: #666666;
}

.meta-time {
  flex: 1;
}

.meta-location {
  flex: 1;
  text-align: right;
}
</style>
