// pages/coach/reviews/reviews.js - 教练评价列表
const app = getApp();
const reviewsService = require('../../../services/reviews');

Page({
  data: {
    coachId: null,
    coachName: '',
    // 统计数据
    stats: {
      total: 0,
      avg_rating: 0,
      distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    },
    // 评价列表
    reviews: [],
    // 分页
    page: 1,
    limit: 10,
    hasMore: true,
    loading: false,
    // 分布百分比
    distributionPercent: {}
  },

  onLoad(options) {
    const { coachId, coachName } = options;
    if (!coachId) {
      wx.showToast({ title: '参数错误', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1500);
      return;
    }

    this.setData({
      coachId: parseInt(coachId),
      coachName: coachName || '教练'
    });

    wx.setNavigationBarTitle({ title: `${this.data.coachName}的评价` });

    this.loadReviews();
  },

  onPullDownRefresh() {
    this.setData({ page: 1, reviews: [], hasMore: true });
    this.loadReviews();
    wx.stopPullDownRefresh();
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.setData({ page: this.data.page + 1 });
      this.loadReviews(true);
    }
  },

  async loadReviews(isLoadMore = false) {
    if (this.data.loading) return;
    if (!isLoadMore) {
      this.setData({ loading: true, page: 1 });
    }

    try {
      const res = await reviewsService.getCoachReviews(this.data.coachId, {
        page: this.data.page,
        limit: this.data.limit
      });

      // app.request 已解包 res.data.data，res 本身就是业务数据
      const data = res.data || res;
      const { reviews, stats, pagination } = data;

      // 计算分布百分比
      const distributionPercent = reviewsService.calcDistributionPercent(
        stats.distribution,
        stats.total
      );

      // 格式化评价数据：标签解析 + 时间格式化（WXML 不能调 JS 函数）
      const processedReviews = (reviews || []).map(review => ({
        ...review,
        _formattedTags: reviewsService.formatTags(review.tags),
        _timeText: this.formatTime(review.created_at)
      }));

      this.setData({
        reviews: isLoadMore ? [...this.data.reviews, ...processedReviews] : processedReviews,
        stats,
        distributionPercent,
        hasMore: pagination.page < pagination.totalPages,
        loading: false
      });
    } catch (error) {
      console.error('加载评价失败:', error);
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败，请重试', icon: 'none' });
    }
  },

  // 格式化评价时间
  formatTime(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return '今天';
    if (days === 1) return '昨天';
    if (days < 7) return `${days}天前`;
    if (days < 30) return `${Math.floor(days / 7)}周前`;
    if (days < 365) return `${Math.floor(days / 30)}个月前`;
    return `${Math.floor(days / 365)}年前`;
  },

  // 去评价页面
  onGoEvaluate() {
    wx.navigateTo({
      url: `/pages/extra/coach-evaluate/evaluate?coachId=${this.data.coachId}&coachName=${this.data.coachName}`
    });
  }
});
