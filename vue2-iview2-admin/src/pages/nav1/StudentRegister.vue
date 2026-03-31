<template>
  <div>
    <Card dis-hover>
      <p slot="title">学生注册</p>
      <Form :label-width="90">
        <Form-item label="学号">
          <Input v-model="form.studentId" placeholder="请输入学号" />
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
          <Input v-model="form.className" placeholder="请输入班级" />
        </Form-item>
        <Form-item label="手机号">
          <Input v-model="form.phone" placeholder="请输入手机号" />
        </Form-item>
        <Form-item>
          <Button type="primary" :loading="submitting" @click="submit">注册学生</Button>
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
        { title: '学号', key: 'studentId' },
        { title: '姓名', key: 'name' },
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
    async loadUsers() {
      const res = await getUsers();
      this.users = (res.list || []).filter((item) => item.role === 'user');
    },
    async submit() {
      if (!this.form.studentId || !this.form.password || !this.form.name) {
        this.$Message.error('请先填写学号、密码和姓名');
        return;
      }
      this.submitting = true;
      try {
        await createStudent(this.form);
        this.$Message.success('学生注册成功');
        this.form = createForm();
        this.loadUsers();
      } catch (error) {
        this.$Message.error((error.response && error.response.data && error.response.data.message) || '注册失败');
      } finally {
        this.submitting = false;
      }
    }
  }
};
</script>
