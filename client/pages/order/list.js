// pages/order/list.js - 订单列表（优化版：真实API）
const app = getApp();
const api = require('../../services/api');
const { ORDER_STATUS, getStatusText, getStatusColor } = require('../../utils/constants');

Page({
  data: {
    orders: [],
    loading: true,
    loadFailed: false,
    currentStatus: 'all',
    statusTabs: [
      { label: '全部', value: 'all', count: 0 },
      { label: '待支付', value: '0', count: 0 },
      { label: '已支付', value: '1', count: 0 },
      { label: '已完成', value: '2', count: 0 },
      { label: '已取消', value: '3', count: 0 }
    ]
  },

  onLoad() {
    this._loaded = false;
  },

  onShow() {
    // 首次由 onLoad 触发，后续由 onShow 刷新（如支付返回）
    this.loadOrders();
    this._loaded = true;
  },
  onPullDownRefresh() {
    this.loadOrders().then(() => wx.stopPullDownRefresh());
  },

  async loadOrders() {
    this.setData({ loading: true, loadFailed: false });

    try {
      if (!app.globalData.token) {
        // 未登录，显示空状态
        this.setData({ orders: [], loading: false });
        return;
      }

      const statusParam = this.data.currentStatus === 'all' ? undefined : this.data.currentStatus;
      const orders = await api.getOrders(statusParam);

      // 处理订单状态文字
      const processedOrders = (orders || []).map(order => ({
        ...order,
        statusText: getStatusText(order.status),
        statusColor: getStatusColor(order.status)
      }));

      this.setData({ orders: processedOrders, loading: false });
    } catch (error) {
      console.error('加载订单失败:', error);
      this.setData({ loading: false, loadFailed: true });
    }
  },

  onTabChange(e) {
    const status = e.currentTarget.dataset.status;
    this.setData({ currentStatus: status });
    this.loadOrders();
  },

  onOrderTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/extra/order-detail/detail?id=${id}` });
  },

  onPayOrder(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/extra/order-detail/detail?id=${id}&action=pay` });
  },

  async onCancelOrder(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '取消订单',
      content: '确定要取消这个订单吗？',
      confirmColor: '#FF6B6B',
      success: async (modalRes) => {
        if (modalRes.confirm) {
          try {
            await api.cancelOrder(id);
            // 清除订单缓存，确保重新加载拿到最新数据
            api.clearCache('orders');
            wx.showToast({ title: '订单已取消', icon: 'success' });
            this.loadOrders();
          } catch (err) {
            wx.showToast({ title: err.message || '取消失败，请重试', icon: 'none', duration: 2000 });
          }
        }
      }
    });
  },

  onGoBooking() {
    wx.switchTab({ url: '/pages/coach/list' });
  },

  onRetry() {
    this.loadOrders();
  }
});
