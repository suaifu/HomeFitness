// pages/course/booking.js - 课程预约（优化版：真实API + Storage传参）
const app = getApp();
const api = require('../../../services/api');

Page({
  data: {
    courseId: null,
    course: null,
    coaches: [],
    selectedCoach: null,
    selectedDate: '',
    selectedTime: '',
    address: null,
    remark: '',
    loading: true,
    availableDates: [],
  },

  onLoad(options) {
    const { id, list } = options;
    if (id) {
      this.setData({ courseId: id });
      this.loadCoachAndCourse(id);
    } else if (list) {
      // 列表模式：加载全部教练供选择
      this.loadCoachesForBooking();
    } else {
      // 默认加载教练列表
      this.loadCoachesForBooking();
    }
  },

  onShow() {
    const selectedAddress = wx.getStorageSync('selectedAddress');
    if (selectedAddress) {
      this.setData({ address: selectedAddress });
      wx.removeStorageSync('selectedAddress');
    }
  },

  // 从教练详情跳入：加载指定教练的信息
  async loadCoachAndCourse(coachId) {
    this.setData({ loading: true });

    try {
      const coach = await api.getCoachDetail(coachId);

      const dates = this.generateDates();

      this.setData({
        coaches: coach ? [{ ...coach, selected: true }] : [],
        selectedCoach: coach || null,
        availableDates: dates,
        selectedDate: dates[0]?.date || '',
        loading: false
      });
    } catch (error) {
      console.error('加载教练信息失败:', error);
      this.setData({ loading: false });
    }
  },

  // 加载教练列表供选择
  async loadCoachesForBooking() {
    this.setData({ loading: true });

    try {
      const coaches = await api.getCoaches({ pageSize: 10 });

      const dates = this.generateDates();

      this.setData({
        coaches: (coaches.list || coaches || []).map(c => ({ ...c, selected: false })),
        availableDates: dates,
        selectedDate: dates[0]?.date || '',
        loading: false
      });
    } catch (error) {
      console.error('加载教练列表失败:', error);
      this.setData({ loading: false });
    }
  },

  // 生成日期（确定性）
  generateDates() {
    const dates = [];
    const today = new Date();
    const baseSlots = [
      '09:00-10:00', '10:00-11:00', '14:00-15:00',
      '15:00-16:00', '19:00-20:00', '20:00-21:00'
    ];

    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);

      dates.push({
        date: `${date.getMonth() + 1}月${date.getDate()}日`,
        weekDay: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()],
        fullDate: date.toISOString().split('T')[0],
        timeSlots: baseSlots.map((time, idx) => ({
          time,
          available: (i * 6 + idx) % 3 !== 0
        }))
      });
    }
    return dates;
  },

  onSelectDate(e) {
    const date = e.currentTarget.dataset.date;
    this.setData({ selectedDate: date, selectedTime: '' });
  },

  onSelectTime(e) {
    const time = e.currentTarget.dataset.time;
    this.setData({ selectedTime: time });
  },

  onTimeSlotTap(e) {
    const { time, available } = e.currentTarget.dataset;
    if (!available) {
      wx.showToast({ title: '该时段不可选', icon: 'none' });
      return;
    }
    this.setData({ selectedTime: time });
  },

  onSelectCoach(e) {
    const coachId = e.currentTarget.dataset.id;
    const coaches = this.data.coaches.map(c => ({
      ...c,
      selected: c.id === coachId
    }));
    const selectedCoach = coaches.find(c => c.id === coachId);
    this.setData({ coaches, selectedCoach });
  },

  onSelectAddress() {
    wx.navigateTo({ url: '/pages/user-center/address/address?select=true' });
  },

  onRemarkInput(e) {
    this.setData({ remark: e.detail.value });
  },

  // 下一步 — 使用 Storage 传参
  onNext() {
    const { selectedCoach, selectedDate, selectedTime, address, remark } = this.data;

    if (!selectedDate || !selectedTime) {
      wx.showToast({ title: '请选择预约时间', icon: 'none' });
      return;
    }

    if (!selectedCoach) {
      wx.showToast({ title: '请选择教练', icon: 'none' });
      return;
    }

    if (!address) {
      wx.showToast({ title: '请选择服务地址', icon: 'none' });
      return;
    }

    const bookingInfo = {
      coachId: selectedCoach.id,
      coachName: selectedCoach.name,
      coachAvatar: selectedCoach.avatar_url,
      coachPrice: selectedCoach.price,
      date: selectedDate,
      time: selectedTime,
      fullDate: this.data.availableDates.find(d => d.date === selectedDate)?.fullDate || '',
      address,
      remark,
      totalPrice: selectedCoach.price
    };

    // 使用 Storage 传参，避免 URL 长度限制
    wx.setStorageSync('pendingBooking', bookingInfo);
    wx.navigateTo({ url: '/pages/extra/course-confirm/confirm' });
  },

  onShareAppMessage() {
    return {
      title: '课程预约',
      path: `/pages/extra/course-booking/booking?id=${this.data.courseId}`
    };
  }
});
