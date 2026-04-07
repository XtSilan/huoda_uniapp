<template>
  <view class="page-shell ai-page">
    <view class="page-header">
      <view class="topbar">
        <page-nav fallback="/pages/index/index" :is-tab="true" />
        <view class="topbar-actions" @click.stop>
          <view class="topbar-action topbar-action--subtle" @click="openSettings">
            <svg class="gear-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M10.84 2.68a1.2 1.2 0 0 1 2.32 0l.3 1.34a8.56 8.56 0 0 1 1.93.8l1.17-.7a1.2 1.2 0 0 1 1.64.44l1.16 2a1.2 1.2 0 0 1-.28 1.56l-1.02.92c.14.63.21 1.27.21 1.92s-.07 1.29-.21 1.92l1.02.92a1.2 1.2 0 0 1 .28 1.56l-1.16 2a1.2 1.2 0 0 1-1.64.44l-1.17-.7c-.6.34-1.25.61-1.93.8l-.3 1.34a1.2 1.2 0 0 1-2.32 0l-.3-1.34a8.56 8.56 0 0 1-1.93-.8l-1.17.7a1.2 1.2 0 0 1-1.64-.44l-1.16-2a1.2 1.2 0 0 1 .28-1.56l1.02-.92A8.7 8.7 0 0 1 4.5 12c0-.65.07-1.29.21-1.92l-1.02-.92a1.2 1.2 0 0 1-.28-1.56l1.16-2a1.2 1.2 0 0 1 1.64-.44l1.17.7c.6-.34 1.25-.61 1.93-.8l.3-1.34ZM12 15.4a3.4 3.4 0 1 0 0-6.8 3.4 3.4 0 0 0 0 6.8Z"
                fill="currentColor"
              />
            </svg>
          </view>
          <view
            class="topbar-action topbar-action--book"
            :class="{ active: showHistoryPanel }"
            @click="toggleHistoryPanel"
          >
            <view class="book-icon">
              <view class="book-icon__page book-icon__page--left"></view>
              <view class="book-icon__page book-icon__page--right"></view>
              <view class="book-icon__spine"></view>
            </view>
            <text class="topbar-action__label">历史</text>
          </view>
          <view class="topbar-action topbar-action--primary" @click="startNewConversation">+</view>
        </view>
      </view>

      <view class="page-title">小达老师</view>
      <view class="page-subtitle">{{ currentConversationTitle }} · 平台默认模型 / {{ currentModelLabel }}</view>
    </view>

    <view v-if="showHistoryPanel" class="history-float-mask" @click="closeHistoryPanel">
      <view class="surface-card conversation-panel" @click.stop>
        <view class="conversation-panel__arrow"></view>
        <view class="conversation-panel__head">
          <view class="conversation-panel__title">历史对话</view>
          <view class="conversation-panel__action" @click="startNewConversation">新建</view>
        </view>
        <view v-if="conversations.length === 0" class="empty-inline">还没有历史对话</view>
        <scroll-view v-else class="conversation-scroll" scroll-y>
          <view
            v-for="item in conversations"
            :key="item.id"
            class="conversation-item"
            :class="{ active: item.id === currentConversationId }"
            @click="switchConversation(item.id)"
          >
            <view class="conversation-item__title">{{ item.title || '新对话' }}</view>
            <view class="conversation-item__meta">{{ formatConversationTime(item.updatedAt) }}</view>
          </view>
        </scroll-view>
      </view>
    </view>
    <scroll-view
      class="chat-panel surface-card"
      scroll-y
      :scroll-into-view="scrollIntoView"
      :scroll-with-animation="true"
      @scroll="handleChatScroll"
      @scrolltolower="handleReachBottom"
    >
      <view
        v-for="(message, index) in messages"
        :id="'msg-' + index"
        :key="message.id"
        class="message"
        :class="{ mine: message.isMine }"
      >
        <view class="message-role">{{ message.isMine ? '我' : '小达老师' }}</view>
        <view class="message-content">{{ message.content }}</view>
        <view class="message-time">{{ message.time }}</view>
      </view>

      <view v-if="isLoading" class="loading">小达老师正在整理内容...</view>

      <view v-if="!messages.length && !isLoading" class="empty-chat">
        <view class="empty-chat__title">先点上面的快捷入口试试</view>
        <view class="empty-chat__desc">也可以直接输入问题继续追问。</view>
      </view>

      <view :id="bottomAnchorId" class="chat-bottom-space"></view>
    </scroll-view>

    <view v-if="showNewMessageTip" class="new-message-tip" @click="jumpToLatestMessage">有一条新消息</view>

    <view
      v-if="isInputFocused"
      class="floating-quick-actions"
      :class="{ 'floating-quick-actions--active': isInputFocused }"
    >
      <scroll-view class="floating-quick-actions__row" scroll-x>
        <view
          v-for="item in quickActions"
          :key="item.intent"
          class="floating-quick-actions__pill"
          @click="runQuickIntent(item)"
        >
          {{ item.shortTitle }}
        </view>
      </scroll-view>
    </view>

    <view v-if="relatedInfos.length" class="section-block">
      <view class="section-row">
        <text class="section-heading">相关内容</text>
      </view>
      <view class="surface-card related-card">
        <view
          v-for="item in relatedInfos"
          :key="item.id"
          class="related-item"
          @click="goToDetail(item)"
        >
          <view class="related-item__title">{{ item.title }}</view>
          <view class="related-item__desc">{{ item.recommendationReason || item.summary || item.content }}</view>
        </view>
      </view>
    </view>

    <view v-else class="section-block">
      <view class="surface-card tips-card">
        <view class="tips-card__title">{{ currentConversationTitle }}</view>
        <view class="tips-card__desc">比如“再给我两个更适合大一的”或者“把重点改成三句话”。</view>
      </view>
    </view>

    <view class="input-wrap surface-card">
      <view class="input-row">
        <input
          class="chat-input"
          v-model="inputMessage"
          placeholder="继续问小达老师..."
          @focus="handleInputFocus"
          @blur="handleInputBlur"
          @confirm="sendMessage"
        />
        <view class="send-chip" @click="sendMessage">{{ isLoading ? '发送中' : '发送' }}</view>
      </view>
    </view>

    <view v-if="showSettings" class="overlay">
      <scroll-view class="settings-panel" scroll-y>
        <view class="settings-title">高级模型设置</view>

        <view class="form-item">
          <view class="label">使用方案</view>
          <view class="mode-row">
            <view
              v-for="item in modeOptions"
              :key="item.value"
              class="mode-chip"
              :class="{ active: draftSettings.mode === item.value }"
              @click="selectMode(item.value)"
            >
              {{ item.label }}
            </view>
          </view>
        </view>

        <view v-if="draftSettings.mode === 'preset'" class="form-item">
          <view class="label">默认模型</view>
          <view
            v-for="item in presets"
            :key="item.id"
            class="preset-card"
            :class="{ active: draftSettings.selectedPresetId === item.id }"
            @click="selectPreset(item.id)"
          >
            <view class="preset-title">
              {{ item.name }}
              <text v-if="item.isDefault" class="default-tag">默认</text>
            </view>
            <view class="preset-meta">{{ item.provider }} / {{ item.model }}</view>
            <view class="preset-meta">{{ item.baseUrl }}</view>
          </view>
        </view>

        <view v-else>
          <view class="form-item">
            <view class="label">Base URL</view>
            <input v-model="activeCustomConfig.baseUrl" class="field-input" placeholder="例如 https://api.openai.com/v1" />
          </view>
          <view class="form-item">
            <view class="label">API Key</view>
            <input v-model="activeCustomConfig.apiKey" class="field-input" password placeholder="输入你的 API Key" />
          </view>
          <view class="form-item">
            <view class="label">模型名称</view>
            <input v-model="activeCustomConfig.model" class="field-input" placeholder="输入模型名称" />
          </view>
          <view class="form-item">
            <view class="label">System Prompt</view>
            <textarea v-model="activeCustomConfig.systemPrompt" class="textarea" placeholder="输入系统提示词"></textarea>
          </view>
          <view class="form-item">
            <view class="label">Temperature</view>
            <input v-model="activeCustomConfig.temperature" class="field-input" type="digit" placeholder="0 - 2" />
          </view>
          <view class="form-item">
            <view class="label">Top P</view>
            <input v-model="activeCustomConfig.topP" class="field-input" type="digit" placeholder="0 - 1" />
          </view>
          <view class="form-item">
            <view class="label">Max Tokens</view>
            <input v-model="activeCustomConfig.maxTokens" class="field-input" type="number" placeholder="例如 512" />
          </view>
        </view>

        <view class="hint">普通用户一般不需要改这里，这里更适合调试模型或接入自定义服务。</view>

        <view class="actions">
          <custom-button text="校验当前方案" ghost @click="validateConfig" />
          <custom-button text="保存设置" :loading="saving" @click="saveSettings" />
        </view>
        <view class="close-chip" @click="closeSettings">关闭</view>
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
  systemPrompt: '你是小达老师，是一个真正有用的校园助手。请用简洁、友好的中文回答。'
};

