<template>
  <div>
    <Card dis-hover>
      <p slot="title">账号创建</p>
      <Form :label-width="90">
        <Form-item label="账号类型">
          <Select v-model="form.role" style="width: 220px;">
            <Option value="user">普通用户</Option>
            <Option value="teacher">教师</Option>
          </Select>
        </Form-item>
        <Form-item label="学号/工号">
          <Input v-model="form.studentId" placeholder="请输入学号或工号" />
        </Form-item>
        <Form-item label="密码">
          <Input v-model="form.password" type="password" placeholder="请输入登录密码" />
        </Form-item>
        <Form-item label="姓名">
          <Input v-model="form.name" placeholder="请输入姓名" />
        </Form-item>
        <Form-item label="学校">
          <Input v-model="form.school" placeholder="请输入学校" />
        </Form-item>
        <Form-item label="院系">
          <Input v-model="form.department" placeholder="请输入院系" />
        </Form-item>
        <Form-item label="班级">
          <Input v-model="form.className" placeholder="请输入班级，教师也用于绑定管理班级" />
        </Form-item>
        <Form-item label="手机号">
          <Input v-model="form.phone" placeholder="请输入手机号" />
        </Form-item>
        <Form-item>
          <Button type="primary" :loading="submitting" @click="submit">
            {{ form.role === 'teacher' ? '创建教师账号' : '创建普通账号' }}
          </Button>
        </Form-item>
      </Form>
    </Card>

    <Table border :columns="columns" :data="users" style="margin-top: 16px;"></Table>
  </div>
</template>

<script>
import { createStudent, getUsers } from '../../api';

function createForm() {
  return {
    role: 'user',
    studentId: '',
    password: '',
    name: '',
    school: '',
    department: '',
    className: '',
    phone: ''
  };
}

export default {
  data() {
    return {
      submitting: false,
      users: [],
      form: createForm(),
      columns: [
        { title: '账号', key: 'studentId' },
        { title: '姓名', key: 'name' },
        {
          title: '角色',
          key: 'role',
          render: (h, params) => h('span', this.formatRole(params.row.role))
        },
        { title: '院系', key: 'department' },
        { title: '班级', key: 'class' },
        { title: '状态', key: 'status' }
      ]
    };
  },
  mounted() {
    this.loadUsers();
  },
  methods: {
    formatRole(role) {
      if (role === 'teacher') {
        return '教师';
      }
      return role === 'admin' ? '管理员' : '普通用户';
    },
    async loadUsers() {
      const res = await getUsers();
      this.users = (res.list || []).filter((item) => ['user', 'teacher'].includes(item.role));
    },
    async submit() {
      if (!this.form.studentId || !this.form.password || !this.form.name) {
        this.$Message.error('请先填写账号、密码和姓名');
        return;
      }
      this.submitting = true;
      try {
        await createStudent(this.form);
        this.$Message.success(this.form.role === 'teacher' ? '教师账号创建成功' : '普通账号创建成功');
        this.form = createForm();
        this.loadUsers();
      } catch (error) {
        this.$Message.error((error.response && error.response.data && error.response.data.message) || '创建失败');
      } finally {
        this.submitting = false;
      }
    }
  }
};
</script>
