<template>
  <view class="container">
    <view class="page-header">
      <view>
        <view class="page-title">小达老师</view>
        <view class="page-subtitle">{{ providerLabel }} / {{ aiConfig.model || '未设置模型' }}</view>
      </view>
      <view class="gear-btn" @click="openSettings">⚙</view>
    </view>

    <scroll-view class="chat-container" scroll-y :scroll-into-view="scrollIntoView">
      <view
        v-for="(message, index) in messages"
        :id="`msg-${index}`"
        :key="index"
        class="message"
        :class="{ mine: message.isMine }"
      >
        <view class="message-role">{{ message.isMine ? '我' : '小达老师' }}</view>
        <view class="message-content">{{ message.content }}</view>
        <view class="message-time">{{ message.time }}</view>
      </view>
      <view v-if="isLoading" class="loading">正在调用 {{ providerLabel }}...</view>
      <view class="chat-bottom-space"></view>
    </scroll-view>

    <view class="input-bar">
      <input class="chat-input" v-model="inputMessage" placeholder="输入问题开始对话" @confirm="sendMessage" />
      <button class="send-btn" :loading="isLoading" @click="sendMessage">发送</button>
    </view>

    <view class="recommend-section" v-if="relatedInfos.length">
      <view class="section-title">相关内容</view>
      <view v-for="item in relatedInfos" :key="item.id" class="recommend-item" @click="goToDetail(item)">
        <view class="recommend-title">{{ item.title }}</view>
        <view class="recommend-content">{{ item.summary || item.content }}</view>
      </view>
    </view>

    <view v-if="showSettings" class="overlay" @click.self="closeSettings">
      <scroll-view class="settings-panel" scroll-y>
        <view class="settings-title">AI 模型设置</view>

        <view class="form-item">
          <view class="label">模型供应商</view>
          <view class="provider-row">
            <view
              v-for="item in providerOptions"
              :key="item.value"
              class="provider-chip"
              :class="{ active: draftAiConfig.provider === item.value }"
              @click="draftAiConfig.provider = item.value"
            >
              {{ item.label }}
            </view>
          </view>
        </view>

        <view class="form-item">
          <view class="label">Base URL</view>
          <input v-model="draftAiConfig.baseUrl" class="field-input" placeholder="例如 https://api.openai.com/v1" />
          <view class="field-tip">这里按你填写的地址原样请求，不会自动追加 `/v1`。</view>
        </view>

        <view class="form-item">
          <view class="label">API Key</view>
          <input v-model="draftAiConfig.apiKey" class="field-input" password placeholder="输入你的 API Key" />
        </view>

        <view class="form-item">
          <view class="label">模型名称</view>
          <input v-model="draftAiConfig.model" class="field-input" placeholder="例如 gpt-4.1-mini / MiniMax-Text-01" />
        </view>

        <view class="form-item">
          <view class="label">System Prompt</view>
          <textarea v-model="draftAiConfig.systemPrompt" class="textarea" placeholder="设置小达老师的系统提示词"></textarea>
        </view>

        <view class="form-item">
          <view class="label">Temperature</view>
          <input v-model="draftAiConfig.temperature" class="field-input" type="digit" placeholder="0 - 2" />
        </view>

        <view class="form-item">
          <view class="label">Top P</view>
          <input v-model="draftAiConfig.topP" class="field-input" type="digit" placeholder="0 - 1" />
        </view>

        <view class="form-item">
          <view class="label">Max Tokens</view>
          <input v-model="draftAiConfig.maxTokens" class="field-input" type="number" placeholder="例如 512" />
        </view>

        <view v-if="draftAiConfig.provider === 'openai'" class="form-item">
          <view class="label">Presence Penalty</view>
          <input v-model="draftAiConfig.presencePenalty" class="field-input" type="digit" placeholder="-2 到 2" />
        </view>

        <view v-if="draftAiConfig.provider === 'openai'" class="form-item">
          <view class="label">Frequency Penalty</view>
          <input v-model="draftAiConfig.frequencyPenalty" class="field-input" type="digit" placeholder="-2 到 2" />
        </view>

        <view class="hint">
          OpenAI 走 `chat/completions`，Anthropic 走 `messages`。当前配置只会保存到你自己的账号下。
        </view>

        <view class="actions">
          <button class="secondary-btn" :loading="validating" @click="validateConfig">校验配置</button>
          <button class="primary-btn" :loading="saving" @click="saveConfig">保存配置</button>
        </view>
        <button class="ghost-btn" @click="closeSettings">关闭</button>
      </scroll-view>
    </view>
  </view>
