import request from '../utils/request';
import API from '../config/api';

const getCurrent = () => request(API.classGroup.current);

const sendMessage = (text) =>
  request(API.classGroup.messages, {
    method: 'POST',
    data: { text }
  });

export default {
  getCurrent,
  sendMessage
};
