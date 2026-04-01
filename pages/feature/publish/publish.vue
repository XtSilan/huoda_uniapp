<template>
  <view class="page-shell publish-page">
    <view class="page-header">
      <view class="page-eyebrow">活动广场</view>
      <view class="page-title">发现校园里正在发生的事</view>
      <view class="page-subtitle">在这里与大家共同创造精彩</view>
    </view>

    <view class="group-card" @click="goToGroupChat">
      <view class="group-card__icon">群</view>
      <view class="group-card__body">
        <view class="group-card__title">{{ groupTitle }}</view>
        <view class="group-card__desc">{{ groupDescription }}</view>
      </view>
      <tag-badge text="进入群聊" tone="purple" />
    </view>

    <view class="section-block">
      <view class="section-row">
        <text class="section-heading">活动列表</text>
        <text class="section-action" @click="goToCreate">发布活动</text>
      </view>
      <view v-if="activityList.length" class="activity-stack">
        <view v-for="item in activityList" :key="item.id" class="activity-card surface-card" @click="goToDetail(item)">
          <image v-if="item.images && item.images.length" class="activity-thumb" :src="item.images[0]" mode="aspectFill"></image>
          <view class="activity-main">
            <view class="activity-topline">
              <tag-badge :text="item.activityType || '活动'" tone="blue" />
              <tag-badge :text="formatDate(item.startTime)" tone="yellow" />
            </view>
            <view class="activity-title">{{ item.title }}</view>
            <view class="activity-meta">{{ item.organizer || '校园组织' }} · {{ item.location || '地点待定' }}</view>
          </view>
        </view>
      </view>
      <view v-else class="surface-card empty-state">暂无活动</view>
    </view>

    <view class="section-block">
      <view class="section-row">
        <text class="section-heading">我的活动</text>
      </view>
      <view v-if="myActivityList.length" class="activity-stack">
        <view v-for="item in myActivityList" :key="item.id" class="activity-card surface-card compact-card" @click="goToDetail(item)">
          <view class="activity-main">
            <view class="activity-topline">
              <tag-badge text="已参与" tone="green" />
              <tag-badge :text="formatDate(item.startTime)" tone="yellow" />
            </view>
            <view class="activity-title">{{ item.title }}</view>
            <view class="activity-meta">{{ item.organizer || '校园组织' }} · {{ item.location || '地点待定' }}</view>
          </view>
        </view>
      </view>
      <view v-else class="surface-card empty-state">暂无参与的活动</view>
    </view>

    <view class="inline-action surface-card">
      <view class="inline-action__title">想发起一场新活动？</view>
      <view class="inline-action__desc">创建入口放回内容流里，避免和底部导航互相打架。</view>
      <custom-button text="创建新活动" @click="goToCreate" />
    </view>

    <app-tabbar current="discover" />
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
      return `${this.classGroup.memberCount || 0} 人在线，点击进入群聊`;
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
      if (!dateString) {
        return '时间待定';
      }
      const date = new Date(dateString);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    }
  }
};
</script>

<style scoped>
.publish-page {
  padding-bottom: calc(120rpx + env(safe-area-inset-bottom));
}

.group-card {
  display: flex;
  align-items: center;
  gap: 18rpx;
  padding: 28rpx;
  background: linear-gradient(135deg, rgba(138, 100, 255, 0.12), rgba(74, 144, 226, 0.08));
  border-radius: 32rpx;
}

.group-card__icon {
  width: 84rpx;
  height: 84rpx;
  border-radius: 28rpx;
  background: var(--primary-light);
  color: var(--primary-color);
  font-size: 30rpx;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.group-card__body {
  flex: 1;
}

.group-card__title,
.activity-title {
  font-size: 30rpx;
  font-weight: 700;
  line-height: 1.4;
  color: var(--text-main);
}

.group-card__desc,
.activity-meta {
  margin-top: 10rpx;
  font-size: 24rpx;
  color: var(--text-sub);
  line-height: 1.6;
}

.activity-stack {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.activity-card {
  overflow: hidden;
}

.activity-thumb {
  width: 100%;
  height: 240rpx;
}

.activity-main {
  padding: 24rpx;
}

.compact-card .activity-main {
  padding: 28rpx 24rpx;
}

.activity-topline {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
  margin-bottom: 14rpx;
}

.inline-action {
  margin-top: 28rpx;
  padding: 24rpx;
}

.inline-action__title {
  font-size: 30rpx;
  font-weight: 700;
  color: var(--text-main);
}

.inline-action__desc {
  margin-top: 10rpx;
  margin-bottom: 20rpx;
  font-size: 24rpx;
  line-height: 1.6;
  color: var(--text-sub);
}
</style>
