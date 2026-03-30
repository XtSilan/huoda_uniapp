import request, { toQueryString } from '../utils/request';
import API from '../config/api';

const getSettings = () => request(API.ai.settings);

const updateSettings = (payload) =>
  request(API.ai.settings, {
    method: 'PUT',
    data: payload
  });

const validateSettings = (payload) =>
  request(API.ai.validate, {
    method: 'POST',
    data: payload,
    timeout: 60000
  });

const getRecommendations = (params = {}) => {
  const query = toQueryString(params);
  return request(query ? `${API.ai.recommend}?${query}` : API.ai.recommend);
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

const getChatHistory = () => request(API.ai.history);

export default {
  getSettings,
  updateSettings,
  validateSettings,
  getRecommendations,
  chat,
  search,
  getChatHistory
};
