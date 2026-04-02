<template>
  <view class="page-shell settings-page">
    <view class="page-header">
      <page-nav fallback="/pages/user/user" :is-tab="true" />
      <view class="page-eyebrow">设置中心</view>
      <view class="page-title">账号、安全与通知偏好</view>
      <view class="page-subtitle">定制你的专属体验</view>
    </view>

    <view class="surface-card section-card">
      <view class="section-heading">账户安全</view>
      <view class="field-block">
        <text class="field-label">旧密码</text>
        <view class="field-panel">
          <input v-model="passwordForm.oldPassword" class="field-input" password placeholder="请输入当前密码" />
        </view>
      </view>
      <view class="field-block">
        <text class="field-label">新密码</text>
        <view class="field-panel">
          <input v-model="passwordForm.newPassword" class="field-input" password placeholder="请输入新密码" />
        </view>
      </view>
      <custom-button text="修改密码" :loading="passwordLoading" @click="changePassword" />
    </view>

    <view class="surface-card section-card">
      <view class="section-heading">通知与偏好</view>
      <view v-for="item in settingItems" :key="item.key" class="setting-item">
        <view class="setting-main">
          <view class="setting-text">{{ item.title }}</view>
          <view class="setting-desc">{{ item.desc }}</view>
        </view>
        <switch :checked="item.checked" color="#6B48FF" @change="item.handler"></switch>
      </view>
      <view class="save-wrap">
        <custom-button text="保存设置" :loading="settingsLoading" @click="saveSettings" />
      </view>
    </view>

    <view class="surface-card section-card">
      <view class="section-heading">其他</view>
      <view class="setting-item clickable" @click="aboutUs">
        <view class="setting-main">
          <view class="setting-text">关于我们</view>
          <view class="setting-desc">查看当前版本与平台说明</view>
        </view>
        <view class="arrow">›</view>
      </view>
      <view class="setting-item clickable" @click="feedback">
        <view class="setting-main">
          <view class="setting-text">意见反馈</view>
          <view class="setting-desc">后续可扩展为工单或表单</view>
        </view>
        <view class="arrow">›</view>
      </view>
      <view class="setting-item clickable" @click="clearCache">
        <view class="setting-main">
          <view class="setting-text">清除缓存</view>
          <view class="setting-desc">仅清理本地登录和展示缓存</view>
        </view>
        <view class="arrow">›</view>
      </view>
    </view>
  </view>
</template>

<script>
import { clearSession } from '../../utils/session';

export default {
  data() {
    return {
      settingsLoading: false,
      passwordLoading: false,
      settings: {
        notification: {
          activity: true,
          lecture: true,
          partTime: true
        },
        theme: {
          darkMode: false,
          autoRefresh: true
        }
      },
      passwordForm: {
        oldPassword: '',
        newPassword: ''
      }
    };
  },
  computed: {
    settingItems() {
      return [
        {
          key: 'activity',
          title: '活动通知',
          desc: '接收活动发布和报名提醒',
          checked: this.settings.notification.activity,
          handler: (event) => this.onSwitchChange('activity', event)
        },
        {
          key: 'lecture',
          title: '讲座通知',
          desc: '接收讲座和资讯更新',
          checked: this.settings.notification.lecture,
          handler: (event) => this.onSwitchChange('lecture', event)
        },
        {
          key: 'partTime',
          title: '兼职/实践通知',
          desc: '接收实践、公益和招聘消息',
          checked: this.settings.notification.partTime,
          handler: (event) => this.onSwitchChange('partTime', event)
        },
        {
          key: 'darkMode',
          title: '夜间模式偏好',
          desc: '保存你的主题显示偏好',
          checked: this.settings.theme.darkMode,
          handler: (event) => this.onThemeChange('darkMode', event)
        },
        {
          key: 'autoRefresh',
          title: '自动刷新',
          desc: '进入首页后自动拉取最新内容',
          checked: this.settings.theme.autoRefresh,
          handler: (event) => this.onThemeChange('autoRefresh', event)
        }
      ];
    }
  },
  onShow() {
    this.loadSettings();
  },
  methods: {
    async loadSettings() {
      try {
        const res = await this.$api.user.getSettings();
        this.settings = {
          notification: {
            ...this.settings.notification,
            ...(res.notification || {})
          },
          theme: {
            ...this.settings.theme,
            ...(res.theme || {})
          }
        };
      } catch (error) {
        uni.showToast({ title: error.message || '加载设置失败', icon: 'none' });
      }
    },
    onSwitchChange(key, event) {
      this.settings.notification[key] = Boolean(event.detail.value);
    },
    onThemeChange(key, event) {
      this.settings.theme[key] = Boolean(event.detail.value);
    },
    async saveSettings() {
      this.settingsLoading = true;
      try {
        await this.$api.user.updateSettings(this.settings);
        uni.showToast({ title: '设置已保存', icon: 'success' });
      } catch (error) {
        uni.showToast({ title: error.message || '保存设置失败', icon: 'none' });
      } finally {
        this.settingsLoading = false;
      }
    },
    async changePassword() {
      if (!this.passwordForm.oldPassword || !this.passwordForm.newPassword) {
        uni.showToast({ title: '请填写旧密码和新密码', icon: 'none' });
        return;
      }
      if (this.passwordForm.newPassword.length < 6) {
        uni.showToast({ title: '新密码至少 6 位', icon: 'none' });
        return;
      }
      this.passwordLoading = true;
      try {
        await this.$api.user.changePassword(this.passwordForm);
        this.passwordForm.oldPassword = '';
        this.passwordForm.newPassword = '';
        uni.showToast({ title: '密码修改成功', icon: 'success' });
      } catch (error) {
        uni.showToast({ title: error.message || '密码修改失败', icon: 'none' });
      } finally {
        this.passwordLoading = false;
      }
    },
    clearCache() {
      uni.showModal({
        title: '清除缓存',
        content: '将清除本地登录态和用户缓存，是否继续？',
        success: async (res) => {
          if (!res.confirm) {
            return;
          }
          await clearSession();
          uni.showToast({ title: '缓存已清除', icon: 'success' });
          setTimeout(() => {
            uni.navigateTo({ url: '/pages/login/login' });
          }, 300);
        }
      });
    },
    aboutUs() {
      uni.showModal({
        title: '关于我们',
        content: '活达校园平台\n统一学生与后台管理的数据流示例工程',
        showCancel: false
      });
    },
    feedback() {
      uni.showModal({
        title: '意见反馈',
        content: '反馈入口暂未接入，可继续扩展为表单提交或工单系统。',
        showCancel: false
      });
    }
  }
};
</script>

<style scoped>
.section-card {
  padding: 28rpx 24rpx;
}

.section-card + .section-card {
  margin-top: 28rpx;
}

.field-block + .field-block,
.save-wrap {
  margin-top: 22rpx;
}

.field-label {
  display: block;
  margin-bottom: 14rpx;
  font-size: 28rpx;
  font-weight: 700;
  color: var(--text-main);
}

.field-panel {
  background: #f6f7fb;
  border-radius: 24rpx;
  padding: 0 24rpx;
}

.field-input {
  width: 100%;
  height: 88rpx;
  font-size: 28rpx;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 24rpx;
  padding: 22rpx 0;
}

.setting-item + .setting-item {
  border-top: 1rpx solid #eef1f7;
}

.setting-main {
  flex: 1;
}

.setting-text {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--text-main);
}

.setting-desc {
  margin-top: 8rpx;
  font-size: 24rpx;
  line-height: 1.6;
  color: var(--text-sub);
}

.arrow {
  font-size: 36rpx;
  color: var(--text-light);
}
</style>
