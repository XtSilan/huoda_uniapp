<template>
  <div>
    <Alert show-icon style="margin-bottom: 16px;">
      对象存储切换
      <template slot="desc">
        这里统一配置阿里云 OSS，并提供转入 OSS、切回本地两个入口。切换时会同步文件并批量改写数据库中的资源路径，且带二次确认。
      </template>
    </Alert>

    <Card title="当前状态" style="margin-bottom: 16px;">
      <p>
        <Tag :color="settings.provider === 'oss' ? 'green' : 'blue'">
          {{ settings.provider === 'oss' ? '当前使用 OSS' : '当前使用本地存储' }}
        </Tag>
      </p>
      <p style="margin-top: 12px;">Bucket：{{ settings.oss.bucket || '-' }}</p>
      <p style="margin-top: 8px;">Region：{{ settings.oss.region || '-' }}</p>
      <p style="margin-top: 8px;">对象前缀：{{ settings.oss.objectPrefix || '(空)' }}</p>
      <p style="margin-top: 8px;">最后同步：{{ lastSyncText }}</p>
      <p v-if="settings.lastSync && settings.lastSync.message" style="margin-top: 8px; color: #666;">
        {{ settings.lastSync.message }}
      </p>
    </Card>

    <Card title="OSS 配置">
      <Collapse simple>
        <Panel name="guide">
          填写说明
          <div slot="content" class="guide-panel">
            <p><strong>Bucket</strong>：填写你新建完成的 Bucket 名称，例如 `1huoda1`。</p>
            <p><strong>Region</strong>：填写 Bucket 所在地域，推荐直接填 `oss-cn-hangzhou` 这种完整格式。</p>
            <p><strong>AccessKeyId / AccessKeySecret</strong>：建议填写 RAM 用户的密钥，不建议长期使用主账号密钥。</p>
            <p><strong>Endpoint</strong>：一般可以留空，系统会按 Region 使用默认公网 Endpoint。</p>
            <p><strong>对象前缀</strong>：相当于 OSS 里的目录前缀，例如填 `huoda` 后对象会落到 `huoda/uploads/...`。</p>
            <p><strong>HTTPS</strong>：建议开启。</p>
            <p><strong>V4 签名</strong>：建议开启。</p>
            <p><strong>CNAME</strong>：只有 Endpoint 填的是你自己的自定义域名时才勾选。</p>
            <p><strong>权限建议</strong>：RAM 用户至少要有 `PutObject`、`GetObject`、`DeleteObject`、`ListBucket/ListObjects` 权限，才能完整支持测试和切换。</p>
          </div>
        </Panel>
      </Collapse>

      <Form :label-width="130" style="margin-top: 16px;">
        <FormItem label="存储驱动">
          <Tag color="blue">local</Tag>
          <Tag color="green">oss</Tag>
          <span style="margin-left: 8px; color: #666;">
            切换不会直接删除本地文件，但数据库路径和新上传文件的落点会随当前模式变化。
          </span>
        </FormItem>

        <FormItem label="Region">
          <Input v-model="form.oss.region" placeholder="例如：oss-cn-hangzhou 或 cn-hangzhou" />
        </FormItem>

        <FormItem label="Bucket">
          <Input v-model="form.oss.bucket" placeholder="Bucket 名称" />
        </FormItem>

        <FormItem label="AccessKeyId">
          <Input v-model="form.oss.accessKeyId" placeholder="RAM 用户 AccessKeyId" />
        </FormItem>

        <FormItem label="AccessKeySecret">
          <Input v-model="form.oss.accessKeySecret" type="password" placeholder="留空则保留已保存的密钥" />
          <div v-if="settings.oss.accessKeySecretMasked" class="field-hint">
            当前已保存：{{ settings.oss.accessKeySecretMasked }}
          </div>
        </FormItem>

        <FormItem label="Endpoint">
          <Input v-model="form.oss.endpoint" placeholder="可选：外网 Endpoint / 内网 Endpoint / 自定义域名" />
          <div class="field-hint">
            留空时使用 SDK 默认地域 endpoint；如果使用自定义域名，请同时勾选下方 CNAME。
          </div>
        </FormItem>

        <FormItem label="对象前缀">
          <Input v-model="form.oss.objectPrefix" placeholder="例如：huoda" />
          <div class="field-hint">
            最终对象 key 会是：对象前缀 + /uploads/...；留空则直接以 uploads/... 存储。
          </div>
        </FormItem>

        <FormItem label="高级选项">
          <Checkbox v-model="form.oss.secure">启用 HTTPS</Checkbox>
          <Checkbox v-model="form.oss.authorizationV4" style="margin-left: 16px;">启用 V4 签名</Checkbox>
          <Checkbox v-model="form.oss.cname" style="margin-left: 16px;">Endpoint 为 CNAME / 自定义域名</Checkbox>
        </FormItem>

        <FormItem>
          <Button type="primary" :loading="saving" @click="saveSettings">保存配置</Button>
          <Button style="margin-left: 8px;" :loading="validating" @click="validateSettings">测试 OSS</Button>
          <Button style="margin-left: 8px;" @click="loadData">重新加载</Button>
        </FormItem>
      </Form>
    </Card>

    <Card title="切换操作" style="margin-top: 16px;">
      <Alert type="warning" show-icon>
        转入 OSS 会把本地 uploads 文件上传到 OSS，并批量把数据库路径改成 `oss://...`。
        <template slot="desc">
          切回本地会从 OSS 下载资源到 `server/uploads/`，并把数据库路径改回 `/uploads/...`。
        </template>
      </Alert>

      <div style="margin-top: 16px;">
        <Button type="success" :loading="switching === 'oss'" @click="openConfirmDialog('oss')">一键转入 OSS</Button>
        <Button style="margin-left: 8px;" :loading="switching === 'local'" @click="openConfirmDialog('local')">切回本地</Button>
      </div>
    </Card>

    <Modal v-model="confirmDialog.visible" :title="confirmDialog.title" :mask-closable="false">
      <p>{{ confirmDialog.content }}</p>
      <p style="margin-top: 12px; color: #666;">
        请输入 <strong>{{ confirmKeyword }}</strong> 进行二次确认。
      </p>
      <Input
        v-model="confirmDialog.input"
        style="margin-top: 12px;"
        :placeholder="`请输入：${confirmKeyword}`"
        @on-enter="submitSwitchConfirm"
      />
      <div slot="footer">
        <Button @click="resetConfirmDialog">取消</Button>
        <Button type="error" :loading="confirmDialog.submitting" @click="submitSwitchConfirm">确认切换</Button>
      </div>
    </Modal>
  </div>
