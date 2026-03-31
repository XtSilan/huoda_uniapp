<template>
  <view class="page-shell sign-page">
    <view class="page-header">
      <view class="page-eyebrow">班级签到</view>
      <view class="page-title">{{ className || '还没有绑定班级' }}</view>
      <view class="page-subtitle">把签到、课程提醒、历史记录和请假申请收成同一套卡片体验。</view>
    </view>

    <view class="status-card">
      <view class="status-grid">
        <view class="status-item">
          <view class="status-label">总签到次数</view>
          <view class="status-value">{{ totalSigns }}</view>
        </view>
        <view class="status-item">
          <view class="status-label">出勤率</view>
          <view class="status-value">{{ attendanceRate }}%</view>
        </view>
      </view>
    </view>

    <view class="section-block">
      <view class="section-row">
        <text class="section-heading">今日课程</text>
      </view>
      <view class="surface-card section-card">
        <view v-if="todayCourses.length === 0" class="empty-state">今天没有课程安排</view>
        <view v-for="course in todayCourses" :key="course.id" class="course-item">
          <view class="course-item__body">
            <view class="course-name">{{ course.courseName }}</view>
            <view class="course-meta">{{ course.teacher }} · {{ course.time }}</view>
          </view>
          <view class="course-action">
            <custom-button :text="todaySigned ? '已签到' : '立即签到'" :ghost="todaySigned" @click="doSign(course)" />
          </view>
        </view>
      </view>
    </view>

    <view class="section-block">
      <view class="section-row">
        <text class="section-heading">签到历史</text>
      </view>
      <view class="surface-card section-card">
        <view v-if="historyList.length === 0" class="empty-state">暂无签到历史</view>
        <view v-for="item in historyList" :key="item.id" class="history-item">
          <view>
            <view class="course-name">{{ item.courseName }}</view>
            <view class="course-meta">{{ item.teacher }}</view>
          </view>
          <view class="history-time">{{ formatDate(item.time) }}</view>
        </view>
      </view>
    </view>

    <view class="section-block">
      <view class="section-row">
        <text class="section-heading">请假申请</text>
      </view>
      <view class="surface-card leave-card">
        <text class="field-title">请假原因</text>
        <view class="field-panel">
          <input class="field-input" v-model="leaveReason" placeholder="请输入请假原因" />
        </view>
        <text class="field-title field-gap">请假时间</text>
        <view class="field-panel">
          <input class="field-input" v-model="leaveTime" placeholder="请输入请假时间" />
        </view>
        <view class="leave-action">
          <custom-button text="提交请假申请" @click="applyLeave" />
        </view>
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
      if (this.todaySigned) {
        return;
      }
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
      return value ? new Date(value).toLocaleString() : '-';
    }
  }
};
</script>

<style scoped>
.status-card {
  padding: 28rpx;
  border-radius: 36rpx;
  background: linear-gradient(135deg, rgba(138, 100, 255, 0.95), rgba(107, 72, 255, 1));
  color: #ffffff;
  box-shadow: var(--shadow-md);
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16rpx;
}

.status-item {
  padding: 22rpx;
  border-radius: 24rpx;
  background: rgba(255, 255, 255, 0.12);
}

.status-label {
  font-size: 22rpx;
  opacity: 0.85;
}

.status-value {
  margin-top: 10rpx;
  font-size: 40rpx;
  font-weight: 700;
}

.section-card,
.leave-card {
  padding: 24rpx;
}

.course-item,
.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 18rpx;
  padding: 18rpx 0;
}

.course-item + .course-item,
.history-item + .history-item {
  border-top: 1rpx solid #eef1f7;
}

.course-item__body {
  flex: 1;
}

.course-name {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--text-main);
}

.course-meta,
.history-time {
  margin-top: 10rpx;
  font-size: 24rpx;
  color: var(--text-sub);
}

.course-action {
  width: 180rpx;
}

.field-title {
  display: block;
  margin-bottom: 14rpx;
  font-size: 28rpx;
  font-weight: 700;
  color: var(--text-main);
}

.field-gap {
  margin-top: 20rpx;
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

.leave-action {
  margin-top: 24rpx;
}
</style>
