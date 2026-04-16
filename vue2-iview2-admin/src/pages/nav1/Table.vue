<template>
  <div class="editor-page">
    <Button type="primary" @click="openCreate" style="margin-bottom: 12px;">新增信息</Button>
    <Table border :columns="columns" :data="infos"></Table>
    <Modal v-model="visible" title="信息编辑" :mask-closable="false" :width="1120" class-name="wp-modal" @on-ok="submit">
      <div class="wp-layout">
        <div class="wp-main">
          <div class="wp-panel">
            <div class="panel-title">资讯标题</div>
            <Input v-model="form.title" placeholder="请输入资讯标题" />
          </div>

          <div class="wp-panel">
            <div class="panel-title">资讯摘要（可选）</div>
            <Input v-model="form.summary" type="textarea" :rows="2" placeholder="不填将从正文自动提取摘要" />
          </div>

          <div class="wp-panel">
            <div class="panel-title">正文内容</div>
            <PostEditorPanel
              ref="infoEditor"
              v-model="form.content"
              placeholder="支持标题、加粗、列表、链接、图片上传等编辑能力"
              :upload-image="uploadImageFile"
              :min-height="360"
            />
          </div>
        </div>

        <div class="wp-side">
          <div class="wp-panel">
            <div class="panel-title">发布设置</div>
            <div class="field-stack">
              <Input v-model="form.source" placeholder="来源名称，例如：学校官网" />
              <Input v-model="form.sourceUrl" placeholder="来源链接（可选）" />
              <Select v-model="form.locationType">
                <Option value="校内">校内</Option>
                <Option value="校外">校外</Option>
              </Select>
              <Select v-model="form.category">
                <Option v-for="item in categories" :key="item" :value="item">{{ item }}</Option>
              </Select>
              <Checkbox v-model="form.isTop">置顶资讯</Checkbox>
            </div>
          </div>

          <div class="wp-panel">
            <div class="panel-title">附件管理</div>
            <div class="field-stack">
              <Button :loading="uploading" @click="triggerAttachmentSelect">
                {{ uploading ? '上传中...' : '上传附件/图片' }}
              </Button>
              <input ref="attachmentInput" type="file" multiple style="display: none;" @change="handleAttachmentChange" />
              <div v-if="form.attachments.length" class="attachment-list">
                <div v-for="(item, index) in form.attachments" :key="item.path || index" class="attachment-item">
                  <div class="attachment-item__name">
                    <a :href="resolveAttachmentUrl(item.path)" target="_blank" rel="noopener noreferrer">{{ item.name }}</a>
                    <div class="attachment-item__meta">{{ item.mimeType || '文件' }}</div>
                  </div>
                  <div class="attachment-actions">
                    <Button
                      v-if="isImageAttachment(item)"
                      size="small"
                      @click="insertImageToContent(item)"
                    >
                      插入正文
                    </Button>
                    <Button type="text" @click="removeAttachment(index)">删除</Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  </div>
</template>

<script>
import { getInfos, createInfo, updateInfo, deleteInfo, uploadInfoAttachment } from '../../api';
import { resolveAssetUrl } from '../../common/asset';
import PostEditorPanel from '../../components/PostEditorPanel.vue';

