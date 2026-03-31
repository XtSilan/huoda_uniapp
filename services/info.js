import request, { toQueryString } from '../utils/request';
import API from '../config/api';

const getInfoList = (params = {}) => {
  const query = toQueryString(params);
  return request(query ? `${API.info.list}?${query}` : API.info.list);
};

const getInfoDetail = (id) => request(`${API.info.detail}?id=${encodeURIComponent(id)}`);

const searchInfo = (params = {}) => {
  const query = toQueryString(params);
  return request(query ? `${API.info.search}?${query}` : API.info.search);
};

const getCategories = (locationType) => getInfoList({ locationType, pageSize: 100 });

export default {
  getInfoList,
  getInfoDetail,
  searchInfo,
  getCategories
};
