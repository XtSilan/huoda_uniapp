import request, { toQueryString } from '../utils/request';
import API from '../config/api';

const getList = (params = {}) => {
  const query = toQueryString(params);
  return request(query ? `${API.publish.list}?${query}` : API.publish.list);
};

const getDetail = (id) => request(`${API.publish.detail}?id=${encodeURIComponent(id)}`);

const create = (payload) =>
  request(API.publish.create, {
    method: 'POST',
    data: payload
  });

const remove = (id) =>
  request(API.publish.delete, {
    method: 'POST',
    data: { id }
  });

const apply = (activityId) =>
  request(API.publish.apply, {
    method: 'POST',
    data: { activityId }
  });

const getApplications = () => request(API.publish.applications);

export default {
  getList,
  getDetail,
  create,
  remove,
  apply,
  getApplications
};
