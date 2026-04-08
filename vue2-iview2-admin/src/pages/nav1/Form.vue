<template>
  <div class="editor-page">
    <Button type="primary" @click="openCreate" style="margin-bottom: 12px;">新增活动</Button>
    <Table border :columns="columns" :data="activities"></Table>
    <Modal v-model="visible" title="活动编辑" :mask-closable="false" :width="1120" class-name="wp-modal" @on-ok="submit">
      <div class="wp-layout">
        <div class="wp-main">
          <div class="wp-panel">
            <div class="panel-title">活动标题</div>
            <Input v-model="form.title" placeholder="请输入活动标题" />
          </div>

          <div class="wp-panel">
            <div class="panel-title">活动摘要（可选）</div>
            <Input v-model="form.summary" type="textarea" :rows="2" placeholder="不填则自动从正文提取摘要" />
          </div>

          <div class="wp-panel">
            <div class="panel-title">活动正文</div>
            <PostEditorPanel
              ref="activityEditor"
              v-model="form.content"
              placeholder="像 WordPress 一样在这里写正文：可插图、加粗、标题、列表、引用..."
              :upload-image="uploadImageFile"
              :min-height="360"
            />
          </div>
        </div>

        <div class="wp-side">
          <div class="wp-panel">
            <div class="panel-title">发布设置</div>
            <div class="field-stack">
              <Input v-model="form.organizer" placeholder="组织方" />
              <Input v-model="form.location" placeholder="活动地点" />
              <Select v-model="form.locationType">
                <Option value="校内">校内</Option>
                <Option value="校外">校外</Option>
              </Select>
              <Select v-model="form.activityType">
                <Option v-for="item in activityTypes" :key="item" :value="item">{{ item }}</Option>
              </Select>
              <Checkbox v-model="form.isTop">置顶活动</Checkbox>
            </div>
          </div>

          <div class="wp-panel">
            <div class="panel-title">活动时间</div>
            <div class="field-stack">
              <DatePicker
                type="datetime"
                :value="form.startTime"
                format="yyyy-MM-dd HH:mm"
                style="width: 100%;"
                @on-change="handleDateChange('startTime', $event)"
              />
              <DatePicker
                type="datetime"
                :value="form.endTime"
                format="yyyy-MM-dd HH:mm"
                style="width: 100%;"
                @on-change="handleDateChange('endTime', $event)"
              />
            </div>
          </div>

          <div class="wp-panel">
            <div class="panel-title panel-title--row">
              <span>活动图片</span>
              <a href="javascript:;" @click="addImageFromUrl">添加 URL</a>
            </div>
            <div class="field-stack">
              <Button long :loading="uploadingImages" @click="triggerImageSelect">
                {{ uploadingImages ? '上传中...' : '上传图片' }}
              </Button>
              <input ref="imageInput" type="file" accept="image/*" multiple style="display: none;" @change="handleImageChange" />
              <div v-if="form.images.length" class="image-list">
                <div v-for="(item, index) in form.images" :key="`${item}-${index}`" class="image-item">
                  <img :src="resolveImageUrl(item)" alt="" />
                  <div class="image-actions">
                    <Button size="small" @click="insertImageToContent(item)">插入正文</Button>
                    <Button size="small" type="text" @click="removeImage(index)">删除</Button>
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
import {
  getActivities,
  createActivity,
  updateActivity,
  deleteActivity,
  uploadInfoAttachment
} from '../../api';
import { resolveAssetUrl } from '../../common/asset';
import PostEditorPanel from '../../components/PostEditorPanel.vue';

function pad(value) {
  return `${value}`.padStart(2, '0');
}

