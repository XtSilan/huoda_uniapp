<template>
  <view class="page-shell run-page">
    <view class="page-header">
      <page-nav fallback="/pages/index/index" :is-tab="true" />
      <view class="page-eyebrow">校园乐跑</view>
      <view class="page-title">{{ isRunning ? '正在跑步' : '把今天的步伐记录下来' }}</view>
      <view class="page-subtitle">在这里记录你的跑步轨迹</view>
    </view>

    <view v-if="!isRunning" class="surface-card summary-card">
      <view class="summary-grid">
        <view class="summary-item">
          <view class="summary-icon tone-purple">距</view>
          <view class="summary-value">{{ totalDistance }}</view>
          <view class="summary-label">总里程(km)</view>
        </view>
        <view class="summary-item">
          <view class="summary-icon tone-blue">时</view>
          <view class="summary-value">{{ totalDuration }}</view>
          <view class="summary-label">总时长(min)</view>
        </view>
        <view class="summary-item">
          <view class="summary-icon tone-green">卡</view>
          <view class="summary-value">{{ totalCalories }}</view>
          <view class="summary-label">总消耗(kcal)</view>
        </view>
      </view>
      <view class="summary-action">
        <custom-button text="开始跑步" @click="startRun" />
      </view>
    </view>

    <view v-else class="running-card">
      <view class="running-chip">RUNNING NOW</view>
      <view class="running-time">{{ runningTime }}</view>
      <view class="running-distance">{{ runningDistance }} km</view>
      <view class="running-calories">{{ runningCalories }} kcal</view>
      <view class="running-action">
        <custom-button text="结束跑步" :loading="submitting" ghost @click="stopRun" />
      </view>
    </view>

    <view class="section-block">
      <view class="section-row">
        <text class="section-heading">跑步历史</text>
      </view>
      <view class="surface-card list-card">
        <view v-if="historyList.length === 0" class="empty-state">还没有跑步记录</view>
        <view v-for="item in historyList" :key="item.id" class="list-item">
          <view class="list-item__body">
            <view class="list-item__title">{{ formatDate(item.date) }}</view>
            <view class="list-item__meta">{{ item.distance }} km / {{ formatDuration(item.duration) }} / {{ item.calories }} kcal</view>
          </view>
        </view>
      </view>
    </view>

    <view class="section-block">
      <view class="section-row">
        <text class="section-heading">排行榜</text>
      </view>
      <view class="surface-card list-card">
        <view v-if="rankingList.length === 0" class="empty-state">排行榜稍后更新</view>
        <view v-for="item in rankingList" :key="item.userId" class="list-item rank-item">
          <view class="rank-badge">{{ item.rank }}</view>
          <view class="list-item__body">
            <view class="list-item__title">{{ item.name }}</view>
            <view class="list-item__meta">{{ item.distance }} km</view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      isRunning: false,
      submitting: false,
      runningTime: '00:00:00',
      runningDistance: '0.00',
      runningCalories: 0,
      totalDistance: '0.00',
      totalDuration: 0,
      totalCalories: 0,
      historyList: [],
      rankingList: [],
      timer: null,
      elapsedSeconds: 0
    };
  },
  onLoad() {
    this.loadData();
  },
  onUnload() {
    this.clearTimer();
  },
  methods: {
    async loadData() {
      try {
        const [historyRes, rankingRes] = await Promise.all([
          this.$api.run.getHistory(),
          this.$api.run.getRanking()
        ]);
        this.historyList = historyRes.list || [];
        this.rankingList = rankingRes.list || [];
        this.totalDistance = this.historyList.reduce((sum, item) => sum + Number(item.distance || 0), 0).toFixed(2);
        this.totalDuration = Math.floor(this.historyList.reduce((sum, item) => sum + Number(item.duration || 0), 0) / 60);
        this.totalCalories = this.historyList.reduce((sum, item) => sum + Number(item.calories || 0), 0);
      } catch (error) {
        uni.showToast({ title: error.message || '获取跑步数据失败', icon: 'none' });
      }
    },
    async startRun() {
      try {
        await this.$api.run.start();
      } catch (error) {
        uni.showToast({ title: error.message || '无法开始跑步', icon: 'none' });
        return;
      }
      this.isRunning = true;
      this.elapsedSeconds = 0;
      this.runningTime = '00:00:00';
      this.runningDistance = '0.00';
      this.runningCalories = 0;
      this.timer = setInterval(() => {
        this.elapsedSeconds += 1;
        this.runningTime = this.formatTime(this.elapsedSeconds);
        this.runningDistance = (this.elapsedSeconds * 0.01).toFixed(2);
        this.runningCalories = Math.round(this.elapsedSeconds * 0.12);
      }, 1000);
    },
    async stopRun() {
      this.submitting = true;
      try {
        await this.$api.run.end({
          distance: Number(this.runningDistance),
          duration: this.elapsedSeconds,
          calories: this.runningCalories
        });
        this.clearTimer();
        this.isRunning = false;
        await this.loadData();
        uni.showToast({ title: '跑步记录已保存', icon: 'success' });
      } catch (error) {
        uni.showToast({ title: error.message || '保存失败', icon: 'none' });
      } finally {
        this.submitting = false;
      }
    },
    clearTimer() {
      if (this.timer) {
        clearInterval(this.timer);
        this.timer = null;
      }
    },
    formatTime(seconds) {
      const h = String(Math.floor(seconds / 3600)).padStart(2, '0');
      const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
      const s = String(seconds % 60).padStart(2, '0');
      return `${h}:${m}:${s}`;
    },
    formatDate(dateString) {
      return dateString ? new Date(dateString).toLocaleString() : '-';
    },
    formatDuration(seconds) {
      const minutes = Math.floor(seconds / 60);
      const remainSeconds = seconds % 60;
      return `${minutes}分${remainSeconds}秒`;
    }
  }
};
</script>

