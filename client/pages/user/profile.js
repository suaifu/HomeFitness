// pages/user/profile.js - 个人中心（完整版：头像上传 + 真实API）
const app = getApp();
const api = require('../../services/api');
const { uploadAvatar } = require('../../services/upload');

Page({
  data: {
    userInfo: null,
    isLogged: false,

    menuItems: [
      { id: 'appointments', title: '我的预约', icon: '📅', url: '/pages/user-center/appointments/appointments' },
      { id: 'favorites', title: '我的收藏', icon: '❤️', url: '/pages/user-center/favorites/favorites' },
      { id: 'coaches', title: '我的教练', icon: '👨‍🏫', url: '/pages/user-center/coaches/coaches' },
      { id: 'orders', title: '我的订单', icon: '🧾', url: '/pages/order/list' },
      { id: 'address', title: '收货地址', icon: '📍', url: '/pages/user-center/address/address' },
      { id: 'coupons', title: '优惠券', icon: '🎫', url: '/pages/user-center/coupons/coupons' },
      { id: 'settings', title: '设置', icon: '⚙️', url: '/pages/user-center/settings/settings' }
    ],

    stats: {
      totalAppointments: 0,
      totalCoaches: 0,
      totalAmount: 0,
      pendingOrders: 0
    },

    settings: {
      notifications: true,
      locationService: true,
      wechatRunData: false
    },

    version: '1.0.0'
  },

  onLoad() {
    this.initPage();
  },

  onShow() {
    const token = wx.getStorageSync('token');
    const userInfo = wx.getStorageSync('userInfo');

    if (!token || !userInfo) {
      this.setData({ isLogged: false, userInfo: null });
      return;
    }

    this.setData({ isLogged: true, userInfo });
    this.loadUserData();
  },

  initPage() {
    const settings = wx.getStorageSync('settings') || this.data.settings;
    this.setData({ settings });

    try {
      const accountInfo = wx.getAccountInfoSync();
      this.setData({ version: accountInfo.miniProgram.version || '1.0.0' });
    } catch (e) { /* 非微信环境忽略 */ }
  },

  // 加载用户数据
  async loadUserData() {
    try {
      const profile = await api.getUserProfile();
      if (profile) {
        this.setData({ userInfo: profile });
        wx.setStorageSync('userInfo', profile);
      }
    } catch (error) {
      console.error('加载用户数据失败:', error);
    }
  },

  // 登录
  async login() {
    try {
      app.showLoading('登录中...');
      const result = await app.wxLogin();
      this.setData({ isLogged: true, userInfo: result.user });
      app.showSuccess('登录成功');
      this.loadUserData();
    } catch (error) {
      app.showError('登录失败');
    } finally {
      app.hideLoading();
    }
  },

  // 点击用户信息区域
  onUserInfoTap() {
    if (!this.data.isLogged) {
      // 跳转到登录页面
      wx.navigateTo({ url: '/pages/login/login' });
      return;
    }
    
    // 已登录：显示操作菜单
    wx.showActionSheet({
      itemList: ['修改头像', '修改昵称'],
      success: (res) => {
        if (res.tapIndex === 0) {
          this.onChangeAvatar();
        } else if (res.tapIndex === 1) {
          this.onChangeNickname();
        }
      }
    });
  },

  // 修改头像
  async onChangeAvatar() {
    try {
      app.showLoading('上传中...');
      
      const result = await uploadAvatar();
      
      if (result && result.url) {
        // 更新头像到服务器
        await api.updateUserProfile({ avatar_url: result.url });
        api.clearCache('profile');
        
        // 更新本地数据
        const userInfo = { ...this.data.userInfo, avatar_url: result.url };
        this.setData({ userInfo });
        wx.setStorageSync('userInfo', userInfo);
        
        app.showSuccess('头像更新成功');
      }
    } catch (error) {
      if (error.message !== 'cancel') {
        app.showError('头像上传失败');
      }
    } finally {
      app.hideLoading();
    }
  },

  // 修改昵称
  onChangeNickname() {
    wx.showModal({
      title: '修改昵称',
      editable: true,
      placeholderText: '请输入昵称',
      content: this.data.userInfo?.nickname || '',
      success: async (res) => {
        if (res.confirm && res.content && res.content.trim()) {
          try {
            await api.updateUserProfile({ nickname: res.content.trim() });
            api.clearCache('profile');
            
            const userInfo = { ...this.data.userInfo, nickname: res.content.trim() };
            this.setData({ userInfo });
            wx.setStorageSync('userInfo', userInfo);
            
            app.showSuccess('昵称更新成功');
          } catch (error) {
            app.showError('更新失败');
          }
        }
      }
    });
  },

  // 长按头像（快速操作）
  onAvatarLongPress() {
    if (!this.data.isLogged) return;
    
    wx.showActionSheet({
      itemList: ['查看大图', '更换头像'],
      success: (res) => {
        if (res.tapIndex === 0) {
          // 查看大图
          const avatar = this.data.userInfo?.avatar_url;
          if (avatar) {
            wx.previewImage({
              urls: [avatar],
              current: avatar
            });
          }
        } else {
          this.onChangeAvatar();
        }
      }
    });
  },

  // 点击菜单项
  onMenuItemTap(e) {
    const { id, url } = e.currentTarget.dataset;
    
    if (!url) {
      wx.showToast({ title: '功能开发中', icon: 'none' });
      return;
    }

    // 需要登录的页面
    const loginRequired = ['appointments', 'favorites', 'coaches', 'orders'];
    if (loginRequired.includes(id) && !this.data.isLogged) {
      wx.navigateTo({ url: '/pages/login/login' });
      return;
    }

    wx.navigateTo({ url });
  },

  // 登出
  onLogout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      confirmColor: '#FF6B6B',
      success: (res) => {
        if (res.confirm) {
          app.logout();
          this.setData({ isLogged: false, userInfo: null });
          wx.showToast({ title: '已退出登录', icon: 'success' });
        }
      }
    });
  },

  // 切换设置
  onSettingToggle(e) {
    const setting = e.currentTarget.dataset.setting;
    const currentValue = this.data.settings[setting];
    const newValue = !currentValue;

    this.setData({ [`settings.${setting}`]: newValue });
    wx.setStorageSync('settings', this.data.settings);

    if (setting === 'notifications' && newValue) {
      this.requestNotificationPermission();
    } else if (setting === 'locationService' && newValue) {
      this.requestLocationPermission();
    }
  },

  requestNotificationPermission() {
    // 订阅消息需要真实的模板ID，上线前需在微信后台申请并替换
    // 开发阶段跳过，避免使用占位符ID导致调用失败
    if (!wx.canIUse('requestSubscribeMessage')) {
      console.warn('当前版本不支持订阅消息');
      return;
    }
    wx.showToast({ title: '功能开发中', icon: 'none' });
  },

  requestLocationPermission() {
    wx.authorize({
      scope: 'scope.userLocation',
      success: () => console.log('位置权限已授权'),
      fail: () => {
        wx.showModal({
          title: '位置权限',
          content: '需要位置权限来推荐附近教练，是否前往设置开启？',
          confirmText: '去设置',
          success: (res) => { if (res.confirm) wx.openSetting(); }
        });
      }
    });
  },

  // 联系客服
  onContactService() {
    wx.showModal({
      title: '联系客服',
      content: '客服电话：400-123-4567\n服务时间：9:00-21:00',
      confirmText: '拨打',
      success: (res) => {
        if (res.confirm) wx.makePhoneCall({ phoneNumber: '4001234567' });
      }
    });
  },

  // 检查更新
  onCheckUpdate() {
    if (wx.canIUse('getUpdateManager')) {
      const updateManager = wx.getUpdateManager();
      updateManager.onCheckForUpdate((res) => {
        if (res.hasUpdate) {
          wx.showModal({
            title: '更新提示',
            content: '发现新版本，是否立即更新？',
            confirmText: '更新',
            success: (modalRes) => {
              if (modalRes.confirm) {
                updateManager.applyUpdate();
              }
            }
          });
        } else {
          wx.showToast({ title: '已是最新版本', icon: 'success' });
        }
      });
    } else {
      wx.showToast({ title: '已是最新版本', icon: 'success' });
    }
  },

  // 关于我们
  onAboutUs() {
    wx.showModal({
      title: '关于上门健身',
      content: `版本：${this.data.version}\n\n上门健身小程序致力于为用户提供专业的私人教练上门服务，让健身更便捷、更高效。`,
      showCancel: false
    });
  },

  // 清除缓存
  onClearCache() {
    wx.showModal({
      title: '清除缓存',
      content: '确定要清除所有缓存数据吗？',
      success: (res) => {
        if (res.confirm) {
          const keepKeys = ['token', 'userInfo'];
          const storageInfo = wx.getStorageInfoSync();
          storageInfo.keys.forEach(key => {
            if (!keepKeys.includes(key)) wx.removeStorageSync(key);
          });
          api.clearCache();
          wx.showToast({ title: '缓存已清除', icon: 'success' });
        }
      }
    });
  },

  // 隐私政策
  onPrivacyPolicy() {
    wx.navigateTo({ url: '/pages/extra/privacy/privacy' });
  },

  // 用户协议
  onUserAgreement() {
    wx.navigateTo({ url: '/pages/extra/agreement/agreement' });
  },

  onShareAppMessage() {
    return {
      title: '上门健身 - 专业教练上门服务',
      path: '/pages/index/index'
    };
  }
});
