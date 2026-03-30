<template>
  <view class="container">
    <!-- 搜索栏 -->
    <view class="search-bar">
      <input
        class="search-input"
        placeholder="搜索资讯、活动"
        v-model="searchText"
        @input="onSearchInput"
        @confirm="onSearch"
      />
      <button class="search-btn" @click="onSearch">搜索</button>
      <button class="ai-btn" @click="goToAI">
        <text class="ai-icon">🤖</text>
        <text class="ai-text">小达老师</text>
      </button>
    </view>

    <!-- 功能入口 -->
    <view class="features">
      <view class="feature-item" @click="goToRun">
        <view class="feature-icon">🏃</view>
        <view class="feature-text">校园乐跑</view>
      </view>
      <view class="feature-item" @click="goToSign">
        <view class="feature-icon">📝</view>
        <view class="feature-text">班级签到</view>
      </view>
      <view class="feature-item" @click="goToCreate">
        <view class="feature-icon">📅</view>
        <view class="feature-text">活动发布</view>
      </view>
    </view>

    <!-- 标签选择 -->
    <view class="tags">
      <view
        v-for="tag in tags"
        :key="tag"
        class="tag"
        :class="{ active: selectedTags.includes(tag) }"
        @click="toggleTag(tag)"
      >
        {{ tag }}
      </view>
    </view>

    <!-- 推荐内容 -->
    <view class="section">
      <view class="section-title">
        <text>个性化推荐</text>
        <text class="more" @click="goToInfo">更多</text>
      </view>
      <view class="recommend-list">
        <view
          v-for="item in recommendList"
          :key="item.id"
          class="card"
          @click="goToDetail(item)"
        >
          <view class="title">{{ item.title }}</view>
          <view class="content">{{ item.content }}</view>
          <view class="footer">
            <text class="source">{{ item.source }}</text>
            <text class="time">{{ formatTime(item.publishTime) }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 热门资讯 -->
    <view class="section">
      <view class="section-title">
        <text>热门资讯</text>
        <text class="more" @click="goToInfo">更多</text>
      </view>
      <view class="hot-list">
        <view
          v-for="item in hotList"
          :key="item.id"
          class="card"
          @click="goToDetail(item)"
        >
          <view class="title">{{ item.title }}</view>
          <view class="content">{{ item.content }}</view>
          <view class="footer">
            <text class="source">{{ item.source }}</text>
            <text class="time">{{ formatTime(item.publishTime) }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 最新活动 -->
    <view class="section">
      <view class="section-title">
        <text>最新活动</text>
        <text class="more" @click="goToPublish">更多</text>
      </view>
      <view class="activity-list">
        <view
          v-for="activity in activities"
          :key="activity.id"
          class="card"
          @click="goToDetail(activity)"
        >
          <view v-if="activity.images && activity.images.length > 0" class="activity-image">
            <image :src="activity.images[0]" mode="aspectFill"></image>
          </view>
          <view class="title">{{ activity.title }}</view>
          <view class="content">{{ activity.content }}</view>
          <view class="footer">
            <text class="source">{{ activity.organizer }}</text>
            <text class="time">{{ formatTime(activity.publishTime) }}</text>
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
      searchText: '',
      tags: ['通知', '活动', '讲座', '兼职'],
      selectedTags: [],
      recommendList: [],
      hotList: [],
      activities: []
    };
  },
  onLoad() {
    this.loadData();
  },
  onShow() {
    // 页面显示时重新加载数据，确保活动数据更新
    this.loadData();
  },
  methods: {
    loadData() {
      // 从本地存储获取用户信息，特别是兴趣爱好
      const userInfo = uni.getStorageSync('userInfo') || {};
      const userInterests = userInfo.interests || [];
      
      // 从本地存储获取推荐内容
      const storedRecommendList = uni.getStorageSync('recommendList');
      if (storedRecommendList) {
        // 根据用户兴趣进行个性化排序
        this.recommendList = this.getPersonalizedContent(storedRecommendList, userInterests);
      } else {
        // 模拟数据
        this.recommendList = [
          {
            id: '1',
            title: '新生入学指南',
            content: '为新生提供校园生活、学习等各方面的指南',
            source: '学校办公室',
            publishTime: new Date().toISOString()
          },
          {
            id: '2',
            title: '校园招聘会',
            content: '多家企业来校招聘，提供大量实习和就业机会',
            source: '就业指导中心',
            publishTime: new Date().toISOString()
          }
        ];
      }

      // 从本地存储获取热门资讯
      const storedHotList = uni.getStorageSync('hotList');
      if (storedHotList) {
        this.hotList = storedHotList;
      } else {
        // 模拟数据
        this.hotList = [
          {
            id: '3',
            title: '校园科技节',
            content: '展示学生科技成果，激发创新精神',
            source: '科技协会',
            publishTime: new Date().toISOString()
          },
          {
            id: '4',
            title: '体育文化节',
            content: '丰富多彩的体育活动，增强学生体质',
            source: '体育部',
            publishTime: new Date().toISOString()
          }
        ];
      }

      // 从本地存储获取活动数据
      const storedActivities = uni.getStorageSync('activities');
      if (storedActivities) {
        // 根据用户兴趣进行个性化排序
        this.activities = this.getPersonalizedContent(storedActivities, userInterests);
      } else {
        // 模拟数据
        this.activities = [
          {
            id: 'activity_1',
            title: '校园文化节',
            content: '丰富多彩的校园文化活动，展示学生才艺',
            organizer: '学生会',
            publishTime: new Date().toISOString()
          },
          {
            id: 'activity_2',
            title: '学术讲座',
            content: '知名学者分享前沿学术知识',
            organizer: '学术部',
            publishTime: new Date().toISOString()
          }
        ];
      }
    },
    getPersonalizedContent(contentList, userInterests) {
      if (!userInterests || userInterests.length === 0) {
        return contentList;
      }
      
      // 为每个内容计算与用户兴趣的匹配度
      const contentWithScore = contentList.map(item => {
        let score = 0;
        
        // 检查活动类型是否匹配用户兴趣
        if (item.activityType && userInterests.includes(item.activityType)) {
          score += 10;
        }
        
        // 检查标题和内容是否包含用户兴趣关键词
        const text = (item.title + ' ' + item.content).toLowerCase();
        userInterests.forEach(interest => {
          if (text.includes(interest.toLowerCase())) {
            score += 5;
          }
        });
        
        return { ...item, score };
      });
      
      // 按匹配度排序
      return contentWithScore.sort((a, b) => b.score - a.score);
    },
    onSearchInput(e) {
      this.searchText = e.detail.value;
    },
    onSearch() {
      if (this.searchText) {
        uni.navigateTo({
          url: `/pages/info/info?search=${this.searchText}`
        });
      }
    },
    toggleTag(tag) {
      const selectedTags = this.selectedTags;
      const index = selectedTags.indexOf(tag);

      if (index > -1) {
        selectedTags.splice(index, 1);
      } else {
        selectedTags.push(tag);
      }

      this.selectedTags = selectedTags;
    },
    goToDetail(item) {
      // 检查是否是活动数据
      if (item.id.startsWith('activity_')) {
        // 跳转到活动详情页面
        uni.navigateTo({
          url: `/pages/feature/publish/detail?id=${item.id}`
        });
      } else {
        // 跳转到信息详情页面
        uni.navigateTo({
          url: `/pages/info/info?id=${item.id}`
        });
      }
    },
    goToRun() {
      uni.navigateTo({
        url: '/pages/feature/run/run'
      });
    },
    goToSign() {
      uni.navigateTo({
        url: '/pages/feature/sign/sign'
      });
    },
    goToCreate() {
      uni.navigateTo({
        url: '/pages/feature/publish/create'
      });
    },
    goToPublish() {
      uni.navigateTo({
        url: '/pages/feature/publish/publish'
      });
    },
    goToAI() {
      uni.navigateTo({
        url: '/pages/feature/ai/ai'
      });
    },
    goToInfo() {
      uni.navigateTo({
        url: '/pages/info/info'
      });
    },
    formatTime(time) {
      const date = new Date(time);
      const now = new Date();
      const diff = now - date;
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);

      if (minutes < 60) {
        return `${minutes}分钟前`;
      } else if (hours < 24) {
        return `${hours}小时前`;
      } else if (days < 7) {
        return `${days}天前`;
      } else {
        return date.toLocaleDateString();
      }
    }
  }
};
</script>

