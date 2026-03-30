import request from '../utils/request';
import { BASE_URL } from '../config/api';

const getOverview = () => request(`${BASE_URL}/home/overview`);

const getBanners = () => request(`${BASE_URL}/banners`);

export default {
  getOverview,
  getBanners
};
