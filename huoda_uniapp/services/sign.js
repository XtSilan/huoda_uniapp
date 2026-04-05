import request from '../utils/request';
import API from '../config/api';

const getOverview = () => request(API.sign.overview);

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

const getTeacherOverview = () => request(API.sign.teacherOverview);

const createTeacherBatch = (payload) =>
  request(API.sign.teacherBatchCreate, {
    method: 'POST',
    data: payload
  });

const reviewTeacherLeave = (id, payload) =>
  request(API.sign.teacherLeaveReview(id), {
    method: 'POST',
    data: payload
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
