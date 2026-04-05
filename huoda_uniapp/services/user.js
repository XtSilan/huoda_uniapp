import request, { toQueryString } from '../utils/request';
import API from '../config/api';

const getProfile = () => request(API.user.profile);

const updateProfile = (payload) =>
  request(API.user.profile, {
    method: 'PUT',
    data: payload
  });

const uploadAvatar = (payload) =>
  request(API.user.avatarUpload, {
    method: 'POST',
    data: payload
  });

const getSettings = () => request(`${API.user.profile.replace('/profile', '/settings')}`);

const getNotifications = (params = {}) => {
  const query = toQueryString(params);
  return request(query ? `${API.user.notifications}?${query}` : API.user.notifications);
};

const getPopupAnnouncement = () => request(API.user.popupAnnouncement);

const ackPopupAnnouncement = (id) =>
  request(`${API.user.popupAnnouncement}/${id}/ack`, {
    method: 'POST'
  });

const readNotification = (id) =>
  request(`${API.user.notifications}/${id}/read`, {
    method: 'POST'
  });

const readAllNotifications = (payload = {}) =>
  request(`${API.user.notifications}/read-all`, {
    method: 'POST',
    data: payload
  });

const updateSettings = (payload) =>
  request(`${API.user.profile.replace('/profile', '/settings')}`, {
    method: 'PUT',
    data: payload
  });

const getCollections = () => request(`${API.user.profile.replace('/profile', '/collections')}`);

const toggleCollection = (payload) =>
  request(`${API.user.profile.replace('/profile', '/collections/toggle')}`, {
    method: 'POST',
    data: payload
  });

const getHistory = () => request(`${API.user.profile.replace('/profile', '/history')}`);

const recordHistory = (payload) =>
  request(`${API.user.profile.replace('/profile', '/history/record')}`, {
    method: 'POST',
    data: payload
  });

const getStats = () => request(`${API.user.profile.replace('/profile', '/stats')}`);

const changePassword = (payload) =>
  request(`${API.auth.login.replace('/login', '/change-password')}`, {
    method: 'POST',
    data: payload
  });

const getAppVersion = (query = {}) => {
  const queryString = toQueryString(query);
  return request(`${API.app.version}${queryString ? `?${queryString}` : ''}`);
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
