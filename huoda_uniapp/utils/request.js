import { clearSession, getToken, redirectToLogin } from './session';

let redirecting = false;
const CACHE_PREFIX = '__http_cache__:';
const DEFAULT_CACHE_TTL = 30 * 1000;
const memoryCache = new Map();
const pendingRequests = new Map();

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

const normalizeMethod = (method = 'GET') => String(method || 'GET').toUpperCase();

const safeClone = (value) => {
  if (value === null || value === undefined) {
    return value;
  }
  if (typeof value !== 'object') {
    return value;
  }
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (_error) {
    return value;
  }
};

const stableStringify = (value) => {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value !== 'object') {
    return String(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${key}:${stableStringify(value[key])}`)
    .join(',')}}`;
};

const buildCacheKey = ({ url, method, data, key, token }) => {
  if (key) {
    return key;
  }
  const requestData = data && Object.keys(data).length ? `|${stableStringify(data)}` : '';
  const tokenPart = token ? `|u:${token.slice(-16)}` : '|u:guest';
  return `${method}:${url}${requestData}${tokenPart}`;
};

const toStorageKey = (key) => `${CACHE_PREFIX}${key}`;

const readStorageCachePayload = (cacheKey) => {
  try {
    const payload = uni.getStorageSync(toStorageKey(cacheKey));
    if (!payload || typeof payload !== 'object') {
      return null;
    }
    if (!payload.expireAt || payload.expireAt <= Date.now()) {
      return null;
    }
    return payload;
  } catch (_error) {
    return null;
  }
};

const readCache = (cacheKey) => {
  const memoryPayload = memoryCache.get(cacheKey);
  if (memoryPayload && memoryPayload.expireAt > Date.now()) {
    return safeClone(memoryPayload.data);
  }
  if (memoryPayload) {
    memoryCache.delete(cacheKey);
  }

  const storagePayload = readStorageCachePayload(cacheKey);
  if (storagePayload !== null) {
    memoryCache.set(cacheKey, {
      data: safeClone(storagePayload.data),
      expireAt: storagePayload.expireAt
    });
    return safeClone(storagePayload.data);
  }
  return null;
};

const writeCache = (cacheKey, data, ttl) => {
  if (ttl <= 0) {
    return;
  }
  const expireAt = Date.now() + ttl;
  const payload = {
    data: safeClone(data),
    expireAt
  };
  memoryCache.set(cacheKey, payload);
  try {
    uni.setStorageSync(toStorageKey(cacheKey), payload);
  } catch (_error) {}
};

const normalizeCacheOptions = (cache, method) => {
  if (normalizeMethod(method) !== 'GET' || !cache) {
    return null;
  }
  if (cache === true) {
    return {
      ttl: DEFAULT_CACHE_TTL,
      key: '',
      staleIfError: true
    };
  }
  return {
    ttl: Number(cache.ttl) > 0 ? Number(cache.ttl) : DEFAULT_CACHE_TTL,
    key: cache.key || '',
    staleIfError: cache.staleIfError !== false
  };
};

const request = (url, options = {}) => {
  const token = getToken();
  const method = normalizeMethod(options.method);
  const cacheOptions = normalizeCacheOptions(options.cache, method);
  const cacheKey = cacheOptions
    ? buildCacheKey({ url, method, data: options.data || {}, key: cacheOptions.key, token })
    : '';

  if (cacheOptions) {
    const cachedData = readCache(cacheKey);
    if (cachedData !== null) {
      return Promise.resolve(cachedData);
    }
    if (pendingRequests.has(cacheKey)) {
      return pendingRequests.get(cacheKey);
    }
  }

  const currentRequest = new Promise((resolve, reject) => {
    uni.request({
      url,
      method,
      data: options.data || {},
      timeout: options.timeout || 10000,
      header: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.header || {})
      },
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          if (cacheOptions) {
            writeCache(cacheKey, res.data, cacheOptions.ttl);
          }
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
  }).catch((error) => {
    if (cacheOptions && cacheOptions.staleIfError) {
      const fallbackPayload = readStorageCachePayload(cacheKey);
      if (fallbackPayload !== null) {
        return safeClone(fallbackPayload.data);
      }
    }
    throw error;
  }).finally(() => {
    if (cacheOptions) {
      pendingRequests.delete(cacheKey);
    }
  });

  if (cacheOptions) {
    pendingRequests.set(cacheKey, currentRequest);
  }

  return currentRequest;
};

export const invalidateRequestCache = (matcher = '') => {
  const keyword = String(matcher || '');
  const removeByCacheKey = (cacheKey) => {
    if (!keyword || cacheKey.includes(keyword)) {
      memoryCache.delete(cacheKey);
      try {
        uni.removeStorageSync(toStorageKey(cacheKey));
      } catch (_error) {}
    }
  };

  Array.from(memoryCache.keys()).forEach(removeByCacheKey);

  try {
    const storageInfo = uni.getStorageInfoSync();
    (storageInfo.keys || [])
      .filter((key) => key.startsWith(CACHE_PREFIX))
      .forEach((storageKey) => {
        const cacheKey = storageKey.slice(CACHE_PREFIX.length);
        removeByCacheKey(cacheKey);
      });
  } catch (_error) {}
};

export const toQueryString = (params = {}) =>
  Object.keys(params)
    .filter((key) => params[key] !== undefined && params[key] !== null && params[key] !== '')
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');

export default request;
