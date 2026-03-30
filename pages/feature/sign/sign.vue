<template>
  <view class="container">
    <!-- 签到状态 -->
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

    <!-- 今日签到 -->
    <view class="today-section">
      <view class="section-title">
        <text>今日课程</text>
      </view>
      <view class="today-list">
        <view class="today-item" v-for="(course, index) in todayCourses" :key="course.id">
          <view class="course-info">
            <view class="course-name">{{ course.courseName }}</view>
            <view class="course-teacher">{{ course.teacher }}</view>
            <view class="course-time">{{ course.time }}</view>
          </view>
          <button class="sign-btn" @click="doSign" v-if="!todaySigned && index === 0">立即签到</button>
          <view class="signed-btn" v-else-if="todaySigned && index === 0">已签到</view>
          <view class="sign-btn disabled" v-else>待签到</view>
        </view>
        <view class="no-course" v-if="todayCourses.length === 0">
          <text>今日无课程</text>
        </view>
      </view>
    </view>

    <!-- 签到历史 -->
    <view class="history-section">
      <view class="section-title">
        <text>签到历史</text>
        <text class="more" @click="goToHistory">更多</text>
      </view>
      <view class="history-list">
        <view
          v-for="item in historyList"
          :key="item.id"
          class="history-item"
        >
          <view class="history-info">
            <view class="course-name">{{ item.courseName }}</view>
            <view class="teacher">{{ item.teacher }}</view>
          </view>
          <view class="history-time">
            <view class="time">{{ formatDate(item.time) }}</view>
            <view class="status" :class="item.status">{{ item.status === 'success' ? '已签到' : '未签到' }}</view>
          </view>
        </view>
      </view>
    </view>

    <!-- 请假申请 -->
    <view class="leave-section">
      <view class="section-title">
        <text>请假申请</text>
      </view>
      <view class="leave-form">
        <input
          class="input"
          placeholder="请输入请假原因"
          v-model="leaveReason"
        />
        <input
          class="input"
          placeholder="请输入请假时间"
          v-model="leaveTime"
        />
        <button class="leave-btn" @click="applyLeave">提交请假申请</button>
      </view>
    </view>
    
    <!-- 班级群聊 -->
    <view v-if="className" class="group-chat-section">
      <view class="section-title">
        <text>班级群聊</text>
      </view>
      <view class="group-chat-card" @click="goToGroupChat">
        <view class="group-chat-info">
          <view class="group-name">班级{{ className }}群</view>
          <view class="group-desc">32人在线，点击进入群聊</view>
        </view>
        <view class="group-arrow">›</view>
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
      todayCourses: [],
      todaySigned: false,
      historyList: [],
      leaveReason: '',
      leaveTime: '',
      className: ''
    };
  },
  onLoad() {
    this.loadData();
  },
  onShow() {
    // 页面显示时重新加载数据，确保班级信息更新
    this.loadData();
  },
  created() {
    // 监听用户信息更新事件
    uni.$on('userInfoUpdated', (userInfo) => {
      if (userInfo && userInfo.class) {
        this.className = userInfo.class;
        // 重新获取课程信息
        this.getTodayCourses();
      }
    });
  },
  beforeDestroy() {
    // 移除事件监听
    uni.$off('userInfoUpdated');
  },
  methods: {
    async loadData() {
      // 获取用户班级信息
      const userInfo = uni.getStorageSync('userInfo');
      if (userInfo && userInfo.class) {
        this.className = userInfo.class;
      }

      // 获取签到历史
      try {
        const historyRes = await this.$api.sign.getHistory();
        if (historyRes.list) {
          this.historyList = historyRes.list;
          this.totalSigns = historyRes.list.length;
          // 计算出勤率
          const successCount = historyRes.list.filter(item => item.status === 'success').length;
          this.attendanceRate = Math.round((successCount / historyRes.list.length) * 100);
        }
      } catch (error) {
        console.error('Failed to get sign history:', error);
      }

      // 根据班级获取今日课程
      this.getTodayCourses();
    },
    getTodayCourses() {
      // 模拟根据班级获取课程
      // 实际项目中应该从API获取
      const coursesMap = {
        '大数据2411班': [
          {
            id: 'course_1',
            courseName: '高等数学',
            teacher: '张老师',
            time: '09:00-11:00'
          },
          {
            id: 'course_2',
            courseName: '数据结构',
            teacher: '李老师',
            time: '14:00-16:00'
          }
        ],
        '计算机2412班': [
          {
            id: 'course_1',
            courseName: '大学物理',
            teacher: '王老师',
            time: '09:00-11:00'
          },
          {
            id: 'course_2',
            courseName: 'C语言',
            teacher: '赵老师',
            time: '14:00-16:00'
          }
        ]
      };

      // 默认课程
      const defaultCourses = [
        {
          id: 'course_1',
          courseName: '高等数学',
          teacher: '张老师',
          time: '09:00-11:00'
        }
      ];

      this.todayCourses = coursesMap[this.className] || defaultCourses;
    },
    doSign() {
      // 模拟签到
      uni.showLoading({ title: '正在签到...' });
      setTimeout(() => {
        uni.hideLoading();
        uni.showToast({ title: '签到成功', icon: 'success' });
        this.todaySigned = true;
        // 添加到历史记录
        const signRecord = {
          id: 'sign_' + Date.now(),
          courseName: this.todayCourses[0].courseName,
          teacher: this.todayCourses[0].teacher,
          time: new Date().toISOString(),
          status: 'success'
        };
        this.historyList.unshift(signRecord);
        this.totalSigns++;
        // 重新计算出勤率
        const successCount = this.historyList.filter(item => item.status === 'success').length;
        this.attendanceRate = Math.round((successCount / this.historyList.length) * 100);
      }, 1000);
    },
    goToHistory() {
      // 跳转到签到历史页面
      uni.navigateTo({
        url: '/pages/feature/sign/history'
      });
    },
    applyLeave() {
      if (!this.leaveReason || !this.leaveTime) {
        uni.showToast({ title: '请填写请假原因和时间', icon: 'none' });
        return;
      }
      uni.showLoading({ title: '提交申请...' });
      setTimeout(() => {
        uni.hideLoading();
        uni.showToast({ title: '请假申请已提交', icon: 'success' });
        this.leaveReason = '';
        this.leaveTime = '';
      }, 1000);
    },
    goToGroupChat() {
      // 跳转到班级群聊页面
      uni.navigateTo({
        url: '/pages/feature/sign/group-chat'
      });
    },
    formatDate(dateString) {
      const date = new Date(dateString);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    }
  }
};
</script>

