<template>
  <view class="container">
    <view class="chat-container">
      <view v-for="(message, index) in messages" :key="index" class="message" :class="{ mine: message.isMine }">
        <view class="message-content">{{ message.content }}</view>
        <view class="message-time">{{ message.time }}</view>
      </view>
      <view class="loading" v-if="isLoading">AI 正在思考...</view>
    </view>

    <view class="input-container">
      <input class="input" v-model="inputMessage" placeholder="请输入你的问题" @confirm="sendMessage" />
      <button class="send-btn" @click="sendMessage">发送</button>
    </view>

    <view class="recommend-section" v-if="relatedInfos.length">
      <view class="section-title">相关推荐</view>
      <view v-for="item in relatedInfos" :key="item.id" class="recommend-item" @click="goToDetail(item)">
        <view class="recommend-title">{{ item.title }}</view>
        <view class="recommend-content">{{ item.content }}</view>
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
          content: '你好，我是小达老师，可以帮你查活动、资讯、乐跑和签到。',
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
      const message = (this.inputMessage || '').trim();
      if (!message) {
        return;
      }

      this.messages.push({
        content: message,
        isMine: true,
        time: new Date().toLocaleTimeString()
      });
      this.inputMessage = '';
      this.isLoading = true;

      try {
        const res = await this.$api.ai.chat(message);
        this.messages.push({
          content: res.response || '我已经收到你的问题了。',
          isMine: false,
          time: new Date().toLocaleTimeString()
        });
        this.relatedInfos = res.relatedInfos || [];
      } catch (error) {
        this.messages.push({
          content: error.message || '暂时无法回答，请稍后重试。',
          isMine: false,
          time: new Date().toLocaleTimeString()
        });
      } finally {
        this.isLoading = false;
      }
    },
    goToDetail(item) {
      uni.navigateTo({
        url: item.startTime ? `/pages/feature/publish/detail?id=${item.id}` : `/pages/info/info?id=${item.id}`
      });
    }
  }
};
</script>

<style scoped>
.container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.chat-container {
  flex: 1;
  padding: 16rpx;
}

.message {
  margin-bottom: 16rpx;
  max-width: 80%;
}

.message.mine {
  margin-left: auto;
}

.message-content {
  padding: 16rpx;
  border-radius: 12rpx;
  background: #ffffff;
}

.message.mine .message-content {
  background: #1e88e5;
  color: #ffffff;
}

.message-time {
  font-size: 22rpx;
  color: #888888;
  margin-top: 8rpx;
}

.input-container {
  display: flex;
  gap: 8rpx;
  padding: 16rpx;
  background: #ffffff;
}

.input {
  flex: 1;
  border: 2rpx solid #e5e7eb;
  border-radius: 10rpx;
  padding: 16rpx;
}

.send-btn {
  background: #1e88e5;
  color: #ffffff;
  border-radius: 10rpx;
}

.recommend-section {
  background: #ffffff;
  padding: 16rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: 700;
  margin-bottom: 12rpx;
}

.recommend-item {
  padding: 12rpx 0;
  border-bottom: 1rpx solid #ededed;
}

.recommend-item:last-child {
  border-bottom: none;
}

.recommend-title {
  font-size: 28rpx;
  font-weight: 600;
}

.recommend-content {
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #666666;
}

.loading {
  text-align: center;
  color: #666666;
}
</style>
