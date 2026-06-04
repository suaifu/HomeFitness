// pages/course/confirm.js - 预约确认（优化版：Storage传参 + 真实API）
const app = getApp();
const api = require('../../../services/api');
const { requestSubscription } = require('../../../services/payment');

Page({
  data: {
    bookingInfo: null,
    agreeTerms: false,
    submitting: false,
    // 联系信息（用户可编辑）
    contactName: '',
    contactPhone: '',
    address: ''
  },

  onLoad(options) {
    // 从 Storage 获取预约数据（替代 URL 参数传递，避免长度限制）
    const bookingInfo = wx.getStorageSync('pendingBooking');
    if (bookingInfo) {
      this.setData({ bookingInfo });

      // 预填用户资料
      const userInfo = wx.getStorageSync('userInfo') || app.globalData.userInfo || {};
      this.setData({
        contactName: userInfo.nickname || userInfo.name || '',
        contactPhone: userInfo.phone || '',
        address: (bookingInfo.address?.detail) || userInfo.default_address || ''
      });
    } else {
      wx.showToast({ title: '预约信息丢失', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1500);
    }
  },

  // 表单输入
  onContactNameInput(e) { this.setData({ contactName: e.detail.value }); },
  onContactPhoneInput(e) { this.setData({ contactPhone: e.detail.value }); },
  onAddressInput(e) { this.setData({ address: e.detail.value }); },

  onToggleAgreement() {
    this.setData({ agreeTerms: !this.data.agreeTerms });
  },

  async onConfirmBooking() {
    // 防止重复提交
    if (this.data.submitting) return;
    this.setData({ submitting: true });

    // 校验服务条款
    if (!this.data.agreeTerms) {
      wx.showToast({ title: '请先勾选同意服务条款', icon: 'none', duration: 2000 });
      this.setData({ submitting: false });
      return;
    }

    const { contactName, contactPhone, address, bookingInfo } = this.data;

    // 前端校验
    if (!(contactName || '').trim()) {
      wx.showToast({ title: '请填写联系人姓名', icon: 'none', duration: 2000 });
      this.setData({ submitting: false });
      return;
    }
    if (!(contactPhone || '').trim() || !/^1\d{10}$/.test((contactPhone || '').trim())) {
      wx.showToast({ title: '请填写正确的11位手机号', icon: 'none', duration: 2000 });
      this.setData({ submitting: false });
      return;
    }
    if (!(address || '').trim()) {
      wx.showToast({ title: '请填写上门服务地址', icon: 'none', duration: 2000 });
      this.setData({ submitting: false });
      return;
    }
    if (!bookingInfo) {
      wx.showToast({ title: '预约信息丢失，请返回重试', icon: 'none', duration: 2000 });
      this.setData({ submitting: false });
      return;
    }

    // 检查登录状态
    if (!app.globalData.token) {
      this.setData({ submitting: false });
      wx.showModal({
        title: '提示',
        content: '请先登录再预约',
        confirmColor: '#FF6B6B',
        success: (res) => {
          if (res.confirm) {
            app.wxLogin().then(() => this.submitBooking(bookingInfo));
          }
        }
      });
      return;
    }

    // 订阅消息必须在用户点击中直接同步调用
    requestSubscription();

    await this.submitBooking(bookingInfo);
  },

  // 提交预约到后端
  async submitBooking(bookingInfo) {
    wx.showLoading({ title: '提交中...', mask: true });

    try {
      // Step 1: 创建预约
      const booking = await api.createBooking({
        coach_id: bookingInfo.coachId,
        booking_date: bookingInfo.fullDate,
        booking_time: bookingInfo.time,
        address: (this.data.address || '').trim(),
        contact_name: (this.data.contactName || '').trim(),
        contact_phone: (this.data.contactPhone || '').trim(),
        remark: bookingInfo.remark || ''
      });

      if (!booking || !booking.id) {
        wx.hideLoading();
        this.setData({ submitting: false });
        wx.showModal({
          title: '预约异常',
          content: '预约数据异常，请稍后重试',
          showCancel: false
        });
        return;
      }

      // Step 2: 创建订单
      try {
        const order = await api.createOrder({
          booking_id: booking.id,
          amount: bookingInfo.price || 0
        });

        wx.hideLoading();
        this.setData({ submitting: false });

        // 清除预约 + 订单缓存
        api.clearCache('bookings');
        api.clearCache('orders');
        wx.showToast({ title: '预约成功！', icon: 'success', duration: 1500 });

        // 跳转订单详情
        const jumpId = order?.id || booking.id;
        const jumpUrl = order?.id
          ? `/pages/extra/order-detail/detail?id=${order.id}`
          : `/pages/user-center/appointments/appointments`;

        setTimeout(() => {
          wx.redirectTo({ url: jumpUrl });
        }, 1500);
      } catch (orderErr) {
        // 订单创建失败，但预约已成功
        wx.hideLoading();
        this.setData({ submitting: false });
        console.error('创建订单失败（预约已成功）:', orderErr);

        wx.showModal({
          title: '预约已提交',
          content: `预约已成功，但订单创建失败：${orderErr.message || '未知错误'}`,
          confirmText: '查看预约',
          confirmColor: '#FF6B6B',
          success: (res) => {
            if (res.confirm) {
              wx.redirectTo({ url: `/pages/user-center/appointments/appointments` });
            }
          }
        });
      }
    } catch (error) {
      wx.hideLoading();
      this.setData({ submitting: false });
      console.error('预约提交失败:', error);

      const errMsg = error.message || error.errMsg || '请稍后重试';
      wx.showModal({
        title: '预约提交失败',
        content: errMsg,
        showCancel: false,
        confirmColor: '#FF6B6B'
      });
    }
  },

  onContactService() {
    wx.makePhoneCall({ phoneNumber: '400-123-4567' });
  },

  // 分享预约成功
  onShareAppMessage() {
    return {
      title: '我预约了上门健身教练，快来体验吧！',
      path: '/pages/index/index',
      imageUrl: '/images/banner1.png'
    };
  },

  onShareTimeline() {
    return {
      title: '上门健身 - 专业教练上门服务',
      imageUrl: '/images/banner1.png'
    };
  }
});
