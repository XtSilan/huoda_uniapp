import request from '../utils/request';
import API from '../config/api';

const getProfile = () => request(API.user.profile);

const updateProfile = (payload) =>
  request(API.user.profile, {
    method: 'PUT',
    data: payload
  });

export default {
  getProfile,
  updateProfile
};
