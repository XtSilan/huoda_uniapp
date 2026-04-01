import Vue from 'vue'
import App from './App.vue'
import apiPlugin from './plugins/api'
import PageNav from './components/page-nav/page-nav.vue'

Vue.config.productionTip = false

// 注册API插件
Vue.use(apiPlugin)
Vue.component('page-nav', PageNav)

const TABBAR_PAGES = [
  '/pages/index/index',
  '/pages/feature/publish/publish',
  '/pages/info/info',
  '/pages/user/user'
]

Vue.mixin({
  onShow() {
    if (typeof this.getTabBar !== 'function') {
      return
    }
    const tabBar = this.getTabBar()
    if (!tabBar || typeof tabBar.setSelectedByPath !== 'function') {
      return
    }
    const pages = getCurrentPages()
    if (!pages.length) {
      return
    }
    const path = '/' + pages[pages.length - 1].route
    if (TABBAR_PAGES.includes(path)) {
      tabBar.setSelectedByPath(path)
    }
  }
})

App.mpType = 'app'

const app = new Vue({
  ...App
})
app.$mount()