function formatDateTime(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toApiDateTime(value) {
  return String(value || '').trim().replace(' ', 'T') + ':00';
}

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
      activities: [],
      visible: false,
      editingId: null,
      uploadingImages: false,
      activityTypes: ['讲座', '公益', '兼职', '就业', '娱乐', '竞赛', '美食', '其他', '运动'],
      form: this.createEmptyForm(),
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
        { title: '类型', key: 'activityType' },
        { title: '地点', key: 'locationType' },
        { title: '组织方', key: 'organizer' },
        { title: '报名人数', key: 'applyCount' },
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
    this.loadActivities();
  },
  methods: {
    createEmptyForm() {
      return {
        title: '',
        summary: '',
        organizer: '',
        location: '',
        activityType: '其他',
        startTime: formatDateTime(new Date()),
        endTime: formatDateTime(new Date(Date.now() + 3600000)),
        content: '',
        locationType: '校内',
        status: 'upcoming',
        images: [],
        isTop: false
      };
    },
    handleDateChange(key, value) {
      this.form[key] = value;
    },
    async loadActivities() {
      const res = await getActivities();
      this.activities = res.list || [];
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
        startTime: formatDateTime(new Date(row.startTime || Date.now())),
        endTime: formatDateTime(new Date(row.endTime || Date.now() + 3600000)),
        images: row.images || []
      };
      this.visible = true;
    },
    async uploadImageFile(file) {
      const data = new FormData();
      data.append('file', file);
      return uploadInfoAttachment(data);
    },
    triggerImageSelect() {
      if (this.$refs.imageInput) {
        this.$refs.imageInput.click();
      }
    },
    async handleImageChange(event) {
      const files = Array.from((event.target && event.target.files) || []);
      if (!files.length) {
        return;
      }
      this.uploadingImages = true;
      try {
        for (const file of files) {
          const uploaded = await this.uploadImageFile(file);
          const nextPath = uploaded && (uploaded.path || uploaded.url || '');
          if (nextPath) {
            this.form.images = [...this.form.images, nextPath];
          }
        }
      } catch (error) {
        this.$Message.error((error.response && error.response.data && error.response.data.message) || '活动图片上传失败');
      } finally {
        this.uploadingImages = false;
        if (event.target) {
          event.target.value = '';
        }
      }
    },
    addImageFromUrl() {
      const url = window.prompt('请输入图片 URL');
      if (!url) {
        return;
      }
      this.form.images = [...this.form.images, url];
    },
    insertImageToContent(imagePath) {
      if (!this.$refs.activityEditor) {
        return;
      }
      this.$refs.activityEditor.insertImage(imagePath);
    },
    removeImage(index) {
      this.form.images = this.form.images.filter((_, currentIndex) => currentIndex !== index);
    },
    resolveImageUrl(value) {
      return resolveAssetUrl(value) || value;
    },
    async submit() {
      if (!String(this.form.title || '').trim()) {
        this.$Message.warning('请先填写活动标题');
        return;
      }
      if (!String(stripHtml(this.form.content)).trim()) {
        this.$Message.warning('请先填写活动正文');
        return;
      }
      const payload = {
        ...this.form,
        summary: String(this.form.summary || '').trim() || stripHtml(this.form.content).slice(0, 120),
        startTime: toApiDateTime(this.form.startTime),
        endTime: toApiDateTime(this.form.endTime),
        images: (this.form.images || []).map((item) => String(item || '').trim()).filter(Boolean)
      };
      if (this.editingId) {
        await updateActivity(this.editingId, payload);
      } else {
        await createActivity(payload);
      }
      await this.loadActivities();
      this.visible = false;
    },
    async remove(id) {
      await deleteActivity(id);
      await this.loadActivities();
    }
  }
};
</script>

<style scoped>
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

.panel-title--row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.panel-title--row a {
  font-weight: 400;
}

.field-stack {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.image-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.image-item {
  border: 1px solid #ececec;
  border-radius: 4px;
  padding: 8px;
}

.image-item img {
  width: 100%;
  height: 130px;
  object-fit: cover;
  border-radius: 4px;
  background: #f6f7f7;
}

.image-actions {
  margin-top: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
</style>
