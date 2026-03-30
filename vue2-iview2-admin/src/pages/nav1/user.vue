<template>
  <div>
    <Table border :columns="columns" :data="users"></Table>
  </div>
</template>

<script>
import { getUsers, updateUser } from '../../api';

export default {
  data() {
    return {
      users: [],
      columns: [
        { title: '学号', key: 'studentId' },
        { title: '姓名', key: 'name' },
        { title: '角色', key: 'role' },
        { title: '状态', key: 'status' },
        { title: '院系', key: 'department' },
        {
          title: '操作',
          render: (h, params) => h('div', [
            h('Button', {
              props: { size: 'small', type: 'primary' },
              on: { click: () => this.changeRole(params.row) }
            }, params.row.role === 'admin' ? '设为用户' : '设为管理员')
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
      const res = await getUsers();
      this.users = res.list || [];
    },
    async changeRole(row) {
      await updateUser(row.id, {
        role: row.role === 'admin' ? 'user' : 'admin',
        status: row.status,
        name: row.name,
        department: row.department,
        className: row.class
      });
      this.$Message.success('角色已更新');
      this.loadUsers();
    }
  }
};
</script>
