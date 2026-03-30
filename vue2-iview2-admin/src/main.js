import 'babel-polyfill';
import Vue from 'vue';
import App from './App';
import VueRouter from 'vue-router';
import store from './vuex/store';
import Vuex from 'vuex';
import routes from './routes';
import iview from 'iview';
import 'iview/dist/styles/iview.css';
import VueClipboard from 'vue-clipboard2';

Vue.use(VueClipboard);
Vue.use(VueRouter);
Vue.use(Vuex);
Vue.use(iview);

const router = new VueRouter({ routes });

router.beforeEach((to, from, next) => {
  const user = sessionStorage.getItem('admin_user');
  if (to.path === '/login') {
    return next();
  }
  if (!user) {
    return next({ path: '/login' });
  }
  next();
});

new Vue({
  el: '#app',
  template: '<App/>',
  router,
  store,
  components: { App }
}).$mount('#app');
