import request, { invalidateRequestCache, toQueryString } from '../utils/request';
import API from '../config/api';

const getSettings = () =>
  request(API.ai.settings, {
    cache: {
      ttl: 60 * 1000
    }
  });

const updateSettings = (payload) =>
  request(API.ai.settings, {
    method: 'PUT',
    data: payload
  }).then((res) => {
    invalidateRequestCache('/ai/settings');
    return res;
  });

const validateSettings = (payload) =>
  request(API.ai.validate, {
    method: 'POST',
    data: payload,
    timeout: 60000
  });

const getRecommendations = (params = {}) => {
  const query = toQueryString(params);
  return request(query ? `${API.ai.recommend}?${query}` : API.ai.recommend, {
    cache: {
      ttl: 60 * 1000
    }
  });
};

const chat = (payload) =>
  request(API.ai.chat, {
    method: 'POST',
    data: payload,
    timeout: 60000
  });

const search = (query) =>
  request(API.ai.search, {
    method: 'POST',
    data: { query }
  });

const getChatHistory = () =>
  request(API.ai.history, {
    cache: {
      ttl: 20 * 1000
    }
  });

export default {
  getSettings,
  updateSettings,
  validateSettings,
  getRecommendations,
  chat,
  search,
  getChatHistory
};
