<template>
  <view class="container">
    <view class="search-bar">
      <input class="search-input" placeholder="搜索资讯、活动" v-model="searchText" @confirm="onSearch" />
      <button class="search-btn" @click="onSearch">搜索</button>
    </view>

    <view v-if="detailMode" class="detail-card">
      <view class="title">{{ detail.title }}</view>
      <view class="meta">{{ detail.source }} · {{ formatTime(detail.publishTime) }}</view>
      <view class="content">{{ detail.content }}</view>
      <button class="search-btn collect-btn" @click="toggleCollection">收藏 / 取消收藏</button>
    </view>

    <view v-else-if="searchMode" class="search-result">
      <view class="result-section">
        <view class="section-title">资讯结果</view>
        <view v-if="searchInfos.length === 0" class="empty">暂无匹配资讯</view>
        <view v-for="item in searchInfos" :key="`info-${item.id}`" class="card" @click="goToDetail(item.id)">
          <view class="title">{{ item.title }}</view>
          <view class="content">{{ item.summary || item.content }}</view>
          <view class="meta">{{ item.source }} · {{ item.locationType }}</view>
        </view>
      </view>

      <view class="result-section">
        <view class="section-title">活动结果</view>
        <view v-if="searchActivities.length === 0" class="empty">暂无匹配活动</view>
        <view v-for="item in searchActivities" :key="`activity-${item.id}`" class="card" @click="goToActivity(item.id)">
          <view class="title">{{ item.title }}</view>
          <view class="content">{{ item.summary || item.content }}</view>
          <view class="meta">{{ item.organizer }} · {{ item.location }}</view>
        </view>
      </view>
    </view>

    <view v-else class="info-layout">
      <view class="location-tabs">
        <view
          v-for="item in locationTabs"
          :key="item"
          class="location-tab"
          :class="{ active: activeLocation === item }"
          @click="switchLocation(item)"
        >
          {{ item }}
        </view>
      </view>

      <view class="info-panel">
        <scroll-view class="category-list" scroll-y>
          <view
            v-for="item in categories"
            :key="item.name"
            class="category-item"
            :class="{ active: activeCategory === item.name }"
            @click="activeCategory = item.name"
          >
            <text>{{ item.name }}</text>
            <text class="count">{{ item.count }}</text>
          </view>
        </scroll-view>

        <scroll-view class="content-list" scroll-y>
          <view v-if="filteredInfos.length === 0" class="empty large">没有更多了</view>
          <view v-for="item in filteredInfos" :key="item.id" class="card" @click="goToDetail(item.id)">
            <view class="title">{{ item.title }}</view>
            <view class="content">{{ item.summary || item.content }}</view>
            <view class="meta">{{ item.source }} · {{ formatTime(item.publishTime) }}</view>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script>
const DEFAULT_CATEGORIES = ['全部', '讲座', '公益', '兼职', '就业', '娱乐', '竞赛', '美食', '其他'];

