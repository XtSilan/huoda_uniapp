export const BASE_URL = 'http://localhost:3000/api';

const API = {
  auth: {
    login: `${BASE_URL}/auth/login`,
    refresh: `${BASE_URL}/auth/refresh`
  },
  user: {
    profile: `${BASE_URL}/user/profile`
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
    chat: `${BASE_URL}/ai/chat`,
    search: `${BASE_URL}/ai/search`,
    recommend: `${BASE_URL}/ai/recommend`,
    history: `${BASE_URL}/ai/history`
  }
};

export default API;
