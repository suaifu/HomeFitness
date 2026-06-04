// pages/privacy/privacy.js - 隐私政策
Page({
  data: {
    lastUpdate: '2026年5月14日'
  },

  onLoad() {
    wx.setNavigationBarTitle({ title: '隐私政策' });
  },

  // 复制联系方式
  onCopyContact() {
    wx.setClipboardData({
      data: 'service@homefitness.com',
      success: () => {
        wx.showToast({ title: '已复制', icon: 'success' });
      }
    });
  }
});
