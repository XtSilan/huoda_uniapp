// 信息相关API服务
import request from '../utils/request';
import API from '../config/api';

// 构建查询字符串
const buildQueryString = (params) => {
  return Object.keys(params)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');
};

// 获取信息列表
const getInfoList = async (params) => {
  const query = buildQueryString(params);
  return request(`${API.info.list}?${query}`);
};

// 获取信息详情
const getInfoDetail = async (id) => {
  return request(`${API.info.detail}?id=${id}`);
};

// 收藏信息
const collectInfo = async (infoId) => {
  return request(API.info.collect, {
    method: 'POST',
    data: { infoId }
  });
};

// 取消收藏
const uncollectInfo = async (infoId) => {
  return request(API.info.uncollect, {
    method: 'POST',
    data: { infoId }
  });
};

// 评论信息
const commentInfo = async (infoId, content) => {
  return request(API.info.comment, {
    method: 'POST',
    data: { infoId, content }
  });
};

// 搜索信息
const searchInfo = async (params) => {
  const query = buildQueryString(params);
  return request(`${API.info.search}?${query}`);
};

export default {
  getInfoList,
  getInfoDetail,
  collectInfo,
  uncollectInfo,
  commentInfo,
  searchInfo
};
