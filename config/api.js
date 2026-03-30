// API地址配置
const baseUrl = 'http://localhost:3000/api';

const API = {
  // 认证相关
  auth: {
    login: `${baseUrl}/auth/login`,
    refresh: `${baseUrl}/auth/refresh`
  },
  
  // 用户相关
  user: {
    profile: `${baseUrl}/user/profile`,
    avatar: `${baseUrl}/user/avatar`
  },
  
  // 信息相关
  info: {
    list: `${baseUrl}/info/list`,
    detail: `${baseUrl}/info/detail`,
    collect: `${baseUrl}/info/collect`,
    uncollect: `${baseUrl}/info/uncollect`,
    comment: `${baseUrl}/info/comment`,
    search: `${baseUrl}/info/search`
  },
  
  // 乐跑相关
  run: {
    start: `${baseUrl}/run/start`,
    end: `${baseUrl}/run/end`,
    history: `${baseUrl}/run/history`,
    ranking: `${baseUrl}/run/ranking`,
    target: `${baseUrl}/run/target`
  },
  
  // 签到相关
  sign: {
    create: `${baseUrl}/sign/create`,
    do: `${baseUrl}/sign/do`,
    statistics: `${baseUrl}/sign/statistics`,
    history: `${baseUrl}/sign/history`,
    leave: `${baseUrl}/sign/leave`
  },
  
  // 活动发布相关
  publish: {
    create: `${baseUrl}/publish/create`,
    update: `${baseUrl}/publish/update`,
    detail: `${baseUrl}/publish/detail`,
    list: `${baseUrl}/publish/list`,
    delete: `${baseUrl}/publish/delete`,
    apply: `${baseUrl}/publish/apply`,
    applications: `${baseUrl}/publish/applications`
  },
  
  // 人工智能对话框相关
  ai: {
    chat: `${baseUrl}/ai/chat`,
    search: `${baseUrl}/ai/search`,
    recommend: `${baseUrl}/ai/recommend`,
    history: `${baseUrl}/ai/history`
  }
};

export default API;
