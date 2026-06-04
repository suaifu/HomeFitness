// pages/user/appointments.js - 我的预约（优化版：真实API）
const app = getApp();
const api = require('../../../services/api');
const { getStatusText } = require('../../../utils/constants');

Page({
  data: {
    appointments: [],
    loading: true,
    currentTab: 'upcoming',
    currentTabName: '即将开始',
    tabs: [
      { key: 'upcoming', name: '即将开始', status: 1 },
      { key: 'completed', name: '已完成', status: 2 },
      { key: 'cancelled', name: '已取消', status: 3 }
    ]
  },

  onLoad() {
    this._loaded = false;
  },

  onShow() {
    this.loadAppointments();
    this._loaded = true;
  },
  onPullDownRefresh() {
    this.loadAppointments().then(() => wx.stopPullDownRefresh());
  },

  async loadAppointments() {
    this.setData({ loading: true });

    try {
      if (!app.globalData.token) {
        this.setData({ appointments: [], loading: false });
        return;
      }

      const currentTab = this.data.tabs.find(t => t.key === this.data.currentTab);
      const status = currentTab?.status;
      const bookings = await api.getBookings(status);

      const appointments = (bookings || []).map(b => ({
        ...b,
        statusText: getStatusText(b.status, 'booking')
      }));

      this.setData({ appointments, loading: false });
    } catch (error) {
      console.error('加载预约失败:', error);
      this.setData({ appointments: [], loading: false });
    }
  },

  onTabChange(e) {
    const tab = e.currentTarget.dataset.tab;
    const tabInfo = this.data.tabs.find(t => t.key === tab);
    this.setData({ currentTab: tab, currentTabName: tabInfo ? tabInfo.name : '', loading: true });
    this.loadAppointments();
  },

  onAppointmentTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/extra/order-detail/detail?id=${id}` });
  },

  async onCancel(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '取消预约',
      content: '确定要取消这个预约吗？',
      confirmColor: '#FF6B6B',
      success: async (res) => {
        if (res.confirm) {
          try {
            await api.cancelBooking(id);
            api.clearCache('bookings');
            app.showSuccess('已取消');
            this.loadAppointments();
          } catch (err) {
            app.showError('取消失败');
          }
        }
      }
    });
  },

  onContact(e) {
    const phone = e.currentTarget.dataset.phone;
    if (phone) {
      wx.makePhoneCall({ phoneNumber: phone });
    }
  },

  onRebook() {
    wx.switchTab({ url: '/pages/coach/list' });
  },

  onGoBooking() {
    wx.switchTab({ url: '/pages/coach/list' });
  }
});
