import request from '../utils/request';
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

export default {
  getProfile,
  updateProfile,
  uploadAvatar,
  getSettings,
  updateSettings,
  getCollections,
  toggleCollection,
  getHistory,
  recordHistory,
  getStats,
  changePassword
};