</template>

<script>
const DEFAULT_AI_CONFIG = {
  provider: 'openai',
  baseUrl: 'https://api.openai.com/v1',
  apiKey: '',
  model: '',
  temperature: 0.7,
  topP: 1,
  maxTokens: 512,
  presencePenalty: 0,
  frequencyPenalty: 0,
  systemPrompt: '你是小达老师，是一个面向校园场景的 AI 助手。请优先用简洁、友好的中文回答。'
};

export default {
  data() {
    return {
      providerOptions: [
        { label: 'OpenAI', value: 'openai' },
        { label: 'Anthropic', value: 'anthropic' }
      ],
      showSettings: false,
      saving: false,
      validating: false,
      isLoading: false,
      inputMessage: '',
      relatedInfos: [],
      scrollIntoView: '',
      aiConfig: { ...DEFAULT_AI_CONFIG },
      draftAiConfig: { ...DEFAULT_AI_CONFIG },
      messages: [
        {
          content: '你好，我是小达老师。右上角可以配置 Base URL、API Key、模型和参数，保存后就能开始真实对话。',
          isMine: false,
          time: new Date().toLocaleTimeString()
        }
      ]
    };
  },
  computed: {
    providerLabel() {
      const current = this.providerOptions.find((item) => item.value === this.aiConfig.provider);
      return current ? current.label : 'OpenAI';
    }
  },
  onShow() {
    this.loadAiConfig();
  },
  methods: {
    normalizeLocalConfig(source = this.draftAiConfig) {
      const provider = source.provider === 'anthropic' ? 'anthropic' : 'openai';
      return {
        provider,
        baseUrl: String(source.baseUrl || '').trim().replace(/\/$/, ''),
        apiKey: String(source.apiKey || '').trim(),
        model: String(source.model || '').trim(),
        temperature: Number(source.temperature),
        topP: Number(source.topP),
        maxTokens: Number(source.maxTokens),
        presencePenalty: Number(source.presencePenalty),
        frequencyPenalty: Number(source.frequencyPenalty),
        systemPrompt: String(source.systemPrompt || '').trim()
      };
    },
    validateLocalConfig(source = this.draftAiConfig) {
      const config = this.normalizeLocalConfig(source);
      if (!config.baseUrl) return '请填写 Base URL';
      if (!/^https?:\/\//i.test(config.baseUrl)) return 'Base URL 必须以 http:// 或 https:// 开头';
      if (!config.apiKey) return '请填写 API Key';
      if (!config.model) return '请填写模型名称';
      if (Number.isNaN(config.temperature) || config.temperature < 0 || config.temperature > 2) return 'Temperature 需在 0 到 2 之间';
      if (Number.isNaN(config.topP) || config.topP < 0 || config.topP > 1) return 'Top P 需在 0 到 1 之间';
      if (Number.isNaN(config.maxTokens) || config.maxTokens < 1) return 'Max Tokens 必须大于 0';
      if (config.provider === 'openai') {
        if (Number.isNaN(config.presencePenalty) || config.presencePenalty < -2 || config.presencePenalty > 2) return 'Presence Penalty 需在 -2 到 2 之间';
        if (Number.isNaN(config.frequencyPenalty) || config.frequencyPenalty < -2 || config.frequencyPenalty > 2) return 'Frequency Penalty 需在 -2 到 2 之间';
      }
      return '';
    },
    async loadAiConfig() {
      try {
        const res = await this.$api.ai.getSettings();
        this.aiConfig = { ...DEFAULT_AI_CONFIG, ...res };
        this.draftAiConfig = { ...this.aiConfig };
      } catch (error) {
        uni.showToast({ title: error.message || '加载 AI 配置失败', icon: 'none' });
      }
    },
    openSettings() {
      this.draftAiConfig = { ...this.aiConfig };
      this.showSettings = true;
    },
    closeSettings() {
      this.showSettings = false;
    },
    async validateConfig() {
      const error = this.validateLocalConfig();
      if (error) {
        uni.showToast({ title: error, icon: 'none' });
        return;
      }
      this.validating = true;
      try {
        const payload = this.normalizeLocalConfig();
        const res = await this.$api.ai.validateSettings(payload);
        this.draftAiConfig = { ...this.draftAiConfig, baseUrl: payload.baseUrl };
        uni.showModal({
          title: '校验成功',
          content: res.preview || '模型接口已连通',
          showCancel: false
        });
      } catch (error) {
        uni.showToast({ title: error.message || '校验失败', icon: 'none' });
      } finally {
        this.validating = false;
      }
    },
    async saveConfig() {
      const error = this.validateLocalConfig();
      if (error) {
        uni.showToast({ title: error, icon: 'none' });
        return;
      }
      this.saving = true;
      try {
        const payload = this.normalizeLocalConfig();
        const res = await this.$api.ai.updateSettings(payload);
        this.aiConfig = { ...DEFAULT_AI_CONFIG, ...(res.config || payload) };
        this.draftAiConfig = { ...this.aiConfig };
        uni.showToast({ title: 'AI 配置已保存', icon: 'success' });
        this.closeSettings();
      } catch (error) {
        uni.showToast({ title: error.message || '保存失败', icon: 'none' });
      } finally {
        this.saving = false;
      }
    },
    async sendMessage() {
      const message = (this.inputMessage || '').trim();
      if (!message || this.isLoading) {
        return;
      }

      const configError = this.validateLocalConfig(this.aiConfig);
      if (configError) {
        uni.showToast({ title: '请先完成并保存 AI 配置', icon: 'none' });
        this.openSettings();
        return;
      }

      this.messages.push({
        content: message,
        isMine: true,
        time: new Date().toLocaleTimeString()
      });
      this.inputMessage = '';
      this.isLoading = true;
      this.scrollToBottom();

      try {
        const res = await this.$api.ai.chat({
          message,
          messages: this.messages.map((item) => ({
            role: item.isMine ? 'user' : 'assistant',
            content: item.content
          }))
        });
        this.messages.push({
          content: res.response || '模型没有返回内容。',
          isMine: false,
          time: new Date().toLocaleTimeString()
        });
        this.relatedInfos = res.relatedInfos || [];
      } catch (error) {
        this.messages.push({
          content: error.message || '调用失败，请检查模型配置。',
          isMine: false,
          time: new Date().toLocaleTimeString()
        });
      } finally {
        this.isLoading = false;
        this.scrollToBottom();
      }
    },
    scrollToBottom() {
      const index = this.messages.length - 1;
      this.scrollIntoView = index >= 0 ? `msg-${index}` : '';
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
  padding-bottom: 280rpx;
  background: #f5f7fb;
  box-sizing: border-box;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 24rpx 12rpx;
  background: #ffffff;
  border-bottom: 1rpx solid #edf0f5;
}

.page-title {
  font-size: 34rpx;
  font-weight: 700;
  color: #1f2937;
}

.page-subtitle {
  margin-top: 6rpx;
  font-size: 24rpx;
  color: #6b7280;
}

.gear-btn {
  width: 64rpx;
  height: 64rpx;
  line-height: 64rpx;
  text-align: center;
  border-radius: 32rpx;
  background: #eef5ff;
  color: #1e88e5;
  font-size: 34rpx;
}

.chat-container {
  height: 760rpx;
  padding: 20rpx;
  box-sizing: border-box;
}

.chat-bottom-space {
  height: 40rpx;
}

.message {
  width: fit-content;
  max-width: 84%;
  margin-bottom: 18rpx;
}

.message.mine {
  margin-left: auto;
}

.message-role {
  margin-bottom: 8rpx;
  font-size: 22rpx;
  color: #8a94a6;
}

.message-content {
  padding: 18rpx 20rpx;
  border-radius: 18rpx;
  background: #ffffff;
  color: #1f2937;
  line-height: 1.6;
  box-shadow: 0 6rpx 18rpx rgba(15, 23, 42, 0.06);
  word-break: break-all;
}

.message.mine .message-content {
  background: #1e88e5;
  color: #ffffff;
}

.message-time {
  margin-top: 8rpx;
  font-size: 22rpx;
  color: #8a94a6;
}

.loading {
  padding: 16rpx 0 24rpx;
  text-align: center;
  color: #6b7280;
  font-size: 24rpx;
}

.input-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  gap: 12rpx;
  padding: 16rpx 20rpx calc(16rpx + env(safe-area-inset-bottom));
  background: #ffffff;
  border-top: 1rpx solid #edf0f5;
  z-index: 10;
}

.chat-input {
  flex: 1;
  height: 84rpx;
  padding: 0 20rpx;
  border: 2rpx solid #dbe3ef;
  border-radius: 16rpx;
  background: #ffffff;
  font-size: 28rpx;
}

.send-btn,
.primary-btn,
.secondary-btn,
.ghost-btn {
  border-radius: 16rpx;
  font-size: 28rpx;
}

.send-btn,
.primary-btn {
  background: #1e88e5;
  color: #ffffff;
}

.secondary-btn {
  background: #eef5ff;
  color: #1e88e5;
}

.ghost-btn {
  margin-top: 16rpx;
  background: #ffffff;
  color: #4b5563;
  border: 2rpx solid #dbe3ef;
}

.recommend-section {
  margin: 0 20rpx 20rpx;
  padding: 18rpx 20rpx;
  background: #ffffff;
  border-radius: 20rpx;
}

.section-title,
.settings-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #1f2937;
}

.recommend-item {
  padding: 16rpx 0;
  border-bottom: 1rpx solid #edf0f5;
}

.recommend-item:last-child {
  border-bottom: none;
}

.recommend-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #1f2937;
}

