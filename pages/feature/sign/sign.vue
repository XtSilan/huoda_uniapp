<template>
  <view class="container">
    <view class="status-card">
      <view class="status-title">班级签到</view>
      <view class="status-subtitle">{{ className || '未设置班级' }}</view>
      <view class="status-content">
        <view class="stat-item">
          <view class="stat-value">{{ totalSigns }}</view>
          <view class="stat-label">总签到次数</view>
        </view>
        <view class="stat-item">
          <view class="stat-value">{{ attendanceRate }}%</view>
          <view class="stat-label">出勤率</view>
        </view>
      </view>
    </view>

    <view class="today-section">
      <view class="section-title">今日课程</view>
      <view class="today-list">
        <view v-for="course in todayCourses" :key="course.id" class="today-item">
          <view>
            <view class="course-name">{{ course.courseName }}</view>
            <view class="course-teacher">{{ course.teacher }}</view>
            <view class="course-time">{{ course.time }}</view>
          </view>
          <button class="sign-btn" :disabled="todaySigned" @click="doSign(course)">
            {{ todaySigned ? '已签到' : '立即签到' }}
          </button>
        </view>
      </view>
    </view>

    <view class="history-section">
      <view class="section-title">签到历史</view>
      <view class="history-list">
        <view v-for="item in historyList" :key="item.id" class="history-item">
          <view>
            <view class="course-name">{{ item.courseName }}</view>
            <view class="course-teacher">{{ item.teacher }}</view>
          </view>
          <view>{{ formatDate(item.time) }}</view>
        </view>
      </view>
    </view>

    <view class="leave-section">
      <view class="section-title">请假申请</view>
      <view class="leave-form">
        <input class="input" v-model="leaveReason" placeholder="请输入请假原因" />
        <input class="input" v-model="leaveTime" placeholder="请输入请假时间" />
        <button class="leave-btn" @click="applyLeave">提交请假申请</button>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      totalSigns: 0,
      attendanceRate: 0,
      historyList: [],
      leaveReason: '',
      leaveTime: '',
      todaySigned: false,
      className: '',
      todayCourses: [
        { id: 'course-1', courseName: '高等数学', teacher: '张老师', time: '09:00-11:00' }
      ]
    };
  },
  onShow() {
    const userInfo = uni.getStorageSync('userInfo') || {};
    this.className = userInfo.class || '';
    this.loadData();
  },
  methods: {
    async loadData() {
      try {
        const [historyRes, statRes] = await Promise.all([
          this.$api.sign.getHistory(),
          this.$api.sign.getStatistics()
        ]);
        this.historyList = historyRes.list || [];
        this.totalSigns = statRes.total || 0;
        this.attendanceRate = statRes.attendanceRate || 0;
      } catch (error) {
        uni.showToast({ title: error.message || '获取签到数据失败', icon: 'none' });
      }
    },
    async doSign(course) {
      try {
        await this.$api.sign.doSign({
          courseName: course.courseName,
          teacher: course.teacher
        });
        this.todaySigned = true;
        await this.loadData();
        uni.showToast({ title: '签到成功', icon: 'success' });
      } catch (error) {
        uni.showToast({ title: error.message || '签到失败', icon: 'none' });
      }
    },
    async applyLeave() {
      if (!this.leaveReason || !this.leaveTime) {
        uni.showToast({ title: '请填写请假原因和时间', icon: 'none' });
        return;
      }
      try {
        await this.$api.sign.applyLeave({
          reason: this.leaveReason,
          leaveTime: this.leaveTime
        });
        this.leaveReason = '';
        this.leaveTime = '';
        uni.showToast({ title: '请假申请已提交', icon: 'success' });
      } catch (error) {
        uni.showToast({ title: error.message || '提交失败', icon: 'none' });
      }
    },
    formatDate(value) {
      return new Date(value).toLocaleString();
    }
  }
};
</script>

<style scoped>
.container {
  padding: 16rpx;
}

.status-card {
  background: #1e88e5;
  color: #ffffff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
}

.status-title {
  font-size: 34rpx;
  font-weight: 700;
}

.status-subtitle {
  margin-top: 8rpx;
  font-size: 24rpx;
}

.status-content {
  display: flex;
  justify-content: space-between;
  margin-top: 24rpx;
}

.stat-item {
  flex: 1;
}

.stat-value {
  font-size: 44rpx;
  font-weight: 700;
}

.today-list,
.history-list,
.leave-form {
  background: #ffffff;
  border-radius: 12rpx;
  padding: 16rpx;
}

.today-item,
.history-item {
  display: flex;
  justify-content: space-between;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #ececec;
}

.today-item:last-child,
.history-item:last-child {
  border-bottom: none;
}

.section-title {
  font-size: 30rpx;
  font-weight: 700;
  margin-bottom: 12rpx;
}

.today-section,
.history-section,
.leave-section {
  margin-bottom: 24rpx;
}

.course-name {
  font-size: 28rpx;
  font-weight: 600;
}

.course-teacher,
.course-time,
.input {
  font-size: 24rpx;
  color: #666666;
  margin-top: 8rpx;
}

.input {
  width: 100%;
  padding: 16rpx;
  border: 2rpx solid #e5e7eb;
  border-radius: 10rpx;
  margin-bottom: 16rpx;
}

.sign-btn,
.leave-btn {
  background: #1e88e5;
  color: #ffffff;
  border-radius: 10rpx;
}
</style>
