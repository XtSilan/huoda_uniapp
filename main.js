import Vue from 'vue'
import App from './App.vue'
import apiPlugin from './plugins/api'
import PageNav from './components/page-nav/page-nav.vue'
import AppTabbar from './components/app-tabbar/app-tabbar.vue'
import AnnouncementPopup from './components/announcement-popup/announcement-popup.vue'

Vue.config.productionTip = false

// 注册API插件
Vue.use(apiPlugin)
Vue.component('page-nav', PageNav)
Vue.component('app-tabbar', AppTabbar)
Vue.component('announcement-popup', AnnouncementPopup)

App.mpType = 'app'

const app = new Vue({
  ...App
})
app.$mount()
