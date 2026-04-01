<template>
  <div>
    <Card dis-hover style="margin-bottom: 16px;">
      <div style="display:flex; flex-wrap:wrap; gap:12px; align-items:center;">
        <Input v-model="filters.keyword" placeholder="搜索学号、姓名、院系、班级、手机号" style="width: 280px;" @on-enter="loadUsers" />
        <Select v-model="filters.role" clearable style="width: 140px;" placeholder="角色">
          <Option value="user">普通用户</Option>
          <Option value="admin">管理员</Option>
        </Select>
        <Select v-model="filters.status" clearable style="width: 140px;" placeholder="状态">
          <Option value="active">启用</Option>
          <Option value="disabled">禁用</Option>
        </Select>
        <Select v-model="filters.department" clearable style="width: 180px;" placeholder="院系">
          <Option v-for="item in departmentOptions" :key="item.value" :value="item.value">
            {{ item.label }} ({{ item.count }})
          </Option>
        </Select>
        <Button type="primary" @click="loadUsers">筛选</Button>
        <Button @click="resetFilters">重置</Button>
      </div>
    </Card>

    <Table border :columns="columns" :data="users"></Table>

    <Modal v-model="visible" title="编辑用户" :mask-closable="false" @on-ok="submitEdit">
      <Form :label-width="80">
        <Form-item label="学号">
          <Input :value="form.studentId" disabled />
        </Form-item>
        <Form-item label="姓名">
          <Input v-model="form.name" placeholder="请输入姓名" />
        </Form-item>
        <Form-item label="角色">
          <Select v-model="form.role">
            <Option value="user">普通用户</Option>
            <Option value="admin">管理员</Option>
          </Select>
        </Form-item>
        <Form-item label="状态">
          <Select v-model="form.status">
            <Option value="active">启用</Option>
            <Option value="disabled">禁用</Option>
          </Select>
        </Form-item>
        <Form-item label="院系">
          <Input v-model="form.department" placeholder="请输入院系" />
        </Form-item>
        <Form-item label="班级">
          <Input v-model="form.className" placeholder="请输入班级" />
        </Form-item>
      </Form>
    </Modal>
  </div>
</template>

<script>
import { getUsers, updateUser, deleteUser } from '../../api';

const createFilters = () => ({
  keyword: '',
  role: '',
  status: '',
  department: ''
});

export default {
  data() {
    return {
      users: [],
      departmentOptions: [],
      visible: false,
      editingId: null,
      filters: createFilters(),
      form: {
        studentId: '',
        name: '',
        role: 'user',
        status: 'active',
        department: '',
        className: ''
      },
      columns: [
        { title: '学号', key: 'studentId', minWidth: 120 },
        { title: '姓名', key: 'name', minWidth: 100 },
        { title: '角色', key: 'role', minWidth: 100 },
        { title: '状态', key: 'status', minWidth: 100 },
        { title: '院系', key: 'department', minWidth: 140 },
        { title: '班级', key: 'class', minWidth: 120 },
        { title: '最近登录', key: 'lastLoginAt', minWidth: 180 },
        {
          title: '操作',
          minWidth: 320,
          render: (h, params) => h('div', [
            h('Button', {
              props: { size: 'small' },
              on: { click: () => this.openEdit(params.row) }
            }, '编辑'),
            h('Button', {
              props: { size: 'small', type: params.row.status === 'disabled' ? 'success' : 'warning' },
              style: { marginLeft: '8px' },
              on: { click: () => this.toggleStatus(params.row) }
            }, params.row.status === 'disabled' ? '启用' : '禁用'),
            h('Button', {
              props: { size: 'small', type: 'primary' },
              style: { marginLeft: '8px' },
              on: { click: () => this.toggleRole(params.row) }
            }, params.row.role === 'admin' ? '设为用户' : '设为管理员'),
            h('Button', {
              props: { size: 'small', type: 'error' },
              style: { marginLeft: '8px' },
              on: { click: () => this.remove(params.row) }
            }, '删除')
          ])
        }
      ]
    };
  },
  mounted() {
    this.loadUsers();
  },
  methods: {
    async loadUsers() {
      const res = await getUsers(this.filters);
      this.users = res.list || [];
      this.departmentOptions = (res.filters && res.filters.departments) || [];
    },
    resetFilters() {
      this.filters = createFilters();
      this.loadUsers();
    },
    openEdit(row) {
      this.editingId = row.id;
      this.form = {
        studentId: row.studentId,
        name: row.name,
        role: row.role,
        status: row.status,
        department: row.department,
        className: row.class || ''
      };
      this.visible = true;
    },
    async submitEdit() {
      await updateUser(this.editingId, this.form);
      this.$Message.success('用户信息已更新');
      this.loadUsers();
    },
    async toggleRole(row) {
      await updateUser(row.id, {
        role: row.role === 'admin' ? 'user' : 'admin',
        status: row.status,
        name: row.name,
        department: row.department,
        className: row.class || ''
      });
      this.$Message.success('角色已更新');
      this.loadUsers();
    },
    async toggleStatus(row) {
      await updateUser(row.id, {
        role: row.role,
        status: row.status === 'disabled' ? 'active' : 'disabled',
        name: row.name,
        department: row.department,
        className: row.class || ''
      });
      this.$Message.success('账户状态已更新');
      this.loadUsers();
    },
    remove(row) {
      this.$Modal.confirm({
        title: '确认删除',
        content: `确定删除用户“${row.name}”吗？该操作不可恢复。`,
        onOk: async () => {
          await deleteUser(row.id);
          this.$Message.success('用户已删除');
          this.loadUsers();
        }
      });
    }
  }
};
</script>
