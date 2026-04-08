import request, { invalidateRequestCache } from '../utils/request';
import API from '../config/api';

const getOverview = () =>
  request(API.sign.overview, {
    cache: {
      ttl: 20 * 1000
    }
  });

const doSign = (payload) =>
  request(API.sign.do, {
    method: 'POST',
    data: payload
  }).then((res) => {
    invalidateRequestCache('/sign/');
    return res;
  });

const getHistory = () =>
  request(API.sign.history, {
    cache: {
      ttl: 30 * 1000
    }
  });

const getStatistics = () =>
  request(API.sign.statistics, {
    cache: {
      ttl: 30 * 1000
    }
  });

const applyLeave = (payload) =>
  request(API.sign.leave, {
    method: 'POST',
    data: payload
  }).then((res) => {
    invalidateRequestCache('/sign/');
    return res;
  });

const getTeacherOverview = () =>
  request(API.sign.teacherOverview, {
    cache: {
      ttl: 20 * 1000
    }
  });

const createTeacherBatch = (payload) =>
  request(API.sign.teacherBatchCreate, {
    method: 'POST',
    data: payload
  }).then((res) => {
    invalidateRequestCache('/sign/');
    return res;
  });

const reviewTeacherLeave = (id, payload) =>
  request(API.sign.teacherLeaveReview(id), {
    method: 'POST',
    data: payload
  }).then((res) => {
    invalidateRequestCache('/sign/');
    return res;
  });

export default {
  getOverview,
  doSign,
  getHistory,
  getStatistics,
  applyLeave,
  getTeacherOverview,
  createTeacherBatch,
  reviewTeacherLeave
};
