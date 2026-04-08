import request, { invalidateRequestCache } from '../utils/request';
import API from '../config/api';

const start = () =>
  request(API.run.start, {
    method: 'POST'
  }).then((res) => {
    invalidateRequestCache('/run/');
    return res;
  });

const end = (payload) =>
  request(API.run.end, {
    method: 'POST',
    data: payload
  }).then((res) => {
    invalidateRequestCache('/run/');
    return res;
  });

const getHistory = () =>
  request(API.run.history, {
    cache: {
      ttl: 30 * 1000
    }
  });

const getRanking = () =>
  request(API.run.ranking, {
    cache: {
      ttl: 30 * 1000
    }
  });

const getTarget = () =>
  request(API.run.target, {
    cache: {
      ttl: 30 * 1000
    }
  });

export default {
  start,
  end,
  getHistory,
  getRanking,
  getTarget
};
