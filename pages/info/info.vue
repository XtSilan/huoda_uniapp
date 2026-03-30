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
    </view>

    <view class="main-content">
      <!-- 主板块标签切换 - 横向排列 -->
      <view class="main-tabs">
        <view
          v-for="tab in mainTabs"
          :key="tab"
          class="main-tab"
          :class="{ active: activeMainTab === tab }"
          @click="switchMainTab(tab)"
        >
          {{ tab }}
        </view>
      </view>

      <!-- 内容区域 - 包含左侧分类和右侧列表 -->
      <view class="content-wrapper">
        <!-- 左侧分类导航 -->
        <view class="sidebar">
          <!-- 分类子栏目 -->
          <view class="category-tabs">
            <view
              v-for="category in categories"
              :key="category"
              class="category-tab"
              :class="{ active: selectedCategory === category }"
              @click="switchCategory(category)"
            >
              <text>{{ category }}</text>
              <text class="category-count">{{ getCategoryCount(category) }}</text>
            </view>
          </view>
        </view>

        <!-- 右侧内容区域 -->
        <view class="content-area">
          <!-- 信息列表 -->
          <view class="info-list">
            <view
              v-for="item in infoList"
              :key="item.id"
              class="card"
              @click="goToDetail(item)"
            >
              <view class="title">{{ item.title }}</view>
              <view class="content">{{ item.content }}</view>
              <view class="footer">
                <text class="source">{{ item.source }}</text>
                <text class="time">{{ formatTime(item.publishTime) }}</text>
                <text class="view-count">{{ item.viewCount }} 浏览</text>
              </view>
            </view>
          </view>

          <!-- 加载更多 -->
          <view class="load-more" v-if="hasMore" @click="loadMore">
            <text>加载更多</text>
          </view>
          <view class="no-more" v-else>
            <text>没有更多了</text>
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
      mainTabs: ['校外', '校内'],
      activeMainTab: '校外',
      categories: ['讲座', '公益', '兼职', '就业', '娱乐', '竞赛', '美食', '其他'],
      selectedCategory: '讲座',
      infoList: [],
      allInfoList: [], // 用于计算分类数量
      page: 1,
      pageSize: 10,
      hasMore: true
    };
  },
  onLoad(options) {
    if (options.search) {
      this.searchText = options.search;
      this.onSearch();
    } else {
      this.loadData();
    }
  },
  methods: {
    async loadData() {
      try {
        // 从本地存储获取信息列表
        let infoList = [];
        
        // 获取活动信息
        const activities = uni.getStorageSync('activities') || [];
        const activityInfos = activities.map(activity => ({
          id: activity.id,
          title: activity.title,
          content: activity.content,
          source: activity.organizer,
          publishTime: activity.publishTime,
          viewCount: Math.floor(Math.random() * 1000),
          type: 'activity',
          location: activity.locationType || '校内', // 使用locationType字段
          activityType: activity.activityType || '其他' // 活动类型
        }));
        
        // 获取其他资讯信息
        const recommendList = uni.getStorageSync('recommendList') || [];
        const hotList = uni.getStorageSync('hotList') || [];
        const otherInfos = [...recommendList, ...hotList].map(item => ({
          ...item,
          viewCount: Math.floor(Math.random() * 1000),
          type: 'info',
          location: Math.random() > 0.5 ? '校内' : '校外', // 随机分配校内校外
          activityType: '其他' // 默认类型
        }));
        
        // 合并所有信息
        infoList = [...activityInfos, ...otherInfos];
        
        // 保存所有数据用于计算分类数量
        this.allInfoList = infoList;
        
        // 应用主板块筛选
        infoList = infoList.filter(item => item.location === this.activeMainTab);
        
        // 应用分类筛选
        infoList = infoList.filter(item => {
          // 优先使用活动类型字段
          if (item.activityType) {
            return item.activityType === this.selectedCategory;
          }
          // 后备方案：关键词匹配
          const titleLower = item.title.toLowerCase();
          const contentLower = item.content.toLowerCase();
          const categoryLower = this.selectedCategory.toLowerCase();
          
          return titleLower.includes(categoryLower) || contentLower.includes(categoryLower);
        });
        
        // 应用搜索条件
        if (this.searchText) {
          const searchLower = this.searchText.toLowerCase();
          infoList = infoList.filter(item => 
            item.title.toLowerCase().includes(searchLower) || 
            item.content.toLowerCase().includes(searchLower)
          );
        }
        
        // 分页处理
        if (this.page === 1) {
          this.infoList = infoList.slice(0, this.pageSize);
        } else {
          const start = (this.page - 1) * this.pageSize;
          const end = start + this.pageSize;
          this.infoList = [...this.infoList, ...infoList.slice(start, end)];
        }
        
        this.hasMore = this.infoList.length < infoList.length;
        this.page++;
      } catch (error) {
        console.error('Failed to get info list:', error);
      }
    },
    getCategoryCount(category) {
      // 计算指定分类的活动数量
      return this.allInfoList.filter(item => {
        // 主板块筛选
        if (item.location !== this.activeMainTab) {
          return false;
        }
        // 分类筛选
        if (item.activityType) {
          return item.activityType === category;
        }
        // 后备方案：关键词匹配
        const titleLower = item.title.toLowerCase();
        const contentLower = item.content.toLowerCase();
        const categoryLower = category.toLowerCase();
        
        return titleLower.includes(categoryLower) || contentLower.includes(categoryLower);
      }).length;
    },
    onSearchInput(e) {
      this.searchText = e.detail.value;
    },
    onSearch() {
      this.page = 1;
      this.infoList = [];
      this.hasMore = true;
      this.loadData();
    },
    switchMainTab(tab) {
      if (this.activeMainTab !== tab) {
        this.activeMainTab = tab;
        this.page = 1;
        this.infoList = [];
        this.hasMore = true;
        this.loadData();
      }
    },
    switchCategory(category) {
      if (this.selectedCategory !== category) {
        this.selectedCategory = category;
        this.page = 1;
        this.infoList = [];
        this.hasMore = true;
        this.loadData();
      }
    },
    goToDetail(item) {
      // 检查是否是活动数据
      if (item.id.startsWith('activity_')) {
        // 跳转到活动详情页面
        uni.navigateTo({
          url: `/pages/feature/publish/detail?id=${item.id}`
        });
      } else {
        // 显示信息详情提示
        uni.showModal({
          title: '信息详情',
          content: `${item.title}\n\n${item.content}\n\n来源：${item.source}\n发布时间：${this.formatTime(item.publishTime)}`,
          showCancel: false
        });
      }
    },
    loadMore() {
      if (this.hasMore) {
        this.loadData();
      }
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
  min-height: 100vh;
  background-color: #f5f5f5;
}

.search-bar {
  display: flex;
  margin-bottom: 16rpx;
  background-color: #ffffff;
  padding: 16rpx;
  border-radius: 12rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
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
}

.main-content {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  height: calc(100vh - 160rpx);
}

/* 主板块标签 - 横向排列 */
.main-tabs {
  display: flex;
  background-color: #ffffff;
  border-radius: 12rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.main-tab {
  flex: 1;
  text-align: center;
  padding: 16rpx;
  font-size: 32rpx;
  font-weight: bold;
  transition: all 0.3s ease;
  cursor: pointer;
}

/* 内容区域 - 包含左侧分类和右侧列表 */
.content-wrapper {
  display: flex;
  flex: 1;
  gap: 16rpx;
  overflow: hidden;
}

/* 左侧分类导航 */
.sidebar {
  width: 200rpx;
  background-color: #ffffff;
  border-radius: 12rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.main-tab.active {
  background-color: #1E88E5;
  color: #ffffff;
}

.category-tabs {
  padding: 8rpx;
}

.category-tab {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12rpx 16rpx;
  border-radius: 8rpx;
  font-size: 24rpx;
  transition: all 0.3s ease;
  cursor: pointer;
  margin-bottom: 8rpx;
}

.category-tab.active {
  background-color: #1E88E5;
  color: #ffffff;
}

.category-count {
  font-size: 20rpx;
  background-color: rgba(255, 255, 255, 0.3);
  padding: 2rpx 8rpx;
  border-radius: 10rpx;
}

.content-area {
  flex: 1;
  background-color: #ffffff;
  border-radius: 12rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
  overflow-y: auto;
  padding: 16rpx;
}

.info-list {
  display: flex;
  flex-direction: column;
}

.card {
  background-color: #ffffff;
  border-radius: 12rpx;
  padding: 16rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.card:hover {
  transform: translateY(-2rpx);
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.15);
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

.load-more {
  text-align: center;
  padding: 24rpx;
  font-size: 28rpx;
  color: #1E88E5;
  cursor: pointer;
}

.no-more {
  text-align: center;
  padding: 24rpx;
  font-size: 28rpx;
  color: #999999;
}

/* 响应式设计 */
@media screen and (max-width: 750rpx) {
  .main-content {
    height: auto;
  }
  
  .content-wrapper {
    flex-direction: column;
  }
  
  .sidebar {
    width: 100%;
    margin-bottom: 16rpx;
  }
  
  .category-tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 8rpx;
  }
  
  .category-tab {
    flex: 0 0 calc(25% - 8rpx);
    margin-bottom: 8rpx;
  }
}
</style>
