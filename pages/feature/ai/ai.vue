<template>
  <view class="container">
    <!-- 聊天区域 -->
    <view class="chat-container">
      <view
        v-for="(message, index) in messages"
        :key="index"
        class="message"
        :class="{ mine: message.isMine }"
      >
        <view class="message-content">
          {{ message.content }}
        </view>
        <view class="message-time">{{ message.time }}</view>
      </view>
      <view class="loading" v-if="isLoading">
        <text>正在思考...</text>
      </view>
    </view>

    <!-- 输入区域 -->
    <view class="input-container">
      <input
        class="input"
        placeholder="请输入您的问题"
        v-model="inputMessage"
        @confirm="sendMessage"
      />
      <button class="send-btn" @click="sendMessage">发送</button>
    </view>

    <!-- 相关推荐 -->
    <view class="recommend-section" v-if="relatedInfos.length > 0">
      <view class="section-title">
        <text>相关推荐</text>
      </view>
      <view class="recommend-list">
        <view
          v-for="item in relatedInfos"
          :key="item.id"
          class="recommend-item"
          @click="goToDetail(item)"
        >
          <view class="recommend-title">{{ item.title }}</view>
          <view class="recommend-content">{{ item.content }}</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      messages: [
        {
          content: '您好，我是小达老师，有什么可以帮助您的吗？',
          isMine: false,
          time: new Date().toLocaleTimeString()
        }
      ],
      inputMessage: '',
      isLoading: false,
      relatedInfos: []
    };
  },
  methods: {
    async sendMessage() {
      if (!this.inputMessage.trim()) return;

      // 添加用户消息
      this.messages.push({
        content: this.inputMessage,
        isMine: true,
        time: new Date().toLocaleTimeString()
      });

      const message = this.inputMessage;
      this.inputMessage = '';
      this.isLoading = true;

      try {
        // 检查是否提及创建活动
        if (message.includes('创建活动') || message.includes('发布活动')) {
          // 添加AI回复
          this.messages.push({
            content: '您可以通过以下步骤创建活动：\n1. 点击首页的"活动发布"按钮\n2. 填写活动标题、内容、时间、地点等信息\n3. 上传活动图片（可选）\n4. 点击"发布活动"按钮\n\n创建成功后，活动会显示在首页的"最新活动"栏中。',
            isMine: false,
            time: new Date().toLocaleTimeString()
          });
        } else if (message.includes('活动') || message.includes('校园活动') || message.includes('查看活动') || message.includes('管理活动')) {
          // 从本地存储获取活动信息
          const activities = uni.getStorageSync('activities') || [];
          if (activities.length > 0) {
            // 添加AI回复
            this.messages.push({
              content: '小达老师为您找到以下活动信息，点击活动卡片可以查看详情：',
              isMine: false,
              time: new Date().toLocaleTimeString()
            });
            
            // 更新相关推荐
            this.relatedInfos = activities.map(activity => ({
              id: activity.id,
              title: activity.title,
              content: `时间：${new Date(activity.startTime).toLocaleString()} 至 ${new Date(activity.endTime).toLocaleString()}\n地点：${activity.location}\n组织方：${activity.organizer}\n\n${activity.content}`
            }));
          } else {
            // 添加AI回复
            this.messages.push({
              content: '暂时没有活动信息，您可以通过首页的活动发布功能创建活动。',
              isMine: false,
              time: new Date().toLocaleTimeString()
            });
          }
        } else {
          // 调用AI聊天接口
          const res = await this.$api.ai.chat(message);
          if (res.response) {
            // 添加AI回复
            this.messages.push({
              content: res.response,
              isMine: false,
              time: new Date().toLocaleTimeString()
            });
            
            // 更新相关推荐
            if (res.relatedInfos) {
              this.relatedInfos = res.relatedInfos;
            }
          }
        }
      } catch (error) {
        console.error('Failed to chat with AI:', error);
        // 添加错误消息
        this.messages.push({
          content: '抱歉，小达老师暂时无法回答您的问题，请稍后再试。',
          isMine: false,
          time: new Date().toLocaleTimeString()
        });
      } finally {
        this.isLoading = false;
        // 滚动到底部
        this.scrollToBottom();
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
        // 跳转到信息详情页面
        uni.navigateTo({
          url: `/pages/info/info?id=${item.id}`
        });
      }
    },
    scrollToBottom() {
      // 滚动到底部
      setTimeout(() => {
        const chatContainer = uni.createSelectorQuery().select('.chat-container');
        chatContainer.boundingClientRect((rect) => {
          if (rect) {
            uni.pageScrollTo({
              scrollTop: rect.height,
              duration: 300
            });
          }
        }).exec();
      }, 100);
    }
  }
};
</script>

<style scoped>
.container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f5f5f5;
}

.chat-container {
  flex: 1;
  padding: 16rpx;
  overflow-y: auto;
}

.message {
  margin-bottom: 16rpx;
  display: flex;
  flex-direction: column;
  max-width: 80%;
}

.message.mine {
  align-items: flex-end;
  margin-left: auto;
}

.message-content {
  padding: 12rpx 16rpx;
  border-radius: 12rpx;
  font-size: 28rpx;
  line-height: 1.5;
}

.message:not(.mine) .message-content {
  background-color: #ffffff;
  border-top-left-radius: 0;
  box-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.1);
}

.message.mine .message-content {
  background-color: #1E88E5;
  color: #ffffff;
  border-top-right-radius: 0;
}

.message-time {
  font-size: 20rpx;
  color: #999999;
  margin-top: 4rpx;
}

.loading {
  text-align: center;
  padding: 16rpx;
  color: #666666;
  font-size: 24rpx;
}

.input-container {
  display: flex;
  padding: 16rpx;
  background-color: #ffffff;
  border-top: 1rpx solid #e0e0e0;
}

.input {
  flex: 1;
  padding: 12rpx;
  border: 2rpx solid #e0e0e0;
  border-radius: 8rpx;
  font-size: 28rpx;
  margin-right: 8rpx;
}

.send-btn {
  background-color: #1E88E5;
  color: #ffffff;
  border-radius: 8rpx;
  font-size: 28rpx;
  padding: 12rpx 24rpx;
}

.recommend-section {
  padding: 16rpx;
  background-color: #ffffff;
  border-top: 1rpx solid #e0e0e0;
}

.section-title {
  font-size: 32rpx;
  font-weight: bold;
  margin-bottom: 12rpx;
  color: #333333;
}

.recommend-list {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.recommend-item {
  padding: 12rpx;
  border: 1rpx solid #e0e0e0;
  border-radius: 8rpx;
  cursor: pointer;
}

.recommend-item:hover {
  background-color: #f5f5f5;
}

.recommend-title {
  font-size: 28rpx;
  font-weight: bold;
  margin-bottom: 4rpx;
  color: #333333;
}

.recommend-content {
  font-size: 24rpx;
  color: #666666;
  line-height: 1.4;
}
</style>
