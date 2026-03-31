<template>
  <div class="login-wrap">
    <i-form ref="formLogin" :model="formLogin" :rules="formLoginRules" class="card-box">
      <Form-item class="formLogin-title"><h3>活达后台登录</h3></Form-item>
      <Form-item prop="studentId">
        <i-input size="large" v-model="formLogin.studentId" placeholder="账号">
          <Icon type="ios-person-outline" slot="prepend"></Icon>
        </i-input>
      </Form-item>
      <Form-item prop="password">
        <i-input size="large" type="password" v-model="formLogin.password" placeholder="密码">
          <Icon type="ios-locked-outline" slot="prepend"></Icon>
        </i-input>
      </Form-item>
      <Form-item>
        <i-button type="primary" long :loading="loading" @click="handleSubmit('formLogin')">登录后台</i-button>
      </Form-item>
    </i-form>
  </div>
</template>

<script>
import { requestLogin } from '../api';

export default {
  data() {
    return {
      loading: false,
      formLogin: {
        studentId: '',
        password: ''
      },
      formLoginRules: {
        studentId: [{ required: true, message: '请输入账号', trigger: 'blur' }],
        password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
      }
    };
  },
  created() {
    this.consumeUnifiedLogin();
  },
  methods: {
    saveAdminSession(token, user, returnTo = '') {
      sessionStorage.setItem('admin_token', token);
      sessionStorage.setItem('admin_user', JSON.stringify(user));
      if (returnTo) {
        sessionStorage.setItem('admin_return_url', returnTo);
      } else {
        sessionStorage.removeItem('admin_return_url');
      }
    },
    consumeUnifiedLogin() {
      const { token, user, returnTo } = this.$route.query || {};
      if (!token || !user) {
        return;
      }
      try {
        const parsedUser = JSON.parse(user);
        if (parsedUser.role !== 'admin') {
          this.$Message.error('该账号没有后台权限');
          return;
        }
        this.saveAdminSession(token, parsedUser, returnTo || '');
        this.$router.replace({ path: '/dashboard' });
      } catch (error) {
        this.$Message.error('统一登录信息无效，请重新登录');
      }
    },
    handleSubmit(name) {
      this.$refs[name].validate(async (valid) => {
        if (!valid) {
          this.$Message.error('请完整填写登录信息');
          return;
        }
        this.loading = true;
        try {
          const res = await requestLogin(this.formLogin);
          if (res.user.role !== 'admin') {
            this.$Message.error('该账号没有后台权限');
            return;
          }
          this.saveAdminSession(res.token, res.user);
          this.$router.push({ path: '/dashboard' });
        } catch (error) {
          this.$Message.error((error.response && error.response.data && error.response.data.message) || '登录失败');
        } finally {
          this.loading = false;
        }
      });
    }
  }
};
</script>

<style scoped>
.login-wrap { min-height: 100vh; background: linear-gradient(135deg, #eef5ff, #f8fbff); overflow: hidden; }
.card-box { padding: 24px; border-radius: 10px; background: #fff; margin: 180px auto; width: 420px; box-shadow: 0 12px 30px rgba(0,0,0,.08); }
.formLogin-title { text-align: center; margin-bottom: 10px; }
</style>
