import request from '../utils/request';
import API from '../config/api';

const start = () =>
  request(API.run.start, {
    method: 'POST'
  });

const end = (payload) =>
  request(API.run.end, {
    method: 'POST',
    data: payload
  });

const getHistory = () => request(API.run.history);

const getRanking = () => request(API.run.ranking);

const getTarget = () => request(API.run.target);

export default {
  start,
  end,
  getHistory,
  getRanking,
  getTarget
};
