<template>
  <div>
    <Alert show-icon style="margin-bottom: 16px;">
      Android 更新在这里一次提交就行。
      <template slot="desc">
        只保留 Android 发布入口。版本号会自动读取 App 的 manifest 配置，选择更新方式后填写下载地址再提交即可。Web 和小程序不会展示这个入口。
      </template>
    </Alert>

    <Card title="Android 更新发布">
      <Form :label-width="110">
        <FormItem label="最新版本号">
          <Input :value="form.latestVersion" readonly />
        </FormItem>
        <FormItem label="版本号 Code">
          <InputNumber :min="1" :value="form.versionCode" readonly></InputNumber>
        </FormItem>
        <FormItem label="更新方式">
          <RadioGroup v-model="form.updateType">
            <Radio label="wgt">WGT 热更新</Radio>
            <Radio label="apk">APK 整包更新</Radio>
            <Radio label="none">关闭更新</Radio>
          </RadioGroup>
        </FormItem>
        <FormItem label="强制更新">
          <i-switch v-model="form.force" :disabled="form.updateType === 'none'"></i-switch>
        </FormItem>
        <FormItem label="弹窗标题">
          <Input v-model="form.title" placeholder="例如 发现新版本" />
        </FormItem>
        <FormItem label="更新说明">
          <Input v-model="form.description" type="textarea" :rows="5" placeholder="填写本次更新内容" />
        </FormItem>
        <FormItem v-if="form.updateType === 'wgt'" label="WGT 地址">
          <Input v-model="form.wgtUrl" placeholder="https://example.com/app/update.wgt" />
        </FormItem>
        <FormItem v-if="form.updateType === 'apk'" label="APK 地址">
          <Input v-model="form.apkUrl" placeholder="https://example.com/app/update.apk" />
        </FormItem>
        <FormItem>
          <Button type="primary" :loading="saving" @click="submitUpdate">提交更新</Button>
          <Button style="margin-left: 8px;" @click="loadData">重新加载</Button>
        </FormItem>
      </Form>

      <div class="hint-panel">
        <Tag color="blue">当前平台：Android</Tag>
        <Tag color="green">当前方式：{{ updateTypeText }}</Tag>
        <p class="hint-text">`wgt` 只更新前端资源；改了原生插件、SDK、权限、启动图、底层依赖时，要发 `apk` 整包。</p>
      </div>
    </Card>
  </div>
</template>

<script>
import { getAppUpdates, updateAppUpdate } from '../../api';
import { versionName as manifestVersionName, versionCode as manifestVersionCode } from '../../../../manifest.json';

function createEmptyConfig() {
  return {
    latestVersion: manifestVersionName || '1.0.0',
    versionCode: Number(manifestVersionCode || 1) || 1,
    updateType: 'wgt',
    force: false,
    title: '活达 Android 更新',
    description: '当前已是最新版本。',
    wgtUrl: '',
    apkUrl: '',
    publishedAt: ''
  };
}

export default {
  data() {
    return {
      saving: false,
      form: createEmptyConfig()
    };
  },
  computed: {
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
    async loadData() {
      const res = await getAppUpdates();
      this.form = {
        ...createEmptyConfig(),
        ...(res.android || {}),
        latestVersion: manifestVersionName || '1.0.0',
        versionCode: Number(manifestVersionCode || 1) || 1
      };
    },
    async submitUpdate() {
      this.saving = true;
      try {
        const payload = {
          ...this.form,
          latestVersion: manifestVersionName || this.form.latestVersion,
          versionCode: Number(manifestVersionCode || this.form.versionCode) || this.form.versionCode
        };
        const saved = await updateAppUpdate('android', payload);
        this.form = { ...this.form, ...saved };
        this.$Message.success(this.form.updateType === 'none' ? '已关闭当前更新' : '更新已提交');
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
