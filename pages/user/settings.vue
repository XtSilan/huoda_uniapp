<template>
  <view class="container">
    <view class="section card">
      <view class="section-title">账户安全</view>
      <view class="form-item">
        <text class="label">旧密码</text>
        <input v-model="passwordForm.oldPassword" class="input" password placeholder="请输入当前密码" />
      </view>
      <view class="form-item">
        <text class="label">新密码</text>
        <input v-model="passwordForm.newPassword" class="input" password placeholder="请输入新密码" />
      </view>
      <button class="primary-btn" :loading="passwordLoading" @click="changePassword">修改密码</button>
    </view>

    <view class="section card">
      <view class="section-title">通知与偏好</view>
      <view class="setting-item">
        <view class="setting-main">
          <view class="setting-text">活动通知</view>
          <view class="setting-desc">接收活动发布和报名提醒</view>
        </view>
        <switch :checked="settings.notification.activity" @change="onSwitchChange('activity', $event)"></switch>
      </view>
      <view class="setting-item">
        <view class="setting-main">
          <view class="setting-text">讲座通知</view>
          <view class="setting-desc">接收讲座和资讯更新</view>
        </view>
        <switch :checked="settings.notification.lecture" @change="onSwitchChange('lecture', $event)"></switch>
      </view>
      <view class="setting-item">
        <view class="setting-main">
          <view class="setting-text">兼职/实践通知</view>
          <view class="setting-desc">接收实践、公益和招聘消息</view>
        </view>
        <switch :checked="settings.notification.partTime" @change="onSwitchChange('partTime', $event)"></switch>
      </view>
      <view class="setting-item">
        <view class="setting-main">
          <view class="setting-text">夜间模式偏好</view>
          <view class="setting-desc">保存你的主题显示偏好</view>
        </view>
        <switch :checked="settings.theme.darkMode" @change="onThemeChange('darkMode', $event)"></switch>
      </view>
      <view class="setting-item">
        <view class="setting-main">
          <view class="setting-text">自动刷新</view>
          <view class="setting-desc">进入首页后自动拉取最新内容</view>
        </view>
        <switch :checked="settings.theme.autoRefresh" @change="onThemeChange('autoRefresh', $event)"></switch>
      </view>
      <button class="primary-btn" :loading="settingsLoading" @click="saveSettings">保存设置</button>
    </view>

    <view class="section card">
      <view class="section-title">其他</view>
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
          <view class="setting-desc">功能建议暂用占位提示</view>
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
        success: (res) => {
          if (!res.confirm) {
            return;
          }
          uni.removeStorageSync('token');
          uni.removeStorageSync('isLoggedIn');
          uni.removeStorageSync('userInfo');
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
        content: '活达校园平台\\n统一学生与后台管理的数据流示例工程',
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
.container {
  min-height: 100vh;
  padding: 16rpx;
  background: #f5f5f5;
}

.section {
  margin-bottom: 24rpx;
}

.section-title {
  margin-bottom: 20rpx;
  font-size: 30rpx;
  font-weight: 700;
}

.form-item {
  margin-bottom: 20rpx;
}

.label {
  display: block;
  margin-bottom: 10rpx;
  font-size: 28rpx;
  font-weight: 600;
}

.input {
  width: 100%;
  padding: 18rpx 20rpx;
  border: 2rpx solid #e5e7eb;
  border-radius: 12rpx;
  background: #fff;
  font-size: 28rpx;
}

.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24rpx;
  padding: 22rpx 0;
  border-bottom: 1rpx solid #ececec;
}

.setting-item:last-child {
  border-bottom: none;
}

.setting-main {
  flex: 1;
}

.setting-text {
  font-size: 28rpx;
  color: #222;
}

.setting-desc {
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #888;
}

.clickable .arrow {
  font-size: 34rpx;
  color: #999;
}

.primary-btn {
  margin-top: 24rpx;
  background: #1e88e5;
  color: #fff;
  border-radius: 12rpx;
  font-size: 30rpx;
}
</style>
