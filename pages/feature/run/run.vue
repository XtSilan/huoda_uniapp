<template>
  <view class="container">
    <!-- 乐跑状态 -->
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

    <!-- 跑步中 -->
    <view class="running-card" v-else>
      <view class="running-status">
        <view class="running-time">{{ runningTime }}</view>
        <view class="running-distance">{{ runningDistance }} km</view>
        <view class="running-calories">{{ runningCalories }} kcal</view>
      </view>
      <button class="stop-btn" @click="stopRun">结束跑步</button>
    </view>

    <!-- 历史记录 -->
    <view class="history-section">
      <view class="section-title">
        <text>跑步历史</text>
        <text class="more" @click="goToHistory">更多</text>
      </view>
      <view class="history-list">
        <view
          v-for="item in historyList"
          :key="item.id"
          class="history-item"
        >
          <view class="history-info">
            <view class="history-date">{{ formatDate(item.date) }}</view>
            <view class="history-stats">
              <text>{{ item.distance }} km</text>
              <text>{{ formatDuration(item.duration) }}</text>
              <text>{{ item.calories }} kcal</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 排行榜 -->
    <view class="ranking-section">
      <view class="section-title">
        <text>排行榜</text>
        <text class="more" @click="goToRanking">更多</text>
      </view>
      <view class="ranking-list">
        <view
          v-for="(item, index) in rankingList"
          :key="item.userId"
          class="ranking-item"
          :class="{ mine: item.userId === 'mock_user_id' }"
        >
          <view class="ranking-rank">{{ index + 1 }}</view>
          <view class="ranking-name">{{ item.name }}</view>
          <view class="ranking-distance">{{ item.distance }} km</view>
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
      runningTime: '00:00:00',
      runningDistance: 0,
      runningCalories: 0,
      totalDistance: 0,
      totalDuration: 0,
      totalCalories: 0,
      historyList: [],
      rankingList: [],
      timer: null
    };
  },
  onLoad() {
    this.loadData();
  },
  onUnload() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  },
  methods: {
    async loadData() {
      // 获取历史记录
      try {
        const historyRes = await this.$api.run.getHistory();
        if (historyRes.list) {
          this.historyList = historyRes.list;
          // 计算总里程、总时长、总消耗
          this.totalDistance = historyRes.list.reduce((sum, item) => sum + item.distance, 0).toFixed(2);
          this.totalDuration = Math.floor(historyRes.list.reduce((sum, item) => sum + item.duration, 0) / 60);
          this.totalCalories = historyRes.list.reduce((sum, item) => sum + item.calories, 0);
        }
      } catch (error) {
        console.error('Failed to get history:', error);
      }

      // 获取排行榜
      try {
        const rankingRes = await this.$api.run.getRanking();
        if (rankingRes.list) {
          this.rankingList = rankingRes.list;
        }
      } catch (error) {
        console.error('Failed to get ranking:', error);
      }
    },
    startRun() {
      this.isRunning = true;
      this.runningTime = '00:00:00';
      this.runningDistance = 0;
      this.runningCalories = 0;
      
      // 模拟跑步数据
      let seconds = 0;
      this.timer = setInterval(() => {
        seconds++;
        this.runningTime = this.formatTime(seconds);
        this.runningDistance = (seconds * 0.01).toFixed(2);
        this.runningCalories = Math.floor(seconds * 0.1);
      }, 1000);
    },
    stopRun() {
      if (this.timer) {
        clearInterval(this.timer);
        this.timer = null;
      }
      this.isRunning = false;
      
      // 保存跑步记录
      const runRecord = {
        id: 'run_' + Date.now(),
        distance: parseFloat(this.runningDistance),
        duration: parseInt(this.runningTime.split(':').reduce((acc, time) => (acc * 60) + parseInt(time), 0)),
        calories: this.runningCalories,
        date: new Date().toISOString(),
        path: []
      };
      
      this.historyList.unshift(runRecord);
      this.totalDistance = (parseFloat(this.totalDistance) + parseFloat(this.runningDistance)).toFixed(2);
      this.totalDuration += runRecord.duration / 60;
      this.totalCalories += runRecord.calories;
    },
    goToHistory() {
      // 跳转到历史记录页面
      uni.navigateTo({
        url: '/pages/feature/run/history'
      });
    },
    goToRanking() {
      // 跳转到排行榜页面
      uni.navigateTo({
        url: '/pages/feature/run/ranking'
      });
    },
    formatTime(seconds) {
      const hours = Math.floor(seconds / 3600).toString().padStart(2, '0');
      const minutes = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
      const secs = (seconds % 60).toString().padStart(2, '0');
      return `${hours}:${minutes}:${secs}`;
    },
    formatDate(dateString) {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    },
    formatDuration(seconds) {
      const minutes = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${minutes}分${secs}秒`;
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

.start-btn {
  background-color: #ffffff;
  color: #1E88E5;
  border-radius: 8rpx;
  font-size: 32rpx;
  padding: 16rpx;
  width: 100%;
}

.running-card {
  background-color: #4CAF50;
  color: #ffffff;
  border-radius: 12rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
  text-align: center;
}

.running-status {
  margin-bottom: 24rpx;
}

.running-time {
  font-size: 64rpx;
  font-weight: bold;
  margin-bottom: 16rpx;
}

.running-distance {
  font-size: 32rpx;
  margin-bottom: 8rpx;
}

.running-calories {
  font-size: 32rpx;
  margin-bottom: 16rpx;
}

.stop-btn {
  background-color: #ffffff;
  color: #4CAF50;
  border-radius: 8rpx;
  font-size: 32rpx;
  padding: 16rpx;
  width: 100%;
}

.history-section,
.ranking-section {
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

.history-list,
.ranking-list {
  background-color: #ffffff;
  border-radius: 12rpx;
  padding: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
}

.history-item {
  padding: 12rpx 0;
  border-bottom: 1rpx solid #e0e0e0;
}

.history-item:last-child {
  border-bottom: none;
}

.history-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.history-date {
  font-size: 28rpx;
  color: #333333;
}

.history-stats {
  display: flex;
  gap: 16rpx;
  font-size: 24rpx;
  color: #666666;
}

.ranking-item {
  display: flex;
  align-items: center;
  padding: 12rpx 0;
  border-bottom: 1rpx solid #e0e0e0;
}

.ranking-item:last-child {
  border-bottom: none;
}

.ranking-item.mine {
  background-color: #f5f5f5;
  border-radius: 8rpx;
  padding: 12rpx;
  margin: 8rpx 0;
}

.ranking-rank {
  width: 48rpx;
  font-size: 28rpx;
  font-weight: bold;
  color: #1E88E5;
}

.ranking-name {
  flex: 1;
  font-size: 28rpx;
  color: #333333;
}

.ranking-distance {
  font-size: 28rpx;
  color: #666666;
}
</style>
