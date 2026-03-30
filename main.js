import Vue from 'vue'
import App from './App.vue'
import apiPlugin from './plugins/api'

Vue.config.productionTip = false

// 注册API插件
Vue.use(apiPlugin)

App.mpType = 'app'

const app = new Vue({
  ...App
})
app.$mount()
