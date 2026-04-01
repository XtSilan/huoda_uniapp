export const SERVER_ORIGIN = 'http://localhost:3000';
export const BASE_URL = `${SERVER_ORIGIN}/api`;
export const ADMIN_ORIGIN = 'http://localhost:8081';
export const ADMIN_LOGIN_URL = `${ADMIN_ORIGIN}/#/login`;

const API = {
  auth: {
    login: `${BASE_URL}/auth/login`,
    refresh: `${BASE_URL}/auth/refresh`
  },
  user: {
    profile: `${BASE_URL}/user/profile`,
    avatarUpload: `${BASE_URL}/user/avatar/upload`
  },
  classGroup: {
    current: `${BASE_URL}/class-group/current`,
    messages: `${BASE_URL}/class-group/messages`
  },
  info: {
    list: `${BASE_URL}/info/list`,
    detail: `${BASE_URL}/info/detail`,
    search: `${BASE_URL}/info/search`,
    collect: `${BASE_URL}/info/collect`,
    uncollect: `${BASE_URL}/info/uncollect`,
    comment: `${BASE_URL}/info/comment`
  },
  run: {
    start: `${BASE_URL}/run/start`,
    end: `${BASE_URL}/run/end`,
    history: `${BASE_URL}/run/history`,
    ranking: `${BASE_URL}/run/ranking`,
    target: `${BASE_URL}/run/target`
  },
  sign: {
    do: `${BASE_URL}/sign/do`,
    history: `${BASE_URL}/sign/history`,
    statistics: `${BASE_URL}/sign/statistics`,
    leave: `${BASE_URL}/sign/leave`
  },
  publish: {
    create: `${BASE_URL}/publish/create`,
    detail: `${BASE_URL}/publish/detail`,
    list: `${BASE_URL}/publish/list`,
    delete: `${BASE_URL}/publish/delete`,
    apply: `${BASE_URL}/publish/apply`,
    applications: `${BASE_URL}/publish/applications`
  },
  ai: {
    settings: `${BASE_URL}/ai/settings`,
    validate: `${BASE_URL}/ai/validate`,
    chat: `${BASE_URL}/ai/chat`,
    search: `${BASE_URL}/ai/search`,
    recommend: `${BASE_URL}/ai/recommend`,
    history: `${BASE_URL}/ai/history`
  }
};

export default API;
