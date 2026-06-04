// pages/user/settings/settings.js - 设置页面
const app = getApp();
const api = require('../../../services/api');

Page({
  data: {
    // 消息通知设置
    settings: {
      notifications: true,
      locationService: true,
      wechatRunData: false,
      personalized: false
    },

    // 版本信息
    version: '1.0.0',
    hasNewVersion: false,

    // 缓存大小
    cacheSize: '0 KB'
  },

  onLoad() {
    this.initSettings();
    this.calculateCacheSize();
  },

  onShow() {
    // 每次进入刷新设置
    this.initSettings();
  },

  initSettings() {
    // 从本地存储加载设置
    const savedSettings = wx.getStorageSync('settings') || {};
    this.setData({ settings: { ...this.data.settings, ...savedSettings } });

    // 获取版本号
    try {
      const accountInfo = wx.getAccountInfoSync();
      this.setData({ version: accountInfo.miniProgram.version || '1.0.0' });
    } catch (e) {
      this.setData({ version: '1.0.0' });
    }
  },

  // 计算缓存大小
  calculateCacheSize() {
    try {
      const storageInfo = wx.getStorageInfoSync();
      // 使用微信自带的缓存大小统计（单位 KB）
      const totalSizeKB = storageInfo.currentSize || 0;

      // 加上 API 内存缓存估算
      const apiCacheCount = api.getCacheCount ? api.getCacheCount() : 0;
      const apiCacheKB = apiCacheCount * 1; // 每条估算 1KB

      const totalKB = totalSizeKB + apiCacheKB;

      let cacheSize;
      if (totalKB > 1024) {
        cacheSize = (totalKB / 1024).toFixed(2) + ' MB';
      } else {
        cacheSize = totalKB + ' KB';
      }

      this.setData({ cacheSize });
    } catch (e) {
      this.setData({ cacheSize: '未知' });
    }
  },

  // 切换设置开关
  onToggleSetting(e) {
    const setting = e.currentTarget.dataset.setting;
    const currentValue = this.data.settings[setting];
    const newValue = !currentValue;

    this.setData({ [`settings.${setting}`]: newValue });

    // 保存到本地存储
    wx.setStorageSync('settings', this.data.settings);

    // 根据设置类型执行相应操作
    this.handleSettingChange(setting, newValue);
  },

  // 处理设置变更
  handleSettingChange(setting, value) {
    switch (setting) {
      case 'notifications':
        if (value) {
          this.requestNotificationPermission();
        } else {
          wx.showToast({ title: '已关闭消息通知', icon: 'none' });
        }
        break;

      case 'locationService':
        if (value) {
          this.requestLocationPermission();
        } else {
          wx.showToast({ title: '已关闭位置服务', icon: 'none' });
        }
        break;

      case 'wechatRunData':
        if (value) {
          this.requestWechatRunPermission();
        }
        break;

      case 'personalized':
        wx.showToast({
          title: value ? '已开启个性化推荐' : '已关闭个性化推荐',
          icon: 'none'
        });
        break;
    }
  },

  // 请求通知权限
  requestNotificationPermission() {
    wx.requestSubscribeMessage({
      tmplIds: [
        'BOOKING_REMINDER_TPL',    // 预约提醒
        'COACH_ARRIVAL_TPL',       // 教练到达提醒
        'ORDER_STATUS_TPL'         // 订单状态提醒
      ],
      success: (res) => {
        const accepted = Object.values(res).filter(v => v === 'accept').length;
        if (accepted > 0) {
          wx.showToast({ title: `已开启${accepted}个通知`, icon: 'success' });
        }
      },
      fail: (err) => {
        console.warn('订阅消息失败:', err);
        wx.showToast({ title: '请到设置中开启通知', icon: 'none' });
      }
    });
  },

  // 请求位置权限
  requestLocationPermission() {
    wx.getLocation({
      type: 'gcj02',
      success: () => {
        wx.showToast({ title: '位置服务已开启', icon: 'success' });
      },
      fail: () => {
        wx.showModal({
          title: '位置权限',
          content: '需要位置权限来推荐附近教练，是否前往设置开启？',
          confirmText: '去设置',
          success: (res) => {
            if (res.confirm) {
              wx.openSetting();
            } else {
              // 用户取消，恢复开关状态
              this.setData({ 'settings.locationService': false });
              wx.setStorageSync('settings', this.data.settings);
            }
          }
        });
      }
    });
  },

  // 请求微信运动权限
  requestWechatRunPermission() {
    wx.getWeRunData({
      success: (res) => {
        console.log('获取微信运动数据成功', res);
        wx.showToast({ title: '已同步微信运动数据', icon: 'success' });
      },
      fail: () => {
        wx.showModal({
          title: '微信运动权限',
          content: '需要授权获取微信运动数据来制定个性化训练计划',
          confirmText: '去设置',
          success: (res) => {
            if (res.confirm) {
              wx.openSetting();
            }
          }
        });
      }
    });
  },

  // 关于我们
  onAboutUs() {
    wx.showModal({
      title: '关于上门健身',
      content: `🏋️ 上门健身小程序

版本：${this.data.version}

致力于为用户提供专业的私人教练上门服务，让健身更便捷、更高效。

📍 服务覆盖：北京、上海、广州、深圳等一线城市

⏰ 服务时间：每天 8:00 - 22:00

📞 客服电话：400-888-8888`,
      showCancel: false,
      confirmText: '知道了'
    });
  },

  // 检查更新
  onCheckUpdate() {
    wx.showLoading({ title: '检查中...' });

    // 模拟检查更新（实际应调用 wx.getUpdateManager）
    setTimeout(() => {
      wx.hideLoading();

      const updateManager = wx.getUpdateManager();

      updateManager.onCheckForUpdate((res) => {
        if (res.hasUpdate) {
          wx.showModal({
            title: '发现新版本',
            content: '有新版本可用，是否立即更新？',
            confirmText: '更新',
            cancelText: '稍后',
            success: (res) => {
              if (res.confirm) {
                this.downloadUpdate();
              }
            }
          });
        } else {
          wx.showToast({ title: '已是最新版本', icon: 'success' });
        }
      });

      updateManager.onUpdateReady(() => {
        wx.showModal({
          title: '更新提示',
          content: '新版本已准备好，是否重启应用？',
          confirmText: '重启',
          success: (res) => {
            if (res.confirm) {
              updateManager.applyUpdate();
            }
          }
        });
      });

      updateManager.onUpdateFailed(() => {
        wx.showModal({
          title: '更新失败',
          content: '新版本下载失败，请检查网络后重试',
          confirmText: '知道了'
        });
      });
    }, 1000);
  },

  // 下载更新
  downloadUpdate() {
    wx.showLoading({ title: '下载中...' });

    setTimeout(() => {
      wx.hideLoading();
      wx.showToast({ title: '下载完成', icon: 'success' });
    }, 3000);
  },

  // 清除缓存
  onClearCache() {
    wx.showModal({
      title: '清除缓存',
      content: `当前缓存：${this.data.cacheSize}\n\n确定要清除所有缓存数据吗？`,
      confirmText: '清除',
      cancelText: '取消',
      confirmColor: '#FF6B6B',
      success: (res) => {
        if (res.confirm) {
          // 保留登录信息
          const token = wx.getStorageSync('token');
          const userInfo = wx.getStorageSync('userInfo');
          const settings = wx.getStorageSync('settings');

          // 清除所有缓存
          wx.clearStorageSync();

          // 恢复必要数据
          if (token) wx.setStorageSync('token', token);
          if (userInfo) wx.setStorageSync('userInfo', userInfo);
          if (settings) wx.setStorageSync('settings', settings);

          // 清除 API 缓存
          api.clearCache();

          // 重新计算缓存大小
          this.calculateCacheSize();

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

  // 联系客服
  onContactService() {
    wx.showModal({
      title: '联系客服',
      content: '📞 客服电话：400-888-8888\n\n⏰ 服务时间：每天 8:00 - 22:00\n\n💬 您也可以在公众号留言，我们会尽快回复',
      confirmText: '拨打',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          wx.makePhoneCall({
            phoneNumber: '4008888888',
            fail: () => {
              wx.showToast({ title: '拨打失败', icon: 'none' });
            }
          });
        }
      }
    });
  },

  // 常见问题
  onFAQ() {
    wx.showModal({
      title: '常见问题',
      content: `Q: 如何预约教练？
A: 在首页选择教练，查看详情后点击预约即可。

Q: 预约后可以取消吗？
A: 可以在预约时间前2小时取消，取消规则请查看用户协议。

Q: 如何支付？
A: 支持微信支付，非常便捷。

Q: 教练资质有保障吗？
A: 所有教练均经过严格审核，持证上岗。

如需更多帮助，请联系客服。`,
      showCancel: false,
      confirmText: '知道了'
    });
  },

  // 退出登录
  onLogout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      confirmText: '退出',
      cancelText: '取消',
      confirmColor: '#FF6B6B',
      success: (res) => {
        if (res.confirm) {
          app.logout();
          // 返回首页
          wx.switchTab({ url: '/pages/index/index' });
          wx.showToast({ title: '已退出登录', icon: 'success' });
        }
      }
    });
  },

  onShareAppMessage() {
    return {
      title: '上门健身 - 专业教练上门服务',
      path: '/pages/index/index'
    };
  }
});
