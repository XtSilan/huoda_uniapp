<template>
  <div>
    <div style="margin-bottom: 12px; display: flex; gap: 8px;">
      <Button type="primary" @click="openCreate">手动注册学生</Button>
      <Input v-model="keyword" placeholder="搜索学号、姓名、班级" style="width: 260px;" />
    </div>
    <Table border :columns="columns" :data="filteredUsers"></Table>

    <Modal v-model="visible" :title="editingId ? '编辑学生' : '注册学生'" @on-ok="submit">
      <Input v-model="form.studentId" placeholder="学号" :disabled="!!editingId" style="margin-bottom: 10px;" />
      <Input v-model="form.password" placeholder="密码" style="margin-bottom: 10px;" />
      <Input v-model="form.name" placeholder="姓名" style="margin-bottom: 10px;" />
      <Input v-model="form.school" placeholder="学校" style="margin-bottom: 10px;" />
      <Input v-model="form.department" placeholder="院系" style="margin-bottom: 10px;" />
      <Input v-model="form.className" placeholder="班级" style="margin-bottom: 10px;" />
      <Input v-model="form.phone" placeholder="手机号" style="margin-bottom: 10px;" />
      <Select v-model="form.status" style="margin-bottom: 10px;">
        <Option value="active">启用</Option>
        <Option value="disabled">禁用</Option>
      </Select>
      <Select v-model="form.role">
        <Option value="user">学生</Option>
        <Option value="admin">管理员</Option>
      </Select>
    </Modal>
  </div>
</template>

<script>
import { getUsers, createUser, updateUser } from '../../api';

export default {
  data() {
    return {
      users: [],
      visible: false,
      editingId: null,
      keyword: '',
      form: {
        studentId: '',
        password: '123456',
        name: '',
        school: '',
        department: '',
        className: '',
        phone: '',
        status: 'active',
        role: 'user'
      },
      columns: [
        { title: '学号', key: 'studentId' },
        { title: '姓名', key: 'name' },
        { title: '班级', key: 'class' },
        { title: '院系', key: 'department' },
        { title: '状态', key: 'status' },
        {
          title: '操作',
          render: (h, params) => h('div', [
            h('Button', {
              props: { size: 'small' },
              on: { click: () => this.openEdit(params.row) }
            }, '编辑'),
            h('Button', {
              props: { size: 'small', type: 'primary' },
              style: { marginLeft: '8px' },
              on: { click: () => this.changeRole(params.row) }
            }, params.row.role === 'admin' ? '设为学生' : '设为管理员')
          ])
        }
      ]
    };
  },
  computed: {
    filteredUsers() {
      const keyword = this.keyword.trim();
      if (!keyword) {
        return this.users;
      }
      return this.users.filter((item) => [item.studentId, item.name, item.class].some((value) => String(value || '').includes(keyword)));
    }
  },
  mounted() {
    this.loadUsers();
  },
  methods: {
    async loadUsers() {
      const res = await getUsers();
      this.users = res.list || [];
    },
    openCreate() {
      this.editingId = null;
      this.form = {
        studentId: '',
        password: '123456',
        name: '',
        school: '',
        department: '',
        className: '',
        phone: '',
        status: 'active',
        role: 'user'
      };
      this.visible = true;
    },
    openEdit(row) {
      this.editingId = row.id;
      this.form = {
        studentId: row.studentId,
        password: '',
        name: row.name,
        school: row.school || '',
        department: row.department || '',
        className: row.class || '',
        phone: row.phone || '',
        status: row.status || 'active',
        role: row.role || 'user'
      };
      this.visible = true;
    },
    async submit() {
      if (this.editingId) {
        await updateUser(this.editingId, this.form);
      } else {
        await createUser(this.form);
      }
      this.$Message.success(this.editingId ? '学生信息已更新' : '学生注册成功');
      this.loadUsers();
    },
    async changeRole(row) {
      await updateUser(row.id, {
        role: row.role === 'admin' ? 'user' : 'admin',
        status: row.status,
        name: row.name,
        department: row.department,
        className: row.class,
        school: row.school,
        phone: row.phone
      });
      this.$Message.success('角色已更新');
      this.loadUsers();
    }
  }
};
</script>
