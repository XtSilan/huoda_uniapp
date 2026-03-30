import request from '../utils/request';
import API from '../config/api';

const doSign = (payload) =>
  request(API.sign.do, {
    method: 'POST',
    data: payload
  });

const getHistory = () => request(API.sign.history);

const getStatistics = () => request(API.sign.statistics);

const applyLeave = (payload) =>
  request(API.sign.leave, {
    method: 'POST',
    data: payload
  });

export default {
  doSign,
  getHistory,
  getStatistics,
  applyLeave
};
