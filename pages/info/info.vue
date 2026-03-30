<template>
  <view class="container">
    <view class="search-bar">
      <input class="search-input" placeholder="搜索资讯" v-model="searchText" @confirm="onSearch" />
      <button class="search-btn" @click="onSearch">搜索</button>
    </view>

    <view v-if="detailMode" class="detail-card card">
      <view class="title">{{ detail.title }}</view>
      <view class="meta">{{ detail.source }} · {{ formatTime(detail.publishTime) }}</view>
      <view class="content">{{ detail.content }}</view>
      <button class="search-btn" @click="toggleCollection">收藏 / 取消收藏</button>
    </view>

    <view v-else class="info-list">
      <view v-for="item in infoList" :key="item.id" class="card" @click="goToDetail(item.id)">
        <view class="title">{{ item.title }}</view>
        <view class="content">{{ item.content }}</view>
        <view class="meta">{{ item.source }} · {{ formatTime(item.publishTime) }}</view>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      searchText: '',
      detailMode: false,
      infoList: [],
      detail: {}
    };
  },
  onLoad(options) {
    if (options.id) {
      this.detailMode = true;
      this.loadDetail(options.id);
      return;
    }

    if (options.search) {
      this.searchText = decodeURIComponent(options.search);
    }
    this.loadList();
  },
  methods: {
    async loadList() {
      try {
        const res = this.searchText
          ? await this.$api.info.searchInfo({ search: this.searchText })
          : await this.$api.info.getInfoList({ pageSize: 20 });
        this.infoList = res.list || [];
      } catch (error) {
        uni.showToast({ title: error.message || '获取资讯失败', icon: 'none' });
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
      this.loadList();
    },
    goToDetail(id) {
      uni.navigateTo({ url: `/pages/info/info?id=${id}` });
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
  }
};
</script>

<style scoped>
.container {
  padding: 16rpx;
}

.search-bar {
  display: flex;
  gap: 8rpx;
  margin-bottom: 16rpx;
}

.search-input {
  flex: 1;
  background: #ffffff;
  border-radius: 10rpx;
  padding: 16rpx;
}

.search-btn {
  background: #1e88e5;
  color: #ffffff;
  border-radius: 10rpx;
}

.detail-card,
.info-list {
  background: transparent;
}

.meta {
  color: #666666;
  font-size: 24rpx;
  margin-top: 8rpx;
}
</style>
