<template>
  <div class="layout">
    <Row type="flex">
      <i-col :span="5" class="layout-menu-left">
        <Menu theme="dark" width="auto" :active-name="$route.path" @on-select="menuSelect">
          <div class="layout-logo-left">活达后台</div>
          <Menu-item v-for="child in menuItems" :key="child.path" :name="child.path">{{ child.name }}</Menu-item>
        </Menu>
      </i-col>
      <i-col :span="19">
        <div class="layout-header">
          <div class="userinfo">
            <i-button v-if="returnUrl" type="text" @click="goBackToUser">返回用户端</i-button>
            <span>{{ user.name }}</span>
            <i-button type="text" @click="logout">退出</i-button>
          </div>
        </div>
        <div class="layout-content">
          <router-view></router-view>
        </div>
      </i-col>
    </Row>
  </div>
</template>

<script>
import { USER_APP_URL } from '../config/runtime';

export default {
  data() {
    return {
      user: JSON.parse(sessionStorage.getItem('admin_user') || '{}'),
      returnUrl: sessionStorage.getItem('admin_return_url') || USER_APP_URL
    };
  },
  computed: {
    menuItems() {
      const route = this.$router.options.routes.find((item) => item.path === '/');
      return route ? route.children : [];
    }
  },
  methods: {
    menuSelect(path) {
      this.$router.push({ path });
    },
    goBackToUser() {
      if (this.returnUrl) {
        window.location.href = this.returnUrl;
      }
    },
    logout() {
      const returnUrl = this.returnUrl;
      sessionStorage.removeItem('admin_user');
      sessionStorage.removeItem('admin_token');
      sessionStorage.removeItem('admin_return_url');
      if (returnUrl) {
        window.location.href = returnUrl;
        return;
      }
      this.$router.push({ path: '/login' });
    }
  }
};
</script>

<style scoped>
.layout { min-height: 100vh; background: #f5f7f9; }
.layout-menu-left { min-height: 100vh; background: #2d3a4b; }
.layout-logo-left { height: 60px; line-height: 60px; color: #fff; text-align: center; font-size: 20px; font-weight: 700; }
.layout-header { height: 60px; padding: 0 24px; background: #fff; display: flex; align-items: center; justify-content: flex-end; box-shadow: 0 1px 8px rgba(0,0,0,.05); }
.layout-content { margin: 16px; background: #fff; border-radius: 8px; padding: 16px; min-height: calc(100vh - 92px); }
.userinfo span { margin-right: 12px; }
</style>
