import request, { toQueryString } from '../utils/request';
import API from '../config/api';

const getRecommendations = (params = {}) => {
  const query = toQueryString(params);
  return request(query ? `${API.ai.recommend}?${query}` : API.ai.recommend);
};

const chat = (message) =>
  request(API.ai.chat, {
    method: 'POST',
    data: { message }
  });

const search = (query) =>
  request(API.ai.search, {
    method: 'POST',
    data: { query }
  });

const getChatHistory = () => request(API.ai.history);

export default {
  getRecommendations,
  chat,
  search,
  getChatHistory
};
