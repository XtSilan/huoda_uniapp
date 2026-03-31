<template>
  <div>
    <Table border :columns="columns" :data="groups"></Table>
    <Modal v-model="visible" title="班级群配置" @on-ok="submit">
      <Input v-model="form.className" placeholder="班级名称" style="margin-bottom: 10px;" />
      <Input v-model="form.groupName" placeholder="群名称" style="margin-bottom: 10px;" />
      <Input v-model="form.announcement" placeholder="群公告" style="margin-bottom: 10px;" />

      <div style="margin-bottom: 10px;">
        <Button type="primary" @click="triggerUpload">上传二维码</Button>
        <input ref="fileInput" type="file" accept="image/*" style="display: none;" @change="handleFileChange" />
      </div>
      <div v-if="form.qrCode" style="margin-bottom: 10px;">
        <img :src="normalizeQrCode(form.qrCode)" alt="qr" style="width: 180px; height: 180px; object-fit: cover; border: 1px solid #eee;" />
      </div>

      <div style="margin: 12px 0 8px; font-weight: bold;">当前群成员：{{ selectedMembers.length }} 人</div>
      <Table border :columns="memberColumns" :data="selectedMembers" size="small"></Table>

      <div style="margin: 12px 0 8px; font-weight: bold;">手动添加已有学生</div>
      <Select v-model="selectedUserId" filterable placeholder="选择学生后会自动归入当前班级">
        <Option v-for="item in availableUsers" :key="item.id" :value="item.id">{{ item.studentId }} - {{ item.name }} - {{ item.class || '未分班' }}</Option>
      </Select>
      <Button style="margin-top: 10px;" @click="assignUser">添加到该班级</Button>
    </Modal>
  </div>
</template>

<script>
import { getClassGroups, updateClassGroup, getUsers, assignUserToClassGroup, uploadImage } from '../../api';

const API_BASE_URL = 'http://localhost:3000';

export default {
  data() {
    return {
      groups: [],
      users: [],
      visible: false,
      editingId: null,
      selectedUserId: null,
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
          render: (h, params) => h('Button', {
            props: { size: 'small' },
            on: { click: () => this.openEdit(params.row) }
          }, '编辑')
        }
      ],
      memberColumns: [
        { title: '学号', key: 'studentId' },
        { title: '姓名', key: 'name' },
        { title: '院系', key: 'department' }
      ]
    };
  },
  computed: {
    selectedMembers() {
      const current = this.groups.find((item) => item.id === this.editingId);
      return current ? current.classmates || [] : [];
    },
    availableUsers() {
      return this.users.filter((item) => item.role === 'user');
    }
  },
  mounted() {
    this.loadData();
  },
  methods: {
    async loadData() {
      const [groupRes, userRes] = await Promise.all([getClassGroups(), getUsers()]);
      this.groups = groupRes.list || [];
      this.users = userRes.list || [];
    },
    openEdit(row) {
      this.editingId = row.id;
      this.selectedUserId = null;
      this.form = {
        className: row.className,
        groupName: row.groupName,
        announcement: row.announcement,
        qrCode: row.qrCode,
        messages: row.messages || []
      };
      this.visible = true;
    },
    async submit() {
      await updateClassGroup(this.editingId, this.form);
      this.$Message.success('班级群配置已更新');
      this.loadData();
    },
    triggerUpload() {
      this.$refs.fileInput.click();
    },
    async handleFileChange(event) {
      const file = event.target.files && event.target.files[0];
      if (!file) {
        return;
      }
      const reader = new FileReader();
      reader.onload = async () => {
        const res = await uploadImage({
          name: file.name,
          content: reader.result
        });
        this.form.qrCode = res.path;
        this.$Message.success('二维码上传成功');
      };
      reader.readAsDataURL(file);
      event.target.value = '';
    },
    async assignUser() {
      if (!this.selectedUserId) {
        this.$Message.error('请先选择学生');
        return;
      }
      await assignUserToClassGroup(this.editingId, { userId: this.selectedUserId });
      this.$Message.success('学生已加入该班级');
      this.selectedUserId = null;
      this.loadData();
    },
    normalizeQrCode(path) {
      if (!path) {
        return '';
      }
      return path.startsWith('http') ? path : `${API_BASE_URL}${path}`;
    }
  }
};
</script>
