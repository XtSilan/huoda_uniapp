<template>
  <div>
    <Alert show-icon style="margin-bottom: 16px;">
      版本更新管理
    </Alert>

    <Card title="Android 更新发布">
      <Form :label-width="120">
        <FormItem label="当前版本号">
          <Input :value="currentRelease.latestVersion || '未发布'" readonly />
        </FormItem>
        <FormItem label="当前版本 Code">
          <Input :value="currentRelease.versionCode || '-'" readonly />
        </FormItem>
        <FormItem label="当前发布时间">
          <Input :value="currentRelease.publishedAt ? formatDateTime(currentRelease.publishedAt) : '未发布'" readonly />
        </FormItem>

        <FormItem label="更新方式">
          <RadioGroup v-model="form.updateType" @on-change="handleUpdateTypeChange">
            <Radio label="wgt">WGT 热更新</Radio>
            <Radio label="apk">APK 整包更新</Radio>
            <Radio label="none">关闭更新</Radio>
          </RadioGroup>
        </FormItem>

        <FormItem label="最新版本号">
          <Input
            v-model="form.latestVersion"
            :readonly="form.updateType === 'wgt'"
            :disabled="form.updateType === 'wgt' || form.updateType === 'none'"
            :placeholder="form.updateType === 'apk' ? 'APK 请手动填写版本号' : '上传 WGT 后自动读取'"
          />
        </FormItem>
        <FormItem label="版本 Code">
          <InputNumber
            v-model="form.versionCode"
            :min="0"
            :readonly="form.updateType === 'wgt'"
            :disabled="form.updateType === 'wgt' || form.updateType === 'none'"
            :placeholder="form.updateType === 'apk' ? 'APK 请手动填写' : '上传 WGT 后自动读取'"
          />
        </FormItem>

        <FormItem label="强制更新">
          <i-switch v-model="form.force" :disabled="form.updateType === 'none'"></i-switch>
        </FormItem>
        <FormItem label="弹窗标题">
          <Input v-model="form.title" placeholder="例如：发现新版本" />
        </FormItem>
        <FormItem label="更新说明">
          <Input v-model="form.description" type="textarea" :rows="5" placeholder="填写本次更新内容" />
        </FormItem>

        <FormItem v-if="showPackageUpload" label="更新包上传">
          <div class="upload-row">
            <Button type="primary" :loading="uploading" @click="triggerPackageSelect">
              {{ uploading ? '上传中...' : `上传 ${form.updateType.toUpperCase()} 文件` }}
            </Button>
            <span class="upload-tip">{{ packageTip }}</span>
          </div>
          <input
            ref="packageInput"
            type="file"
            :accept="packageAccept"
            style="display: none;"
            @change="handlePackageChange"
          />

          <div v-if="form.packagePath" class="package-panel">
            <div class="package-item">
              <span class="package-label">当前文件</span>
              <span class="package-value">{{ form.packageName || '未命名文件' }}</span>
            </div>
            <div class="package-item">
              <span class="package-label">文件大小</span>
              <span class="package-value">{{ formatFileSize(form.packageSize) }}</span>
            </div>
            <div class="package-item">
              <span class="package-label">下载地址</span>
              <a :href="packageDownloadUrl" target="_blank" rel="noopener noreferrer">{{ packageDownloadUrl }}</a>
            </div>
            <div class="package-item">
              <span class="package-label">发布时间</span>
              <span class="package-value">{{ form.publishedAt ? formatDateTime(form.publishedAt) : '待发布' }}</span>
            </div>
            <div class="package-item">
              <span class="package-label">发布标识</span>
              <span class="package-value">{{ form.releaseId || '-' }}</span>
            </div>
          </div>
        </FormItem>

        <FormItem>
          <Button type="primary" :loading="saving" @click="submitUpdate">提交发布</Button>
          <Button style="margin-left: 8px;" @click="loadData">重新加载</Button>
        </FormItem>
      </Form>

      <div class="hint-panel">
        <Tag color="blue">当前平台：Android</Tag>
        <Tag color="green">当前方式：{{ updateTypeText }}</Tag>
        <Tag v-if="form.publishedAt" color="gold">发布时间：{{ formatDateTime(form.publishedAt) }}</Tag>
        <Tag v-if="form.updateType === 'wgt' && form.extractedDir" color="cyan">解压目录：{{ form.extractedDir }}</Tag>
        <Tag v-if="form.updateType === 'wgt' && form.manifestPath" color="cyan">manifest：{{ form.manifestPath }}</Tag>
        <p class="hint-text">WGT 适合前端资源热更新；涉及原生插件、权限、SDK、启动图或打包配置变更时，请改用 APK 整包更新。</p>
        <p class="hint-text">WGT 上传后，后台会自动解压并读取版本信息，不需要再手填时间和版本元数据。</p>
        <p class="hint-text">APK 上传后，版本号和版本 code 仍需要你手动确认，但发布时间会在发布时自动生成。</p>
      </div>
    </Card>
  </div>