export default {
  data() {
    return {
      searchText: '',
      detailMode: false,
      searchMode: false,
      detail: {},
      locationTabs: ['校外', '校内'],
      activeLocation: '校外',
      activeCategory: '全部',
      infoList: [],
      searchInfos: [],
      searchActivities: []
    };
  },
  computed: {
    categories() {
      return DEFAULT_CATEGORIES.map((name) => ({
        name,
        count: name === '全部' ? this.infoList.length : this.infoList.filter((item) => item.category === name).length
      }));
    },
    filteredInfos() {
      if (this.activeCategory === '全部') {
        return this.infoList;
      }
      return this.infoList.filter((item) => item.category === this.activeCategory);
    }
  },
  onLoad(options) {
    if (options.id) {
      this.detailMode = true;
      this.loadDetail(options.id);
      return;
    }
    if (options.search) {
      this.searchText = decodeURIComponent(options.search);
      this.searchMode = Boolean(this.searchText);
    }
    this.loadInfos();
  },
  methods: {
    async loadInfos() {
      try {
        if (this.searchMode && this.searchText) {
          const res = await this.$api.info.searchInfo({ search: this.searchText });
          this.searchInfos = res.infos || [];
          this.searchActivities = res.activities || [];
          return;
        }
        const res = await this.$api.info.getInfoList({ locationType: this.activeLocation, pageSize: 100 });
        this.infoList = res.list || [];
        if (!this.categories.find((item) => item.name === this.activeCategory && item.count > 0)) {
          const firstAvailable = this.categories.find((item) => item.count > 0);
          this.activeCategory = firstAvailable ? firstAvailable.name : DEFAULT_CATEGORIES[0];
        }
      } catch (error) {
        uni.showToast({ title: error.message || '获取信息失败', icon: 'none' });
      }
    },
    async loadDetail(id) {
      try {
        this.detail = await this.$api.info.getInfoDetail(id);
        try {
          await this.$api.user.recordHistory({
            targetType: 'info',
            targetId: id,
            title: this.detail.title,
            summary: this.detail.summary || this.detail.content
          });
        } catch (e) {}
      } catch (error) {
        uni.showToast({ title: error.message || '获取详情失败', icon: 'none' });
      }
    },
    onSearch() {
      this.detailMode = false;
      this.searchMode = Boolean(this.searchText);
      this.loadInfos();
    },
    switchLocation(location) {
      this.searchMode = false;
      this.activeLocation = location;
      this.loadInfos();
    },
    goToDetail(id) {
      uni.navigateTo({ url: `/pages/info/info?id=${id}` });
    },
    goToActivity(id) {
      uni.navigateTo({ url: `/pages/feature/publish/detail?id=${id}` });
    },
    async toggleCollection() {
      try {
        await this.$api.user.toggleCollection({
          targetType: 'info',
          targetId: Number(this.detail.id)
        });
        uni.showToast({ title: '收藏状态已更新', icon: 'success' });
      } catch (error) {
        uni.showToast({ title: error.message || '操作失败', icon: 'none' });
      }
    },
    formatTime(value) {
      return value ? new Date(value).toLocaleString() : '-';
    }
  },
  onShow() {
    if (this.detailMode) {
      return;
    }
    const pendingSearch = uni.getStorageSync('pendingInfoSearch');
    if (pendingSearch !== '' && pendingSearch !== undefined) {
      this.searchText = pendingSearch;
      this.searchMode = Boolean(pendingSearch);
      uni.removeStorageSync('pendingInfoSearch');
    }
    this.loadInfos();
  }
};
</script>

<style scoped>
.container {
  padding: 16rpx;
}

.search-bar {
  display: flex;
  gap: 12rpx;
  margin-bottom: 18rpx;
}

.search-input {
  flex: 1;
  background: #ffffff;
  border-radius: 12rpx;
  padding: 18rpx 20rpx;
}

.search-btn {
  background: #1e88e5;
  color: #ffffff;
  border-radius: 12rpx;
  padding: 0 28rpx;
}

.collect-btn {
  margin-top: 20rpx;
}

.location-tabs {
  display: flex;
  background: #ffffff;
  border-radius: 14rpx;
  overflow: hidden;
  margin-bottom: 16rpx;
}

.location-tab {
  flex: 1;
  text-align: center;
  padding: 22rpx 0;
  font-size: 30rpx;
  font-weight: 700;
  color: #222222;
}

.location-tab.active {
  background: #1e88e5;
  color: #ffffff;
}

.info-panel {
  display: flex;
  gap: 14rpx;
  height: calc(100vh - 280rpx);
}

.category-list,
.content-list {
  background: #ffffff;
  border-radius: 14rpx;
}

.category-list {
  width: 170rpx;
}

.content-list {
  flex: 1;
  padding: 12rpx;
}

.category-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 16rpx;
  font-size: 28rpx;
  color: #333333;
}

.category-item.active {
  background: #1e88e5;
  color: #ffffff;
  border-radius: 12rpx;
  margin: 8rpx;
}

.count {
  font-size: 22rpx;
}

.card,
.detail-card {
  background: #ffffff;
  border-radius: 16rpx;
  padding: 20rpx;
  margin-bottom: 14rpx;
}

.title {
  font-size: 30rpx;
  font-weight: 700;
  color: #222222;
}

.content {
  margin-top: 12rpx;
  font-size: 24rpx;
  color: #666666;
  line-height: 1.6;
}

.meta {
  margin-top: 10rpx;
  color: #999999;
  font-size: 22rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: 700;
  margin-bottom: 12rpx;
}

.result-section {
  margin-bottom: 20rpx;
}

.empty {
  text-align: center;
  color: #999999;
  padding: 40rpx 0;
}

.empty.large {
  padding-top: 100rpx;
}
</style>
