<template>
  <view class="container">
    <!-- 群聊头部 -->
    <view class="chat-header">
      <view class="header-left" @click="goBack">
        <text class="back-icon">‹</text>
      </view>
      <view class="header-center">
        <view class="group-name">班级{{ className }}群</view>
        <view class="group-members">32人在线</view>
      </view>
      <view class="header-right" @click="showGroupInfo">
        <text class="info-icon">ℹ</text>
      </view>
    </view>
    
    <!-- 聊天内容 -->
    <view class="chat-content" ref="chatContent">
      <view
        v-for="(message, index) in messages"
        :key="index"
        class="message-item"
        :class="message.type"
      >
        <view class="message-avatar">
          <text class="avatar">{{ message.avatar }}</text>
        </view>
        <view class="message-content">
          <view class="message-sender">{{ message.sender }}</view>
          <view class="message-text">{{ message.text }}</view>
          <view class="message-time">{{ message.time }}</view>
        </view>
      </view>
    </view>
    
    <!-- 输入框 -->
    <view class="input-area">
      <input
        class="input"
        placeholder="输入消息..."
        v-model="inputMessage"
        @keyup.enter="sendMessage"
      />
      <button class="send-btn" @click="sendMessage">发送</button>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      messages: [
        {
          id: 1,
          sender: '张老师',
          avatar: '张',
          text: '同学们，明天上课请带好课本和笔记本。',
          time: '09:00',
          type: 'other'
        },
        {
          id: 2,
          sender: '李同学',
          avatar: '李',
          text: '收到，老师！',
          time: '09:01',
          type: 'other'
        },
        {
          id: 3,
          sender: '王同学',
          avatar: '王',
          text: '老师，明天的作业是哪几题？',
          time: '09:02',
          type: 'other'
        },
        {
          id: 4,
          sender: '张老师',
          avatar: '张',
          text: '课本第56-58页的练习题。',
          time: '09:03',
          type: 'other'
        }
      ],
      inputMessage: '',
      className: ''
    };
  },
  onLoad() {
    // 验证班级信息
    this.verifyClassInfo();
  },
  onShow() {
    // 页面显示时重新加载用户信息，确保班级信息同步
    this.verifyClassInfo();
  },
  methods: {
    verifyClassInfo() {
      // 获取用户班级信息
      const userInfo = uni.getStorageSync('userInfo');
      if (userInfo && userInfo.class && userInfo.class.trim() !== '') {
        this.className = userInfo.class;
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
    goBack() {
      uni.navigateBack();
    },
    showGroupInfo() {
      uni.showModal({
        title: '群聊信息',
        content: `群名称：班级${this.className}群\n成员数量：45人\n创建时间：2024-01-01`,
        showCancel: false
      });
    },
    sendMessage() {
      if (!this.inputMessage.trim()) {
        return;
      }
      
      const newMessage = {
        id: Date.now(),
        sender: '我',
        avatar: '我',
        text: this.inputMessage,
        time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        type: 'self'
      };
      
      this.messages.push(newMessage);
      this.inputMessage = '';
      
      // 滚动到底部
      setTimeout(() => {
        this.$refs.chatContent.scrollTop = this.$refs.chatContent.scrollHeight;
      }, 100);
      
      // 模拟回复
      setTimeout(() => {
        const replyMessage = {
          id: Date.now() + 1,
          sender: '张老师',
          avatar: '张',
          text: '收到你的消息。',
          time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
          type: 'other'
        };
        this.messages.push(replyMessage);
        // 滚动到底部
        setTimeout(() => {
          this.$refs.chatContent.scrollTop = this.$refs.chatContent.scrollHeight;
        }, 100);
      }, 1000);
    }
  },
  mounted() {
    // 滚动到底部
    setTimeout(() => {
      this.$refs.chatContent.scrollTop = this.$refs.chatContent.scrollHeight;
    }, 100);
  }
};
</script>

<style scoped>
.container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f5f5f5;
}

.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx;
  background-color: #1E88E5;
  color: #ffffff;
  height: 80rpx;
}

.header-left {
  width: 60rpx;
}

.back-icon {
  font-size: 48rpx;
  font-weight: bold;
}

.header-center {
  flex: 1;
  text-align: center;
}

.group-name {
  font-size: 32rpx;
  font-weight: bold;
  margin-bottom: 4rpx;
}

.group-members {
  font-size: 24rpx;
  opacity: 0.8;
}

.header-right {
  width: 60rpx;
  text-align: right;
}

.info-icon {
  font-size: 32rpx;
}

.chat-content {
  flex: 1;
  padding: 16rpx;
  overflow-y: auto;
}

.message-item {
  display: flex;
  margin-bottom: 24rpx;
}

.message-item.self {
  flex-direction: row-reverse;
}

.message-avatar {
  width: 64rpx;
  height: 64rpx;
  border-radius: 32rpx;
  background-color: #1E88E5;
  color: #ffffff;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 32rpx;
  font-weight: bold;
  margin-right: 16rpx;
}

.message-item.self .message-avatar {
  margin-right: 0;
  margin-left: 16rpx;
  background-color: #4CAF50;
}

.message-content {
  max-width: 70%;
}

.message-sender {
  font-size: 24rpx;
  color: #666666;
  margin-bottom: 4rpx;
}

.message-text {
  background-color: #ffffff;
  padding: 16rpx;
  border-radius: 12rpx;
  font-size: 28rpx;
  color: #333333;
  word-break: break-word;
}

.message-item.self .message-text {
  background-color: #E3F2FD;
}

.message-time {
  font-size: 20rpx;
  color: #999999;
  margin-top: 4rpx;
  text-align: right;
}

.input-area {
  display: flex;
  padding: 16rpx;
  background-color: #ffffff;
  border-top: 1rpx solid #e0e0e0;
}

.input {
  flex: 1;
  padding: 16rpx;
  border: 2rpx solid #e0e0e0;
  border-radius: 24rpx;
  font-size: 28rpx;
  margin-right: 16rpx;
}

.send-btn {
  background-color: #1E88E5;
  color: #ffffff;
  border-radius: 24rpx;
  font-size: 28rpx;
  padding: 0 32rpx;
}
</style>