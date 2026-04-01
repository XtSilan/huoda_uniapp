<template>
  <div>
    <Button type="primary" @click="openCreate" style="margin-bottom: 12px;">新增信息</Button>
    <Table border :columns="columns" :data="infos"></Table>
    <Modal v-model="visible" title="信息编辑" :mask-closable="false" @on-ok="submit">
      <Input v-model="form.title" placeholder="标题" style="margin-bottom: 10px;" />
      <Input v-model="form.summary" placeholder="摘要" style="margin-bottom: 10px;" />
      <Input v-model="form.source" placeholder="来源名称，例如：学校官网" style="margin-bottom: 10px;" />
      <Input v-model="form.sourceUrl" placeholder="来源链接，可直接粘贴网址" style="margin-bottom: 10px;" />
      <Select v-model="form.locationType" style="margin-bottom: 10px;">
        <Option value="校内">校内</Option>
        <Option value="校外">校外</Option>
      </Select>
      <Select v-model="form.category" style="margin-bottom: 10px;">
        <Option v-for="item in categories" :key="item" :value="item">{{ item }}</Option>
      </Select>
      <Input v-model="form.content" type="textarea" :rows="8" placeholder="请输入内容，支持换行显示" />
      <div style="margin-top: 12px;">
        <Button :loading="uploading" @click="triggerAttachmentSelect">上传附件</Button>
        <input ref="attachmentInput" type="file" multiple style="display: none;" @change="handleAttachmentChange" />
      </div>
      <div v-if="form.attachments.length" class="attachment-list">
        <div v-for="(item, index) in form.attachments" :key="item.path || index" class="attachment-item">
          <a :href="resolveAttachmentUrl(item.path)" target="_blank" rel="noopener noreferrer">{{ item.name }}</a>
          <Button type="text" @click="removeAttachment(index)">删除</Button>
        </div>
      </div>
    </Modal>
  </div>
</template>

<script>
import { API_BASE_URL } from '../../config/runtime';
import { getInfos, createInfo, updateInfo, deleteInfo, uploadInfoAttachment } from '../../api';

export default {
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
        attachments: []
      },
      columns: [
        { title: '标题', key: 'title' },
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
                  on: { click: () => this.remove(params.row.id) }
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
        attachments: []
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
          const content = await this.readFileAsDataUrl(file);
          const uploaded = await uploadInfoAttachment({
            fileName: file.name,
            size: file.size,
            content
          });
          this.form.attachments = [...this.form.attachments, uploaded];
        }
      } finally {
        this.uploading = false;
        if (event.target) {
          event.target.value = '';
        }
      }
    },
    readFileAsDataUrl(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('附件读取失败'));
        reader.readAsDataURL(file);
      });
    },
    removeAttachment(index) {
      this.form.attachments = this.form.attachments.filter((_, currentIndex) => currentIndex !== index);
    },
    resolveAttachmentUrl(filePath) {
      if (!filePath) {
        return '#';
      }
      return filePath.startsWith('http') ? filePath : `${API_BASE_URL.replace(/\/api$/, '')}${filePath}`;
    },
    async submit() {
      if (this.editingId) {
        await updateInfo(this.editingId, this.form);
      } else {
        await createInfo(this.form);
      }
      await this.loadInfos();
      this.form = this.createEmptyForm();
    },
    async remove(id) {
      await deleteInfo(id);
      await this.loadInfos();
    }
  }
};
</script>

<style scoped>
.attachment-list {
  margin-top: 12px;
  border: 1px solid #e8eaec;
  border-radius: 6px;
  padding: 8px 12px;
}

.attachment-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 6px 0;
}

.attachment-item + .attachment-item {
  border-top: 1px solid #f3f3f3;
}

.attachment-item a {
  color: #2d8cf0;
  text-decoration: none;
  word-break: break-all;
}
</style>
