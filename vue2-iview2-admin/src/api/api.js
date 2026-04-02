import axios from 'axios';
import { API_BASE_URL } from '../config/runtime';

const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000
});

http.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const requestLogin = (params) => http.post('/auth/login', params).then((res) => res.data);
export const getDashboard = () => http.get('/admin/dashboard').then((res) => res.data);
export const getUsers = (params = {}) => http.get('/admin/users', { params }).then((res) => res.data);
export const updateUser = (id, payload) => http.put(`/admin/users/${id}`, payload).then((res) => res.data);
export const deleteUser = (id) => http.delete(`/admin/users/${id}`).then((res) => res.data);
export const createStudent = (payload) => http.post('/admin/students', payload).then((res) => res.data);
export const getBanners = () => http.get('/admin/banners').then((res) => res.data);
export const createBanner = (payload) => http.post('/admin/banners', payload).then((res) => res.data);
export const updateBanner = (id, payload) => http.put(`/admin/banners/${id}`, payload).then((res) => res.data);
export const deleteBanner = (id) => http.delete(`/admin/banners/${id}`).then((res) => res.data);
export const getInfos = () => http.get('/admin/infos').then((res) => res.data);
export const createInfo = (payload) => http.post('/admin/infos', payload).then((res) => res.data);
export const updateInfo = (id, payload) => http.put(`/admin/infos/${id}`, payload).then((res) => res.data);
export const deleteInfo = (id) => http.delete(`/admin/infos/${id}`).then((res) => res.data);
export const uploadInfoAttachment = (payload) => http.post('/admin/info-attachments/upload', payload).then((res) => res.data);
export const getActivities = () => http.get('/admin/activities').then((res) => res.data);
export const createActivity = (payload) => http.post('/admin/activities', payload).then((res) => res.data);
export const updateActivity = (id, payload) => http.put(`/admin/activities/${id}`, payload).then((res) => res.data);
export const deleteActivity = (id) => http.delete(`/admin/activities/${id}`).then((res) => res.data);
export const getClassGroups = () => http.get('/admin/class-groups').then((res) => res.data);
export const createClassGroup = (payload) => http.post('/admin/class-groups', payload).then((res) => res.data);
export const updateClassGroup = (id, payload) => http.put(`/admin/class-groups/${id}`, payload).then((res) => res.data);
export const deleteClassGroup = (id) => http.delete(`/admin/class-groups/${id}`).then((res) => res.data);
export const getClassGroupStudents = (id, keyword = '') => http.get(`/admin/class-groups/${id}/students`, { params: { keyword } }).then((res) => res.data);
export const addClassGroupStudent = (id, userId) => http.post(`/admin/class-groups/${id}/students`, { userId }).then((res) => res.data);
export const removeClassGroupStudent = (id, userId) => http.delete(`/admin/class-groups/${id}/students/${userId}`).then((res) => res.data);
export const uploadClassGroupQr = (payload) => http.post('/admin/class-groups/upload', payload).then((res) => res.data);
export const getAppUpdates = () => http.get('/admin/app-updates').then((res) => res.data);
export const updateAppUpdate = (platform, payload) => http.put(`/admin/app-updates/${platform}`, payload).then((res) => res.data);
export const getReports = () => http.get('/admin/reports').then((res) => res.data);
export const getAiModels = () => http.get('/admin/ai-models').then((res) => res.data);
export const createAiModel = (payload) => http.post('/admin/ai-models', payload).then((res) => res.data);
export const updateAiModel = (id, payload) => http.put(`/admin/ai-models/${id}`, payload).then((res) => res.data);
export const deleteAiModel = (id) => http.delete(`/admin/ai-models/${id}`).then((res) => res.data);
