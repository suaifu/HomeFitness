// pages/user/coupons/coupons.js - 优惠券页面
const app = getApp();
const api = require('../../../services/api');

Page({
  data: {
    // 当前 Tab
    currentTab: 0,
    tabs: ['可用', '已使用', '已过期'],
    
    // 优惠券列表
    availableCoupons: [],
    usedCoupons: [],
    expiredCoupons: [],
    
    // 加载状态
    loading: true,
    loadFailed: false
  },

  onLoad() {
    this._loaded = false;
    this.loadCoupons();
  },

  onShow() {
    // 首次由 onLoad 触发，后续由 onShow 刷新
    if (this._loaded) {
      this.loadCoupons();
    }
    this._loaded = true;
  },

  onPullDownRefresh() {
    this.loadCoupons();
  },

  // 切换 Tab
  onTabChange(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({ currentTab: index });
  },

  // 加载优惠券数据
  async loadCoupons() {
    this.setData({ loading: true, loadFailed: false });
    
    try {
      // 模拟优惠券数据（实际应从API获取）
      const coupons = this.getMockCoupons();
      
      this.setData({
        availableCoupons: coupons.filter(c => c.status === 'available'),
        usedCoupons: coupons.filter(c => c.status === 'used'),
        expiredCoupons: coupons.filter(c => c.status === 'expired'),
        loading: false
      });
      
    } catch (error) {
      console.error('加载优惠券失败:', error);
      this.setData({ loading: false, loadFailed: true });
    }
    
    wx.stopPullDownRefresh();
  },

  // 模拟优惠券数据
  getMockCoupons() {
    return [
      {
        id: 1,
        title: '新用户专享',
        subtitle: '首次下单立减50元',
        amount: 50,
        minAmount: 200,
        validUntil: '2026-06-30',
        status: 'available',
        type: 'discount'
      },
      {
        id: 2,
        title: '满减券',
        subtitle: '满300减80',
        amount: 80,
        minAmount: 300,
        validUntil: '2026-05-31',
        status: 'available',
        type: 'cash'
      },
      {
        id: 3,
        title: '课程折扣券',
        subtitle: '瑜伽课程8折',
        amount: 20,
        minAmount: 0,
        validUntil: '2026-06-15',
        status: 'available',
        type: 'percent'
      },
      {
        id: 4,
        title: '邀请好友券',
        subtitle: '好友首单返20元',
        amount: 20,
        minAmount: 0,
        validUntil: '2026-04-30',
        status: 'used',
        type: 'cash'
      },
      {
        id: 5,
        title: '限时优惠',
        subtitle: '减脂课程专享',
        amount: 30,
        minAmount: 150,
        validUntil: '2026-04-15',
        status: 'expired',
        type: 'discount'
      }
    ];
  },

  // 点击领取优惠券（可用券）
  onGetCoupon(e) {
    const couponId = e.currentTarget.dataset.id;
    const coupon = this.data.availableCoupons.find(c => c.id === couponId);
    
    if (!coupon) return;
    
    wx.showModal({
      title: '领取优惠券',
      content: `确定领取「${coupon.title}」吗？`,
      confirmText: '领取',
      confirmColor: '#FF6B6B',
      success: (res) => {
        if (res.confirm) {
          // 模拟领取成功
          wx.showToast({ title: '领取成功', icon: 'success' });
        }
      }
    });
  },

  // 使用优惠券
  onUseCoupon(e) {
    const couponId = e.currentTarget.dataset.id;
    const coupon = this.data.availableCoupons.find(c => c.id === couponId);
    
    if (!coupon) return;
    
    wx.showModal({
      title: '使用优惠券',
      content: `「${coupon.title}」\n${coupon.subtitle}\n\n确定使用此优惠券吗？`,
      confirmText: '去使用',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          // 跳转到教练列表
          wx.switchTab({ url: '/pages/coach/list' });
        }
      }
    });
  },

  // 查看优惠券详情
  onCouponDetail(e) {
    const couponId = e.currentTarget.dataset.id;
    let coupon = null;
    
    switch (this.data.currentTab) {
      case 0:
        coupon = this.data.availableCoupons.find(c => c.id === couponId);
        break;
      case 1:
        coupon = this.data.usedCoupons.find(c => c.id === couponId);
        break;
      case 2:
        coupon = this.data.expiredCoupons.find(c => c.id === couponId);
        break;
    }
    
    if (!coupon) return;
    
    let statusText = '';
    switch (coupon.status) {
      case 'available':
        statusText = '有效期至 ' + coupon.validUntil;
        break;
      case 'used':
        statusText = '已于 ' + coupon.validUntil + ' 使用';
        break;
      case 'expired':
        statusText = '已于 ' + coupon.validUntil + ' 到期';
        break;
    }
    
    wx.showModal({
      title: coupon.title,
      content: `${coupon.subtitle}\n\n${statusText}\n\n使用条件：${coupon.minAmount > 0 ? '满' + coupon.minAmount + '元可用' : '无门槛使用'}`,
      showCancel: false,
      confirmText: '知道了'
    });
  },

  // 重试加载
  onRetryLoad() {
    this.loadCoupons();
  },

  // 查看全部教练（从空状态触发）
  onViewAllCoaches() {
    wx.switchTab({ url: '/pages/coach/list' });
  },

  onShareAppMessage() {
    return {
      title: '上门健身 - 优惠券中心',
      path: '/pages/user-center/coupons/coupons'
    };
  }
});
