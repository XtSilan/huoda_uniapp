<template>
  <view class="container">
    <view class="status-card" v-if="!isRunning">
      <view class="status-title">校园乐跑</view>
      <view class="status-content">
        <view class="stat-item">
          <view class="stat-value">{{ totalDistance }}</view>
          <view class="stat-label">总里程(km)</view>
        </view>
        <view class="stat-item">
          <view class="stat-value">{{ totalDuration }}</view>
          <view class="stat-label">总时长(min)</view>
        </view>
        <view class="stat-item">
          <view class="stat-value">{{ totalCalories }}</view>
          <view class="stat-label">总消耗(kcal)</view>
        </view>
      </view>
      <button class="start-btn" @click="startRun">开始跑步</button>
    </view>

    <view class="running-card" v-else>
      <view class="running-time">{{ runningTime }}</view>
      <view class="running-distance">{{ runningDistance }} km</view>
      <view class="running-calories">{{ runningCalories }} kcal</view>
      <button class="stop-btn" :loading="submitting" @click="stopRun">结束跑步</button>
    </view>

    <view class="history-section">
      <view class="section-title">跑步历史</view>
      <view class="history-list">
        <view v-for="item in historyList" :key="item.id" class="history-item">
          <view>{{ formatDate(item.date) }}</view>
          <view>{{ item.distance }} km / {{ formatDuration(item.duration) }} / {{ item.calories }} kcal</view>
        </view>
      </view>
    </view>

    <view class="ranking-section">
      <view class="section-title">排行榜</view>
      <view class="ranking-list">
        <view v-for="item in rankingList" :key="item.userId" class="ranking-item">
          <text>{{ item.rank }}</text>
          <text>{{ item.name }}</text>
          <text>{{ item.distance }} km</text>
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
      return new Date(dateString).toLocaleString();
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
.container {
  padding: 16rpx;
}

.status-card,
.running-card {
  background: #1e88e5;
  color: #ffffff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
  text-align: center;
}

.status-content {
  display: flex;
  justify-content: space-between;
  margin: 24rpx 0;
}

.stat-item {
  flex: 1;
}

.stat-value {
  font-size: 44rpx;
  font-weight: 700;
}

.stat-label {
  font-size: 24rpx;
  margin-top: 8rpx;
}

.running-time {
  font-size: 64rpx;
  font-weight: bold;
}

.running-distance,
.running-calories {
  margin-top: 16rpx;
  font-size: 30rpx;
}

.start-btn,
.stop-btn {
  margin-top: 24rpx;
  background: #ffffff;
  color: #1e88e5;
  border-radius: 10rpx;
}

.history-section,
.ranking-section {
  margin-bottom: 24rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: 700;
  margin-bottom: 12rpx;
}

.history-list,
.ranking-list {
  background: #ffffff;
  border-radius: 12rpx;
  padding: 16rpx;
}

.history-item,
.ranking-item {
  display: flex;
  justify-content: space-between;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #ededed;
  font-size: 26rpx;
}

.history-item:last-child,
.ranking-item:last-child {
  border-bottom: none;
}
</style>
