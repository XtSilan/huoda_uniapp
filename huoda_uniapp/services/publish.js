import request, { invalidateRequestCache, toQueryString } from '../utils/request';
import API from '../config/api';

const getList = (params = {}) => {
  const query = toQueryString(params);
  return request(query ? `${API.publish.list}?${query}` : API.publish.list, {
    cache: {
      ttl: 30 * 1000
    }
  });
};

const getDetail = (id) =>
  request(`${API.publish.detail}?id=${encodeURIComponent(id)}`, {
    cache: {
      ttl: 3 * 60 * 1000
    }
  });

const create = (payload) =>
  request(API.publish.create, {
    method: 'POST',
    data: payload
  }).then((res) => {
    invalidateRequestCache('/publish/');
    return res;
  });

const remove = (id) =>
  request(API.publish.delete, {
    method: 'POST',
    data: { id }
  }).then((res) => {
    invalidateRequestCache('/publish/');
    return res;
  });

const apply = (activityId) =>
  request(API.publish.apply, {
    method: 'POST',
    data: { activityId }
  }).then((res) => {
    invalidateRequestCache('/publish/');
    return res;
  });

const getApplications = () =>
  request(API.publish.applications, {
    cache: {
      ttl: 20 * 1000
    }
  });

export default {
  getList,
  getDetail,
  create,
  remove,
  apply,
  getApplications
};
