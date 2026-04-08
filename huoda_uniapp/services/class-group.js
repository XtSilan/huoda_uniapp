import request, { invalidateRequestCache } from '../utils/request';
import API from '../config/api';

const getCurrent = () =>
  request(API.classGroup.current, {
    cache: {
      ttl: 20 * 1000
    }
  });

const sendMessage = (text) =>
  request(API.classGroup.messages, {
    method: 'POST',
    data: { text }
  }).then((res) => {
    invalidateRequestCache('/class-group/');
    return res;
  });

export default {
  getCurrent,
  sendMessage
};
