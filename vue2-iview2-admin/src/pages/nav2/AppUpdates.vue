<template>
  <div>
    <Alert show-icon style="margin-bottom: 16px;">
      Android 更新改成后台上传更新包后再发布。
      <template slot="desc">
        常见的大厂发布后台通常都会把“版本号、更新方式、安装包、更新说明、强制更新、发布时间”放在同一个发布页里，避免只改一条链接却不知道线上到底生效了什么。这里现在也是这套方式。
      </template>
    </Alert>

    <Card title="Android 更新发布">
      <Form :label-width="120">
        <FormItem label="当前版本号">
          <Input :value="currentRelease.latestVersion || '未发布'" readonly />
        </FormItem>
        <FormItem label="当前版本 Code">
          <Input :value="currentRelease.versionCode || '-'" readonly />
        </FormItem>
        <FormItem label="最新版本号">
          <Input v-model="form.latestVersion" :readonly="form.updateType === 'wgt'" :disabled="form.updateType === 'wgt'" placeholder="APK 请手动填写版本号" />
        </FormItem>
        <FormItem label="版本号 Code">
          <InputNumber v-model="form.versionCode" :min="1" :readonly="form.updateType === 'wgt'" :disabled="form.updateType === 'wgt'" placeholder="APK 手动填写"></InputNumber>
        </FormItem>
        <FormItem label="更新方式">
          <RadioGroup v-model="form.updateType" @on-change="handleUpdateTypeChange">
            <Radio label="wgt">WGT 热更新</Radio>
            <Radio label="apk">APK 整包更新</Radio>
            <Radio label="none">关闭更新</Radio>
          </RadioGroup>
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
              {{ uploading ? '上传中...' : `上传${form.updateType.toUpperCase()}文件` }}
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
        <Tag v-if="form.publishedAt" color="gold">发布时间：{{ form.publishedAt }}</Tag>
        <Tag v-if="form.updateType === 'wgt' && form.extractedDir" color="cyan">解压目录：{{ form.extractedDir }}</Tag>
        <Tag v-if="form.updateType === 'wgt' && form.manifestPath" color="cyan">manifest：{{ form.manifestPath }}</Tag>
        <p class="hint-text">WGT 只适合前端资源热更新；只要涉及原生插件、SDK、权限、启动图、打包配置变化，就要发 APK 整包。</p>
        <p class="hint-text">WGT 上传后，后台会自动解压到 `unpackage/release/apk/文件名/`，再读取其中的 manifest 版本信息，不需要手填；APK 版本号和 code 继续由你手动提交。</p>
        <p class="hint-text">如果你重新发了 WGT 但版本号没变，旧逻辑通常会直接判定“没有新版本”。这次改完后，客户端会额外识别每次发布的包标识，不会再只盯着版本号。</p>
      </div>
    </Card>
  </div>
</template>

<script>
import { API_BASE_URL } from '../../config/runtime';
import { getAppUpdates, updateAppUpdate, uploadAppUpdatePackage } from '../../api';

function createEmptyConfig() {
  return {
    latestVersion: '',
    versionCode: 1,
    updateType: 'wgt',
    force: false,
    title: '活达 Android 更新',
    description: '当前已是最新版本。',
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
        return '上传热更新包，适合纯前端资源更新';
      }
      return '关闭更新时无需上传文件';
    },
    packageDownloadUrl() {
      if (!this.form.packagePath) {
        return '';
      }
      return this.form.packagePath.startsWith('http')
        ? this.form.packagePath
        : `${API_BASE_URL.replace(/\/api$/, '')}${this.form.packagePath}`;
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
    createEmptyConfig,
    async loadData() {
      const res = await getAppUpdates();
      this.currentRelease = {
        latestVersion: (res.android && res.android.latestVersion) || '',
        versionCode: Number((res.android && res.android.versionCode) || 0) || 0,
        publishedAt: (res.android && res.android.publishedAt) || ''
      };
      this.form = {
        ...createEmptyConfig(),
        ...(res.android || {})
      };
    },
    handleUpdateTypeChange(nextType) {
      if (nextType === 'none') {
        this.form.packagePath = '';
        this.form.packageName = '';
        this.form.packageSize = 0;
        this.form.releaseId = '';
        this.form.extractedDir = '';
        this.form.manifestPath = '';
        this.form.latestVersion = '';
        this.form.versionCode = 1;
      } else if ((nextType === 'wgt' && this.form.packagePath && !/\.wgt$/i.test(this.form.packageName || '')) || (nextType === 'apk' && this.form.packagePath && !/\.apk$/i.test(this.form.packageName || ''))) {
        this.form.packagePath = '';
        this.form.packageName = '';
        this.form.packageSize = 0;
        this.form.releaseId = '';
        this.form.extractedDir = '';
        this.form.manifestPath = '';
      }
      if (nextType === 'wgt') {
        this.form.latestVersion = '';
        this.form.versionCode = 1;
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
        this.$Message.success(this.form.updateType === 'wgt' ? 'WGT 上传并解压成功，版本已自动提取' : '更新包上传成功');
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
        this.$Message.warning(`请先上传${this.form.updateType.toUpperCase()}更新包`);
        return;
      }

      this.saving = true;
      try {
        const payload = {
          ...this.form,
          latestVersion: this.form.latestVersion,
          versionCode: Number(this.form.versionCode || 0) || 0
        };
        if (!payload.latestVersion || !payload.versionCode) {
          this.$Message.warning(this.form.updateType === 'wgt' ? '未读取到有效的 WGT 版本信息' : '请先填写 APK 版本号和 Code');
          this.saving = false;
          return;
        }
        const saved = await updateAppUpdate('android', payload);
        this.form = {
          ...this.form,
          ...saved
        };
        this.$Message.success(this.form.updateType === 'none' ? '已关闭当前更新' : '更新已发布');
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