const QUICK_ACTIONS = [
  { intent: 'recommend_activities', title: '推荐适合我的活动', shortTitle: '推荐活动' },
  { intent: 'summarize_notifications', title: '总结最近通知', shortTitle: '总结通知' },
  { intent: 'extract_info_highlights', title: '提炼资讯重点', shortTitle: '提炼资讯' }
];

const createDefaultSettings = () => ({
  mode: 'preset',
  selectedPresetId: '',
  customOpenAI: { ...DEFAULT_AI_CONFIG, provider: 'openai' },
  customAnthropic: { ...DEFAULT_AI_CONFIG, provider: 'anthropic', baseUrl: 'https://api.anthropic.com/v1' }
});

export default {
  data() {
    return {
      quickActions: QUICK_ACTIONS,
      modeOptions: [
        { label: '默认模型', value: 'preset' },
        { label: '自定义 OpenAI', value: 'custom-openai' },
        { label: '自定义 Anthropic', value: 'custom-anthropic' }
      ],
      showSettings: false,
      showHistoryPanel: false,
      saving: false,
      validating: false,
      isLoading: false,
      inputMessage: '',
      relatedInfos: [],
      scrollIntoView: '',
      bottomAnchorId: 'chat-bottom-anchor',
      presets: [],
      aiSettings: createDefaultSettings(),
      draftSettings: createDefaultSettings(),
      conversations: [],
      currentConversationId: '',
      messages: [],
      showNewMessageTip: false,
      isAtChatBottom: true,
      isInputFocused: false
    };
  },
  computed: {
    activeCustomConfig() {
      return this.draftSettings.mode === 'custom-anthropic' ? this.draftSettings.customAnthropic : this.draftSettings.customOpenAI;
    },
    currentModelLabel() {
      if (this.aiSettings.mode === 'preset') {
        const preset = this.presets.find((item) => item.id === this.aiSettings.selectedPresetId) || this.presets.find((item) => item.isDefault);
        return preset ? `${preset.name} / ${preset.model}` : '默认模型';
      }
      const config = this.aiSettings.mode === 'custom-anthropic' ? this.aiSettings.customAnthropic : this.aiSettings.customOpenAI;
      return config.model || '自定义模型';
    },
    currentConversationTitle() {
      const current = this.conversations.find((item) => item.id === this.currentConversationId);
      return (current && current.title) || '新对话';
    }
  },
  onShow() {
    this.loadSettings();
    this.loadConversations();
  },
  methods: {
    selectMode(mode) {
      this.draftSettings.mode = mode;
    },
    selectPreset(id) {
      this.draftSettings.selectedPresetId = id;
    },
    getStorageKey() {
      const user = uni.getStorageSync('userInfo') || {};
      return `aiConversations:${user.id || user.studentId || 'guest'}`;
    },
    createConversation(title = '新对话') {
      const now = new Date().toISOString();
      return {
        id: `chat-${Date.now()}`,
        title,
        updatedAt: now,
        relatedInfos: [],
        messages: []
      };
    },
    ensureConversation() {
      if (this.currentConversationId) {
        return;
      }
      const conversation = this.createConversation();
      this.conversations = [conversation];
      this.currentConversationId = conversation.id;
      this.messages = [];
      this.relatedInfos = [];
      this.persistConversations();
    },
    loadConversations() {
      const saved = uni.getStorageSync(this.getStorageKey());
      this.conversations = Array.isArray(saved) ? saved : [];
      if (!this.conversations.length) {
        this.ensureConversation();
        return;
      }
      const current = this.conversations.find((item) => item.id === this.currentConversationId) || this.conversations[0];
      this.currentConversationId = current.id;
      this.messages = current.messages || [];
      this.relatedInfos = current.relatedInfos || [];
      this.scrollToBottom();
    },
    persistConversations() {
      uni.setStorageSync(this.getStorageKey(), this.conversations);
    },
    updateCurrentConversation(extra = {}) {
      const index = this.conversations.findIndex((item) => item.id === this.currentConversationId);
      if (index === -1) {
        return;
      }
      const next = {
        ...this.conversations[index],
        messages: this.messages,
        relatedInfos: this.relatedInfos,
        updatedAt: new Date().toISOString(),
        ...extra
      };
      this.conversations.splice(index, 1, next);
      this.conversations.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      this.persistConversations();
    },
    startNewConversation() {
      const conversation = this.createConversation();
      this.conversations.unshift(conversation);
      this.currentConversationId = conversation.id;
      this.messages = [];
      this.relatedInfos = [];
      this.showHistoryPanel = false;
      this.showNewMessageTip = false;
      this.persistConversations();
      this.scrollToBottom(true);
    },
    switchConversation(id) {
      const current = this.conversations.find((item) => item.id === id);
      if (!current) {
        return;
      }
      this.currentConversationId = id;
      this.messages = current.messages || [];
      this.relatedInfos = current.relatedInfos || [];
      this.showHistoryPanel = false;
      this.showNewMessageTip = false;
      this.scrollToBottom(true);
    },
    toggleHistoryPanel() {
      this.showHistoryPanel = !this.showHistoryPanel;
    },
    normalizeConfig(config, provider) {
      return {
        provider,
        baseUrl: String(config.baseUrl || '').trim().replace(/\/$/, ''),
        apiKey: String(config.apiKey || '').trim(),
        model: String(config.model || '').trim(),
        temperature: Number(config.temperature),
        topP: Number(config.topP),
        maxTokens: Number(config.maxTokens),
        presencePenalty: Number(config.presencePenalty),
        frequencyPenalty: Number(config.frequencyPenalty),
        systemPrompt: String(config.systemPrompt || '').trim()
      };
    },
    buildPayload(source = this.draftSettings) {
      return {
        mode: source.mode,
        selectedPresetId: String(source.selectedPresetId || ''),
        customOpenAI: this.normalizeConfig(source.customOpenAI, 'openai'),
        customAnthropic: this.normalizeConfig(source.customAnthropic, 'anthropic')
      };
    },
    validateCustomConfig(config) {
      if (!config.baseUrl) return '请填写 Base URL';
      if (!/^https?:\/\//i.test(config.baseUrl)) return 'Base URL 必须以 http:// 或 https:// 开头';
      if (!config.apiKey) return '请填写 API Key';
      if (!config.model) return '请填写模型名称';
      if (Number.isNaN(config.temperature) || config.temperature < 0 || config.temperature > 2) return 'Temperature 需要在 0 到 2 之间';
      if (Number.isNaN(config.topP) || config.topP < 0 || config.topP > 1) return 'Top P 需要在 0 到 1 之间';
      if (Number.isNaN(config.maxTokens) || config.maxTokens < 1) return 'Max Tokens 必须大于 0';
      return '';
    },
    validatePayload(payload) {
      if (payload.mode === 'preset') {
        const hasPreset = payload.selectedPresetId || this.presets.find((item) => item.isDefault);
        return hasPreset ? '' : '当前没有可用的默认模型';
      }
      return this.validateCustomConfig(payload.mode === 'custom-openai' ? payload.customOpenAI : payload.customAnthropic);
    },
    async loadSettings() {
      try {
        const res = await this.$api.ai.getSettings();
        this.presets = res.presets || [];
        this.aiSettings = {
          ...createDefaultSettings(),
          ...res,
          customOpenAI: { ...createDefaultSettings().customOpenAI, ...(res.customOpenAI || {}) },
          customAnthropic: { ...createDefaultSettings().customAnthropic, ...(res.customAnthropic || {}) }
        };
        if (!this.aiSettings.selectedPresetId) {
          const defaultPreset = this.presets.find((item) => item.isDefault);
          this.aiSettings.selectedPresetId = defaultPreset ? defaultPreset.id : '';
        }
        this.draftSettings = JSON.parse(JSON.stringify(this.aiSettings));
      } catch (error) {
        uni.showToast({ title: error.message || '加载 AI 设置失败', icon: 'none' });
      }
    },
    openSettings() {
      this.draftSettings = JSON.parse(JSON.stringify(this.aiSettings));
      this.showHistoryPanel = false;
      this.showSettings = true;
    },
    closeHistoryPanel() {
      this.showHistoryPanel = false;
    },
    closeSettings() {
      this.showSettings = false;
    },
    async validateConfig() {
      const payload = this.buildPayload();
      const error = this.validatePayload(payload);
      if (error) {
        uni.showToast({ title: error, icon: 'none' });
        return;
      }
      if (payload.mode === 'preset') {
        uni.showToast({ title: '默认模型由后台统一维护', icon: 'none' });
        return;
      }
      this.validating = true;
      try {
        const config = payload.mode === 'custom-openai' ? payload.customOpenAI : payload.customAnthropic;
        const res = await this.$api.ai.validateSettings(config);
        uni.showModal({ title: '校验成功', content: res.preview || '模型连接正常', showCancel: false });
      } catch (error) {
        uni.showToast({ title: error.message || '校验失败', icon: 'none' });
      } finally {
        this.validating = false;
      }
    },
    async saveSettings() {
      const payload = this.buildPayload();
      const error = this.validatePayload(payload);
      if (error) {
        uni.showToast({ title: error, icon: 'none' });
        return;
      }
      this.saving = true;
      try {
        const res = await this.$api.ai.updateSettings(payload);
        this.aiSettings = {
          ...this.aiSettings,
          ...(res.settings || payload)
        };
        this.draftSettings = JSON.parse(JSON.stringify(this.aiSettings));
        uni.showToast({ title: '设置已保存', icon: 'success' });
        this.closeSettings();
      } catch (error) {
        uni.showToast({ title: error.message || '保存失败', icon: 'none' });
      } finally {
        this.saving = false;
      }
    },
    async runQuickIntent(item) {
      if (this.isLoading) {
        return;
      }
      await this.sendAiRequest({
        intent: item.intent,
        displayText: item.title,
        requestText: item.title,
        useConversationHistory: false
      });
    },
    async sendMessage() {
      const message = String(this.inputMessage || '').trim();
      if (!message || this.isLoading) {
        return;
      }
      this.inputMessage = '';
      await this.sendAiRequest({
        intent: 'chat',
        displayText: message,
        requestText: message,
        useConversationHistory: true
      });
    },
    async sendAiRequest({ intent = 'chat', displayText = '', requestText = '', useConversationHistory = true }) {
      this.ensureConversation();
      const payload = this.buildPayload(this.aiSettings);
      const configError = this.validatePayload(payload);
      if (configError) {
        uni.showToast({ title: configError, icon: 'none' });
        this.openSettings();
        return;
      }

      const userMessage = {
        id: `msg-${Date.now()}`,
        content: displayText,
        isMine: true,
        time: new Date().toLocaleTimeString()
      };
      this.messages.push(userMessage);
      this.updateCurrentConversation({
        title: this.currentConversationTitle === '新对话' ? displayText.slice(0, 16) : this.currentConversationTitle
      });
      this.isLoading = true;
      this.showNewMessageTip = false;
      this.scrollToBottom(true);

      try {
        const res = await this.$api.ai.chat({
          intent,
          message: requestText,
          messages: useConversationHistory
            ? this.messages.map((item) => ({
                role: item.isMine ? 'user' : 'assistant',
                content: item.content
              }))
            : undefined
        });
        this.messages.push({
          id: `msg-${Date.now()}-reply`,
          content: res.response || '小达老师暂时没有整理出内容。',
          isMine: false,
          time: new Date().toLocaleTimeString()
        });
        this.relatedInfos = res.relatedInfos || [];
        this.handleIncomingMessage(this.isAtChatBottom);
      } catch (error) {
        this.messages.push({
          id: `msg-${Date.now()}-error`,
          content: error.message || '请求失败，请稍后再试。',
          isMine: false,
          time: new Date().toLocaleTimeString()
        });
        this.handleIncomingMessage(this.isAtChatBottom);
      } finally {
        this.isLoading = false;
        this.updateCurrentConversation();
      }
    },
    handleIncomingMessage(shouldKeepAtBottom) {
      if (shouldKeepAtBottom) {
        this.showNewMessageTip = false;
        this.scrollToBottom(true);
        return;
      }
      this.showNewMessageTip = true;
    },
    handleChatScroll(event) {
      const detail = (event && event.detail) || {};
      const panelHeight = uni.upx2px(940);
      const threshold = uni.upx2px(80);
      const scrollTop = Number(detail.scrollTop || 0);
      const scrollHeight = Number(detail.scrollHeight || 0);
      const nearBottom = scrollTop + panelHeight >= scrollHeight - threshold;
      this.isAtChatBottom = nearBottom;
      if (nearBottom) {
        this.showNewMessageTip = false;
      }
    },
    handleReachBottom() {
      this.isAtChatBottom = true;
      this.showNewMessageTip = false;
    },
    jumpToLatestMessage() {
      this.showNewMessageTip = false;
      this.scrollToBottom(true);
    },
    handleInputFocus() {
      this.isInputFocused = true;
    },
    handleInputBlur() {
      this.isInputFocused = false;
    },
    scrollToBottom(force = false) {
      if (force) {
        this.isAtChatBottom = true;
      }
      this.scrollIntoView = '';
      this.$nextTick(() => {
        this.scrollIntoView = this.bottomAnchorId;
      });
    },
    goToDetail(item) {
      uni.navigateTo({
        url: item.startTime ? `/pages/feature/publish/detail?id=${item.id}` : `/pages/info/info?id=${item.id}`
      });
    },
    formatConversationTime(value) {
      return value ? new Date(value).toLocaleString() : '-';
    }
  }
};
</script>

<style scoped>
.ai-page {
  padding-bottom: calc(280rpx + env(safe-area-inset-bottom));
  background:
    radial-gradient(circle at top right, rgba(140, 124, 255, 0.22), transparent 32%),
    radial-gradient(circle at top left, rgba(255, 255, 255, 0.85), transparent 24%),
    linear-gradient(180deg, #f7f5ff 0%, #f4f6fb 42%, #eef2f8 100%);
}

.page-header {
  margin-bottom: 8rpx;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.topbar-actions {
  display: flex;
  align-items: center;
  gap: 10rpx;
  padding: 8rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.82);
  box-shadow: 0 12rpx 34rpx rgba(110, 102, 170, 0.12);
  backdrop-filter: blur(12rpx);
}

.topbar-action {
  width: 68rpx;
  height: 68rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26rpx;
  font-weight: 700;
  color: #7b75a8;
  background: #f6f4ff;
}

.topbar-action--book {
  width: 126rpx;
  border-radius: 999rpx;
  gap: 10rpx;
  padding: 0 18rpx;
}

.topbar-action__label {
  font-size: 22rpx;
  font-weight: 700;
  line-height: 1;
}

.gear-icon {
  width: 34rpx;
  height: 34rpx;
  display: block;
  color: currentColor;
}

.topbar-action--primary {
  color: #ffffff;
  background: linear-gradient(135deg, #a48cff 0%, #7a64ff 100%);
  box-shadow: 0 12rpx 28rpx rgba(122, 100, 255, 0.26);
}

.topbar-action--book.active,
.topbar-action--subtle:active {
  background: #efeaff;
  color: var(--primary-color);
}

.book-icon {
  position: relative;
  width: 34rpx;
  height: 28rpx;
}

.book-icon__page {
  position: absolute;
  top: 0;
  width: 16rpx;
  height: 28rpx;
  border: 2rpx solid currentColor;
  background: rgba(255, 255, 255, 0.92);
}

.book-icon__page--left {
  left: 0;
  border-radius: 8rpx 2rpx 2rpx 8rpx;
}

.book-icon__page--right {
  right: 0;
  border-radius: 2rpx 8rpx 8rpx 2rpx;
}

.book-icon__spine {
  position: absolute;
  top: 3rpx;
  left: 50%;
  width: 2rpx;
  height: 22rpx;
  background: currentColor;
  transform: translateX(-50%);
}

.page-title {
  margin-top: 16rpx;
  font-size: 58rpx;
}

.page-subtitle {
  margin-top: 8rpx;
  font-size: 24rpx;
}

.send-chip,
.close-chip {
  min-width: 104rpx;
  height: 58rpx;
  padding: 0 22rpx;
  border-radius: 999rpx;
  background: #f1edff;
  color: #7267d9;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 23rpx;
  font-weight: 700;
}

.history-float-mask {
  position: fixed;
  inset: 0;
  z-index: 26;
}

.conversation-panel {
  position: absolute;
  top: calc(116rpx + env(safe-area-inset-top));
  right: 24rpx;
  width: 360rpx;
  max-height: 560rpx;
  padding: 20rpx;
  background: rgba(255, 255, 255, 0.97);
  box-shadow: 0 20rpx 48rpx rgba(104, 96, 163, 0.18);
}

.conversation-panel__arrow {
  position: absolute;
  top: -12rpx;
  right: 136rpx;
  width: 24rpx;
  height: 24rpx;
  background: #ffffff;
  transform: rotate(45deg);
  border-radius: 6rpx;
}

.conversation-panel__head {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  z-index: 1;
}

.conversation-panel__title {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--text-main);
}

.conversation-panel__action {
  font-size: 22rpx;
  font-weight: 700;
  color: #7267d9;
}

.conversation-scroll {
  max-height: 468rpx;
  margin-top: 14rpx;
}

.conversation-item {
  padding: 18rpx 4rpx;
  border-bottom: 1rpx solid #eff1f8;
}

.conversation-item.active {
  background: linear-gradient(90deg, rgba(241, 237, 255, 0.9), rgba(255, 255, 255, 0));
  border-radius: 18rpx;
}

.conversation-item.active .conversation-item__title {
  color: #6f63df;
}

.conversation-item__title {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--text-main);
}

.conversation-item__meta,
.empty-inline {
  margin-top: 8rpx;
  font-size: 22rpx;
  color: var(--text-sub);
}

.chat-panel {
  height: 940rpx;
  margin-top: 10rpx;
  padding: 20rpx 24rpx 28rpx;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 22rpx 48rpx rgba(110, 112, 160, 0.08);
}

.message {
  width: fit-content;
  max-width: 84%;
  margin-bottom: 24rpx;
}

.message.mine {
  margin-left: auto;
}

.message-role,
.message-time {
  font-size: 22rpx;
  color: var(--text-sub);
}

.message-role {
  margin-bottom: 8rpx;
}

.message-content {
  padding: 18rpx 22rpx;
  border-radius: 24rpx;
  background: #f4f5fb;
  color: var(--text-main);
  line-height: 1.75;
}

.message.mine .message-content {
  background: linear-gradient(135deg, #8c74ff 0%, #6f60ec 100%);
  color: #ffffff;
}

.message-time {
  margin-top: 8rpx;
}

.loading,
.chat-bottom-space {
  height: 40rpx;
  font-size: 24rpx;
  color: var(--text-sub);
}

.empty-chat {
  min-height: 100%;
  padding: 120rpx 24rpx 100rpx;
  text-align: center;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.empty-chat__title,
.tips-card__title {
  font-size: 34rpx;
  font-weight: 700;
  color: var(--text-main);
}

.empty-chat__desc,
.tips-card__desc {
  margin-top: 12rpx;
  font-size: 24rpx;
  line-height: 1.7;
  color: var(--text-sub);
}

.related-card,
.tips-card {
  margin-top: 10rpx;
  padding: 22rpx 24rpx;
  background: rgba(255, 255, 255, 0.9);
}

.related-item {
  padding: 18rpx 0;
}

.related-item + .related-item {
  border-top: 1rpx solid #eef1f7;
}

.related-item__title {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--text-main);
}

.related-item__desc {
  margin-top: 8rpx;
  font-size: 24rpx;
  line-height: 1.6;
  color: var(--text-sub);
}

.new-message-tip {
  position: fixed;
  right: 36rpx;
  bottom: calc(286rpx + env(safe-area-inset-bottom));
  z-index: 25;
  padding: 16rpx 24rpx;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #8b7fff 0%, #6f60ec 100%);
  color: #ffffff;
  font-size: 24rpx;
  font-weight: 700;
  box-shadow: 0 14rpx 28rpx rgba(111, 96, 236, 0.2);
}

.floating-quick-actions {
  position: fixed;
  left: 24rpx;
  right: 24rpx;
  bottom: calc(148rpx + env(safe-area-inset-bottom));
  z-index: 21;
  pointer-events: none;
  padding: 8rpx;
  border-radius: 999rpx;
  border: 2rpx solid rgba(255, 255, 255, 0.96);
  background: rgba(255, 255, 255, 0.72);
  box-shadow: 0 14rpx 30rpx rgba(121, 125, 166, 0.12);
  backdrop-filter: blur(14rpx);
  transform: translateY(0);
}

.floating-quick-actions__row {
  white-space: nowrap;
}

.floating-quick-actions--active {
  animation: quick-actions-pop 240ms ease;
}

.floating-quick-actions__pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 62rpx;
  margin-right: 10rpx;
  padding: 0 28rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 10rpx 24rpx rgba(121, 125, 166, 0.12);
  font-size: 22rpx;
  font-weight: 700;
  color: #6458d9;
  pointer-events: auto;
}

.input-wrap {
  position: fixed;
  left: 24rpx;
  right: 24rpx;
  bottom: calc(24rpx + env(safe-area-inset-bottom));
  padding: 16rpx 18rpx;
  z-index: 20;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 22rpx 46rpx rgba(121, 125, 166, 0.14);
}

.input-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.chat-input,
.field-input,
.textarea {
  width: 100%;
  background: #f5f6fc;
  border-radius: 24rpx;
  font-size: 28rpx;
  color: var(--text-main);
}

.chat-input,
.field-input {
  height: 88rpx;
  padding: 0 24rpx;
}

.send-chip {
  min-width: 94rpx;
  background: #f1edff;
}

.overlay {
  position: fixed;
  inset: 0;
  background: rgba(44, 50, 70, 0.35);
  display: flex;
  align-items: flex-end;
  z-index: 30;
}

.settings-panel {
  width: 100%;
  max-height: 82vh;
  padding: 28rpx 24rpx 36rpx;
  background: #ffffff;
  border-radius: 32rpx 32rpx 0 0;
}

.settings-title,
.label {
  color: var(--text-main);
}

.settings-title {
  font-size: 32rpx;
  font-weight: 700;
}

.form-item {
  margin-top: 20rpx;
}

.label {
  margin-bottom: 10rpx;
  font-size: 26rpx;
  font-weight: 700;
}

.mode-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.mode-chip {
  padding: 12rpx 22rpx;
  border-radius: var(--radius-full);
  background: #f6f7fb;
  color: var(--text-sub);
  font-size: 24rpx;
}

.mode-chip.active {
  background: var(--primary-light);
  color: var(--primary-color);
}

.preset-card {
  margin-top: 12rpx;
  padding: 18rpx 20rpx;
  background: #f6f7fb;
  border-radius: 24rpx;
}

.preset-card.active {
  background: var(--primary-light);
}

.preset-title {
  font-size: 28rpx;
  font-weight: 700;
}

.default-tag,
.preset-meta,
.hint {
  font-size: 24rpx;
}

.default-tag {
  color: var(--primary-color);
}

.preset-meta,
.hint {
  margin-top: 8rpx;
  color: var(--text-sub);
  line-height: 1.6;
  word-break: break-all;
}

.textarea {
  min-height: 180rpx;
  padding: 18rpx 24rpx;
}

.actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14rpx;
  margin-top: 24rpx;
}

.close-chip {
  margin: 20rpx auto 0;
}

@keyframes quick-actions-pop {
  from {
    opacity: 0.86;
    transform: translateY(16rpx) scale(0.985);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
</style>