<style scoped>
.container {
  padding: 16rpx;
}

.search-bar {
  display: flex;
  align-items: center;
  margin-bottom: 16rpx;
}

.search-input {
  flex: 1;
  padding: 12rpx;
  border: 2rpx solid #e0e0e0;
  border-radius: 8rpx;
  font-size: 28rpx;
  margin-right: 8rpx;
}

.search-btn {
  padding: 12rpx 24rpx;
  background-color: #1E88E5;
  color: #ffffff;
  border-radius: 8rpx;
  font-size: 28rpx;
  margin-right: 8rpx;
}

.ai-btn {
  display: flex;
  align-items: center;
  padding: 8rpx 12rpx;
  background-color: #E3F2FD;
  color: #1E88E5;
  border-radius: 8rpx;
  font-size: 24rpx;
}

.ai-icon {
  font-size: 32rpx;
  margin-right: 4rpx;
}

.ai-text {
  font-weight: bold;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  margin-bottom: 16rpx;
}

.tag {
  padding: 8rpx 16rpx;
  border: 2rpx solid #e0e0e0;
  border-radius: 16rpx;
  font-size: 24rpx;
  margin-right: 8rpx;
  margin-bottom: 8rpx;
}

.tag.active {
  background-color: #1E88E5;
  color: #ffffff;
  border-color: #1E88E5;
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

.recommend-list,
.hot-list {
  display: flex;
  flex-direction: column;
}

.card {
  background-color: #ffffff;
  border-radius: 12rpx;
  padding: 16rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
}

.title {
  font-size: 32rpx;
  font-weight: bold;
  margin-bottom: 8rpx;
  color: #333333;
}

.content {
  font-size: 28rpx;
  color: #666666;
  line-height: 1.5;
  margin-bottom: 8rpx;
}

.footer {
  display: flex;
  justify-content: space-between;
  font-size: 24rpx;
  color: #999999;
}

.features {
  display: flex;
  justify-content: space-around;
  background-color: #ffffff;
  border-radius: 12rpx;
  padding: 24rpx;
  margin-top: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
}

.feature-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.feature-icon {
  font-size: 48rpx;
  margin-bottom: 8rpx;
}

.feature-text {
  font-size: 24rpx;
  color: #333333;
}

.activity-image {
  width: 100%;
  height: 200rpx;
  border-radius: 8rpx;
  overflow: hidden;
  margin-bottom: 12rpx;
}

.activity-image image {
  width: 100%;
  height: 100%;
}
</style>
