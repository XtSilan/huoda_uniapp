import request from '../utils/request';
import { BASE_URL } from '../config/api';

const getOverview = () =>
  request(`${BASE_URL}/home/overview`, {
    cache: {
      ttl: 30 * 1000
    }
  });

const getBanners = () =>
  request(`${BASE_URL}/banners`, {
    cache: {
      ttl: 5 * 60 * 1000
    }
  });

export default {
  getOverview,
  getBanners
};
