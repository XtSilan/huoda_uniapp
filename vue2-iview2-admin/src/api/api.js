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
export const getUsers = () => http.get('/admin/users').then((res) => res.data);
export const updateUser = (id, payload) => http.put(`/admin/users/${id}`, payload).then((res) => res.data);
export const getBanners = () => http.get('/admin/banners').then((res) => res.data);
export const createBanner = (payload) => http.post('/admin/banners', payload).then((res) => res.data);
export const updateBanner = (id, payload) => http.put(`/admin/banners/${id}`, payload).then((res) => res.data);
export const deleteBanner = (id) => http.delete(`/admin/banners/${id}`).then((res) => res.data);
export const getInfos = () => http.get('/admin/infos').then((res) => res.data);
export const createInfo = (payload) => http.post('/admin/infos', payload).then((res) => res.data);
export const updateInfo = (id, payload) => http.put(`/admin/infos/${id}`, payload).then((res) => res.data);
export const deleteInfo = (id) => http.delete(`/admin/infos/${id}`).then((res) => res.data);
export const getActivities = () => http.get('/admin/activities').then((res) => res.data);
export const createActivity = (payload) => http.post('/admin/activities', payload).then((res) => res.data);
export const updateActivity = (id, payload) => http.put(`/admin/activities/${id}`, payload).then((res) => res.data);
export const deleteActivity = (id) => http.delete(`/admin/activities/${id}`).then((res) => res.data);
export const getReports = () => http.get('/admin/reports').then((res) => res.data);