</template>

<script>
import {
  getStorageSettings,
  updateStorageSettings,
  validateStorageSettings,
  switchStorageProvider
} from '../../api';

const CONFIRM_KEYWORD = '我同意';

function createEmptySettings() {
  return {
    provider: 'local',
    oss: {
      region: '',
      bucket: '',
      accessKeyId: '',
      accessKeySecret: '',
      accessKeySecretMasked: '',
      endpoint: '',
      cname: false,
      secure: true,
      authorizationV4: true,
      objectPrefix: 'huoda'
    },
    lastSync: {
      direction: '',
      status: '',
      message: '',
      stats: {},
      at: ''
    }
  };
}

function createEmptyConfirmDialog() {
  return {
    visible: false,
    title: '',
    content: '',
    target: '',
    input: '',
    submitting: false
  };
}

function formatDateTime(value) {
  if (!value) {
    return '暂无';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  const pad = (item) => `${item}`.padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default {
  data() {
    return {
      saving: false,
      validating: false,
      switching: '',
      confirmKeyword: CONFIRM_KEYWORD,
      confirmDialog: createEmptyConfirmDialog(),
      settings: createEmptySettings(),
      form: createEmptySettings()
    };
  },
  computed: {
    lastSyncText() {
      const lastSync = this.settings.lastSync || {};
      if (!lastSync.at) {
        return '暂无记录';
      }
      return `${formatDateTime(lastSync.at)}${lastSync.status ? ` (${lastSync.status})` : ''}`;
    }
  },
  mounted() {
    this.loadData();
  },
  methods: {
    async loadData() {
      const res = await getStorageSettings();
      const next = {
        ...createEmptySettings(),
        ...(res.settings || {}),
        oss: {
          ...createEmptySettings().oss,
          ...((res.settings && res.settings.oss) || {})
        },
        lastSync: {
          ...createEmptySettings().lastSync,
          ...((res.settings && res.settings.lastSync) || {})
        }
      };
      this.settings = next;
      this.form = {
        ...next,
        oss: {
          ...next.oss,
          accessKeySecret: ''
        }
      };
    },
    async saveSettings() {
      this.saving = true;
      try {
        const res = await updateStorageSettings({
          provider: this.settings.provider,
          oss: { ...this.form.oss }
        });
        this.$Message.success('存储配置已保存');
        this.settings = {
          ...this.settings,
          ...(res.settings || {})
        };
        await this.loadData();
      } catch (error) {
        this.$Message.error((error.response && error.response.data && error.response.data.message) || '保存失败');
      } finally {
        this.saving = false;
      }
    },
    async validateSettings() {
      this.validating = true;
      try {
        const res = await validateStorageSettings({
          provider: 'oss',
          oss: { ...this.form.oss }
        });
        const result = res.result || {};
        this.$Modal.success({
          title: 'OSS 测试通过',
          content: `Bucket：${result.bucket || '-'}<br>Region：${result.region || '-'}<br>测试对象：${result.sampleObject || '-'}`
        });
      } catch (error) {
        this.$Message.error((error.response && error.response.data && error.response.data.message) || '测试失败');
      } finally {
        this.validating = false;
      }
    },
    openConfirmDialog(target) {
      const title = target === 'oss' ? '确认转入 OSS' : '确认切回本地';
      const content = target === 'oss'
        ? '即将把本地 uploads 文件上传到 OSS，并批量把数据库路径改成 oss://...。'
        : '即将从 OSS 下载资源到本地，并批量把数据库路径改回 /uploads/...。';

      this.confirmDialog = {
        visible: true,
        title,
        content,
        target,
        input: '',
        submitting: false
      };
    },
    resetConfirmDialog() {
      if (this.confirmDialog.submitting) {
        return;
      }
      this.confirmDialog = createEmptyConfirmDialog();
    },
    async submitSwitchConfirm() {
      if (this.confirmDialog.submitting) {
        return;
      }
      const confirmText = String(this.confirmDialog.input || '').trim();
      if (confirmText !== this.confirmKeyword) {
        this.$Message.error(`请输入“${this.confirmKeyword}”后再执行切换`);
        return;
      }

      this.confirmDialog.submitting = true;
      const switched = await this.switchProvider(this.confirmDialog.target, confirmText);
      if (switched) {
        this.confirmDialog = createEmptyConfirmDialog();
      } else {
        this.confirmDialog.submitting = false;
      }
    },
    async switchProvider(target, confirmText) {
      this.switching = target;
      try {
        const res = await switchStorageProvider({ target, confirmText });
        this.$Message.success(target === 'oss' ? '已切换到 OSS' : '已切回本地');
        this.settings = {
          ...this.settings,
          ...(res.settings || {})
        };
        await this.loadData();
        return true;
      } catch (error) {
        this.$Message.error((error.response && error.response.data && error.response.data.message) || '切换失败');
        return false;
      } finally {
        this.switching = '';
      }
    }
  }
};
</script>

<style scoped>
.field-hint {
  margin-top: 6px;
  color: #999;
  line-height: 1.7;
}

.guide-panel p {
  margin: 0 0 10px;
  line-height: 1.8;
  color: #555;
}

.guide-panel p:last-child {
  margin-bottom: 0;
}
</style>
