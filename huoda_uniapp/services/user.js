import request, { invalidateRequestCache, toQueryString } from '../utils/request';
import API from '../config/api';

const invalidateUserCache = () => invalidateRequestCache('/user/');
const invalidateInfoCache = () => invalidateRequestCache('/info/');

const getProfile = () =>
  request(API.user.profile, {
    cache: {
      ttl: 60 * 1000
    }
  });

const updateProfile = (payload) =>
  request(API.user.profile, {
    method: 'PUT',
    data: payload
  }).then((res) => {
    invalidateUserCache();
    return res;
  });

const uploadAvatar = (payload) =>
  request(API.user.avatarUpload, {
    method: 'POST',
    data: payload
  }).then((res) => {
    invalidateUserCache();
    return res;
  });

const getSettings = () =>
  request(`${API.user.profile.replace('/profile', '/settings')}`, {
    cache: {
      ttl: 60 * 1000
    }
  });

const getNotifications = (params = {}) => {
  const query = toQueryString(params);
  return request(query ? `${API.user.notifications}?${query}` : API.user.notifications, {
    cache: {
      ttl: 20 * 1000
    }
  });
};

const getPopupAnnouncement = () =>
  request(API.user.popupAnnouncement, {
    cache: {
      ttl: 60 * 1000
    }
  });

const ackPopupAnnouncement = (id) =>
  request(`${API.user.popupAnnouncement}/${id}/ack`, {
    method: 'POST'
  }).then((res) => {
    invalidateUserCache();
    return res;
  });

const readNotification = (id) =>
  request(`${API.user.notifications}/${id}/read`, {
    method: 'POST'
  }).then((res) => {
    invalidateUserCache();
    return res;
  });

const readAllNotifications = (payload = {}) =>
  request(`${API.user.notifications}/read-all`, {
    method: 'POST',
    data: payload
  }).then((res) => {
    invalidateUserCache();
    return res;
  });

const updateSettings = (payload) =>
  request(`${API.user.profile.replace('/profile', '/settings')}`, {
    method: 'PUT',
    data: payload
  }).then((res) => {
    invalidateUserCache();
    return res;
  });

const getCollections = () =>
  request(`${API.user.profile.replace('/profile', '/collections')}`, {
    cache: {
      ttl: 30 * 1000
    }
  });

const toggleCollection = (payload) =>
  request(`${API.user.profile.replace('/profile', '/collections/toggle')}`, {
    method: 'POST',
    data: payload
  }).then((res) => {
    invalidateUserCache();
    invalidateInfoCache();
    invalidateRequestCache('/publish/');
    return res;
  });

const getHistory = () =>
  request(`${API.user.profile.replace('/profile', '/history')}`, {
    cache: {
      ttl: 30 * 1000
    }
  });

const recordHistory = (payload) =>
  request(`${API.user.profile.replace('/profile', '/history/record')}`, {
    method: 'POST',
    data: payload
  }).then((res) => {
    invalidateUserCache();
    return res;
  });

const getStats = () =>
  request(`${API.user.profile.replace('/profile', '/stats')}`, {
    cache: {
      ttl: 30 * 1000
    }
  });

const changePassword = (payload) =>
  request(`${API.auth.login.replace('/login', '/change-password')}`, {
    method: 'POST',
    data: payload
  });

const getAppVersion = (query = {}) => {
  const queryString = toQueryString(query);
  return request(`${API.app.version}${queryString ? `?${queryString}` : ''}`, {
    cache: {
      ttl: 5 * 60 * 1000
    }
  });
};

export default {
  getProfile,
  updateProfile,
  uploadAvatar,
  getSettings,
  getNotifications,
  getPopupAnnouncement,
  ackPopupAnnouncement,
  readNotification,
  readAllNotifications,
  updateSettings,
  getCollections,
  toggleCollection,
  getHistory,
  recordHistory,
  getStats,
  changePassword,
  getAppVersion
};
