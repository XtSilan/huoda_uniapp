<template>
  <view class="container">
    <view class="section">
      <view class="section-title">活动参与统计</view>
      <view class="stats-card">
        <view class="stats-item">
          <view class="stats-value">{{ activityStats.total }}</view>
          <view class="stats-label">总参与活动</view>
        </view>
        <view class="stats-item">
          <view class="stats-value">{{ activityStats.completed }}</view>
          <view class="stats-label">已完成</view>
        </view>
        <view class="stats-item">
          <view class="stats-value">{{ activityStats.ongoing }}</view>
          <view class="stats-label">进行中</view>
        </view>
      </view>
      <view class="chart-container">
        <canvas canvas-id="activityChart" class="chart"></canvas>
      </view>
    </view>

    <view class="section">
      <view class="section-title">浏览统计</view>
      <view class="stats-card">
        <view class="stats-item">
          <view class="stats-value">{{ browseStats.total }}</view>
          <view class="stats-label">总浏览量</view>
        </view>
        <view class="stats-item">
          <view class="stats-value">{{ browseStats.today }}</view>
          <view class="stats-label">今日浏览</view>
        </view>
        <view class="stats-item">
          <view class="stats-value">{{ browseStats.week }}</view>
          <view class="stats-label">本周浏览</view>
        </view>
      </view>
      <view class="chart-container">
        <canvas canvas-id="browseChart" class="chart"></canvas>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      activityStats: {
        total: 12,
        completed: 8,
        ongoing: 4
      },
      browseStats: {
        total: 128,
        today: 12,
        week: 45
      }
    };
  },
  onLoad() {
    this.loadStats();
    setTimeout(() => {
      this.drawActivityChart();
      this.drawBrowseChart();
    }, 100);
  },
  methods: {
    loadStats() {
      // 从本地存储加载统计数据
      const activityStats = uni.getStorageSync('activityStats');
      const browseStats = uni.getStorageSync('browseStats');
      
      if (activityStats) {
        this.activityStats = activityStats;
      } else {
        // 模拟数据
        uni.setStorageSync('activityStats', this.activityStats);
      }
      
      if (browseStats) {
        this.browseStats = browseStats;
      } else {
        // 模拟数据
        uni.setStorageSync('browseStats', this.browseStats);
      }
    },
    drawActivityChart() {
      const ctx = uni.createCanvasContext('activityChart');
      
      // 绘制饼图
      const data = [
        { value: this.activityStats.completed, color: '#4CAF50' },
        { value: this.activityStats.ongoing, color: '#FFC107' },
        { value: this.activityStats.total - this.activityStats.completed - this.activityStats.ongoing, color: '#9E9E9E' }
      ];
      
      let startAngle = 0;
      const radius = 80;
      const centerX = 150;
      const centerY = 100;
      
      data.forEach((item, index) => {
        const angle = (item.value / this.activityStats.total) * 2 * Math.PI;
        
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, startAngle + angle);
        ctx.closePath();
        ctx.setFillStyle(item.color);
        ctx.fill();
        
        startAngle += angle;
      });
      
      // 绘制中心文字
      ctx.setFillStyle('#333333');
      ctx.setFontSize(20);
      ctx.setTextAlign('center');
      ctx.setTextBaseline('middle');
      ctx.fillText('活动参与', centerX, centerY - 10);
      ctx.setFontSize(16);
      ctx.fillText(this.activityStats.total, centerX, centerY + 10);
      
      ctx.draw();
    },
    drawBrowseChart() {
      const ctx = uni.createCanvasContext('browseChart');
      
      // 模拟最近7天的浏览数据
      const data = [8, 12, 15, 10, 14, 16, 12];
      const labels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
      
      const canvasWidth = 300;
      const canvasHeight = 200;
      const padding = 40;
      const chartWidth = canvasWidth - 2 * padding;
      const chartHeight = canvasHeight - 2 * padding;
      
      // 绘制网格
      ctx.setStrokeStyle('#E0E0E0');
      ctx.setLineWidth(1);
      
      for (let i = 0; i <= 5; i++) {
        const y = padding + (i / 5) * chartHeight;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(canvasWidth - padding, y);
        ctx.stroke();
      }
      
      // 绘制柱状图
      const barWidth = chartWidth / data.length - 10;
      const maxValue = Math.max(...data) * 1.2;
      
      data.forEach((value, index) => {
        const x = padding + index * (barWidth + 10) + 5;
        const barHeight = (value / maxValue) * chartHeight;
        const y = padding + chartHeight - barHeight;
        
        ctx.beginPath();
        ctx.rect(x, y, barWidth, barHeight);
        ctx.setFillStyle('#1E88E5');
        ctx.fill();
        
        // 绘制标签
        ctx.setFillStyle('#666666');
        ctx.setFontSize(12);
        ctx.setTextAlign('center');
        ctx.fillText(labels[index], x + barWidth / 2, canvasHeight - padding + 20);
      });
      
      ctx.draw();
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

.section {
  margin-bottom: 24rpx;
}

.section-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #666666;
  margin-bottom: 8rpx;
  padding: 0 8rpx;
}

.stats-card {
  display: flex;
  background-color: #ffffff;
  border-radius: 12rpx;
  padding: 20rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
}

.stats-item {
  flex: 1;
  text-align: center;
}

.stats-value {
  font-size: 36rpx;
  font-weight: bold;
  color: #1E88E5;
  margin-bottom: 4rpx;
}

.stats-label {
  font-size: 24rpx;
  color: #666666;
}

.chart-container {
  background-color: #ffffff;
  border-radius: 12rpx;
  padding: 20rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
}

.chart {
  width: 100%;
  height: 200px;
}
</style>