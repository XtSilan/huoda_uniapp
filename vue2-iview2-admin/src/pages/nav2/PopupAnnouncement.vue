<template>
  <div>
    <Alert show-icon style="margin-bottom: 16px;">
      用户端弹窗通知
      <template slot="desc">
        发布后，app、web、小程序登录用户都会收到一次弹窗。用户点击“我知道了”后，本次发布版本不再重复弹出。
      </template>
    </Alert>

    <Card title="弹窗通知配置">
      <Form :label-width="110">
        <FormItem label="当前状态">
          <Tag :color="form.isActive ? 'green' : 'default'">{{ form.isActive ? '发布中' : '未发布' }}</Tag>
          <span style="margin-left: 12px; color: #666;">{{ form.publishedAt ? `最近发布时间：${form.publishedAt}` : '还没有发布记录' }}</span>
        </FormItem>

        <FormItem label="弹窗标题">
          <Input v-model="form.title" placeholder="例如：重要通知" />
        </FormItem>

        <FormItem label="弹窗内容">
          <Input v-model="form.content" type="textarea" :rows="6" placeholder="支持换行展示" />
        </FormItem>

        <FormItem label="按钮文字">
          <Input v-model="form.buttonText" placeholder="默认：我知道了" />
        </FormItem>

        <FormItem label="顶部图片">
          <div class="upload-row">
            <Button type="primary" :loading="uploading" @click="triggerImageSelect">{{ uploading ? '上传中...' : '上传图片' }}</Button>
            <span class="upload-tip">建议使用竖版或方图，发布后会显示在弹窗顶部</span>
          </div>
          <input
            ref="imageInput"
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
            style="display: none;"
            @change="handleImageChange"
          />
          <Input v-model="form.imageUrl" style="margin-top: 12px;" placeholder="也可以直接填写图片地址" />
          <div v-if="previewImage" class="preview-panel">
            <img :src="previewImage" alt="preview" class="preview-image">
          </div>
        </FormItem>

        <FormItem>
          <Button type="primary" :loading="saving" @click="submit">发布弹窗</Button>
          <Button style="margin-left: 8px;" :loading="disabling" @click="deactivate">关闭弹窗</Button>
          <Button style="margin-left: 8px;" @click="loadData">重新加载</Button>
        </FormItem>
      </Form>
    </Card>
  </div>
</template>

<script>
import { API_BASE_URL } from '../../config/runtime';
import {
  deactivatePopupAnnouncement,
  getPopupAnnouncement,
  updatePopupAnnouncement,
  uploadPopupAnnouncementImage
} from '../../api';

function createEmptyForm() {
  return {
    id: '',
    title: '',
    content: '',
    imageUrl: '',
    buttonText: '我知道了',
    isActive: false,
    publishedAt: ''
  };
}

export default {
  data() {
    return {
      saving: false,
      disabling: false,
      uploading: false,
      form: createEmptyForm()
    };
  },
  computed: {
    previewImage() {
      if (!this.form.imageUrl) {
        return '';
      }
      if (/^https?:\/\//i.test(this.form.imageUrl)) {
        return this.form.imageUrl;
      }
      return `${API_BASE_URL.replace(/\/api$/, '')}${this.form.imageUrl.startsWith('/') ? this.form.imageUrl : `/${this.form.imageUrl}`}`;
    }
  },
  mounted() {
    this.loadData();
  },
  methods: {
    async loadData() {
      const res = await getPopupAnnouncement();
      this.form = {
        ...createEmptyForm(),
        ...(res.announcement || {})
      };
    },
    triggerImageSelect() {
      if (this.$refs.imageInput) {
        this.$refs.imageInput.click();
      }
    },
    async handleImageChange(event) {
      const file = event.target && event.target.files && event.target.files[0];
      if (!file) {
        return;
      }

      if (!/^image\//i.test(file.type || '')) {
        this.$Message.warning('请选择图片文件');
        event.target.value = '';
        return;
      }

      this.uploading = true;
      try {
        const content = await this.readFile(file);
        const uploaded = await uploadPopupAnnouncementImage({
          fileName: file.name,
          content
        });
        this.form.imageUrl = uploaded.path || '';
        this.$Message.success('图片上传成功');
      } catch (error) {
        this.$Message.error((error.response && error.response.data && error.response.data.message) || '图片上传失败');
      } finally {
        this.uploading = false;
        if (event.target) {
          event.target.value = '';
        }
      }
    },
    readFile(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('读取图片失败'));
        reader.readAsDataURL(file);
      });
    },
    async submit() {
      if (!String(this.form.title || '').trim()) {
        this.$Message.warning('请填写弹窗标题');
        return;
      }
      if (!String(this.form.content || '').trim()) {
        this.$Message.warning('请填写弹窗内容');
        return;
      }

      this.saving = true;
      try {
        const res = await updatePopupAnnouncement({
          ...this.form,
          isActive: true
        });
        this.form = {
          ...createEmptyForm(),
          ...(res.announcement || {})
        };
        this.$Message.success('弹窗通知已发布');
      } catch (error) {
        this.$Message.error((error.response && error.response.data && error.response.data.message) || '发布失败');
      } finally {
        this.saving = false;
      }
    },
    async deactivate() {
      this.disabling = true;
      try {
        const res = await deactivatePopupAnnouncement();
        this.form = {
          ...createEmptyForm(),
          ...(res.announcement || createEmptyForm())
        };
        this.$Message.success('弹窗已关闭');
      } catch (error) {
        this.$Message.error((error.response && error.response.data && error.response.data.message) || '关闭失败');
      } finally {
        this.disabling = false;
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

.preview-panel {
  margin-top: 12px;
  padding: 12px;
  background: #f8fafc;
  border-radius: 6px;
}

.preview-image {
  display: block;
  max-width: 260px;
  width: 100%;
  border-radius: 12px;
}
</style>
