// app.js - 上门健身小程序入口文件（瘦身版）
const { CATEGORIES } = require('./utils/constants');
const ui = require('./utils/ui');

App({
  onLaunch() {
    console.log('上门健身小程序启动');

    // 检查登录状态
    this.checkLogin();

    // 获取系统信息
    try {
      const systemInfo = wx.getSystemInfoSync();
      this.globalData.systemInfo = systemInfo;
      this.globalData.isIPhoneX = /iphone/gi.test(systemInfo.model) && (systemInfo.safeArea.bottom - systemInfo.screenHeight > 0);
      this.globalData.statusBarHeight = systemInfo.statusBarHeight || 20;
    } catch (e) {
      console.warn('获取系统信息失败:', e);
    }

    // 检查小程序更新
    ui.checkUpdate();

    // 网络状态监听
    this._initNetworkMonitor();
  },

  // 全局错误处理
  onError(err) {
    console.error('小程序全局错误:', err);
    if (this.globalData.apiBaseUrl && !this.globalData.apiBaseUrl.includes('localhost')) {
      wx.request({
        url: `${this.globalData.apiBaseUrl}/api/log/error`,
        method: 'POST',
        data: { error: String(err), timestamp: Date.now(), systemInfo: this.globalData.systemInfo }
      }).catch(() => {});
    }
  },

  // 页面不存在处理
  onPageNotFound() {
    wx.switchTab({ url: '/pages/index/index' });
  },

  globalData: {
    userInfo: null,
    token: null,
    systemInfo: null,
    isIPhoneX: false,
    statusBarHeight: 20,
    apiBaseUrl: '',
    categories: CATEGORIES,
    _isRefreshing: false,
    _refreshSubscribers: [],
    isOffline: false, // 网络离线状态
  },

  // 设置 API 地址（根据环境）
  _initApiUrl() {
    const envVersion = __wxConfig ? __wxConfig.envVersion : 'develop';
    switch (envVersion) {
      case 'release':
        this.globalData.apiBaseUrl = 'https://api.fitness.com';
        break;
      case 'trial':
        this.globalData.apiBaseUrl = 'https://trial-api.fitness.com';
        break;
      default:
        this.globalData.apiBaseUrl = 'http://localhost:3000';
    }
  },

  // 检查登录状态
  checkLogin() {
    this._initApiUrl();
    const token = wx.getStorageSync('token');
    if (token) {
      this.globalData.token = token;
      const tokenExpiry = wx.getStorageSync('tokenExpiry');
      if (tokenExpiry && Date.now() > tokenExpiry - 5 * 60 * 1000) {
        this.refreshToken();
      }
    }
  },

  // 微信登录
  wxLogin() {
    return new Promise((resolve, reject) => {
      wx.login({
        success: (res) => {
          if (res.code) {
            this.loginWithCode(res.code).then(resolve).catch(reject);
          } else {
            reject(new Error('微信登录失败'));
          }
        },
        fail: () => reject(new Error('微信登录接口调用失败'))
      });
    });
  },

  // 通过 code 换取 token
  async loginWithCode(code) {
    try {
      const response = await this.request('/auth/login', 'POST', { code });
      if (response.token) {
        this.saveToken(response.token);
        if (response.user) {
          this.globalData.userInfo = response.user;
          wx.setStorageSync('userInfo', response.user);
        }
        return response;
      }
      throw new Error('获取token失败');
    } catch (error) {
      console.error('登录错误:', error);
      throw error;
    }
  },

  // 保存 Token
  saveToken(token) {
    this.globalData.token = token;
    wx.setStorageSync('token', token);
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp) {
        wx.setStorageSync('tokenExpiry', payload.exp * 1000);
      }
    } catch (e) { /* JWT 解析失败不影响使用 */ }
  },

  // 刷新 Token
  async refreshToken() {
    if (this.globalData._isRefreshing) {
      return new Promise((resolve) => {
        this.globalData._refreshSubscribers.push(resolve);
      });
    }

    this.globalData._isRefreshing = true;

    try {
      const userId = this.globalData.userInfo?.id || wx.getStorageSync('userInfo')?.id;
      if (!userId) throw new Error('无用户信息');

      const response = await this.request('/auth/refresh', 'POST', { userId }, true);
      if (response.token) {
        this.saveToken(response.token);
        this.globalData._refreshSubscribers.forEach(cb => cb(response.token));
        this.globalData._refreshSubscribers = [];
        return response.token;
      }
    } catch (error) {
      this.logout();
      throw error;
    } finally {
      this.globalData._isRefreshing = false;
    }
  },

  // 登出
  logout() {
    this.globalData.token = null;
    this.globalData.userInfo = null;
    wx.removeStorageSync('token');
    wx.removeStorageSync('userInfo');
    wx.removeStorageSync('tokenExpiry');
  },

  // 网络状态监听
  _initNetworkMonitor() {
    // 初始检测
    wx.getNetworkType({
      success: (res) => {
        this.globalData.isOffline = res.networkType === 'none';
      }
    });

    // 持续监听
    wx.onNetworkStatusChange((res) => {
      const wasOffline = this.globalData.isOffline;
      this.globalData.isOffline = !res.isConnected;

      // 从离线恢复到在线
      if (wasOffline && res.isConnected) {
        ui.showSuccess('网络已恢复');
      }

      // 从在线变为离线
      if (!wasOffline && !res.isConnected) {
        ui.showError('网络已断开，部分功能不可用');
      }
    });
  },

  // --- UI 辅助方法（代理到 utils/ui.js，保持向后兼容）---
  showLoading(title) { ui.showLoading(title); },
  hideLoading() { ui.hideLoading(); },
  showSuccess(title) { ui.showSuccess(title); },
  showError(title) { ui.showError(title); },

  // 统一请求方法（增强版：离线检测 + 自动重试1次）
  request(url, method = 'GET', data = {}, skipAuthRefresh = false, _retryCount = 0) {
    // 离线检测
    if (this.globalData.isOffline) {
      ui.showError('网络不可用，请检查网络连接');
      return Promise.reject(new Error('网络不可用'));
    }

    return new Promise((resolve, reject) => {
      const token = this.globalData.token;

      wx.request({
        url: `${this.globalData.apiBaseUrl}/api${url}`,
        method,
        data,
        timeout: 15000,
        header: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
          'X-Request-ID': `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        },
        success: (res) => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(res.data?.data !== undefined ? res.data.data : res.data);
          } else if (res.statusCode === 401 && !skipAuthRefresh) {
            this.refreshToken()
              .then(() => this.request(url, method, data, true, 0).then(resolve).catch(reject))
              .catch(() => {
                this.logout();
                ui.showError('登录已过期，请重新登录');
                reject(new Error('token过期'));
              });
          } else if (res.statusCode === 401) {
            this.logout();
            ui.showError('登录已过期，请重新登录');
            reject(new Error('token过期'));
          } else {
            reject(new Error(res.data?.message || '请求失败'));
          }
        },
        fail: (err) => {
          console.error('请求失败:', err);
          // 自动重试1次（仅网络错误/超时，不重试业务错误）
          if (_retryCount < 1) {
            console.log(`请求自动重试: ${url} (第${_retryCount + 1}次)`);
            setTimeout(() => {
              this.request(url, method, data, skipAuthRefresh, _retryCount + 1)
                .then(resolve)
                .catch(reject);
            }, 1000); // 1秒后重试
            return;
          }
          ui.showError(err.errMsg?.includes('timeout') ? '请求超时，请重试' : '网络错误，请检查网络连接');
          reject(new Error('网络错误'));
        }
      });
    });
  }
});
