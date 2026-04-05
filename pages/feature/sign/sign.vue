<template>
  <view class="page-shell sign-page">
    <view class="page-header">
      <page-nav fallback="/pages/index/index" :is-tab="true" />
      <view class="page-eyebrow">{{ isTeacherMode ? '教师签到台' : '班级签到' }}</view>
      <view class="page-title">{{ className || '暂未绑定班级' }}</view>
      <view class="page-subtitle">
        {{ isTeacherMode ? '发起签到、审批请假、查看班级签到情况' : '按签到批次完成签到、补签和请假申请' }}
      </view>
    </view>

    <view v-if="isTeacherMode" class="status-card">
      <view class="status-grid status-grid--teacher">
        <view class="status-item">
          <view class="status-label">今日批次</view>
          <view class="status-value">{{ teacherStats.todayBatchCount }}</view>
        </view>
        <view class="status-item">
          <view class="status-label">待审请假</view>
          <view class="status-value">{{ teacherStats.pendingLeaveCount }}</view>
        </view>
        <view class="status-item">
          <view class="status-label">已签到</view>
          <view class="status-value">{{ teacherStats.signedCount }}</view>
        </view>
        <view class="status-item">
          <view class="status-label">待签到</view>
          <view class="status-value">{{ teacherStats.unsignedCount }}</view>
        </view>
      </view>
    </view>

    <view v-else class="status-card">
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

    <template v-if="isTeacherMode">
      <view class="section-block">
        <view class="section-row">
          <text class="section-heading">发起签到</text>
        </view>
        <view class="surface-card section-card">
          <text class="field-title">课程名称</text>
          <view class="field-panel">
            <input v-model="teacherForm.courseName" class="field-input" placeholder="例如：高等数学" />
          </view>

          <text class="field-title field-gap">签到日期</text>
          <picker mode="date" :value="teacherForm.signDate" @change="updateTeacherFormValue('signDate', $event.detail.value)">
            <view class="picker-field">{{ teacherForm.signDate }}</view>
          </picker>

          <text class="field-title field-gap">签到开始</text>
          <picker mode="time" :value="teacherForm.startClock" @change="updateTeacherFormValue('startClock', $event.detail.value)">
            <view class="picker-field">{{ teacherForm.startClock }}</view>
          </picker>

          <text class="field-title field-gap">正常截止</text>
          <picker mode="time" :value="teacherForm.endClock" @change="updateTeacherFormValue('endClock', $event.detail.value)">
            <view class="picker-field">{{ teacherForm.endClock }}</view>
          </picker>

          <text class="field-title field-gap">补签截止</text>
          <picker mode="time" :value="teacherForm.lateEndClock" @change="updateTeacherFormValue('lateEndClock', $event.detail.value)">
            <view class="picker-field">{{ teacherForm.lateEndClock }}</view>
          </picker>

          <view class="course-hint">{{ teacherSchedulePreview }}</view>

          <view class="teacher-form-actions">
            <custom-button text="生成今天默认时间" ghost @click="fillTodayTemplate" />
            <custom-button :text="teacherSubmitting ? '发布中...' : '发布签到'" :loading="teacherSubmitting" @click="createTeacherBatch" />
          </view>
        </view>
      </view>

      <view class="section-block">
        <view class="section-row">
          <text class="section-heading">今日签到批次</text>
        </view>
        <view class="surface-card section-card">
          <view v-if="teacherBatches.length === 0" class="empty-state">今天还没有发布签到批次</view>
          <view v-for="item in teacherBatches" :key="item.id" class="history-item">
            <view class="course-item__body">
              <view class="course-title-row">
                <view class="course-name">{{ item.courseName }}</view>
                <tag-badge :text="item.status === 'active' ? '进行中' : '已关闭'" :tone="item.status === 'active' ? 'green' : 'purple'" />
              </view>
              <view class="course-meta">{{ item.teacher }} · {{ item.time }}</view>
              <view class="teacher-stats-row">
                <text>已签到 {{ item.signCount }}</text>
                <text>已请假 {{ item.approvedLeaveCount }}</text>
                <text>待审批 {{ item.pendingLeaveCount }}</text>
                <text>待签到 {{ item.unsignedCount }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <view class="section-block">
        <view class="section-row">
          <text class="section-heading">待审批请假</text>
        </view>
        <view class="surface-card section-card">
          <view v-if="pendingLeaveRequests.length === 0" class="empty-state">当前没有待审批请假</view>
          <view v-for="item in pendingLeaveRequests" :key="item.id" class="history-item history-item--stack">
            <view class="course-item__body">
              <view class="course-title-row">
                <view class="course-name">{{ item.userName }} · {{ item.courseName }}</view>
                <tag-badge text="待审批" tone="yellow" />
              </view>
              <view class="course-meta">{{ item.studentId || '无学号' }}</view>
              <view class="course-meta">请假时间：{{ item.leaveTime || '未填写' }}</view>
              <view class="course-hint">{{ item.reason }}</view>
            </view>
            <view class="review-actions">
              <custom-button text="通过" @click="reviewTeacherLeave(item, 'approved')" />
              <custom-button text="驳回" ghost @click="reviewTeacherLeave(item, 'rejected')" />
            </view>
          </view>
        </view>
      </view>

      <view class="section-block">
        <view class="section-row">
          <text class="section-heading">最近签到记录</text>
        </view>
        <view class="surface-card section-card">
          <view v-if="recentRecords.length === 0" class="empty-state">还没有签到记录</view>
          <view v-for="item in recentRecords" :key="item.id" class="history-item">
            <view>
              <view class="course-title-row">
                <view class="course-name">{{ item.userName }} · {{ item.courseName }}</view>
                <tag-badge :text="statusTextMap[item.status] || item.status" :tone="statusToneMap[item.status] || 'yellow'" />
              </view>
              <view class="course-meta">{{ item.studentId || '无学号' }}</view>
            </view>
            <view class="history-time">{{ formatDate(item.time) }}</view>
          </view>
        </view>
      </view>
    </template>

    <template v-else>
      <view class="section-block">
        <view class="section-row">
          <text class="section-heading">今日签到批次</text>
        </view>
        <view class="surface-card section-card">
          <view v-if="todayBatches.length === 0" class="empty-state">今天还没有老师发起签到批次</view>
          <view v-for="course in todayBatches" :key="course.id" class="course-item">
            <view class="course-item__body">
              <view class="course-title-row">
                <view class="course-name">{{ course.courseName }}</view>
                <tag-badge :text="statusTextMap[course.signStatus] || '待签到'" :tone="statusToneMap[course.signStatus] || 'yellow'" />
              </view>
              <view class="course-meta">{{ course.teacher }} · {{ course.time }}</view>
              <view class="course-meta">签到时间：{{ formatDateTime(course.startTime) }} - {{ formatDateTime(course.endTime) }}</view>
              <view v-if="course.signStatus === 'makeup_available'" class="course-hint">当前已进入补签时间，可在 {{ formatDateTime(course.lateEndTime) }} 前完成补签</view>
              <view v-if="course.leaveRequest" class="course-hint">
                请假状态：{{ leaveStatusTextMap[course.leaveRequest.status] }}
                <text v-if="course.leaveRequest.reviewComment">，{{ course.leaveRequest.reviewComment }}</text>
              </view>
            </view>
            <view class="course-action">
              <custom-button :text="course.actionText" :ghost="!course.canSign" @click="doSign(course)" />
            </view>
          </view>
        </view>
      </view>

      <view class="section-block">
        <view class="section-row">
          <text class="section-heading">请假申请</text>
        </view>
        <view class="surface-card leave-card">
          <text class="field-title">选择课程</text>
          <view class="select-grid">
            <view
              v-for="course in leaveableBatches"
              :key="course.id"
              class="select-chip"
              :class="{ active: selectedBatchId === course.id }"
              @click="selectedBatchId = course.id"
            >
              {{ course.courseName }}
            </view>
          </view>
          <view v-if="!leaveableBatches.length" class="empty-inline">当前没有可申请请假的签到批次</view>

          <text class="field-title field-gap">请假原因</text>
          <view class="field-panel">
            <input v-model="leaveReason" class="field-input" placeholder="请输入请假原因" />
          </view>

          <text class="field-title field-gap">请假时间</text>
          <view class="field-panel">
            <input v-model="leaveTime" class="field-input" placeholder="请输入请假时间说明" />
          </view>

          <view class="leave-action">
            <custom-button text="提交请假申请" @click="applyLeave" />
          </view>
        </view>
      </view>

      <view class="section-block">
        <view class="section-row">
          <text class="section-heading">请假审核状态</text>
        </view>
        <view class="surface-card section-card">
          <view v-if="leaveRequests.length === 0" class="empty-state">暂时没有请假申请记录</view>
          <view v-for="item in leaveRequests" :key="item.id" class="history-item">
            <view>
              <view class="course-title-row">
                <view class="course-name">{{ item.courseName }}</view>
                <tag-badge :text="leaveStatusTextMap[item.status] || '待处理'" :tone="leaveStatusToneMap[item.status] || 'yellow'" />
              </view>
              <view class="course-meta">{{ item.reason }}</view>
              <view class="course-meta">{{ item.leaveTime || '未填写具体时间' }}</view>
              <view v-if="item.reviewComment" class="course-hint">审核意见：{{ item.reviewComment }}</view>
            </view>
            <view class="history-time">{{ formatDate(item.createdAt) }}</view>
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
              <view class="course-title-row">
                <view class="course-name">{{ item.courseName }}</view>
                <tag-badge :text="statusTextMap[item.status] || item.status" :tone="statusToneMap[item.status] || 'yellow'" />
              </view>
              <view class="course-meta">{{ item.teacher }}</view>
            </view>
            <view class="history-time">{{ formatDate(item.time) }}</view>
          </view>
        </view>
      </view>
    </template>
  </view>
</template>

<script>
function pad(value) {
  return `${value}`.padStart(2, '0');
}

function formatDatePart(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatTimePart(date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function createTeacherForm() {
  const now = new Date();
  return {
    courseName: '',
    signDate: formatDatePart(now),
    startClock: '08:00',
    endClock: '08:20',
    lateEndClock: '09:00'
  };
}

function combineDateAndClock(datePart, clockPart) {
  return `${datePart}T${clockPart}:00`;
}

export default {
  data() {
    return {
      userInfo: {},
      className: '',
      totalSigns: 0,
      attendanceRate: 0,
      historyList: [],
      leaveRequests: [],
      leaveReason: '',
      leaveTime: '',
      todayBatches: [],
      selectedBatchId: '',
      teacherSubmitting: false,
      teacherStats: {
        todayBatchCount: 0,
        pendingLeaveCount: 0,
        signedCount: 0,
        unsignedCount: 0
      },
      teacherForm: createTeacherForm(),
      teacherBatches: [],
      pendingLeaveRequests: [],
      recentRecords: [],
      statusTextMap: {
        success: '已签到',
        makeup: '已补签',
        late: '迟到签到',
        makeup_available: '可补签',
        upcoming: '未开始',
        expired: '已错过',
        leave_pending: '请假审核中',
        leave_approved: '请假已通过',
        leave_rejected: '请假未通过',
        closed: '已结束'
      },
      statusToneMap: {
        success: 'green',
        makeup: 'blue',
        late: 'yellow',
        makeup_available: 'yellow',
        upcoming: 'purple',
        expired: 'danger',
        leave_pending: 'yellow',
        leave_approved: 'green',
        leave_rejected: 'danger',
        closed: 'purple'
      },
      leaveStatusTextMap: {
        pending: '审核中',
        approved: '已通过',
        rejected: '未通过'
      },
      leaveStatusToneMap: {
        pending: 'yellow',
        approved: 'green',
        rejected: 'danger'
      }
    };
  },
  computed: {
    isTeacherMode() {
      return this.userInfo.role === 'teacher';
    },
    leaveableBatches() {
      return this.todayBatches.filter((item) => !item.currentSign && !(item.leaveRequest && item.leaveRequest.status === 'approved'));
    },
    teacherSchedulePreview() {
      return `${this.teacherForm.signDate} ${this.teacherForm.startClock} - ${this.teacherForm.endClock}，补签截止 ${this.teacherForm.lateEndClock}`;
    }
  },
  onShow() {
    const userInfo = uni.getStorageSync('userInfo') || {};
    this.userInfo = userInfo;
    this.className = userInfo.class || '';
    if (this.isTeacherMode) {
      this.loadTeacherData();
    } else {
      this.loadStudentData();
    }
  },
  methods: {
    updateTeacherFormValue(key, value) {
      this.teacherForm[key] = value;
    },
    async loadStudentData() {
      try {
        const res = await this.$api.sign.getOverview();
        this.className = res.className || this.className;
        this.todayBatches = res.todayBatches || [];
        this.historyList = res.history || [];
        this.leaveRequests = res.leaveRequests || [];
        this.totalSigns = res.total || 0;
        this.attendanceRate = res.attendanceRate || 0;
        if (!this.selectedBatchId || !this.leaveableBatches.find((item) => item.id === this.selectedBatchId)) {
          this.selectedBatchId = this.leaveableBatches.length ? this.leaveableBatches[0].id : '';
        }
      } catch (error) {
        uni.showToast({ title: error.message || '获取签到数据失败', icon: 'none' });
      }
    },
    async loadTeacherData() {
      try {
        const res = await this.$api.sign.getTeacherOverview();
        this.className = res.className || this.className;
        this.teacherStats = res.stats || this.teacherStats;
        this.teacherBatches = res.todayBatches || [];
        this.pendingLeaveRequests = res.pendingLeaveRequests || [];
        this.recentRecords = res.recentRecords || [];
      } catch (error) {
        uni.showToast({ title: error.message || '获取教师签到数据失败', icon: 'none' });
      }
    },
    fillTodayTemplate() {
      this.teacherForm = createTeacherForm();
    },
    async createTeacherBatch() {
      if (!this.teacherForm.courseName || !this.teacherForm.signDate || !this.teacherForm.startClock || !this.teacherForm.endClock || !this.teacherForm.lateEndClock) {
        uni.showToast({ title: '请填写完整签到信息', icon: 'none' });
        return;
      }
      const startTime = combineDateAndClock(this.teacherForm.signDate, this.teacherForm.startClock);
      const endTime = combineDateAndClock(this.teacherForm.signDate, this.teacherForm.endClock);
      const lateEndTime = combineDateAndClock(this.teacherForm.signDate, this.teacherForm.lateEndClock);
      if (new Date(endTime).getTime() <= new Date(startTime).getTime()) {
        uni.showToast({ title: '截止时间要晚于开始时间', icon: 'none' });
        return;
      }
      if (new Date(lateEndTime).getTime() < new Date(endTime).getTime()) {
        uni.showToast({ title: '补签截止不能早于正常截止', icon: 'none' });
        return;
      }

      this.teacherSubmitting = true;
      try {
        await this.$api.sign.createTeacherBatch({
          courseName: this.teacherForm.courseName,
          signDate: this.teacherForm.signDate,
          startTime,
          endTime,
          lateEndTime
        });
        uni.showToast({ title: '签到已发布', icon: 'success' });
        this.teacherForm = createTeacherForm();
        await this.loadTeacherData();
      } catch (error) {
        uni.showToast({ title: error.message || '发布失败', icon: 'none' });
      } finally {
        this.teacherSubmitting = false;
      }
    },
    async reviewTeacherLeave(item, status) {
      const actionText = status === 'approved' ? '通过' : '驳回';
      const confirmed = await new Promise((resolve) => {
        uni.showModal({
          title: `${actionText}请假`,
          content: `确定${actionText}${item.userName}的《${item.courseName}》请假吗？`,
          success: (result) => resolve(Boolean(result.confirm)),
          fail: () => resolve(false)
        });
      });
      if (!confirmed) {
        return;
      }
      try {
        await this.$api.sign.reviewTeacherLeave(item.id, { status });
        uni.showToast({ title: `${actionText}成功`, icon: 'success' });
        await this.loadTeacherData();
      } catch (error) {
        uni.showToast({ title: error.message || `${actionText}失败`, icon: 'none' });
      }
    },
    async doSign(course) {
      if (!course.canSign) {
        uni.showToast({ title: course.actionText || '当前不可签到', icon: 'none' });
        return;
      }
      try {
        const res = await this.$api.sign.doSign({ batchId: course.id });
        uni.showToast({ title: res.status === 'makeup' ? '补签成功' : '签到成功', icon: 'success' });
        await this.loadStudentData();
      } catch (error) {
        uni.showToast({ title: error.message || '签到失败', icon: 'none' });
      }
    },
    async applyLeave() {
      if (!this.selectedBatchId) {
        uni.showToast({ title: '请先选择课程', icon: 'none' });
        return;
      }
      if (!this.leaveReason) {
        uni.showToast({ title: '请填写请假原因', icon: 'none' });
        return;
      }
      try {
        await this.$api.sign.applyLeave({
          batchId: this.selectedBatchId,
          reason: this.leaveReason,
          leaveTime: this.leaveTime
        });
        this.leaveReason = '';
        this.leaveTime = '';
        uni.showToast({ title: '请假申请已提交', icon: 'success' });
        await this.loadStudentData();
      } catch (error) {
        uni.showToast({ title: error.message || '提交失败', icon: 'none' });
      }
    },
    formatDate(value) {
      if (!value) {
        return '-';
      }
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        return value;
      }
      return `${formatDatePart(date)} ${formatTimePart(date)}`;
    },
    formatDateTime(value) {
      if (!value) {
        return '-';
      }
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        return value;
      }
      return formatTimePart(date);
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
  align-items: flex-start;
  gap: 18rpx;
  padding: 18rpx 0;
}

.history-item--stack {
  flex-direction: column;
}

.course-item + .course-item,
.history-item + .history-item {
  border-top: 1rpx solid #eef1f7;
}

.course-item__body {
  flex: 1;
}

.course-title-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  flex-wrap: wrap;
}

.course-name {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--text-main);
}

.course-meta,
.history-time,
.course-hint {
  margin-top: 10rpx;
  font-size: 24rpx;
  color: var(--text-sub);
}

.course-hint {
  color: var(--primary-color);
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

.picker-field {
  min-height: 88rpx;
  display: flex;
  align-items: center;
  padding: 0 24rpx;
  border-radius: 24rpx;
  background: #f6f7fb;
  font-size: 28rpx;
  color: var(--text-main);
}

.teacher-form-actions,
.review-actions {
  display: flex;
  gap: 16rpx;
  margin-top: 24rpx;
}

.teacher-form-actions {
  flex-wrap: wrap;
}

.review-actions {
  width: 100%;
}

.teacher-stats-row {
  display: flex;
  flex-wrap: wrap;
  gap: 18rpx;
  margin-top: 12rpx;
  font-size: 24rpx;
  color: var(--text-sub);
}

.select-grid {
  display: flex;
  gap: 14rpx;
  flex-wrap: wrap;
}

.select-chip {
  padding: 14rpx 22rpx;
  border-radius: 999rpx;
  background: #f3f5fa;
  color: var(--text-sub);
  font-size: 24rpx;
}

.select-chip.active {
  background: rgba(107, 72, 255, 0.12);
  color: var(--primary-color);
  font-weight: 700;
}

.empty-inline,
.empty-state {
  color: var(--text-sub);
  text-align: center;
}

.empty-inline {
  margin-top: 18rpx;
  font-size: 24rpx;
}

.empty-state {
  padding: 36rpx 0;
}

.leave-action {
  margin-top: 24rpx;
}
</style>
