// services/api.js - 统一API服务（优化版）
// 注意：不要在模块顶层调用 getApp()，因为此时 App() 可能还未初始化

let _app = null;
function getAppInstance() {
  if (!_app) {
    _app = getApp();
  }
  return _app;
}

// 请求缓存
const _cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存

// 请求去重（避免同一请求重复发送）
const _pendingRequests = new Map();

/**
 * 统一请求方法
 */
function request(url, method = 'GET', data = {}, options = {}) {
  const app = getAppInstance();
  const { cache = false, cacheKey = '', dedup = true } = options;

  // 缓存检查（仅 GET 请求）
  if (cache && method === 'GET') {
    const key = cacheKey || `${method}:${url}:${JSON.stringify(data)}`;
    const cached = _cache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return Promise.resolve(cached.data);
    }
  }

  // 请求去重
  if (dedup && method === 'GET') {
    const dedupKey = `${method}:${url}:${JSON.stringify(data)}`;
    if (_pendingRequests.has(dedupKey)) {
      return _pendingRequests.get(dedupKey);
    }
  }

  const promise = app.request(url, method, data)
    .then(res => {
      // 写入缓存
      if (cache && method === 'GET') {
        const key = cacheKey || `${method}:${url}:${JSON.stringify(data)}`;
        _cache.set(key, { data: res, timestamp: Date.now() });
      }

      // 移除去重记录
      if (dedup && method === 'GET') {
        const dedupKey = `${method}:${url}:${JSON.stringify(data)}`;
        _pendingRequests.delete(dedupKey);
      }

      return res;
    })
    .catch(err => {
      // 移除去重记录（即使失败也要移除）
      if (dedup && method === 'GET') {
        const dedupKey = `${method}:${url}:${JSON.stringify(data)}`;
        _pendingRequests.delete(dedupKey);
      }
      throw err;
    });

  // 记录进行中的请求
  if (dedup && method === 'GET') {
    const dedupKey = `${method}:${url}:${JSON.stringify(data)}`;
    _pendingRequests.set(dedupKey, promise);
  }

  return promise;
}

/**
 * 清除缓存
 */
function clearCache(pattern) {
  if (pattern) {
    for (const [key] of _cache) {
      if (key.includes(pattern)) {
        _cache.delete(key);
      }
    }
  } else {
    _cache.clear();
  }
}

/**
 * 获取缓存条目数（供外部查询，不暴露内部 _cache）
 */
function getCacheCount() {
  return _cache.size;
}

/**
 * 预加载（空闲时发起请求）
 */
function preload(url, method = 'GET', data = {}) {
  if (wx.canIUse('request') && typeof wx.onNetworkStatusChange === 'function') {
    // 在下一个事件循环中执行，不阻塞当前任务
    setTimeout(() => {
      request(url, method, data, { cache: true }).catch(() => {});
    }, 0);
  }
}

// API方法
const api = {
  // 首页
  getHomeData: () => request('/home', 'GET', {}, { cache: true, cacheKey: 'home' }),
  getCategories: () => request('/home/categories', 'GET', {}, { cache: true, cacheKey: 'categories' }),
  getBanners: () => request('/home/banners', 'GET', {}, { cache: true, cacheKey: 'banners' }),

  // 教练
  getCoaches: (params) => request(`/coaches?${formatParams(params)}`, 'GET', {}, { dedup: true }),
  getCoachDetail: (id) => request(`/coaches/${id}`, 'GET', {}, { cache: true, cacheKey: `coach_${id}` }),

  // 预约
  getBookings: (status) => request(`/bookings${status ? `?status=${status}` : ''}`, 'GET', {}, { cache: true }),
  createBooking: (data) => request('/bookings', 'POST', data),
  cancelBooking: (id) => request(`/bookings/${id}/cancel`, 'PUT', {}),

  // 订单
  getOrders: (status) => request(`/orders${status ? `?status=${status}` : ''}`, 'GET', {}, { cache: true }),
  createOrder: (data) => request('/orders', 'POST', data),
  getOrderDetail: (id) => request(`/orders/${id}`, 'GET', {}, { cache: true }),
  payOrder: (id) => request(`/orders/${id}/pay`, 'POST', {}),
  cancelOrder: (id) => request(`/orders/${id}/cancel`, 'POST', {}),

  // 用户
  getUserProfile: () => request('/user/profile', 'GET', {}, { cache: true, cacheKey: 'profile' }),
  updateUserProfile: (data) => request('/user/profile', 'PUT', data),
  bindPhone: (code) => request('/user/phone', 'POST', { code }),

  // 登录
  login: (code) => request('/auth/login', 'POST', { code }),
  refreshToken: (userId) => request('/auth/refresh', 'POST', { userId }),

  // 验证码
  sendVerifyCode: (phone) => request('/auth/sendCode', 'POST', { phone }),
  verifyCode: (phone, code) => request('/auth/verifyCode', 'POST', { phone, code }),

  // 收藏
  getFavorites: () => request('/favorites', 'GET', {}, { cache: true, cacheKey: 'favorites' }),
  addFavorite: (coachId) => request(`/favorites/${coachId}`, 'POST', {}),
  removeFavorite: (coachId) => request(`/favorites/${coachId}`, 'DELETE', {}),
  checkFavorite: (coachId) => request(`/favorites/check/${coachId}`, 'GET', {}),
  phoneLogin: (code) => request('/auth/phoneLogin', 'POST', { code }),

  // 缓存管理
  clearCache,
  getCacheCount,
  preload,
};

function formatParams(params) {
  return Object.entries(params || {})
    .filter(([_, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&');
}

module.exports = api;
