// pages/coach/detail.js - 教练详情（优化版：真实API + 分享优化）
const app = getApp();
const api = require('../../services/api');
const reviewsService = require('../../services/reviews');
const adapter = require('../../services/adapter');
const favoritesService = require('../../services/favorites');

Page({
  data: {
    coachId: null,
    coach: null,
    courses: [],
    reviews: [],
    reviewStats: {
      total: 0,
      avg_rating: 0
    },
    availableTimes: [],
    selectedDate: '',
    selectedTime: '',
    // 日历组件相关
    calendarSelectedDate: '',
    minDate: '',
    maxDate: '',
    selectedDateText: '',
    currentDateSlots: [],
    // ---
    loading: true,
    loadFailed: false,
    activeTab: 'info', // info, reviews, schedule
    overviewStars: [], // 概览星级数组
    showSharePoster: false, // 分享海报
    isFavorited: false, // 是否已收藏
  },

  onLoad(options) {
    const { id } = options;
    if (!id) {
      wx.showToast({ title: '参数错误', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1500);
      return;
    }
    this.setData({ coachId: id });
    this.loadCoachDetail(id);
    this._loaded = true;
  },

  onShow() {
    // 从登录/评价等页面返回时刷新数据
    if (this._loaded && this.data.coachId) {
      this.loadReviews(this.data.coachId);
    }
  },

  // 加载教练详情 — 调用真实 API
  async loadCoachDetail(id) {
    this.setData({ loading: true, loadFailed: false });

    try {
      const res = await api.getCoachDetail(id);

      // 使用适配层统一映射后端数据
      const coach = adapter.adaptCoachDetail(res);

      if (!coach) {
        this.setData({ loading: false, loadFailed: true });
        return;
      }

      // 生成可预约时间
      const availableTimes = this.generateAvailableTimes();

      // 计算概览星级
      const overviewStars = adapter.calcStars(coach.rating);

      // 初始化日历：今天到2个月后
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const maxDate = new Date(today);
      maxDate.setMonth(maxDate.getMonth() + 2);
      const maxDateStr = `${maxDate.getFullYear()}-${String(maxDate.getMonth() + 1).padStart(2, '0')}-${String(maxDate.getDate()).padStart(2, '0')}`;

      const firstDate = availableTimes[0];
      const currentDateSlots = firstDate?.timeSlots || [];
      const todayDisplay = `${today.getMonth() + 1}月${today.getDate()}日`;

      this.setData({
        coach,
        courses: res.courses || [],
        availableTimes,
        selectedDate: firstDate?.date || '',
        selectedDateText: firstDate?.date || todayDisplay,
        overviewStars,
        calendarSelectedDate: todayStr,
        minDate: todayStr,
        maxDate: maxDateStr,
        currentDateSlots,
        loading: false
      });

      wx.setNavigationBarTitle({ title: coach.name });

      // 加载评价数据
      this.loadReviews(id);

      // 检查收藏状态
      this.checkFavoriteStatus(id);

    } catch (error) {
      console.error('加载教练详情失败:', error);
      this.setData({ loading: false, loadFailed: true });
    }
  },

  // 加载评价数据
  async loadReviews(coachId) {
    try {
      const res = await reviewsService.getCoachReviews(coachId, { page: 1, limit: 3 });
      const { reviews, stats } = adapter.adaptReviews(res);

      this.setData({
        reviews,
        reviewStats: stats,
        // 更新概览星级（用评价平均分优先，其次用教练评分）
        overviewStars: adapter.calcStars(stats.avg_rating || this.data.coach?.rating || 0)
      });
    } catch (error) {
      console.error('加载评价失败:', error);
    }
  },

  // 跳转到评价列表页
  onViewAllReviews() {
    const { coach } = this.data;
    wx.navigateTo({
      url: `/pages/extra/coach-reviews/reviews?coachId=${this.data.coachId}&coachName=${coach?.name || ''}`
    });
  },

  // 去写评价
  onWriteReview() {
    const { coach } = this.data;
    wx.navigateTo({
      url: `/pages/extra/coach-evaluate/evaluate?coachId=${this.data.coachId}&coachName=${coach?.name || ''}`
    });
  },

  // 生成可预约时间（确定性，不使用 random）
  generateAvailableTimes() {
    const dates = [];
    const today = new Date();
    const baseSlots = [
      '09:00-10:00', '10:00-11:00', '14:00-15:00',
      '15:00-16:00', '19:00-20:00', '20:00-21:00'
    ];

    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);

      const dateStr = `${date.getMonth() + 1}月${date.getDate()}日`;
      const weekDay = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()];

      // 根据日期和时间段确定性地决定是否可用（避免每次渲染不同）
      const timeSlots = baseSlots.map((time, idx) => ({
        time,
        available: (i * 6 + idx) % 3 !== 0 // 确定性模式
      }));

      dates.push({
        date: dateStr,
        weekDay,
        fullDate: date.toISOString().split('T')[0],
        timeSlots
      });
    }

    return dates;
  },

  // 切换标签
  onTabChange(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tab });
  },

  // 显示分享海报
  onShowSharePoster() {
    this.setData({ showSharePoster: true });
  },

  // 关闭分享海报
  onCloseSharePoster() {
    this.setData({ showSharePoster: false });
  },

  // 海报保存成功
  onPosterSaved() {
    wx.showToast({ title: '已保存，快去分享吧', icon: 'success' });
  },

  // 检查收藏状态
  async checkFavoriteStatus(coachId) {
    if (!app.globalData.token) return;
    try {
      const favorited = await favoritesService.checkFavorite(coachId);
      this.setData({ isFavorited: favorited });
    } catch (e) {
      // 未登录或其他错误，忽略
    }
  },

  // 切换收藏
  async onToggleFavorite() {
    if (!app.globalData.token) {
      wx.showModal({
        title: '提示',
        content: '请先登录再收藏教练',
        confirmColor: '#FF6B6B',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({ url: '/pages/login/login' });
          }
        }
      });
      return;
    }

    const { isFavorited, coachId } = this.data;
    try {
      await favoritesService.toggleFavorite(coachId, isFavorited);
      this.setData({ isFavorited: !isFavorited });
      wx.showToast({
        title: isFavorited ? '已取消收藏' : '收藏成功',
        icon: 'success',
        duration: 1000
      });
      // 清除收藏缓存 + 教练详情缓存
      api.clearCache('favorites');
      api.clearCache(`coach_${coachId}`);
    } catch (error) {
      wx.showToast({ title: '操作失败', icon: 'none' });
    }
  },

  // 日历组件选择日期
  onCalendarSelect(e) {
    const { date } = e.detail; // YYYY-MM-DD

    // 转换为显示格式 "M月D日"
    const [y, m, d] = date.split('-');
    const displayDate = `${parseInt(m)}月${parseInt(d)}日`;

    // 查找该日期是否有可预约时段
    const matchedDay = this.data.availableTimes.find(item => item.fullDate === date);
    const slots = matchedDay?.timeSlots || [];
    const isToday = date === this.data.minDate;
    const weekDay = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][new Date(date).getDay()];
    const selectedDateText = `${displayDate} ${weekDay}${isToday ? '(今天)' : ''}`;

    this.setData({
      calendarSelectedDate: date,
      selectedDate: displayDate,
      selectedDateText,
      currentDateSlots: slots,
      selectedTime: '' // 切换日期时清空时间选择
    });
  },

  // 日历翻月
  onCalendarMonthChange(e) {
    // 预留：可用于动态加载当月可选日期
    console.log('切换月份:', e.detail);
  },

  // 选择日期（保留兼容旧的 scroll-view 选择器）
  onSelectDate(e) {
    const date = e.currentTarget.dataset.date;
    this.setData({ selectedDate: date, selectedTime: '' });
  },

  // 选择时间
  onSelectTime(e) {
    const time = e.currentTarget.dataset.time;
    this.setData({ selectedTime: time });
  },

  // 点击时间槽（含可用判断）
  onTimeSlotTap(e) {
    const { time, available } = e.currentTarget.dataset;
    if (!available) {
      wx.showToast({ title: '该时段不可选', icon: 'none' });
      return;
    }
    // 标记选中/取消选中
    const newTime = this.data.selectedTime === time ? '' : time;
    this.setData({ selectedTime: newTime });
  },

  // 立即预约 — 使用 Storage 传递数据替代 URL 编码
  onBooking() {
    if (!this.data.selectedTime) {
      wx.showToast({ title: '请选择预约时间', icon: 'none' });
      return;
    }

    const { coach, selectedDate, selectedTime } = this.data;

    // 优先用日历选中日期（YYYY-MM-DD），兜底从 availableTimes 查
    let fullDate = this.data.calendarSelectedDate;
    if (!fullDate) {
      fullDate = this.data.availableTimes.find(d => d.date === selectedDate)?.fullDate || '';
    }

    const bookingInfo = {
      coachId: coach.id,
      coachName: coach.name,
      coachAvatar: coach.avatar || coach.avatar_url,
      date: selectedDate,
      time: selectedTime,
      price: coach.price,
      fullDate
    };

    wx.setStorageSync('pendingBooking', bookingInfo);
    wx.navigateTo({ url: '/pages/extra/course-confirm/confirm' });
  },

  // 联系教练
  onContactCoach() {
    const phone = this.data.coach?.phone;
    if (!phone) {
      wx.showToast({ title: '暂无联系方式', icon: 'none' });
      return;
    }
    wx.makePhoneCall({ phoneNumber: phone });
  },

  // 分享给好友
  onShareAppMessage() {
    const { coach } = this.data;
    return {
      title: `${coach?.name || '教练'} - 专业上门健身教练`,
      path: `/pages/coach/detail?id=${this.data.coachId}`,
      imageUrl: coach?.avatar || coach?.avatar_url || ''
    };
  },

  // 分享到朋友圈
  onShareTimeline() {
    const { coach } = this.data;
    return {
      title: `${coach?.name || '教练'} - 专业上门健身教练`,
      query: `id=${this.data.coachId}`,
      imageUrl: coach?.avatar || coach?.avatar_url || ''
    };
  },

  // 重试
  onRetry() {
    this.loadCoachDetail(this.data.coachId);
  },

  onUnload() {
    // 清理临时数据
    wx.removeStorageSync('pendingBooking');
  }
});
