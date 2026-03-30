// AI相关API服务
import request from '../utils/request';
import API from '../config/api';

// 获取AI推荐
const getRecommendations = async (params) => {
  const query = Object.keys(params)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');
  return request(`${API.ai.recommend}?${query}`);
};

// AI聊天
const chat = async (message) => {
  return request(API.ai.chat, {
    method: 'POST',
    data: { message }
  });
};

// AI搜索
const search = async (query) => {
  return request(API.ai.search, {
    method: 'POST',
    data: { query }
  });
};

// 获取聊天历史
const getChatHistory = async () => {
  return request(API.ai.history);
};

export default {
  getRecommendations,
  chat,
  search,
  getChatHistory
};
