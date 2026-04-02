import { clearSession, getToken, redirectToLogin } from './session';

let redirecting = false;

const handleUnauthorized = async (message) => {
  if (redirecting) {
    return;
  }
  redirecting = true;
  await clearSession();
  uni.showToast({ title: message || '登录已失效，请重新登录', icon: 'none' });
  setTimeout(() => {
    redirectToLogin();
    redirecting = false;
  }, 200);
};

const request = (url, options = {}) => {
  const token = getToken();

  return new Promise((resolve, reject) => {
    uni.request({
      url,
      method: options.method || 'GET',
      data: options.data || {},
      timeout: options.timeout || 10000,
      header: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.header || {})
      },
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
          return;
        }

        if ((res.statusCode === 401 || res.statusCode === 403) && token) {
          handleUnauthorized((res.data && res.data.message) || '登录已失效，请重新登录');
        }

        const message = (res.data && res.data.message) || '请求失败';
        reject(new Error(message));
      },
      fail: (error) => {
        reject(error);
      }
    });
  });
};

export const toQueryString = (params = {}) =>
  Object.keys(params)
    .filter((key) => params[key] !== undefined && params[key] !== null && params[key] !== '')
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');

export default request;
