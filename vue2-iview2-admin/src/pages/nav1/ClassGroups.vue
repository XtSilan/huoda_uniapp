<template>
  <div>
    <Button type="primary" @click="openCreate" style="margin-bottom: 12px;">新增班级</Button>
    <Table border :columns="columns" :data="groups"></Table>

    <Modal v-model="visible" :title="editingId ? '班级群配置' : '新增班级'" width="900" :mask-closable="false" @on-ok="submit">
      <Input v-model="form.className" placeholder="班级名称" style="margin-bottom: 10px;" />
      <Input v-model="form.groupName" placeholder="群名称" style="margin-bottom: 10px;" />
      <Input v-model="form.announcement" type="textarea" :rows="4" placeholder="群公告" style="margin-bottom: 10px;" />

      <div style="margin-bottom: 10px;">
        <div style="margin-bottom: 8px; color: #666;">二维码图片</div>
        <input ref="qrInput" type="file" accept="image/*" @change="handleQrChange" />
        <div v-if="form.qrCode" style="margin-top: 10px;">
          <img :src="fullQrCodeUrl(form.qrCode)" alt="二维码" style="width: 140px; height: 140px; object-fit: contain; border: 1px solid #eee; border-radius: 6px;" />
          <div style="margin-top: 6px; color: #999; word-break: break-all;">{{ form.qrCode }}</div>
        </div>
      </div>

      <Input v-model="searchKeyword" placeholder="搜索已注册学生：学号 / 姓名 / 院系" style="margin-bottom: 10px;" />
      <Button size="small" @click="loadStudents" style="margin-bottom: 12px;">查询学生</Button>

      <div style="display: flex; gap: 16px;">
        <div style="flex: 1;">
          <div style="font-weight: 700; margin-bottom: 8px;">班级成员</div>
          <Table border :columns="currentColumns" :data="currentStudents" size="small"></Table>
        </div>
        <div style="flex: 1;">
          <div style="font-weight: 700; margin-bottom: 8px;">可添加学生</div>
          <Table border :columns="candidateColumns" :data="candidates" size="small"></Table>
        </div>
      </div>
    </Modal>
  </div>
</template>

<script>
import {
  getClassGroups,
  createClassGroup,
  updateClassGroup,
  deleteClassGroup,
  getClassGroupStudents,
  addClassGroupStudent,
  removeClassGroupStudent,
  uploadClassGroupQr
} from '../../api';
import { API_BASE_URL } from '../../config/runtime';

export default {
  data() {
    return {
      groups: [],
      visible: false,
      uploading: false,
      editingId: null,
      searchKeyword: '',
      currentStudents: [],
      candidates: [],
      form: {
        className: '',
        groupName: '',
        announcement: '',
        qrCode: '',
        messages: []
      },
      columns: [
        { title: '班级', key: 'className' },
        { title: '群名称', key: 'groupName' },
        { title: '群人数', key: 'memberCount' },
        {
          title: '操作',
          minWidth: 180,
          render: (h, params) => h('div', [
            h('Button', {
              props: { size: 'small' },
              on: { click: () => this.openEdit(params.row) }
            }, '编辑'),
            h('Button', {
              props: { size: 'small', type: 'error' },
              style: { marginLeft: '8px' },
              on: { click: () => this.removeGroup(params.row) }
            }, '删除班级')
          ])
        }
      ]
    };
  },
  computed: {
    currentColumns() {
      return [
        { title: '学号', key: 'studentId' },
        { title: '姓名', key: 'name' },
        {
          title: '操作',
          render: (h, params) => h('Button', {
            props: { size: 'small', type: 'error' },
            on: { click: () => this.removeStudent(params.row) }
          }, '移出')
        }
      ];
    },
    candidateColumns() {
      return [
        { title: '学号', key: 'studentId' },
        { title: '姓名', key: 'name' },
        { title: '院系', key: 'department' },
        { title: '当前班级', key: 'className' },
        {
          title: '操作',
          render: (h, params) => h('Button', {
            props: { size: 'small', type: 'primary' },
            on: { click: () => this.addStudent(params.row) }
          }, '加入本班')
        }
      ];
    }
  },
  mounted() {
    this.loadGroups();
  },
  methods: {
    createEmptyForm() {
      return {
        className: '',
        groupName: '',
        announcement: '',
        qrCode: '',
        messages: []
      };
    },
    fullQrCodeUrl(path) {
      if (!path) return '';
      return path.startsWith('http') ? path : `${API_BASE_URL.replace(/\/api$/, '')}${path}`;
    },
    async loadGroups() {
      const res = await getClassGroups();
      this.groups = res.list || [];
    },
    openCreate() {
      this.editingId = null;
      this.searchKeyword = '';
      this.currentStudents = [];
      this.candidates = [];
      this.form = this.createEmptyForm();
      this.visible = true;
    },
    async openEdit(row) {
      this.editingId = row.id;
      this.form = {
        ...this.createEmptyForm(),
        className: row.className,
        groupName: row.groupName,
        announcement: row.announcement,
        qrCode: row.qrCode,
        messages: row.messages || []
      };
      this.searchKeyword = '';
      this.visible = true;
      await this.loadStudents();
    },
    async loadStudents() {
      if (!this.editingId) {
        return;
      }
      const res = await getClassGroupStudents(this.editingId, this.searchKeyword);
      this.currentStudents = res.currentStudents || [];
      this.candidates = res.candidates || [];
    },
    async addStudent(row) {
      await addClassGroupStudent(this.editingId, row.id);
      this.$Message.success('已加入班级群');
      this.loadStudents();
      this.loadGroups();
    },
    async removeStudent(row) {
      await removeClassGroupStudent(this.editingId, row.id);
      this.$Message.success('已移出班级群');
      this.loadStudents();
      this.loadGroups();
    },
    handleQrChange(event) {
      const file = event.target.files && event.target.files[0];
      if (!file) {
        return;
      }
      const reader = new FileReader();
      reader.onload = async () => {
        this.uploading = true;
        try {
          const res = await uploadClassGroupQr({
            fileName: file.name,
            content: reader.result
          });
          this.form.qrCode = res.path;
          this.$Message.success('二维码上传成功');
        } catch (error) {
          this.$Message.error((error.response && error.response.data && error.response.data.message) || '上传失败');
        } finally {
          this.uploading = false;
          event.target.value = '';
        }
      };
      reader.readAsDataURL(file);
    },
    async submit() {
      if (!this.form.className) {
        this.$Message.warning('请输入班级名称');
        return;
      }
      if (this.editingId) {
        await updateClassGroup(this.editingId, this.form);
        this.$Message.success('班级群已更新');
      } else {
        const res = await createClassGroup(this.form);
        this.$Message.success('班级已创建');
        this.editingId = res && res.data ? res.data.id : null;
      }
      await this.loadGroups();
      if (this.editingId) {
        await this.loadStudents();
      }
    },
    removeGroup(row) {
      this.$Modal.confirm({
        title: '确认删除班级',
        content: `确定删除班级“${row.className}”吗？删除后该班学生的班级信息将被清空。`,
        onOk: async () => {
          await deleteClassGroup(row.id);
          this.$Message.success('班级已删除');
          this.loadGroups();
        }
      });
    }
  }
};
</script>
