import Login from './pages/Login.vue';
import Home from './pages/Home.vue';
import Dashboard from './pages/Main.vue';
import Users from './pages/nav1/user.vue';
import Infos from './pages/nav1/Table.vue';
import Activities from './pages/nav1/Form.vue';
import Banners from './pages/nav2/Page4.vue';
import AiModels from './pages/nav2/Page5.vue';
import Reports from './pages/charts/echarts.vue';
import NotFound from './pages/404.vue';

export default [
  { path: '/login', component: Login, hidden: true },
  {
    path: '/',
    component: Home,
    name: '后台管理',
    iconCls: 'ios-settings',
    children: [
      { path: '/dashboard', component: Dashboard, name: '仪表盘' },
      { path: '/users', component: Users, name: '用户管理' },
      { path: '/banners', component: Banners, name: '轮播图管理' },
      { path: '/ai-models', component: AiModels, name: 'AI 默认模型' },
      { path: '/infos', component: Infos, name: '资讯管理' },
      { path: '/activities', component: Activities, name: '活动管理' },
      { path: '/reports', component: Reports, name: '数据报表' }
    ]
  },
  { path: '*', component: NotFound, hidden: true }
];
