// pages/user/coaches.js - 我的教练（优化版：真实API）
const app = getApp();
const api = require('../../../services/api');

Page({
  data: {
    coaches: [],
    loading: true
  },

  onLoad() {
    this._loaded = false;
  },

  onShow() {
    this.loadCoaches();
    this._loaded = true;
  },
  onPullDownRefresh() {
    this.loadCoaches().then(() => wx.stopPullDownRefresh());
  },

  async loadCoaches() {
    this.setData({ loading: true });

    try {
      if (!app.globalData.token) {
        this.setData({ coaches: [], loading: false });
        return;
      }

      // 从预约记录中提取教练信息
      const bookings = await api.getBookings();
      const coachMap = new Map();

      (bookings || []).forEach(b => {
        if (!coachMap.has(b.coach_id)) {
          coachMap.set(b.coach_id, {
            id: b.coach_id,
            name: b.coach_name,
            avatar: b.coach_avatar,
            phone: b.coach_phone,
            bookingCount: 1,
            lastBooking: b.booking_date
          });
        } else {
          const coach = coachMap.get(b.coach_id);
          coach.bookingCount++;
          if (b.booking_date > coach.lastBooking) {
            coach.lastBooking = b.booking_date;
          }
        }
      });

      let coaches = Array.from(coachMap.values());

      // 无数据时使用热门教练
      if (coaches.length === 0) {
        try {
          const result = await api.getCoaches({ pageSize: 4 });
          coaches = (result.list || result || []).map(c => ({
            ...c,
            bookingCount: 0,
            isFavorite: false
          }));
        } catch (e) {
          coaches = [];
        }
      }

      this.setData({ coaches, loading: false });
    } catch (error) {
      console.error('加载教练失败:', error);
      this.setData({ coaches: [], loading: false });
    }
  },

  onCoachTap(e) {
    const coachId = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/coach/detail?id=${coachId}` });
  },

  onBook(e) {
    const coachId = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/coach/detail?id=${coachId}` });
  },

  onContact(e) {
    const coachId = e.currentTarget.dataset.id;
    const coach = this.data.coaches.find(c => c.id === coachId);
    if (coach && coach.phone) {
      wx.makePhoneCall({ phoneNumber: coach.phone });
    } else {
      wx.showModal({
        title: '联系教练',
        content: '暂无教练联系方式，请通过预约功能联系教练',
        showCancel: false
      });
    }
  },

  onGoBooking() {
    wx.switchTab({ url: '/pages/coach/list' });
  }
});