</template>

<script>
import { getAppUpdates, updateAppUpdate, uploadAppUpdatePackage } from '../../api';
import { resolveAssetUrl } from '../../common/asset';

function createEmptyConfig() {
  return {
    latestVersion: '',
    versionCode: 0,
    updateType: 'wgt',
    force: false,
    title: '活达 Android 更新',
    description: '检测到新版本，请尽快更新。',
    wgtUrl: '',
    apkUrl: '',
    packagePath: '',
    packageName: '',
    packageSize: 0,
    releaseId: '',
    extractedDir: '',
    manifestPath: '',
    marketUrl: '',
    publishedAt: ''
  };
}

function pad(value) {
  return `${value}`.padStart(2, '0');
}

function formatDateTime(value) {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default {
  data() {
    return {
      saving: false,
      uploading: false,
      currentRelease: {
        latestVersion: '',
        versionCode: 0,
        publishedAt: ''
      },
      form: createEmptyConfig()
    };
  },
  computed: {
    showPackageUpload() {
      return this.form.updateType === 'wgt' || this.form.updateType === 'apk';
    },
    packageAccept() {
      return this.form.updateType === 'apk' ? '.apk' : '.wgt';
    },
    packageTip() {
      if (this.form.updateType === 'apk') {
        return '上传整包安装文件，适合原生能力变更';
      }
      if (this.form.updateType === 'wgt') {
        return '上传热更新包，版本信息会自动读取';
      }
      return '关闭更新时无需上传文件';
    },
    packageDownloadUrl() {
      if (!this.form.packagePath) {
        return '';
      }
      return resolveAssetUrl(this.form.packagePath);
    },
    updateTypeText() {
      const map = {
        wgt: 'WGT 热更新',
        apk: 'APK 整包更新',
        none: '关闭更新'
      };
      return map[this.form.updateType] || '未设置';
    }
  },
  mounted() {
    this.loadData();
  },
  methods: {
    formatDateTime,
    async loadData() {
      const res = await getAppUpdates();
      const android = res.android || {};
      this.currentRelease = {
        latestVersion: android.latestVersion || '',
        versionCode: Number(android.versionCode || 0) || 0,
        publishedAt: android.publishedAt || ''
      };
      this.form = {
        ...createEmptyConfig(),
        ...android
      };
    },
    handleUpdateTypeChange(nextType) {
      if (nextType === 'none') {
        this.form = {
          ...this.form,
          packagePath: '',
          packageName: '',
          packageSize: 0,
          releaseId: '',
          extractedDir: '',
          manifestPath: '',
          latestVersion: '',
          versionCode: 0
        };
        return;
      }

      if (nextType === 'wgt') {
        this.form = {
          ...this.form,
          latestVersion: '',
          versionCode: 0
        };
      }

      const hasWrongFile =
        (nextType === 'wgt' && this.form.packagePath && !/\.wgt$/i.test(this.form.packageName || '')) ||
        (nextType === 'apk' && this.form.packagePath && !/\.apk$/i.test(this.form.packageName || ''));

      if (hasWrongFile) {
        this.form = {
          ...this.form,
          packagePath: '',
          packageName: '',
          packageSize: 0,
          releaseId: '',
          extractedDir: '',
          manifestPath: ''
        };
      }
    },
    triggerPackageSelect() {
      if (this.$refs.packageInput) {
        this.$refs.packageInput.click();
      }
    },
    async handlePackageChange(event) {
      const file = event.target && event.target.files && event.target.files[0];
      if (!file) {
        return;
      }

      const suffix = this.form.updateType === 'apk' ? '.apk' : '.wgt';
      if (!file.name.toLowerCase().endsWith(suffix)) {
        this.$Message.warning(`请上传 ${suffix} 文件`);
        event.target.value = '';
        return;
      }

      const data = new FormData();
      data.append('file', file);
      data.append('updateType', this.form.updateType);

      this.uploading = true;
      try {
        const uploaded = await uploadAppUpdatePackage(data);
        this.form = {
          ...this.form,
          ...uploaded
        };
        this.$Message.success(this.form.updateType === 'wgt' ? 'WGT 上传并读取版本成功' : '更新包上传成功');
      } catch (error) {
        this.$Message.error((error.response && error.response.data && error.response.data.message) || '更新包上传失败');
      } finally {
        this.uploading = false;
        if (event.target) {
          event.target.value = '';
        }
      }
    },
    formatFileSize(size) {
      const value = Number(size || 0);
      if (!value) {
        return '0 B';
      }
      if (value < 1024) {
        return `${value} B`;
      }
      if (value < 1024 * 1024) {
        return `${(value / 1024).toFixed(1)} KB`;
      }
      return `${(value / (1024 * 1024)).toFixed(2)} MB`;
    },
    async submitUpdate() {
      if (this.showPackageUpload && !this.form.packagePath) {
        this.$Message.warning(`请先上传 ${this.form.updateType.toUpperCase()} 更新包`);
        return;
      }

      const payload = {
        ...this.form,
        latestVersion: String(this.form.latestVersion || '').trim(),
        versionCode: Number(this.form.versionCode || 0) || 0
      };

      if (payload.updateType === 'wgt' && (!payload.latestVersion || !payload.versionCode)) {
        this.$Message.warning('WGT 版本信息未读取成功，请重新上传 WGT 包');
        return;
      }
      if (payload.updateType === 'apk' && (!payload.latestVersion || !payload.versionCode)) {
        this.$Message.warning('请先填写 APK 版本号和版本 Code');
        return;
      }

      this.saving = true;
      try {
        const saved = await updateAppUpdate('android', payload);
        this.form = {
          ...this.form,
          ...saved
        };
        this.currentRelease = {
          latestVersion: saved.latestVersion || '',
          versionCode: Number(saved.versionCode || 0) || 0,
          publishedAt: saved.publishedAt || ''
        };
        this.$Message.success(saved.updateType === 'none' ? '已关闭更新' : '更新已发布');
      } catch (error) {
        this.$Message.error((error.response && error.response.data && error.response.data.message) || '提交失败');
      } finally {
        this.saving = false;
      }
    }
  }
};
</script>

<style scoped>
.upload-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.upload-tip {
  color: #666;
}

.package-panel {
  margin-top: 12px;
  padding: 12px 14px;
  background: #f8fafc;
  border-radius: 6px;
}

.package-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  line-height: 1.8;
}

.package-item + .package-item {
  margin-top: 6px;
}

.package-label {
  width: 72px;
  flex: 0 0 auto;
  color: #666;
}

.package-value {
  color: #17233d;
  word-break: break-all;
}

.package-panel a {
  color: #2d8cf0;
  word-break: break-all;
}

.hint-panel {
  margin-top: 8px;
  padding: 12px 14px;
  background: #f8fafc;
  border-radius: 6px;
}

.hint-text {
  margin-top: 10px;
  color: #666;
  line-height: 1.8;
}
</style>