<style scoped>
.summary-card,
.list-card {
  padding: 24rpx;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16rpx;
}

.summary-item {
  text-align: center;
}

.summary-icon {
  width: 64rpx;
  height: 64rpx;
  margin: 0 auto 14rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26rpx;
  font-weight: 700;
}

.tone-purple {
  background: var(--primary-light);
  color: var(--primary-color);
}

.tone-blue {
  background: var(--blue-bg);
  color: var(--blue-color);
}

.tone-green {
  background: var(--green-bg);
  color: var(--green-color);
}

.summary-value {
  font-size: 38rpx;
  font-weight: 700;
  color: var(--text-main);
}

.summary-label {
  margin-top: 8rpx;
  font-size: 22rpx;
  color: var(--text-sub);
}

.summary-action {
  margin-top: 28rpx;
}

.running-card {
  padding: 34rpx 28rpx;
  border-radius: 36rpx;
  background: var(--primary-gradient);
  color: #ffffff;
  box-shadow: var(--shadow-md);
  text-align: center;
}

.running-chip {
  display: inline-flex;
  padding: 10rpx 18rpx;
  border-radius: var(--radius-full);
  background: rgba(255, 255, 255, 0.18);
  font-size: 22rpx;
  font-weight: 700;
}

.running-time {
  margin-top: 24rpx;
  font-size: 68rpx;
  font-weight: 700;
}

.running-distance,
.running-calories {
  margin-top: 12rpx;
  font-size: 28rpx;
}

.running-action {
  margin-top: 28rpx;
}

.list-item {
  padding: 18rpx 0;
}

.list-item + .list-item {
  border-top: 1rpx solid #eef1f7;
}

.list-item__title {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--text-main);
}

.list-item__meta {
  margin-top: 10rpx;
  font-size: 24rpx;
  line-height: 1.6;
  color: var(--text-sub);
}

.rank-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.rank-badge {
  width: 56rpx;
  height: 56rpx;
  border-radius: 18rpx;
  background: var(--primary-light);
  color: var(--primary-color);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  font-weight: 700;
}
</style>
