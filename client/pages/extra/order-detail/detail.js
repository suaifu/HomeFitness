// pages/order/detail.js - 订单详情（优化版：真实API）
const app = getApp();
const api = require('../../../services/api');
const { getStatusText, getStatusColor } = require('../../../utils/constants');
const { payOrder, requestSubscription } = require('../../../services/payment');

Page({
  data: {
    order: null,
    loading: true,
    loadFailed: false
  },

  onLoad(options) {
    const { id, action } = options;
    this.orderId = id;
    this.action = action;
    this.loadOrder();
  },

  async loadOrder() {
    this.setData({ loading: true, loadFailed: false });

    try {
      const order = await api.getOrderDetail(this.orderId);

      if (!order) {
        this.setData({ loading: false, loadFailed: true });
        return;
      }

      const processedOrder = {
        ...order,
        statusText: getStatusText(order.status),
        statusColor: getStatusColor(order.status)
      };

      this.setData({ order: processedOrder, loading: false });

      // 如果是从支付进入，自动发起支付
      if (this.action === 'pay' && order.status === 0) {
        this.onPay();
      }
    } catch (error) {
      console.error('加载订单详情失败:', error);
      this.setData({ loading: false, loadFailed: true });
    }
  },

  // 支付订单
  async onPay() {
    const { order } = this.data;
    if (!order || order.status !== 0) return;

    // 订阅消息必须在用户点击中直接同步调用
    requestSubscription();

    try {
      const result = await payOrder(order.id);

      if (result.success) {
        app.showSuccess('支付成功');
        api.clearCache('orders');
        api.clearCache('bookings');
        this.loadOrder();
      } else if (result.reason === 'cancelled') {
        wx.showToast({ title: '已取消支付', icon: 'none' });
      }
    } catch (error) {
      wx.showModal({
        title: '支付失败',
        content: error.message || '请稍后重试',
        showCancel: false
      });
    }
  },

  // 取消订单
  onCancel() {
    wx.showModal({
      title: '取消订单',
      content: '确定要取消吗？',
      confirmColor: '#FF6B6B',
      success: async (res) => {
        if (res.confirm) {
          try {
            await api.cancelOrder(this.data.order.id);
            api.clearCache('orders');
            api.clearCache('bookings');
            app.showSuccess('已取消');
            this.loadOrder();
          } catch (err) {
            app.showError('取消失败');
          }
        }
      }
    });
  },

  onContactCoach() {
    const phone = this.data.order?.coach_phone;
    if (phone) {
      wx.makePhoneCall({ phoneNumber: phone });
    } else {
      wx.showToast({ title: '暂无联系方式', icon: 'none' });
    }
  },

  onRetry() {
    this.loadOrder();
  },

  onShareAppMessage() {
    return {
      title: '上门健身',
      path: '/pages/index/index'
    };
  }
});