function stripHtml(value) {
  return String(value || '')
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export default {
  components: {
    PostEditorPanel
  },
  data() {
    return {
      infos: [],
      visible: false,
      uploading: false,
      editingId: null,
      categories: ['讲座', '公益', '兼职', '就业', '娱乐', '竞赛', '美食', '其他'],
      form: {
        title: '',
        summary: '',
        source: '',
        sourceUrl: '',
        category: '其他',
        locationType: '校内',
        content: '',
        attachments: [],
        isTop: false
      },
      columns: [
        {
          title: '标题',
          key: 'title',
          render: (h, params) =>
            h('div', [
              params.row.isTop ? h('Tag', { props: { color: 'red' }, style: { marginRight: '6px' } }, '置顶') : null,
              h('span', params.row.title)
            ])
        },
        { title: '分类', key: 'category' },
        { title: '范围', key: 'locationType' },
        { title: '来源', key: 'source' },
        {
          title: '操作',
          render: (h, params) =>
            h('div', [
              h('Button', { props: { size: 'small' }, on: { click: () => this.openEdit(params.row) } }, '编辑'),
              h(
                'Button',
                {
                  props: { size: 'small', type: 'error' },
                  style: { marginLeft: '8px' },
                  on: { click: () => this.remove(params.row) }
                },
                '删除'
              )
            ])
        }
      ]
    };
  },
  mounted() {
    this.loadInfos();
  },
  methods: {
    createEmptyForm() {
      return {
        title: '',
        summary: '',
        source: '',
        sourceUrl: '',
        category: '其他',
        locationType: '校内',
        content: '',
        attachments: [],
        isTop: false
      };
    },
    async loadInfos() {
      const res = await getInfos();
      this.infos = res.list || [];
    },
    openCreate() {
      this.editingId = null;
      this.form = this.createEmptyForm();
      this.visible = true;
    },
    openEdit(row) {
      this.editingId = row.id;
      this.form = {
        ...this.createEmptyForm(),
        ...row,
        attachments: Array.isArray(row.attachments) ? row.attachments : []
      };
      this.visible = true;
    },
    triggerAttachmentSelect() {
      if (this.$refs.attachmentInput) {
        this.$refs.attachmentInput.click();
      }
    },
    async handleAttachmentChange(event) {
      const files = Array.from((event.target && event.target.files) || []);
      if (!files.length) {
        return;
      }
      this.uploading = true;
      try {
        for (const file of files) {
          const data = new FormData();
          data.append('file', file);
          const uploaded = await uploadInfoAttachment(data);
          this.form.attachments = [...this.form.attachments, uploaded];
        }
      } catch (error) {
        this.$Message.error((error.response && error.response.data && error.response.data.message) || '附件上传失败');
      } finally {
        this.uploading = false;
        if (event.target) {
          event.target.value = '';
        }
      }
    },
    uploadImageFile(file) {
      const data = new FormData();
      data.append('file', file);
      return uploadInfoAttachment(data);
    },
    removeAttachment(index) {
      this.form.attachments = this.form.attachments.filter((_, currentIndex) => currentIndex !== index);
    },
    isImageAttachment(item) {
      const mimeType = String(item && item.mimeType ? item.mimeType : '').toLowerCase();
      const path = String(item && item.path ? item.path : '').toLowerCase();
      return mimeType.indexOf('image/') === 0 || /\.(png|jpe?g|gif|webp|bmp|svg)$/.test(path);
    },
    insertImageToContent(item) {
      const imagePath = item && item.path ? item.path : '';
      if (!imagePath || !this.$refs.infoEditor) {
        return;
      }
      this.$refs.infoEditor.insertImage(imagePath);
    },
    resolveAttachmentUrl(filePath) {
      return resolveAssetUrl(filePath) || '#';
    },
    async submit() {
      if (!String(this.form.title || '').trim()) {
        this.$Message.warning('请先填写资讯标题');
        return;
      }
      if (!String(stripHtml(this.form.content)).trim()) {
        this.$Message.warning('请先填写资讯正文');
        return;
      }
      const payload = {
        ...this.form,
        summary: String(this.form.summary || '').trim() || stripHtml(this.form.content).slice(0, 120)
      };
      if (this.editingId) {
        await updateInfo(this.editingId, payload);
      } else {
        await createInfo(payload);
      }
      await this.loadInfos();
      this.form = this.createEmptyForm();
      this.visible = false;
    },
    remove(row) {
      this.$Modal.confirm({
        title: '确认删除信息',
        content: `确定删除信息“${row.title}”吗？该操作不可恢复。`,
        onOk: async () => {
          await deleteInfo(row.id);
          this.$Message.success('信息已删除');
          await this.loadInfos();
        }
      });
    }
  }
};
</script>

<style scoped>
.attachment-list {
  border: 1px solid #e8eaec;
  border-radius: 6px;
  max-height: 280px;
  overflow: auto;
}

.attachment-item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 10px;
}

.attachment-item + .attachment-item {
  border-top: 1px solid #f3f3f3;
}

.attachment-item__name {
  min-width: 0;
  flex: 1;
}

.attachment-item a {
  color: #2d8cf0;
  text-decoration: none;
  word-break: break-all;
}

.attachment-item__meta {
  margin-top: 4px;
  color: #8c8c8c;
  font-size: 12px;
}

.attachment-actions {
  display: flex;
  align-items: center;
}

.wp-layout {
  display: flex;
  gap: 16px;
}

.wp-main {
  flex: 1;
  min-width: 0;
}

.wp-side {
  width: 320px;
  flex: 0 0 320px;
}

.wp-panel {
  background: #fff;
  border: 1px solid #dcdcde;
  border-radius: 4px;
  padding: 12px;
}

.wp-panel + .wp-panel {
  margin-top: 12px;
}

.panel-title {
  font-size: 13px;
  font-weight: 600;
  color: #1d2327;
  margin-bottom: 10px;
}

.field-stack {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
</style>
