import request, { toQueryString } from '../utils/request';
import API from '../config/api';

const getInfoList = (params = {}) => {
  const query = toQueryString(params);
  return request(query ? `${API.info.list}?${query}` : API.info.list, {
    cache: {
      ttl: 60 * 1000
    }
  });
};

const getInfoDetail = (id) =>
  request(`${API.info.detail}?id=${encodeURIComponent(id)}`, {
    cache: {
      ttl: 3 * 60 * 1000
    }
  });

const searchInfo = (params = {}) => {
  const query = toQueryString(params);
  return request(query ? `${API.info.search}?${query}` : API.info.search, {
    cache: {
      ttl: 20 * 1000
    }
  });
};

const getCategories = (locationType) => getInfoList({ locationType, pageSize: 100 });

export default {
  getInfoList,
  getInfoDetail,
  searchInfo,
  getCategories
};
