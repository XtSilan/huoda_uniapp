import runtimeConfig from './runtime.json';

const trimTrailingSlash = (value = '') => value.replace(/\/+$/, '');
const joinUrl = (origin, suffix) => `${trimTrailingSlash(origin)}${suffix}`;

const runtime = runtimeConfig || {};

export const SERVER_ORIGIN = trimTrailingSlash(process.env.VUE_APP_SERVER_ORIGIN || runtime.serverOrigin || '');
export const BASE_URL = trimTrailingSlash(process.env.VUE_APP_BASE_URL || runtime.baseUrl || joinUrl(SERVER_ORIGIN, '/api'));
export const ADMIN_ORIGIN = trimTrailingSlash(process.env.VUE_APP_ADMIN_ORIGIN || runtime.adminOrigin || '');
export const ADMIN_LOGIN_URL = process.env.VUE_APP_ADMIN_LOGIN_URL || runtime.adminLoginUrl || joinUrl(ADMIN_ORIGIN, '/#/login');

const API = {
  auth: {
    login: `${BASE_URL}/auth/login`,
    refresh: `${BASE_URL}/auth/refresh`
  },
  user: {
    profile: `${BASE_URL}/user/profile`,
    avatarUpload: `${BASE_URL}/user/avatar/upload`,
    notifications: `${BASE_URL}/user/notifications`,
    popupAnnouncement: `${BASE_URL}/user/popup-announcement`
  },
  app: {
    version: `${BASE_URL}/app/version`
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
    overview: `${BASE_URL}/sign/overview`,
    do: `${BASE_URL}/sign/do`,
    history: `${BASE_URL}/sign/history`,
    statistics: `${BASE_URL}/sign/statistics`,
    leave: `${BASE_URL}/sign/leave`,
    teacherOverview: `${BASE_URL}/sign/teacher/overview`,
    teacherBatchCreate: `${BASE_URL}/sign/teacher/batches`,
    teacherLeaveReview: (id) => `${BASE_URL}/sign/teacher/leave-requests/${id}/review`
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
