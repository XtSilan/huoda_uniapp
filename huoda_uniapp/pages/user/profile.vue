<template>
  <view class="page-shell form-page">
    <view class="page-header">
      <page-nav fallback="/pages/user/user" :is-tab="true" />
      <view class="page-eyebrow">编辑资料</view>
      <view class="page-title">完善你的校园身份信息</view>
      <view class="page-subtitle">头像、昵称和院系信息统一放进一套更清爽的资料卡里。</view>
    </view>

    <view class="surface-card avatar-card">
      <view class="avatar-card__row">
        <image class="avatar-card__image" :src="avatarPreview" mode="aspectFill"></image>
        <view class="avatar-card__body">
          <view class="avatar-card__title">头像</view>
          <view class="avatar-card__desc">上传成功后会立即同步到“我的”页面，并保存到 uploads/user。</view>
        </view>
      </view>
      <view class="avatar-card__action">
        <custom-button :text="uploadingAvatar ? '上传中...' : '更换头像'" :loading="uploadingAvatar" ghost @click="chooseAvatar" />
      </view>
    </view>

    <view class="form-stack">
      <view v-for="field in fields" :key="field.key" class="surface-card form-card">
        <text class="field-title">{{ field.label }}</text>
        <view class="field-panel" :class="{ 'field-panel--disabled': field.disabled }">
          <input
            class="field-input"
            :value="userInfo[field.key]"
            :placeholder="field.placeholder"
            :disabled="field.disabled"
            @input="onFieldInput(field.key, $event)"
          />
        </view>
      </view>
    </view>

    <view class="submit-wrap">
      <custom-button text="保存信息" :loading="loading" @click="submitForm" />
    </view>
  </view>
</template>

<script>
import { SERVER_ORIGIN } from '../../config/api';

