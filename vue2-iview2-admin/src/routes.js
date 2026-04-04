import Login from './pages/Login.vue';
import Home from './pages/Home.vue';
import Dashboard from './pages/Main.vue';
import Users from './pages/nav1/user.vue';
import StudentRegister from './pages/nav1/StudentRegister.vue';
import Infos from './pages/nav1/Table.vue';
import Activities from './pages/nav1/Form.vue';
import ClassGroups from './pages/nav1/ClassGroups.vue';
import Banners from './pages/nav2/Page4.vue';
import AiModels from './pages/nav2/Page5.vue';
import AppUpdates from './pages/nav2/AppUpdates.vue';
import PopupAnnouncement from './pages/nav2/PopupAnnouncement.vue';
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
      { path: '/student-register', component: StudentRegister, name: '学生注册' },
      { path: '/banners', component: Banners, name: '轮播图管理' },
      { path: '/popup-announcement', component: PopupAnnouncement, name: '弹窗通知管理' },
      { path: '/app-updates', component: AppUpdates, name: '版本更新管理' },
      { path: '/ai-models', component: AiModels, name: 'AI 默认模型' },
      { path: '/infos', component: Infos, name: '信息管理' },
      { path: '/activities', component: Activities, name: '活动管理' },
      { path: '/class-groups', component: ClassGroups, name: '班级群管理' },
      { path: '/reports', component: Reports, name: '数据报表' }
    ]
  },
  { path: '*', component: NotFound, hidden: true }
];
