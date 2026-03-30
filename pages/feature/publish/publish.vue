<template>
  <view class="container">
    <!-- 班级群聊入口 -->
    <view v-if="className" class="group-chat-card" @click="goToGroupChat">
      <view class="group-chat-info">
        <view class="group-name">班级{{ className }}群</view>
        <view class="group-desc">32人在线，点击进入群聊</view>
      </view>
      <view class="group-arrow">›</view>
    </view>

    <!-- 活动列表 -->
    <view class="section">
      <view class="section-title">
        <text>活动列表</text>
      </view>
      <view class="activity-list">
        <view
          v-for="item in activityList"
          :key="item.id"
          class="activity-item"
        >
          <view class="activity-info" @click="goToDetail(item)">
            <view class="activity-title">{{ item.title }}</view>
            <view class="activity-meta">
              <text class="organizer">{{ item.organizer }}</text>
              <text class="time">{{ formatDate(item.startTime) }}</text>
            </view>
            <view class="activity-location">{{ item.location }}</view>
          </view>
          <view class="activity-actions">
            <view class="activity-status" :class="item.status">
              {{ item.status === 'ongoing' ? '进行中' : item.status === 'upcoming' ? '即将开始' : '已结束' }}
            </view>
            <view class="delete-btn" @click.stop="deleteActivity(item.id)">
              <text>删除</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 我的活动 -->
    <view class="section">
      <view class="section-title">
        <text>我的活动</text>
      </view>
      <view class="my-activity-list">
        <view class="no-activity" v-if="myActivityList.length === 0">
          <text>暂无参与的活动</text>
        </view>
        <view
          v-for="item in myActivityList"
          :key="item.id"
          class="activity-item"
          @click="goToDetail(item)"
        >
          <view class="activity-info">
            <view class="activity-title">{{ item.title }}</view>
            <view class="activity-meta">
              <text class="organizer">{{ item.organizer }}</text>
              <text class="time">{{ formatDate(item.startTime) }}</text>
            </view>
            <view class="activity-location">{{ item.location }}</view>
          </view>
          <view class="activity-status" :class="item.status">
            {{ item.status === 'ongoing' ? '进行中' : item.status === 'upcoming' ? '即将开始' : '已结束' }}
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
      className: ''
    };
  },
  onLoad() {
    this.loadData();
  },
  onShow() {
    // 页面显示时重新加载班级信息
    this.loadData();
  },
  created() {
    // 监听用户信息更新事件
    uni.$on('userInfoUpdated', (userInfo) => {
      if (userInfo && userInfo.class) {
        this.className = userInfo.class;
      }
    });
  },
  beforeDestroy() {
    // 移除事件监听
    uni.$off('userInfoUpdated');
  },
  methods: {
    loadData() {
      // 获取用户班级信息
      const userInfo = uni.getStorageSync('userInfo');
      if (userInfo && userInfo.class) {
        this.className = userInfo.class;
      }

      // 从本地存储获取活动列表
      const storedActivities = uni.getStorageSync('activities');
      if (storedActivities) {
        this.activityList = storedActivities;
      } else {
        // 模拟数据
        this.activityList = [
          {
            id: 'activity_1',
            title: '校园科技节',
            content: '展示学生科技成果，激发创新精神',
            startTime: new Date().toISOString(),
            endTime: new Date(Date.now() + 86400000).toISOString(),
            location: '科技楼',
            organizer: '科技协会',
            status: 'upcoming',
            publishTime: new Date().toISOString()
          }
        ];
      }

      // 模拟我的活动
      this.myActivityList = [];
    },
    goToGroupChat() {
      // 验证班级信息
      const userInfo = uni.getStorageSync('userInfo');
      if (userInfo && userInfo.class && userInfo.class.trim() !== '') {
        uni.navigateTo({
          url: '/pages/feature/sign/group-chat'
        });
      } else {
        // 未设置班级信息，跳转到编辑资料页面
        uni.showModal({
          title: '提示',
          content: '请先在个人中心编辑资料，设置班级信息',
          showCancel: false,
          success: () => {
            uni.navigateTo({
              url: '/pages/user/profile'
            });
          }
        });
      }
    },
    goToCreate() {
      // 跳转到发布活动页面
      uni.navigateTo({
        url: '/pages/feature/publish/create'
      });
    },
    goToDetail(item) {
      // 跳转到活动详情页面
      uni.navigateTo({
        url: `/pages/feature/publish/detail?id=${item.id}`
      });
    },
    formatDate(dateString) {
      const date = new Date(dateString);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    },
    deleteActivity(id) {
      // 显示确认删除对话框
      uni.showModal({
        title: '删除确认',
        content: '确定要删除这个活动吗？',
        success: (res) => {
          if (res.confirm) {
            // 进行权限验证
            const userPassword = uni.getStorageSync('userPassword');
            if (!userPassword) {
              uni.showToast({ title: '请先登录', icon: 'none' });
              return;
            }
            
            // 从本地存储中删除活动
            const activities = uni.getStorageSync('activities') || [];
            const updatedActivities = activities.filter(item => item.id !== id);
            uni.setStorageSync('activities', updatedActivities);
            
            // 同时更新推荐列表
            const recommendList = uni.getStorageSync('recommendList') || [];
            const updatedRecommendList = recommendList.filter(item => item.id !== id);
            uni.setStorageSync('recommendList', updatedRecommendList);
            
            // 更新页面状态
            this.loadData();
            uni.showToast({ title: '删除成功', icon: 'success' });
          }
        }
      });
    }
  }
};
</script>

<style scoped>
.container {
  padding: 16rpx;
}

.group-chat-card {
  background-color: #ffffff;
  border-radius: 12rpx;
  padding: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
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

.publish-card {
  background-color: #ffffff;
  border-radius: 12rpx;
  padding: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}

.publish-info {
  flex: 1;
}

.publish-title {
  font-size: 32rpx;
  font-weight: bold;
  margin-bottom: 8rpx;
  color: #333333;
}

.publish-desc {
  font-size: 24rpx;
  color: #666666;
}

.publish-arrow {
  font-size: 32rpx;
  color: #999999;
}

.section {
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

.activity-list,
.my-activity-list {
  background-color: #ffffff;
  border-radius: 12rpx;
  padding: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
}

.activity-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #e0e0e0;
}

.activity-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8rpx;
}

.delete-btn {
  font-size: 24rpx;
  color: #FF5252;
  padding: 4rpx 12rpx;
  border: 1rpx solid #FF5252;
  border-radius: 8rpx;
  margin-top: 8rpx;
}

.activity-item:last-child {
  border-bottom: none;
}

.activity-info {
  flex: 1;
  margin-right: 16rpx;
}

.activity-title {
  font-size: 32rpx;
  font-weight: bold;
  margin-bottom: 8rpx;
  color: #333333;
}

.activity-meta {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8rpx;
  font-size: 24rpx;
  color: #666666;
}

.activity-location {
  font-size: 24rpx;
  color: #666666;
}

.activity-status {
  font-size: 24rpx;
  padding: 4rpx 12rpx;
  border-radius: 12rpx;
  align-self: center;
}

.activity-status.ongoing {
  background-color: #4CAF50;
  color: #ffffff;
}

.activity-status.upcoming {
  background-color: #FFC107;
  color: #ffffff;
}

.activity-status.ended {
  background-color: #9E9E9E;
  color: #ffffff;
}

.no-activity {
  text-align: center;
  padding: 40rpx;
  color: #999999;
  font-size: 28rpx;
}
</style>