export default {
  data() {
    return {
      loading: false,
      uploadingAvatar: false,
      localAvatarPath: '',
      userInfo: {
        name: '',
        studentId: '',
        school: '',
        department: '',
        class: '',
        phone: '',
        avatarUrl: ''
      }
    };
  },
  computed: {
    avatarPreview() {
      return this.localAvatarPath || this.buildAssetUrl(this.userInfo.avatarUrl) || '/static/avatar.png';
    },
    fields() {
      return [
        { key: 'name', label: '姓名', placeholder: '请输入姓名' },
        { key: 'studentId', label: '学号', placeholder: '学号自动同步', disabled: true },
        { key: 'school', label: '学校', placeholder: '请输入学校名称' },
        { key: 'department', label: '院系', placeholder: '请输入院系' },
        { key: 'class', label: '班级', placeholder: '请输入班级' },
        { key: 'phone', label: '手机号', placeholder: '请输入手机号' }
      ];
    }
  },
  onLoad() {
    this.loadProfile();
  },
  methods: {
    buildAssetUrl(value) {
      if (!value) {
        return '';
      }
      return value.startsWith('http') ? value : `${SERVER_ORIGIN}${value}`;
    },
    onFieldInput(key, event) {
      this.userInfo[key] = event.detail.value;
    },
    async loadProfile() {
      try {
        const profile = await this.$api.user.getProfile();
        this.userInfo = { ...this.userInfo, ...profile };
      } catch (error) {
        const localUser = uni.getStorageSync('userInfo');
        if (localUser) {
          this.userInfo = { ...this.userInfo, ...localUser };
        }
      }
      this.localAvatarPath = uni.getStorageSync('userAvatarLocalPath') || '';
      uni.setStorageSync('userInfo', this.userInfo);
    },
    readLocalImage(filePath) {
      return new Promise((resolve, reject) => {
        if (typeof window !== 'undefined' && typeof FileReader !== 'undefined') {
          fetch(filePath)
            .then((res) => res.blob())
            .then((blob) => {
              const reader = new FileReader();
              reader.onload = () => {
                const fileName = filePath.split('/').pop().split('\\').pop() || `avatar-${Date.now()}.png`;
                resolve({
                  fileName,
                  content: reader.result
                });
              };
              reader.onerror = () => reject(new Error('读取本地图片失败'));
              reader.readAsDataURL(blob);
            })
            .catch(() => reject(new Error('读取本地图片失败')));
          return;
        }

        let fsManager = null;
        if (typeof uni.getFileSystemManager === 'function') {
          fsManager = uni.getFileSystemManager();
        } else if (typeof wx !== 'undefined' && typeof wx.getFileSystemManager === 'function') {
          fsManager = wx.getFileSystemManager();
        }
        if (!fsManager || typeof fsManager.readFile !== 'function') {
          reject(new Error('当前平台暂不支持读取本地图片'));
          return;
        }

        const fileName = filePath.split('/').pop().split('\\').pop() || `avatar-${Date.now()}.png`;
        fsManager.readFile({
          filePath,
          encoding: 'base64',
          success: (res) => {
            const ext = (fileName.split('.').pop() || 'png').toLowerCase();
            const mimeMap = {
              png: 'image/png',
              jpg: 'image/jpeg',
              jpeg: 'image/jpeg',
              webp: 'image/webp',
              gif: 'image/gif'
            };
            const mimeType = mimeMap[ext] || 'image/png';
            resolve({
              fileName,
              content: `data:${mimeType};base64,${res.data}`
            });
          },
          fail: () => reject(new Error('读取本地图片失败'))
        });
      });
    },
    chooseAvatar() {
      if (this.uploadingAvatar) {
        return;
      }

      uni.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        success: async (res) => {
          const filePath = (res.tempFilePaths || [])[0];
          if (!filePath) {
            return;
          }

          this.uploadingAvatar = true;
          this.localAvatarPath = filePath;
          uni.setStorageSync('userAvatarLocalPath', filePath);

          try {
            const payload = await this.readLocalImage(filePath);
            const uploadRes = await this.$api.user.uploadAvatar(payload);
            this.userInfo.avatarUrl = uploadRes.path || '';
            const saved = await this.$api.user.updateProfile(this.userInfo);
            this.userInfo = { ...this.userInfo, ...saved };
            uni.setStorageSync('userInfo', this.userInfo);
            uni.$emit('userInfoUpdated', this.userInfo);
            uni.showToast({ title: '头像上传成功', icon: 'success' });
          } catch (error) {
            uni.showToast({ title: error.message || '头像上传失败', icon: 'none' });
          } finally {
            this.uploadingAvatar = false;
          }
        }
      });
    },
    async submitForm() {
      if (!this.userInfo.name || !this.userInfo.school || !this.userInfo.department || !this.userInfo.class) {
        uni.showToast({ title: '请把资料填写完整', icon: 'none' });
        return;
      }

      this.loading = true;
      try {
        const res = await this.$api.user.updateProfile(this.userInfo);
        this.userInfo = { ...this.userInfo, ...res };
        uni.setStorageSync('userInfo', this.userInfo);
        uni.$emit('userInfoUpdated', this.userInfo);
        uni.showToast({ title: '保存成功', icon: 'success' });
        setTimeout(() => {
          uni.navigateBack();
        }, 300);
      } catch (error) {
        uni.showToast({ title: error.message || '保存失败', icon: 'none' });
      } finally {
        this.loading = false;
      }
    }
  }
};
</script>

<style scoped>
.form-page {
  padding-bottom: calc(150rpx + env(safe-area-inset-bottom));
}

.avatar-card {
  padding: 28rpx 24rpx;
  margin-bottom: 24rpx;
}

.avatar-card__row {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.avatar-card__image {
  width: 132rpx;
  height: 132rpx;
  border-radius: 38rpx;
  background: #eef2f8;
  flex-shrink: 0;
}

.avatar-card__body {
  flex: 1;
}

.avatar-card__title {
  font-size: 32rpx;
  font-weight: 700;
  color: var(--text-main);
}

.avatar-card__desc {
  margin-top: 10rpx;
  font-size: 24rpx;
  line-height: 1.6;
  color: var(--text-sub);
}

.avatar-card__action {
  margin-top: 22rpx;
}

.form-stack {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.form-card {
  padding: 28rpx 24rpx;
}

.field-title {
  display: block;
  margin-bottom: 16rpx;
  font-size: 30rpx;
  font-weight: 700;
  color: var(--text-main);
}

.field-panel {
  background: #f6f7fb;
  border-radius: 24rpx;
  padding: 0 24rpx;
}

.field-panel--disabled {
  opacity: 0.72;
}

.field-input {
  width: 100%;
  height: 88rpx;
  font-size: 28rpx;
  color: var(--text-main);
}

.submit-wrap {
  position: fixed;
  left: 40rpx;
  right: 40rpx;
  bottom: calc(28rpx + env(safe-area-inset-bottom));
}
</style>
