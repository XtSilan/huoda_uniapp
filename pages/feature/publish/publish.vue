<template>
  <view class="container">
    <view class="group-card" @click="goToGroupChat">
      <view class="group-title">{{ groupTitle }}</view>
      <view class="group-desc">{{ groupDescription }}</view>
    </view>

    <view class="section">
      <view class="section-header">
        <view class="section-title">活动列表</view>
        <view class="section-action" @click="goToCreate">发布活动</view>
      </view>
      <view class="list-wrap">
        <view v-for="item in activityList" :key="item.id" class="activity-item" @click="goToDetail(item)">
          <image v-if="item.images && item.images.length" class="thumb" :src="item.images[0]" mode="aspectFill"></image>
          <view class="activity-main">
            <view class="activity-title">{{ item.title }}</view>
            <view class="activity-meta">{{ item.organizer }} · {{ item.location }}</view>
            <view class="activity-time">{{ formatDate(item.startTime) }}</view>
          </view>
        </view>
        <view v-if="activityList.length === 0" class="empty">暂无活动</view>
      </view>
    </view>

    <view class="section">
      <view class="section-title">我的活动</view>
      <view class="list-wrap">
        <view v-if="myActivityList.length === 0" class="empty">暂无参与的活动</view>
        <view v-for="item in myActivityList" :key="item.id" class="activity-item" @click="goToDetail(item)">
          <view class="activity-main">
            <view class="activity-title">{{ item.title }}</view>
            <view class="activity-meta">{{ item.organizer }} · {{ item.location }}</view>
            <view class="activity-time">{{ formatDate(item.startTime) }}</view>
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
      activityList: [],
      myActivityList: [],
      classGroup: null
    };
  },
  computed: {
    groupTitle() {
      return this.classGroup ? this.classGroup.groupName : '班级群';
    },
    groupDescription() {
      if (!this.classGroup) {
        return '请先完善班级信息后查看同班同学与群聊';
      }
      return `${this.classGroup.onlineCount}人在群，点击进入群聊`;
    }
  },
  onShow() {
    this.loadData();
  },
  methods: {
    async loadData() {
      try {
        const [activityRes, applicationRes] = await Promise.all([
          this.$api.publish.getList(),
          this.$api.publish.getApplications()
        ]);
        this.activityList = activityRes.list || [];
        this.myActivityList = applicationRes.list || [];
      } catch (error) {
        uni.showToast({ title: error.message || '获取活动失败', icon: 'none' });
      }

      try {
        this.classGroup = await this.$api.classGroup.getCurrent();
      } catch (error) {
        this.classGroup = null;
      }
    },
    goToDetail(item) {
      uni.navigateTo({
        url: `/pages/feature/publish/detail?id=${item.id}`
      });
    },
    goToCreate() {
      uni.navigateTo({ url: '/pages/feature/publish/create' });
    },
    goToGroupChat() {
      uni.navigateTo({ url: '/pages/feature/sign/group-chat' });
    },
    formatDate(dateString) {
      return dateString ? new Date(dateString).toLocaleString() : '-';
    }
  }
};
</script>

<style scoped>
.container {
  padding: 16rpx;
}

.group-card,
.list-wrap {
  background: #ffffff;
  border-radius: 16rpx;
  padding: 22rpx;
}

.group-card {
  margin-bottom: 22rpx;
}

.group-title {
  font-size: 34rpx;
  font-weight: 700;
  color: #222222;
}

.group-desc {
  margin-top: 8rpx;
  color: #666666;
  font-size: 24rpx;
}

.section {
  margin-bottom: 24rpx;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: 700;
}

.section-action {
  color: #1e88e5;
  font-size: 24rpx;
}

.activity-item {
  display: flex;
  gap: 16rpx;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #ececec;
}

.activity-item:last-child {
  border-bottom: none;
}

.thumb {
  width: 140rpx;
  height: 100rpx;
  border-radius: 10rpx;
  flex-shrink: 0;
}

.activity-main {
  flex: 1;
}

.activity-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #222222;
}

.activity-meta,
.activity-time,
.empty {
  font-size: 24rpx;
  color: #666666;
  margin-top: 8rpx;
}

.empty {
  text-align: center;
  padding: 50rpx 0;
}
</style>
