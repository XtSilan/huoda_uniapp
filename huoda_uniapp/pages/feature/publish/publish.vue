<template>
  <view class="page-shell publish-page">
    <view class="page-header">
      <view class="page-eyebrow">活动广场</view>
      <view class="page-title">发现校园里正在发生的事</view>
      <view class="page-subtitle">在这里参与活动、认识同学、加入班级群聊</view>
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
          <image
            v-if="item.images && item.images.length"
            class="activity-thumb"
            :src="item.images[0]"
            mode="aspectFill"
          ></image>
          <view class="activity-main">
            <view class="activity-topline">
              <view class="tag-group">
                <tag-badge v-if="item.isTop" text="置顶" tone="yellow" />
                <tag-badge :text="item.activityType || '其他'" tone="blue" />
              </view>
              <view class="metric-pill">
                <view class="metric-pill__icon">
                  <svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16">
                    <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Zm0 2.445L6.615 5.5a.75.75 0 0 1-.564.41l-3.097.45 2.24 2.184a.75.75 0 0 1 .216.664l-.528 3.084 2.769-1.456a.75.75 0 0 1 .698 0l2.77 1.456-.53-3.084a.75.75 0 0 1 .216-.664l2.24-2.183-3.096-.45a.75.75 0 0 1-.564-.41L8 2.694Z"></path>
                  </svg>
                </view>
                <text>{{ item.applyCount || 0 }} 参与</text>
              </view>
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
              <view class="tag-group">
                <tag-badge v-if="item.isTop" text="置顶" tone="yellow" />
                <tag-badge text="已参与" tone="green" />
              </view>
              <view class="metric-pill">
                <view class="metric-pill__icon">
                  <svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16">
                    <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Zm0 2.445L6.615 5.5a.75.75 0 0 1-.564.41l-3.097.45 2.24 2.184a.75.75 0 0 1 .216.664l-.528 3.084 2.769-1.456a.75.75 0 0 1 .698 0l2.77 1.456-.53-3.084a.75.75 0 0 1 .216-.664l2.24-2.183-3.096-.45a.75.75 0 0 1-.564-.41L8 2.694Z"></path>
                  </svg>
                </view>
                <text>{{ item.applyCount || 0 }} 参与</text>
              </view>
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
      <view class="inline-action__desc">从这里进入创建流程，发起招募、讲座、比赛或社团活动。</view>
      <custom-button text="创建新活动" @click="goToCreate" />
    </view>

    <announcement-popup ref="announcementPopup" />
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
    this.$nextTick(() => {
      if (this.$refs.announcementPopup) {
        this.$refs.announcementPopup.checkAndOpen();
      }
    });
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
      uni.navigateTo({ url: `/pages/feature/publish/detail?id=${item.id}` });
    },
    goToCreate() {
      uni.navigateTo({ url: '/pages/feature/publish/create' });
    },
    goToGroupChat() {
      uni.navigateTo({ url: '/pages/feature/sign/group-chat' });
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
  align-items: flex-start;
  gap: 10rpx;
  margin-bottom: 14rpx;
}

.tag-group {
  display: flex;
  align-items: center;
  gap: 10rpx;
  flex-wrap: wrap;
  flex: 1;
  min-width: 0;
}

.metric-pill {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  padding: 10rpx 16rpx;
  border-radius: 999rpx;
  background: #f5f7fb;
  color: var(--text-sub);
  font-size: 22rpx;
  margin-left: auto;
  flex-shrink: 0;
}

.metric-pill__icon {
  width: 28rpx;
  height: 28rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.metric-pill__icon svg {
  width: 28rpx;
  height: 28rpx;
  fill: #f5b301;
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
