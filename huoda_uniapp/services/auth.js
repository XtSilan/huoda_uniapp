import request from '../utils/request';
import API from '../config/api';

const login = (payload) =>
  request(API.auth.login, {
    method: 'POST',
    data: payload
  });

const refresh = () =>
  request(API.auth.refresh, {
    method: 'POST'
  });

export default {
  login,
  refresh
};