.recommend-content {
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #6b7280;
}

.overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.42);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 20;
}

.settings-panel {
  width: 100%;
  max-height: 82vh;
  padding: 28rpx 24rpx 36rpx;
  background: #ffffff;
  border-radius: 28rpx 28rpx 0 0;
  box-sizing: border-box;
}

.form-item {
  margin-top: 20rpx;
}

.label {
  margin-bottom: 10rpx;
  font-size: 26rpx;
  font-weight: 600;
  color: #374151;
}

.provider-row {
  display: flex;
  gap: 12rpx;
}

.provider-chip {
  padding: 12rpx 22rpx;
  border-radius: 999rpx;
  background: #f3f4f6;
  color: #4b5563;
  font-size: 24rpx;
}

.provider-chip.active {
  background: #1e88e5;
  color: #ffffff;
}

.field-input {
  width: 100%;
  min-height: 76rpx;
  padding: 0 20rpx;
  border: 2rpx solid #dbe3ef;
  border-radius: 16rpx;
  background: #ffffff;
  font-size: 28rpx;
  box-sizing: border-box;
}

.field-tip {
  margin-top: 8rpx;
  font-size: 22rpx;
  color: #64748b;
}

.textarea {
  width: 100%;
  min-height: 180rpx;
  padding: 18rpx 20rpx;
  border: 2rpx solid #dbe3ef;
  border-radius: 16rpx;
  background: #ffffff;
  font-size: 28rpx;
  box-sizing: border-box;
}

.hint {
  margin-top: 20rpx;
  padding: 18rpx 20rpx;
  border-radius: 16rpx;
  background: #f8fafc;
  color: #64748b;
  font-size: 24rpx;
  line-height: 1.6;
}

.actions {
  display: flex;
  gap: 12rpx;
  margin-top: 22rpx;
}

.actions button {
  flex: 1;
}
</style>
