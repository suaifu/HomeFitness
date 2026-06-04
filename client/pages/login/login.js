// pages/login/login.js - 登录页面（已对接后端API）
const app = getApp();
const api = require('../../services/api');

Page({
  data: {
    // 登录方式：wechat | phone
    loginType: 'wechat',
    
    // 手机号登录
    phoneNumber: '',
    verifyCode: '',
    verifyCodeText: '获取验证码',
    verifyCodeDisabled: false,
    countdown: 60,
    
    // 协议同意
    agreePrivacy: false,
    agreeTerms: false,
    
    // 登录状态
    loading: false,
    loadingText: ''
  },

  onLoad(options) {
    // 检查是否已经登录
    const token = wx.getStorageSync('token');
    const userInfo = wx.getStorageSync('userInfo');
    
    if (token && userInfo) {
      // 已登录，跳转到首页
      wx.switchTab({ url: '/pages/index/index' });
    }
    
    // 如果有 redirect 参数，跳转回来
    if (options.redirect) {
      this.redirectUrl = decodeURIComponent(options.redirect);
    }
  },

  // 切换登录方式
  switchLoginType(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({ loginType: type });
  },

  // 输入手机号
  onPhoneInput(e) {
    this.setData({ phoneNumber: e.detail.value });
  },

  // 输入验证码
  onVerifyCodeInput(e) {
    this.setData({ verifyCode: e.detail.value });
  },

  // 获取验证码
  onGetVerifyCode() {
    const phone = this.data.phoneNumber;
    
    // 验证手机号格式
    if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
      wx.showToast({ title: '请输入正确的手机号', icon: 'none' });
      return;
    }
    
    this.sendVerifyCode(phone);
  },

  // 发送验证码
  async sendVerifyCode(phone) {
    try {
      wx.showLoading({ title: '发送中...' });
      
      await app.request('/auth/sendCode', 'POST', { phone });
      
      wx.hideLoading();
      wx.showToast({ title: '验证码已发送', icon: 'success' });
      
      // 开始倒计时
      this.startCountdown();
      
    } catch (error) {
      wx.hideLoading();
      wx.showToast({ title: error.message || '发送失败，请重试', icon: 'none' });
    }
  },

  // 倒计时
  startCountdown() {
    let countdown = 60;
    this.setData({ 
      verifyCodeDisabled: true,
      countdown: countdown
    });
    
    const timer = setInterval(() => {
      countdown--;
      if (countdown <= 0) {
        clearInterval(timer);
        this.setData({
          verifyCodeDisabled: false,
          countdown: 60,
          verifyCodeText: '获取验证码'
        });
      } else {
        this.setData({
          verifyCodeText: `${countdown}秒后重试`
        });
      }
    }, 1000);
    
    this.countdownTimer = timer;
  },

  // 同意隐私协议
  onPrivacyChange(e) {
    this.setData({ agreePrivacy: e.detail.value.length > 0 });
  },

  // 同意用户协议
  onTermsChange(e) {
    this.setData({ agreeTerms: e.detail.value.length > 0 });
  },

  // 微信一键登录
  onWechatLogin() {
    if (!this.data.agreePrivacy || !this.data.agreeTerms) {
      wx.showToast({ title: '请先同意相关协议', icon: 'none' });
      return;
    }
    
    this.doWechatLogin();
  },

  // 执行微信登录
  async doWechatLogin() {
    try {
      this.setData({ loading: true, loadingText: '正在登录...' });
      wx.showLoading({ title: '登录中...' });
      
      // 1. 获取微信 code
      const { code } = await this.wxLogin();
      
      // 2. 调用后端登录接口
      const loginResult = await this.loginWithWxCode(code);
      
      // 3. 保存登录信息并跳转
      this.saveLoginInfo(loginResult);
      this.onLoginSuccess();
      
    } catch (error) {
      wx.hideLoading();
      console.error('微信登录失败:', error);
      wx.showToast({ title: error.message || '登录失败，请重试', icon: 'none' });
      this.setData({ loading: false });
    }
  },

  // 微信登录
  wxLogin() {
    return new Promise((resolve, reject) => {
      wx.login({
        success: (res) => {
          if (res.code) {
            resolve({ code: res.code });
          } else {
            reject(new Error('获取微信code失败'));
          }
        },
        fail: reject
      });
    });
  },

  // 手机号登录
  async onPhoneLogin() {
    const { phoneNumber, verifyCode } = this.data;
    
    // 验证手机号
    if (!phoneNumber || !/^1[3-9]\d{9}$/.test(phoneNumber)) {
      wx.showToast({ title: '请输入正确的手机号', icon: 'none' });
      return;
    }
    
    // 验证验证码
    if (!verifyCode || verifyCode.length !== 6) {
      wx.showToast({ title: '请输入6位验证码', icon: 'none' });
      return;
    }
    
    // 检查协议同意
    if (!this.data.agreePrivacy || !this.data.agreeTerms) {
      wx.showToast({ title: '请先同意相关协议', icon: 'none' });
      return;
    }
    
    try {
      this.setData({ loading: true });
      wx.showLoading({ title: '登录中...' });
      
      // 调用后端API验证验证码并登录
      const loginResult = await app.request('/auth/verifyCode', 'POST', {
        phone: phoneNumber,
        code: verifyCode
      });
      
      // 保存登录信息并跳转
      this.saveLoginInfo(loginResult);
      this.onLoginSuccess();
      
    } catch (error) {
      wx.hideLoading();
      console.error('手机号登录失败:', error);
      wx.showToast({ title: error.message || '登录失败，请重试', icon: 'none' });
      this.setData({ loading: false });
    }
  },

  // 使用微信获取手机号
  onGetPhoneNumber(e) {
    if (e.detail.errMsg === 'getPhoneNumber:ok') {
      const { code } = e.detail;
      this.doWxPhoneLogin(code);
    } else {
      console.log('获取手机号失败:', e.detail.errMsg);
      // 用户拒绝时，提示使用其他方式登录
      wx.showToast({ title: '可使用手机号验证码登录', icon: 'none' });
    }
  },

  // 微信手机号登录
  async doWxPhoneLogin(phoneCode) {
    try {
      this.setData({ loading: true });
      wx.showLoading({ title: '登录中...' });
      
      // 调用后端API使用微信手机号登录
      const loginResult = await app.request('/auth/phoneLogin', 'POST', { code: phoneCode });
      
      // 保存登录信息并跳转
      this.saveLoginInfo(loginResult);
      this.onLoginSuccess();
      
    } catch (error) {
      wx.hideLoading();
      console.error('微信手机号登录失败:', error);
      wx.showToast({ title: error.message || '登录失败，请重试', icon: 'none' });
      this.setData({ loading: false });
    }
  },

  // 调用后端登录
  async loginWithWxCode(code) {
    return await app.request('/auth/login', 'POST', { code });
  },

  // 保存登录信息 — 复用 app.js 的 saveToken 逻辑
  saveLoginInfo(result) {
    const { token, user, userInfo: userProfile } = result;
    
    if (!token) {
      throw new Error('登录失败，未获取到token');
    }

    // 复用 app.saveToken 处理 JWT 解析和存储
    app.saveToken(token);

    // 保存用户信息
    const info = userProfile || user || {};
    app.globalData.userInfo = info;
    wx.setStorageSync('userInfo', info);

    this.setData({ loading: false });
  },

  // 登录成功后的统一处理（隐藏 loading、提示、跳转）
  onLoginSuccess() {
    wx.hideLoading();
    wx.showToast({ title: '登录成功', icon: 'success' });

    setTimeout(() => {
      if (this.redirectUrl) {
        wx.redirectTo({ url: this.redirectUrl });
      } else {
        wx.switchTab({ url: '/pages/index/index' });
      }
    }, 1500);
  },

  // 查看隐私政策
  onViewPrivacy() {
    wx.showModal({
      title: '隐私政策',
      content: '我们非常重视您的隐私保护。当您使用上门健身服务时，我们需要收集您的位置信息用于匹配附近教练，以及您的联系方式用于服务沟通。\n\n您的个人信息将严格保密，仅用于提供和改进服务。',
      showCancel: false,
      confirmText: '我已知晓'
    });
  },

  // 查看用户协议
  onViewTerms() {
    wx.showModal({
      title: '用户服务协议',
      content: '1. 服务说明\n上门健身平台为用户提供预约私教服务，用户需年满18周岁。\n\n2. 预约规则\n用户应提前24小时预约，如需取消请提前12小时。\n\n3. 费用说明\n课程费用按小时计费，以平台显示价格为准。\n\n4. 免责声明\n因用户自身健康原因导致的问题，平台不承担责任。',
      showCancel: false,
      confirmText: '我已知晓'
    });
  },

  // 跳过登录
  onSkip() {
    wx.switchTab({ url: '/pages/index/index' });
  },

  onUnload() {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
    }
  }
});