<style scoped>
.container {
  padding: 16rpx;
}

.status-card {
  background-color: #1E88E5;
  color: #ffffff;
  border-radius: 12rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
  text-align: center;
}

.status-title {
  font-size: 32rpx;
  font-weight: bold;
  margin-bottom: 8rpx;
}

.status-subtitle {
  font-size: 24rpx;
  opacity: 0.8;
  margin-bottom: 16rpx;
}

.status-content {
  display: flex;
  justify-content: space-around;
  margin-bottom: 24rpx;
}

.stat-item {
  flex: 1;
}

.stat-value {
  font-size: 48rpx;
  font-weight: bold;
  margin-bottom: 8rpx;
}

.stat-label {
  font-size: 24rpx;
  opacity: 0.8;
}

.today-section,
.history-section,
.leave-section {
  margin-bottom: 24rpx;
}

.section-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12rpx;
  font-size: 32rpx;
  font-weight: bold;
  color: #333333;
}

.more {
  font-size: 24rpx;
  color: #1E88E5;
}

.today-list,
.history-list,
.leave-form {
  background-color: #ffffff;
  border-radius: 12rpx;
  padding: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
}

.today-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx;
  background-color: #f5f5f5;
  border-radius: 8rpx;
}

.course-info {
  flex: 1;
}

.course-name {
  font-size: 32rpx;
  font-weight: bold;
  margin-bottom: 8rpx;
  color: #333333;
}

.course-teacher {
  font-size: 24rpx;
  color: #666666;
  margin-bottom: 4rpx;
}

.course-time {
  font-size: 24rpx;
  color: #666666;
}

.teacher {
  font-size: 24rpx;
  color: #666666;
  margin-top: 4rpx;
}

.sign-btn.disabled {
  background-color: #9E9E9E;
  color: #ffffff;
  border-radius: 8rpx;
  font-size: 28rpx;
  padding: 12rpx 24rpx;
  text-align: center;
}

.sign-btn {
  background-color: #1E88E5;
  color: #ffffff;
  border-radius: 8rpx;
  font-size: 28rpx;
  padding: 12rpx 24rpx;
}

.signed-btn {
  background-color: #4CAF50;
  color: #ffffff;
  border-radius: 8rpx;
  font-size: 28rpx;
  padding: 12rpx 24rpx;
  text-align: center;
}

.no-course {
  text-align: center;
  padding: 40rpx;
  color: #999999;
  font-size: 28rpx;
}

.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12rpx 0;
  border-bottom: 1rpx solid #e0e0e0;
}

.history-item:last-child {
  border-bottom: none;
}

.history-info {
  flex: 1;
}

.history-time {
  text-align: right;
}

.time {
  font-size: 24rpx;
  color: #666666;
  margin-bottom: 4rpx;
}

.status {
  font-size: 24rpx;
  padding: 4rpx 12rpx;
  border-radius: 12rpx;
}

.status.success {
  background-color: #4CAF50;
  color: #ffffff;
}

.status.failed {
  background-color: #f44336;
  color: #ffffff;
}

.leave-form {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.input {
  padding: 16rpx;
  border: 2rpx solid #e0e0e0;
  border-radius: 8rpx;
  font-size: 28rpx;
}

.leave-btn {
  background-color: #1E88E5;
  color: #ffffff;
  border-radius: 8rpx;
  font-size: 32rpx;
  padding: 16rpx;
  width: 100%;
}

.group-chat-section {
  margin-bottom: 24rpx;
}

.group-chat-card {
  background-color: #ffffff;
  border-radius: 12rpx;
  padding: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.group-chat-info {
  flex: 1;
}

.group-name {
  font-size: 32rpx;
  font-weight: bold;
  margin-bottom: 8rpx;
  color: #333333;
}

.group-desc {
  font-size: 24rpx;
  color: #666666;
}

.group-arrow {
  font-size: 32rpx;
  color: #999999;
}
</style>
