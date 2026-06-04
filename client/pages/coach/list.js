// pages/coach/list.js - 教练列表（优化版：真实API + 搜索防抖）
const app = getApp();
const api = require('../../services/api');
const adapter = require('../../services/adapter');
const { debounce } = require('../../utils/util');

Page({
  data: {
    // 筛选条件
    filters: {
      category: '',
      priceRange: [0, 1000],
      rating: 0,
      sortBy: 'rating',
    },

    // 教练列表
    coaches: [],

    // 分页信息
    pagination: {
      page: 1,
      pageSize: 10,
      total: 0,
      hasMore: true
    },

    // 加载状态
    loading: false,
    loadingMore: false,
    loadFailed: false,

    // 筛选面板显示
    showFilterPanel: false,

    // 当前分类
    currentCategory: null,

    // 搜索词
    searchKeyword: '',

    // 搜索框是否聚焦
    searchFocus: false,

    // 没有更多数据
    noMore: false,
  },

  onLoad(options) {
    // 支持从首页搜索入口进入
    if (options.search || app.globalData.searchFromHome) {
      this.setData({ searchFocus: true });
      wx.setNavigationBarTitle({ title: '搜索教练' });
      app.globalData.searchFromHome = false;
    }

    if (options.category) {
      const category = app.globalData.categories.find(c => c.id == options.category);
      if (category) {
        this.setData({
          currentCategory: category,
          'filters.category': category.id
        });
        wx.setNavigationBarTitle({ title: category.name });
      }
    }

    // 创建防抖搜索函数
    this._debouncedSearch = debounce(() => {
      this.resetAndLoad();
    }, 400);

    this.loadCoaches();
  },

  onShow() {
    // 从首页搜索进入时自动聚焦
    if (app.globalData.searchFromHome) {
      this.setData({ searchFocus: true });
      wx.setNavigationBarTitle({ title: '搜索教练' });
      app.globalData.searchFromHome = false;
    }
  },

  onReachBottom() {
    if (this.data.pagination.hasMore && !this.data.loadingMore && !this.data.loading) {
      this.loadMoreCoaches();
    }
  },

  onPullDownRefresh() {
    this.resetAndLoad().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  // 加载教练列表 — 调用真实 API
  async loadCoaches() {
    this.setData({ loading: true, loadFailed: false });

    try {
      const { filters, pagination, searchKeyword } = this.data;
      const result = await api.getCoaches({
        category: filters.category || undefined,
        keyword: searchKeyword || undefined,
        sortBy: filters.sortBy,
        page: 1,
        pageSize: pagination.pageSize
      });

      const coaches = (result.list || result || []).map(c => adapter.adaptCoach(c));
      const pag = result.pagination || {};

      this.setData({
        coaches: coaches,
        'pagination.total': pag.total || coaches.length,
        'pagination.page': pag.page || 1,
        'pagination.hasMore': pag.totalPages ? pag.page < pag.totalPages : coaches.length >= pagination.pageSize,
        noMore: pag.totalPages ? pag.page >= pag.totalPages : coaches.length < pagination.pageSize,
        loading: false
      });
    } catch (error) {
      console.error('加载教练列表失败:', error);
      this.setData({ loading: false, loadFailed: true });
    }
  },

  // 加载更多
  async loadMoreCoaches() {
    this.setData({ loadingMore: true });

    try {
      const { filters, pagination, searchKeyword, coaches } = this.data;
      const nextPage = pagination.page + 1;

      const result = await api.getCoaches({
        category: filters.category || undefined,
        keyword: searchKeyword || undefined,
        sortBy: filters.sortBy,
        page: nextPage,
        pageSize: pagination.pageSize
      });

      const newCoaches = (result.list || result || []).map(c => adapter.adaptCoach(c));
      const pag = result.pagination || {};

      this.setData({
        coaches: [...coaches, ...newCoaches],
        'pagination.page': nextPage,
        'pagination.total': pag.total || pagination.total,
        'pagination.hasMore': pag.totalPages ? nextPage < pag.totalPages : newCoaches.length >= pagination.pageSize,
        loadingMore: false
      });
    } catch (error) {
      console.error('加载更多教练失败:', error);
      this.setData({ loadingMore: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  // 点击教练
  onCoachTap(e) {
    const coachId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/coach/detail?id=${coachId}`
    });
  },

  // 搜索输入 — 使用防抖
  onSearchInput(e) {
    this.setData({ searchKeyword: e.detail.value });
    this._debouncedSearch();
  },

  // 搜索确认
  onSearchConfirm(e) {
    this.setData({ searchKeyword: e.detail.value });
    this.resetAndLoad();
  },

  // 重置并重新加载
  async resetAndLoad() {
    this.setData({
      'pagination.page': 1,
      'pagination.hasMore': true,
      coaches: []
    });
    await this.loadCoaches();
  },

  // 显示筛选面板
  onShowFilter() {
    this.setData({ showFilterPanel: true });
  },

  // 隐藏筛选面板
  onHideFilter() {
    this.setData({ showFilterPanel: false });
  },

  // 选择筛选条件
  onSelectFilter(e) {
    const { type, value } = e.currentTarget.dataset;
    this.setData({
      [`filters.${type}`]: value
    });
  },

  // 应用筛选
  onApplyFilter() {
    this.setData({ showFilterPanel: false });
    this.resetAndLoad();
  },

  // 重置筛选
  onResetFilter() {
    this.setData({
      filters: {
        category: '',
        priceRange: [0, 1000],
        rating: 0,
        sortBy: 'rating'
      },
      currentCategory: null
    });
  },

  // 选择分类
  onSelectCategory(e) {
    const category = e.currentTarget.dataset.category;
    this.setData({
      currentCategory: category,
      'filters.category': category.id
    });
    this.resetAndLoad();
    wx.setNavigationBarTitle({ title: category.name });
  },

  // 重试
  onRetry() {
    this.loadCoaches();
  },

  // 分享给好友
  onShareAppMessage() {
    const { currentCategory, searchKeyword } = this.data;
    let path = '/pages/coach/list';
    const params = [];
    if (currentCategory) params.push(`category=${currentCategory.id}`);
    if (searchKeyword) params.push(`search=${encodeURIComponent(searchKeyword)}`);
    if (params.length) path += '?' + params.join('&');
    return {
      title: searchKeyword ? `"${searchKeyword}"的搜索结果 - 上门健身` : '专业上门健身教练推荐',
      path,
      imageUrl: '/images/banner1.png'
    };
  },

  // 分享到朋友圈
  onShareTimeline() {
    return {
      title: '专业上门健身教练 - 上门健身',
      imageUrl: '/images/banner1.png'
    };
  }
});
